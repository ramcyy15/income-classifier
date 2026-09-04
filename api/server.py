import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE = Path(__file__).resolve().parent.parent
OUT = BASE / "outputs"
MODEL_PATH = BASE / "models" / "stacking_model.joblib"
BRGY_PATH = OUT / "merged_barangay_dataset.csv"
FAMILIES_PATH = OUT / "family_predictions.csv"
SHAP_PATH = OUT / "shap_by_barangay.csv"
BRIEFS_PATH = OUT / "policy_briefs.json"
GEOJSON_PATH = BASE / "data" / "geo" / "qc5_barangays.geojson"
POLYGONS_PATH = BASE / "data" / "geo" / "qc5_polygons.geojson"

CLASS_ORDER = ["Low", "Middle", "High"]
COMMUNITY_CLASS_ORDER = ["priority", "developing", "stable"]
COMMUNITY_LABELS = {
    "priority": "Level 1 · Low-Income (High Priority)",
    "developing": "Level 2 · Mixed-Income (Moderate Priority)",
    "stable": "Level 3 · Higher-Income (Low Priority)",
}
COMMUNITY_SHORT = {
    "priority": "Level 1 · Low-Income",
    "developing": "Level 2 · Mixed-Income",
    "stable": "Level 3 · Higher-Income",
}
COMMUNITY_COLORS = {
    "priority": "#EF4444",
    "developing": "#F59E0B",
    "stable": "#10B981",
}
CLASS_COLORS = {
    "Low": "#F59E0B",
    "Middle": "#64748B",
    "High": "#10B981",
}

FEATURE_LABELS = {
    "family_size": "Family size",
    "dependents_0_18": "Children at home (under 18)",
    "children_in_school": "Children attending school",
    "children_in_school_ratio": "School attendance rate",
    "pop_2024": "Barangay population",
    "pop_growth_2000_2024": "Long-term population growth",
    "pop_growth_2020_2024": "Recent population growth",
    "four_ps_per_1k_pop": "4Ps coverage (per 1,000)",
    "active_4ps_share": "Households active in 4Ps (%)",
    "household_status_Active": "Currently in 4Ps",
    "household_status_Graduated": "Graduated from 4Ps",
    "household_status_Delisted": "Removed from 4Ps",
}

app = FastAPI(title="District V Income Classifier API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global caches
_CACHE = {}

def get_model():
    if "model" not in _CACHE:
        if MODEL_PATH.exists():
            _CACHE["model"] = joblib.load(MODEL_PATH)
        else:
            _CACHE["model"] = None
    return _CACHE["model"]

def get_metrics():
    accuracy = 0.4994
    within_one_tier = 0.8460
    report = OUT / "stacking_classification_report.txt"
    if report.exists():
        try:
            first = report.read_text(encoding="utf-8").splitlines()[0]
            accuracy = float(first.split(":")[1].strip())
        except Exception:
            pass
    cm_path = OUT / "stacking_confusion_matrix.csv"
    if cm_path.exists():
        try:
            cm = pd.read_csv(cm_path, index_col=0).to_numpy()
            total = cm.sum()
            if total > 0:
                two_tier_errors = cm[0, -1] + cm[-1, 0]
                within_one_tier = float((total - two_tier_errors) / total)
        except Exception:
            pass
    return accuracy, within_one_tier

def get_barangay_data():
    if not BRGY_PATH.exists() or not FAMILIES_PATH.exists():
        raise HTTPException(status_code=500, detail="Datasets not found.")
    
    df = pd.read_csv(BRGY_PATH)
    families = pd.read_csv(FAMILIES_PATH)

    mobility_mask = (families["predicted_class"] == "High") | (families["household_status"] == "Graduated")
    mobility_by_brgy = families.assign(_mob=mobility_mask).groupby("barangay")["_mob"].sum().rename("mobility_count")
    graduated_by_brgy = families[families["household_status"] == "Graduated"].groupby("barangay").size().rename("graduated_count")

    df = df.merge(mobility_by_brgy, left_on="barangay", right_index=True, how="left")
    df = df.merge(graduated_by_brgy, left_on="barangay", right_index=True, how="left")
    df["mobility_count"] = df["mobility_count"].fillna(0)
    df["graduated_count"] = df["graduated_count"].fillna(0)
    df["families_surveyed"] = df["families_surveyed"].fillna(0)
    df["pop_2024"] = df["pop_2024"].fillna(0)

    surveyed = df["families_surveyed"].clip(lower=1)
    pop_safe = df["pop_2024"].clip(lower=1)

    df["pocket_density_per_1k"] = (df["families_surveyed"] / pop_safe * 1000).fillna(0)
    df["transition_rate_pct"] = (df["mobility_count"] / surveyed * 100).fillna(0)
    df["graduated_share_pct"] = (df["graduated_count"] / surveyed * 100).fillna(0)

    score = df["pocket_density_per_1k"].fillna(0) * (1 - df["transition_rate_pct"].fillna(0).clip(upper=100) / 100)
    df["vulnerability_score"] = score
    ranks = score.rank(method="first", ascending=True)
    n = len(df)
    cuts = (n / 3.0, 2 * n / 3.0)

    def _bucket(r):
        if r <= cuts[0]:
            return "stable"
        if r <= cuts[1]:
            return "developing"
        return "priority"

    df["community_class"] = ranks.apply(_bucket)
    df["community_rank"] = ranks.astype(int)
    df["community_rank_total"] = n

    # Attach coordinates
    coords = {}
    if GEOJSON_PATH.exists():
        with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
            raw_coords = json.load(f)
            for k, v in raw_coords.items():
                coords[k.title()] = (float(v["latitude"]), float(v["longitude"]))

    df["lat"] = df["barangay"].map(lambda b: coords.get(b, (None, None))[0] if b in coords else coords.get(b.title(), (None, None))[0])
    df["lng"] = df["barangay"].map(lambda b: coords.get(b, (None, None))[1] if b in coords else coords.get(b.title(), (None, None))[1])
    return df, families

def get_shap_data():
    if SHAP_PATH.exists():
        return pd.read_csv(SHAP_PATH).set_index("barangay")
    return pd.DataFrame()

def get_policy_briefs():
    if BRIEFS_PATH.exists():
        try:
            return json.loads(BRIEFS_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}

def simulate_intervention(families_df, financial=0, education=0, livelihood=0, years=5):
    f, e, l = financial / 100.0, education / 100.0, livelihood / 100.0
    t = years / 5.0
    df = families_df.copy().reset_index(drop=True)

    df["family_size"] = (df["family_size"] * (1 - 0.05 * l * t)).clip(lower=1)
    df["dependents_0_18"] = (df["dependents_0_18"] * (1 - (0.10 * l + 0.05 * e) * t)).clip(lower=0)

    df["children_in_school"] = df["children_in_school"].clip(upper=df["dependents_0_18"])
    gap = (df["dependents_0_18"] - df["children_in_school"]).clip(lower=0)
    df["children_in_school"] = (df["children_in_school"] + gap * (0.70 * e + 0.20 * f) * t).clip(upper=df["dependents_0_18"])

    df["children_in_school_ratio"] = (
        df["children_in_school"] / df["dependents_0_18"].replace(0, np.nan)
    ).clip(upper=1.0).fillna(0)

    df["four_ps_per_1k_pop"] = (
        df["four_ps_per_1k_pop"] * (1 - (0.10 * f + 0.03 * e + 0.30 * l) * t)
    ).clip(lower=0)

    drop_pp = (8.0 * f + 2.0 * e + 25.0 * l) * t
    df["active_4ps_share"] = (df["active_4ps_share"] - drop_pp).clip(lower=0, upper=100)

    p_grad = min((0.15 * f + 0.05 * e + 0.40 * l) * t, 1.0)
    active_idx = df.index[df["household_status"] == "Active"].tolist()
    n_grad = int(round(len(active_idx) * p_grad))
    if n_grad > 0:
        df.loc[active_idx[:n_grad], "household_status"] = "Graduated"

    df["pop_2024"] = df["pop_2024"] * (1 + 0.015 * years)
    return df

class SimulateRequest(BaseModel):
    barangay: str
    financial: float = 0.0
    education: float = 0.0
    livelihood: float = 0.0
    years: int = 5

class GoalSeekRequest(BaseModel):
    barangay: str
    target_reduction_pct: float = 20.0
    years: int = 5

@app.get("/api/overview")
def overview():
    df, families = get_barangay_data()
    acc, within = get_metrics()
    model_art = get_model()

    total_pop = int(df["pop_2024"].sum())
    surveyed_families = int(df["families_surveyed"].sum())
    avg_income = float((df["avg_per_capita_income"] * df["families_surveyed"]).sum() / max(surveyed_families, 1))

    counts = df["community_class"].value_counts().to_dict()

    pop_growth_2020_2024 = float(
        ((df["pop_2024"].sum() - df["pop_2020"].sum()) / max(df["pop_2020"].sum(), 1)) * 100
    )

    active_4ps_avg = float(df["active_4ps_share"].mean())

    return {
        "metrics": {
            "total_population": total_pop,
            "population_growth_pct": round(pop_growth_2020_2024, 1),
            "surveyed_families": surveyed_families,
            "active_4ps_share_avg": round(active_4ps_avg, 1),
            "avg_per_capita_income": round(avg_income, 0),
            "accuracy": round(acc * 100, 1) if acc else None,
            "within_one_tier": round(within * 100, 1) if within else None,
            "conformal_coverage": round(model_art.get("conformal_coverage_empirical", 0.90) * 100, 1) if model_art else 90.0,
            "total_barangays": len(df),
        },
        "community_counts": {
            "priority": counts.get("priority", 0),
            "developing": counts.get("developing", 0),
            "stable": counts.get("stable", 0),
        },
        "model_name": model_art.get("model_name", "Stacking (RF + XGBoost -> LogReg)") if model_art else "Stacking Ensemble",
    }

@app.get("/api/barangays")
def list_barangays():
    df, _ = get_barangay_data()
    result = []
    for _, row in df.iterrows():
        b_name = row["barangay"]
        c_class = row["community_class"]
        surveyed = int(row["families_surveyed"])
        result.append({
            "name": b_name,
            "community_class": c_class,
            "community_label": COMMUNITY_SHORT.get(c_class, c_class),
            "community_color": COMMUNITY_COLORS.get(c_class, "#64748B"),
            "rank": int(row["community_rank"]),
            "total_ranks": int(row["community_rank_total"]),
            "population": int(row["pop_2024"]),
            "pop_growth_2020_2024": round(float(row["pop_growth_2020_2024"]), 1),
            "families_surveyed": surveyed,
            "avg_per_capita_income": round(float(row["avg_per_capita_income"]), 0),
            "four_ps_density": round(float(row["pocket_density_per_1k"]), 1),
            "transition_rate_pct": round(float(row["transition_rate_pct"]), 1),
            "graduated_share_pct": round(float(row["graduated_share_pct"]), 1),
            "active_4ps_share": round(float(row["active_4ps_share"]), 1),
            "predicted_class": row["predicted_class"],
            "lat": row["lat"],
            "lng": row["lng"],
            "tier_distribution": {
                "Low": int(row["pred_low"]),
                "Middle": int(row["pred_middle"]),
                "High": int(row["pred_high"]),
                "Low_pct": round(int(row["pred_low"]) / max(surveyed, 1) * 100, 1),
                "Middle_pct": round(int(row["pred_middle"]) / max(surveyed, 1) * 100, 1),
                "High_pct": round(int(row["pred_high"]) / max(surveyed, 1) * 100, 1),
            },
            "actual_distribution": {
                "Low": int(row["actual_low"]),
                "Middle": int(row["actual_middle"]),
                "High": int(row["actual_high"]),
                "Low_pct": round(int(row["actual_low"]) / max(surveyed, 1) * 100, 1),
                "Middle_pct": round(int(row["actual_middle"]) / max(surveyed, 1) * 100, 1),
                "High_pct": round(int(row["actual_high"]) / max(surveyed, 1) * 100, 1),
            }
        })
    result.sort(key=lambda x: x["rank"])
    return result

@app.get("/api/barangays/{name}")
def get_barangay(name: str):
    df, families = get_barangay_data()
    shap_df = get_shap_data()
    briefs = get_policy_briefs()

    match = df[df["barangay"].str.lower() == name.lower()]
    if match.empty:
        raise HTTPException(status_code=404, detail="Barangay not found.")
    
    row = match.iloc[0]
    b_name = row["barangay"]
    surveyed = int(row["families_surveyed"])
    c_class = row["community_class"]

    # Extract SHAP top drivers
    shap_drivers = []
    if b_name in shap_df.index:
        s_row = shap_df.loc[b_name]
        items = []
        for feat, val in s_row.items():
            if feat in FEATURE_LABELS:
                items.append({"feature": feat, "label": FEATURE_LABELS[feat], "importance": float(val)})
        items.sort(key=lambda x: x["importance"], reverse=True)
        top_items = items[:5]
        total_imp = sum(x["importance"] for x in top_items) or 1.0
        for item in top_items:
            shap_drivers.append({
                "label": item["label"],
                "importance": round(item["importance"], 4),
                "share_pct": round((item["importance"] / total_imp) * 100, 1),
            })

    brief = briefs.get(b_name, {})

    return {
        "name": b_name,
        "community_class": c_class,
        "community_label": COMMUNITY_SHORT.get(c_class, c_class),
        "community_color": COMMUNITY_COLORS.get(c_class, "#64748B"),
        "rank": int(row["community_rank"]),
        "total_ranks": int(row["community_rank_total"]),
        "population": int(row["pop_2024"]),
        "pop_growth_2020_2024": round(float(row["pop_growth_2020_2024"]), 1),
        "families_surveyed": surveyed,
        "avg_per_capita_income": round(float(row["avg_per_capita_income"]), 0),
        "avg_family_size": round(float(row["avg_family_size"]), 1),
        "avg_dependents": round(float(row["avg_dependents"]), 1),
        "avg_children_in_school": round(float(row["avg_children_in_school"]), 1),
        "four_ps_density": round(float(row["pocket_density_per_1k"]), 1),
        "transition_rate_pct": round(float(row["transition_rate_pct"]), 1),
        "graduated_share_pct": round(float(row["graduated_share_pct"]), 1),
        "active_4ps_share": round(float(row["active_4ps_share"]), 1),
        "predicted_class": row["predicted_class"],
        "lat": row["lat"],
        "lng": row["lng"],
        "tier_distribution": {
            "Low": int(row["pred_low"]),
            "Middle": int(row["pred_middle"]),
            "High": int(row["pred_high"]),
            "Low_pct": round(int(row["pred_low"]) / max(surveyed, 1) * 100, 1),
            "Middle_pct": round(int(row["pred_middle"]) / max(surveyed, 1) * 100, 1),
            "High_pct": round(int(row["pred_high"]) / max(surveyed, 1) * 100, 1),
        },
        "actual_distribution": {
            "Low": int(row["actual_low"]),
            "Middle": int(row["actual_middle"]),
            "High": int(row["actual_high"]),
            "Low_pct": round(int(row["actual_low"]) / max(surveyed, 1) * 100, 1),
            "Middle_pct": round(int(row["actual_middle"]) / max(surveyed, 1) * 100, 1),
            "High_pct": round(int(row["actual_high"]) / max(surveyed, 1) * 100, 1),
        },
        "top_drivers": shap_drivers,
        "policy_brief": brief,
    }

@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    df, families = get_barangay_data()
    model_art = get_model()
    if not model_art:
        raise HTTPException(status_code=500, detail="Stacking model not loaded.")

    pipe = model_art["pipeline"]
    features = model_art["features"]

    match = families[families["barangay"].str.lower() == req.barangay.lower()].copy()
    if match.empty:
        raise HTTPException(status_code=404, detail="No families found for barangay.")

    now_preds = pipe.predict(match[features])
    now_tiers = np.array(CLASS_ORDER)[now_preds]

    projected_df = simulate_intervention(match, req.financial, req.education, req.livelihood, req.years)
    fut_preds = pipe.predict(projected_df[features])
    fut_tiers = np.array(CLASS_ORDER)[fut_preds]

    total = len(match)
    now_counts = pd.Series(now_tiers).value_counts().reindex(CLASS_ORDER, fill_value=0).to_dict()
    fut_counts = pd.Series(fut_tiers).value_counts().reindex(CLASS_ORDER, fill_value=0).to_dict()

    rank_map = {"Low": 0, "Middle": 1, "High": 2}
    now_r = pd.Series(now_tiers).map(rank_map)
    fut_r = pd.Series(fut_tiers).map(rank_map)

    moved_up = int((fut_r > now_r).sum())
    stayed = int((fut_r == now_r).sum())
    moved_down = int((fut_r < now_r).sum())

    now_dom = pd.Series(now_tiers).value_counts().idxmax()
    fut_dom = pd.Series(fut_tiers).value_counts().idxmax()

    low_reduction = 0.0
    if now_counts["Low"] > 0:
        low_reduction = round(((now_counts["Low"] - fut_counts["Low"]) / now_counts["Low"]) * 100, 1)

    indicator_deltas = [
        {"name": "Family size", "before": round(float(match["family_size"].mean()), 1), "after": round(float(projected_df["family_size"].mean()), 1)},
        {"name": "Dependents (<18)", "before": round(float(match["dependents_0_18"].mean()), 1), "after": round(float(projected_df["dependents_0_18"].mean()), 1)},
        {"name": "School Attendance", "before": round(float(match["children_in_school"].mean()), 1), "after": round(float(projected_df["children_in_school"].mean()), 1)},
        {"name": "Active 4Ps Share", "before": round(float(match["active_4ps_share"].mean()), 1), "after": round(float(projected_df["active_4ps_share"].mean()), 1)},
    ]

    return {
        "barangay": req.barangay,
        "total_families": total,
        "now": {
            "dominant": now_dom,
            "counts": now_counts,
            "percentages": {k: round(v / total * 100, 1) for k, v in now_counts.items()},
        },
        "projected": {
            "dominant": fut_dom,
            "counts": fut_counts,
            "percentages": {k: round(v / total * 100, 1) for k, v in fut_counts.items()},
        },
        "movement": {
            "moved_up": moved_up,
            "stayed": stayed,
            "moved_down": moved_down,
            "low_tier_reduction_pct": low_reduction,
        },
        "indicator_changes": indicator_deltas,
    }

@app.post("/api/goal-seek")
def goal_seek(req: GoalSeekRequest):
    df, families = get_barangay_data()
    model_art = get_model()
    if not model_art:
        raise HTTPException(status_code=500, detail="Stacking model not loaded.")

    pipe = model_art["pipeline"]
    features = model_art["features"]

    match = families[families["barangay"].str.lower() == req.barangay.lower()].copy()
    if match.empty:
        raise HTTPException(status_code=404, detail="No families found.")

    now_preds = pipe.predict(match[features])
    now_tiers = np.array(CLASS_ORDER)[now_preds]
    now_low = int((pd.Series(now_tiers) == "Low").sum())

    if now_low == 0:
        return {"viable": [], "best_attempt": None, "now_low": 0}

    grid = list(range(0, 101, 25))
    viable = []
    best_attempt = None
    best_reduction = -1.0

    for f in grid:
        for e in grid:
            for l in grid:
                proj = simulate_intervention(match, f, e, l, req.years)
                fut_preds = pipe.predict(proj[features])
                fut_low = int((pd.Series(fut_preds) == 0).sum())
                red = (now_low - fut_low) / now_low * 100.0
                entry = {
                    "financial": f,
                    "education": e,
                    "livelihood": l,
                    "total_effort": f + e + l,
                    "reduction_pct": round(red, 1),
                    "projected_low": fut_low,
                }
                if red > best_reduction:
                    best_reduction = red
                    best_attempt = entry
                if red >= req.target_reduction_pct:
                    viable.append(entry)

    viable.sort(key=lambda x: (x["total_effort"], -x["reduction_pct"]))
    return {
        "now_low_families": now_low,
        "viable_plans": viable[:5],
        "best_attempt": best_attempt,
    }

@app.get("/api/geojson/polygons")
def get_geojson():
    if POLYGONS_PATH.exists():
        with open(POLYGONS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"type": "FeatureCollection", "features": []}

@app.get("/health")
def health():
    return {"status": "healthy", "service": "District V API"}
