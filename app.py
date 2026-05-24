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

CLASS_COLORS = {"Low": "#e91e63", "Middle": "#ad1457", "High": "#4a0e2e"}
CLASS_ORDER = ["Low", "Middle", "High"]
CLASS_TIER = {"Low": "Survival", "Middle": "Subsistence", "High": "Self-sufficient"}

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
    return pd.read_csv(BRGY_PATH)


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


def inject_styles():
    st.markdown(
        """
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:wght@500;600;700&display=swap" rel="stylesheet">
        <style>
        html, body, [class*="css"], [data-testid="stAppViewContainer"] {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #2d1020;
        }
        [data-testid="stAppViewContainer"] {
            background:
                radial-gradient(900px 500px at 0% 0%, #ffe4ee 0%, transparent 55%),
                radial-gradient(700px 400px at 100% 0%, #fff0f6 0%, transparent 50%),
                linear-gradient(180deg, #fffafc 0%, #fff5f9 100%);
        }
        [data-testid="stHeader"] { background: transparent; }
        [data-testid="stSidebar"] {
            background: linear-gradient(180deg, #fff2f6 0%, #ffd9e3 100%);
            border-right: 1px solid #f6c7d4;
        }
        [data-testid="stSidebar"] * { color: #5a1a36; }
        h1 {
            font-family: 'Fraunces', Georgia, serif !important;
            color: #2d1020 !important; font-weight: 700 !important;
            letter-spacing: -0.8px; line-height: 1.05;
            font-size: 42px !important;
        }
        h2, h3, h4 {
            font-family: 'Fraunces', Georgia, serif !important;
            color: #4a0e2e !important; font-weight: 600 !important;
            letter-spacing: -0.3px;
        }
        [data-testid="stMetric"] {
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid #fadbe5;
            border-radius: 14px;
            padding: 12px 14px;
            box-shadow: 0 4px 16px -12px rgba(173, 20, 87, 0.22);
        }
        [data-testid="stMetricLabel"] p {
            color: #9b3b6b !important; font-weight: 600 !important;
            font-size: 11px !important; text-transform: uppercase;
            letter-spacing: 0.6px;
        }
        [data-testid="stMetricValue"] {
            color: #2d1020 !important; font-weight: 700 !important;
            font-family: 'Fraunces', Georgia, serif !important;
            font-size: 22px !important;
        }
        [data-testid="stExpander"] {
            background: rgba(255, 255, 255, 0.75);
            border: 1px solid #f6c7d4;
            border-radius: 14px;
        }
        [data-testid="stExpander"] summary {
            color: #4a0e2e; font-weight: 600;
        }
        [data-testid="stDataFrame"] {
            border-radius: 12px; overflow: hidden;
            border: 1px solid #f6c7d4;
        }
        .kpi {
            background: linear-gradient(135deg, #ffffff 0%, #fff3f6 100%);
            border: 1px solid #fadbe5;
            border-radius: 16px;
            padding: 16px 18px;
            box-shadow: 0 6px 20px -14px rgba(173, 20, 87, 0.28);
        }
        .kpi .k { font-size: 10px; text-transform: uppercase;
                  letter-spacing: 1px; color: #9b3b6b; font-weight: 700; }
        .kpi .v { font-family: 'Fraunces', Georgia, serif;
                  font-size: 30px; font-weight: 700; color: #2d1020;
                  line-height: 1.05; margin-top: 6px; }
        .pill {
            display: inline-block; padding: 3px 10px;
            border-radius: 999px; font-size: 11px;
            font-weight: 600; letter-spacing: 0.4px;
            background: #fce4ec; color: #ad1457;
        }
        .tier-chip {
            display: inline-block; padding: 4px 12px;
            border-radius: 999px; font-size: 12px;
            font-weight: 700; letter-spacing: 0.3px; color: #fff;
        }
        .rule { border: none; border-top: 1px solid #f6c7d4;
                margin: 22px 0 14px 0; }
        .muted { font-size: 12px; color: #8a3b5e; }
        .brgy-head {
            display: flex; justify-content: space-between;
            align-items: center; gap: 10px; margin-bottom: 4px;
        }
        .brgy-head h2 { margin: 0 !important; font-size: 26px !important; }
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
    dominant = brgy_df["predicted_class"].value_counts().idxmax()

    cards = [
        ("Barangays", f"{len(brgy_df)}"),
        ("Families", f"{families:,}"),
        ("Population", f"{pop:,}"),
        ("₱ / person", f"{income:,.0f}"),
        ("Dominant tier", dominant),
    ]
    cols = st.columns(5)
    for col, (k, v) in zip(cols, cards):
        with col:
            st.markdown(
                f"<div class='kpi'><div class='k'>{k}</div>"
                f"<div class='v'>{v}</div></div>",
                unsafe_allow_html=True,
            )


def render_indicators(row):
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("₱ / person",
              f"{row['avg_per_capita_income']:,.0f}"
              if pd.notna(row['avg_per_capita_income']) else "—")
    c2.metric("Family size", f"{row['avg_family_size']:.1f}")
    c3.metric("Children", f"{row['avg_dependents']:.1f}")
    c4.metric("In school", f"{row['avg_children_in_school']:.1f}")

    c5, c6, c7, c8 = st.columns(4)
    c5.metric("Population", f"{row['pop_2024']:,.0f}")
    c6.metric("Growth ’20–’24", f"{row['pop_growth_2020_2024']:+.1f}%")
    c7.metric("4Ps / 1k",
              f"{row['four_ps_per_1k_pop']:.1f}"
              if pd.notna(row['four_ps_per_1k_pop']) else "—")
    c8.metric("% active", f"{row['active_4ps_share']:.0f}%")


def render_class_distribution(row):
    surveyed = row["families_surveyed"]
    df = pd.DataFrame({
        "Tier": CLASS_ORDER * 2,
        "Source": ["Model"] * 3 + ["Survey"] * 3,
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
        df, x="Tier", y="Share (%)", color="Tier",
        facet_col="Source", category_orders={"Tier": CLASS_ORDER},
        color_discrete_map=CLASS_COLORS,
    )
    fig.update_layout(
        height=260,
        margin={"l": 10, "r": 10, "t": 30, "b": 10},
        showlegend=False,
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        font={"family": "Inter, sans-serif", "color": "#4a0e2e"},
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

    fig = scatter(
        plot_df,
        lat="lat", lon="lon",
        color="predicted_class",
        color_discrete_map=CLASS_COLORS,
        category_orders={"predicted_class": CLASS_ORDER},
        hover_name="barangay",
        hover_data={
            "predicted_class": True,
            "avg_per_capita_income": ":,.0f",
            "four_ps_recipients_latest": ":,.0f",
            "pop_2024": ":,.0f",
            "families_surveyed": ":,d",
            "lat": False, "lon": False,
        },
        custom_data=["barangay"],
        labels={
            "predicted_class": "Predicted tier",
            "avg_per_capita_income": "Monthly per-capita income (₱)",
            "four_ps_recipients_latest": "4Ps Recipients (latest SY)",
            "pop_2024": "Population (2024)",
            "families_surveyed": "Families surveyed",
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
        legend_title_text="Tier",
        legend={
            "bgcolor": "rgba(255,255,255,0.95)",
            "bordercolor": "#fadbe5",
            "borderwidth": 1,
            "x": 0.01, "y": 0.99,
            "xanchor": "left", "yanchor": "top",
            "font": {"size": 12, "color": "#4a0e2e"},
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
            f"<div style='margin:8px 0;'>"
            f"<div style='display:flex;justify-content:space-between;font-size:13px;'>"
            f"<span style='color:#4a0e2e;font-weight:600;'>{lbl}</span>"
            f"<span class='muted'>{share:.0f}% of impact</span></div>"
            f"<div style='background:#fce4ec;border-radius:6px;height:8px;overflow:hidden;margin-top:3px;'>"
            f"<div style='background:#ad1457;width:{bar_pct:.1f}%;height:100%;'></div>"
            f"</div></div>"
        )
    st.markdown(
        f"<div class='kpi'><div class='k'>What's driving this prediction</div>"
        f"<div class='muted' style='margin-top:4px;line-height:1.5;'>"
        f"These are the factors the model relied on most when classifying "
        f"<strong>{brgy_name}</strong> as <strong>{predicted_class}</strong>. "
        f"Longer bar = bigger influence on the prediction."
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
            f"<div style='margin:6px 0;'>"
            f"<div style='display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;'>"
            f"<span style='color:#4a0e2e;font-weight:600;'>{cls}</span>"
            f"<span class='muted'>{n} · {pct:.0f}%</span>"
            f"</div>"
            f"<div style='background:#fce4ec;border-radius:6px;height:8px;overflow:hidden;'>"
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


def _combine_dim(programs_with_intensity, dim):
    """Weighted-average intensity for a dimension across active programs."""
    total_w = sum(p["weights"][dim] for p in programs_with_intensity) or 1.0
    return sum(p["intensity"] * p["weights"][dim]
               for p in programs_with_intensity) / total_w


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

    PRIORITY_COLOR = {"High": "#c62828", "Medium": "#ad1457", "Low": "#9b3b6b"}

    program_cards = []
    for p in brief.get("programs", []):
        prio = p.get("priority", "Medium")
        pc = PRIORITY_COLOR.get(prio, "#9b3b6b")
        program_cards.append(
            f"<div style='border-left:4px solid {pc};padding:10px 14px;margin:8px 0;"
            f"background:rgba(255,255,255,0.85);border-radius:8px;"
            f"box-shadow:0 2px 8px -6px rgba(173,20,87,0.2);'>"
            f"<div style='display:flex;justify-content:space-between;align-items:baseline;'>"
            f"<span style='font-weight:700;font-size:13px;color:#2d1020;'>{p.get('name','')}</span>"
            f"<span style='font-size:10px;text-transform:uppercase;letter-spacing:0.5px;"
            f"font-weight:700;color:{pc};'>{prio}</span></div>"
            f"<div style='font-size:11px;color:#9b3b6b;margin-top:2px;'>"
            f"Lead agency · {p.get('agency','')}</div>"
            f"<div style='font-size:13px;color:#3a1a2a;margin-top:6px;line-height:1.5;'>"
            f"{p.get('rationale','')}</div></div>"
        )

    suggestion = brief.get("slider_suggestion", {}) or {}
    sug_html = ""
    if suggestion:
        sug_html = (
            f"<div style='margin-top:14px;padding:10px 12px;background:rgba(252,228,236,0.6);"
            f"border-radius:8px;font-size:12px;'>"
            f"<div style='font-weight:700;color:#4a0e2e;margin-bottom:4px;'>"
            f"Suggested intervention intensities</div>"
            f"<div style='color:#2d1020;'>"
            f"<strong>Financial</strong> {suggestion.get('financial','-')}% &nbsp;·&nbsp; "
            f"<strong>Education</strong> {suggestion.get('education','-')}% &nbsp;·&nbsp; "
            f"<strong>Livelihood</strong> {suggestion.get('livelihood','-')}%"
            f"</div>"
            f"<div class='muted' style='margin-top:4px;'>"
            f"{suggestion.get('reasoning','')}</div></div>"
        )

    st.markdown(
        f"<div class='kpi'>"
        f"<div style='font-size:14px;color:#2d1020;line-height:1.5;'>"
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
            f"<div class='muted' style='font-size:14px;color:#2d1020;line-height:1.55;"
            f"margin-bottom:14px;'>{brief.get('summary','')}</div>",
            unsafe_allow_html=True,
        )

    PRIORITY_COLOR = {"High": "#c62828", "Medium": "#ad1457", "Low": "#9b3b6b"}
    DIM_LABEL = {"financial": "Financial", "education": "Education",
                 "livelihood": "Livelihood"}
    DIM_COLOR = {"financial": "#e91e63", "education": "#6a1b4d",
                 "livelihood": "#ad1457"}

    suggestion = (brief or {}).get("slider_suggestion") or {}
    sug_fin = int(suggestion.get("financial", 50))
    sug_edu = int(suggestion.get("education", 50))
    sug_liv = int(suggestion.get("livelihood", 50))

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

    for i, p in enumerate(programs):
        p["weights"] = _program_weights(p.get("name", ""), p.get("agency", ""))
        p["dominant"] = _dominant_dim(p["weights"])
        ai_default = {"financial": sug_fin, "education": sug_edu,
                      "livelihood": sug_liv}[p["dominant"]]
        key = f"prog_int_{brgy_name}_{i}"
        if key not in st.session_state:
            st.session_state[key] = ai_default
        p["_key"] = key

    preset_col1, preset_col2, preset_col3 = st.columns(3)
    if preset_col1.button("No action  ·  0%", use_container_width=True,
                           key=f"preset_none_{brgy_name}"):
        for p in programs:
            st.session_state[p["_key"]] = 0
        st.rerun()
    if preset_col2.button("★ AI-recommended plan", use_container_width=True,
                           key=f"preset_ai_{brgy_name}"):
        for p in programs:
            st.session_state[p["_key"]] = {"financial": sug_fin,
                                            "education": sug_edu,
                                            "livelihood": sug_liv}[p["dominant"]]
        st.rerun()
    if preset_col3.button("Aggressive  ·  90%", use_container_width=True,
                           key=f"preset_agg_{brgy_name}"):
        for p in programs:
            st.session_state[p["_key"]] = 90
        st.rerun()

    st.markdown("<div style='height:10px;'></div>", unsafe_allow_html=True)
    st.markdown(
        "<div class='muted' style='font-size:12px;margin-bottom:4px;'>"
        "Each program is a dial. Move it to set how aggressively that specific "
        "program is implemented over the chosen horizon."
        "</div>",
        unsafe_allow_html=True,
    )

    program_rows = [programs[i:i+2] for i in range(0, len(programs), 2)]
    for row in program_rows:
        cols = st.columns(len(row))
        for col, p in zip(cols, row):
            with col:
                prio = p.get("priority", "Medium")
                pc = PRIORITY_COLOR.get(prio, "#9b3b6b")
                dom = p["dominant"]
                dim_chip = (
                    f"<span style='background:{DIM_COLOR[dom]};color:#fff;"
                    f"font-size:10px;font-weight:700;padding:2px 8px;"
                    f"border-radius:999px;text-transform:uppercase;"
                    f"letter-spacing:0.4px;'>{DIM_LABEL[dom]}</span>"
                )
                st.markdown(
                    f"<div style='background:rgba(255,255,255,0.85);"
                    f"border-left:4px solid {pc};border-radius:10px;"
                    f"padding:12px 14px;margin-bottom:8px;"
                    f"box-shadow:0 2px 10px -6px rgba(173,20,87,0.2);'>"
                    f"<div style='display:flex;justify-content:space-between;"
                    f"align-items:baseline;margin-bottom:4px;'>"
                    f"<span style='font-size:10px;font-weight:700;"
                    f"text-transform:uppercase;letter-spacing:0.5px;color:{pc};'>"
                    f"{prio}</span>"
                    f"{dim_chip}</div>"
                    f"<div style='font-weight:700;font-size:13px;color:#2d1020;"
                    f"line-height:1.3;'>{p.get('name','')}</div>"
                    f"<div style='font-size:11px;color:#9b3b6b;margin-top:2px;'>"
                    f"Lead agency · {p.get('agency','')}</div>"
                    f"<div style='font-size:12px;color:#3a1a2a;margin-top:6px;"
                    f"line-height:1.5;'>{p.get('rationale','')}</div></div>",
                    unsafe_allow_html=True,
                )
                st.slider(
                    "Implementation level",
                    0, 100, key=p["_key"],
                    label_visibility="collapsed",
                )

    years_col, info_col = st.columns([0.5, 2])
    years = years_col.select_slider("Horizon (years)", options=[3, 4, 5], value=5)

    active = [
        {"intensity": st.session_state[p["_key"]], "weights": p["weights"],
         "name": p.get("name", "")}
        for p in programs
    ]
    fin = _combine_dim(active, "financial")
    edu = _combine_dim(active, "education")
    liv = _combine_dim(active, "livelihood")

    info_col.markdown(
        f"<div style='padding:10px 12px;background:rgba(252,228,236,0.55);"
        f"border-radius:8px;font-size:12px;line-height:1.6;'>"
        f"<strong style='color:#4a0e2e;'>Combined effect on the simulator</strong> "
        f"&nbsp;<span class='muted'>(weighted avg of program dials × dimension weights)</span><br>"
        f"<span style='color:{DIM_COLOR['financial']};font-weight:700;'>Financial {fin:.0f}%</span>"
        f" &nbsp;·&nbsp; "
        f"<span style='color:{DIM_COLOR['education']};font-weight:700;'>Education {edu:.0f}%</span>"
        f" &nbsp;·&nbsp; "
        f"<span style='color:{DIM_COLOR['livelihood']};font-weight:700;'>Livelihood {liv:.0f}%</span>"
        f"</div>",
        unsafe_allow_html=True,
    )

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
        verdict, vcolor = "▲ Improved", "#1b8b4e"
    elif delta < 0:
        verdict, vcolor = "▼ Worsened", "#c62828"
    else:
        verdict, vcolor = "→ Unchanged", "#9b3b6b"

    def conf_line(c):
        if c is None:
            return ""
        return (f"<div class='muted' style='font-size:12px;margin-top:6px;'>"
                f"Model is sure about <strong>{c['confident_pct']:.0f}%</strong> of "
                f"families · the rest are borderline between two tiers.</div>")

    st.markdown("<div style='height:14px;'></div>", unsafe_allow_html=True)
    col_now, col_fut = st.columns(2)
    with col_now:
        st.markdown(
            f"<div class='kpi'><div class='k'>Now</div>"
            f"<div style='margin-top:8px;'>"
            f"<span class='tier-chip' style='background:{CLASS_COLORS[now_dom]};'>{now_dom}</span>"
            f"<span class='muted' style='margin-left:8px;'>{len(brgy_families)} families</span>"
            f"</div>{conf_line(now_conf)}"
            f"<div style='margin-top:14px;'>{_tier_breakdown(now_tiers)}</div></div>",
            unsafe_allow_html=True,
        )
    with col_fut:
        st.markdown(
            f"<div class='kpi'>"
            f"<div style='display:flex;justify-content:space-between;align-items:baseline;'>"
            f"<div class='k'>After {years} years</div>"
            f"<div style='color:{vcolor};font-weight:700;font-size:12px;'>{verdict}</div></div>"
            f"<div style='margin-top:8px;'>"
            f"<span class='tier-chip' style='background:{CLASS_COLORS[fut_dom]};'>{fut_dom}</span>"
            f"<span class='muted' style='margin-left:8px;'>projected dominant tier</span>"
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
                badges.append(f"<span style='color:#1b8b4e;font-weight:600;'>↑ {m['moved_up']} moved up</span>")
            if m["stayed"] > 0:
                badges.append(f"<span class='muted'>= {m['stayed']} stayed</span>")
            if m["moved_down"] > 0:
                badges.append(f"<span style='color:#c62828;font-weight:600;'>↓ {m['moved_down']} moved down</span>")
            move_rows.append(
                f"<div style='display:flex;justify-content:space-between;align-items:center;"
                f"padding:9px 0;border-bottom:1px solid #fce4ec;font-size:13px;'>"
                f"<span><span class='tier-chip' style='background:{CLASS_COLORS[m['from']]};"
                f"font-size:11px;padding:2px 8px;'>Started {m['from']}</span> "
                f"<span class='muted'>· {m['n']} families</span></span>"
                f"<span>{'  ·  '.join(badges)}</span></div>"
            )
        st.markdown(
            f"<div class='kpi'><div class='k'>Where families moved</div>"
            f"<div class='muted' style='margin-top:4px;'>"
            f"How each starting tier shifts under the chosen program mix.</div>"
            f"<div style='margin-top:10px;'>{''.join(move_rows)}</div></div>",
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
            f"padding:9px 0;border-bottom:1px solid #fce4ec;font-size:13px;'>"
            f"<span style='color:#4a0e2e;font-weight:600;'>{c['label']}</span>"
            f"<span>"
            f"<span class='muted'>{c['fmt'].format(n)}</span>"
            f"<span style='margin:0 10px;color:#9b3b6b;font-weight:700;'>{arrow}</span>"
            f"<span style='color:#2d1020;font-weight:600;'>{c['fmt'].format(f)}</span>"
            f"</span></div>"
        )
    st.markdown(
        f"<div class='kpi'><div class='k'>Key indicator changes</div>"
        f"<div class='muted' style='margin-top:4px;'>"
        f"Average values before and after the {years}-year projection.</div>"
        f"<div style='margin-top:10px;'>{''.join(change_rows)}</div></div>",
        unsafe_allow_html=True,
    )


def render_whatif(brgy_name, families_df, model_pipeline, features, conformal=None):
    if "fin_val" not in st.session_state:
        st.session_state.fin_val = 0
        st.session_state.edu_val = 0
        st.session_state.liv_val = 0

    st.markdown(
        "<p class='muted'>Pick a preset or set custom intensities. The classifier "
        "re-scores every family in this barangay against the projected feature values.</p>",
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
    fin = c1.slider("Financial Support", 0, 100, key="fin_val",
                    help="4Ps + SLP + AICS. Cash transfers and livelihood grants. Graduates households out of 4Ps.")
    edu = c2.slider("Education Assistance", 0, 100, key="edu_val",
                    help="Scholarships, ALS, 4Ps schooling conditionality. Closes the school-attendance gap.")
    liv = c3.slider("Family & Livelihood", 0, 100, key="liv_val",
                    help="RPFP, microenterprise, employment tracks. Smaller dependent loads, more graduations.")
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
        verdict, vcolor = "▲ Improved", "#1b8b4e"
    elif delta < 0:
        verdict, vcolor = "▼ Worsened", "#c62828"
    else:
        verdict, vcolor = "→ Unchanged", "#9b3b6b"

    def conf_line(c):
        if c is None:
            return ""
        return (f"<div class='muted' style='font-size:12px;margin-top:6px;'>"
                f"Model is sure about <strong>{c['confident_pct']:.0f}%</strong> of "
                f"families · the rest are borderline between two tiers."
                f"</div>")

    st.markdown("<div style='height:12px;'></div>", unsafe_allow_html=True)
    col_now, col_fut = st.columns(2)
    with col_now:
        st.markdown(
            f"<div class='kpi'>"
            f"<div class='k'>Now</div>"
            f"<div style='margin-top:8px;'>"
            f"<span class='tier-chip' style='background:{CLASS_COLORS[now_dom]};'>{now_dom}</span>"
            f"<span class='muted' style='margin-left:8px;'>{len(brgy_families)} families</span>"
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
            f"<div style='color:{vcolor};font-weight:700;font-size:12px;'>{verdict}</div>"
            f"</div>"
            f"<div style='margin-top:8px;'>"
            f"<span class='tier-chip' style='background:{CLASS_COLORS[fut_dom]};'>{fut_dom}</span>"
            f"<span class='muted' style='margin-left:8px;'>projected dominant tier</span>"
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
                    f"<span style='color:#1b8b4e;font-weight:600;'>↑ {m['moved_up']} moved up</span>"
                )
            if m["stayed"] > 0:
                badges.append(
                    f"<span class='muted'>= {m['stayed']} stayed</span>"
                )
            if m["moved_down"] > 0:
                badges.append(
                    f"<span style='color:#c62828;font-weight:600;'>↓ {m['moved_down']} moved down</span>"
                )
            move_rows.append(
                f"<div style='display:flex;justify-content:space-between;align-items:center;"
                f"padding:9px 0;border-bottom:1px solid #fce4ec;font-size:13px;'>"
                f"<span><span class='tier-chip' style='background:{CLASS_COLORS[m['from']]};"
                f"font-size:11px;padding:2px 8px;'>Started {m['from']}</span> "
                f"<span class='muted'>· {m['n']} families</span></span>"
                f"<span>{'  ·  '.join(badges)}</span>"
                f"</div>"
            )
        st.markdown(
            f"<div class='kpi'><div class='k'>Where families moved</div>"
            f"<div class='muted' style='margin-top:4px;'>"
            f"How each starting tier shifts under the chosen intervention.</div>"
            f"<div style='margin-top:10px;'>{''.join(move_rows)}</div></div>",
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
            f"padding:9px 0;border-bottom:1px solid #fce4ec;font-size:13px;'>"
            f"<span style='color:#4a0e2e;font-weight:600;'>{c['label']}</span>"
            f"<span>"
            f"<span class='muted'>{c['fmt'].format(n)}</span>"
            f"<span style='margin:0 10px;color:#9b3b6b;font-weight:700;'>{arrow}</span>"
            f"<span style='color:#2d1020;font-weight:600;'>{c['fmt'].format(f)}</span>"
            f"</span></div>"
        )
    st.markdown(
        f"<div class='kpi'><div class='k'>Key indicator changes</div>"
        f"<div class='muted' style='margin-top:4px;'>"
        f"Average values before and after the {years}-year projection.</div>"
        f"<div style='margin-top:10px;'>{''.join(change_rows)}</div></div>",
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
    st.markdown(f"<span class='muted'>Model · {model_name}</span>", unsafe_allow_html=True)
    if conformal_emp is not None:
        st.markdown(
            f"<span class='muted'>Conformal · {conformal_emp:.0%} empirical "
            f"coverage (target {conformal_target:.0%})</span>",
            unsafe_allow_html=True,
        )
    selector = st.selectbox(
        "Barangay",
        options=["(none)"] + list(brgy["barangay"]),
        index=0,
    )
    st.markdown("<hr class='rule'>", unsafe_allow_html=True)
    st.markdown("**Tiers**")
    for c in CLASS_ORDER:
        st.markdown(
            f"<div style='margin:4px 0;'>"
            f"<span class='tier-chip' style='background:{CLASS_COLORS[c]};'>{c}</span> "
            f"<span class='muted'>{CLASS_TIER[c]} · Lv {CLASS_ORDER.index(c)+1}</span>"
            f"</div>",
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
        st.markdown(
            f"<div class='brgy-head'>"
            f"<h2>{selected}</h2>"
            f"<span class='tier-chip' style='background:{CLASS_COLORS[cls]};'>{cls}</span>"
            f"</div>"
            f"<div class='muted'>{int(row['families_surveyed'])} families surveyed</div>",
            unsafe_allow_html=True,
        )
        st.markdown("<div style='height:10px;'></div>", unsafe_allow_html=True)
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

