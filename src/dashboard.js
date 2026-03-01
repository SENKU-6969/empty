/* ====================================================
   EduMetStore AI — Dashboard Logic (Firebase/Firestore)
   ==================================================== */

let chart = null;
let currentFilter = 'all';
let allTests = [];

// ---- Test Category Presets ----
const TEST_PRESETS = {
  'jee-main': {
    label: 'JEE Main',
    badge: 'JEE MAIN',
    maxMarks: 300,
    subjectMax: { P: 100, C: 100, M: 100 },
    locked: true,
    info: '📋 JEE Main · 300 Marks total · Physics 100 | Chemistry 100 | Maths 100'
  },
  'jee-adv-2p': {
    label: 'JEE Advanced (2 Papers)',
    badge: 'ADV 2P',
    maxMarks: 360,
    subjectMax: { P: 120, C: 120, M: 120 },
    locked: false,
    info: '📋 JEE Advanced 2 Papers · Default 360 Marks · Physics 120 | Chemistry 120 | Maths 120 (editable)'
  },
  'jee-adv-1p': {
    label: 'JEE Advanced (1 Paper)',
    badge: 'ADV 1P',
    maxMarks: 180,
    subjectMax: { P: 60, C: 60, M: 60 },
    locked: false,
    info: '📋 JEE Advanced 1 Paper · Default 180 Marks · Physics 60 | Chemistry 60 | Maths 60 (editable)'
  },
  'cet': {
    label: 'CET (MHT-CET)',
    badge: 'CET',
    maxMarks: 200,
    subjectMax: { P: 50, C: 50, M: 100 },
    locked: true,
    info: '📋 MHT-CET · 200 Marks total · Physics 50 | Chemistry 50 | Maths 100'
  },
  'other': {
    label: 'Other',
    badge: 'OTHER',
    maxMarks: null,
    subjectMax: null,
    locked: false,
    info: '📋 Custom test — set your own max marks'
  }
};

// Auth guard — everything starts here
requireAuth(async (user) => {
  document.getElementById('addTestBtn').addEventListener('click', openModal);
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  const dateInput = document.getElementById('testDate');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  showLoader(true);
  await seedDemoData();
  await loadDashboard();
  showLoader(false);
});

async function loadDashboard() {
  allTests = await getTestsSortedByDate();
  updateStats(allTests);
  renderChart(getFilteredTests());
  renderTestList(allTests);
  renderAIAnnotations(allTests);
}

function getFilteredTests() {
  if (currentFilter === 'last5') return allTests.slice(-5);
  if (currentFilter === 'last10') return allTests.slice(-10);
  return allTests;
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderChart(getFilteredTests());
}

// ---- Stats ----
function updateStats(tests) {
  document.getElementById('statTests').textContent = tests.length;
  if (!tests.length) return;
  const avgPct = Math.round(tests.reduce((s, t) => s + t.percentage, 0) / tests.length);
  document.getElementById('statAvgMarks').textContent = avgPct + '%';
  const ranked = tests.filter(t => t.rank !== null);
  if (ranked.length) document.getElementById('statBestRank').textContent = '#' + Math.min(...ranked.map(t => t.rank));
  if (tests.length >= 2) {
    const delta = tests[tests.length - 1].percentage - tests[tests.length - 2].percentage;
    const trendEl = document.getElementById('statTrend');
    if (delta > 0) { trendEl.textContent = '↑ ' + Math.abs(delta).toFixed(1) + '%'; trendEl.style.color = 'var(--neon-green)'; }
    else if (delta < 0) { trendEl.textContent = '↓ ' + Math.abs(delta).toFixed(1) + '%'; trendEl.style.color = 'var(--neon-red)'; }
    else { trendEl.textContent = '→ Stable'; trendEl.style.color = 'var(--neon-amber)'; }
  }
}

let showMarks = true;
let showRank = true;

function toggleChartDataset(datasetName) {
  if (datasetName === 'marks') showMarks = !showMarks;
  if (datasetName === 'rank') showRank = !showRank;

  // ensure at least one is visible
  if (!showMarks && !showRank) {
    showMarks = true;
    showRank = true;
  }

  // Update UI toggles
  document.getElementById('legendMarks').style.opacity = showMarks ? '1' : '0.4';
  document.getElementById('legendRank').style.opacity = showRank ? '1' : '0.4';

  renderChart(getFilteredTests());
}

// ---- Chart ----
function renderChart(tests) {
  const canvas = document.getElementById('performanceChart');
  const emptyEl = document.getElementById('chartEmpty');
  if (!tests.length) { emptyEl.style.display = 'flex'; if (chart) { chart.destroy(); chart = null; } return; }
  emptyEl.style.display = 'none';

  const labels = tests.map(t => t.name.length > 15 ? t.name.slice(0, 13) + '…' : t.name);
  const ctx = canvas.getContext('2d');
  const blueGrad = ctx.createLinearGradient(0, 0, 0, 340);
  blueGrad.addColorStop(0, 'rgba(59,130,246,0.3)'); blueGrad.addColorStop(1, 'rgba(59,130,246,0.02)');
  const redGrad = ctx.createLinearGradient(0, 0, 0, 340);
  redGrad.addColorStop(0, 'rgba(239,68,68,0.25)'); redGrad.addColorStop(1, 'rgba(239,68,68,0.01)');

  if (chart) chart.destroy();

  const datasets = [];
  if (showMarks) {
    datasets.push({ label: 'Marks', data: tests.map(t => t.marks), borderColor: '#3B82F6', backgroundColor: blueGrad, borderWidth: 2.5, pointRadius: 6, pointHoverRadius: 9, pointBackgroundColor: '#3B82F6', pointBorderColor: '#0B0F14', pointBorderWidth: 2, tension: 0.35, fill: true, yAxisID: 'y' });
  }
  if (showRank) {
    datasets.push({ label: 'Rank', data: tests.map(t => t.rank), borderColor: '#EF4444', backgroundColor: redGrad, borderWidth: 2.5, pointRadius: 6, pointHoverRadius: 9, pointBackgroundColor: '#EF4444', pointBorderColor: '#0B0F14', pointBorderWidth: 2, tension: 0.35, fill: true, yAxisID: 'y1' });
  }

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      onClick: (evt, elements) => { if (elements.length) openDeepDive(tests[elements[0].index].id); },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17,24,39,0.97)', borderColor: 'rgba(59,130,246,0.35)', borderWidth: 1,
          titleColor: '#E5E7EB', bodyColor: '#9CA3AF', padding: 14,
          callbacks: {
            title: items => tests[items[0].dataIndex]?.name || '',
            afterBody: items => { const t = tests[items[0].dataIndex]; return t ? [`📅 ${formatDate(t.date)}`, `↗ Click to open Deep Dive`] : []; }
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 11 } } },
        y: { display: showMarks, type: 'linear', position: 'left', grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#3B82F6', font: { family: 'JetBrains Mono', size: 11 } }, title: { display: true, text: '← Marks', color: '#3B82F6', font: { size: 11 } } },
        y1: { display: showRank, type: 'linear', position: 'right', reverse: true, grid: { drawOnChartArea: false }, min: 1, ticks: { color: '#EF4444', font: { family: 'JetBrains Mono', size: 11 } }, title: { display: true, text: 'Rank →', color: '#EF4444', font: { size: 11 } } }
      }
    }
  });
}

// ---- AI Annotations ----
function renderAIAnnotations(tests) {
  const sorted = [...tests].sort((a, b) => new Date(a.date) - new Date(b.date));
  const annotations = getGraphAIAnnotations(sorted);
  const banner = document.getElementById('aiBanner');
  if (annotations.length) {
    // Use innerHTML instead of textContent to correctly render the SVG icons
    document.getElementById('aiBannerText').innerHTML = annotations.map(a => a.msg).join('  •  ');
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

// ---- Test List ----
function renderTestList(tests) {
  const list = document.getElementById('testsList');
  const empty = document.getElementById('testsEmpty');
  document.getElementById('testsCount').textContent = tests.length + ' test' + (tests.length !== 1 ? 's' : '');
  const sorted = [...tests].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!sorted.length) { list.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  list.innerHTML = sorted.map(t => {
    const preset = t.category ? TEST_PRESETS[t.category] : null;
    const badge = preset ? `<span class="category-badge category-badge--${t.category}">${preset.badge}</span>` : '';
    return `
    <div class="test-row" onclick="openDeepDive('${t.id}')">
      <div class="test-row-indicator"></div>
      <div style="flex:1; min-width:0;">
        <div class="test-row-name">${t.name} ${badge}</div>
        <div class="test-row-date">${formatDate(t.date)}</div>
      </div>
      <div class="test-row-marks"><div class="test-row-score">${t.marks}</div><div class="test-row-max">/ ${t.maxMarks}</div></div>
      <div class="test-row-rank"><div class="test-row-rank-val">${t.rank ? '#' + t.rank : '—'}</div><div class="test-row-rank-label">Rank</div></div>
      <div class="test-row-pct">${t.percentage}%</div>
      <div class="test-row-arrow">›</div>
    </div>`;
  }).join('');
}

// ---- Modal ----
function openModal() { document.getElementById('addTestModal').style.display = 'flex'; document.getElementById('testName').focus(); }
function closeModal() {
  document.getElementById('addTestModal').style.display = 'none';
  document.getElementById('addTestForm').reset();
  document.getElementById('percentage').value = '';
  document.getElementById('presetInfoRow').style.display = 'none';
  const maxInput = document.getElementById('maxMarks');
  maxInput.readOnly = false;
  maxInput.style.opacity = '';
  maxInput.placeholder = 'Select a category first';
}

function applyPreset() {
  const category = document.getElementById('testCategory').value;
  const infoRow = document.getElementById('presetInfoRow');
  const infoEl = document.getElementById('presetInfo');
  const maxInput = document.getElementById('maxMarks');

  if (!category) {
    infoRow.style.display = 'none';
    maxInput.readOnly = false;
    maxInput.style.opacity = '';
    maxInput.value = '';
    maxInput.placeholder = 'Select a category first';
    return;
  }

  const preset = TEST_PRESETS[category];
  infoEl.textContent = preset.info;
  infoRow.style.display = 'block';

  if (preset.locked) {
    maxInput.value = preset.maxMarks;
    maxInput.readOnly = true;
    maxInput.style.opacity = '0.6';
  } else {
    maxInput.readOnly = false;
    maxInput.style.opacity = '';
    if (preset.maxMarks) {
      maxInput.value = preset.maxMarks;
      maxInput.placeholder = 'e.g. ' + preset.maxMarks;
    } else {
      maxInput.value = '';
      maxInput.placeholder = 'Enter max marks';
    }
  }
  autoCalcPercentage();
}

function autoCalcPercentage() {
  const marks = parseFloat(document.getElementById('marksObtained').value);
  const max = parseFloat(document.getElementById('maxMarks').value);
  if (marks >= 0 && max > 0) document.getElementById('percentage').value = ((marks / max) * 100).toFixed(1) + '%';
}

async function handleAddTest(e) {
  e.preventDefault();
  const name = document.getElementById('testName').value.trim();
  const date = document.getElementById('testDate').value;
  const category = document.getElementById('testCategory').value;
  const maxMarks = parseFloat(document.getElementById('maxMarks').value);
  const marks = parseFloat(document.getElementById('marksObtained').value);
  const rank = document.getElementById('testRank').value || null;
  const percentage = parseFloat(((marks / maxMarks) * 100).toFixed(1));
  const test = newTest({ name, date, maxMarks, marks, rank, percentage, category });
  await saveTest(test);
  closeModal();
  await loadDashboard();
  showToast('Test added! Click it to open Deep Dive <img src="src/icons/icon-avatar.svg" class="svg-icon" alt="avatar">');
}

function openDeepDive(testId) { window.location.href = `deep-dive.html?id=${testId}`; }

// ---- Loader ----
function showLoader(show) {
  let loader = document.getElementById('pageLoader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'pageLoader';
    loader.style.cssText = 'position:fixed;inset:0;background:var(--bg-primary);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;';
    loader.innerHTML = `<div style="font-size:48px;"><img src="src/icons/icon-logo.svg" class="svg-icon" alt="logo"></div><div style="color:var(--neon-blue);font-size:14px;font-weight:600;">Loading your data…</div><div style="width:200px;height:3px;background:var(--bg-surface-3);border-radius:2px;overflow:hidden;"><div style="height:100%;background:var(--neon-blue);animation:loadBar 1.2s ease-in-out infinite;border-radius:2px;"></div></div><style>@keyframes loadBar{0%{width:0;margin-left:0}50%{width:100%;margin-left:0}100%{width:0;margin-left:100%}}</style>`;
    document.body.appendChild(loader);
  }
  loader.style.display = show ? 'flex' : 'none';
}

// ---- Toast ----
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;background:var(--bg-surface);border:1px solid var(--border-glow);padding:14px 20px;border-radius:var(--radius-md);font-size:13px;color:var(--text-primary);box-shadow:0 8px 30px rgba(0,0,0,0.5);max-width:320px;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

// ---- PDF Export ----
async function exportDashboard() {
  const btn = document.getElementById('exportBtn');
  btn.disabled = true; btn.textContent = '⏳ Exporting…';
  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const canvas = await html2canvas(document.getElementById('exportTarget'), { scale: 2, backgroundColor: '#111827', logging: false });
    const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
    pdf.setFillColor(11, 15, 20); pdf.rect(0, 0, W, H, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18); pdf.setTextColor(59, 130, 246);
    pdf.text('EduMetrics AI — Performance Report', 14, 14);
    pdf.setFontSize(10); pdf.setTextColor(136, 146, 164);
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, 14, 21);
    const imgH = (canvas.height / canvas.width) * (W - 28);
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 14, 28, W - 28, Math.min(imgH, H - 60));
    const tests = (await getTestsSortedByDate()).reverse();
    if (tests.length) {
      pdf.addPage(); pdf.setFillColor(11, 15, 20); pdf.rect(0, 0, W, H, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(59, 130, 246); pdf.text('Test History', 14, 16);
      let y = 26; pdf.setFontSize(9); pdf.setTextColor(156, 163, 175);
      pdf.text('Test', 14, y); pdf.text('Date', 90, y); pdf.text('Marks', 130, y); pdf.text('%', 155, y); pdf.text('Rank', 170, y);
      y += 2; pdf.setDrawColor(30, 35, 55); pdf.line(14, y, W - 14, y); y += 6;
      for (const t of tests) {
        if (y > H - 14) { pdf.addPage(); y = 14; }
        pdf.setTextColor(232, 237, 245); pdf.text(t.name.slice(0, 35), 14, y);
        pdf.setTextColor(156, 163, 175); pdf.text(formatDate(t.date), 90, y); pdf.text(`${t.marks}/${t.maxMarks}`, 130, y);
        pdf.text(`${t.percentage}%`, 155, y); pdf.text(t.rank ? `#${t.rank}` : '—', 170, y); y += 8;
      }
    }
    pdf.save('EduMetrics_Report.pdf');
    showToast('PDF exported! <img src="src/icons/icon-export.svg" class="svg-icon" alt="export">');
  } catch (err) { console.error(err); showToast('Export failed. Try again.'); }
  finally { btn.disabled = false; btn.innerHTML = '<span><img src="src/icons/icon-export.svg" class="svg-icon" alt="export"></span> Export PDF'; }
}
