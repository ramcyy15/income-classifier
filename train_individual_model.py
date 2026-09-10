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
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
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

    # Filter only rows with valid target classes
    df = df[df["income_level_raw"].isin(LEVEL_TO_CLASS)].copy()
    df["target"] = df["income_level_raw"].map(LEVEL_TO_CLASS)

    # Derive attendance ratio
    df["children_in_school_ratio"] = (
        df["children_in_school"] / df["dependents_0_18"].replace(0, np.nan)
    ).fillna(1.0).clip(upper=1.0)

    return df

def build_model():
    num_features = [
        "monthly_per_capita_income",
        "family_size",
        "dependents_0_18",
        "children_in_school",
        "children_in_school_ratio",
    ]
    cat_features = ["household_status"]

    num_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    cat_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore")),
    ])
    preprocessor = ColumnTransformer([
        ("num", num_pipeline, num_features),
        ("cat", cat_pipeline, cat_features),
    ])

    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    xgb = XGBClassifier(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        objective="multi:softprob",
        eval_metric="mlogloss",
        random_state=RANDOM_STATE,
        n_jobs=-1,
        tree_method="hist",
    )
    meta = LogisticRegression(max_iter=1000)

    stack = StackingClassifier(
        estimators=[("rf", rf), ("xgb", xgb)],
        final_estimator=meta,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE),
        stack_method="predict_proba",
        n_jobs=-1,
    )

    return Pipeline([("prep", preprocessor), ("stack", stack)]), num_features, cat_features

def main():
    print("Loading individual household records from DISTRICT V_INCOME.xlsx...")
    df = load_data()
    print(f"Loaded {len(df):,} valid records.")
    print("Class breakdown:\n", df["target"].value_counts())

    num_cols = ["monthly_per_capita_income", "family_size", "dependents_0_18", "children_in_school", "children_in_school_ratio"]
    cat_cols = ["household_status"]
    feature_cols = num_cols + cat_cols

    X = df[feature_cols]
    y_raw = df["target"]
    class_to_idx = {c: i for i, c in enumerate(CLASS_ORDER)}
    y = y_raw.map(class_to_idx).to_numpy()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    print(f"Train size: {len(X_train)}, Test size: {len(X_test)}")

    pipe, num_feats, cat_feats = build_model()
    sw = compute_sample_weight("balanced", y_train)

    print("Training individual family stacking classifier...")
    pipe.fit(X_train, y_train, stack__sample_weight=sw)

    y_pred = pipe.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nHold-out Accuracy: {acc:.4%}")
    print("\nClassification Report:\n", classification_report(y_test, y_pred, target_names=CLASS_ORDER))

    # Save bundle
    bundle = {
        "pipeline": pipe,
        "num_features": num_feats,
        "cat_features": cat_feats,
        "classes": CLASS_ORDER,
        "accuracy": acc,
    }
    joblib.dump(bundle, MODEL_OUT)
    print(f"Model saved successfully to: {MODEL_OUT}")

if __name__ == "__main__":
    main()
