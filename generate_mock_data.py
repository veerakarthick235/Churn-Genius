import pandas as pd
import numpy as np
import random

def generate_customer_data(n_samples=5000):
    np.random.seed(42)
    random.seed(42)

    data = {
        'customerID': [f'{random.randint(1000,9999)}-{random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ")}{random.randint(100,999)}' for _ in range(n_samples)],
        'gender': np.random.choice(['Male', 'Female'], n_samples),
        'SeniorCitizen': np.random.choice([0, 1], n_samples, p=[0.8, 0.2]),
        'Partner': np.random.choice(['Yes', 'No'], n_samples),
        'Dependents': np.random.choice(['Yes', 'No'], n_samples),
        'tenure': np.random.randint(1, 73, n_samples),
        'PhoneService': np.random.choice(['Yes', 'No'], n_samples, p=[0.9, 0.1]),
        'MultipleLines': np.random.choice(['Yes', 'No', 'No phone service'], n_samples),
        'InternetService': np.random.choice(['DSL', 'Fiber optic', 'No'], n_samples),
        'OnlineSecurity': np.random.choice(['Yes', 'No', 'No internet service'], n_samples),
        'OnlineBackup': np.random.choice(['Yes', 'No', 'No internet service'], n_samples),
        'DeviceProtection': np.random.choice(['Yes', 'No', 'No internet service'], n_samples),
        'TechSupport': np.random.choice(['Yes', 'No', 'No internet service'], n_samples),
        'StreamingTV': np.random.choice(['Yes', 'No', 'No internet service'], n_samples),
        'StreamingMovies': np.random.choice(['Yes', 'No', 'No internet service'], n_samples),
        'Contract': np.random.choice(['Month-to-month', 'One year', 'Two year'], n_samples, p=[0.55, 0.25, 0.20]),
        'PaperlessBilling': np.random.choice(['Yes', 'No'], n_samples),
        'PaymentMethod': np.random.choice(['Electronic check', 'Mailed check', 'Bank transfer (automatic)', 'Credit card (automatic)'], n_samples),
        'MonthlyCharges': np.round(np.random.uniform(18.25, 118.75, n_samples), 2)
    }

    df = pd.DataFrame(data)
    
    # Total Charges roughly Tenure * Monthly (with some variance)
    df['TotalCharges'] = df['tenure'] * df['MonthlyCharges'] + np.random.normal(0, 10, n_samples)
    df['TotalCharges'] = df['TotalCharges'].abs().round(2)

    # Churn Logic (Synthetic Relationship)
    # Higher churn if: Month-to-month, Fiber optic, No TechSupport, High Monthly Charges, Low Tenure
    churn_prob = np.zeros(n_samples)
    
    churn_prob += np.where(df['Contract'] == 'Month-to-month', 0.4, 0.0)
    churn_prob += np.where(df['InternetService'] == 'Fiber optic', 0.15, 0.0)
    churn_prob += np.where(df['TechSupport'] == 'No', 0.1, 0.0)
    churn_prob += np.where(df['tenure'] < 12, 0.1, -0.1)
    churn_prob += np.where(df['MonthlyCharges'] > 70, 0.1, 0.0)
    churn_prob += np.where(df['PaymentMethod'] == 'Electronic check', 0.1, 0.0)
    churn_prob -= np.where(df['Contract'] == 'Two year', 0.3, 0.0)
    
    # Sigmoid-ish scaling to 0-1 probability
    import scipy.special
    # Center around a bias
    bias = -1.5
    final_prob = scipy.special.expit(churn_prob + bias + np.random.normal(0, 0.5, n_samples))
    
    df['Churn'] = ["Yes" if p > 0.5 else "No" for p in final_prob]
    
    # Introduce some missing values
    df.loc[np.random.choice(df.index, 50), 'TotalCharges'] = np.nan
    
    return df

if __name__ == "__main__":
    print("Generating synthetic data...")
    df = generate_customer_data()
    output_path = "data/raw_data.csv"
    df.to_csv(output_path, index=False)
    print(f"Data saved to {output_path}")
    print(df.head())
    print(df['Churn'].value_counts(normalize=True))
