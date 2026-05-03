"""
QC 5th District (Novaliches) Income-Level Classifier.

- Unit of analysis: family (4,649 rows from SWDI/PPIS), aggregated to barangay for the UI.
- Target: SWDI Income Level mapped to Low (Level 1) / Middle (Level 2) / High (Level 3).
- Feature set (no health, no employment for now):
    * family-level:    family_size, dependents_0_18, children_in_school,
                       children_in_school_ratio, household_status
    * barangay-level:  pop_2024, pop_growth_2020_2024, four_ps_per_1k_pop,
                       active_4ps_share
- Models: Logistic Regression, Random Forest, Gradient Boosting, Voting ensemble.
"""

import os
import re
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    GradientBoostingClassifier,
    RandomForestClassifier,
    VotingClassifier,
)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

warnings.filterwarnings("ignore")

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "data")
OUT = os.path.join(BASE, "outputs")
MODELS = os.path.join(BASE, "models")
os.makedirs(OUT, exist_ok=True)
os.makedirs(MODELS, exist_ok=True)

RANDOM_STATE = 42

# Canonical roster for QC's 5th Congressional District.
BARANGAYS = [
    "Bagbag", "Capri", "Fairview", "Greater Lagro", "Gulod", "Kaligayahan",
    "Nagkaisang Nayon", "North Fairview", "Novaliches Proper",
    "Pasong Putik Proper", "San Agustin", "San Bartolome",
    "Santa Lucia", "Santa Monica",
]

# Map raw-label variants -> canonical name.
BRGY_ALIASES = {
    "pasong putik proper (pasong putik)": "Pasong Putik Proper",
}


def canon_brgy(name):
    if not isinstance(name, str):
        return None
    key = name.strip().lower()
    if key in BRGY_ALIASES:
        return BRGY_ALIASES[key]
    for b in BARANGAYS:
        if key == b.lower():
            return b
    return None  # unknown labels (e.g. Horseshoe) drop out


LEVEL_TO_CLASS = {"Level 1": "Low", "Level 2": "Middle", "Level 3": "High"}
CLASS_ORDER = ["Low", "Middle", "High"]


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------
def load_income_families():
    df = pd.read_excel(
        os.path.join(DATA, "income", "DISTRICT V_INCOME.xlsx"),
        sheet_name="RAW DATA",
        header=0,
    )
    df.columns = [re.sub(r"\s+", " ", c.replace("\n", " ")).strip() for c in df.columns]
    df = df.rename(
        columns={
            "Barangay Name": "barangay_raw",
            "Family_Size From SWDI and PPIS (no SWDI result)": "family_size",
            "Number of Dependents (0-18 Years Old) From PPIS": "dependents_0_18",
            "Children Attending School (From PPIS)": "children_in_school",
            "Monthly_Per_Capita_income (From SWDI)": "monthly_per_capita_income",
            "Income Level (From SWDI)": "income_level_raw",
            "Household Status": "household_status",
        }
    )
    df["barangay"] = df["barangay_raw"].map(canon_brgy)

    # 'No SWDI Result' is a string sentinel in both the income column and the level column.
    df["monthly_per_capita_income"] = pd.to_numeric(
        df["monthly_per_capita_income"], errors="coerce"
    )
    df = df[df["income_level_raw"].isin(LEVEL_TO_CLASS)].copy()
    df["income_class"] = df["income_level_raw"].map(LEVEL_TO_CLASS)

    df = df[df["barangay"].notna()].copy()
    keep = [
        "barangay", "family_size", "dependents_0_18", "children_in_school",
        "monthly_per_capita_income", "household_status", "income_class",
    ]
    return df[keep].reset_index(drop=True)


def load_population():
    df = pd.read_excel(
        os.path.join(DATA, "population", "DISTRICT V_POPULATION.xlsx"),
        sheet_name="RAW DATA",
        header=0,
    )
    df = df.rename(columns={df.columns[0]: "barangay_raw"})
    df["barangay"] = df["barangay_raw"].map(canon_brgy)
    df = df[df["barangay"].notna()].copy()

    out = df[["barangay", 2020, 2024]].rename(
        columns={2020: "pop_2020", 2024: "pop_2024"}
    )
    out["pop_growth_2020_2024"] = (
        (out["pop_2024"] - out["pop_2020"]) / out["pop_2020"] * 100
    )
    return out.reset_index(drop=True)


def load_education_4ps():
    """Total 4Ps recipient counts per barangay from the Processed_4Ps pivot."""
    df = pd.read_excel(
        os.path.join(DATA, "education", "DISTRICT V_EDUCATION.xlsx"),
        sheet_name="Processed_4Ps",
        header=None,
    )
    # Header row is the one that starts with 'Row Labels'.
    header_idx = df.index[df[0].astype(str).str.strip() == "Row Labels"][0]
    table = df.iloc[header_idx:].reset_index(drop=True)
    table.columns = table.iloc[0]
    table = table.iloc[1:].copy()
    table = table.rename(columns={"Row Labels": "barangay_raw"})
    table = table[table["barangay_raw"].astype(str).str.strip() != "Grand Total"]

    table["barangay"] = table["barangay_raw"].map(canon_brgy)
    table = table[table["barangay"].notna()].copy()

    sy_cols = [c for c in table.columns if isinstance(c, str) and c.startswith("SY ")]
    for c in sy_cols + ["Grand Total"]:
        table[c] = pd.to_numeric(table[c], errors="coerce").fillna(0)

    latest_sy = sy_cols[-1] if sy_cols else None
    out = pd.DataFrame({
        "barangay": table["barangay"].values,
        "four_ps_total_all_sy": table["Grand Total"].values,
        "four_ps_recipients_latest": table[latest_sy].values if latest_sy else 0,
    })
    return out.reset_index(drop=True)


# ---------------------------------------------------------------------------
# Build datasets
# ---------------------------------------------------------------------------
def build_barangay_table(families, population, education):
    """Per-barangay aggregates (used by the UI and as context features for the model)."""
    fam_agg = (
        families.groupby("barangay")
        .agg(
            families_surveyed=("income_class", "size"),
            avg_per_capita_income=("monthly_per_capita_income", "mean"),
            avg_family_size=("family_size", "mean"),
            avg_dependents=("dependents_0_18", "mean"),
            avg_children_in_school=("children_in_school", "mean"),
        )
        .reset_index()
    )

    status = (
        families.assign(_active=(families["household_status"] == "Active").astype(int))
        .groupby("barangay")["_active"].mean()
        .rename("active_4ps_share").reset_index()
    )
    status["active_4ps_share"] *= 100

    actual_dist = (
        families.groupby(["barangay", "income_class"]).size().unstack(fill_value=0)
    )
    actual_dist = actual_dist.reindex(columns=CLASS_ORDER, fill_value=0)
    actual_dist.columns = [f"actual_{c.lower()}" for c in actual_dist.columns]
    actual_dist = actual_dist.reset_index()

    df = (
        pd.DataFrame({"barangay": BARANGAYS})
        .merge(population, on="barangay", how="left")
        .merge(education, on="barangay", how="left")
        .merge(fam_agg, on="barangay", how="left")
        .merge(status, on="barangay", how="left")
        .merge(actual_dist, on="barangay", how="left")
    )

    df["four_ps_per_1k_pop"] = (
        df["four_ps_recipients_latest"] / df["pop_2024"] * 1000
    )
    return df


def attach_context(families, brgy_table):
    ctx_cols = [
        "pop_2024", "pop_growth_2020_2024",
        "four_ps_per_1k_pop", "active_4ps_share",
    ]
    return families.merge(
        brgy_table[["barangay"] + ctx_cols], on="barangay", how="left"
    )


# ---------------------------------------------------------------------------
# Modeling
# ---------------------------------------------------------------------------
NUM_FEATURES = [
    "family_size", "dependents_0_18", "children_in_school",
    "children_in_school_ratio",
    "pop_2024", "pop_growth_2020_2024",
    "four_ps_per_1k_pop", "active_4ps_share",
]
CAT_FEATURES = ["household_status", "barangay"]
ALL_FEATURES = NUM_FEATURES + CAT_FEATURES


def build_preprocessor():
    num = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    cat = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore")),
    ])
    return ColumnTransformer([("num", num, NUM_FEATURES), ("cat", cat, CAT_FEATURES)])


def make_pipeline(clf):
    return Pipeline([("prep", build_preprocessor()), ("clf", clf)])


def evaluate(name, model, X, y, X_train, X_test, y_train, y_test, cv):
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="accuracy")
    return {
        "name": name,
        "model": model,
        "y_pred": y_pred,
        "accuracy": accuracy_score(y_test, y_pred),
        "precision": precision_score(y_test, y_pred, average="macro", zero_division=0),
        "recall": recall_score(y_test, y_pred, average="macro", zero_division=0),
        "cv_mean": cv_scores.mean(),
        "cv_std": cv_scores.std(),
    }


def main():
    print("Loading datasets...")
    families = load_income_families()
    population = load_population()
    education = load_education_4ps()

    print(f"  Families (with SWDI level): {len(families):,}")
    print(f"  Barangays w/ population:    {len(population)}")
    print(f"  Barangays w/ 4Ps records:   {len(education)}")

    brgy_table = build_barangay_table(families, population, education)
    families = attach_context(families, brgy_table)
    families["children_in_school_ratio"] = (
        families["children_in_school"] / families["dependents_0_18"].replace(0, np.nan)
    ).clip(upper=1.0)

    X = families[ALL_FEATURES]
    y = families["income_class"]

    print(f"\nTraining matrix: {X.shape}  classes={dict(y.value_counts())}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y,
    )
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    candidates = [
        ("Logistic Regression",
         make_pipeline(LogisticRegression(max_iter=2000))),
        ("Random Forest",
         make_pipeline(RandomForestClassifier(n_estimators=400, random_state=RANDOM_STATE,
                                              n_jobs=-1))),
        ("Gradient Boosting",
         make_pipeline(GradientBoostingClassifier(random_state=RANDOM_STATE))),
        ("Hybrid (Voting)",
         make_pipeline(VotingClassifier(
             estimators=[
                 ("logreg", LogisticRegression(max_iter=2000)),
                 ("rf", RandomForestClassifier(n_estimators=400,
                                               random_state=RANDOM_STATE, n_jobs=-1)),
                 ("gbm", GradientBoostingClassifier(random_state=RANDOM_STATE)),
             ],
             voting="soft",
         ))),
    ]

    results = []
    print("\nTraining & evaluating models...")
    for name, model in candidates:
        r = evaluate(name, model, X, y, X_train, X_test, y_train, y_test, cv)
        results.append(r)
        print(f"  {name:22s}  CV acc={r['cv_mean']:.3f}±{r['cv_std']:.3f}  "
              f"holdout acc={r['accuracy']:.3f}  prec={r['precision']:.3f}  "
              f"rec={r['recall']:.3f}")

    # Thesis chose the Hybrid (soft-voting) ensemble as the deployment model.
    # The base learners are still trained and reported for the comparison table.
    best = next(r for r in results if r["name"] == "Hybrid (Voting)")
    print(f"\nDeployment model: {best['name']} (CV acc={best['cv_mean']:.3f})")

    # Refit on all data for inference.
    best["model"].fit(X, y)

    # ---- Predict for the full family table; aggregate to barangay ----
    families["predicted_class"] = best["model"].predict(X)
    pred_dist = (
        families.groupby(["barangay", "predicted_class"]).size().unstack(fill_value=0)
    )
    pred_dist = pred_dist.reindex(columns=CLASS_ORDER, fill_value=0)
    pred_dist.columns = [f"pred_{c.lower()}" for c in pred_dist.columns]
    pred_dist["predicted_class"] = pred_dist.idxmax(axis=1).str.replace(
        "pred_", "", regex=False
    ).str.capitalize()
    pred_dist = pred_dist.reset_index()

    brgy_table = brgy_table.merge(pred_dist, on="barangay", how="left")

    # ---- Persist artifacts ----
    brgy_table.to_csv(os.path.join(OUT, "merged_dataset.csv"), index=False)
    families.to_csv(os.path.join(OUT, "family_predictions.csv"), index=False)

    metrics_df = pd.DataFrame([
        {
            "model": r["name"],
            "cv_accuracy_mean": r["cv_mean"],
            "cv_accuracy_std": r["cv_std"],
            "holdout_accuracy": r["accuracy"],
            "holdout_precision_macro": r["precision"],
            "holdout_recall_macro": r["recall"],
        }
        for r in results
    ]).sort_values("cv_accuracy_mean", ascending=False)
    metrics_df.to_csv(os.path.join(OUT, "model_metrics.csv"), index=False)

    cm = confusion_matrix(y_test, best["y_pred"], labels=CLASS_ORDER)
    pd.DataFrame(cm, index=CLASS_ORDER, columns=CLASS_ORDER).to_csv(
        os.path.join(OUT, "confusion_matrix_best.csv")
    )
    with open(os.path.join(OUT, "classification_report_best.txt"), "w") as f:
        f.write(f"Best model: {best['name']}\n")
        f.write(f"Train n={len(X_train)}  Test n={len(X_test)}\n\n")
        f.write(classification_report(
            y_test, best["y_pred"], labels=CLASS_ORDER, zero_division=0,
        ))

    artifact = {
        "model": best["model"],
        "model_name": best["name"],
        "features": ALL_FEATURES,
        "num_features": NUM_FEATURES,
        "cat_features": CAT_FEATURES,
        "classes": CLASS_ORDER,
        "level_to_class": LEVEL_TO_CLASS,
        "barangays": BARANGAYS,
    }
    joblib.dump(artifact, os.path.join(MODELS, "best_model.joblib"))

    print(f"\nOutputs -> {OUT}")
    print(f"Model   -> {os.path.join(MODELS, 'best_model.joblib')}")


if __name__ == "__main__":
    main()
