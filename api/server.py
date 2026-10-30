import io
import csv
import json
import logging
import math
import os
import time
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

BASE = Path(__file__).resolve().parent.parent
BARANGAY_MODEL_PATH = BASE / "models" / "barangay_stacking_model.joblib"

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

# Load Supabase Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
if not SUPABASE_URL:
    env_file = BASE / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("SUPABASE_URL="):
                SUPABASE_URL = line.split("=", 1)[1].strip().strip('"').strip("'")
            elif line.startswith("SUPABASE_KEY="):
                SUPABASE_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")


# Global caches
_CACHE = {}


def get_barangay_model():
    if "barangay_model" not in _CACHE:
        if BARANGAY_MODEL_PATH.exists():
            _CACHE["barangay_model"] = joblib.load(BARANGAY_MODEL_PATH)
        else:
            _CACHE["barangay_model"] = None
    return _CACHE["barangay_model"]

def _start_keep_alive_worker():
    """Background worker to keep cloud backends (Render, etc.) awake via scheduled ping every 10 mins."""
    def _worker():
        interval = int(os.environ.get("KEEP_ALIVE_INTERVAL_SEC", 600))
        target_url = os.environ.get("KEEP_ALIVE_URL") or os.environ.get("RENDER_EXTERNAL_URL")
        while True:
            time.sleep(interval)
            try:
                url = f"{target_url.rstrip('/')}/api/health" if target_url else "http://127.0.0.1:8000/api/health"
                import urllib.request
                req = urllib.request.Request(url, headers={"User-Agent": "KalingaBot-KeepAlive/1.0"})
                with urllib.request.urlopen(req, timeout=10):
                    pass
            except Exception:
                pass

    t = threading.Thread(target=_worker, daemon=True, name="keep-alive-worker")
    t.start()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eagerly pre-load ML models at server startup to eradicate the 35s cold start delay
    t0 = time.time()
    print("[Cold-Start Optimization] Pre-loading ML models into memory at build/startup...")
    try:
        get_barangay_model()
        print(f"[Cold-Start Optimization] Barangay stacking model ready in {time.time() - t0:.2f}s")
    except Exception as e:
        print(f"[Cold-Start Optimization] Warning: Failed to pre-load barangay model: {e}")
    _start_keep_alive_worker()
    yield

app = FastAPI(title="District V Income Classifier API", version="2.1.0", lifespan=lifespan)

# CORS — allow_credentials + wildcard origin is invalid per spec; use explicit origins.
# We allow all origins with the wildcard but WITHOUT credentials to keep it simple.
ALLOW_ORIGINS = [
    "https://income-classifier.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",  # allow all Vercel preview URLs
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global validation exception handler — produces clear, plain-language error explanations
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    origin = request.headers.get("origin", "")
    headers = {"Access-Control-Allow-Origin": origin or "*"}
    error_messages = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []) if loc != "body")
        msg = err.get("msg", "Invalid value")
        error_messages.append(f"{field}: {msg}" if field else msg)
    detail_str = "; ".join(error_messages)
    return JSONResponse(
        status_code=422,
        content={"detail": detail_str, "errors": exc.errors()},
        headers=headers,
    )

# Global exception handler — ensures CORS headers are present even on 500 errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {"Access-Control-Allow-Origin": origin or "*"}
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=headers)
    return JSONResponse(status_code=500, content={"detail": str(exc)}, headers=headers)

def _warmup_models_background():
    try:
        get_barangay_model()
    except Exception:
        pass

def check_supabase_health_sync():
    if not SUPABASE_URL:
        return {
            "configured": False,
            "status": "unconfigured",
            "project_ref": "vcpxuhvbiqghdweagiaa",
            "dashboard_url": "https://supabase.com/dashboard/project/vcpxuhvbiqghdweagiaa"
        }
    project_ref = "vcpxuhvbiqghdweagiaa"
    if "//" in SUPABASE_URL:
        try:
            project_ref = SUPABASE_URL.split("//")[1].split(".")[0]
        except Exception:
            pass
    import urllib.request
    try:
        req = urllib.request.Request(
            f"{SUPABASE_URL.rstrip('/')}/rest/v1/",
            headers={"apikey": SUPABASE_KEY or ""}
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            return {
                "configured": True,
                "status": "active",
                "code": resp.status,
                "project_ref": project_ref,
                "dashboard_url": f"https://supabase.com/dashboard/project/{project_ref}"
            }
    except Exception as e:
        return {
            "configured": True,
            "status": "paused",
            "project_ref": project_ref,
            "error": str(e),
            "dashboard_url": f"https://supabase.com/dashboard/project/{project_ref}"
        }

@app.get("/api/health")
@app.get("/health")
def health():
    if "barangay_model" not in _CACHE:
        threading.Thread(target=_warmup_models_background, daemon=True).start()
    return {
        "status": "online",
        "service": "District V Socio-Economic Income Classifier API",
        "timestamp": time.time(),
        "cached": {
            "barangay_model": "barangay_model" in _CACHE,
        },
        "supabase": {
            "configured": bool(SUPABASE_URL),
            "project_ref": "vcpxuhvbiqghdweagiaa",
            "dashboard_url": "https://supabase.com/dashboard/project/vcpxuhvbiqghdweagiaa",
        }
    }

@app.get("/api/health/supabase")
def supabase_health():
    return check_supabase_health_sync()


# ── Barangay-Level Income Classifier ─────────────────────────────────────────
class ClassifyBarangayRequest(BaseModel):
    barangay: Optional[str] = "Custom"
    pct_employed_head: float = Field(..., ge=0.0, le=100.0, description="Employed Household Heads must be between 0% and 100%")
    avg_monthly_income_php: float = Field(..., gt=0.0, description="Average Monthly Income must be positive (> 0)")
    pct_with_access_to_electricity: float = Field(..., ge=0.0, le=100.0, description="Electricity Access must be between 0% and 100%")
    pct_with_safe_water_access: float = Field(..., ge=0.0, le=100.0, description="Safe Drinking Water Access must be between 0% and 100%")
    pct_with_sanitary_toilet: float = Field(..., ge=0.0, le=100.0, description="Sanitary Toilet Facility must be between 0% and 100%")
    net_enrollment_rate: float = Field(..., ge=0.0, le=100.0, description="Net School Enrollment must be between 0% and 100%")
    pct_permanent_house_material: float = Field(..., ge=0.0, le=100.0, description="Permanent Housing Materials must be between 0% and 100%")
    pct_informal_settlers: float = Field(..., ge=0.0, le=100.0, description="Informal Settlement Rate must be between 0% and 100%")
    avg_family_size: float = Field(..., gt=0.0, le=30.0, description="Average Family Size must be between 1 and 30")
    pct_completed_secondary_education: float = Field(..., ge=0.0, le=100.0, description="Secondary Education Completion must be between 0% and 100%")


def evaluate_recommendation_safeguards(data: dict) -> tuple[bool, str]:
    """Check if community inputs are within realistic socio-economic bounds before invoking AI recommendations."""
    inc = float(data.get("avg_monthly_income_php", 0))
    fam = float(data.get("avg_family_size", 0))
    if inc < 1000 or inc > 300000:
        return False, f"Average monthly income (PHP {inc:,.0f}) looks too high or too low (expected ₱1,000 – ₱300,000)."
    if fam < 1.0 or fam > 20.0:
        return False, f"Average family size ({fam}) looks unusual (expected 1 – 20)."
    pct_fields = [
        ("pct_employed_head", "Employed Household Heads"),
        ("pct_with_access_to_electricity", "Electricity Access"),
        ("pct_with_safe_water_access", "Safe Drinking Water Access"),
        ("pct_with_sanitary_toilet", "Sanitary Toilet Facility"),
        ("net_enrollment_rate", "Net School Enrollment"),
        ("pct_permanent_house_material", "Permanent Housing Materials"),
        ("pct_informal_settlers", "Informal Settlement Rate"),
        ("pct_completed_secondary_education", "Secondary Education Completion"),
    ]
    for key, label in pct_fields:
        val = float(data.get(key, 0))
        if val < 0.0 or val > 100.0:
            return False, f"{label} ({val}%) must be between 0% and 100%."
    return True, ""

FEATURE_KEY_TO_LABEL = {
    "pct_employed_head": "Heads of family with jobs",
    "avg_monthly_income_php": "Monthly income",
    "pct_with_access_to_electricity": "Has electricity",
    "pct_with_safe_water_access": "Safe drinking water",
    "pct_with_sanitary_toilet": "Has proper toilet",
    "net_enrollment_rate": "Children in school",
    "pct_permanent_house_material": "Concrete/solid houses",
    "pct_informal_settlers": "Families without land title",
    "avg_family_size": "Family size",
    "pct_completed_secondary_education": "Finished high school",
}

# Reference profile for SHAP: the District V dataset averages. Contributions are read as
# "how much this indicator moved the prediction away from an average District V barangay".
DISTRICT_BASELINE = {
    "pct_employed_head": 59.0,
    "avg_monthly_income_php": 25500.0,
    "pct_with_access_to_electricity": 76.0,
    "pct_with_safe_water_access": 69.0,
    "pct_with_sanitary_toilet": 67.7,
    "net_enrollment_rate": 80.0,
    "pct_permanent_house_material": 55.2,
    "pct_informal_settlers": 31.0,
    "avg_family_size": 5.15,
    "pct_completed_secondary_education": 55.1,
}

FEATURE_DETAIL = {
    "avg_monthly_income_php": (lambda v: f"₱{v:,.0f}", "Average household income per month"),
    "pct_informal_settlers": (lambda v: f"{v:.0f}%", "Families who rent or have no land title"),
    "pct_permanent_house_material": (lambda v: f"{v:.0f}%", "Homes made of concrete or other solid materials"),
    "pct_with_access_to_electricity": (lambda v: f"{v:.0f}%", "Homes with electricity"),
    "pct_with_safe_water_access": (lambda v: f"{v:.0f}%", "Homes with clean drinking water"),
    "pct_with_sanitary_toilet": (lambda v: f"{v:.0f}%", "Homes with a proper toilet"),
    "pct_completed_secondary_education": (lambda v: f"{v:.0f}%", "Adults who finished high school"),
    "net_enrollment_rate": (lambda v: f"{v:.0f}%", "Children aged 6–17 in school"),
    "pct_employed_head": (lambda v: f"{v:.0f}%", "Heads of family who have work"),
    "avg_family_size": (lambda v: f"{v:.1f}", "Average number of people per home"),
}


def exact_shapley(pipeline, features: list, x: np.ndarray, reference: np.ndarray):
    """Exact SHAP values of the full stacking pipeline against a single reference profile.

    Enumerates all 2^n feature coalitions (1,024 for 10 features) and scores them in one
    batched predict_proba call. Numerically identical to shap.explainers.Exact with a
    one-row Independent masker, but ~40x faster because the ensemble is called once.
    Returns (phi[n_features, n_classes], reference_probs, input_probs).
    """
    n = len(features)
    masks = (np.arange(2 ** n)[:, None] >> np.arange(n)[::-1]) & 1  # row i = binary of i, MSB = feature 0
    probs = pipeline.predict_proba(pd.DataFrame(np.where(masks == 1, x, reference), columns=features))
    sizes = masks.sum(axis=1)
    fact = np.array([math.factorial(k) for k in range(n + 1)], dtype=float)
    phi = np.zeros((n, probs.shape[1]))
    for j in range(n):
        bit = 1 << (n - 1 - j)
        without_j = np.where(masks[:, j] == 0)[0]
        k = sizes[without_j]
        weights = fact[k] * fact[n - k - 1] / fact[n]
        phi[j] = weights @ (probs[without_j | bit] - probs[without_j])
    return phi, probs[0], probs[-1]


def execute_barangay_classification(data: dict, enable_gemini: bool = True) -> dict:
    """Executes ML inference, contextual feature driver calculation, recommendation safeguards, and policy advice."""
    model_obj = get_barangay_model()
    if not model_obj:
        raise HTTPException(status_code=500, detail="Barangay ML Model is not available.")

    pipeline = model_obj["pipeline"]
    classes = model_obj["classes"]
    features = model_obj["features"]

    b_name = str(data.get("barangay", "Custom")).strip()
    pct_emp = float(data["pct_employed_head"])
    inc = float(data["avg_monthly_income_php"])
    elec = float(data["pct_with_access_to_electricity"])
    water = float(data["pct_with_safe_water_access"])
    toilet = float(data["pct_with_sanitary_toilet"])
    enroll = float(data["net_enrollment_rate"])
    perm = float(data["pct_permanent_house_material"])
    informal = float(data["pct_informal_settlers"])
    fam_size = float(data["avg_family_size"])
    sec_ed = float(data["pct_completed_secondary_education"])

    input_df = pd.DataFrame([{
        "pct_employed_head": pct_emp,
        "avg_monthly_income_php": inc,
        "pct_with_access_to_electricity": elec,
        "pct_with_safe_water_access": water,
        "pct_with_sanitary_toilet": toilet,
        "net_enrollment_rate": enroll,
        "pct_permanent_house_material": perm,
        "pct_informal_settlers": informal,
        "avg_family_size": fam_size,
        "pct_completed_secondary_education": sec_ed,
    }])

    try:
        probs = pipeline.predict_proba(input_df)[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Barangay inference error: {str(e)}")

    best_idx = int(np.argmax(probs))
    pred_class = classes[best_idx]
    confidence = float(probs[best_idx])
    prob_dict = {c: float(probs[i]) for i, c in enumerate(classes)}

    # ── SHAP explanation of this prediction (exact, vs. the District V average profile) ──
    x_vec = input_df[features].to_numpy(dtype=float)[0]
    ref_vec = np.array([DISTRICT_BASELINE[f] for f in features], dtype=float)
    phi, ref_probs, _ = exact_shapley(pipeline, features, x_vec, ref_vec)
    low_idx = classes.index("Low")

    contributions = []
    for j, key in enumerate(features):
        fmt, desc = FEATURE_DETAIL[key]
        contributions.append({
            "key": key,
            "feature": FEATURE_KEY_TO_LABEL[key],
            "value": fmt(x_vec[j]),
            "reference": fmt(ref_vec[j]),
            "desc": desc,
            "shap": round(float(phi[j, best_idx]), 5),
            "shap_level1": round(float(phi[j, low_idx]), 5),
        })
    contributions.sort(key=lambda c: abs(c["shap"]), reverse=True)

    shap_explanation = {
        "method": "Exact SHAP values over all 1,024 combinations of the 10 indicators",
        "reference_label": "District V average profile",
        "explained_class": pred_class,
        "base_value": float(ref_probs[best_idx]),
        "output_value": confidence,
        "contributions": contributions,
    }

    total_abs = sum(abs(c["shap"]) for c in contributions) or 1.0
    feature_impacts = [
        {
            "feature": c["feature"],
            "impact": round(abs(c["shap"]) / total_abs * 100, 1),
            "shap": c["shap"],
            "direction": "supports" if c["shap"] >= 0 else "against",
            "user_value": c["value"],
            "desc": c["desc"],
            "rank": rank,
        }
        for rank, c in enumerate(contributions[:6], 1)
    ]

    tier_label = (
        "Level 1 · Low Income" if pred_class == "Low" else
        "Level 2 · Middle Income" if pred_class == "Middle" else
        "Level 3 · Higher Income"
    )

    tier_meaning = (
        "Needs most help" if pred_class == "Low" else
        "Needs some help" if pred_class == "Middle" else
        "Doing well"
    )

    # ── Recommendation Safeguards Check ──────────────────────────────────────
    is_in_range, safeguard_reason = evaluate_recommendation_safeguards(data)

    interpretation = None
    recommendations = []
    ai_provider = "none"
    is_fallback = False
    ai_note = ""

    if not is_in_range:
        # Safeguard active: do NOT generate AI recommendations on out-of-range inputs
        ai_provider = "safeguarded"
        is_fallback = False
        ai_note = f"Suggestions are hidden. {safeguard_reason}"
        interpretation = (
            f"Barangay {b_name} is {tier_label} ({confidence*100:.0f}% sure). "
            f"Suggestions are hidden because some numbers look unusual."
        )
    else:
        # Inputs are valid: attempt Gemini AI if enabled & client available
        if enable_gemini and GEMINI_CLIENT:
            try:
                top_drivers_str = "; ".join(
                    f"{c['feature']} = {c['value']} ({c['shap']*100:+.1f} percentage points "
                    f"{'toward' if c['shap'] >= 0 else 'away from'} {tier_label})"
                    for c in contributions[:3]
                )
                barangay_str = f"Barangay {b_name}" if b_name and b_name != "Custom" else "a District V community"
                ai_prompt = f"""You are KalingaBot, a Philippine social welfare AI assistant for Quezon City District V.
A barangay-level income classification was completed using a Stacking Ensemble ML model (PSA MPI + FIES indicators).

Barangay: {barangay_str}, Quezon City District V
Predicted Income Tier: {tier_label} (confidence: {confidence*100:.1f}%)

Community PSA Indicators:
- Household Head Employment Rate: {pct_emp:.1f}%
- Average Monthly Income: PHP {inc:,.0f}
- Access to Electricity: {elec:.1f}%
- Safe Drinking Water Access: {water:.1f}%
- Sanitary Toilet Coverage: {toilet:.1f}%
- Youth Net School Enrollment: {enroll:.1f}%
- Permanent Housing Materials: {perm:.1f}%
- Informal Settlement Rate: {informal:.1f}%
- Average Family Size: {fam_size:.1f} members
- Secondary Education Completion: {sec_ed:.1f}%
- Top SHAP drivers vs. the District V average profile: {top_drivers_str}

Respond ONLY with valid JSON matching this schema exactly:
{{
  "interpretation": "2 short sentences in plain, everyday English (no technical words) explaining why this barangay got this level, using its numbers. Do not use asterisks or markdown.",
  "recommendations": [
    {{
      "name": "Exact Philippine government program name",
      "agency": "Lead agency (e.g. DSWD, DOLE, DepEd, DOH, TESDA, QC LGU, NHA)",
      "sector": "Sector (Livelihood, Education, Housing, Health, Financial Support)",
      "rationale": "1 sentence citing specific numbers from the indicators above explaining why this program is needed."
    }}
  ]
}}
Provide 3 tailored recommendations targeting the barangay's weakest indicators."""

                resp = GEMINI_CLIENT.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=ai_prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.3,
                        response_mime_type="application/json",
                    ),
                )
                ai_data = json.loads(resp.text.strip())
                interpretation = ai_data.get("interpretation")
                recommendations = ai_data.get("recommendations", [])
                if recommendations:
                    ai_provider = "gemini"
                    is_fallback = False
                    ai_note = "Written by AI. Please review before acting."
            except Exception as e:
                print(f"Warning: Gemini live recommendations failed ({e}), using verified policy fallback.")

        # If Gemini is unavailable or not used, apply verified standard DSWD / QC-LGU benchmarks
        if not recommendations:
            ai_provider = "fallback"
            is_fallback = True
            ai_note = "The AI helper is unavailable, so standard DSWD and Quezon City programs are shown."
            if pred_class == "Low":
                recommendations = [
                    {"name": "DSWD Pantawid Pamilyang Pilipino Program (4Ps)", "agency": "DSWD", "sector": "Financial Support",
                     "rationale": f"Conditional cash transfers to address the barangay's low average income of PHP {inc:,.0f} and support basic nutritional and healthcare needs."},
                    {"name": "NHA Community Mortgage Program", "agency": "NHA / QC Housing Board", "sector": "Housing",
                     "rationale": f"Addresses the {informal:.1f}% informal settler rate by providing affordable land tenure and upgrading permanent housing structures."},
                    {"name": "DSWD Sustainable Livelihood Program (SLP)", "agency": "DSWD / DOLE", "sector": "Livelihood",
                     "rationale": f"Micro-enterprise seed grants and skill building to elevate the {pct_emp:.1f}% household head employment rate."},
                ]
            elif pred_class == "Middle":
                recommendations = [
                    {"name": "DOLE TUPAD Community Employment Program", "agency": "DOLE", "sector": "Livelihood",
                     "rationale": f"Short-term wage employment to stabilize the {pct_emp:.1f}% employment rate and build economic resiliency."},
                    {"name": "TESDA Community-Based Vocational Training", "agency": "TESDA / QC Skills Academy", "sector": "Education",
                     "rationale": f"Vocational certifications targeting the {sec_ed:.1f}% secondary completion rate to expand adult wage opportunities."},
                    {"name": "DPWH Basic Infrastructure Program", "agency": "DPWH / QC LGU", "sector": "Housing",
                     "rationale": f"Upgrades public drainage and infrastructure to support {perm:.1f}% permanent structures and address urban density."},
                ]
            else:
                recommendations = [
                    {"name": "QC Small Business & MSME Development Program", "agency": "QC SBCorp / DTI", "sector": "Livelihood",
                     "rationale": f"Capital access and mentorship for the self-sufficient community to sustain its PHP {inc:,.0f} average monthly income."},
                    {"name": "DepEd Alternative Learning System (ALS)", "agency": "DepEd / QC Schools Division", "sector": "Education",
                     "rationale": f"Targeted youth educational catch-up to build upon the {enroll:.1f}% net school enrollment rate."},
                    {"name": "DOH PhilHealth Konsulta Program", "agency": "DOH / PhilHealth", "sector": "Health",
                     "rationale": f"Comprehensive primary health care access to protect household health gains and maintain productivity."},
                ]

        if not interpretation:
            supporting = [c for c in contributions if c["shap"] > 0][:2]
            drivers_text = " and ".join(f"{c['feature'].lower()} ({c['value']})" for c in supporting)
            interpretation = (
                f"Barangay {b_name} is {tier_label} ({confidence*100:.0f}% sure). "
                + (f"Compared with an average District V barangay, the main reasons are {drivers_text}."
                   if drivers_text else "Its numbers are close to the District V average.")
            )

    return {
        "barangay": b_name,
        "predicted_class": pred_class,
        "tier_label": tier_label,
        "tier_meaning": tier_meaning,
        "confidence": confidence,
        "probabilities": prob_dict,
        "feature_impacts": feature_impacts,
        "shap": shap_explanation,
        "interpretation": interpretation,
        "recommendations": recommendations,
        "ai_provider": ai_provider,
        "is_fallback": is_fallback,
        "ai_note": ai_note,
        "inputs": {
            "Avg Monthly Income": f"PHP {inc:,.0f}",
            "Employed Heads": f"{pct_emp:.1f}%",
            "Informal Settlers": f"{informal:.1f}%",
            "Electricity Access": f"{elec:.1f}%",
            "Safe Water Access": f"{water:.1f}%",
            "Sanitary Toilet": f"{toilet:.1f}%",
            "Permanent Housing": f"{perm:.1f}%",
            "School Enrollment": f"{enroll:.1f}%",
            "Secondary Educated": f"{sec_ed:.1f}%",
            "Avg Family Size": f"{fam_size:.1f}",
        },
        "raw_inputs": {
            "barangay": b_name,
            "pct_employed_head": pct_emp,
            "avg_monthly_income_php": inc,
            "pct_with_access_to_electricity": elec,
            "pct_with_safe_water_access": water,
            "pct_with_sanitary_toilet": toilet,
            "net_enrollment_rate": enroll,
            "pct_permanent_house_material": perm,
            "pct_informal_settlers": informal,
            "avg_family_size": fam_size,
            "pct_completed_secondary_education": sec_ed,
        }
    }

@app.post("/api/classify-barangay")
def classify_barangay(req: ClassifyBarangayRequest):
    return execute_barangay_classification(req.dict(), enable_gemini=True)


def _parse_clean_number(val, default=0.0):
    if val is None or pd.isna(val):
        return default
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace("₱", "").replace("%", "").replace(",", "").replace("PHP", "").strip()
    try:
        return float(s)
    except Exception:
        return default

@app.post("/api/classify-barangay/batch-file")
async def classify_barangay_batch_file(file: UploadFile = File(...)):
    """Upload a CSV or Excel file to classify multiple barangays simultaneously."""
    filename = file.filename.lower()
    contents = await file.read()

    try:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(contents))
        elif filename.endswith(".csv") or filename.endswith(".txt"):
            try:
                df = pd.read_csv(io.StringIO(contents.decode("utf-8-sig")))
            except Exception:
                try:
                    df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
                except UnicodeDecodeError:
                    df = pd.read_csv(io.StringIO(contents.decode("latin-1")))
        else:
            raise HTTPException(status_code=400, detail="Invalid file format. Please upload a .csv or .xlsx file.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="The uploaded file contains no data rows.")

    # Clean all column names: aggressively strip BOM, quotes, whitespace, hidden chars
    def _normalize_col(c: str) -> str:
        return (
            str(c)
            .replace("\ufeff", "").replace("\uffef", "")
            .replace('"', "").replace("'", "")
            .replace("\xa0", " ")  # non-breaking space
            .strip()
            .lower()
        )

    normalized_cols = {_normalize_col(c): c for c in df.columns}
    logger.info(f"[batch-file] Detected columns: {list(normalized_cols.keys())}")

    # Robust keyword mapping — order matters: first match wins, more specific first
    KEYWORD_MAPPINGS = {
        "barangay": ["barangay", "brgy", "jurisdiction", "community", "target", "area"],
        "avg_monthly_income_php": ["income", "monthly income", "salary", "earning"],
        "pct_employed_head": ["employ", "working head", "head employ"],
        "pct_informal_settlers": ["informal", "settler", "tenure", "squatter"],
        "pct_with_access_to_electricity": ["electr", "power", "grid"],
        "pct_with_safe_water_access": ["safe water", "water access", "potable", "drinking"],
        "pct_with_sanitary_toilet": ["toilet", "sanitary", "latrine", "comfort room"],
        "net_enrollment_rate": ["enroll", "school attend", "student"],
        "pct_permanent_house_material": ["permanent hous", "permanent", "concrete", "house material"],
        "pct_completed_secondary_education": ["secondary", "high school", "educat"],
        "avg_family_size": ["family size", "household size", "family", "members"],
    }

    col_map = {}
    used_orig_cols: set = set()

    for canon_field, keywords in KEYWORD_MAPPINGS.items():
        matched = None
        matched_orig = None

        # 1. Exact canonical name match
        if canon_field in normalized_cols and normalized_cols[canon_field] not in used_orig_cols:
            matched = canon_field
            matched_orig = normalized_cols[canon_field]

        # 2. Multi-word phrase match (most specific first)
        if not matched:
            for kw in sorted(keywords, key=len, reverse=True):
                for norm_c, orig_c in normalized_cols.items():
                    if orig_c in used_orig_cols:
                        continue
                    if kw in norm_c:
                        matched = norm_c
                        matched_orig = orig_c
                        break
                if matched:
                    break

        if matched_orig:
            col_map[canon_field] = matched_orig
            used_orig_cols.add(matched_orig)

    # Positional fallback for template-format CSVs (exactly 11 or 12 cols)
    # Expected order: barangay, income, employed%, informal%, electricity%, water%, toilet%, permanent%, enrollment%, secondary%, family_size [, extra]
    POSITIONAL_ORDER = [
        "barangay", "avg_monthly_income_php", "pct_employed_head",
        "pct_informal_settlers", "pct_with_access_to_electricity",
        "pct_with_safe_water_access", "pct_with_sanitary_toilet",
        "pct_permanent_house_material", "net_enrollment_rate",
        "pct_completed_secondary_education", "avg_family_size",
    ]
    missing_after_kw = [f for f in KEYWORD_MAPPINGS.keys() if f not in col_map]
    if missing_after_kw and len(df.columns) >= 11:
        orig_cols = list(df.columns)
        for i, canon in enumerate(POSITIONAL_ORDER):
            if canon not in col_map and i < len(orig_cols):
                col_map[canon] = orig_cols[i]
                logger.warning(f"[batch-file] Positional fallback: '{canon}' → col[{i}] '{orig_cols[i]}'")

    # Required fields check
    missing = [f for f in KEYWORD_MAPPINGS.keys() if f not in col_map]
    if missing:
        readable_missing = ", ".join(missing)
        detected_cols = ", ".join(normalized_cols.keys())
        raise HTTPException(
            status_code=422,
            detail=f"Uploaded file is missing required columns: {readable_missing}. Detected headers: [{detected_cols}]. Please download the official CSV template and use matching column names."
        )

    results = []
    errors = []

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-based index including header
        try:
            b_name = str(row[col_map["barangay"]]).strip() if pd.notna(row[col_map["barangay"]]) else f"Barangay {idx+1}"
            inc = _parse_clean_number(row[col_map["avg_monthly_income_php"]], default=0.0)
            fam = _parse_clean_number(row[col_map["avg_family_size"]], default=1.0)
            emp = _parse_clean_number(row[col_map["pct_employed_head"]], default=0.0)
            elec = _parse_clean_number(row[col_map["pct_with_access_to_electricity"]], default=0.0)
            water = _parse_clean_number(row[col_map["pct_with_safe_water_access"]], default=0.0)
            toilet = _parse_clean_number(row[col_map["pct_with_sanitary_toilet"]], default=0.0)
            enroll = _parse_clean_number(row[col_map["net_enrollment_rate"]], default=0.0)
            perm = _parse_clean_number(row[col_map["pct_permanent_house_material"]], default=0.0)
            informal = _parse_clean_number(row[col_map["pct_informal_settlers"]], default=0.0)
            sec_ed = _parse_clean_number(row[col_map["pct_completed_secondary_education"]], default=0.0)

            # Row validation
            row_errs = []
            if inc <= 0:
                row_errs.append("Average Monthly Income must be positive (> 0)")
            if fam <= 0 or fam > 30:
                row_errs.append("Average Family Size must be between 1 and 30")
            for val, name in [
                (emp, "Employed Heads"), (elec, "Electricity Access"), (water, "Safe Water Access"),
                (toilet, "Sanitary Toilet"), (enroll, "School Enrollment"), (perm, "Permanent Housing"),
                (informal, "Informal Settlers"), (sec_ed, "Secondary Education")
            ]:
                if val < 0.0 or val > 100.0:
                    row_errs.append(f"{name} must be between 0% and 100% (found {val})")

            if row_errs:
                errors.append({"row": row_num, "barangay": b_name, "errors": row_errs})
                continue

            item_dict = {
                "barangay": b_name,
                "pct_employed_head": emp,
                "avg_monthly_income_php": inc,
                "pct_with_access_to_electricity": elec,
                "pct_with_safe_water_access": water,
                "pct_with_sanitary_toilet": toilet,
                "net_enrollment_rate": enroll,
                "pct_permanent_house_material": perm,
                "pct_informal_settlers": informal,
                "avg_family_size": fam,
                "pct_completed_secondary_education": sec_ed,
            }

            classification_res = execute_barangay_classification(item_dict, enable_gemini=(len(results) < 2))
            results.append(classification_res)
        except Exception as e:
            errors.append({"row": row_num, "barangay": str(row.get(col_map.get("barangay", ""), f"Row {row_num}")), "errors": [str(e)]})

    return {
        "filename": file.filename,
        "total_rows": len(df),
        "successful": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors,
    }

@app.get("/api/classify-barangay/batch-template")
def get_batch_template():
    """Generates an official downloadable CSV template for batch multi-barangay classification."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Barangay Jurisdiction",
        "Average Monthly Income",
        "Employed Heads (%)",
        "Informal Settlers (%)",
        "Electricity Access (%)",
        "Safe Water Access (%)",
        "Sanitary Toilet (%)",
        "Permanent Housing (%)",
        "School Enrollment (%)",
        "Secondary Educated (%)",
        "Average Family Size",
    ])
    # 14 Real District V Barangays with sample reference values
    samples = [
        ["Bagbag", 24500, 56.4, 34.2, 74.0, 68.0, 66.5, 52.0, 79.5, 53.0, 5.2],
        ["Capri", 17200, 48.0, 48.5, 66.0, 55.0, 52.0, 39.0, 72.0, 38.0, 5.6],
        ["Fairview", 38000, 76.5, 12.0, 92.0, 88.0, 86.0, 78.0, 91.0, 75.0, 4.4],
        ["Greater Lagro", 34500, 72.0, 16.5, 88.0, 82.0, 81.0, 72.0, 88.0, 70.0, 4.6],
        ["Gulod", 22800, 54.0, 38.0, 72.0, 64.0, 62.0, 48.0, 78.0, 50.0, 5.3],
        ["Kaligayahan", 28500, 62.0, 26.0, 80.0, 74.0, 72.0, 60.0, 84.0, 60.0, 4.9],
        ["Nagkaisang Nayon", 23500, 55.0, 35.0, 73.0, 66.0, 64.0, 50.0, 78.5, 52.0, 5.1],
        ["North Fairview", 36000, 74.0, 14.0, 90.0, 85.0, 84.0, 75.0, 89.0, 72.0, 4.5],
        ["Novaliches Proper", 26000, 60.0, 29.0, 78.0, 70.0, 69.0, 56.0, 82.0, 57.0, 5.0],
        ["Pasong Putik Proper", 31000, 68.0, 20.0, 84.0, 78.0, 77.0, 66.0, 86.0, 65.0, 4.7],
        ["San Agustin", 27000, 61.0, 27.5, 79.0, 72.0, 70.5, 58.0, 83.0, 58.0, 4.9],
        ["San Bartolome", 29000, 64.0, 24.0, 82.0, 76.0, 74.0, 62.0, 85.0, 62.0, 4.8],
        ["Santa Lucia", 25000, 58.0, 32.0, 75.0, 68.5, 67.0, 54.0, 80.0, 55.0, 5.1],
        ["Santa Monica", 30000, 66.0, 22.0, 83.0, 77.0, 75.5, 64.0, 85.5, 63.5, 4.8],
    ]
    for row in samples:
        writer.writerow(row)

    content = output.getvalue()
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=qc_district_v_barangay_batch_template.csv"}
    )

@app.get("/api/keep-alive")
def keep_alive():
    """Lightweight ping to prevent cold start hibernation."""
    return {
        "status": "warm",
        "uptime": time.time(),
        "barangay_model_cached": "barangay_model" in _CACHE,
    }


