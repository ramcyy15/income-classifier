# How to Start This Project

Follow these steps in order.

## 1. Install Python

Make sure Python 3.10 or newer is installed.

Check with:

```
python --version
```

## 2. Install the required libraries

Open a terminal in the project folder and run:

```
python -m pip install pandas numpy scikit-learn matplotlib joblib shapely streamlit plotly
```

## 3. Check that the data is there (Skip mo na  to)

Inside the data folder you should see these subfolders:

```
data/income
data/employement
data/education
data/health
data/population
```

Each contains the PSA CSV files. If any are missing, download them again from psa.gov.ph.

## 4. Prepare the map file (Skip niyo nato provided ko na)

The map needs a GeoJSON of the 17 Philippine regions.

1. Go to github.com/faeldon/philippines-json-maps
2. Open the folder 2023/geojson/provdists/lowres
3. Download all 17 files named provdists-region-XXXXXXXXX.0.01.json
4. Put them inside the folder data/geo
5. From the project folder, run:

```
python build_regions_geojson.py
```

This will create one file named ph_regions.geojson inside data/geo.

## 5. Train the model

Run:

```
python build_model.py
```

When it finishes, check the outputs folder. You should see the metrics file, the confusion matrix images, and a file called best_model.joblib inside the models folder.

## 6. Start the dashboard

Run:

```
python -m streamlit run app.py
```

Open the link shown in the terminal (usually http://localhost:8501).

On the dashboard:

- Hover over a region to see its indicators.
- Click a region to see the predicted income class and the recommended aid programs.
- Use the sidebar dropdown if you want to pick a region without clicking the map.

## 7. Stop the dashboard

In the terminal where Streamlit is running, press Ctrl and C at the same time.
