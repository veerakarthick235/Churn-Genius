document.addEventListener('DOMContentLoaded', () => {
    fetchStats();

    const form = document.getElementById('predictionForm');
    const loading = document.getElementById('loading');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Show loading
        loading.style.display = 'block';

        // Collect data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                updateDashboard(result);
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during prediction.');
        } finally {
            loading.style.display = 'none';
        }
    });
});

async function fetchStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();

        document.getElementById('statChurn').textContent = data.churn_rate;
        document.getElementById('statRevenue').textContent = data.avg_revenue;
        document.getElementById('statRisk').textContent = data.customers_at_risk;
        document.getElementById('statTotal').textContent = data.total_customers;
    } catch (e) {
        console.error("Failed to fetch stats", e);
    }
}

let shapChart = null;

function updateDashboard(result) {
    // 1. Update Probability Bar
    const probPercent = (result.probability * 100).toFixed(1) + '%';
    const probFill = document.getElementById('probFill');
    const probValue = document.getElementById('probValue');

    probFill.style.width = probPercent;
    probValue.textContent = probPercent;

    // Color based on risk
    let color = 'var(--success-color)'; // Low
    if (result.risk === 'Critical') color = 'var(--danger-color)';
    else if (result.risk === 'High') color = 'var(--warning-color)';

    probFill.style.background = color;

    // 2. Update Risk Badge
    const riskBadge = document.getElementById('riskBadge');
    riskBadge.textContent = result.risk + ' Risk';
    riskBadge.className = 'risk-badge'; // reset
    riskBadge.classList.add('risk-' + result.risk.toLowerCase());

    // 3. Recommendation
    document.getElementById('recText').textContent = result.action;
    document.getElementById('reasonText').textContent = result.reason;

    // 4. Update Chart
    updateChart(result.top_features);
}

function updateChart(features) {
    const ctx = document.getElementById('shapChart').getContext('2d');

    // Prepare data
    const labels = features.map(f => f.feature);
    const data = features.map(f => f.impact);
    const colors = data.map(v => v > 0 ? '#f85149' : '#238636'); // Red for positive impact (bad for churn), Green for negative

    if (shapChart) {
        shapChart.destroy();
    }

    shapChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'SHAP Value (Impact on Churn)',
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal bar
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(240, 246, 252, 0.1)'
                    },
                    ticks: { color: '#8b949e' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#f0f6fc' }
                }
            }
        }
    });
}
