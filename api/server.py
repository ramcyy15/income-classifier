import json
import os
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types

BASE = Path(__file__).resolve().parent.parent
OUT = BASE / "outputs"
MODEL_PATH = BASE / "models" / "stacking_model.joblib"
INDIVIDUAL_MODEL_PATH = BASE / "models" / "individual_family_model.joblib"
BRGY_PATH = OUT / "merged_barangay_dataset.csv"
FAMILIES_PATH = OUT / "family_predictions.csv"
SHAP_PATH = OUT / "shap_by_barangay.csv"
BRIEFS_PATH = OUT / "policy_briefs.json"
GEOJSON_PATH = BASE / "data" / "geo" / "qc5_barangays.geojson"
POLYGONS_PATH = BASE / "data" / "geo" / "qc5_polygons.geojson"

# Load Gemini API Key
GEMINI_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
if not GEMINI_KEY:
    env_file = BASE / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("GEMINI_API_KEY=") or line.startswith("GOOGLE_API_KEY="):
                GEMINI_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
                break

GEMINI_CLIENT = genai.Client(api_key=GEMINI_KEY) if GEMINI_KEY else None
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

PROMPT_BRIEF_TEMPLATE = """You are a Philippine social welfare and poverty alleviation policy analyst advising the Quezon City Local Government Unit (District V).
Based on the real demographic, economic, and machine learning indicators below, produce an evidence-based Government Policy Brief with actionable agency recommendations.

Barangay: {barangay}
Vulnerability Status: {community_label}
Predicted Income Tier: {predicted_class} (SWDI Level {tier_level} - {tier_meaning})
Families Surveyed: {families_surveyed}
Rank: #{community_rank} out of {community_rank_total} (Rank #1 = highest poverty priority)

Key Demographic & Social Indicators:
- Average Monthly Per-Capita Income: PHP {avg_income:,.0f}
- Average Family Size: {avg_fam_size:.1f}
- Average Children at Home (0-18): {avg_dependents:.1f}
- Average Children in School: {avg_in_school:.1f}
- 4Ps Pocket Density: {four_ps_density:.1f} per 1,000 residents
- Households Active in 4Ps: {active_4ps_share:.1f}%
- 4Ps Transition Rate: {transition_rate_pct:.1f}%
- Graduated Share: {graduated_share_pct:.1f}%
- Barangay Population (2024): {pop_2024:,.0f}
- Population Growth (2020-2024): {pop_growth:+.1f}%

Income Distribution (from Stacking Ensemble ML Model using SWDI Levels):
- SWDI Level 1 · Survival (Low-Income): {low_pct:.1f}% ({low_count} families)
- SWDI Level 2 · Subsistence (Middle-Income): {middle_pct:.1f}% ({middle_count} families)
- SWDI Level 3 · Self-Sufficient (Higher-Income): {high_pct:.1f}% ({high_count} families)

Top Machine Learning Decision Drivers (SHAP Analysis):
{shap_drivers_text}

Instructions:
1. Return a VALID JSON object ONLY (no markdown backticks, no code fence).
2. Recommend 3 to 4 specific Philippine government aid programs addressing multi-dimensional poverty. Span across relevant sectors such as:
   - "Livelihood & Employment" (DSWD SLP, DOLE TUPAD/DILP, DTI Negosyo, TESDA)
   - "Education" (DepEd ALS, CHED/QC-LGU Scholarships)
   - "Health & Nutrition" (DOH, PhilHealth Konsulta, QC Health Nutrition)
   - "Family Welfare & Planning" (POPCOM/CSWDO Responsible Parenthood)
   - "Housing & Community" (NHA, QC Housing Board, DPWH)
3. Cite actual numbers and figures from the indicators in each program rationale.
4. Provide a tailored resource allocation mix for the 3 quantitative policy levers (financial %, education %, livelihood %, proportional to needs).

JSON Schema:
{{
  "summary": "2-3 sentence executive policy synthesis highlighting the primary socio-economic bottleneck and priority focus.",
  "programs": [
    {{
      "name": "Exact Philippine government program name",
      "agency": "Lead government agency (e.g. DSWD, DOLE, DTI, DepEd, TESDA, DOH, POPCOM, LGU)",
      "sector": "Livelihood" or "Education" or "Health & Nutrition" or "Family Welfare" or "Housing & Infrastructure" or "Financial Support",
      "priority": "High" or "Medium",
      "rationale": "2 sentences explaining why this program directly addresses the data, explicitly citing numbers from the indicators above."
    }}
  ],
  "slider_suggestion": {{
    "financial": integer (0 to 100),
    "education": integer (0 to 100),
    "livelihood": integer (0 to 100),
    "financial_targets": "1-line naming specific recommended cash/financial programs, e.g. DSWD 4Ps & Emergency AICS",
    "education_targets": "1-line naming specific recommended education programs, e.g. DepEd ALS & QC Academic Scholarships",
    "livelihood_targets": "1-line naming specific recommended livelihood programs, e.g. DSWD SLP & DOLE TUPAD Micro-Grants",
    "reasoning": "1-2 sentence justification for this recommended resource mix."
  }}
}}
"""

CLASS_ORDER = ["Low", "Middle", "High"]
COMMUNITY_CLASS_ORDER = ["priority", "developing", "stable"]
COMMUNITY_LABELS = {
    "priority":   "Priority Band 1 · High Need (Critical)",
    "developing": "Priority Band 2 · Moderate Need",
    "stable":     "Priority Band 3 · Low Need (Stable)",
}
COMMUNITY_SHORT = {
    "priority":   "Level 1",
    "developing": "Level 2",
    "stable":     "Level 3",
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

def get_individual_model():
    if "individual_model" not in _CACHE:
        if INDIVIDUAL_MODEL_PATH.exists():
            _CACHE["individual_model"] = joblib.load(INDIVIDUAL_MODEL_PATH)
        else:
            _CACHE["individual_model"] = None
    return _CACHE["individual_model"]

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

class GenerateBriefRequest(BaseModel):
    barangay: str

@app.post("/api/policy-brief/generate")
def generate_live_policy_brief(req: GenerateBriefRequest):
    if not GEMINI_CLIENT:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured in .env file.")

    df, families = get_barangay_data()
    shap_df = get_shap_data()

    match = df[df["barangay"].str.lower() == req.barangay.lower()]
    if match.empty:
        raise HTTPException(status_code=404, detail="Barangay not found.")

    row = match.iloc[0]
    b_name = row["barangay"]
    surveyed = int(row["families_surveyed"])
    c_class = row["community_class"]

    # Extract SHAP top drivers text
    shap_lines = []
    if b_name in shap_df.index:
        s_row = shap_df.loc[b_name]
        items = []
        for feat, val in s_row.items():
            if feat in FEATURE_LABELS:
                items.append((FEATURE_LABELS[feat], float(val)))
        items.sort(key=lambda x: x[1], reverse=True)
        top_items = items[:5]
        total_imp = sum(x[1] for x in top_items) or 1.0
        for label, val in top_items:
            pct = round((val / total_imp) * 100, 1)
            shap_lines.append(f"- {label}: {pct}% share of model decision impact")

    shap_drivers_text = "\n".join(shap_lines) if shap_lines else "(Feature importance data not available)"

    prompt = PROMPT_BRIEF_TEMPLATE.format(
        barangay=b_name,
        community_label=COMMUNITY_SHORT.get(c_class, c_class),
        predicted_class=row["predicted_class"],
        tier_level=1 if row["predicted_class"] == "Low" else (2 if row["predicted_class"] == "Middle" else 3),
        tier_meaning="Survival" if row["predicted_class"] == "Low" else ("Subsistence" if row["predicted_class"] == "Middle" else "Self-Sufficient"),
        families_surveyed=surveyed,
        community_rank=int(row["community_rank"]),
        community_rank_total=int(row["community_rank_total"]),
        avg_income=float(row["avg_per_capita_income"]),
        avg_fam_size=float(row["avg_family_size"]),
        avg_dependents=float(row["avg_dependents"]),
        avg_in_school=float(row["avg_children_in_school"]),
        four_ps_density=float(row["pocket_density_per_1k"]),
        active_4ps_share=float(row["active_4ps_share"]),
        transition_rate_pct=float(row["transition_rate_pct"]),
        graduated_share_pct=float(row["graduated_share_pct"]),
        pop_2024=float(row["pop_2024"]),
        pop_growth=float(row["pop_growth_2020_2024"]),
        low_pct=round(int(row["pred_low"]) / max(surveyed, 1) * 100, 1),
        low_count=int(row["pred_low"]),
        middle_pct=round(int(row["pred_middle"]) / max(surveyed, 1) * 100, 1),
        middle_count=int(row["pred_middle"]),
        high_pct=round(int(row["pred_high"]) / max(surveyed, 1) * 100, 1),
        high_count=int(row["pred_high"]),
        shap_drivers_text=shap_drivers_text,
    )

    try:
        resp = GEMINI_CLIENT.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )
        brief_data = json.loads(resp.text.strip())

        # Save into policy_briefs.json so it's persisted for subsequent visits
        current_briefs = get_policy_briefs()
        current_briefs[b_name] = brief_data
        try:
            BRIEFS_PATH.write_text(json.dumps(current_briefs, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            print(f"Warning: could not write to policy_briefs.json: {e}")

        return {
            "barangay": b_name,
            "policy_brief": brief_data,
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "model": GEMINI_MODEL,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gemini generation error: {str(exc)}")

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

    ai_analysis = None
    if GEMINI_CLIENT:
        try:
            sim_prompt = f"""You are a Philippine social welfare policy analyst advising the Quezon City Local Government Unit.
A policy simulation was just run for Barangay {req.barangay} using a Stacking Ensemble Machine Learning model.

Simulation Parameters:
- Financial Support intensity: {req.financial}%
- Education Support intensity: {req.education}%
- Livelihood Support intensity: {req.livelihood}%
- Time Horizon: {req.years} years

Results from Machine Learning Re-Scoring:
- Total families surveyed: {total}
- Low-Income (Survival) families: {now_counts['Low']} -> {fut_counts['Low']} ({low_reduction}% reduction)
- Middle-Income (Subsistence) families: {now_counts['Middle']} -> {fut_counts['Middle']}
- High-Income (Self-Sufficient) families: {now_counts['High']} -> {fut_counts['High']}
- Upward Mobility: +{moved_up} families moved up tiers
- Stayed in same tier: {stayed} families
- Moved down: {moved_down} families
- Key indicator shifts:
  * Family size: {indicator_deltas[0]['before']} -> {indicator_deltas[0]['after']}
  * Dependents: {indicator_deltas[1]['before']} -> {indicator_deltas[1]['after']}
  * School attendance: {indicator_deltas[2]['before']} -> {indicator_deltas[2]['after']}
  * Active 4Ps share: {indicator_deltas[3]['before']}% -> {indicator_deltas[3]['after']}%

Instructions:
Provide a concise 2-sentence executive interpretation of this simulation result. State clearly why this specific policy combination produced this outcome and what the LGU should prioritize next. No markdown asterisks or bullet points.
"""
            resp = GEMINI_CLIENT.models.generate_content(
                model=GEMINI_MODEL,
                contents=sim_prompt,
                config=types.GenerateContentConfig(temperature=0.3),
            )
            ai_analysis = resp.text.strip()
        except Exception as e:
            print(f"Warning: Gemini simulation interpretation failed: {e}")

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
        "ai_analysis": ai_analysis,
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

    grid = [0, 25, 50, 75, 100]
    combos = [(f, e, l) for f in grid for e in grid for l in grid]
    
    # Build batch dataframe for all combinations
    dfs = [simulate_intervention(match, f, e, l, req.years)[features] for (f, e, l) in combos]
    stacked_df = pd.concat(dfs, ignore_index=True)
    all_preds = pipe.predict(stacked_df)
    
    n_families = len(match)
    viable = []
    best_attempt = None
    best_reduction = -1.0

    for idx, (f, e, l) in enumerate(combos):
        start = idx * n_families
        end = start + n_families
        fut_low = int((all_preds[start:end] == 0).sum())
        red = (now_low - fut_low) / now_low * 100.0
        entry = {
            "financial": f,
            "education": e,
            "livelihood": l,
            "total_effort": f + e + l,
            "reduction_pct": round(red, 1),
            "projected_low": fut_low,
        }
        if red >= req.target_reduction_pct:
            viable.append(entry)
        if red > best_reduction:
            best_reduction = red
            best_attempt = entry

    viable.sort(key=lambda x: (x["total_effort"], -x["reduction_pct"]))
    best_plan = viable[0] if viable else best_attempt

    ai_roadmap = None
    if GEMINI_CLIENT and best_plan:
        try:
            gs_prompt = f"""You are a Philippine social welfare policy analyst advising the Quezon City Local Government Unit.
An automated Goal-Seek Optimization was executed using the Stacking Ensemble Machine Learning model for Barangay {req.barangay}.

Target Goal: Reduce Low-Income (Survival) families by {req.target_reduction_pct}% within {req.years} years.
Baseline State: {now_low} Low-Income families surveyed.
Mathematically Optimal Solution Found by Model:
- Financial Assistance: {best_plan['financial']}%
- Educational Support: {best_plan['education']}%
- Livelihood & Employment: {best_plan['livelihood']}%
- Projected Reduction: {best_plan['reduction_pct']}% (leaving {best_plan['projected_low']} low-income families)

Instructions:
Provide a concise 2-3 sentence implementation roadmap. Explain why this specific mix hits the goal with minimum wasted effort and specify which year milestones the LGU should inspect. Do not use asterisks or bullet points.
"""
            resp = GEMINI_CLIENT.models.generate_content(
                model=GEMINI_MODEL,
                contents=gs_prompt,
                config=types.GenerateContentConfig(temperature=0.3),
            )
            ai_roadmap = resp.text.strip()
        except Exception as e:
            print(f"Warning: Gemini goal-seek roadmap failed: {e}")

    return {
        "now_low_families": now_low,
        "viable_plans": viable[:5],
        "best_plan": best_plan,
        "ai_roadmap": ai_roadmap,
        "target_met": bool(viable),
    }

class ClassifyIndividualRequest(BaseModel):
    monthly_per_capita_income: float
    family_size: float
    dependents_0_18: float
    children_in_school: float
    household_status: str = "Active"
    barangay: Optional[str] = "Batasan Hills"

@app.post("/api/classify-individual")
def classify_individual(req: ClassifyIndividualRequest):
    model_obj = get_individual_model() or get_model()
    if not model_obj:
        raise HTTPException(status_code=500, detail="ML Model not available.")

    pipeline = model_obj["pipeline"] if isinstance(model_obj, dict) else model_obj
    classes = model_obj.get("classes", ["Low", "Middle", "High"]) if isinstance(model_obj, dict) else ["Low", "Middle", "High"]

    # Ratio calculation
    ratio = (req.children_in_school / req.dependents_0_18) if req.dependents_0_18 > 0 else 1.0
    ratio = min(max(ratio, 0.0), 1.0)

    # Input DataFrame tailored to individual family model
    input_df = pd.DataFrame([{
        "monthly_per_capita_income": req.monthly_per_capita_income,
        "family_size": req.family_size,
        "dependents_0_18": req.dependents_0_18,
        "children_in_school": req.children_in_school,
        "children_in_school_ratio": ratio,
        "household_status": req.household_status if req.household_status in ["Active", "Graduated", "Conditionally Compliant"] else "None",
    }])

    # Fallback columns if older pipeline is active
    if "pop_2024" in getattr(pipeline.named_steps.get("prep"), "transformers_", [[]])[0][2]:
        input_df["pop_2024"] = 65000.0
        input_df["pop_growth_2000_2024"] = 15.0
        input_df["pop_growth_2020_2024"] = 2.5
        input_df["four_ps_per_1k_pop"] = 25.0
        input_df["active_4ps_share"] = 80.0
        input_df["barangay"] = req.barangay if req.barangay else "Bagbag"

    # Predict probabilities
    try:
        probs = pipeline.predict_proba(input_df)[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

    best_idx = int(np.argmax(probs))
    pred_class = classes[best_idx]
    confidence = float(probs[best_idx])
    prob_dict = {cls_name: float(probs[i]) for i, cls_name in enumerate(classes)}

    # Compute marginal sensitivity directly on the dedicated model
    base_defaults = {
        "monthly_per_capita_income": 2800.0,
        "family_size": 4.5,
        "dependents_0_18": 2.2,
        "children_in_school": 1.9,
        "household_status": "Active",
    }

    feat_sensitivities = {}
    factors = [
        ("Monthly Income", "monthly_per_capita_income"),
        ("Family Size", "family_size"),
        ("Dependents (0-18)", "dependents_0_18"),
        ("Children in School", "children_in_school"),
        ("4Ps Household Status", "household_status"),
    ]

    for label, col in factors:
        alt_df = input_df.copy()
        alt_df[col] = base_defaults[col]
        if col in ["dependents_0_18", "children_in_school"]:
            d_val = alt_df["dependents_0_18"].values[0]
            s_val = alt_df["children_in_school"].values[0]
            alt_df["children_in_school_ratio"] = min(max((s_val / d_val) if d_val > 0 else 1.0, 0.0), 1.0)
        try:
            alt_prob = pipeline.predict_proba(alt_df)[0][best_idx]
            feat_sensitivities[label] = max(abs(confidence - alt_prob), 0.005)
        except Exception:
            feat_sensitivities[label] = 0.02

    total_sens = sum(feat_sensitivities.values())
    sorted_sens = sorted(feat_sensitivities.items(), key=lambda x: x[1], reverse=True)
    feature_impacts = [
        {"feature": name, "impact": round((val / total_sens) * 100, 1)}
        for name, val in sorted_sens
    ]

    tier_meaning = "Survival · High Vulnerability" if pred_class == "Low" else (
        "Subsistence · Moderate Vulnerability" if pred_class == "Middle" else "Self-Sufficient · Stable"
    )

    # Dynamic Gemini AI generation for recommendations & interpretation
    interpretation = None
    recommendations = []

    if GEMINI_CLIENT:
        try:
            top_factors_str = ", ".join([f"{f['feature']} ({f['impact']}%)" for f in feature_impacts[:3]])
            barangay_str = f"Barangay {req.barangay}" if req.barangay else "District V"
            ai_prompt = f"""You are KalingaBot, an expert Philippine social welfare AI assistant for Quezon City District V.
Analyze this household data from {barangay_str} classified by our Stacking ML Ensemble model:
- Barangay: {barangay_str}, Quezon City District V
- Monthly Per-Capita Income: PHP {req.monthly_per_capita_income:,.0f}
- Family Size: {int(req.family_size)} members
- Dependents under 18: {int(req.dependents_0_18)}
- Children in School: {int(req.children_in_school)}
- 4Ps Household Status: {req.household_status}
- Predicted SWDI Tier: {pred_class} ({tier_meaning}) with {confidence*100:.1f}% confidence
- Top Model Decision Drivers: {top_factors_str}

Respond strictly in valid JSON format matching this schema:
{{
  "interpretation": "2 concise, encouraging sentences explaining why this family in {barangay_str} was classified into this tier based on their specific numbers and highlighting their immediate next priority. Do not use asterisks or markdown bold.",
  "recommendations": [
    {{
      "name": "Program Name (e.g. DSWD 4Ps, QC Educational Grant, DSWD SLP, DOLE TUPAD, TESDA, Barangay Livelihood Desk)",
      "agency": "Lead Agency (e.g. DSWD, QC LGU, DOLE, TESDA, Barangay Council)",
      "sector": "Sector (e.g. Financial, Education, Livelihood, Skills)",
      "rationale": "1 concise sentence explaining why this program directly benefits this household in {barangay_str} based on their numbers."
    }}
  ]
}}
Provide 2 to 3 tailored recommendations."""

            resp = GEMINI_CLIENT.models.generate_content(
                model=GEMINI_MODEL,
                contents=ai_prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    response_mime_type="application/json",
                ),
            )
            data = json.loads(resp.text.strip())
            interpretation = data.get("interpretation")
            recommendations = data.get("recommendations", [])
        except Exception as e:
            print(f"Warning: Gemini individual evaluation failed: {e}")

    # Fallback if Gemini unavailable or offline
    if not recommendations:
        if pred_class == "Low":
            recommendations = [
                {"name": "DSWD Pantawid Pamilyang Pilipino Program (4Ps)", "agency": "DSWD", "sector": "Financial Assistance", "rationale": f"Provides conditional cash transfers to support basic food & health needs for {int(req.family_size)} household members."},
                {"name": "QC LGU Educational Assistance Subsidy", "agency": "QC LGU / DepEd", "sector": "Education Support", "rationale": f"Covers school fees, supplies, and uniforms for {int(req.dependents_0_18)} dependent children living at home."},
                {"name": "Assistance to Individuals in Crisis Situations (AICS)", "agency": "DSWD / QC SSDD", "sector": "Emergency Relief", "rationale": f"Emergency safety net cash support to alleviate critical monthly income deficits (PHP {req.monthly_per_capita_income:,.0f}/capita)."}
            ]
        elif pred_class == "Middle":
            recommendations = [
                {"name": "Sustainable Livelihood Program (SLP) Micro-Enterprise", "agency": "DSWD / DOLE", "sector": "Livelihood Capital", "rationale": "Seed capital grant and financial literacy mentoring to increase family self-reliance."},
                {"name": "QC Technical-Vocational & Skills Certification", "agency": "TESDA / QC Skills Academy", "sector": "Skills Training", "rationale": "Vocational upskilling for adult earners to boost monthly earning capacity beyond subsistence."},
                {"name": "Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers (TUPAD)", "agency": "DOLE", "sector": "Emergency Employment", "rationale": "Short-term community work opportunities providing wage support during low-earning periods."}
            ]
        else:
            recommendations = [
                {"name": "QC Small Business Development & MSME Financing", "agency": "QC SBCorp / DTI", "sector": "Enterprise Growth", "rationale": "Low-interest credit lines and business development services to expand self-sustaining enterprises."},
                {"name": "Quezon City Tertiary Academic Scholarship Program", "agency": "QC Youth Development Office", "sector": "Higher Education", "rationale": f"Higher education tuition subsidies for the {int(req.children_in_school)} student(s) entering tertiary levels."}
            ]

    if not interpretation:
        interpretation = (
            f"With a monthly per-capita income of PHP {req.monthly_per_capita_income:,.0f} and {int(req.family_size)} household members, "
            f"the ensemble model classifies this family into {tier_meaning} at {confidence*100:.1f}% confidence. "
            f"Targeted support in {recommendations[0]['sector'].lower()} will be most effective in reinforcing their socio-economic resilience."
        )

    return {
        "predicted_class": pred_class,
        "tier_meaning": tier_meaning,
        "confidence": confidence,
        "probabilities": prob_dict,
        "feature_impacts": feature_impacts,
        "recommendations": recommendations,
        "interpretation": interpretation,
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
