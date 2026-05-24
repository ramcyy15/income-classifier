
# Setup

District V (Novaliches, QC) — Family Income Dashboard.

## 1. Install Python 3.10+

```
python --version
```

## 2. Install libraries

```
python -m pip install pandas numpy scikit-learn xgboost matplotlib joblib streamlit plotly openpyxl
```

## 3. Train the model

```
python build_stacking_model.py
```

Writes:

- `models/stacking_model.joblib` — Stacking classifier (RF + XGBoost → Logistic Regression)
- `outputs/merged_barangay_dataset.csv` — barangay-level table used by the app
- `outputs/family_predictions.csv` — per-family predictions
- `outputs/stacking_confusion_matrix.png`, `stacking_*_feature_importance.png`, `stacking_classification_report.txt`

## 4. Run the dashboard
python -m streamlit run app.py


Open the URL the terminal prints (usually http://localhost:8501).

**Note:** use `python -m streamlit run app.py`, not the bare `streamlit run app.py`.
On Windows, `pip install --user` puts `streamlit.exe` in a folder that isn't on PATH,
so the bare command fails with *"streamlit is not recognized"*. Going through
`python -m` skips the PATH lookup.

On the page:

- Click a pin on the map, or pick a barangay from the sidebar.
- The right panel shows the predicted income tier, indicators, and recommended aid programs.

Stop with `Ctrl+C` in the terminal.

## Troubleshooting

- **`streamlit is not recognized`** — use `python -m streamlit run app.py` (see note above).
- **`ModuleNotFoundError: xgboost`** — re-run step 2; xgboost is needed by the training script.
- **`Run python build_stacking_model.py first`** banner in the app — the model artifact or merged CSV is missing. Run step 3.
