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
BARANGAY_MODEL_PATH = BASE / "models" / "barangay_stacking_model.joblib"
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

def get_barangay_model():
    if "barangay_model" not in _CACHE:
        if BARANGAY_MODEL_PATH.exists():
            _CACHE["barangay_model"] = joblib.load(BARANGAY_MODEL_PATH)
        else:
            _CACHE["barangay_model"] = None
    return _CACHE["barangay_model"]

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
    monthly_per_capita_income: Optional[float] = None
    total_monthly_income: Optional[float] = None
    family_size: float
    dependents_0_18: float
    children_in_school: float
    household_status: Optional[str] = "None"
    barangay: Optional[str] = "Batasan Hills"

@app.post("/api/classify-individual")
def classify_individual(req: ClassifyIndividualRequest):
    model_obj = get_individual_model() or get_model()
    if not model_obj:
        raise HTTPException(status_code=500, detail="ML Model not available.")

    pipeline = model_obj["pipeline"] if isinstance(model_obj, dict) else model_obj
    classes = model_obj.get("classes", ["Low", "Middle", "High"]) if isinstance(model_obj, dict) else ["Low", "Middle", "High"]

    family_size = max(req.family_size, 1)
    if req.total_monthly_income is not None:
        total_income = req.total_monthly_income
    elif req.monthly_per_capita_income is not None:
        total_income = req.monthly_per_capita_income * family_size
    else:
        raise HTTPException(status_code=422, detail="Provide total_monthly_income.")

    # Ratio calculation
    ratio = (req.children_in_school / req.dependents_0_18) if req.dependents_0_18 > 0 else 1.0
    ratio = min(max(ratio, 0.0), 1.0)

    # Engineered features for individual family model (8 numerical features, no per-capita)
    dep_ratio = min(req.dependents_0_18 / family_size, 1.0)
    out_of_school = max(req.dependents_0_18 - req.children_in_school, 0.0)
    income_per_dep = (total_income / req.dependents_0_18) if req.dependents_0_18 > 0 else total_income

    # Input DataFrame tailored to individual family model (Total Monthly Income only)
    input_df = pd.DataFrame([{
        "total_monthly_income": total_income,
        "family_size": family_size,
        "dependents_0_18": req.dependents_0_18,
        "children_in_school": req.children_in_school,
        "children_in_school_ratio": ratio,
        "dep_ratio": dep_ratio,
        "out_of_school_count": out_of_school,
        "income_per_dependent": income_per_dep,
    }])

    # Predict probabilities
    try:
        probs = pipeline.predict_proba(input_df)[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

    best_idx = int(np.argmax(probs))
    pred_class = classes[best_idx]
    confidence = float(probs[best_idx])
    prob_dict = {cls_name: float(probs[i]) for i, cls_name in enumerate(classes)}

    # ── Hybrid Feature Impact: tree importances × contextual deviation ──
    FEATURE_NAMES = [
        ("Total Monthly Income", "total_monthly_income"),
        ("Family Size", "family_size"),
        ("Minor Dependents", "dependents_0_18"),
        ("Children in School", "children_in_school"),
        ("School Attendance Rate", "children_in_school_ratio"),
        ("Dependency Burden", "dep_ratio"),
        ("Out-of-School Children", "out_of_school_count"),
        ("Income per Dependent", "income_per_dependent"),
    ]

    # District V dataset norms by predicted tier (pre-computed from 4,545 records)
    TIER_NORMS = {
        "Low":    {"total_monthly_income": 8972, "family_size": 5.8, "dependents_0_18": 3.2, "children_in_school": 2.5, "children_in_school_ratio": 0.81, "dep_ratio": 0.55, "out_of_school_count": 0.7, "income_per_dependent": 2800},
        "Middle": {"total_monthly_income": 15276, "family_size": 5.7, "dependents_0_18": 2.7, "children_in_school": 2.1, "children_in_school_ratio": 0.83, "dep_ratio": 0.47, "out_of_school_count": 0.6, "income_per_dependent": 5600},
        "High":   {"total_monthly_income": 27111, "family_size": 5.1, "dependents_0_18": 2.4, "children_in_school": 1.9, "children_in_school_ratio": 0.84, "dep_ratio": 0.47, "out_of_school_count": 0.5, "income_per_dependent": 11300},
    }
    TIER_STDS = {
        "Low":    {"total_monthly_income": 4000, "family_size": 2.5, "dependents_0_18": 2.0, "children_in_school": 1.8, "children_in_school_ratio": 0.25, "dep_ratio": 0.25, "out_of_school_count": 1.2, "income_per_dependent": 2000},
        "Middle": {"total_monthly_income": 5000, "family_size": 2.4, "dependents_0_18": 1.8, "children_in_school": 1.6, "children_in_school_ratio": 0.24, "dep_ratio": 0.24, "out_of_school_count": 1.1, "income_per_dependent": 3000},
        "High":   {"total_monthly_income": 15000, "family_size": 2.3, "dependents_0_18": 1.7, "children_in_school": 1.5, "children_in_school_ratio": 0.23, "dep_ratio": 0.23, "out_of_school_count": 1.0, "income_per_dependent": 8000},
    }

    # Extract real tree-based global importances from base learners
    try:
        stack = pipeline.named_steps["stack"]
        rf_imp = stack.estimators_[0].feature_importances_
        xgb_imp = stack.estimators_[1].feature_importances_
        blended_imp = (rf_imp + xgb_imp) / 2.0
        tree_weights = {
            label: float(blended_imp[i]) for i, (label, _) in enumerate(FEATURE_NAMES) if i < len(blended_imp)
        }
    except Exception:
        tree_weights = {
            "Total Monthly Income": 0.45, "Income per Dependent": 0.20,
            "Minor Dependents": 0.10, "Family Size": 0.09, "Out-of-School Children": 0.06,
            "Children in School": 0.05, "Dependency Burden": 0.03, "School Attendance Rate": 0.02,
        }

    # Compute contextual z-score deviations from the predicted tier norms
    norms = TIER_NORMS.get(pred_class, TIER_NORMS["High"])
    stds = TIER_STDS.get(pred_class, TIER_STDS["High"])
    user_vals = {
        "Total Monthly Income": total_income,
        "Family Size": family_size,
        "Minor Dependents": req.dependents_0_18,
        "Children in School": req.children_in_school,
        "School Attendance Rate": ratio,
        "Dependency Burden": dep_ratio,
        "Out-of-School Children": out_of_school,
        "Income per Dependent": income_per_dep,
    }
    norm_keys = dict(FEATURE_NAMES)

    # Blend: tree_importance × (1 + z_score_deviation) to amplify features that are abnormal
    hybrid_scores = {}
    for label in tree_weights:
        nk = norm_keys[label]
        z = abs(user_vals[label] - norms[nk]) / max(stds[nk], 0.01)
        hybrid_scores[label] = tree_weights[label] * (1.0 + min(z, 5.0))

    FEATURE_DETAILS = {
        "Total Monthly Income": {
            "format": lambda v: f"₱{v:,.0f}/mo",
            "desc": "Combined monthly household earning capacity"
        },
        "Income per Dependent": {
            "format": lambda v: f"₱{v:,.0f}/child",
            "desc": "Monthly earnings available per minor dependent"
        },
        "Family Size": {
            "format": lambda v: f"{int(v)} members",
            "desc": "Total household headcount supported"
        },
        "Minor Dependents": {
            "format": lambda v: f"{int(v)} dependents",
            "desc": "Children under 18 requiring support"
        },
        "Children in School": {
            "format": lambda v: f"{int(v)} enrolled",
            "desc": "School-age children attending school"
        },
        "School Attendance Rate": {
            "format": lambda v: f"{v*100:.0f}% rate",
            "desc": "Proportion of school-age children in school"
        },
        "Dependency Burden": {
            "format": lambda v: f"{v*100:.0f}% minors",
            "desc": "Proportion of household that are minors"
        },
        "Out-of-School Children": {
            "format": lambda v: f"{int(v)} out of school",
            "desc": "Children currently not attending school"
        },
    }

    total_hybrid = sum(hybrid_scores.values())
    sorted_hybrid = sorted(hybrid_scores.items(), key=lambda x: x[1], reverse=True)
    feature_impacts = []
    for rank, (name, val) in enumerate(sorted_hybrid[:6], 1):
        pct = round((val / max(total_hybrid, 0.001)) * 100, 1)
        detail = FEATURE_DETAILS.get(name, {})
        fmt_val = detail["format"](user_vals[name]) if "format" in detail else str(user_vals[name])
        feature_impacts.append({
            "feature": name,
            "impact": pct,
            "user_value": fmt_val,
            "desc": detail.get("desc", ""),
            "rank": rank,
        })

    # ── Vulnerability Flags: warn social workers about critical risk indicators ──
    vulnerability_flags = []
    if req.dependents_0_18 > 0 and ratio < 0.5:
        vulnerability_flags.append({
            "flag": "Low School Attendance",
            "severity": "critical" if ratio < 0.35 else "warning",
            "detail": f"{int(out_of_school)} out of {int(req.dependents_0_18)} children are not in school ({(1-ratio)*100:.0f}% out-of-school rate)."
        })
    if req.family_size >= 8:
        vulnerability_flags.append({
            "flag": "Large Household Burden",
            "severity": "warning",
            "detail": f"Family of {int(req.family_size)} is significantly above the District V average of 5.3 members."
        })
    if req.dependents_0_18 >= 5:
        vulnerability_flags.append({
            "flag": "High Dependency Load",
            "severity": "warning",
            "detail": f"{int(req.dependents_0_18)} minor dependents place heavy financial and caregiving strain."
        })
    if total_income > 20000:
        if req.dependents_0_18 >= 4 and income_per_dep < 8000:
            vulnerability_flags.append({
                "flag": "Income-to-Burden Mismatch",
                "severity": "warning",
                "detail": f"Despite high household income, supporting {int(req.dependents_0_18)} dependents leaves only PHP {income_per_dep:,.0f}/dependent."
            })

    tier_meaning = "Survival · High Vulnerability" if pred_class == "Low" else (
        "Subsistence · Moderate Vulnerability" if pred_class == "Middle" else "Self-Sufficient · Stable"
    )

    # Dynamic Gemini AI generation for recommendations & interpretation
    interpretation = None
    recommendations = []

    if GEMINI_CLIENT:
        try:
            top_factors_str = ", ".join([f"{f['feature']} ({f['impact']}%)" for f in feature_impacts[:3]])
            vuln_text = ""
            if vulnerability_flags:
                vuln_text = "\n- VULNERABILITY WARNINGS: " + "; ".join([f"{v['flag']}: {v['detail']}" for v in vulnerability_flags])
            barangay_str = f"Barangay {req.barangay}" if req.barangay else "District V"
            ai_prompt = f"""You are KalingaBot, an expert Philippine social welfare AI assistant for Quezon City District V.
Analyze this household data from {barangay_str} classified by our Stacking ML Ensemble model:
- Barangay: {barangay_str}, Quezon City District V
- Total Household Monthly Income: PHP {total_income:,.0f}/month
- Family Size: {int(family_size)} members
- Dependents under 18: {int(req.dependents_0_18)}
- Children in School: {int(req.children_in_school)} out of {int(req.dependents_0_18)} ({ratio*100:.0f}% attendance)
- Predicted SWDI Tier: {pred_class} ({tier_meaning}) with {confidence*100:.1f}% confidence
- Top Model Decision Drivers: {top_factors_str}{vuln_text}

Respond strictly in valid JSON format matching this schema:
{{
  "interpretation": "2 concise, encouraging sentences explaining why this family in {barangay_str} was classified into this tier based on their specific numbers. If there are vulnerability warnings, acknowledge them honestly and highlight the most urgent priority. Do not use asterisks or markdown bold.",
  "recommendations": [
    {{
      "name": "Program Name (e.g. DSWD 4Ps, QC Educational Grant, DSWD SLP, DOLE TUPAD, TESDA, Barangay Livelihood Desk)",
      "agency": "Lead Agency (e.g. DSWD, QC LGU, DOLE, TESDA, Barangay Council)",
      "sector": "Sector (e.g. Financial, Education, Livelihood, Skills)",
      "rationale": "1 concise sentence explaining why this program directly benefits this household in {barangay_str} based on their numbers."
    }}
  ]
}}
Provide 2 to 3 tailored recommendations. If vulnerability flags exist, prioritize education or child welfare programs."""

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
                {"name": "DSWD Pantawid Pamilyang Pilipino Program (4Ps)", "agency": "DSWD", "sector": "Financial Assistance", "rationale": f"Provides conditional cash transfers to support basic food & health needs for {int(family_size)} household members."},
                {"name": "QC LGU Educational Assistance Subsidy", "agency": "QC LGU / DepEd", "sector": "Education Support", "rationale": f"Covers school fees, supplies, and uniforms for {int(req.dependents_0_18)} dependent children living at home."},
                {"name": "Assistance to Individuals in Crisis Situations (AICS)", "agency": "DSWD / QC SSDD", "sector": "Emergency Relief", "rationale": f"Emergency safety net cash support to alleviate critical monthly income deficits."}
            ]
        elif pred_class == "Middle":
            recommendations = [
                {"name": "Sustainable Livelihood Program (SLP) Micro-Enterprise", "agency": "DSWD / DOLE", "sector": "Livelihood Capital", "rationale": "Seed capital grant and financial literacy mentoring to increase family self-reliance."},
                {"name": "QC Technical-Vocational & Skills Certification", "agency": "TESDA / QC Skills Academy", "sector": "Skills Training", "rationale": "Vocational upskilling for adult earners to boost monthly earning capacity beyond subsistence."},
                {"name": "Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers (TUPAD)", "agency": "DOLE", "sector": "Emergency Employment", "rationale": "Short-term community work opportunities providing wage support during low-earning periods."}
            ]
        else:
            # If Level 3 but has vulnerability flags, prioritize education/welfare
            if vulnerability_flags:
                recommendations = [
                    {"name": "QC LGU Educational Assistance & Back-to-School Program", "agency": "QC LGU / DepEd", "sector": "Education Support", "rationale": f"Urgent enrollment assistance for the {int(out_of_school)} out-of-school children to prevent long-term poverty traps."},
                    {"name": "Barangay Council for the Protection of Children (BCPC)", "agency": "Barangay LGU / DSWD", "sector": "Child Welfare", "rationale": f"Case management and monitoring for {int(req.dependents_0_18)} minor dependents to ensure access to education and health services."},
                    {"name": "TESDA Community-Based Skills Training", "agency": "TESDA", "sector": "Skills Training", "rationale": "Vocational training for older dependents approaching working age to build future self-reliance."}
                ]
            else:
                recommendations = [
                    {"name": "QC Small Business Development & MSME Financing", "agency": "QC SBCorp / DTI", "sector": "Enterprise Growth", "rationale": "Low-interest credit lines and business development services to expand self-sustaining enterprises."},
                    {"name": "Quezon City Tertiary Academic Scholarship Program", "agency": "QC Youth Development Office", "sector": "Higher Education", "rationale": f"Higher education tuition subsidies for the {int(req.children_in_school)} student(s) entering tertiary levels."}
                ]

    if not interpretation:
        vuln_note = ""
        if vulnerability_flags:
            vuln_note = f" However, {vulnerability_flags[0]['detail']} Immediate attention to {vulnerability_flags[0]['flag'].lower()} is recommended."
        interpretation = (
            f"With a total monthly household income of PHP {total_income:,.0f} supporting {int(family_size)} members, "
            f"the ensemble model classifies this family into {tier_meaning} at {confidence*100:.1f}% confidence.{vuln_note}"
        )

    return {
        "predicted_class": pred_class,
        "tier_meaning": tier_meaning,
        "confidence": confidence,
        "probabilities": prob_dict,
        "feature_impacts": feature_impacts,
        "vulnerability_flags": vulnerability_flags,
        "recommendations": recommendations,
        "interpretation": interpretation,
        "total_monthly_income": round(total_income, 2),
        "family_size": int(family_size),
    }


# ── Barangay-Level Income Classifier ─────────────────────────────────────────
class ClassifyBarangayRequest(BaseModel):
    barangay: Optional[str] = "Custom"
    pct_employed_head: float
    avg_monthly_income_php: float
    pct_with_access_to_electricity: float
    pct_with_safe_water_access: float
    pct_with_sanitary_toilet: float
    net_enrollment_rate: float
    pct_permanent_house_material: float
    pct_informal_settlers: float
    avg_family_size: float
    pct_completed_secondary_education: float

@app.post("/api/classify-barangay")
def classify_barangay(req: ClassifyBarangayRequest):
    model_obj = get_barangay_model()
    if not model_obj:
        raise HTTPException(status_code=500, detail="Barangay ML Model not available.")

    pipeline = model_obj["pipeline"]
    classes = model_obj["classes"]
    base_weights = model_obj.get("feature_importances", {})

    input_df = pd.DataFrame([{
        "pct_employed_head": req.pct_employed_head,
        "avg_monthly_income_php": req.avg_monthly_income_php,
        "pct_with_access_to_electricity": req.pct_with_access_to_electricity,
        "pct_with_safe_water_access": req.pct_with_safe_water_access,
        "pct_with_sanitary_toilet": req.pct_with_sanitary_toilet,
        "net_enrollment_rate": req.net_enrollment_rate,
        "pct_permanent_house_material": req.pct_permanent_house_material,
        "pct_informal_settlers": req.pct_informal_settlers,
        "avg_family_size": req.avg_family_size,
        "pct_completed_secondary_education": req.pct_completed_secondary_education,
    }])

    try:
        probs = pipeline.predict_proba(input_df)[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

    best_idx = int(np.argmax(probs))
    pred_class = classes[best_idx]
    confidence = float(probs[best_idx])
    prob_dict = {c: float(probs[i]) for i, c in enumerate(classes)}

    user_vals = {
        "Employed Household Heads": req.pct_employed_head,
        "Average Monthly Income": req.avg_monthly_income_php,
        "Electricity Access": req.pct_with_access_to_electricity,
        "Safe Drinking Water Access": req.pct_with_safe_water_access,
        "Sanitary Toilet Facility": req.pct_with_sanitary_toilet,
        "Net School Enrollment": req.net_enrollment_rate,
        "Permanent Housing Materials": req.pct_permanent_house_material,
        "Informal Settlement Rate": req.pct_informal_settlers,
        "Average Family Size": req.avg_family_size,
        "Secondary Education Completion": req.pct_completed_secondary_education,
    }

    NORMS = {
        "Employed Household Heads": 59.0,
        "Average Monthly Income": 25500.0,
        "Electricity Access": 76.0,
        "Safe Drinking Water Access": 69.0,
        "Sanitary Toilet Facility": 67.7,
        "Net School Enrollment": 80.0,
        "Permanent Housing Materials": 55.2,
        "Informal Settlement Rate": 31.0,
        "Average Family Size": 5.15,
        "Secondary Education Completion": 55.1,
    }

    STDS = {
        "Employed Household Heads": 14.0,
        "Average Monthly Income": 9500.0,
        "Electricity Access": 13.0,
        "Safe Drinking Water Access": 14.5,
        "Sanitary Toilet Facility": 15.0,
        "Net School Enrollment": 9.0,
        "Permanent Housing Materials": 17.5,
        "Informal Settlement Rate": 15.5,
        "Average Family Size": 0.8,
        "Secondary Education Completion": 17.5,
    }

    KEY_TO_LABEL = {
        "pct_employed_head": "Employed Household Heads",
        "avg_monthly_income_php": "Average Monthly Income",
        "pct_with_access_to_electricity": "Electricity Access",
        "pct_with_safe_water_access": "Safe Drinking Water Access",
        "pct_with_sanitary_toilet": "Sanitary Toilet Facility",
        "net_enrollment_rate": "Net School Enrollment",
        "pct_permanent_house_material": "Permanent Housing Materials",
        "pct_informal_settlers": "Informal Settlement Rate",
        "avg_family_size": "Average Family Size",
        "pct_completed_secondary_education": "Secondary Education Completion",
    }

    DETAIL = {
        "Average Monthly Income": {
            "format": lambda v: f"₱{v:,.0f}/mo",
            "desc": "Primary economic capacity indicator (PSA FIES benchmark)"
        },
        "Informal Settlement Rate": {
            "format": lambda v: f"{v:.1f}%",
            "desc": "Households residing in informal/insecure land tenure (PSA CPH Housing dimension)"
        },
        "Permanent Housing Materials": {
            "format": lambda v: f"{v:.1f}%",
            "desc": "Quality of physical housing structures (PSA MPI Housing dimension)"
        },
        "Electricity Access": {
            "format": lambda v: f"{v:.1f}%",
            "desc": "Access to electrical power grid (Basic Infrastructure dimension)"
        },
        "Safe Drinking Water Access": {
            "format": lambda v: f"{v:.1f}%",
            "desc": "Safe water availability (PSA Water & Sanitation dimension)"
        },
        "Sanitary Toilet Facility": {
            "format": lambda v: f"{v:.1f}%",
            "desc": "Sanitary toilet access (PSA Water & Sanitation dimension)"
        },
        "Secondary Education Completion": {
            "format": lambda v: f"{v:.1f}%",
            "desc": "Educational attainment of household heads (Human Capital dimension)"
        },
        "Net School Enrollment": {
            "format": lambda v: f"{v:.1f}%",
            "desc": "School participation rate of school-age children (PSA MPI Education)"
        },
        "Employed Household Heads": {
            "format": lambda v: f"{v:.1f}%",
            "desc": "Gainful employment rate among household providers (PSA Employment)"
        },
        "Average Family Size": {
            "format": lambda v: f"{v:.1f} members",
            "desc": "Dependency load sharing household livelihood"
        },
    }

    hybrid = {}
    for feat_key, weight in base_weights.items():
        label = KEY_TO_LABEL.get(feat_key, feat_key)
        z = abs(user_vals.get(label, 0) - NORMS.get(label, 1)) / max(STDS.get(label, 1), 0.001)
        hybrid[label] = weight * (1.0 + min(z, 5.0))

    total_hybrid = sum(hybrid.values())
    sorted_hybrid = sorted(hybrid.items(), key=lambda x: x[1], reverse=True)

    feature_impacts = []
    for rank, (name, val) in enumerate(sorted_hybrid[:6], 1):
        pct = round((val / max(total_hybrid, 0.001)) * 100, 1)
        d = DETAIL.get(name, {})
        fmt_val = d["format"](user_vals[name]) if "format" in d else str(user_vals[name])
        feature_impacts.append({
            "feature": name,
            "impact": pct,
            "user_value": fmt_val,
            "desc": d.get("desc", ""),
            "rank": rank,
        })

    tier_label = (
        "Level 1 · Low-Income" if pred_class == "Low" else
        "Level 2 · Middle-Income" if pred_class == "Middle" else
        "Level 3 · High-Income"
    )

    return {
        "predicted_class": pred_class,
        "tier_label": tier_label,
        "confidence": confidence,
        "probabilities": prob_dict,
        "feature_impacts": feature_impacts,
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
