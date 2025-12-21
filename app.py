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

# Load Artifacts
MODEL_DIR = "models"
model = None
preprocessor = None
explainer = None
feature_names = None

def load_artifacts():
    global model, preprocessor, explainer, feature_names
    # Basic error handling for missing models
    try:
        model = joblib.load(os.path.join(MODEL_DIR, "model.pkl"))
        preprocessor = joblib.load(os.path.join(MODEL_DIR, "preprocessor.pkl"))
        explainer = joblib.load(os.path.join(MODEL_DIR, "explainer.pkl"))
        feature_names = joblib.load(os.path.join(MODEL_DIR, "feature_names.pkl"))
        print("Artifacts loaded successfully.")
    except Exception as e:
        print(f"Error loading artifacts: {e}")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/stats', methods=['GET'])
def get_stats():
    # In a real app, this would query a DB. 
    # Here we'll just read the CSV again for demo purposes.
    try:
        df = pd.read_csv("data/raw_data.csv")
        churn_rate = df['Churn'].value_counts(normalize=True).get('Yes', 0)
        avg_monthly = df['MonthlyCharges'].mean()
        high_risk_count = len(df[df['Contract'] == 'Month-to-month'])
        
        return jsonify({
            'churn_rate': f"{churn_rate*100:.1f}%",
            'avg_revenue': f"${avg_monthly:.2f}",
            'customers_at_risk': high_risk_count,
            'total_customers': len(df)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict', methods=['POST'])
def predict():
    if not model:
        return jsonify({'error': 'Model not loaded'}), 503
        
    try:
        data = request.json
        # Convert to DataFrame
        df_input = pd.DataFrame([data])
        
        # Preprocess
        # Ensure numeric columns are numeric
        for col in ['tenure', 'MonthlyCharges', 'TotalCharges']:
            df_input[col] = pd.to_numeric(df_input[col], errors='coerce').fillna(0)
            
        X_processed = preprocessor.transform(df_input)
        
        # Predict
        prob = float(model.predict_proba(X_processed)[0][1])
        
        # Recommendation
        rec = generate_recommendation(prob, data)
        
        # SHAP
        # explainer is a TreeExplainer
        # transform returns numpy array, we need to pass that
        shap_values = explainer.shap_values(X_processed)
        
        # If binary classification, shap_values might be a list of 2 arrays, or just one
        # For XGBoost binary: usually it returns raw log odds margin for class 1? 
        # Or if we use predict_proba? 
        # TreeExplainer usually returns matrix.
        
        sv = shap_values[0] if isinstance(shap_values, list) else shap_values
        if len(sv.shape) > 1:
            # Multi-class or other shape, take first sample
            sv = sv[0]
            
        # Get top 5 impacting features
        feature_impact = []
        for name, val in zip(feature_names, sv):
            feature_impact.append({'feature': name, 'impact': float(val)})
            
        # Sort by absolute impact
        feature_impact.sort(key=lambda x: abs(x['impact']), reverse=True)
        top_features = feature_impact[:5]
        
        return jsonify({
            'probability': prob,
            'risk': rec['risk_level'],
            'action': rec['action'],
            'reason': rec['reason'],
            'top_features': top_features
        })
        
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    load_artifacts()
    app.run(debug=True, port=5000)
