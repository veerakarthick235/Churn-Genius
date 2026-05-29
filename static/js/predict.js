/* ═══════════════════════════════════════════
   predict.js — Prediction Tab Logic
   ═══════════════════════════════════════════ */

let shapChartInst = null;
let lastResult    = null;
let lastFormData  = null;

document.addEventListener('DOMContentLoaded', () => {
  const form    = document.getElementById('predictionForm');
  const loading = document.getElementById('loadingState');
  const btn     = document.getElementById('analyzeBtn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    btn.disabled = true;
    loading.style.display = 'flex';

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    lastFormData = data;

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (res.ok) {
        lastResult = result;
        showResults(result, data);
        addToHistory(data, result);
      } else {
        showError(result.error || 'Prediction failed');
      }
    } catch (err) {
      console.error(err);
      showError('Network error — is the server running?');
    } finally {
      btn.disabled = false;
      loading.style.display = 'none';
    }
  });
});

function showResults(result, formData) {
  document.getElementById('predictPlaceholder').classList.add('hidden');
  document.getElementById('predictResults').classList.remove('hidden');

  const prob = result.probability;
  const pct  = (prob * 100).toFixed(1);

  // ─── Gauge ───
  animateGauge(prob);
  document.getElementById('gaugePct').textContent = pct + '%';

  // ─── Risk Badge ───
  const badge     = document.getElementById('riskBadge');
  const riskText  = document.getElementById('riskText');
  const riskClasses = ['risk-critical','risk-high','risk-medium','risk-low'];
  badge.classList.remove(...riskClasses);

  const riskMap = {
    'Critical': { cls: 'risk-critical', icon: '🔴', urgency: 'URGENT ACTION' },
    'High':     { cls: 'risk-high',     icon: '🟡', urgency: 'HIGH PRIORITY' },
    'Medium':   { cls: 'risk-medium',   icon: '🟠', urgency: 'MONITOR'       },
    'Low':      { cls: 'risk-low',      icon: '🟢', urgency: 'NO ACTION'     }
  };

  const rm = riskMap[result.risk] || riskMap['Low'];
  badge.classList.add(rm.cls);
  riskText.textContent = result.risk + ' Risk';

  // Urgency tag
  document.getElementById('urgencyTag').textContent = rm.urgency;

  // Rec icon
  const recIcons = { Critical: '🚨', High: '⚠️', Medium: '📋', Low: '✅' };
  document.getElementById('recIcon').textContent = recIcons[result.risk] || '💡';

  // ─── Confidence Bar ───
  const conf = ((result.confidence || 0) * 100).toFixed(1);
  document.getElementById('confidenceVal').textContent = conf + '%';
  setTimeout(() => {
    document.getElementById('confidenceFill').style.width = conf + '%';
  }, 200);

  // ─── Recommendation ───
  document.getElementById('recAction').textContent = result.action;
  document.getElementById('recReason').textContent = result.reason;

  // ─── SHAP Chart ───
  renderShapChart(result.top_features);
}

function animateGauge(targetProb) {
  let current = 0;
  const duration = 900;
  const start    = performance.now();

  const draw = (now) => {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3);
    current = targetProb * ease;
    CG.drawGauge('gaugeChart', current);
    if (progress < 1) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}

function renderShapChart(features) {
  if (shapChartInst) { shapChartInst.destroy(); shapChartInst = null; }

  const labels = features.map(f => truncateLabel(f.feature, 22));
  const data   = features.map(f => parseFloat(f.impact.toFixed(4)));
  const colors = data.map(v => v > 0 ? 'rgba(255,77,109,0.75)' : 'rgba(0,210,160,0.75)');

  shapChartInst = CG.createHorizontalBar('shapChart', labels, data, colors, 'SHAP Impact');
}

function truncateLabel(label, maxLen) {
  return label.length > maxLen ? label.substring(0, maxLen) + '…' : label;
}

function showError(msg) {
  document.getElementById('predictPlaceholder').classList.remove('hidden');
  document.getElementById('predictResults').classList.add('hidden');
  document.getElementById('predictPlaceholder').innerHTML = `
    <div class="placeholder-icon">⚠️</div>
    <div class="placeholder-text" style="color:var(--danger)">${msg}</div>
  `;
}

// ─── PDF Export ───
async function exportToPdf() {
  if (!lastResult) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const prob = (lastResult.probability * 100).toFixed(1);
  const now  = new Date().toLocaleString();

  // Header
  doc.setFillColor(7, 11, 20);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setFontSize(22);
  doc.setTextColor(108, 99, 255);
  doc.text('ChurnGenius', 20, 22);

  doc.setFontSize(11);
  doc.setTextColor(136, 146, 176);
  doc.text('Customer Churn Analysis Report', 20, 30);
  doc.text('Generated: ' + now, 20, 37);

  // Divider
  doc.setDrawColor(108, 99, 255);
  doc.setLineWidth(0.4);
  doc.line(20, 42, 190, 42);

  // Risk Score
  doc.setFontSize(14);
  doc.setTextColor(240, 244, 255);
  doc.text('Risk Assessment', 20, 54);

  doc.setFontSize(32);
  const riskColor = { Critical: [255,77,109], High: [247,201,72], Medium: [255,140,66], Low: [0,210,160] };
  const rc = riskColor[lastResult.risk] || [108,99,255];
  doc.setTextColor(...rc);
  doc.text(prob + '%', 20, 68);

  doc.setFontSize(13);
  doc.text(lastResult.risk + ' Risk', 20, 76);

  // Customer Details
  if (lastFormData) {
    doc.setFontSize(13);
    doc.setTextColor(240, 244, 255);
    doc.text('Customer Profile', 20, 92);
    doc.setFontSize(10);
    doc.setTextColor(136, 146, 176);
    const fields = [
      ['Contract', lastFormData.Contract],
      ['Tenure', lastFormData.tenure + ' months'],
      ['Monthly Charges', '$' + lastFormData.MonthlyCharges],
      ['Total Charges', '$' + lastFormData.TotalCharges],
      ['Internet Service', lastFormData.InternetService],
      ['Tech Support', lastFormData.TechSupport],
      ['Payment Method', lastFormData.PaymentMethod]
    ];
    fields.forEach(([k, v], i) => {
      doc.setTextColor(136, 146, 176);
      doc.text(k + ':', 20, 100 + i * 7);
      doc.setTextColor(240, 244, 255);
      doc.text(String(v), 80, 100 + i * 7);
    });
  }

  // AI Recommendation
  doc.setFontSize(13);
  doc.setTextColor(240, 244, 255);
  doc.text('AI Recommendation', 20, 162);

  doc.setFontSize(11);
  doc.setTextColor(108, 99, 255);
  const actionLines = doc.splitTextToSize(lastResult.action, 170);
  doc.text(actionLines, 20, 170);

  doc.setFontSize(10);
  doc.setTextColor(136, 146, 176);
  const reasonLines = doc.splitTextToSize('Reason: ' + lastResult.reason, 170);
  doc.text(reasonLines, 20, 178 + (actionLines.length - 1) * 6);

  // SHAP Features
  if (lastResult.top_features && lastResult.top_features.length) {
    const y0 = 200;
    doc.setFontSize(13);
    doc.setTextColor(240, 244, 255);
    doc.text('Top Risk Factors (SHAP)', 20, y0);
    doc.setFontSize(9);
    lastResult.top_features.slice(0, 6).forEach((f, i) => {
      const impact = f.impact > 0 ? '+' + f.impact.toFixed(4) : f.impact.toFixed(4);
      const col = f.impact > 0 ? [255,77,109] : [0,210,160];
      doc.setTextColor(136, 146, 176);
      doc.text(f.feature, 20, y0 + 8 + i * 7);
      doc.setTextColor(...col);
      doc.text(impact, 150, y0 + 8 + i * 7);
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(74, 85, 120);
  doc.text('ChurnGenius — AI Retention Analytics Platform', 20, 285);

  doc.save(`ChurnGenius_Report_${Date.now()}.pdf`);
}
