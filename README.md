# ⚡ ChurnGenius — AI Retention Analytics Platform

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/Flask-2.3.0-black?style=for-the-badge&logo=flask&logoColor=white"/>
  <img src="https://img.shields.io/badge/XGBoost-2.0.0-orange?style=for-the-badge&logo=xgboost&logoColor=white"/>
  <img src="https://img.shields.io/badge/SHAP-Explainable_AI-purple?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/AUC--ROC-84.6%25-success?style=for-the-badge"/>
</p>

> **Enterprise-grade customer churn prediction and retention analytics powered by XGBoost and SHAP Explainable AI.**  
> Goes beyond raw prediction — delivers **risk scoring, automated business recommendations, and global/local model explainability** through a production-ready Flask API and a fully interactive dashboard.

---

## 🖥️ Dashboard Preview

| Tab | Description |
|-----|-------------|
| 📊 **Dashboard** | Live KPIs — churn rate, revenue at risk, risk distribution donut, contract/internet churn charts, and prediction history |
| 🔮 **Predict** | Single-customer analysis with a gauge chart, SHAP waterfall bar chart, AI recommendation, and PDF export |
| 📂 **Batch Analysis** | Drag-and-drop CSV upload for up to 500 customers — returns risk scores, actions, and exportable results |
| 🧠 **Insights** | Global feature importance, full model performance metrics, and the end-to-end pipeline diagram |

---

## 🚀 Key Features

- 🤖 **XGBoost Churn Prediction** — Gradient-boosted classifier trained on 5,634 telecom customers
- 📊 **SHAP Explainability** — Per-prediction local explanations via `TreeExplainer`; global feature importances on the Insights tab
- 🎯 **4-Tier Risk Scoring** — Customers bucketed into `Critical / High / Medium / Low` based on churn probability
- 💡 **Automated Decision Engine** — Rule-based recommendation system generates targeted retention actions (contract upgrades, discounts, support offers)
- 📂 **Batch Processing API** — Upload a CSV; get churn probabilities and actions for up to 500 records in one call
- 📄 **PDF Report Export** — One-click PDF export of individual prediction results via `jsPDF` + `html2canvas`
- 📈 **Live Dashboard KPIs** — Churn rate, avg. revenue/user, customers at risk, revenue at risk, contract-level breakdown
- 🌐 **RESTful Flask API** — Clean, versioned endpoints; CORS-enabled for easy frontend integration

---

## 🧠 ML Model Performance

| Metric | Score |
|--------|-------|
| Accuracy | **81.2%** |
| Precision | 67.4% |
| Recall | 55.3% |
| F1 Score | 60.7% |
| **AUC-ROC** | **84.6%** |
| Training Samples | 5,634 |
| Feature Count | Dynamic (from `feature_names.pkl`) |

**Algorithm:** XGBoost (`Gradient Boosted Trees`)  
**Explainability:** SHAP `TreeExplainer`  
**Framework:** XGBoost + scikit-learn Pipeline

---

## ⚙️ Architecture & Pipeline

```
Raw CSV Data
    │
    ▼
Preprocessing (scikit-learn ColumnTransformer)
    │  ├─ Numeric: StandardScaler
    │  └─ Categorical: OneHotEncoder
    ▼
Feature Engineering
    │
    ▼
XGBoost Classifier  ──────────────────────────────┐
    │                                              │
    ▼                                              ▼
Churn Probability                        SHAP TreeExplainer
    │                                              │
    ▼                                         Top-8 Feature
Decision Engine                             Impact Values
    │
    ▼
Risk Level + Retention Action
    │
    ▼
Flask REST API  →  Interactive Dashboard
```

---

## 🔌 API Reference

### `GET /api/stats`
Returns dashboard KPIs computed from the raw dataset.

**Response:**
```json
{
  "churn_rate": "26.5%",
  "avg_revenue": "$64.76",
  "customers_at_risk": 3875,
  "total_customers": 7043,
  "revenue_at_risk": 250483.25,
  "contract_churn": { "Month-to-month": 42.7, "One year": 11.3, "Two year": 2.8 },
  "internet_churn": { "Fiber optic": 41.9, "DSL": 18.9, "No": 7.4 },
  "risk_distribution": { "Critical": 980, "High": 2895, "Medium": 1472, "Low": 1696 }
}
```

---

### `POST /api/predict`
Predicts churn for a **single customer** with SHAP explanations and a retention recommendation.

**Request Body:**
```json
{
  "Contract": "Month-to-month",
  "tenure": 5,
  "MonthlyCharges": 85.50,
  "TotalCharges": 427.50,
  "InternetService": "Fiber optic",
  "TechSupport": "No",
  "OnlineSecurity": "No",
  "PaymentMethod": "Electronic check"
}
```

**Response:**
```json
{
  "probability": 0.847,
  "risk": "Critical",
  "action": "Offer 20% discount on 1-Year Contract.",
  "reason": "Customer is on a flexible contract and highly likely to leave.",
  "top_features": [
    { "feature": "Contract_Month-to-month", "impact": 0.62 },
    { "feature": "tenure", "impact": -0.41 }
  ],
  "confidence": 0.694
}
```

---

### `POST /api/batch`
Processes **up to 500 customers** from a JSON payload (typically parsed from a CSV upload).

**Request Body:**
```json
{
  "customers": [ { ...customer1 }, { ...customer2 } ]
}
```

**Response:**
```json
{
  "results": [
    {
      "index": 1,
      "customerID": "C001",
      "probability": 84.7,
      "risk": "Critical",
      "action": "Offer 20% discount on 1-Year Contract.",
      "contract": "Month-to-month",
      "monthly_charges": 85.5,
      "tenure": 5
    }
  ],
  "summary": {
    "total": 2,
    "risk_distribution": { "Critical": 1, "High": 0, "Medium": 1, "Low": 0 },
    "high_risk_rate": 50.0
  }
}
```

---

### `GET /api/feature-importance`
Returns the top-15 globally most important features from the trained XGBoost model.

---

### `GET /api/model-info`
Returns model metadata — type, version, accuracy metrics, training details.

---

## 📂 Project Structure

```
ChurnGenius/
├── app.py                      # Flask app — API routes & artifact loading
├── requirements.txt            # Python dependencies
├── generate_mock_data.py       # Script to generate synthetic training data
│
├── src/
│   └── decision_engine.py      # Rule-based retention recommendation logic
│
├── models/                     # Serialized model artifacts (git-ignored)
│   ├── model.pkl               # Trained XGBoost classifier
│   ├── preprocessor.pkl        # scikit-learn ColumnTransformer
│   ├── explainer.pkl           # SHAP TreeExplainer
│   └── feature_names.pkl       # Feature name list (post-encoding)
│
├── data/
│   └── raw_data.csv            # Source customer dataset
│
├── templates/
│   └── index.html              # Single-page dashboard (4-tab layout)
│
└── static/
    ├── css/
    │   └── style.css           # Full custom design system (dark theme)
    └── js/
        ├── charts.js           # Chart.js rendering utilities
        ├── dashboard.js        # Dashboard KPI + chart logic
        ├── predict.js          # Single prediction form + SHAP chart
        ├── batch.js            # CSV upload + batch results table
        └── insights.js         # Feature importance + model metrics
```

---

## ⚙️ Setup & Running Locally

### 1. Clone the repo
```bash
git clone https://github.com/veerakarthick235/Churn-Genius.git
cd Churn-Genius
```

### 2. Create a virtual environment
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Train the model (if `models/` artifacts are missing)
```bash
python generate_mock_data.py    # generates data/raw_data.csv if needed
# then run your training script to produce models/*.pkl
```

### 5. Start the server
```bash
python app.py
```

Open **http://localhost:5000** in your browser.

---

## 📋 CSV Format for Batch Upload

When using the **Batch Analysis** tab, your CSV must include these columns:

| Column | Type | Example |
|--------|------|---------|
| `customerID` | string | `C001` |
| `Contract` | string | `Month-to-month` / `One year` / `Two year` |
| `tenure` | integer | `12` |
| `MonthlyCharges` | float | `70.50` |
| `TotalCharges` | float | `846.00` |
| `InternetService` | string | `Fiber optic` / `DSL` / `No` |
| `TechSupport` | string | `Yes` / `No` |
| `OnlineSecurity` | string | `Yes` / `No` |
| `PaymentMethod` | string | `Electronic check` / `Credit card (automatic)` |

---

## 🎯 Decision Engine Logic

The `decision_engine.py` maps churn probability thresholds to risk tiers and then applies customer-specific retention actions:

| Churn Probability | Risk Level | Example Action |
|-------------------|------------|----------------|
| `> 0.70` | 🔴 Critical | Offer 20% discount on 1-Year Contract |
| `0.40 – 0.70` | 🟠 High | Bundle deal / Premium Tech Support offer |
| `0.20 – 0.40` | 🟡 Medium | Loyalty perk / Welcome email series |
| `< 0.20` | 🟢 Low | No immediate action required |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.10+, Flask 2.3, Flask-CORS |
| ML Model | XGBoost 2.0, scikit-learn 1.3 |
| Explainability | SHAP 0.42 (TreeExplainer) |
| Data | Pandas 2.0, NumPy 1.24 |
| Serialization | Joblib 1.3 |
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Charts | Chart.js 4.4 |
| CSV Parsing | PapaParse 5.4 |
| PDF Export | jsPDF 2.5 + html2canvas 1.4 |

---

## 👤 Author

**Veera Karthick**  
AI & Data Science Engineer  
[GitHub](https://github.com/veerakarthick235) · [LinkedIn](https://linkedin.com/in/veerakarthick235)

---

<p align="center">Built with ⚡ for production-grade churn intelligence.</p>
