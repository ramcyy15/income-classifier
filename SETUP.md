# QC District V Income Classifier & Decision Support System

A React + Tailwind CSS dashboard with a FastAPI machine learning backend for household income classification, poverty vulnerability ranking, and policy simulation across District V, Quezon City.

---

## Prerequisites

- **Python 3.10+**
- **Node.js 18+** & **npm**

---

## Setup & Installation

### 1. Python Backend Dependencies
```bash
pip install -r requirements.txt
```

### 2. Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## Running the Application

### Option A: Quick Start (Windows)
Double-click `start.bat` or run:
```bash
./start.bat
```

### Option B: Manual Start (Two Terminals)

**Terminal 1 (Backend API):**
```bash
python -m uvicorn api.server:app --port 8000 --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

- **Dashboard UI:** [http://localhost:5173](http://localhost:5173)
- **API Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Retraining the Model (Optional)

To rebuild the barangay stacking ensemble model (Random Forest + XGBoost -> Logistic Regression):
```bash
python train_barangay_model.py
```
The model is saved to `models/barangay_stacking_model.joblib`.
