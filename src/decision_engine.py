def generate_recommendation(churn_prob, customer_data):
    """
    Generates business recommendations based on churn probability and customer profile.
    
    Args:
        churn_prob (float): Probability of churn (0-1).
        customer_data (dict): Dictionary of customer features.
        
    Returns:
        dict: { 'risk_level': str, 'action': str, 'reason': str }
    """
    
    risk_level = "Low"
    if churn_prob > 0.7:
        risk_level = "Critical"
    elif churn_prob > 0.4:
        risk_level = "High"
    elif churn_prob > 0.2:
        risk_level = "Medium"
        
    action = "No immediate action required."
    reason = "Customer is happy."
    
    contract = customer_data.get('Contract', 'Month-to-month')
    monthly = float(customer_data.get('MonthlyCharges', 0))
    internet = customer_data.get('InternetService', 'No')
    tenure = int(customer_data.get('tenure', 0))
    support = customer_data.get('TechSupport', 'No')
    
    if risk_level in ["Critical", "High"]:
        if contract == "Month-to-month":
            action = "Offer 20% discount on 1-Year Contract."
            reason = "Customer is on a flexible contract and highly likely to leave."
        elif monthly > 80:
            action = "Suggest 'Basic' plan downgrade or bundle deal."
            reason = "High monthly bill is a pain point."
        elif support == "No":
            action = "Offer 3 months free Premium Tech Support."
            reason = "Lack of support services identified as risk factor."
        elif internet == "Fiber optic":
            action = "Check for service outages/speed issues."
            reason = "Fiber optic users typically churn due to performance."
        else:
            action = "Personalized Retention Call."
            reason = "High risk detected with multiple factors."
            
    elif risk_level == "Medium":
        if tenure < 6:
            action = "Send 'Welcome' engagement email series."
            reason = "New customer risk."
        else:
            action = "Send loyalty perk (e.g., streaming add-on)."
            reason = "Proactive retention."
            
    return {
        "risk_level": risk_level,
        "action": action,
        "reason": reason
    }
