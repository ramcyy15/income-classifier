"""
Streamlit dashboard — QC 5th District (Novaliches) Income-Level Classifier.

Run:
    streamlit run app.py

Inputs (produced by `python build_model.py`):
    outputs/merged_dataset.csv     barangay-level table
    outputs/family_predictions.csv family-level predictions
    models/best_model.joblib       trained classifier + feature spec
"""

import json
from pathlib import Path

import joblib
import pandas as pd
import plotly.express as px
import streamlit as st

BASE = Path(__file__).parent
OUT = BASE / "outputs"
MODEL_PATH = BASE / "models" / "best_model.joblib"
BRGY_PATH = OUT / "merged_dataset.csv"
GEOJSON_PATH = BASE / "data" / "geo" / "qc5_barangays.geojson"

CLASS_COLORS = {"Low": "#c8d0dc", "Middle": "#627799", "High": "#1d3867"}
CLASS_ORDER = ["Low", "Middle", "High"]
CLASS_TIER = {
    "Low": "Survival",          # SWDI Level 1 — extreme poor
    "Middle": "Subsistence",    # SWDI Level 2 — getting by
    "High": "Self-sufficient",  # SWDI Level 3 — above poverty line
}
PRIORITY_COLORS = {"High": "#ffa0c5", "Medium": "#ffb7c5", "Low": "#ffd1d4"}
PRIORITY_LABEL = {"High": "Urgent", "Medium": "Recommended", "Low": "Optional"}


@st.cache_data
def load_brgy():
    return pd.read_csv(BRGY_PATH)


@st.cache_resource
def load_model():
    return joblib.load(MODEL_PATH)


@st.cache_data
def load_geojson():
    with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@st.cache_data
def compute_pins_and_view(_gj):
    """Return (centroids dict, center {lat, lon}, zoom int) for District V."""
    import math

    centroids = {}
    all_lon, all_lat = [], []
    for feat in _gj["features"]:
        coords = []
        geom = feat["geometry"]
        if geom["type"] == "Polygon":
            for ring in geom["coordinates"]:
                coords.extend(ring)
        elif geom["type"] == "MultiPolygon":
            for poly in geom["coordinates"]:
                for ring in poly:
                    coords.extend(ring)
        if not coords:
            continue
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        centroids[feat["id"]] = {
            "lat": sum(lats) / len(lats),
            "lon": sum(lons) / len(lons),
        }
        all_lon.extend(lons)
        all_lat.extend(lats)

    center = {
        "lat": (min(all_lat) + max(all_lat)) / 2,
        "lon": (min(all_lon) + max(all_lon)) / 2,
    }
    lat_range = max(all_lat) - min(all_lat)
    lon_range = (max(all_lon) - min(all_lon)) * math.cos(math.radians(center["lat"]))
    span = max(lat_range, lon_range, 1e-6)
    zoom = math.log2(360.0 / span) - 1.2  # padding so pins aren't on the edge
    zoom = max(1.0, min(18.0, zoom))
    return centroids, center, zoom


# ---------------------------------------------------------------------------
# Aid recommendation — uses only available indicators (no health, no employment).
# ---------------------------------------------------------------------------
def suggest_aid(row, predicted_class):
    avg_inc = row.get("avg_per_capita_income")
    fam_size = row.get("avg_family_size")
    deps = row.get("avg_dependents")
    kids_in_school = row.get("avg_children_in_school")
    active_share = row.get("active_4ps_share")
    pop_growth = row.get("pop_growth_2020_2024")
    fourps_per_1k = row.get("four_ps_per_1k_pop")
    surveyed = max(int(row.get("families_surveyed", 1) or 1), 1)
    pred_low_share = (row.get("pred_low", 0) or 0) / surveyed * 100
    actual_low_share = (row.get("actual_low", 0) or 0) / surveyed * 100

    s = []

    if predicted_class == "Low":
        s += [
            {
                "priority": "High",
                "program": "Pantawid Pamilyang Pilipino Program (4Ps) — expanded enrollment",
                "agency": "DSWD",
                "rationale": (
                    f"Most families here earn around ₱{avg_inc:,.0f} per person each month — "
                    f"the model flags about {pred_low_share:.0f}% as Survival-tier. "
                    "Make sure every eligible family is enrolled in 4Ps cash transfers."
                ),
            },
            {
                "priority": "High",
                "program": "Sustainable Livelihood Program (SLP) — microenterprise & employment tracks",
                "agency": "DSWD",
                "rationale": (
                    "Helps poor families build a small business or find work, so they can "
                    "eventually graduate from 4Ps."
                ),
            },
            {
                "priority": "High",
                "program": "KALAHI-CIDSS — community block grants",
                "agency": "DSWD",
                "rationale": (
                    "Funds small infrastructure (water, roads, classrooms) chosen by the "
                    "community itself — usually the missing basics in low-income areas."
                ),
            },
            {
                "priority": "Medium",
                "program": "AICS — Assistance to Individuals in Crisis Situation",
                "agency": "DSWD",
                "rationale": (
                    "Emergency cash, medical and burial support for families who hit a "
                    "sudden crisis."
                ),
            },
        ]
    elif predicted_class == "Middle":
        s += [
            {
                "priority": "Medium",
                "program": "DTI Negosyo Center + SB Corp microfinance",
                "agency": "DTI",
                "rationale": (
                    f"Income is around ₱{avg_inc:,.0f} per person each month — close to the "
                    "poverty line. Small-business support tends to lift these families faster "
                    "than direct cash subsidies."
                ),
            },
            {
                "priority": "Medium",
                "program": "DOLE Kabuhayan Program (DILP)",
                "agency": "DOLE",
                "rationale": (
                    "Starter kits and self-employment grants for informal workers who are "
                    "earning a little above poverty level."
                ),
            },
        ]
    else:
        s += [
            {
                "priority": "Low",
                "program": "4Ps graduation monitoring + Listahanan re-check",
                "agency": "DSWD",
                "rationale": (
                    "Most surveyed families are Self-sufficient (Level 3). Confirm that "
                    "graduated 4Ps families really are out of poverty for good."
                ),
            },
            {
                "priority": "Low",
                "program": "DTI Shared Service Facilities + Negosyo Center scale-up",
                "agency": "DTI",
                "rationale": (
                    "Focus on productivity and growth so families that graduated from 4Ps "
                    "keep moving forward instead of slipping back."
                ),
            },
        ]

    if pd.notna(active_share) and active_share >= 85:
        s.append({
            "priority": "High",
            "program": "Stronger 4Ps Family Development Sessions + case review",
            "agency": "DSWD",
            "rationale": (
                f"{active_share:.0f}% of 4Ps families here are still Active — very few are "
                "graduating out of the program. That hints at long-term poverty, so keep "
                "attendance high in family sessions and review each case for next steps."
            ),
        })
    if pd.notna(active_share) and active_share <= 75:
        s.append({
            "priority": "Medium",
            "program": "SLP — Graduation Support Track",
            "agency": "DSWD",
            "rationale": (
                f"Only {active_share:.0f}% of 4Ps families are still Active — many have "
                "graduated or been delisted. Keep supporting their livelihoods so they "
                "don't slip back into poverty."
            ),
        })

    if pd.notna(fourps_per_1k) and fourps_per_1k >= 10:
        s.append({
            "priority": "High",
            "program": "DepEd School Feeding + Balik-Eskwela re-enrollment drive",
            "agency": "DepEd",
            "rationale": (
                f"This barangay has {fourps_per_1k:.1f} 4Ps members per 1,000 residents — "
                "very high. Many learners depend on cash transfers; feeding and "
                "re-enrollment programs help them stay in school."
            ),
        })
    if pd.notna(fourps_per_1k) and fourps_per_1k < 2:
        s.append({
            "priority": "Medium",
            "program": "Listahanan re-survey + 4Ps coverage audit",
            "agency": "DSWD",
            "rationale": (
                f"Only {fourps_per_1k:.1f} 4Ps members per 1,000 residents — unusually low. "
                "Some eligible poor families may be missing from the program. A fresh "
                "Listahanan canvass can confirm coverage."
            ),
        })

    if pd.notna(deps) and deps >= 2.8:
        s.append({
            "priority": "High",
            "program": "POPCOM Responsible Parenthood + DSWD Supplementary Feeding",
            "agency": "POPCOM + DSWD",
            "rationale": (
                f"Families here have about {deps:.1f} children under 18 on average. "
                "Family planning and under-5 feeding ease the load on parents."
            ),
        })

    if pd.notna(kids_in_school) and pd.notna(deps) and deps > 0:
        gap = deps - kids_in_school
        if gap >= 0.6:
            s.append({
                "priority": "High",
                "program": "Alternative Learning System (ALS) + 4Ps schooling check",
                "agency": "DepEd + DSWD",
                "rationale": (
                    f"On average, families have {deps:.1f} children but only {kids_in_school:.1f} "
                    f"are in school — about {gap:.1f} per family are out of school. "
                    "Tighten 4Ps schooling rules and reach out-of-school youth through ALS."
                ),
            })

    if pd.notna(fam_size) and fam_size >= 5.5:
        s.append({
            "priority": "Medium",
            "program": "DSWD Social Pension for Indigent Seniors",
            "agency": "DSWD",
            "rationale": (
                f"Average family has {fam_size:.1f} members — likely multi-generational. "
                "Senior pensions directly reduce the household's monthly burden."
            ),
        })

    if pd.notna(pop_growth) and pop_growth >= 4.0:
        s.append({
            "priority": "Medium",
            "program": "NHA socialized housing + DPWH local infrastructure",
            "agency": "NHA + DPWH + LGU",
            "rationale": (
                f"Population grew by {pop_growth:+.1f}% from 2020 to 2024 — fast. "
                "Plan ahead for housing, water, roads and classrooms before informal "
                "settlements form."
            ),
        })
    if pd.notna(pop_growth) and pop_growth < 1.0:
        s.append({
            "priority": "Low",
            "program": "LGU Land Use Plan (CLUP) review",
            "agency": "LGU + DHSUD",
            "rationale": (
                f"Population grew only {pop_growth:+.1f}% from 2020 to 2024. "
                "Demand is stable — focus on maintaining what's already there."
            ),
        })

    if pd.notna(actual_low_share) and actual_low_share >= 30:
        s.append({
            "priority": "High",
            "program": "AICS — Educational & Medical Assistance outreach",
            "agency": "DSWD",
            "rationale": (
                f"About {actual_low_share:.0f}% of surveyed families are in the Survival "
                "tier (extreme poor). Set up AICS desks for school-opening fees and "
                "medical emergencies."
            ),
        })

    order = {"High": 0, "Medium": 1, "Low": 2}
    s.sort(key=lambda x: order[x["priority"]])
    return s


# ---------------------------------------------------------------------------
# UI helpers
# ---------------------------------------------------------------------------
def inject_styles():
    st.markdown(
        """
        <style>
        :root {
            --bg0: #ffffff;
            --bg1: #f6f7fb;
            --card: rgba(255,255,255,0.85);
            --border: rgba(15, 23, 42, 0.10);
            --shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
            --text: #0f172a;
            --muted: #64748b;
            --accent: #ad1457;
            --accent2: #7c3aed;
        }

        html, body, [data-testid="stAppViewContainer"] {
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
            color: var(--text);
        }

        [data-testid="stAppViewContainer"] {
            background: radial-gradient(1200px 600px at 30% 0%, rgba(173, 20, 87, 0.08), transparent 60%),
                        radial-gradient(900px 500px at 80% 10%, rgba(124, 58, 237, 0.08), transparent 55%),
                        linear-gradient(180deg, var(--bg1) 0%, var(--bg0) 42%, var(--bg0) 100%);
        }

        [data-testid="stHeader"] { background: rgba(255,255,255,0); }

        section.main > div {
            max-width: 1140px;
            padding-top: 18px;
        }

        [data-testid="stSidebar"] {
            background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.82) 100%);
            border-right: 1px solid var(--border);
            backdrop-filter: blur(10px);
        }

        h1 {
            color: var(--text) !important;
            font-weight: 750;
            letter-spacing: -0.02em;
        }
        h2, h3, h4 {
            color: var(--text) !important;
            font-weight: 650;
            letter-spacing: -0.01em;
        }

        [data-testid="stMetric"] {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 14px 14px;
            box-shadow: var(--shadow);
        }
        [data-testid="stMetric"]:hover {
            border-color: rgba(173, 20, 87, 0.28);
            transform: translateY(-1px);
            transition: transform 120ms ease, border-color 120ms ease;
        }
        [data-testid="stMetricLabel"] p {
            color: var(--muted) !important;
            font-weight: 650;
            letter-spacing: 0.01em;
        }
        [data-testid="stMetricValue"] {
            color: var(--text) !important;
            font-weight: 800;
        }

        [data-testid="stTooltipIcon"] {
            color: rgba(100, 116, 139, 0.9) !important;
        }

        [data-testid="stExpander"] {
            background: rgba(255, 255, 255, 0.88);
            border: 1px solid var(--border);
            border-radius: 14px;
            box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
        }

        [data-testid="stExpander"] details > summary {
            font-weight: 650;
            color: var(--text);
        }

        .helper-text { font-size: 13px; color: var(--muted); margin-top: -6px; }

        .aid-card {
            border-left-width: 5px;
            border-left-style: solid;
            padding: 12px 14px;
            margin-bottom: 10px;
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid var(--border);
            border-radius: 14px;
            box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
            color: var(--text);
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def helper(text):
    st.markdown(f"<p class='helper-text'>{text}</p>", unsafe_allow_html=True)


def class_pill(cls):
    return (
        f"<span style='color:{CLASS_COLORS[cls]};font-weight:bold'>{cls}</span> "
        f"<span style='color:#9a6a7c;font-size:13px;'>· {CLASS_TIER[cls]}</span>"
    )


def render_class_legend():
    for c in CLASS_ORDER:
        st.markdown(
            f"<span style='color:{CLASS_COLORS[c]};font-size:18px'>●</span> "
            f"<b>{c}</b> — {CLASS_TIER[c]} "
            f"<span style='color:#9a6a7c;font-size:12px;'>(SWDI Level {CLASS_ORDER.index(c)+1})</span>",
            unsafe_allow_html=True,
        )


def render_aid_card(s):
    badge = PRIORITY_COLORS[s["priority"]]
    badge_label = PRIORITY_LABEL[s["priority"]]
    st.markdown(
        f"""
        <div class="aid-card" style="border-left-color:{badge};">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="color:{badge};font-weight:bold;font-size:13px;">
                    {badge_label}
                </span>
                <span style="color:#AD1457;font-size:12px;">
                    Lead agency: {s['agency']}
                </span>
            </div>
            <div style="margin-top:4px;font-weight:600;">{s['program']}</div>
            <div style="margin-top:4px;font-size:13px;">{s['rationale']}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_indicators(row):
    st.markdown("#### Quick stats")
    c1, c2 = st.columns(2)
    with c1:
        st.metric("Income per person (₱ / month)",
                  f"{row['avg_per_capita_income']:,.0f}"
                  if pd.notna(row['avg_per_capita_income']) else "—",
                  help="Average monthly income per family member, from SWDI records.")
        st.metric("Family size (avg)", f"{row['avg_family_size']:.1f}",
                  help="Average number of people per surveyed family.")
        st.metric("Children per family (under 18)", f"{row['avg_dependents']:.1f}",
                  help="Average dependents aged 0–18 per family.")
        st.metric("Children in school (avg)", f"{row['avg_children_in_school']:.1f}",
                  help="Average children currently attending school per family.")
    with c2:
        st.metric("Population (2024)", f"{row['pop_2024']:,.0f}",
                  help="Census-based barangay population in 2024.")
        st.metric("Population growth (2020 → 2024)",
                  f"{row['pop_growth_2020_2024']:+.1f}%",
                  help="Change in population between the 2020 and 2024 censuses.")
        st.metric("4Ps members per 1,000 residents",
                  f"{row['four_ps_per_1k_pop']:.1f}"
                  if pd.notna(row['four_ps_per_1k_pop']) else "—",
                  help="How many people in the barangay are 4Ps cash-transfer recipients, per 1,000 residents.")
        st.metric("Still active in 4Ps", f"{row['active_4ps_share']:.0f}%",
                  help="Share of surveyed 4Ps families still classified Active "
                       "(not yet Graduated, Delisted, or Inactive).")


def render_class_distribution(row):
    st.markdown("#### Model prediction vs actual survey")
    helper(
        "Side-by-side share of families in each tier. "
        "Left = what the model predicted. Right = what the SWDI survey recorded."
    )
    surveyed = row["families_surveyed"]
    df = pd.DataFrame({
        "Income tier": CLASS_ORDER * 2,
        "Source": ["Model prediction"] * 3 + ["Actual (survey)"] * 3,
        "Share of families (%)": [
            row["pred_low"] / surveyed * 100,
            row["pred_middle"] / surveyed * 100,
            row["pred_high"] / surveyed * 100,
            row["actual_low"] / surveyed * 100,
            row["actual_middle"] / surveyed * 100,
            row["actual_high"] / surveyed * 100,
        ],
    })
    fig = px.bar(
        df, x="Income tier", y="Share of families (%)", color="Income tier",
        facet_col="Source", category_orders={"Income tier": CLASS_ORDER},
        color_discrete_map=CLASS_COLORS,
    )
    fig.update_layout(height=300, margin={"l": 10, "r": 10, "t": 30, "b": 10},
                      showlegend=False)
    st.plotly_chart(fig, width="stretch", config={"displayModeBar": False})


def render_district_map(brgy, *, height=600, key="brgy_map"):
    st.subheader("Barangays in District V")
    helper(
        "Each pin is one barangay. Pin color shows the income tier the model "
        "predicts for most of its families. Click a pin to see its details."
    )
    if not GEOJSON_PATH.exists():
        st.info(
            f"GeoJSON not found at `{GEOJSON_PATH}`. "
            "Run `python build_regions_geojson.py` to fetch barangay polygons "
            "from OpenStreetMap, then refresh this page."
        )
        return None

    gj = load_geojson()
    centroids, center, zoom = compute_pins_and_view(gj)

    plot_df = brgy.copy()
    plot_df["pred_low_share"] = plot_df["pred_low"] / plot_df["families_surveyed"] * 100
    plot_df["lat"] = plot_df["barangay"].map(lambda b: centroids.get(b, {}).get("lat"))
    plot_df["lon"] = plot_df["barangay"].map(lambda b: centroids.get(b, {}).get("lon"))
    plot_df = plot_df.dropna(subset=["lat", "lon"])

    use_new_api = hasattr(px, "scatter_map")
    scatter = px.scatter_map if use_new_api else px.scatter_mapbox
    style_kw = "map_style" if use_new_api else "mapbox_style"

    fig = scatter(
        plot_df,
        lat="lat",
        lon="lon",
        color="predicted_class",
        color_discrete_map=CLASS_COLORS,
        category_orders={"predicted_class": CLASS_ORDER},
        hover_name="barangay",
        hover_data={
            "predicted_class": True,
            "pred_low_share": ":.1f",
            "avg_per_capita_income": ":,.0f",
            "avg_family_size": ":.1f",
            "avg_dependents": ":.1f",
            "avg_children_in_school": ":.1f",
            "pop_2024": ":,.0f",
            "pop_growth_2020_2024": ":+.1f",
            "four_ps_per_1k_pop": ":.1f",
            "active_4ps_share": ":.0f",
            "lat": False,
            "lon": False,
        },
        custom_data=["barangay"],
        labels={
            "predicted_class": "Income tier",
            "pred_low_share": "% predicted Low",
            "avg_per_capita_income": "Income/person (₱/mo)",
            "avg_family_size": "Family size",
            "avg_dependents": "Children/family",
            "avg_children_in_school": "Kids in school",
            "pop_2024": "Population 2024",
            "pop_growth_2020_2024": "Pop. growth (%)",
            "four_ps_per_1k_pop": "4Ps per 1k pop",
            "active_4ps_share": "% active in 4Ps",
        },
        center=center,
        zoom=zoom,
        **{style_kw: "carto-positron"},
    )
    fig.update_traces(marker={"size": 18})
    fig.update_layout(
        margin={"r": 0, "t": 0, "l": 0, "b": 0},
        height=height,
        legend_title_text="Income tier",
        uirevision="qc5-fixed",
    )

    event = st.plotly_chart(
        fig,
        width="stretch",
        on_select="rerun",
        key=key,
        config={"displayModeBar": False, "scrollZoom": False},
    )
    points = event.get("selection", {}).get("points", []) if event else []
    if points:
        cd = points[0].get("customdata")
        if cd:
            return cd[0]
    return None


# ---------------------------------------------------------------------------
# Page
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="District V Family Income Dashboard",
    layout="wide",
    initial_sidebar_state="expanded",
)
inject_styles()

st.title("District V — Family Income Dashboard")
st.caption(
    "For each barangay in QC's 5th District, this dashboard predicts the most "
    "common family income tier (Low / Middle / High) and suggests Philippine "
    "government aid programs that match the local situation."
)

if not MODEL_PATH.exists() or not BRGY_PATH.exists():
    st.error("Run `python build_model.py` first — model or merged dataset is missing.")
    st.stop()

brgy = load_brgy()
artifact = load_model()
model_name = artifact["model_name"]
total_families = int(brgy["families_surveyed"].sum())

with st.sidebar:
    st.header("Dashboard controls")
    st.markdown(f"**Model in use:** `{model_name}`")
    helper("Pick a barangay to see its profile and recommended aid programs.")
    selector = st.selectbox(
        "Barangay",
        options=["(none)"] + list(brgy["barangay"]),
        index=0,
    )
    st.markdown("---")
    st.subheader("Income-tier legend")
    render_class_legend()
    st.markdown("---")
    st.caption(
        f"Survey covers {total_families:,} families across {len(brgy)} barangays. "
        "Health and employment data are not included yet."
    )

if "selected_brgy" not in st.session_state:
    st.session_state.selected_brgy = None
if selector != "(none)":
    st.session_state.selected_brgy = selector
selected = st.session_state.selected_brgy

left, right = st.columns([1.3, 1])
with left:
    map_click = render_district_map(brgy, height=600, key="brgy_map")
    if map_click:
        st.session_state.selected_brgy = map_click
        selected = map_click
with right:
    st.subheader("Barangay profile")
    if not selected:
        st.info("Click a pin on the map, or pick a barangay from the sidebar.")
    else:
        row = brgy[brgy["barangay"] == selected].iloc[0]
        cls = row["predicted_class"]
        st.markdown(f"### {selected}")
        st.markdown(
            f"**Most common income tier (model prediction):** {class_pill(cls)} "
            f"&nbsp;·&nbsp; {int(row['families_surveyed'])} families in survey",
            unsafe_allow_html=True,
        )
        render_indicators(row)
        render_class_distribution(row)

if selected:
    row = brgy[brgy["barangay"] == selected].iloc[0]
    cls = row["predicted_class"]
    st.markdown("---")
    st.markdown("#### Recommended aid programs")
    helper(
        "The first cards match the predicted income tier above. The rest are "
        "added when a specific indicator (4Ps coverage, children per family, "
        "school attendance, population growth, etc.) crosses a threshold. "
        "<b>Urgent</b> = highest-priority needs, <b>Recommended</b> = useful "
        "next-step support, <b>Optional</b> = nice-to-have growth programs."
    )
    suggestions = suggest_aid(row, cls)
    if not suggestions:
        st.write("No specific aid triggers fired — indicators are within typical ranges.")
    else:
        cols = st.columns(3)
        for i, s in enumerate(suggestions):
            with cols[i % 3]:
                render_aid_card(s)

with st.expander("See the full barangay-level data table"):
    st.dataframe(brgy, width="stretch")
