import os
import re
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, RobustScaler
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier

warnings.filterwarnings("ignore")

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE, "data", "income", "DISTRICT V_INCOME.xlsx")
MODELS_DIR = os.path.join(BASE, "models")
os.makedirs(MODELS_DIR, exist_ok=True)
MODEL_OUT = os.path.join(MODELS_DIR, "individual_family_model.joblib")

RANDOM_STATE = 42
LEVEL_TO_CLASS = {"Level 1": "Low", "Level 2": "Middle", "Level 3": "High"}
CLASS_ORDER = ["Low", "Middle", "High"]


def load_data():
    df = pd.read_excel(DATA_PATH, sheet_name="RAW DATA")
    df.columns = [re.sub(r"\s+", " ", c.replace("\n", " ")).strip() for c in df.columns]

    df = df.rename(columns={
        "Family_Size From SWDI and PPIS (no SWDI result)": "family_size",
        "Number of Dependents (0-18 Years Old) From PPIS": "dependents_0_18",
        "Children Attending School (From PPIS)": "children_in_school",
        "Monthly_Per_Capita_income (From SWDI)": "monthly_per_capita_income",
        "Income Level (From SWDI)": "income_level_raw",
        "Household Status": "household_status",
    })

    df["monthly_per_capita_income"] = pd.to_numeric(df["monthly_per_capita_income"], errors="coerce")
    df["family_size"] = pd.to_numeric(df["family_size"], errors="coerce")
    df["dependents_0_18"] = pd.to_numeric(df["dependents_0_18"], errors="coerce")
    df["children_in_school"] = pd.to_numeric(df["children_in_school"], errors="coerce")

    df = df[df["income_level_raw"].isin(LEVEL_TO_CLASS)].copy()
    df["target"] = df["income_level_raw"].map(LEVEL_TO_CLASS)

    # Core features
    df["children_in_school_ratio"] = (
        df["children_in_school"] / df["dependents_0_18"].replace(0, np.nan)
    ).fillna(1.0).clip(upper=1.0)

    # === IMPROVED ENGINEERED FEATURES ===
    # Total household income captures real financial capacity
    df["total_monthly_income"] = df["monthly_per_capita_income"] * df["family_size"]

    # Dependency burden: proportion of household that are minors
    df["dep_ratio"] = (df["dependents_0_18"] / df["family_size"].replace(0, 1)).clip(upper=1.0)

    # Out-of-school count: absolute number of children not attending school
    df["out_of_school_count"] = (df["dependents_0_18"] - df["children_in_school"]).clip(lower=0)

    # Income per dependent: real pressure of supporting minors
    df["income_per_dependent"] = (
        df["total_monthly_income"] / df["dependents_0_18"].replace(0, np.nan)
    ).fillna(df["total_monthly_income"])

    return df


def build_model():
    num_features = [
        "total_monthly_income",         # Total combined household income (sole income driver)
        "family_size",                  # Total members
        "dependents_0_18",              # Minor dependents
        "children_in_school",           # School attendance
        "children_in_school_ratio",     # School attendance rate
        "dep_ratio",                    # Dependency burden %
        "out_of_school_count",          # Absolute number out of school
        "income_per_dependent",         # Income stress per child
    ]
    # No categorical features — purely numerical socio-economic features
    preprocessor = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", RobustScaler()),
    ])

    rf = RandomForestClassifier(
        n_estimators=400,
        max_depth=10,
        max_features="sqrt",
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    xgb = XGBClassifier(
        n_estimators=400,
        max_depth=5,
        learning_rate=0.07,
        subsample=0.85,
        colsample_bytree=0.80,
        reg_alpha=0.1,
        reg_lambda=1.0,
        objective="multi:softprob",
        eval_metric="mlogloss",
        random_state=RANDOM_STATE,
        n_jobs=-1,
        tree_method="hist",
    )
    meta = LogisticRegression(max_iter=2000, C=1.0)

    stack = StackingClassifier(
        estimators=[("rf", rf), ("xgb", xgb)],
        final_estimator=meta,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE),
        stack_method="predict_proba",
        n_jobs=-1,
    )

    return Pipeline([("prep", preprocessor), ("stack", stack)]), num_features


def main():
    print("Loading individual household records from DISTRICT V_INCOME.xlsx...")
    df = load_data()
    print(f"Loaded {len(df):,} valid records.")
    print("Class breakdown:\n", df["target"].value_counts())

    # Feature verification
    num_cols = [
        "total_monthly_income",
        "family_size", "dependents_0_18", "children_in_school",
        "children_in_school_ratio", "dep_ratio", "out_of_school_count", "income_per_dependent",
    ]
    feature_cols = num_cols

    print("\nFeature correlations with target:")
    target_num = df["target"].map({"Low": 1, "Middle": 2, "High": 3})
    corr = df[num_cols].corrwith(target_num).sort_values(key=abs, ascending=False)
    for feat, val in corr.items():
        print(f"  {feat:30s}: {val:+.4f}")

    X = df[feature_cols]
    class_to_idx = {c: i for i, c in enumerate(CLASS_ORDER)}
    y = df["target"].map(class_to_idx).to_numpy()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    print(f"\nTrain size: {len(X_train)}, Test size: {len(X_test)}")

    pipe, num_feats = build_model()
    sw = compute_sample_weight("balanced", y_train)

    print("Training improved individual family stacking classifier (Total Monthly Income only)...")
    pipe.fit(X_train, y_train, stack__sample_weight=sw)

    y_pred = pipe.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nHold-out Accuracy: {acc:.4%}")
    print("\nClassification Report:\n", classification_report(y_test, y_pred, target_names=CLASS_ORDER, digits=4))
    print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))

    # Test the problematic case: PHP 6,000 TOTAL income, 10 members
    print("\n--- Test: Total=PHP 6,000, family=10, dep=10, school=3 ---")
    test_total = 6000
    test_fam = 10
    test_df = pd.DataFrame([{
        "total_monthly_income": test_total,
        "family_size": test_fam,
        "dependents_0_18": 10.0,
        "children_in_school": 3.0,
        "children_in_school_ratio": 0.3,
        "dep_ratio": 1.0,
        "out_of_school_count": 7.0,
        "income_per_dependent": test_total / 10,
    }])
    probs = pipe.predict_proba(test_df)[0]
    pred = CLASS_ORDER[int(np.argmax(probs))]
    print(f"Total Income: PHP {test_total:,.0f} | Prediction: {pred} | Probs: Low={probs[0]:.3f} Mid={probs[1]:.3f} High={probs[2]:.3f}")

    # Save bundle
    bundle = {
        "pipeline": pipe,
        "num_features": num_feats,
        "classes": CLASS_ORDER,
        "accuracy": acc,
    }
    joblib.dump(bundle, MODEL_OUT)
    print(f"\nModel saved to: {MODEL_OUT}")


if __name__ == "__main__":
    main()
