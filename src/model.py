import pandas as pd
import numpy as np
import xgboost as xgb
import sys
# Hack to prevent shap from importing torch, which is causing DLL errors on this machine
# and is not needed for XGBoost TreeExplainer.
sys.modules['torch'] = None
import shap
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
try:
    from src.data_loader import load_data, clean_data
    from src.feature_eng import get_preprocessor
except ImportError:
    # For running as script directly
    from data_loader import load_data, clean_data
    from feature_eng import get_preprocessor

MODEL_DIR = "models"
DATA_PATH = "data/raw_data.csv"

def train_and_save():
    # 1. Load Data
    print("Loading data...")
    df = load_data(DATA_PATH)
    df = clean_data(df)
    
    # 2. Split X, y
    target = 'Churn'
    X = df.drop(columns=[target])
    y = df[target].apply(lambda x: 1 if x == 'Yes' else 0)
    
    # Identify feature types
    cat_features = X.select_dtypes(include=['object']).columns.tolist()
    num_features = X.select_dtypes(include=['int64', 'float64']).columns.tolist()
    
    # 3. Preprocessing
    print("Preprocessing...")
    preprocessor = get_preprocessor(cat_features, num_features)
    
    X_processed = preprocessor.fit_transform(X)
    feature_names = (preprocessor.named_transformers_['num'].get_feature_names_out(num_features).tolist() + 
                     preprocessor.named_transformers_['cat'].get_feature_names_out(cat_features).tolist())
    
    # Create DataFrame for SHAP/XGBoost consistency
    X_processed_df = pd.DataFrame(X_processed, columns=feature_names)

    # 4. Train Test Split
    X_train, X_test, y_train, y_test = train_test_split(X_processed_df, y, test_size=0.2, random_state=42)
    
    # 5. Train XGBoost
    print("Training XGBoost...")
    model = xgb.XGBClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=5,
        random_state=42,
        use_label_encoder=False,
        eval_metric='logloss'
    )
    model.fit(X_train, y_train)
    
    # 6. Evaluate
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"Model Accuracy: {acc:.4f}")
    print(classification_report(y_test, preds))
    
    # 7. Explainability (SHAP)
    print("Generating SHAP explainer...")
    explainer = shap.TreeExplainer(model)
    
    # 8. Save Artifacts
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
        
    joblib.dump(model, os.path.join(MODEL_DIR, "model.pkl"))
    joblib.dump(preprocessor, os.path.join(MODEL_DIR, "preprocessor.pkl"))
    joblib.dump(explainer, os.path.join(MODEL_DIR, "explainer.pkl"))
    joblib.dump(feature_names, os.path.join(MODEL_DIR, "feature_names.pkl"))
    
    print("All artifacts saved successfully.")

if __name__ == "__main__":
    train_and_save()
