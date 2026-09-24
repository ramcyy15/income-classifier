"""
train_barangay_model.py
-----------------------
Trains a Barangay-Level Stacking Ensemble ML Model on research-backed
socio-economic features drawn from the Philippine Statistics Authority (PSA)
Multidimensional Poverty Index (MPI) and FIES/CPH framework.

Architecture:
  Base Learners : Random Forest + Gradient Boosting (XGBoost)
  Meta-Learner  : Logistic Regression (5-fold stacking)

Features (10 PSA indicators):
  pct_employed_head                  — PSA LFS / MPI Employment dimension
  avg_monthly_income_php             — PSA FIES income benchmark
  pct_with_access_to_electricity     — PSA CPH / MPI Utilities dimension
  pct_with_safe_water_access         — PSA CPH / MPI Water dimension
  pct_with_sanitary_toilet           — PSA CPH / MPI Sanitation dimension
  net_enrollment_rate                — PSA FLEMMS / MPI Education dimension
  pct_permanent_house_material       — PSA CPH / MPI Housing quality dimension
  pct_informal_settlers              — PSA CPH Housing tenure dimension
  avg_family_size                    — PSA CPH / FIES Average Household Size
  pct_completed_secondary_education  — PSA CPH / MPI Education attainment

Target: PSA / PIDS Official Income Tiers
  0 = Level 1 (Low-Income Tier: < 2x Poverty Threshold)
  1 = Level 2 (Middle-Income Tier: 2x - 12x Poverty Threshold)
  2 = Level 3 (High-Income Tier: > 12x Poverty Threshold)
"""

import os
import joblib
import pandas as pd
import numpy as np

from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import RobustScaler
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from xgboost import XGBClassifier

RANDOM_STATE = 42
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "income", "synthetic_barangay_dataset.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)
MODEL_OUT = os.path.join(MODELS_DIR, "barangay_stacking_model.joblib")

FEATURES = [
    "pct_employed_head",
    "avg_monthly_income_php",
    "pct_with_access_to_electricity",
    "pct_with_safe_water_access",
    "pct_with_sanitary_toilet",
    "net_enrollment_rate",
    "pct_permanent_house_material",
    "pct_informal_settlers",
    "avg_family_size",
    "pct_completed_secondary_education",
]

# Integer labels preserve sklearn class_ order: 0=Low, 1=Middle, 2=High
TARGET_MAP = {"Level 1": 0, "Level 2": 1, "Level 3": 2}
CLASS_ORDER = ["Low", "Middle", "High"]


def main():
    print(f"Loading dataset from {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)
    df["target"] = df["income_level"].map(TARGET_MAP)

    X = df[FEATURES]
    y = df["target"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    print(f"Train: {X_train.shape[0]:,} | Test: {X_test.shape[0]:,}")

    # Preprocessing: impute + robust scale (resistant to skew)
    preprocessor = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler",  RobustScaler()),
    ])

    # Base Learner 1: Random Forest — tuned for realistic (not overfitted) data
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,           # constrained depth to reduce overfitting
        min_samples_leaf=8,    # require at least 8 samples at leaf = smoother boundaries
        max_features="sqrt",
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    # Base Learner 2: XGBoost — regularised to avoid memorising training data
    xgb = XGBClassifier(
        n_estimators=200,
        max_depth=4,           # shallow for generalisation
        learning_rate=0.05,    # slow learning rate
        subsample=0.75,
        colsample_bytree=0.75,
        reg_alpha=0.5,         # L1 regularisation
        reg_lambda=1.5,        # L2 regularisation
        objective="multi:softprob",
        eval_metric="mlogloss",
        random_state=RANDOM_STATE,
        n_jobs=-1,
        tree_method="hist",
    )

    # Meta-Learner: Logistic Regression
    meta = LogisticRegression(C=1.0, max_iter=1000, random_state=RANDOM_STATE)

    stacking_clf = StackingClassifier(
        estimators=[("rf", rf), ("xgb", xgb)],
        final_estimator=meta,
        cv=5,
        n_jobs=-1,
        passthrough=False,
    )

    pipeline = Pipeline([
        ("prep",  preprocessor),
        ("stack", stacking_clf),
    ])

    print("Fitting Stacking Ensemble (RF + XGBoost -> LogReg)...")
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    print(f"\n==========================================")
    print(f"Hold-out Test Accuracy: {acc * 100:.2f}%")
    print(f"==========================================\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred, target_names=CLASS_ORDER, digits=4))

    print("Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    cm_df = pd.DataFrame(cm, index=CLASS_ORDER, columns=CLASS_ORDER)
    print(cm_df)

    # Cross-validation accuracy (5-fold) on training set for honesty
    print("\nRunning 5-fold CV on training set for generalisation estimate...")
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=5, scoring="accuracy", n_jobs=-1)
    print(f"CV Accuracy: {cv_scores.mean()*100:.2f}% ± {cv_scores.std()*100:.2f}%")

    # Feature importances from RF base learner
    rf_fitted = pipeline.named_steps["stack"].estimators_[0]
    importances = rf_fitted.feature_importances_
    feat_imp = sorted(zip(FEATURES, importances), key=lambda x: x[1], reverse=True)
    print("\nFeature Importances (Random Forest base learner):")
    for f, imp in feat_imp:
        print(f"  {f:42s}: {imp * 100:.2f}%")

    # Save model artifact
    model_artifact = {
        "pipeline":            pipeline,
        "features":            FEATURES,
        "classes":             CLASS_ORDER,
        "accuracy":            acc,
        "feature_importances": dict(feat_imp),
    }

    joblib.dump(model_artifact, MODEL_OUT, compress=3)
    print(f"\nModel saved to: {MODEL_OUT}")


if __name__ == "__main__":
    main()
