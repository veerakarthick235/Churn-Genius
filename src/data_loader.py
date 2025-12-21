import pandas as pd
import numpy as np

def load_data(filepath):
    """Loads the CSV data."""
    df = pd.read_csv(filepath)
    return df

def clean_data(df):
    """Performs basic cleaning."""
    # Ensure TotalCharges is numeric, coerce errors (empty strings become NaN)
    df['TotalCharges'] = pd.to_numeric(df['TotalCharges'], errors='coerce')
    
    # Fill missing TotalCharges with median
    df['TotalCharges'].fillna(df['TotalCharges'].median(), inplace=True)
    
    # Drops customerID as it is not predictive
    if 'customerID' in df.columns:
        df = df.drop(columns=['customerID'])
        
    return df
