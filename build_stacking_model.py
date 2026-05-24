import os
import re
import warnings

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from mapie.classification import SplitConformalClassifier
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier

warnings.filterwarnings("ignore")

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "data")
OUT = os.path.join(BASE, "outputs")
MODELS = os.path.join(BASE, "models")
os.makedirs(OUT, exist_ok=True)
os.makedirs(MODELS, exist_ok=True)

RANDOM_STATE = 42

BARANGAYS = [
    "Bagbag", "Capri", "Fairview", "Greater Lagro", "Gulod", "Kaligayahan",
    "Nagkaisang Nayon", "North Fairview", "Novaliches Proper",
    "Pasong Putik Proper", "San Agustin", "San Bartolome",
    "Santa Lucia", "Santa Monica",
]

BRGY_ALIASES = {
    "pasong putik proper (pasong putik)": "Pasong Putik Proper",
}

LEVEL_TO_CLASS = {"Level 1": "Low", "Level 2": "Middle", "Level 3": "High"}
CLASS_ORDER = ["Low", "Middle", "High"]


def canon_brgy(name):
    if not isinstance(name, str):
        return None
    key = name.strip().lower()
    if key in BRGY_ALIASES:
        return BRGY_ALIASES[key]
    for b in BARANGAYS:
        if key == b.lower():
            return b
    return None


def load_income_families():
    df = pd.read_excel(
        os.path.join(DATA, "income", "DISTRICT V_INCOME.xlsx"),
        sheet_name="RAW DATA",
        header=0,
    )
    df.columns = [re.sub(r"\s+", " ", c.replace("\n", " ")).strip() for c in df.columns]
    df = df.rename(columns={
        "Barangay Name": "barangay_raw",
        "Family_Size From SWDI and PPIS (no SWDI result)": "family_size",
        "Number of Dependents (0-18 Years Old) From PPIS": "dependents_0_18",
        "Children Attending School (From PPIS)": "children_in_school",
        "Monthly_Per_Capita_income (From SWDI)": "monthly_per_capita_income",
        "Income Level (From SWDI)": "income_level_raw",
        "Household Status": "household_status",
    })

    df["barangay"] = df["barangay_raw"].map(canon_brgy)
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

    year_cols = [c for c in df.columns if isinstance(c, (int, np.integer))]
    for c in year_cols:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    out = pd.DataFrame({"barangay": df["barangay"].values})
    out["pop_2000"] = df[2000].values if 2000 in year_cols else np.nan
    out["pop_2020"] = df[2020].values if 2020 in year_cols else np.nan
    out["pop_2024"] = df[2024].values if 2024 in year_cols else np.nan

    out["pop_growth_2000_2024"] = (
        (out["pop_2024"] - out["pop_2000"]) / out["pop_2000"] * 100
    )
    out["pop_growth_2020_2024"] = (
        (out["pop_2024"] - out["pop_2020"]) / out["pop_2020"] * 100
    )
    return out.reset_index(drop=True)


def load_education_4ps():
    df = pd.read_excel(
        os.path.join(DATA, "education", "DISTRICT V_EDUCATION.xlsx"),
        sheet_name="Processed_4Ps",
        header=None,
    )
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

    return pd.DataFrame({
        "barangay": table["barangay"].values,
        "four_ps_total_all_sy": table["Grand Total"].values,
        "four_ps_recipients_latest": table[latest_sy].values if latest_sy else 0,
    }).reset_index(drop=True)


def build_barangay_table(families, population, education):
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
        .mul(100)
        .rename("active_4ps_share")
        .reset_index()
    )

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
    df["four_ps_per_1k_pop"] = df["four_ps_recipients_latest"] / df["pop_2024"] * 1000
    return df


def attach_context(families, brgy_table):
    ctx = [
        "pop_2024", "pop_growth_2000_2024", "pop_growth_2020_2024",
        "four_ps_per_1k_pop", "active_4ps_share",
    ]
    return families.merge(brgy_table[["barangay"] + ctx], on="barangay", how="left")


NUM_FEATURES = [
    "family_size", "dependents_0_18", "children_in_school",
    "children_in_school_ratio",
    "pop_2024", "pop_growth_2000_2024", "pop_growth_2020_2024",
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


def build_stacking_classifier():
    rf = RandomForestClassifier(
        n_estimators=400,
        max_depth=None,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    xgb = XGBClassifier(
        n_estimators=400,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="multi:softprob",
        eval_metric="mlogloss",
        random_state=RANDOM_STATE,
        n_jobs=-1,
        tree_method="hist",
    )
    meta = LogisticRegression(max_iter=2000)

    return StackingClassifier(
        estimators=[("rf", rf), ("xgb", xgb)],
        final_estimator=meta,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE),
        stack_method="predict_proba",
        passthrough=False,
        n_jobs=-1,
    )


def plot_confusion_matrix(cm, classes, out_path):
    fig, ax = plt.subplots(figsize=(6, 5))
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=classes)
    disp.plot(ax=ax, cmap="Blues", colorbar=False, values_format="d")
    ax.set_title("Stacking Classifier — Confusion Matrix (hold-out)")
    plt.tight_layout()
    plt.savefig(out_path, dpi=200)
    plt.close(fig)


def get_feature_names(preprocessor):
    names = list(preprocessor.named_transformers_["num"].feature_names_in_)
    ohe = preprocessor.named_transformers_["cat"].named_steps["onehot"]
    cat_in = preprocessor.named_transformers_["cat"].feature_names_in_
    names += list(ohe.get_feature_names_out(cat_in))
    return names


def plot_feature_importance(importances, names, title, out_path, top_n=15):
    order = np.argsort(importances)[::-1][:top_n]
    fig, ax = plt.subplots(figsize=(7, 5))
    ax.barh(np.array(names)[order][::-1], np.array(importances)[order][::-1])
    ax.set_title(title)
    ax.set_xlabel("Importance")
    plt.tight_layout()
    plt.savefig(out_path, dpi=200)
    plt.close(fig)


def main():
    print("=== 1. Loading raw datasets ===")
    families = load_income_families()
    population = load_population()
    education = load_education_4ps()
    print(f"  families w/ SWDI level: {len(families):,}")
    print(f"  barangays w/ population: {len(population)}")
    print(f"  barangays w/ 4Ps records: {len(education)}")

    print("\n=== 2. Aggregating to barangay level & merging ===")
    brgy_table = build_barangay_table(families, population, education)
    families = attach_context(families, brgy_table)
    families["children_in_school_ratio"] = (
        families["children_in_school"]
        / families["dependents_0_18"].replace(0, np.nan)
    ).clip(upper=1.0)

    print("\n=== 3. Preparing modeling matrix ===")
    X = families[ALL_FEATURES]
    y_raw = families["income_class"]
    print(f"  X shape: {X.shape}")
    print(f"  class distribution: {dict(y_raw.value_counts())}")

    class_to_idx = {c: i for i, c in enumerate(CLASS_ORDER)}
    le = LabelEncoder()
    le.classes_ = np.array(CLASS_ORDER)
    y = y_raw.map(class_to_idx).to_numpy()

    X_train_full, X_test, y_train_full, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y,
    )
    X_train, X_calib, y_train, y_calib = train_test_split(
        X_train_full, y_train_full, test_size=0.25,
        random_state=RANDOM_STATE, stratify=y_train_full,
    )
    print(f"  split sizes  train={len(X_train)}  calib={len(X_calib)}  test={len(X_test)}")

    print("\n=== 4. Building Stacking pipeline (RF + XGBoost -> LogReg) ===")
    preprocessor = build_preprocessor()
    stack = build_stacking_classifier()
    pipe = Pipeline([("prep", preprocessor), ("stack", stack)])

    print("  Training (with balanced sample weights)...")
    sw_train = compute_sample_weight("balanced", y_train)
    try:
        pipe.fit(X_train, y_train, stack__sample_weight=sw_train)
    except (TypeError, ValueError):
        pipe.fit(X_train, y_train)

    print("\n=== 5. Evaluation ===")
    y_pred = pipe.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"  Hold-out accuracy: {acc:.4f}\n")

    report = classification_report(
        y_test, y_pred, target_names=CLASS_ORDER, digits=4, zero_division=0,
    )
    print(report)
    with open(os.path.join(OUT, "stacking_classification_report.txt"), "w") as f:
        f.write(f"Hold-out accuracy: {acc:.4f}\n\n")
        f.write(report)

    cm = confusion_matrix(y_test, y_pred, labels=list(range(len(CLASS_ORDER))))
    pd.DataFrame(cm, index=CLASS_ORDER, columns=CLASS_ORDER).to_csv(
        os.path.join(OUT, "stacking_confusion_matrix.csv")
    )
    plot_confusion_matrix(
        cm, CLASS_ORDER, os.path.join(OUT, "stacking_confusion_matrix.png")
    )
    print(f"  confusion matrix -> outputs/stacking_confusion_matrix.png")

    prep_fitted = pipe.named_steps["prep"]
    stack_fitted = pipe.named_steps["stack"]
    feat_names = get_feature_names(prep_fitted)

    rf_model = stack_fitted.named_estimators_["rf"]
    xgb_model = stack_fitted.named_estimators_["xgb"]

    plot_feature_importance(
        rf_model.feature_importances_, feat_names,
        "Random Forest — Feature Importance (top 15)",
        os.path.join(OUT, "stacking_rf_feature_importance.png"),
    )
    plot_feature_importance(
        xgb_model.feature_importances_, feat_names,
        "XGBoost — Feature Importance (top 15)",
        os.path.join(OUT, "stacking_xgb_feature_importance.png"),
    )

    imp_df = pd.DataFrame({
        "feature": feat_names,
        "rf_importance": rf_model.feature_importances_,
        "xgb_importance": xgb_model.feature_importances_,
    })
    imp_df["mean_importance"] = imp_df[["rf_importance", "xgb_importance"]].mean(axis=1)
    imp_df = imp_df.sort_values("mean_importance", ascending=False)
    imp_df.to_csv(os.path.join(OUT, "stacking_feature_importance.csv"), index=False)
    print(f"  feature importances -> outputs/stacking_feature_importance.csv")

    print("\n=== 6. Conformal calibration (90% coverage) ===")
    conformal = SplitConformalClassifier(
        estimator=pipe, confidence_level=0.90, prefit=True,
        random_state=RANDOM_STATE,
    )
    conformal.conformalize(X_calib, y_calib)
    _, test_sets = conformal.predict_set(X_test)
    test_sets = np.asarray(test_sets)
    if test_sets.ndim == 3:
        test_sets = test_sets[:, :, 0]
    covered = test_sets[np.arange(len(y_test)), y_test].mean()
    avg_set_size = test_sets.sum(axis=1).mean()
    print(f"  empirical coverage on hold-out: {covered:.3f}  avg set size: {avg_set_size:.2f}")

    print("\n=== 7. SHAP attribution (RF + XGBoost base learners) ===")
    prep_fitted = pipe.named_steps["prep"]
    stack_fitted = pipe.named_steps["stack"]
    feat_names = get_feature_names(prep_fitted)

    X_full_trans = prep_fitted.transform(X)
    rf_explainer = shap.TreeExplainer(stack_fitted.named_estimators_["rf"])
    xgb_explainer = shap.TreeExplainer(stack_fitted.named_estimators_["xgb"])

    def _to_3d(s):
        if isinstance(s, list):
            return np.stack([np.asarray(arr) for arr in s], axis=-1)
        return np.asarray(s)

    rf_shap = _to_3d(rf_explainer.shap_values(X_full_trans))
    xgb_shap = _to_3d(xgb_explainer.shap_values(X_full_trans))
    shap_3d = (rf_shap + xgb_shap) / 2.0
    print(f"  SHAP tensor: {shap_3d.shape} (samples, features, classes)")

    preds_int = pipe.predict(X)
    n = len(preds_int)
    shap_for_pred = np.stack([shap_3d[i, :, int(preds_int[i])] for i in range(n)])

    shap_df = pd.DataFrame(np.abs(shap_for_pred), columns=feat_names)
    shap_df.insert(0, "barangay", families["barangay"].values)
    brgy_shap = shap_df.groupby("barangay").mean().round(5)
    brgy_shap.to_csv(os.path.join(OUT, "shap_by_barangay.csv"))
    print(f"  per-barangay SHAP -> outputs/shap_by_barangay.csv")

    print("\n=== 8. Refitting on full data for deployment ===")
    sw_full = compute_sample_weight("balanced", y)
    try:
        pipe.fit(X, y, stack__sample_weight=sw_full)
    except (TypeError, ValueError):
        pipe.fit(X, y)

    families["predicted_class"] = np.array(CLASS_ORDER)[pipe.predict(X)]
    pred_dist = (
        families.groupby(["barangay", "predicted_class"]).size().unstack(fill_value=0)
    )
    pred_dist = pred_dist.reindex(columns=CLASS_ORDER, fill_value=0)
    pred_dist.columns = [f"pred_{c.lower()}" for c in pred_dist.columns]
    pred_dist["predicted_class"] = (
        pred_dist.idxmax(axis=1).str.replace("pred_", "", regex=False).str.capitalize()
    )
    pred_dist = pred_dist.reset_index()

    brgy_table = brgy_table.merge(pred_dist, on="barangay", how="left")
    brgy_table.to_csv(os.path.join(OUT, "merged_barangay_dataset.csv"), index=False)
    families.to_csv(os.path.join(OUT, "family_predictions.csv"), index=False)
    print(f"  merged barangay table -> outputs/merged_barangay_dataset.csv")

    joblib.dump(
        {
            "model": pipe,
            "pipeline": pipe,
            "model_name": "Stacking (RF + XGBoost -> LogReg)",
            "label_encoder": le,
            "features": ALL_FEATURES,
            "transformed_features": feat_names,
            "num_features": NUM_FEATURES,
            "cat_features": CAT_FEATURES,
            "classes": CLASS_ORDER,
            "level_to_class": LEVEL_TO_CLASS,
            "barangays": BARANGAYS,
            "conformal": conformal,
            "conformal_coverage_target": 0.90,
            "conformal_coverage_empirical": float(covered),
            "conformal_avg_set_size": float(avg_set_size),
        },
        os.path.join(MODELS, "stacking_model.joblib"),
    )
    print(f"\n  model -> models/stacking_model.joblib")
    print("\nDone.")


if __name__ == "__main__":
    main()
