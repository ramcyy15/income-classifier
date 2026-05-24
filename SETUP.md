# Setup

District V (Novaliches, QC) Family Income Dashboard.

## 1. Install Python 3.10 or newer

```
python --version
```

## 2. Install libraries

```
python -m pip install pandas numpy scikit-learn xgboost shap mapie matplotlib joblib streamlit plotly openpyxl google-genai
```

## 3. Build the barangay polygons (one time)

```
python build_regions_geojson.py
```

Writes data/geo/qc5_polygons.geojson from OpenStreetMap.
Skip this if the file already exists.

## 4. Train the model

```
python build_stacking_model.py
```

Writes:

- models/stacking_model.joblib
- outputs/merged_barangay_dataset.csv
- outputs/family_predictions.csv
- outputs/shap_by_barangay.csv
- outputs/stacking_confusion_matrix.png
- outputs/stacking_rf_feature_importance.png
- outputs/stacking_xgb_feature_importance.png
- outputs/stacking_classification_report.txt

## 5. Generate policy briefs (optional)

```
python build_briefs.py
```

Writes outputs/policy_briefs.json.
Needs a Gemini API key. Set GEMINI_API_KEY in your environment, or create a .env file in the project root with one line:

```
GEMINI_API_KEY=your_key_here
```

Get a free key at https://aistudio.google.com/apikey.
The app still runs without this file. The recommendations panel will just be empty.

## 6. Run the dashboard

```
python -m streamlit run app.py
```

Open the URL the terminal prints, usually http://localhost:8501.

Note: use python -m streamlit run app.py, not the bare streamlit run app.py.
On Windows, pip install --user puts streamlit.exe in a folder that is not on PATH, so the bare command fails with "streamlit is not recognized". Going through python -m skips the PATH lookup.

On the page:

- Click a pin on the map, or pick a barangay from the sidebar.
- The right panel shows the predicted income tier, indicators, and recommended aid programs.

Stop with Ctrl+C in the terminal.

## Troubleshooting

- streamlit is not recognized: use python -m streamlit run app.py.
- ModuleNotFoundError for xgboost, shap, mapie, or google.genai: re-run step 2.
- "Run python build_stacking_model.py first" banner in the app: the model file or merged CSV is missing. Run step 4.
- Empty map or missing polygons: run step 3.
- ERROR: set GEMINI_API_KEY when running build_briefs.py: add the key to your environment or .env file. See step 5.
