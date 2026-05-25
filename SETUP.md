# Setup

District V (Novaliches, Quezon City) Family Income Dashboard.

## 1. Install Python 3.10 or newer

```
python --version
```

## 2. Install the libraries

```
python -m pip install pandas numpy scikit-learn xgboost shap mapie matplotlib joblib streamlit plotly openpyxl google-genai
```

## 3. Build the map (one time only)

```
python build_regions_geojson.py
```

Skip this if `data/geo/qc5_polygons.geojson` already exists.

## 4. Train the tool

```
python build_stacking_model.py
```

This creates the trained model and all the output files in `models/` and `outputs/`.

## 5. Generate AI policy briefs (optional)

```
python build_briefs.py
```

Needs a free Gemini API key. Put it in a `.env` file in this folder:

```
GEMINI_API_KEY=your_key_here
```

Get a free key at https://aistudio.google.com/apikey. The dashboard still works without this step — the policy-brief panel will just be empty.

## 6. Run the dashboard

```
python -m streamlit run app.py
```

Open the URL the terminal prints (usually http://localhost:8501). Stop with `Ctrl+C`.

On the page: click a pin on the map or pick a barangay from the sidebar. The right panel shows the classification, the indicators, and the intervention planner.

## Troubleshooting

- **`streamlit is not recognized`** → use `python -m streamlit run app.py` (not the bare `streamlit run`).
- **`ModuleNotFoundError`** → re-run step 2.
- **"Run python build_stacking_model.py first" banner** → the model file is missing. Run step 4.
- **Empty map or missing polygons** → run step 3.
- **`ERROR: set GEMINI_API_KEY`** → put your key in a `.env` file. See step 5.
