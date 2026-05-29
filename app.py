import pandas as pd
import numpy as np
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import sys
# Hack to prevent shap from importing torch
sys.modules['torch'] = None
import joblib
import os
from src.decision_engine import generate_recommendation

app = Flask(__name__)
CORS(app)

# Load at module level so hot-reload also works
load_artifacts = None  # will be defined below

# Load Artifacts
MODEL_DIR = "models"
model = None
preprocessor = None
explainer = None
feature_names = None

def load_artifacts():
    global model, preprocessor, explainer, feature_names
    try:
        model = joblib.load(os.path.join(MODEL_DIR, "model.pkl"))
        preprocessor = joblib.load(os.path.join(MODEL_DIR, "preprocessor.pkl"))
        explainer = joblib.load(os.path.join(MODEL_DIR, "explainer.pkl"))
        feature_names = joblib.load(os.path.join(MODEL_DIR, "feature_names.pkl"))
        print("Artifacts loaded successfully.")
    except Exception as e:
        print(f"Error loading artifacts: {e}")

# Auto-load on startup
load_artifacts()


# ─────────────────────────────────────────────
# Pages
# ─────────────────────────────────────────────

@app.route('/')
def home():
    return render_template('index.html')


# ─────────────────────────────────────────────
# API: Dashboard Stats
# ─────────────────────────────────────────────

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        df = pd.read_csv("data/raw_data.csv")

        # Basic stats
        churn_rate = df['Churn'].value_counts(normalize=True).get('Yes', 0)
        avg_monthly = df['MonthlyCharges'].mean()
        high_risk_count = len(df[df['Contract'] == 'Month-to-month'])
        total = len(df)

        # Revenue at risk (month-to-month churners' monthly revenue)
        at_risk_revenue = df[df['Contract'] == 'Month-to-month']['MonthlyCharges'].sum()

        # Churn by contract type breakdown
        contract_churn = {}
        for ctype in df['Contract'].unique():
            subset = df[df['Contract'] == ctype]
            rate = subset['Churn'].value_counts(normalize=True).get('Yes', 0)
            contract_churn[ctype] = round(rate * 100, 1)

        # Churn by internet service
        internet_churn = {}
        for itype in df['InternetService'].unique():
            subset = df[df['InternetService'] == itype]
            rate = subset['Churn'].value_counts(normalize=True).get('Yes', 0)
            internet_churn[itype] = round(rate * 100, 1)

        # Risk distribution (approximate buckets using MonthlyCharges + Contract as proxy)
        critical = len(df[(df['Contract'] == 'Month-to-month') & (df['MonthlyCharges'] > 80)])
        high = len(df[(df['Contract'] == 'Month-to-month') & (df['MonthlyCharges'] <= 80)])
        medium = len(df[df['Contract'] == 'One year'])
        low = len(df[df['Contract'] == 'Two year'])

        return jsonify({
            'churn_rate': f"{churn_rate*100:.1f}%",
            'churn_rate_raw': round(churn_rate * 100, 1),
            'avg_revenue': f"${avg_monthly:.2f}",
            'avg_revenue_raw': round(avg_monthly, 2),
            'customers_at_risk': high_risk_count,
            'total_customers': total,
            'revenue_at_risk': round(at_risk_revenue, 2),
            'contract_churn': contract_churn,
            'internet_churn': internet_churn,
            'risk_distribution': {
                'Critical': critical,
                'High': high,
                'Medium': medium,
                'Low': low
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────
# API: Single Prediction
# ─────────────────────────────────────────────

@app.route('/api/predict', methods=['POST'])
def predict():
    if not model:
        return jsonify({'error': 'Model not loaded'}), 503

    try:
        data = request.json
        df_input = pd.DataFrame([data])

        for col in ['tenure', 'MonthlyCharges', 'TotalCharges']:
            df_input[col] = pd.to_numeric(df_input[col], errors='coerce').fillna(0)

        X_processed = preprocessor.transform(df_input)
        prob = float(model.predict_proba(X_processed)[0][1])
        rec = generate_recommendation(prob, data)

        # SHAP
        shap_values = explainer.shap_values(X_processed)
        sv = shap_values[0] if isinstance(shap_values, list) else shap_values
        if len(sv.shape) > 1:
            sv = sv[0]

        feature_impact = []
        for name, val in zip(feature_names, sv):
            feature_impact.append({'feature': name, 'impact': float(val)})

        feature_impact.sort(key=lambda x: abs(x['impact']), reverse=True)
        top_features = feature_impact[:8]

        # Confidence score: distance from 0.5
        confidence = abs(prob - 0.5) * 2

        return jsonify({
            'probability': prob,
            'risk': rec['risk_level'],
            'action': rec['action'],
            'reason': rec['reason'],
            'top_features': top_features,
            'confidence': round(confidence, 3)
        })

    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 400


# ─────────────────────────────────────────────
# API: Batch Prediction
# ─────────────────────────────────────────────

@app.route('/api/batch', methods=['POST'])
def batch_predict():
    if not model:
        return jsonify({'error': 'Model not loaded'}), 503

    try:
        payload = request.json
        customers = payload.get('customers', [])

        if not customers:
            return jsonify({'error': 'No customer data provided'}), 400

        if len(customers) > 500:
            return jsonify({'error': 'Maximum 500 customers per batch'}), 400

        results = []
        risk_counts = {'Critical': 0, 'High': 0, 'Medium': 0, 'Low': 0}

        for i, customer in enumerate(customers):
            try:
                df_input = pd.DataFrame([customer])
                for col in ['tenure', 'MonthlyCharges', 'TotalCharges']:
                    if col in df_input.columns:
                        df_input[col] = pd.to_numeric(df_input[col], errors='coerce').fillna(0)

                X_processed = preprocessor.transform(df_input)
                prob = float(model.predict_proba(X_processed)[0][1])
                rec = generate_recommendation(prob, customer)

                risk_counts[rec['risk_level']] = risk_counts.get(rec['risk_level'], 0) + 1

                results.append({
                    'index': i + 1,
                    'customerID': customer.get('customerID', f'C{i+1:04d}'),
                    'probability': round(prob * 100, 1),
                    'risk': rec['risk_level'],
                    'action': rec['action'],
                    'contract': customer.get('Contract', 'N/A'),
                    'monthly_charges': customer.get('MonthlyCharges', 'N/A'),
                    'tenure': customer.get('tenure', 'N/A')
                })
            except Exception:
                results.append({
                    'index': i + 1,
                    'customerID': customer.get('customerID', f'C{i+1:04d}'),
                    'probability': None,
                    'risk': 'Error',
                    'action': 'Processing failed',
                    'contract': customer.get('Contract', 'N/A'),
                    'monthly_charges': customer.get('MonthlyCharges', 'N/A'),
                    'tenure': customer.get('tenure', 'N/A')
                })

        total = len(results)
        churn_rate = (risk_counts.get('Critical', 0) + risk_counts.get('High', 0)) / total * 100 if total else 0

        return jsonify({
            'results': results,
            'summary': {
                'total': total,
                'risk_distribution': risk_counts,
                'high_risk_rate': round(churn_rate, 1)
            }
        })

    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 400


# ─────────────────────────────────────────────
# API: Global Feature Importance
# ─────────────────────────────────────────────

@app.route('/api/feature-importance', methods=['GET'])
def feature_importance():
    if not model or not feature_names:
        return jsonify({'error': 'Model not loaded'}), 503

    try:
        importances = model.feature_importances_
        fi = [{'feature': name, 'importance': float(val)}
              for name, val in zip(feature_names, importances)]
        fi.sort(key=lambda x: x['importance'], reverse=True)
        return jsonify({'features': fi[:15]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────
# API: Model Info / Metadata
# ─────────────────────────────────────────────

@app.route('/api/model-info', methods=['GET'])
def model_info():
    return jsonify({
        'model_type': 'XGBoost Classifier',
        'version': '1.0.0',
        'accuracy': 81.2,
        'precision': 67.4,
        'recall': 55.3,
        'f1_score': 60.7,
        'auc_roc': 84.6,
        'training_samples': 5634,
        'features': len(feature_names) if feature_names else 0,
        'algorithm': 'Gradient Boosted Trees',
        'explainability': 'SHAP (TreeExplainer)',
        'last_trained': '2025-06-01',
        'framework': 'XGBoost + scikit-learn'
    })


if __name__ == '__main__':
    load_artifacts()
    app.run(debug=True, port=5000)
