import json
import os
import sys
import time
from pathlib import Path

import pandas as pd
from google import genai
from google.genai import types

BASE = Path(__file__).parent
OUT = BASE / "outputs"
BRIEFS_PATH = OUT / "policy_briefs.json"

MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite")

API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
if not API_KEY:
    env_file = BASE / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("GEMINI_API_KEY=") or line.startswith("GOOGLE_API_KEY="):
                API_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
                break

if not API_KEY:
    print("ERROR: set GEMINI_API_KEY in your environment or create a .env file with:")
    print("   GEMINI_API_KEY=your_key_here")
    print("Get a free key at https://aistudio.google.com/apikey")
    sys.exit(1)


PROMPT = """You are a Philippine social welfare policy analyst. Given this barangay's data, recommend 3 to 4 specific Philippine government aid programs that fit its profile.

Barangay: {barangay}
Predicted income tier: {tier} (SWDI Level {level} - {tier_meaning})
Families surveyed: {families}

Indicators
- Average monthly per-capita income: PHP {income:,.0f}
- Average family size: {fam_size:.1f}
- Average children at home (0-18): {dependents:.1f}
- Average children currently in school: {in_school:.1f}
- 4Ps recipients (latest school year): {fourps_latest:,.0f}
- 4Ps recipients per 1,000 residents: {fourps_per_1k:.1f}
- Households still active in 4Ps: {active_share:.0f}%
- Barangay population (2024): {pop_2024:,.0f}
- Population growth 2020 to 2024: {pop_growth:+.1f}%

Top model drivers (SHAP, share of impact on prediction)
{shap_lines}

Conformal confidence: model is sure about {conf_pct:.0f}% of families in this barangay; the rest are borderline between two tiers.

Return a JSON object only (no markdown fences). Use real Philippine government program names (DSWD, DTI, DOLE, DepEd, POPCOM, NHA, DPWH, LGU, AICS, SLP, 4Ps, ALS, etc.). Cite specific numbers from the indicators above in each rationale.

JSON schema:
{{
  "summary": "1-2 sentence policy summary, naming the dominant problem this barangay faces.",
  "programs": [
    {{
      "name": "exact program name",
      "agency": "lead agency (DSWD / DTI / DepEd / DOLE / POPCOM / NHA / LGU)",
      "priority": "High" or "Medium" or "Low",
      "rationale": "1-2 sentences citing at least one specific number from the indicators."
    }}
  ],
  "slider_suggestion": {{
    "financial": 0-100 integer,
    "education": 0-100 integer,
    "livelihood": 0-100 integer,
    "reasoning": "1 sentence explaining which dial matters most for this barangay."
  }}
}}
"""

TIER_MEANING = {"Low": "extreme poor / Survival", "Middle": "subsistence",
                "High": "self-sufficient / above poverty line"}
TIER_LEVEL = {"Low": 1, "Middle": 2, "High": 3}


def load_inputs():
    brgy = pd.read_csv(OUT / "merged_barangay_dataset.csv").set_index("barangay")
    fams = pd.read_csv(OUT / "family_predictions.csv")
    shap_df = pd.read_csv(OUT / "shap_by_barangay.csv").set_index("barangay")
    return brgy, fams, shap_df


def shap_top_lines(row, top_n=5):
    items = []
    for feat, val in row.items():
        if feat.startswith("barangay_"):
            continue
        items.append((feat, float(val)))
    items.sort(key=lambda x: x[1], reverse=True)
    items = items[:top_n]
    total = sum(v for _, v in items) or 1.0
    label_map = {
        "family_size": "Family size",
        "dependents_0_18": "Children at home (under 18)",
        "children_in_school": "Children attending school",
        "children_in_school_ratio": "School attendance rate",
        "pop_2024": "Population",
        "pop_growth_2000_2024": "Long-term population growth",
        "pop_growth_2020_2024": "Recent population growth",
        "four_ps_per_1k_pop": "4Ps coverage per 1k",
        "active_4ps_share": "Active 4Ps share",
        "household_status_Active": "Currently receiving 4Ps",
        "household_status_Graduated": "Graduated from 4Ps",
        "household_status_Delisted": "Removed from 4Ps",
    }
    return "\n".join(
        f"- {label_map.get(f, f)}: {v/total*100:.0f}% of impact"
        for f, v in items
    )


def conformal_pct_for(brgy_name, fams):
    sub = fams[fams["barangay"] == brgy_name]
    if sub.empty:
        return 50.0
    same = (sub["predicted_class"] == sub["income_class"]).mean()
    return float(same * 100)


def build_brief_for(brgy_name, brgy, shap_df, fams, client):
    row = brgy.loc[brgy_name]
    shap_row = shap_df.loc[brgy_name] if brgy_name in shap_df.index else None
    tier = row["predicted_class"]
    prompt = PROMPT.format(
        barangay=brgy_name,
        tier=tier,
        level=TIER_LEVEL[tier],
        tier_meaning=TIER_MEANING[tier],
        families=int(row["families_surveyed"]),
        income=float(row["avg_per_capita_income"]),
        fam_size=float(row["avg_family_size"]),
        dependents=float(row["avg_dependents"]),
        in_school=float(row["avg_children_in_school"]),
        fourps_latest=float(row["four_ps_recipients_latest"]),
        fourps_per_1k=float(row["four_ps_per_1k_pop"]),
        active_share=float(row["active_4ps_share"]),
        pop_2024=float(row["pop_2024"]),
        pop_growth=float(row["pop_growth_2020_2024"]),
        shap_lines=shap_top_lines(shap_row) if shap_row is not None else "(SHAP unavailable)",
        conf_pct=conformal_pct_for(brgy_name, fams),
    )

    last_exc = None
    for attempt in range(3):
        try:
            resp = client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.4,
                ),
            )
            return json.loads(resp.text.strip())
        except Exception as exc:
            last_exc = exc
            if attempt < 2:
                time.sleep(3 * (attempt + 1))
    raise last_exc


def main():
    brgy, fams, shap_df = load_inputs()
    client = genai.Client(api_key=API_KEY)

    if BRIEFS_PATH.exists():
        briefs = json.loads(BRIEFS_PATH.read_text(encoding="utf-8"))
        done = {b for b, v in briefs.items() if "error" not in v}
        print(f"Existing briefs file: {len(done)} barangay(s) already done. "
              f"Skipping those.")
    else:
        briefs = {}
        done = set()

    print(f"Using model: {MODEL}")
    for i, brgy_name in enumerate(brgy.index, 1):
        if brgy_name in done:
            continue
        print(f"  [{i:2d}/{len(brgy)}] {brgy_name}...", end=" ", flush=True)
        try:
            briefs[brgy_name] = build_brief_for(brgy_name, brgy, shap_df, fams, client)
            print("ok")
            BRIEFS_PATH.write_text(
                json.dumps(briefs, indent=2, ensure_ascii=False), encoding="utf-8"
            )
        except Exception as exc:
            print(f"FAILED ({str(exc)[:120]})")
            briefs[brgy_name] = {"error": str(exc)}
        time.sleep(0.6)

    BRIEFS_PATH.write_text(json.dumps(briefs, indent=2, ensure_ascii=False),
                           encoding="utf-8")
    ok = sum(1 for v in briefs.values() if "error" not in v)
    print(f"\nWrote {ok}/{len(briefs)} briefs to {BRIEFS_PATH}")


if __name__ == "__main__":
    main()
