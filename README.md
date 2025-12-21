# 🔮 AI Churn Prediction & Decision Intelligence System

A production-grade predictive analytics system that goes beyond churn prediction to deliver **risk assessment, explainable insights (SHAP), and automated decision recommendations** through a Flask API and interactive dashboard.

---

## 🚀 Key Features
- Customer churn prediction using ML
- Probability-based risk scoring
- Automated business recommendations
- Explainable AI with SHAP
- RESTful Flask API
- Dashboard statistics

---

## 🧠 Architecture
Data → Preprocessing → ML Model → Risk Scoring → Decision Engine → SHAP → API/Dashboard

---

## 📂 Project Structure
```
app.py
models/
 ├── model.pkl
 ├── preprocessor.pkl
 ├── explainer.pkl
 └── feature_names.pkl
src/
 └── decision_engine.py
data/
 └── raw_data.csv
templates/
 └── index.html
```

---

## 🔍 API Endpoints

### GET /api/stats
Returns churn rate, average revenue, and customer risk metrics.

### POST /api/predict
Predicts churn probability and returns business recommendations with SHAP explanations.

---

## ⚙️ Setup
```bash
pip install -r requirements.txt
python app.py
```

---

## 🎯 Why This Project
- End-to-end data science pipeline
- Explainable AI for business trust
- Production-ready design
- Recruiter & portfolio optimized

---

## 👤 Author
**Veera Karthick**  
AI & Data Science Engineer
