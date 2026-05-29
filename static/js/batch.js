/* ═══════════════════════════════════════════
   batch.js — Batch Analysis Tab Logic
   ═══════════════════════════════════════════ */

let batchResults = [];

document.addEventListener('DOMContentLoaded', () => {
  const zone    = document.getElementById('uploadZone');
  const fileIn  = document.getElementById('fileInput');

  if (!zone || !fileIn) return;

  // ─── Drag & Drop ───
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) processFile(file);
    else alert('Please drop a valid CSV file.');
  });

  // ─── File Input ───
  fileIn.addEventListener('change', () => {
    const file = fileIn.files[0];
    if (file) processFile(file);
  });
});

function processFile(file) {
  document.getElementById('fileNameLabel').textContent = '📄 ' + file.name;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (parsed) => {
      const customers = parsed.data;
      if (!customers.length) {
        alert('CSV file is empty or missing headers.');
        return;
      }

      // Fill missing fields with defaults
      const withDefaults = customers.map(c => ({
        DeviceProtection: 'No',
        OnlineBackup:     'No',
        StreamingTV:      'No',
        StreamingMovies:  'No',
        PaperlessBilling: 'Yes',
        Partner:          'No',
        Dependents:       'No',
        PhoneService:     'Yes',
        MultipleLines:    'No',
        gender:           'Female',
        SeniorCitizen:    '0',
        ...c
      }));

      await runBatch(withDefaults);
    },
    error: (err) => alert('CSV parse error: ' + err.message)
  });
}

async function runBatch(customers) {
  const progress     = document.getElementById('batchProgress');
  const progressFill = document.getElementById('progressFill');
  const progressPct  = document.getElementById('progressPct');
  const progressLbl  = document.getElementById('progressLabel');

  // Hide previous results
  document.getElementById('batchSummary').classList.add('hidden');
  document.getElementById('batchResultsCard').classList.add('hidden');

  // Show progress
  progress.style.display = 'flex';
  progressFill.style.width = '0%';
  progressPct.textContent = '0%';
  progressLbl.textContent = `Processing ${customers.length} customers...`;

  // Simulate progress animation while waiting
  let fakeProgress = 0;
  const fakeInterval = setInterval(() => {
    fakeProgress = Math.min(fakeProgress + 2, 85);
    progressFill.style.width = fakeProgress + '%';
    progressPct.textContent  = fakeProgress + '%';
  }, 80);

  try {
    const res = await fetch('/api/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customers })
    });

    clearInterval(fakeInterval);
    progressFill.style.width = '100%';
    progressPct.textContent  = '100%';
    progressLbl.textContent  = 'Complete!';

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Batch failed');

    batchResults = data.results;
    renderBatchResults(data);

    setTimeout(() => { progress.style.display = 'none'; }, 800);

  } catch (err) {
    clearInterval(fakeInterval);
    progress.style.display = 'none';
    alert('Batch error: ' + err.message);
  }
}

function renderBatchResults(data) {
  const summary = data.summary || {};
  const dist    = summary.risk_distribution || {};
  const results = data.results || [];

  // ─── Summary Cards ───
  document.getElementById('bSum-total').textContent    = summary.total || 0;
  document.getElementById('bSum-critical').textContent = dist.Critical || 0;
  document.getElementById('bSum-high').textContent     = dist.High || 0;
  document.getElementById('bSum-low').textContent      = dist.Low || 0;

  document.getElementById('batchSummary').classList.remove('hidden');

  // ─── Results Table ───
  const tbody = document.getElementById('batchBody');
  tbody.innerHTML = results.map(r => {
    const riskClass = `chip chip-${(r.risk || 'error').toLowerCase()}`;
    const probDisplay = r.probability !== null ? r.probability + '%' : 'N/A';
    const probBar = r.probability !== null
      ? `<div style="display:flex;align-items:center;gap:6px">
           <div style="width:50px;height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden">
             <div style="width:${r.probability}%;height:100%;background:${probColor(r.probability)};border-radius:2px"></div>
           </div>
           <span>${probDisplay}</span>
         </div>`
      : '<span style="color:var(--text-muted)">Error</span>';

    return `
      <tr>
        <td style="color:var(--text-muted)">${r.index}</td>
        <td style="font-weight:500">${r.customerID}</td>
        <td>${r.contract || '--'}</td>
        <td>${r.tenure || '--'}</td>
        <td>$${parseFloat(r.monthly_charges || 0).toFixed(2)}</td>
        <td>${probBar}</td>
        <td><span class="${riskClass}">${r.risk || 'Error'}</span></td>
        <td style="font-size:0.8rem;color:var(--text-secondary)">${r.action || '--'}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('batchResultsCard').classList.remove('hidden');
}

function probColor(pct) {
  if (pct >= 70) return '#ff4d6d';
  if (pct >= 40) return '#f7c948';
  if (pct >= 20) return '#ff8c42';
  return '#00d2a0';
}

// ─── CSV Export ───
function exportBatchCSV() {
  if (!batchResults.length) return;

  const headers = ['#', 'Customer ID', 'Contract', 'Tenure', 'Monthly Charges', 'Churn Probability (%)', 'Risk Level', 'Recommended Action'];
  const rows = batchResults.map(r => [
    r.index,
    r.customerID,
    r.contract,
    r.tenure,
    r.monthly_charges,
    r.probability !== null ? r.probability : 'N/A',
    r.risk,
    `"${(r.action || '').replace(/"/g, '""')}"`
  ]);

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `ChurnGenius_Batch_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
