import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import plotly.express as px
import streamlit as st

BASE = Path(__file__).parent
OUT = BASE / "outputs"
MODEL_PATH = BASE / "models" / "stacking_model.joblib"
BRGY_PATH = OUT / "merged_barangay_dataset.csv"
GEOJSON_PATH = BASE / "data" / "geo" / "qc5_barangays.geojson"
POLYGONS_PATH = BASE / "data" / "geo" / "qc5_polygons.geojson"

DISTRICT_V_CAMERA = {"lat": 14.7011, "lon": 121.0420}
CHOROPLETH_ZOOM = 12.5

CLASS_COLORS = {"Low": "#B45309", "Middle": "#475569", "High": "#166534"}
CLASS_ORDER = ["Low", "Middle", "High"]
CLASS_TIER = {"Low": "Survival", "Middle": "Subsistence", "High": "Self-sufficient"}

# ──────────────────────────────────────────────────────────────────────
# Trend & Graduation Density Analysis (selection-bias-aware)
# ──────────────────────────────────────────────────────────────────────
# The 4Ps registry used in this study is a **selection-biased sample**:
# only marginalized households who qualified for Pantawid Pamilya cash
# transfers appear in it. The barangay's general population is not
# represented. As a baseline anchor, the PSA Poverty Statistics report
# Quezon City's overall family poverty incidence at ~0.7% (2023).
# Computing poverty incidence directly inside the 4Ps registry therefore
# tells us *nothing* about the barangay's total wealth — it would
# spuriously label every barangay as Low-Income.
#
# Instead, a barangay is classified by:
#   (a) Pocket Density — size of the 4Ps registry relative to the
#       barangay's 2024 population. A small pocket → an isolated
#       low-income enclave inside an otherwise non-poor barangay.
#   (b) SWDI Tier Transition Rate — share of the 4Ps registry that
#       has either Graduated from the program OR is predicted as SWDI
#       Level 3 (Self-Sufficient). Captures upward mobility within
#       the marginalized pocket.
#   (c) External anchor — QC's 0.7% baseline (PSA, 2023) means the
#       default narrative for any QC barangay is *not* "Low-Income".
COMMUNITY_CLASS_ORDER = ["priority", "developing", "stable"]
COMMUNITY_LABELS = {
    "priority":   "Level 1 · Low-Income Barangay (Top Priority for Assistance)",
    "developing": "Level 2 · Mixed-Income Barangay (Moderate Priority for Assistance)",
    "stable":     "Level 3 · Higher-Income Barangay (Low Priority for Assistance)",
}
COMMUNITY_SHORT = {
    "priority":   "Level 1 · Low-Income",
    "developing": "Level 2 · Mixed-Income",
    "stable":     "Level 3 · Higher-Income",
}
COMMUNITY_COLORS = {
    "priority":   "#B91C1C",
    "developing": "#B45309",
    "stable":     "#166534",
}

QC_BASELINE_POVERTY_PCT = 0.7      # PSA Poverty Statistics, Quezon City, 2023


def assign_district_tertiles(df):
    """Within-District-V tertile classification.

    Because Quezon City's overall family poverty rate is only ~0.7%
    (PSA, 2023), absolute density thresholds (e.g., 30 or 100 per 1,000)
    classify every Novaliches barangay into the same bucket and the
    dashboard becomes uninformative. The defensible alternative — and
    the way PSA Small Area Estimation is actually used for LGU
    prioritization — is to rank the barangays *within the study area*
    and split them into thirds.

    Score = pocket_density × (1 − transition_rate / 100), so a large
    marginalized pocket that is also stuck scores higher than a large
    pocket that is actively moving up.

    With 14 barangays and cuts at (n/3, 2n/3) = (4.667, 9.333),
    the split is 4 / 5 / 5: bottom-four by score (ranks 1-4) get
    "stable", middle-five (ranks 5-9) get "developing", top-five
    (ranks 10-14) get "priority".
    """
    score = (
        df["pocket_density_per_1k"].fillna(0)
        * (1 - df["transition_rate_pct"].fillna(0).clip(upper=100) / 100)
    )
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
    return df

_CANON_BRGY = [
    "Bagbag", "Capri", "Fairview", "Greater Lagro", "Gulod", "Kaligayahan",
    "Nagkaisang Nayon", "North Fairview", "Novaliches Proper",
    "Pasong Putik Proper", "San Agustin", "San Bartolome",
    "Santa Lucia", "Santa Monica",
]
_UPPER_TO_CANON = {n.upper(): n for n in _CANON_BRGY}
DISTRICT_V_ZOOM = 12.6

FEATURE_LABELS = {
    "family_size": "Family size",
    "dependents_0_18": "Children at home (under 18)",
    "children_in_school": "Children attending school",
    "children_in_school_ratio": "School attendance rate",
    "pop_2024": "Barangay population",
    "pop_growth_2000_2024": "Long-term population growth",
    "pop_growth_2020_2024": "Recent population growth",
    "four_ps_per_1k_pop": "4Ps coverage (per 1,000 residents)",
    "active_4ps_share": "Households still active in 4Ps",
    "household_status_Active": "Currently receiving 4Ps",
    "household_status_Graduated": "Graduated from 4Ps",
    "household_status_Delisted": "Removed from 4Ps",
}

def label_feature(f):
    if f in FEATURE_LABELS:
        return FEATURE_LABELS[f]
    if f.startswith("barangay_"):
        return None  # hide locale one-hots from the "why" display
    return f


@st.cache_data
def load_brgy():
    df = pd.read_csv(BRGY_PATH)
    families = pd.read_csv(OUT / "family_predictions.csv")

    # Trend & Graduation Density signals (selection-bias-aware).
    mobility_mask = (
        (families["predicted_class"] == "High")
        | (families["household_status"] == "Graduated")
    )
    mobility_by_brgy = (
        families.assign(_mob=mobility_mask)
        .groupby("barangay")["_mob"]
        .sum()
        .rename("mobility_count")
    )
    graduated_by_brgy = (
        families[families["household_status"] == "Graduated"]
        .groupby("barangay")
        .size()
        .rename("graduated_count")
    )
    df = df.merge(mobility_by_brgy, left_on="barangay", right_index=True, how="left")
    df = df.merge(graduated_by_brgy, left_on="barangay", right_index=True, how="left")
    df["mobility_count"] = df["mobility_count"].fillna(0)
    df["graduated_count"] = df["graduated_count"].fillna(0)

    # Defensive: families_surveyed / pop_2024 may be missing for some rows.
    df["families_surveyed"] = df["families_surveyed"].fillna(0)
    df["pop_2024"] = df["pop_2024"].fillna(0)
    surveyed = df["families_surveyed"].clip(lower=1)
    pop_safe = df["pop_2024"].clip(lower=1)

    df["pocket_density_per_1k"] = (
        df["families_surveyed"] / pop_safe * 1000
    ).fillna(0)
    df["transition_rate_pct"] = (
        df["mobility_count"] / surveyed * 100
    ).fillna(0)
    df["graduated_share_pct"] = (
        df["graduated_count"] / surveyed * 100
    ).fillna(0)

    df = assign_district_tertiles(df)
    df["community_class"] = df["community_class"].fillna("developing")
    df["community_label"] = (
        df["community_class"].map(COMMUNITY_LABELS).fillna(COMMUNITY_LABELS["developing"])
    )
    return df


@st.cache_data
def load_families():
    return pd.read_csv(OUT / "family_predictions.csv")


@st.cache_data
def load_shap():
    return pd.read_csv(OUT / "shap_by_barangay.csv").set_index("barangay")


@st.cache_data
def load_briefs():
    path = OUT / "policy_briefs.json"
    if not path.exists():
        return {}
    import json as _json
    return _json.loads(path.read_text(encoding="utf-8"))


@st.cache_data
def load_polygons():
    """Load qc5_polygons.geojson and normalize each feature's id to the canonical
    barangay name (case-insensitive match against the 14-barangay roster).
    Returns a FeatureCollection ready to feed Plotly's choropleth."""
    if not POLYGONS_PATH.exists():
        return None
    with open(POLYGONS_PATH, "r", encoding="utf-8") as f:
        gj = json.load(f)
    if not isinstance(gj, dict) or gj.get("type") != "FeatureCollection":
        return None
    for feat in gj.get("features", []):
        props = feat.get("properties") or {}
        raw_name = (
            feat.get("id")
            or props.get("barangay")
            or props.get("NAME_3")
            or props.get("name")
            or ""
        )
        canon = _UPPER_TO_CANON.get(str(raw_name).upper())
        if canon is None:
            for n in _CANON_BRGY:
                if n.lower() == str(raw_name).strip().lower():
                    canon = n
                    break
        if canon is not None:
            feat["id"] = canon
            props["barangay"] = canon
            feat["properties"] = props
    return gj


@st.cache_data
def load_geo():
    """Read qc5_barangays.geojson (now a {NAME: {latitude, longitude}} dict) and
    return (coords_by_canonical_name, bounds, center)."""
    if not GEOJSON_PATH.exists():
        return {}, None, None
    with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    coords = {}
    for k, v in raw.items():
        canon = _UPPER_TO_CANON.get(k.upper(), k.title())
        try:
            coords[canon] = (float(v["latitude"]), float(v["longitude"]))
        except (KeyError, TypeError, ValueError):
            continue
    if not coords:
        return {}, None, None
    lats = [c[0] for c in coords.values()]
    lons = [c[1] for c in coords.values()]
    pad_lat = (max(lats) - min(lats)) * 0.18
    pad_lon = (max(lons) - min(lons)) * 0.18
    bounds = {
        "south": min(lats) - pad_lat, "north": max(lats) + pad_lat,
        "west":  min(lons) - pad_lon, "east":  max(lons) + pad_lon,
    }
    center = {"lat": (min(lats) + max(lats)) / 2,
              "lon": (min(lons) + max(lons)) / 2}
    return coords, bounds, center


@st.cache_resource
def load_model():
    return joblib.load(MODEL_PATH)


@st.cache_data
def load_metrics():
    """Honest hold-out performance, parsed from the saved evaluation artifacts.

    Returns (accuracy, within_one_tier). `within_one_tier` is the share of
    predictions that land on the correct tier OR an adjacent one — a fair
    metric here because the income levels are ordered (Low < Middle < High),
    so a Low↔Middle miss is far less wrong than a Low↔High flip.
    """
    accuracy = None
    report = OUT / "stacking_classification_report.txt"
    if report.exists():
        first = report.read_text(encoding="utf-8").splitlines()[0]
        try:
            accuracy = float(first.split(":")[1])
        except (IndexError, ValueError):
            accuracy = None

    within = None
    cm_path = OUT / "stacking_confusion_matrix.csv"
    if cm_path.exists():
        cm = pd.read_csv(cm_path, index_col=0).to_numpy()
        total = cm.sum()
        if total:
            two_tier_errors = cm[0, -1] + cm[-1, 0]  # Low↔High only
            within = (total - two_tier_errors) / total
    return accuracy, within


def inject_styles():
    st.markdown(
        """
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet">
        <style>
        html, body, [class*="css"], [data-testid="stAppViewContainer"] {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #1A1F2E;
            font-size: 21px;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        [data-testid="stAppViewContainer"] {
            background: linear-gradient(180deg, #FAF8F2 0%, #F7F5F0 100%);
        }
        [data-testid="stHeader"] { background: transparent; }
        [data-testid="stSidebar"] {
            background: #FBFAF6;
            border-right: 1px solid #E5E0D8;
        }
        [data-testid="stSidebar"] * { color: #1A1F2E; }
        [data-testid="stSidebar"] h1, [data-testid="stSidebar"] h2,
        [data-testid="stSidebar"] h3, [data-testid="stSidebar"] h4 {
            color: #1A1F2E !important;
        }
        h1 {
            font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif !important;
            color: #1A1F2E !important; font-weight: 700 !important;
            letter-spacing: -0.6px; line-height: 1.1;
            font-size: 54px !important;
            margin-bottom: 8px !important;
        }
        h2 {
            font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif !important;
            color: #1A1F2E !important; font-weight: 600 !important;
            letter-spacing: -0.3px;
            font-size: 36px !important;
        }
        h3 {
            font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif !important;
            color: #1A1F2E !important; font-weight: 600 !important;
            letter-spacing: -0.2px;
            font-size: 28px !important;
        }
        h4 {
            font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif !important;
            color: #1A1F2E !important; font-weight: 600 !important;
            font-size: 24px !important;
        }
        p, li, span, div { font-size: 20px; }
        [data-testid="stMarkdownContainer"] p { color: #3A4256; line-height: 1.7; font-size: 20px; }
        [data-testid="stMetric"] {
            background: #FFFFFF;
            border: 1px solid #E5E0D8;
            border-radius: 12px;
            padding: 14px 16px;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04),
                        0 4px 12px -8px rgba(15, 23, 42, 0.08);
        }
        [data-testid="stMetricLabel"] p {
            color: #6B7280 !important; font-weight: 700 !important;
            font-size: 16px !important; text-transform: uppercase;
            letter-spacing: 0.7px;
        }
        [data-testid="stMetricValue"] {
            color: #1A1F2E !important; font-weight: 700 !important;
            font-family: 'Plus Jakarta Sans', 'Inter', sans-serif !important;
            font-size: 36px !important;
            letter-spacing: -0.3px;
        }
        [data-testid="stExpander"] {
            background: #FFFFFF;
            border: 1px solid #E5E0D8;
            border-radius: 12px;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
        }
        [data-testid="stExpander"] summary {
            color: #1A1F2E; font-weight: 600;
            font-size: 19px;
        }
        [data-testid="stDataFrame"] {
            border-radius: 10px; overflow: hidden;
            border: 1px solid #E5E0D8;
        }
        /* Buttons */
        [data-testid="stBaseButton-secondary"],
        .stButton > button {
            background: #FFFFFF !important;
            color: #1A1F2E !important;
            border: 1px solid #CFC8BB !important;
            border-radius: 10px !important;
            font-weight: 600 !important;
            font-size: 18px !important;
            padding: 12px 20px !important;
            transition: all 0.15s ease;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }
        [data-testid="stBaseButton-secondary"]:hover,
        .stButton > button:hover {
            background: #2A4365 !important;
            color: #FFFFFF !important;
            border-color: #2A4365 !important;
            box-shadow: 0 4px 12px -4px rgba(42, 67, 101, 0.4);
        }
        /* Sliders */
        [data-testid="stSlider"] [data-baseweb="slider"] div[role="slider"] {
            background: #2A4365 !important;
            border-color: #2A4365 !important;
            box-shadow: 0 2px 6px -2px rgba(42, 67, 101, 0.5) !important;
        }
        [data-testid="stSlider"] label {
            color: #1A1F2E !important; font-weight: 600 !important; font-size: 18px !important;
        }
        [data-testid="stSlider"] [data-baseweb="slider"] {
            font-size: 16px !important;
        }
        /* Selectbox */
        [data-baseweb="select"] > div {
            background: #FFFFFF !important;
            border: 1px solid #CFC8BB !important;
            border-radius: 10px !important;
        }
        [data-testid="stSelectbox"] label,
        [data-testid="stTextInput"] label {
            color: #1A1F2E !important; font-weight: 600 !important; font-size: 18px !important;
        }
        [data-baseweb="select"] {
            font-size: 18px !important;
        }
        /* KPI card */
        .kpi {
            background: #FFFFFF;
            border: 1px solid #E5E0D8;
            border-radius: 14px;
            padding: 18px 20px;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04),
                        0 6px 16px -10px rgba(15, 23, 42, 0.10);
        }
        .kpi .k {
            font-size: 16px; text-transform: uppercase;
            letter-spacing: 0.9px; color: #6B7280; font-weight: 700;
        }
        .kpi .v {
            font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
            font-size: 40px; font-weight: 700; color: #1A1F2E;
            line-height: 1.1; margin-top: 10px;
            letter-spacing: -0.5px;
        }
        /* Brand pill */
        .pill {
            display: inline-block; padding: 8px 16px;
            border-radius: 999px; font-size: 15px;
            font-weight: 700; letter-spacing: 0.7px;
            background: #EEF2F7; color: #2A4365;
            text-transform: uppercase;
            border: 1px solid #DCE3ED;
        }
        /* Status / tier chips */
        .tier-chip {
            display: inline-block; padding: 8px 16px;
            border-radius: 999px; font-size: 17px;
            font-weight: 700; letter-spacing: 0.3px; color: #fff;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.10);
        }
        .rule {
            border: none; border-top: 1px solid #E5E0D8;
            margin: 28px 0 20px 0;
        }
        .muted { font-size: 18px; color: #6B7280; line-height: 1.6; }
        .brgy-head {
            display: flex; justify-content: space-between;
            align-items: center; gap: 12px; margin-bottom: 6px;
            flex-wrap: wrap;
        }
        .brgy-head h2 { margin: 0 !important; font-size: 40px !important; }
        /* Plotly chart container — let it inherit cleanly */
        .js-plotly-plot { border-radius: 12px; }
        /* Strong text inside HTML cards */
        .kpi strong { color: #1A1F2E; font-weight: 700; }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_overview(brgy_df):
    families = int(brgy_df["families_surveyed"].sum())
    pop = int(brgy_df["pop_2024"].sum())
    income = float(
        (brgy_df["avg_per_capita_income"] * brgy_df["families_surveyed"]).sum()
        / max(families, 1)
    )
    dominant_community = COMMUNITY_SHORT.get(
        brgy_df["community_class"].value_counts().idxmax(), "—"
    )

    cards = [
        ("Barangays", f"{len(brgy_df)}"),
        ("Population", f"{pop:,}"),
        ("₱ / person", f"{income:,.0f}"),
        ("Most common type", dominant_community),
    ]
    cols = st.columns(4)
    for col, (k, v) in zip(cols, cards):
        with col:
            st.markdown(
                f"<div class='kpi'><div class='k'>{k}</div>"
                f"<div class='v'>{v}</div></div>",
                unsafe_allow_html=True,
            )


def render_classification_report(row, community_key):
    """Per-barangay classification statement with sourced framework citation."""
    label = COMMUNITY_LABELS.get(community_key, "—")
    color = COMMUNITY_COLORS.get(community_key, "#B45309")
    density = float(row.get("pocket_density_per_1k", 0))
    transition = float(row.get("transition_rate_pct", 0))
    graduated = float(row.get("graduated_share_pct", 0))
    surveyed = int(row.get("families_surveyed", 0))
    pop = int(row.get("pop_2024", 0))

    rank = int(row.get("community_rank", 0))
    total = int(row.get("community_rank_total", 14))
    rank_text = f"rank <strong>#{rank}</strong> of {total}"

    if community_key == "priority":
        why_html = (
            f"<strong>Low-Income Barangay</strong> — among the highest "
            f"concentration of low-income families in District V "
            f"({rank_text}). <strong>{density:.1f}</strong> poor families "
            f"per 1,000 residents, only <strong>{transition:.1f}%</strong> "
            f"moving up — <em>top priority</em> for assistance."
        )
    elif community_key == "stable":
        why_html = (
            f"<strong>Higher-Income Barangay</strong> — among the lowest "
            f"concentration of low-income families in District V "
            f"({rank_text}). <strong>{density:.1f}</strong> poor families "
            f"per 1,000 residents, <strong>{transition:.1f}%</strong> "
            f"moving up — <em>low priority</em>, maintain existing 4Ps."
        )
    else:
        why_html = (
            f"<strong>Mixed-Income Barangay</strong> — middle of the "
            f"District V ranking ({rank_text}). "
            f"<strong>{density:.1f}</strong> poor families per 1,000 "
            f"residents, <strong>{transition:.1f}%</strong> moving up — "
            f"<em>moderate priority</em> for assistance."
        )

    source_html = (
        "<strong>Method:</strong> the 14 barangays are ranked by a score "
        "(poor families per 1,000 residents, weighted by how few move up). "
        "Bottom-third = Level 3 (Higher-Income), middle = Level 2 "
        "(Mixed-Income), top = Level 1 (Low-Income). "
        f"QC's overall poverty rate is only "
        f"<strong>{QC_BASELINE_POVERTY_PCT:.1f}%</strong> (PSA, 2023), "
        "so peer ranking is used — same approach as PSA Small Area "
        "Estimation for LGU prioritization."
    )

    st.markdown(
        f"<div class='kpi'>"
        f"<div class='k'>Classification</div>"
        f"<div style='margin-top:10px;'>"
        f"<span style='display:inline-block;background:{color};color:#fff;"
        f"padding:6px 14px;border-radius:999px;font-weight:700;"
        f"font-size:19px;letter-spacing:0.3px;'>{label}</span>"
        f"</div>"
        f"<div style='margin-top:12px;font-size:19px;line-height:1.6;"
        f"color:#1A1F2E;'>{why_html}</div>"
        f"<div style='margin-top:14px;padding:14px 16px;"
        f"background:rgba(244,239,229,0.7);border-radius:8px;"
        f"font-size:18px;line-height:1.65;color:#1A1F2E;'>{source_html}</div>"
        f"<div style='margin-top:10px;font-size:19px;color:#6B7280;'>"
        f"<strong>{density:.1f}</strong> per 1,000 &nbsp;·&nbsp; "
        f"<strong>{transition:.1f}%</strong> moved up &nbsp;·&nbsp; "
        f"<strong>{graduated:.1f}%</strong> graduated"
        f"</div></div>",
        unsafe_allow_html=True,
    )


def render_indicators(row):
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Income per person",
              f"₱{row['avg_per_capita_income']:,.0f}"
              if pd.notna(row['avg_per_capita_income']) else "—")
    c2.metric("Family size", f"{row['avg_family_size']:.1f}")
    c3.metric("Children at home", f"{row['avg_dependents']:.1f}")
    c4.metric("Going to school", f"{row['avg_children_in_school']:.1f}")

    c5, c6, c7, c8 = st.columns(4)
    c5.metric("Population", f"{row['pop_2024']:,.0f}")
    c6.metric("Growth ’20–’24", f"{row['pop_growth_2020_2024']:+.1f}%")
    c7.metric("4Ps per 1,000",
              f"{row['four_ps_per_1k_pop']:.1f}"
              if pd.notna(row['four_ps_per_1k_pop']) else "—")
    c8.metric("Still in 4Ps", f"{row['active_4ps_share']:.0f}%")


def render_class_distribution(row):
    surveyed = row["families_surveyed"]
    df = pd.DataFrame({
        "Income level": CLASS_ORDER * 2,
        "Source": ["Tool guess"] * 3 + ["Actual"] * 3,
        "Share (%)": [
            row["pred_low"] / surveyed * 100,
            row["pred_middle"] / surveyed * 100,
            row["pred_high"] / surveyed * 100,
            row["actual_low"] / surveyed * 100,
            row["actual_middle"] / surveyed * 100,
            row["actual_high"] / surveyed * 100,
        ],
    })
    fig = px.bar(
        df, x="Income level", y="Share (%)", color="Income level",
        facet_col="Source", category_orders={"Income level": CLASS_ORDER},
        color_discrete_map=CLASS_COLORS,
    )
    fig.update_layout(
        height=260,
        margin={"l": 10, "r": 10, "t": 30, "b": 10},
        showlegend=False,
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        font={"family": "Inter, sans-serif", "color": "#1A1F2E"},
    )
    st.plotly_chart(fig, width="stretch", config={"displayModeBar": False})


def render_district_map(brgy, *, height=520, key="brgy_map", focus=None):
    coords, bounds, center = load_geo()
    if not coords or bounds is None or center is None:
        st.info(
            f"Barangay coordinates not found at `{GEOJSON_PATH}`. "
            "Expected a JSON dict of `{NAME: {latitude, longitude}}`."
        )
        return None

    plot_df = brgy.copy()
    plot_df["lat"] = plot_df["barangay"].map(lambda b: coords.get(b, (None, None))[0])
    plot_df["lon"] = plot_df["barangay"].map(lambda b: coords.get(b, (None, None))[1])
    plot_df = plot_df.dropna(subset=["lat", "lon"])

    use_new_api = hasattr(px, "scatter_map")
    scatter = px.scatter_map if use_new_api else px.scatter_mapbox
    style_kw = "map_style" if use_new_api else "mapbox_style"

    plot_df["community_label"] = plot_df["community_class"].map(COMMUNITY_LABELS)
    fig = scatter(
        plot_df,
        lat="lat", lon="lon",
        color="community_label",
        color_discrete_map={v: COMMUNITY_COLORS[k]
                            for k, v in COMMUNITY_LABELS.items()},
        category_orders={"community_label": [COMMUNITY_LABELS[k]
                                              for k in COMMUNITY_CLASS_ORDER]},
        hover_name="barangay",
        hover_data={
            "community_label": True,
            "pocket_density_per_1k": ":.1f",
            "transition_rate_pct": ":.1f",
            "avg_per_capita_income": ":,.0f",
            "four_ps_recipients_latest": ":,.0f",
            "pop_2024": ":,.0f",
            "lat": False, "lon": False,
        },
        custom_data=["barangay"],
        labels={
            "community_label": "Income Level",
            "pocket_density_per_1k": "4Ps families per 1,000 residents",
            "transition_rate_pct": "Share of 4Ps families moving up (%)",
            "avg_per_capita_income": "Monthly income per person (₱)",
            "four_ps_recipients_latest": "4Ps recipients (latest school year)",
            "pop_2024": "Population (2024)",
        },
        center=center,
        zoom=DISTRICT_V_ZOOM,
        **{style_kw: "carto-positron"},
    )
    fig.update_traces(
        marker={"size": 22, "opacity": 0.95},
        selector={"mode": "markers"},
    )
    fig.update_layout(
        margin={"r": 0, "t": 0, "l": 0, "b": 0},
        height=height,
        legend_title_text="Income Level",
        legend={
            "bgcolor": "rgba(255,255,255,0.95)",
            "bordercolor": "#E5E0D8",
            "borderwidth": 1,
            "x": 0.01, "y": 0.99,
            "xanchor": "left", "yanchor": "top",
            "font": {"size": 12, "color": "#1A1F2E"},
        },
        uirevision="qc5-streamlit-map",
    )
    if use_new_api:
        fig.update_layout(map_bounds=bounds)
    else:
        fig.update_layout(mapbox_bounds=bounds)

    event = st.plotly_chart(
        fig, width="stretch", on_select="rerun", key=key,
        config={"displayModeBar": False, "scrollZoom": False, "doubleClick": False},
    )
    points = event.get("selection", {}).get("points", []) if event else []
    if points:
        cd = points[0].get("customdata")
        if cd:
            return cd[0]
    return None


def render_shap_panel(brgy_name, predicted_class, shap_df, top_n=6):
    if brgy_name not in shap_df.index:
        return
    row = shap_df.loc[brgy_name]
    items = []
    for feat, val in row.items():
        lbl = label_feature(feat)
        if lbl is None:
            continue
        items.append((lbl, float(val)))
    items.sort(key=lambda x: x[1], reverse=True)
    items = items[:top_n]
    if not items:
        return
    total = sum(v for _, v in items) or 1.0
    vmax = items[0][1] or 1.0

    bars = []
    for lbl, v in items:
        share = (v / total) * 100
        bar_pct = (v / vmax) * 100
        bars.append(
            f"<div style='margin:10px 0;'>"
            f"<div style='display:flex;justify-content:space-between;font-size:18px;'>"
            f"<span style='color:#1A1F2E;font-weight:600;'>{lbl}</span>"
            f"<span class='muted'>{share:.0f}%</span></div>"
            f"<div style='background:#F4EFE5;border-radius:6px;height:10px;overflow:hidden;margin-top:5px;'>"
            f"<div style='background:#2A4365;width:{bar_pct:.1f}%;height:100%;'></div>"
            f"</div></div>"
        )
    st.markdown(
        f"<div class='kpi'><div class='k'>Why the prediction</div>"
        f"<div class='muted' style='margin-top:6px;'>"
        f"Top factors behind <strong>{predicted_class}</strong> in "
        f"<strong>{brgy_name}</strong>."
        f"</div>"
        f"<div style='margin-top:14px;'>{''.join(bars)}</div></div>",
        unsafe_allow_html=True,
    )


def tier_movement(now_tiers, fut_tiers):
    """For each starting tier, count how many families moved up / stayed / moved down."""
    rank = {"Low": 0, "Middle": 1, "High": 2}
    df = pd.DataFrame({"now": now_tiers, "fut": fut_tiers})
    rows = []
    for cls in CLASS_ORDER:
        sub = df[df["now"] == cls]
        if sub.empty:
            continue
        now_r = rank[cls]
        fut_r = sub["fut"].map(rank)
        rows.append({
            "from": cls,
            "n": len(sub),
            "moved_up": int((fut_r > now_r).sum()),
            "stayed": int((fut_r == now_r).sum()),
            "moved_down": int((fut_r < now_r).sum()),
        })
    return rows


def feature_change_rows(now_df, fut_df):
    """Return before/after means for the headline indicators."""
    pairs = [
        ("Family size", "family_size", "{:.1f}"),
        ("Children at home", "dependents_0_18", "{:.1f}"),
        ("Children in school", "children_in_school", "{:.1f}"),
        ("Active 4Ps share", "active_4ps_share", "{:.0f}%"),
        ("4Ps coverage / 1k", "four_ps_per_1k_pop", "{:.1f}"),
    ]
    return [
        {"label": lbl, "now": float(now_df[col].mean()),
         "fut": float(fut_df[col].mean()), "fmt": fmt}
        for lbl, col, fmt in pairs
    ]


def conformal_summary(conformal, features, df):
    _, sets = conformal.predict_set(df[features])
    sets = np.asarray(sets)
    if sets.ndim == 3:
        sets = sets[:, :, 0]
    set_sizes = sets.sum(axis=1)
    n = len(set_sizes)
    confident = int((set_sizes == 1).sum())
    uncertain = int((set_sizes >= 2).sum())
    return {
        "n": n,
        "confident": confident,
        "uncertain": uncertain,
        "confident_pct": (confident / n * 100) if n else 0,
        "avg_set_size": float(set_sizes.mean()) if n else 0,
    }


def simulate_intervention(families, financial=0, education=0, livelihood=0, years=5):
    f, e, l = financial / 100.0, education / 100.0, livelihood / 100.0
    t = years / 5.0
    df = families.copy().reset_index(drop=True)

    df["family_size"] = (df["family_size"] * (1 - 0.05 * l * t)).clip(lower=1)
    df["dependents_0_18"] = (
        df["dependents_0_18"] * (1 - (0.10 * l + 0.05 * e) * t)
    ).clip(lower=0)

    df["children_in_school"] = df["children_in_school"].clip(upper=df["dependents_0_18"])
    gap = (df["dependents_0_18"] - df["children_in_school"]).clip(lower=0)
    df["children_in_school"] = (
        df["children_in_school"] + gap * (0.70 * e + 0.20 * f) * t
    ).clip(upper=df["dependents_0_18"])

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


def predict_tier(model, features, df):
    preds = model.predict(df[features])
    return np.array(CLASS_ORDER)[preds]


def _tier_breakdown(tiers):
    counts = pd.Series(tiers).value_counts().reindex(CLASS_ORDER, fill_value=0)
    total = int(counts.sum())
    bars = []
    for cls in CLASS_ORDER:
        n = int(counts[cls])
        pct = (n / total * 100) if total > 0 else 0
        bars.append(
            f"<div style='margin:8px 0;'>"
            f"<div style='display:flex;justify-content:space-between;font-size:18px;margin-bottom:5px;'>"
            f"<span style='color:#1A1F2E;font-weight:600;'>{cls}</span>"
            f"<span class='muted'>{n} · {pct:.0f}%</span>"
            f"</div>"
            f"<div style='background:#F4EFE5;border-radius:6px;height:10px;overflow:hidden;'>"
            f"<div style='background:{CLASS_COLORS[cls]};width:{pct:.1f}%;height:100%;'></div>"
            f"</div></div>"
        )
    return "".join(bars)


def _program_weights(name, agency):
    """Heuristic mapping from program name+agency to (financial, education, livelihood)
    weights that sum to 1. Lets each LLM-recommended program drive the simulation."""
    n = (str(name) + " " + str(agency)).lower()
    rules = [
        (("4ps", "pantawid", "aics", "social pension", "cash transfer"),
         (0.65, 0.15, 0.20)),
        (("slp", "sustainable livelihood"), (0.20, 0.05, 0.75)),
        (("dilp", "tupad", "kabuhayan", "integrated livelihood"),
         (0.15, 0.00, 0.85)),
        (("msme", "negosyo", "shared service", "dti"), (0.10, 0.00, 0.90)),
        (("als", "alternative learning", "scholarship", "balik-eskwela"),
         (0.00, 0.90, 0.10)),
        (("school-based feeding", "supplementary feeding", "feeding"),
         (0.05, 0.65, 0.30)),
        (("rpfp", "popcom", "responsible parent", "family planning"),
         (0.00, 0.20, 0.80)),
        (("kalahi-cidss", "kalahi", "block grants"), (0.30, 0.05, 0.65)),
        (("nha", "housing", "dpwh", "infrastructure", "clup"),
         (0.30, 0.00, 0.70)),
        (("deped", "education"), (0.00, 0.85, 0.15)),
    ]
    for keywords, weights in rules:
        if any(k in n for k in keywords):
            return {"financial": weights[0], "education": weights[1],
                    "livelihood": weights[2]}
    return {"financial": 0.35, "education": 0.30, "livelihood": 0.35}


def _dominant_dim(weights):
    return max(weights.items(), key=lambda kv: kv[1])[0]


def compute_ceiling(families, years, model, features, grid_step=25):
    """Highest % of Low-tier families that ANY mix can move up for this
    barangay over `years` years. Same grid as goal_seek_intervention.

    Used to set the target slider's max_value dynamically — so the user
    can never set an unreachable goal, and the cap has a derivation
    instead of being a magic number."""
    now_tiers = predict_tier(model, features, families)
    now_low = int((pd.Series(now_tiers) == "Low").sum())
    if now_low == 0:
        return 0.0
    grid = list(range(0, 101, grid_step))
    best = 0.0
    for f in grid:
        for e in grid:
            for l in grid:
                projected = simulate_intervention(families, f, e, l, years)
                fut_tiers = predict_tier(model, features, projected)
                fut_low = int((pd.Series(fut_tiers) == "Low").sum())
                reduction = (now_low - fut_low) / now_low * 100.0
                if reduction > best:
                    best = reduction
    return best


def goal_seek_intervention(families, target_low_reduction_pct, years,
                            model, features, grid_step=25):
    """Inverse simulation: brute-force search across (financial, education,
    livelihood) intensity mixes on a coarse grid. Returns every mix that hits
    the Low-tier reduction target, sorted by total effort (sum of intensities),
    plus the best attempt overall so the UI can fall back gracefully when no
    mix is viable. With grid_step=25 the search is 5^3 = 125 evaluations."""
    now_tiers = predict_tier(model, features, families)
    now_low = int((pd.Series(now_tiers) == "Low").sum())
    if now_low == 0:
        return {"viable": [], "best_attempt": None, "now_low": 0}

    grid = list(range(0, 101, grid_step))
    viable = []
    best_attempt = None
    best_reduction = -1.0

    for f in grid:
        for e in grid:
            for l in grid:
                projected = simulate_intervention(families, f, e, l, years)
                fut_tiers = predict_tier(model, features, projected)
                fut_low = int((pd.Series(fut_tiers) == "Low").sum())
                reduction_pct = (now_low - fut_low) / now_low * 100.0
                entry = {
                    "fin": f, "edu": e, "liv": l,
                    "cost": f + e + l,
                    "reduction_pct": reduction_pct,
                    "fut_low": fut_low,
                }
                if reduction_pct > best_reduction:
                    best_reduction = reduction_pct
                    best_attempt = entry
                if reduction_pct >= target_low_reduction_pct:
                    viable.append(entry)

    viable.sort(key=lambda x: (x["cost"], -x["reduction_pct"]))
    return {"viable": viable, "best_attempt": best_attempt, "now_low": now_low}


def render_policy_brief(brgy_name, briefs):
    brief = briefs.get(brgy_name)
    if not brief or "error" in brief:
        st.markdown(
            "<div class='kpi'><div class='k'>AI Policy Brief</div>"
            "<div class='muted' style='margin-top:6px;line-height:1.5;'>"
            "No brief generated yet. Run <code>python build_briefs.py</code> "
            "(needs a free Gemini API key from "
            "<a href='https://aistudio.google.com/apikey' target='_blank'>aistudio.google.com/apikey</a>) "
            "to generate AI-recommended programs for each barangay."
            "</div></div>",
            unsafe_allow_html=True,
        )
        return

    PRIORITY_COLOR = {"High": "#B91C1C", "Medium": "#B45309", "Low": "#6B7280"}

    program_cards = []
    for p in brief.get("programs", []):
        prio = p.get("priority", "Medium")
        pc = PRIORITY_COLOR.get(prio, "#6B7280")
        program_cards.append(
            f"<div style='border-left:4px solid {pc};padding:12px 16px;margin:10px 0;"
            f"background:rgba(255,255,255,0.85);border-radius:10px;"
            f"box-shadow:0 2px 8px -6px rgba(15,23,42,0.10);'>"
            f"<div style='display:flex;justify-content:space-between;align-items:baseline;'>"
            f"<span style='font-weight:700;font-size:19px;color:#1A1F2E;'>{p.get('name','')}</span>"
            f"<span style='font-size:15px;text-transform:uppercase;letter-spacing:0.5px;"
            f"font-weight:700;color:{pc};'>{prio}</span></div>"
            f"<div style='font-size:19px;color:#6B7280;margin-top:4px;'>"
            f"{p.get('agency','')}</div>"
            f"<div style='font-size:18px;color:#3A4256;margin-top:8px;line-height:1.6;'>"
            f"{p.get('rationale','')}</div></div>"
        )

    suggestion = brief.get("slider_suggestion", {}) or {}
    sug_html = ""
    if suggestion:
        sug_html = (
            f"<div style='margin-top:14px;padding:12px 14px;background:rgba(244,239,229,0.7);"
            f"border-radius:8px;font-size:17px;'>"
            f"<div style='font-weight:700;color:#1A1F2E;margin-bottom:6px;font-size:19px;"
            f"text-transform:uppercase;letter-spacing:0.5px;color:#6B7280;'>"
            f"Suggested intensities</div>"
            f"<div style='color:#1A1F2E;font-size:18px;'>"
            f"<strong>Financial</strong> {suggestion.get('financial','-')}% &nbsp;·&nbsp; "
            f"<strong>Education</strong> {suggestion.get('education','-')}% &nbsp;·&nbsp; "
            f"<strong>Livelihood</strong> {suggestion.get('livelihood','-')}%"
            f"</div>"
            f"<div class='muted' style='margin-top:6px;'>"
            f"{suggestion.get('reasoning','')}</div></div>"
        )

    st.markdown(
        f"<div class='kpi'>"
        f"<div style='font-size:19px;color:#1A1F2E;line-height:1.6;'>"
        f"{brief.get('summary','')}</div>"
        f"<div style='margin-top:10px;'>{''.join(program_cards)}</div>"
        f"{sug_html}"
        f"</div>",
        unsafe_allow_html=True,
    )

    if suggestion and st.button("Apply suggested intensities", key=f"apply_{brgy_name}"):
        st.session_state.fin_val = int(suggestion.get("financial", 0))
        st.session_state.edu_val = int(suggestion.get("education", 0))
        st.session_state.liv_val = int(suggestion.get("livelihood", 0))
        st.rerun()


def render_intervention_plan(brgy_name, families_df, model_pipeline, features,
                              conformal, briefs):
    brief = briefs.get(brgy_name)
    has_brief = bool(brief) and "error" not in brief

    if has_brief:
        st.markdown(
            f"<div style='font-size:17px;color:#1A1F2E;line-height:1.6;"
            f"margin-bottom:16px;'>{brief.get('summary','')}</div>",
            unsafe_allow_html=True,
        )

    PRIORITY_COLOR = {"High": "#B91C1C", "Medium": "#B45309", "Low": "#6B7280"}
    DIM_LABEL = {"financial": "Financial help", "education": "Education support",
                 "livelihood": "Livelihood & family"}
    DIM_COLOR = {"financial": "#1E3A8A", "education": "#6B21A8",
                 "livelihood": "#0F766E"}

    programs = list((brief or {}).get("programs") or [])
    if not programs:
        programs = [
            {"name": "Financial Support package", "agency": "DSWD / DOLE",
             "priority": "Medium",
             "rationale": "(No LLM brief — using a generic plan placeholder.)"},
            {"name": "Education Support package", "agency": "DepEd / DSWD",
             "priority": "Medium",
             "rationale": "(No LLM brief — using a generic plan placeholder.)"},
            {"name": "Family & Livelihood package", "agency": "POPCOM / DTI",
             "priority": "Medium",
             "rationale": "(No LLM brief — using a generic plan placeholder.)"},
        ]
    for p in programs:
        p["weights"] = _program_weights(p.get("name", ""), p.get("agency", ""))
        p["dominant"] = _dominant_dim(p["weights"])

    brgy_families = families_df[families_df["barangay"] == brgy_name].copy()
    if brgy_families.empty:
        st.warning("No family records for this barangay.")
        return

    years_key = f"goal_years_{brgy_name}"
    years_for_ceiling = int(st.session_state.get(years_key, 5))
    ceiling_cache_key = f"goal_ceiling_{brgy_name}_{years_for_ceiling}"
    if ceiling_cache_key not in st.session_state:
        with st.spinner(f"Estimating reachable range for {brgy_name}…"):
            st.session_state[ceiling_cache_key] = compute_ceiling(
                brgy_families, years_for_ceiling, model_pipeline, features,
            )
    ceiling_raw = float(st.session_state[ceiling_cache_key])
    ceiling_pct = max(5, (int(ceiling_raw) // 5) * 5)

    if ceiling_raw <= 0:
        st.info("No Low-tier families here — nothing to plan for.")
        return

    target_state_key = f"goal_target_{brgy_name}"
    if (target_state_key in st.session_state
            and st.session_state[target_state_key] > ceiling_pct):
        st.session_state[target_state_key] = ceiling_pct
    default_target = min(ceiling_pct, max(5, (ceiling_pct // 2 // 5) * 5))

    st.markdown(
        f"<div style='padding:14px 16px;background:rgba(244,239,229,0.7);"
        f"border-left:4px solid #2A4365;border-radius:10px;font-size:18px;"
        f"line-height:1.6;margin-bottom:16px;'>"
        f"<div style='font-size:19px;font-weight:700;text-transform:uppercase;"
        f"letter-spacing:0.6px;color:#2A4365;margin-bottom:6px;'>"
        f"Goal-based planning</div>"
        f"<div style='color:#1A1F2E;'>Set a target — we'll find the lightest "
        f"program mix that reaches it. Slider is capped at "
        f"<strong>{ceiling_pct}%</strong>, the highest reduction the model "
        f"can produce here in {years_for_ceiling} years.</div></div>",
        unsafe_allow_html=True,
    )

    g1, g2, g3 = st.columns([1.6, 0.7, 0.5])
    target_pct = g1.slider(
        "Target: % of poorest families to move up",
        min_value=5, max_value=ceiling_pct, value=default_target, step=5,
        key=target_state_key,
        help=f"Capped at {ceiling_pct}% — the reachable ceiling for this "
             f"barangay over {years_for_ceiling} years.",
    )
    years = g2.select_slider(
        "Time (years)", options=[3, 4, 5], value=years_for_ceiling,
        key=years_key,
    )
    g3.markdown("<div style='height:28px;'></div>", unsafe_allow_html=True)
    solve_clicked = g3.button("★ Solve", use_container_width=True,
                               key=f"goal_solve_{brgy_name}")

    cache_key = f"goal_result_{brgy_name}"
    cache_args_key = f"goal_args_{brgy_name}"
    args_now = (target_pct, years)
    cached_args = st.session_state.get(cache_args_key)

    needs_run = solve_clicked or cache_key not in st.session_state
    if needs_run:
        with st.spinner(f"Trying many program combinations for {brgy_name}…"):
            result = goal_seek_intervention(
                brgy_families, target_pct, years,
                model_pipeline, features, grid_step=25,
            )
        st.session_state[cache_key] = result
        st.session_state[cache_args_key] = args_now
    elif cached_args != args_now:
        st.markdown(
            "<div style='padding:10px 14px;background:rgba(42,67,101,0.08);"
            "border-radius:8px;font-size:17px;color:#1A1F2E;margin-bottom:12px;'>"
            "Goal or years changed. Press <strong>★ Solve</strong> for a fresh plan."
            "</div>",
            unsafe_allow_html=True,
        )

    result = st.session_state[cache_key]
    viable = result["viable"]
    best_attempt = result["best_attempt"]
    shown_target, shown_years = cached_args if cached_args else args_now

    if result["now_low"] == 0:
        st.info("No Low-tier families here — nothing to plan for.")
        return

    if viable:
        pick = viable[0]
        st.markdown(
            f"<div style='padding:16px 18px;background:linear-gradient(135deg,"
            f"rgba(22,101,52,0.12),rgba(42,67,101,0.06));"
            f"border-left:4px solid #166534;border-radius:10px;margin-bottom:14px;'>"
            f"<div style='font-size:19px;font-weight:700;text-transform:uppercase;"
            f"letter-spacing:0.6px;color:#166534;'>★ Recommended plan</div>"
            f"<div style='font-size:19px;color:#1A1F2E;margin-top:8px;line-height:1.6;'>"
            f"Reaches <strong>{pick['reduction_pct']:.0f}%</strong> "
            f"(goal: {shown_target}%) in {shown_years} years. "
            f"Cost <strong>{pick['cost']}</strong>/300 — lightest of "
            f"{len(viable)} viable plans.</div>"
            f"<div style='margin-top:12px;font-size:19px;'>"
            f"<span style='color:{DIM_COLOR['financial']};font-weight:700;'>"
            f"Financial {pick['fin']}%</span> &nbsp;·&nbsp; "
            f"<span style='color:{DIM_COLOR['education']};font-weight:700;'>"
            f"Education {pick['edu']}%</span> &nbsp;·&nbsp; "
            f"<span style='color:{DIM_COLOR['livelihood']};font-weight:700;'>"
            f"Livelihood {pick['liv']}%</span></div></div>",
            unsafe_allow_html=True,
        )
    else:
        pick = best_attempt
        st.markdown(
            f"<div style='padding:16px 18px;background:rgba(185,28,28,0.08);"
            f"border-left:4px solid #B91C1C;border-radius:10px;margin-bottom:14px;'>"
            f"<div style='font-size:19px;font-weight:700;text-transform:uppercase;"
            f"letter-spacing:0.6px;color:#B91C1C;'>Goal out of reach</div>"
            f"<div style='font-size:19px;color:#1A1F2E;margin-top:8px;line-height:1.6;'>"
            f"Best possible: <strong>{pick['reduction_pct']:.0f}%</strong> "
            f"(goal: {shown_target}%) with Financial {pick['fin']}%, "
            f"Education {pick['edu']}%, Livelihood {pick['liv']}%. "
            f"Try a lower target or more years.</div></div>",
            unsafe_allow_html=True,
        )

    fin, edu, liv = pick["fin"], pick["edu"], pick["liv"]
    years = shown_years

    st.markdown(
        "<div class='muted' style='font-size:17px;margin-top:6px;margin-bottom:10px;'>"
        "Roll-out intensity per program:"
        "</div>",
        unsafe_allow_html=True,
    )
    dim_intensity = {"financial": fin, "education": edu, "livelihood": liv}
    program_rows = [programs[i:i+2] for i in range(0, len(programs), 2)]
    for row in program_rows:
        cols = st.columns(len(row))
        for col, p in zip(cols, row):
            with col:
                prio = p.get("priority", "Medium")
                pc = PRIORITY_COLOR.get(prio, "#6B7280")
                dom = p["dominant"]
                intensity = dim_intensity[dom]
                dim_chip = (
                    f"<span style='background:{DIM_COLOR[dom]};color:#fff;"
                    f"font-size:15px;font-weight:700;padding:4px 10px;"
                    f"border-radius:999px;text-transform:uppercase;"
                    f"letter-spacing:0.4px;'>{DIM_LABEL[dom]} · {intensity}%</span>"
                )
                st.markdown(
                    f"<div style='background:rgba(255,255,255,0.85);"
                    f"border-left:4px solid {pc};border-radius:10px;"
                    f"padding:14px 16px;margin-bottom:10px;"
                    f"box-shadow:0 2px 10px -6px rgba(15,23,42,0.10);'>"
                    f"<div style='display:flex;justify-content:space-between;"
                    f"align-items:baseline;margin-bottom:6px;'>"
                    f"<span style='font-size:15px;font-weight:700;"
                    f"text-transform:uppercase;letter-spacing:0.5px;color:{pc};'>"
                    f"{prio}</span>{dim_chip}</div>"
                    f"<div style='font-weight:700;font-size:19px;color:#1A1F2E;"
                    f"line-height:1.35;'>{p.get('name','')}</div>"
                    f"<div style='font-size:19px;color:#6B7280;margin-top:3px;'>"
                    f"{p.get('agency','')}</div>"
                    f"<div style='font-size:17px;color:#3A4256;margin-top:8px;"
                    f"line-height:1.55;'>{p.get('rationale','')}</div></div>",
                    unsafe_allow_html=True,
                )

    if len(viable) > 1:
        n_alts = min(len(viable) - 1, 4)
        base_cost = viable[0]["cost"]
        with st.expander(f"{n_alts} alternative plan{'s' if n_alts > 1 else ''}"):
            st.markdown(
                "<div class='muted' style='margin-bottom:10px;'>"
                "Other mixes that also meet the target."
                "</div>",
                unsafe_allow_html=True,
            )
            plan_labels = ["B", "C", "D", "E"]
            for idx, alt in enumerate(viable[1:1 + n_alts]):
                extra = alt["cost"] - base_cost
                if extra == 0:
                    tag = "same intensity"
                elif extra <= 25:
                    tag = "slightly heavier"
                elif extra <= 75:
                    tag = "heavier"
                else:
                    tag = "much heavier"
                st.markdown(
                    f"<div style='padding:12px 16px;margin:8px 0;"
                    f"background:rgba(255,255,255,0.7);border-radius:10px;"
                    f"font-size:18px;line-height:1.6;'>"
                    f"<div style='display:flex;justify-content:space-between;"
                    f"align-items:baseline;margin-bottom:6px;'>"
                    f"<span style='font-weight:700;color:#1A1F2E;font-size:19px;'>"
                    f"Plan {plan_labels[idx]}</span>"
                    f"<span class='muted' style='font-size:19px;'>{tag}</span>"
                    f"</div>"
                    f"<div style='color:#1A1F2E;'>"
                    f"Reaches <strong>{alt['reduction_pct']:.0f}%</strong>."
                    f"</div>"
                    f"<div style='margin-top:8px;font-size:17px;'>"
                    f"<span style='color:{DIM_COLOR['financial']};font-weight:700;'>"
                    f"Financial {alt['fin']}%</span> &nbsp;·&nbsp; "
                    f"<span style='color:{DIM_COLOR['education']};font-weight:700;'>"
                    f"Education {alt['edu']}%</span> &nbsp;·&nbsp; "
                    f"<span style='color:{DIM_COLOR['livelihood']};font-weight:700;'>"
                    f"Livelihood {alt['liv']}%</span></div></div>",
                    unsafe_allow_html=True,
                )

    projected = simulate_intervention(brgy_families, fin, edu, liv, years)
    now_tiers = predict_tier(model_pipeline, features, brgy_families)
    fut_tiers = predict_tier(model_pipeline, features, projected)

    now_dom = pd.Series(now_tiers).value_counts().idxmax()
    fut_dom = pd.Series(fut_tiers).value_counts().idxmax()

    now_conf = conformal_summary(conformal, features, brgy_families) if conformal else None
    fut_conf = conformal_summary(conformal, features, projected) if conformal else None

    rank = {"Low": 0, "Middle": 1, "High": 2}
    delta = rank[fut_dom] - rank[now_dom]
    if delta > 0:
        verdict, vcolor = "▲ Improved", "#166534"
    elif delta < 0:
        verdict, vcolor = "▼ Worsened", "#B91C1C"
    else:
        verdict, vcolor = "→ Unchanged", "#6B7280"

    def conf_line(c):
        if c is None:
            return ""
        return (f"<div class='muted' style='margin-top:8px;'>"
                f"Confident on <strong>{c['confident_pct']:.0f}%</strong> "
                f"of families.</div>")

    st.markdown("<div style='height:14px;'></div>", unsafe_allow_html=True)
    col_now, col_fut = st.columns(2)
    with col_now:
        st.markdown(
            f"<div class='kpi'><div class='k'>Now</div>"
            f"<div style='margin-top:10px;'>"
            f"<span class='tier-chip' style='background:{CLASS_COLORS[now_dom]};'>{now_dom}</span>"
            f"<span class='muted' style='margin-left:10px;'>dominant tier</span>"
            f"</div>{conf_line(now_conf)}"
            f"<div style='margin-top:14px;'>{_tier_breakdown(now_tiers)}</div></div>",
            unsafe_allow_html=True,
        )
    with col_fut:
        st.markdown(
            f"<div class='kpi'>"
            f"<div style='display:flex;justify-content:space-between;align-items:baseline;'>"
            f"<div class='k'>After {years} years</div>"
            f"<div style='color:{vcolor};font-weight:700;font-size:17px;'>{verdict}</div></div>"
            f"<div style='margin-top:10px;'>"
            f"<span class='tier-chip' style='background:{CLASS_COLORS[fut_dom]};'>{fut_dom}</span>"
            f"<span class='muted' style='margin-left:10px;'>projected tier</span>"
            f"</div>{conf_line(fut_conf)}"
            f"<div style='margin-top:14px;'>{_tier_breakdown(fut_tiers)}</div></div>",
            unsafe_allow_html=True,
        )

    st.markdown("<div style='height:14px;'></div>", unsafe_allow_html=True)
    movements = tier_movement(now_tiers, fut_tiers)
    if movements:
        move_rows = []
        for m in movements:
            badges = []
            if m["moved_up"] > 0:
                badges.append(f"<span style='color:#166534;font-weight:600;'>↑ {m['moved_up']} up</span>")
            if m["stayed"] > 0:
                badges.append(f"<span class='muted'>= {m['stayed']}</span>")
            if m["moved_down"] > 0:
                badges.append(f"<span style='color:#B91C1C;font-weight:600;'>↓ {m['moved_down']} down</span>")
            move_rows.append(
                f"<div style='display:flex;justify-content:space-between;align-items:center;"
                f"padding:11px 0;border-bottom:1px solid #F4EFE5;font-size:18px;'>"
                f"<span><span class='tier-chip' style='background:{CLASS_COLORS[m['from']]};"
                f"font-size:19px;padding:4px 12px;'>From {m['from']}</span></span>"
                f"<span>{'  ·  '.join(badges)}</span></div>"
            )
        st.markdown(
            f"<div class='kpi'><div class='k'>Family movement</div>"
            f"<div style='margin-top:12px;'>{''.join(move_rows)}</div></div>",
            unsafe_allow_html=True,
        )

    st.markdown("<div style='height:12px;'></div>", unsafe_allow_html=True)
    changes = feature_change_rows(brgy_families, projected)
    change_rows = []
    for c in changes:
        n, f = c["now"], c["fut"]
        arrow = "↑" if f > n + 1e-9 else ("↓" if f < n - 1e-9 else "→")
        change_rows.append(
            f"<div style='display:flex;justify-content:space-between;align-items:center;"
            f"padding:11px 0;border-bottom:1px solid #F4EFE5;font-size:18px;'>"
            f"<span style='color:#1A1F2E;font-weight:600;'>{c['label']}</span>"
            f"<span>"
            f"<span class='muted'>{c['fmt'].format(n)}</span>"
            f"<span style='margin:0 12px;color:#6B7280;font-weight:700;'>{arrow}</span>"
            f"<span style='color:#1A1F2E;font-weight:600;'>{c['fmt'].format(f)}</span>"
            f"</span></div>"
        )
    st.markdown(
        f"<div class='kpi'><div class='k'>Indicator changes</div>"
        f"<div style='margin-top:12px;'>{''.join(change_rows)}</div></div>",
        unsafe_allow_html=True,
    )


def render_whatif(brgy_name, families_df, model_pipeline, features, conformal=None):
    if "fin_val" not in st.session_state:
        st.session_state.fin_val = 0
        st.session_state.edu_val = 0
        st.session_state.liv_val = 0

    st.markdown(
        "<p class='muted'>Pick a preset or set custom intensities — the model re-scores every family.</p>",
        unsafe_allow_html=True,
    )

    p1, p2, p3 = st.columns(3)
    if p1.button("No action  ·  0%", use_container_width=True):
        st.session_state.fin_val = st.session_state.edu_val = st.session_state.liv_val = 0
    if p2.button("Moderate  ·  40%", use_container_width=True):
        st.session_state.fin_val = st.session_state.edu_val = st.session_state.liv_val = 40
    if p3.button("Aggressive  ·  80%", use_container_width=True):
        st.session_state.fin_val = st.session_state.edu_val = st.session_state.liv_val = 80

    c1, c2, c3, c4 = st.columns([1, 1, 1, 0.6])
    fin = c1.slider("Financial", 0, 100, key="fin_val",
                    help="4Ps, SLP, AICS — cash transfers and grants.")
    edu = c2.slider("Education", 0, 100, key="edu_val",
                    help="Scholarships, ALS, 4Ps schooling.")
    liv = c3.slider("Livelihood", 0, 100, key="liv_val",
                    help="RPFP, microenterprise, employment.")
    years = c4.select_slider("Years", options=[3, 4, 5], value=5)

    brgy_families = families_df[families_df["barangay"] == brgy_name].copy()
    if brgy_families.empty:
        st.warning("No family records for this barangay.")
        return

    projected = simulate_intervention(brgy_families, fin, edu, liv, years)
    now_tiers = predict_tier(model_pipeline, features, brgy_families)
    fut_tiers = predict_tier(model_pipeline, features, projected)

    now_dom = pd.Series(now_tiers).value_counts().idxmax()
    fut_dom = pd.Series(fut_tiers).value_counts().idxmax()

    now_conf = conformal_summary(conformal, features, brgy_families) if conformal else None
    fut_conf = conformal_summary(conformal, features, projected) if conformal else None

    rank = {"Low": 0, "Middle": 1, "High": 2}
    delta = rank[fut_dom] - rank[now_dom]
    if delta > 0:
        verdict, vcolor = "▲ Improved", "#166534"
    elif delta < 0:
        verdict, vcolor = "▼ Worsened", "#B91C1C"
    else:
        verdict, vcolor = "→ Unchanged", "#6B7280"

    def conf_line(c):
        if c is None:
            return ""
        return (f"<div class='muted' style='margin-top:8px;'>"
                f"Confident on <strong>{c['confident_pct']:.0f}%</strong> of families."
                f"</div>")

    st.markdown("<div style='height:12px;'></div>", unsafe_allow_html=True)
    col_now, col_fut = st.columns(2)
    with col_now:
        st.markdown(
            f"<div class='kpi'>"
            f"<div class='k'>Now</div>"
            f"<div style='margin-top:10px;'>"
            f"<span class='tier-chip' style='background:{CLASS_COLORS[now_dom]};'>{now_dom}</span>"
            f"<span class='muted' style='margin-left:10px;'>dominant tier</span>"
            f"</div>"
            f"{conf_line(now_conf)}"
            f"<div style='margin-top:14px;'>{_tier_breakdown(now_tiers)}</div>"
            f"</div>",
            unsafe_allow_html=True,
        )
    with col_fut:
        st.markdown(
            f"<div class='kpi'>"
            f"<div style='display:flex;justify-content:space-between;align-items:baseline;'>"
            f"<div class='k'>After {years} years</div>"
            f"<div style='color:{vcolor};font-weight:700;font-size:17px;'>{verdict}</div>"
            f"</div>"
            f"<div style='margin-top:10px;'>"
            f"<span class='tier-chip' style='background:{CLASS_COLORS[fut_dom]};'>{fut_dom}</span>"
            f"<span class='muted' style='margin-left:10px;'>projected tier</span>"
            f"</div>"
            f"{conf_line(fut_conf)}"
            f"<div style='margin-top:14px;'>{_tier_breakdown(fut_tiers)}</div>"
            f"</div>",
            unsafe_allow_html=True,
        )

    st.markdown("<div style='height:14px;'></div>", unsafe_allow_html=True)
    movements = tier_movement(now_tiers, fut_tiers)
    if movements:
        move_rows = []
        for m in movements:
            badges = []
            if m["moved_up"] > 0:
                badges.append(
                    f"<span style='color:#166534;font-weight:600;'>↑ {m['moved_up']} up</span>"
                )
            if m["stayed"] > 0:
                badges.append(
                    f"<span class='muted'>= {m['stayed']}</span>"
                )
            if m["moved_down"] > 0:
                badges.append(
                    f"<span style='color:#B91C1C;font-weight:600;'>↓ {m['moved_down']} down</span>"
                )
            move_rows.append(
                f"<div style='display:flex;justify-content:space-between;align-items:center;"
                f"padding:11px 0;border-bottom:1px solid #F4EFE5;font-size:18px;'>"
                f"<span><span class='tier-chip' style='background:{CLASS_COLORS[m['from']]};"
                f"font-size:19px;padding:4px 12px;'>From {m['from']}</span></span>"
                f"<span>{'  ·  '.join(badges)}</span>"
                f"</div>"
            )
        st.markdown(
            f"<div class='kpi'><div class='k'>Family movement</div>"
            f"<div style='margin-top:12px;'>{''.join(move_rows)}</div></div>",
            unsafe_allow_html=True,
        )

    st.markdown("<div style='height:12px;'></div>", unsafe_allow_html=True)
    changes = feature_change_rows(brgy_families, projected)
    change_rows = []
    for c in changes:
        n, f = c["now"], c["fut"]
        arrow = "↑" if f > n + 1e-9 else ("↓" if f < n - 1e-9 else "→")
        change_rows.append(
            f"<div style='display:flex;justify-content:space-between;align-items:center;"
            f"padding:11px 0;border-bottom:1px solid #F4EFE5;font-size:18px;'>"
            f"<span style='color:#1A1F2E;font-weight:600;'>{c['label']}</span>"
            f"<span>"
            f"<span class='muted'>{c['fmt'].format(n)}</span>"
            f"<span style='margin:0 12px;color:#6B7280;font-weight:700;'>{arrow}</span>"
            f"<span style='color:#1A1F2E;font-weight:600;'>{c['fmt'].format(f)}</span>"
            f"</span></div>"
        )
    st.markdown(
        f"<div class='kpi'><div class='k'>Indicator changes</div>"
        f"<div style='margin-top:12px;'>{''.join(change_rows)}</div></div>",
        unsafe_allow_html=True,
    )


st.set_page_config(
    page_title="District V · Income",
    layout="wide",
    initial_sidebar_state="expanded",
)
inject_styles()

st.markdown("<span class='pill'>QC District V · Novaliches</span>", unsafe_allow_html=True)
st.title("Barangay Income")

if not MODEL_PATH.exists() or not BRGY_PATH.exists():
    st.error("Run `python build_stacking_model.py` first.")
    st.stop()

brgy = load_brgy()
families_df = load_families()
shap_df = load_shap()
briefs = load_briefs()
artifact = load_model()
model_name = artifact["model_name"]
model_pipe = artifact["pipeline"]
model_features = artifact["features"]
conformal = artifact.get("conformal")
conformal_emp = artifact.get("conformal_coverage_empirical")
conformal_target = artifact.get("conformal_coverage_target")

render_overview(brgy)
st.markdown("<hr class='rule'>", unsafe_allow_html=True)

with st.sidebar:
    st.markdown("### Controls")
    acc, within = load_metrics()

    def _stat(value, label, color):
        return (
            f"<div style='flex:1;text-align:center;'>"
            f"<div style='font-family:\"Plus Jakarta Sans\",Inter,sans-serif;"
            f"font-size:25px;font-weight:700;color:{color};line-height:1.05;'>{value}</div>"
            f"<div style='font-size:11px;color:#6B7280;text-transform:uppercase;"
            f"letter-spacing:0.4px;margin-top:4px;'>{label}</div></div>"
        )

    stats = ""
    if acc is not None:
        stats += _stat(f"{acc:.0%}", "Accuracy", "#1A1F2E")
    if within is not None:
        stats += _stat(f"{within:.0%}", "Within 1 tier", "#166534")
    if conformal_emp is not None:
        stats += _stat(f"{conformal_emp:.0%}", "Coverage", "#2A4365")

    st.markdown(
        f"<div class='kpi' style='padding:14px 16px;margin-top:8px;'>"
        f"<div class='k'>Model</div>"
        f"<div style='font-size:15px;font-weight:600;color:#1A1F2E;margin-top:3px;"
        f"line-height:1.3;'>{model_name}</div>"
        f"<div style='display:flex;gap:8px;margin-top:14px;'>{stats}</div>"
        f"</div>",
        unsafe_allow_html=True,
    )

    chips = "".join(
        f"<span style='font-size:12px;font-weight:600;color:#2A4365;background:#EEF2F7;"
        f"border:1px solid #DCE3ED;border-radius:999px;padding:4px 11px;'>{c}</span>"
        for c in ("4Ps income", "4Ps education", "population")
    )
    st.markdown(
        f"<div style='margin:10px 0 16px;display:flex;flex-wrap:wrap;gap:6px;'>{chips}</div>",
        unsafe_allow_html=True,
    )

    target_txt = f" (target {conformal_target:.0%})" if conformal_target else ""
    with st.expander("Why these numbers?"):
        st.markdown(
            "<div class='muted' style='font-size:15px;line-height:1.55;'>"
            "Income itself is excluded — it defines the label — so tiers are "
            "predicted from family &amp; community proxies, a genuinely hard task. "
            "Most misses land on an adjacent tier, so the "
            "<strong>within-one-tier</strong> figure is the fair read. "
            f"Coverage is the conformal prediction-set coverage{target_txt}, "
            "not accuracy."
            "</div>",
            unsafe_allow_html=True,
        )
    selector = st.selectbox(
        "Barangay",
        options=["(none)"] + list(brgy["barangay"]),
        index=0,
    )
    st.markdown("<hr class='rule'>", unsafe_allow_html=True)
    st.markdown(
        "<div style='font-weight:700;font-size:17px;color:#1A1F2E;"
        "text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;'>"
        "Income Levels</div>",
        unsafe_allow_html=True,
    )
    _community_rules = {
        "priority":   "top-third — highest concentration of low-income families",
        "developing": "middle-third — mixed-income, in transition",
        "stable":     "bottom-third — lowest concentration of low-income families",
    }
    for key in COMMUNITY_CLASS_ORDER:
        st.markdown(
            f"<div style='margin:8px 0;'>"
            f"<span class='tier-chip' style='background:{COMMUNITY_COLORS[key]};'>"
            f"{COMMUNITY_SHORT[key]}</span><br>"
            f"<span class='muted' style='font-size:19px;'>"
            f"{_community_rules[key]}</span>"
            f"</div>",
            unsafe_allow_html=True,
        )
    st.markdown(
        "<div class='muted' style='margin-top:12px;'>"
        "The 14 barangays are ranked by poor families per 1,000 residents "
        "(weighted by how few move up), then split into thirds. QC's "
        "overall poverty is just "
        f"<strong>{QC_BASELINE_POVERTY_PCT:.1f}%</strong> (PSA, 2023), "
        "so peer ranking is used — same as PSA Small Area Estimation."
        "</div>",
        unsafe_allow_html=True,
    )

if "selected_brgy" not in st.session_state:
    st.session_state.selected_brgy = None
if selector != "(none)":
    st.session_state.selected_brgy = selector
selected = st.session_state.selected_brgy

left, right = st.columns([1.25, 1])
with left:
    st.markdown("#### Map")
    map_click = render_district_map(brgy, height=560, key="brgy_map", focus=selected)
    if map_click:
        st.session_state.selected_brgy = map_click
        selected = map_click
with right:
    if not selected:
        st.markdown("#### Profile")
        st.markdown(
            "<div class='muted'>Click a pin or pick a barangay from the sidebar.</div>",
            unsafe_allow_html=True,
        )
    else:
        row = brgy[brgy["barangay"] == selected].iloc[0]
        cls = row["predicted_class"]
        community_key = row.get("community_class", "developing")
        community_label = COMMUNITY_LABELS.get(community_key, "—")
        community_color = COMMUNITY_COLORS.get(community_key, "#B45309")
        st.markdown(
            f"<div class='brgy-head'>"
            f"<h2>{selected}</h2>"
            f"<span class='tier-chip' style='background:{community_color};'>"
            f"{community_label}</span>"
            f"</div>",
            unsafe_allow_html=True,
        )
        st.markdown("<div style='height:8px;'></div>", unsafe_allow_html=True)
        render_classification_report(row, community_key)
        st.markdown("<div style='height:14px;'></div>", unsafe_allow_html=True)
        render_indicators(row)
        st.markdown("<div style='height:14px;'></div>", unsafe_allow_html=True)
        render_shap_panel(selected, cls, shap_df)
        st.markdown("<div style='height:14px;'></div>", unsafe_allow_html=True)
        render_class_distribution(row)

if selected:
    st.markdown("<hr class='rule'>", unsafe_allow_html=True)
    st.markdown(f"### Intervention Plan · {selected}")
    render_intervention_plan(
        selected, families_df, model_pipe, model_features,
        conformal=conformal, briefs=briefs,
    )

