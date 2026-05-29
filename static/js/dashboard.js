/* ═══════════════════════════════════════════
   dashboard.js — Dashboard Tab Logic
   ═══════════════════════════════════════════ */

let contractChart = null;
let riskDonutChart = null;
let internetChart  = null;

async function loadDashboard() {
  try {
    const res  = await fetch('/api/stats');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    renderDashboard(data);
  } catch (e) {
    console.error('Dashboard load error:', e);
  }
}

function renderDashboard(data) {
  // ─── Stat Cards (animated counters) ───
  const churnRaw = data.churn_rate_raw || parseFloat(data.churn_rate) || 0;
  const revenueRaw = data.avg_revenue_raw || parseFloat(data.avg_revenue.replace('$','')) || 0;

  CG.animateCount(document.getElementById('statChurn'), churnRaw, '%', 1200, true);
  CG.animateCount(document.getElementById('statRevenue'), revenueRaw, '', 1200, true);
  document.getElementById('statRevenue').textContent = '$' + revenueRaw.toFixed(2);
  setTimeout(() => {
    document.getElementById('statRevenue').textContent = '$' + revenueRaw.toFixed(2);
  }, 50);
  CG.animateCount(document.getElementById('statRisk'), data.customers_at_risk, '', 1200);
  CG.animateCount(document.getElementById('statTotal'), data.total_customers, '', 1200);

  // Revenue counter special handling
  const revEl = document.getElementById('statRevenue');
  CG.animateCount(revEl, revenueRaw, '', 1200, true);
  setTimeout(() => { revEl.textContent = '$' + revenueRaw.toFixed(2); }, 1300);

  // ─── Contract Churn Bar Chart ───
  const contractData = data.contract_churn || {};
  const cLabels = Object.keys(contractData);
  const cValues = Object.values(contractData);
  const cColors = cValues.map(v => v > 40 ? '#ff4d6d' : v > 20 ? '#f7c948' : '#00d2a0');

  if (contractChart) contractChart.destroy();
  contractChart = CG.createVerticalBar('contractChurnChart', cLabels, cValues, cColors);

  // ─── Risk Distribution Donut ───
  const dist = data.risk_distribution || {};
  const rLabels = ['Critical', 'High', 'Medium', 'Low'];
  const rValues = rLabels.map(l => dist[l] || 0);
  const rColors = ['#ff4d6d', '#f7c948', '#ff8c42', '#00d2a0'];

  if (riskDonutChart) riskDonutChart.destroy();
  riskDonutChart = CG.createDonut('riskDonutChart', rLabels, rValues, rColors);

  // Update legend
  document.getElementById('legendCritical').textContent = (dist['Critical'] || 0).toLocaleString();
  document.getElementById('legendHigh').textContent     = (dist['High'] || 0).toLocaleString();
  document.getElementById('legendMedium').textContent   = (dist['Medium'] || 0).toLocaleString();
  document.getElementById('legendLow').textContent      = (dist['Low'] || 0).toLocaleString();

  // ─── Revenue at Risk Meter ───
  const atRisk = data.revenue_at_risk || 0;
  const totalRevenue = (data.avg_revenue_raw || 0) * (data.total_customers || 1);
  const riskPct = totalRevenue > 0 ? Math.min((atRisk / totalRevenue) * 100, 100) : 0;

  document.getElementById('revenueAtRisk').textContent = '$' + atRisk.toLocaleString('en-US', {minimumFractionDigits:0, maximumFractionDigits:0});
  setTimeout(() => {
    document.getElementById('revenueBar').style.width = riskPct.toFixed(1) + '%';
  }, 300);

  // ─── Internet Service Churn Chart ───
  const internetData = data.internet_churn || {};
  const iLabels = Object.keys(internetData);
  const iValues = Object.values(internetData);
  const iColors = iValues.map(v => v > 40 ? '#ff4d6d' : v > 20 ? '#f7c948' : '#6c63ff');

  if (internetChart) internetChart.destroy();
  internetChart = CG.createVerticalBar('internetChurnChart', iLabels, iValues, iColors);

  // ─── Load history from localStorage ───
  renderHistory();
}

// ─── Prediction History ───
function addToHistory(formData, result) {
  const history = JSON.parse(localStorage.getItem('cg_history') || '[]');
  history.unshift({
    contract:    formData.Contract,
    tenure:      formData.tenure,
    monthly:     formData.MonthlyCharges,
    probability: result.probability,
    risk:        result.risk,
    action:      result.action,
    time:        new Date().toLocaleTimeString()
  });
  if (history.length > 20) history.pop();
  localStorage.setItem('cg_history', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('cg_history') || '[]');
  const tbody = document.getElementById('historyBody');

  if (!history.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-table">No predictions yet — run an analysis in the Predict tab.</td></tr>`;
    return;
  }

  tbody.innerHTML = history.map((h, i) => {
    const pct = (h.probability * 100).toFixed(1);
    const riskClass = `chip chip-${h.risk.toLowerCase()}`;
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${h.contract}</td>
        <td>${h.tenure} mo</td>
        <td>$${parseFloat(h.monthly).toFixed(2)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;max-width:80px;height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:${h.probability > 0.7 ? '#ff4d6d' : h.probability > 0.4 ? '#f7c948' : '#00d2a0'};border-radius:2px"></div>
            </div>
            <span>${pct}%</span>
          </div>
        </td>
        <td><span class="${riskClass}">${h.risk}</span></td>
        <td style="font-size:0.8rem;color:var(--text-secondary);max-width:200px">${h.action}</td>
        <td style="color:var(--text-muted);font-size:0.78rem">${h.time}</td>
      </tr>
    `;
  }).join('');
}
