@echo off
echo ==========================================
echo       ChurnGenius - Startup Script
echo ==========================================

echo [1/3] Installing Dependencies...
pip install -r requirements.txt

echo [2/3] Training Model & Generating Artifacts...
python src/model.py

echo [3/3] Starting Web Dashboard...
echo Open http://127.0.0.1:5000 in your browser.
python app.py
