@echo off
title QC District V Income Classifier Dashboard
echo =======================================================
echo Starting QC District V Income Classifier Application
echo =======================================================

echo [1/2] Launching FastAPI Backend on http://localhost:8000 ...
start "FastAPI Backend" cmd /k "python -m uvicorn api.server:app --port 8000 --reload"

echo [2/2] Launching React Vite Frontend on http://localhost:5173 ...
cd frontend
start "React Frontend" cmd /k "npm run dev"

echo.
echo Application started!
echo Frontend: http://localhost:5173
echo Backend API Docs: http://localhost:8000/docs
echo =======================================================
pause
