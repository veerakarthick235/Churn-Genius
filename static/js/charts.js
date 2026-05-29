/* ═══════════════════════════════════════════
   charts.js — Shared Chart.js Configuration
   ═══════════════════════════════════════════ */

window.CG = window.CG || {};

CG.chartDefaults = {
  color: {
    accent:   '#6c63ff',
    accent2:  '#3ecfff',
    danger:   '#ff4d6d',
    warning:  '#f7c948',
    success:  '#00d2a0',
    orange:   '#ff8c42',
    grid:     'rgba(255,255,255,0.06)',
    text:     '#8892b0',
    textPrimary: '#f0f4ff'
  }
};

const C = CG.chartDefaults.color;

// Set Chart.js global defaults
Chart.defaults.color = C.text;
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 12;

/**
 * Create a horizontal bar chart (for SHAP, feature importance)
 */
CG.createHorizontalBar = (canvasId, labels, data, colors, title = '') => {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: title,
        data,
        backgroundColor: colors,
        borderWidth: 0,
        borderRadius: 5,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1526',
          borderColor: 'rgba(108,99,255,0.3)',
          borderWidth: 1,
          titleColor: C.textPrimary,
          bodyColor: C.text,
          padding: 10,
          callbacks: {
            label: ctx => ` ${ctx.formattedValue}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: C.grid },
          ticks: { color: C.text }
        },
        y: {
          grid: { display: false },
          ticks: { color: C.textPrimary, font: { size: 11 } }
        }
      }
    }
  });
};

/**
 * Create a donut chart
 */
CG.createDonut = (canvasId, labels, data, colors) => {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + '99'),
        borderColor: colors,
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      animation: { duration: 800, easing: 'easeOutBack' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1526',
          borderColor: 'rgba(108,99,255,0.3)',
          borderWidth: 1,
          titleColor: C.textPrimary,
          bodyColor: C.text,
          padding: 10
        }
      }
    }
  });
};

/**
 * Create a vertical bar chart (for contract/internet churn)
 */
CG.createVerticalBar = (canvasId, labels, data, colors) => {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + '80'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1526',
          borderColor: 'rgba(108,99,255,0.3)',
          borderWidth: 1,
          titleColor: C.textPrimary,
          bodyColor: C.text,
          callbacks: {
            label: ctx => ` ${ctx.formattedValue}% churn rate`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: C.text, font: { size: 10 } }
        },
        y: {
          grid: { color: C.grid },
          ticks: { color: C.text, callback: v => v + '%' },
          max: 100
        }
      }
    }
  });
};

/**
 * Draw a semi-circle gauge on a canvas
 */
CG.drawGauge = (canvasId, probability) => {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H - 10;
  const r  = Math.min(W, H * 2) / 2 - 14;

  ctx.clearRect(0, 0, W, H);

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0, false);
  ctx.lineWidth = 14;
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Colored arc based on probability
  const angle = Math.PI + (probability * Math.PI);
  let color;
  if (probability < 0.25) color = '#00d2a0';
  else if (probability < 0.45) color = '#ff8c42';
  else if (probability < 0.70) color = '#f7c948';
  else color = '#ff4d6d';

  const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
  grad.addColorStop(0, '#00d2a0');
  grad.addColorStop(0.5, '#f7c948');
  grad.addColorStop(1, '#ff4d6d');

  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, angle, false);
  ctx.lineWidth = 14;
  ctx.strokeStyle = grad;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Needle
  const needleAngle = Math.PI + (probability * Math.PI);
  const nx = cx + (r - 20) * Math.cos(needleAngle);
  const ny = cy + (r - 20) * Math.sin(needleAngle);

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
};

/**
 * Animate a number counter
 */
CG.animateCount = (el, target, suffix = '', duration = 1000, isFloat = false) => {
  const start = 0;
  const startTime = performance.now();
  const update = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * ease;
    el.textContent = isFloat ? current.toFixed(1) + suffix : Math.round(current) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
};
