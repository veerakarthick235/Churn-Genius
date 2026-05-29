/* ═══════════════════════════════════════════
   insights.js — Model Insights Tab Logic
   ═══════════════════════════════════════════ */

let featureImportanceChart = null;

async function loadInsights() {
  await Promise.all([
    loadFeatureImportance(),
    loadModelInfo()
  ]);
}

async function loadFeatureImportance() {
  try {
    const res  = await fetch('/api/feature-importance');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    renderFeatureImportance(data.features || []);
  } catch (e) {
    console.error('Feature importance load error:', e);
  }
}

function renderFeatureImportance(features) {
  if (featureImportanceChart) {
    featureImportanceChart.destroy();
    featureImportanceChart = null;
  }

  const top12   = features.slice(0, 12);
  const labels  = top12.map(f => truncate(f.feature, 25));
  const data    = top12.map(f => parseFloat((f.importance * 100).toFixed(2)));

  // Gradient color scale: most important = vibrant accent, least = muted
  const colors = top12.map((_, i) => {
    const t = i / (top12.length - 1);
    return interpolateColor([108,99,255], [62,207,255], t);
  });

  featureImportanceChart = CG.createHorizontalBar(
    'featureImportanceChart',
    labels,
    data,
    colors,
    'Feature Importance (%)'
  );
}

function interpolateColor(c1, c2, t) {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  return `rgba(${r},${g},${b},0.8)`;
}

function truncate(str, max) {
  return str.length > max ? str.substring(0, max) + '…' : str;
}

async function loadModelInfo() {
  try {
    const res  = await fetch('/api/model-info');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    renderModelInfo(data);
  } catch (e) {
    console.error('Model info load error:', e);
  }
}

function renderModelInfo(info) {
  // Metrics
  animateMetric('mAccuracy',  info.accuracy,  '%');
  animateMetric('mPrecision', info.precision, '%');
  animateMetric('mRecall',    info.recall,    '%');
  animateMetric('mF1',        info.f1_score,  '%');
  animateMetric('mAUC',       info.auc_roc,   '%');

  const featEl = document.getElementById('mFeatures');
  if (featEl) CG.animateCount(featEl, info.features, '', 800);

  // Details
  setText('mAlgorithm', info.algorithm);
  setText('mExplain',   info.explainability);
  setText('mTraining',  (info.training_samples || 0).toLocaleString() + ' samples');
  setText('mDate',      info.last_trained || '--');
}

function animateMetric(id, value, suffix) {
  const el = document.getElementById(id);
  if (!el) return;
  CG.animateCount(el, value, suffix, 1000, true);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || '--';
}
