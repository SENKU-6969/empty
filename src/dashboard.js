/* ====================================================
   EduMetrics AI — Dashboard Logic
   ==================================================== */

let chart = null;
let currentFilter = 'all';
let allTests = [];

window.addEventListener('DOMContentLoaded', () => {
    seedDemoData();
    loadDashboard();

    document.getElementById('addTestBtn').addEventListener('click', openModal);
    window.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // Set today's date as default
    const dateInput = document.getElementById('testDate');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
});

function loadDashboard() {
    allTests = getTestsSortedByDate();
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

    if (tests.length === 0) return;

    const avgPct = Math.round(tests.reduce((s, t) => s + t.percentage, 0) / tests.length);
    document.getElementById('statAvgMarks').textContent = avgPct + '%';

    const rankedTests = tests.filter(t => t.rank !== null);
    if (rankedTests.length > 0) {
        const bestRank = Math.min(...rankedTests.map(t => t.rank));
        document.getElementById('statBestRank').textContent = '#' + bestRank;
    }

    if (tests.length >= 2) {
        const last = tests[tests.length - 1];
        const prev = tests[tests.length - 2];
        const delta = last.percentage - prev.percentage;
        const trendEl = document.getElementById('statTrend');
        if (delta > 0) {
            trendEl.textContent = '↑ ' + Math.abs(delta).toFixed(1) + '%';
            trendEl.style.color = 'var(--neon-green)';
        } else if (delta < 0) {
            trendEl.textContent = '↓ ' + Math.abs(delta).toFixed(1) + '%';
            trendEl.style.color = 'var(--neon-red)';
        } else {
            trendEl.textContent = '→ Stable';
            trendEl.style.color = 'var(--neon-amber)';
        }
    }
}

// ---- Chart ----
function renderChart(tests) {
    const canvas = document.getElementById('performanceChart');
    const emptyEl = document.getElementById('chartEmpty');

    if (tests.length === 0) {
        emptyEl.style.display = 'flex';
        if (chart) { chart.destroy(); chart = null; }
        return;
    }
    emptyEl.style.display = 'none';

    const labels = tests.map(t => t.name.length > 15 ? t.name.slice(0, 13) + '…' : t.name);
    const marksData = tests.map(t => t.marks);
    const rankData = tests.map(t => t.rank);

    if (chart) chart.destroy();

    const ctx = canvas.getContext('2d');

    // Gradient fills
    const blueGrad = ctx.createLinearGradient(0, 0, 0, 340);
    blueGrad.addColorStop(0, 'rgba(0,180,255,0.3)');
    blueGrad.addColorStop(1, 'rgba(0,180,255,0.02)');

    const redGrad = ctx.createLinearGradient(0, 0, 0, 340);
    redGrad.addColorStop(0, 'rgba(255,61,90,0.3)');
    redGrad.addColorStop(1, 'rgba(255,61,90,0.02)');

    const maxRank = Math.max(...rankData.filter(r => r !== null), 100);

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Marks',
                    data: marksData,
                    borderColor: '#00b4ff',
                    backgroundColor: blueGrad,
                    borderWidth: 2.5,
                    pointRadius: 6,
                    pointHoverRadius: 9,
                    pointBackgroundColor: '#00b4ff',
                    pointBorderColor: '#07090f',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#00b4ff',
                    pointHoverBorderColor: '#fff',
                    tension: 0.35,
                    fill: true,
                    yAxisID: 'y',
                },
                {
                    label: 'Rank',
                    data: rankData,
                    borderColor: '#ff3d5a',
                    backgroundColor: redGrad,
                    borderWidth: 2.5,
                    pointRadius: 6,
                    pointHoverRadius: 9,
                    pointBackgroundColor: '#ff3d5a',
                    pointBorderColor: '#07090f',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#ff3d5a',
                    pointHoverBorderColor: '#fff',
                    tension: 0.35,
                    fill: true,
                    yAxisID: 'y1',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const test = tests[idx];
                    if (test) openDeepDive(test.id);
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(14,17,23,0.95)',
                    borderColor: 'rgba(0,180,255,0.3)',
                    borderWidth: 1,
                    titleColor: '#e8edf5',
                    bodyColor: '#8892a4',
                    padding: 14,
                    callbacks: {
                        title: items => tests[items[0].dataIndex]?.name || '',
                        afterBody: items => {
                            const test = tests[items[0].dataIndex];
                            if (!test) return [];
                            return [`📅 ${formatDate(test.date)}`, `💡 Click to open Deep Dive`];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#8892a4', font: { family: 'Inter', size: 11 } }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#00b4ff', font: { family: 'JetBrains Mono', size: 11 } },
                    title: { display: true, text: '← Marks', color: '#00b4ff', font: { size: 11 } }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    reverse: true,
                    grid: { drawOnChartArea: false },
                    min: 1,
                    ticks: { color: '#ff3d5a', font: { family: 'JetBrains Mono', size: 11 } },
                    title: { display: true, text: 'Rank →', color: '#ff3d5a', font: { size: 11 } }
                }
            }
        }
    });
}

// ---- AI Annotations ----
function renderAIAnnotations(tests) {
    const sorted = [...tests].sort((a, b) => new Date(a.date) - new Date(b.date));
    const annotations = getGraphAIAnnotations(sorted);
    const banner = document.getElementById('aiBanner');
    const bannerText = document.getElementById('aiBannerText');

    if (annotations.length > 0) {
        const msgs = annotations.map(a => a.msg).join('  •  ');
        bannerText.textContent = msgs;
        banner.style.display = 'flex';
    }
}

// ---- Test List ----
function renderTestList(tests) {
    const list = document.getElementById('testsList');
    const empty = document.getElementById('testsEmpty');
    const count = document.getElementById('testsCount');
    count.textContent = tests.length + ' test' + (tests.length !== 1 ? 's' : '');

    const sorted = [...tests].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sorted.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    list.innerHTML = sorted.map(t => `
    <div class="test-row" onclick="openDeepDive('${t.id}')" title="Click to open Deep Dive for ${t.name}">
      <div class="test-row-indicator"></div>
      <div style="flex:1; min-width:0;">
        <div class="test-row-name">${t.name}</div>
        <div class="test-row-date">${formatDate(t.date)}</div>
      </div>
      <div class="test-row-marks">
        <div class="test-row-score">${t.marks}</div>
        <div class="test-row-max">/ ${t.maxMarks}</div>
      </div>
      <div class="test-row-rank">
        <div class="test-row-rank-val">${t.rank ? '#' + t.rank : '—'}</div>
        <div class="test-row-rank-label">Rank</div>
      </div>
      <div class="test-row-pct">${t.percentage}%</div>
      <div class="test-row-arrow">›</div>
    </div>
  `).join('');
}

// ---- Modal ----
function openModal() {
    document.getElementById('addTestModal').style.display = 'flex';
    document.getElementById('testName').focus();
}

function closeModal() {
    document.getElementById('addTestModal').style.display = 'none';
    document.getElementById('addTestForm').reset();
    document.getElementById('percentage').value = '';
}

function autoCalcPercentage() {
    const marks = parseFloat(document.getElementById('marksObtained').value);
    const max = parseFloat(document.getElementById('maxMarks').value);
    if (marks >= 0 && max > 0) {
        document.getElementById('percentage').value = ((marks / max) * 100).toFixed(1) + '%';
    }
}

function handleAddTest(e) {
    e.preventDefault();
    const name = document.getElementById('testName').value.trim();
    const date = document.getElementById('testDate').value;
    const maxMarks = parseFloat(document.getElementById('maxMarks').value);
    const marks = parseFloat(document.getElementById('marksObtained').value);
    const rank = document.getElementById('testRank').value || null;
    const percentage = parseFloat(((marks / maxMarks) * 100).toFixed(1));

    const test = newTest({ name, date, maxMarks, marks, rank, percentage });
    saveTest(test);
    closeModal();
    loadDashboard();
    showToast('Test added! Click it to open Deep Dive 🎯');
}

// ---- Navigation ----
function openDeepDive(testId) {
    window.location.href = `deep-dive.html?id=${testId}`;
}

// ---- Toast ----
function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
      position:fixed; bottom:24px; right:24px; z-index:9999;
      background:var(--bg-surface); border:1px solid var(--border-glow);
      padding:14px 20px; border-radius:var(--radius-md);
      font-size:13px; color:var(--text-primary);
      box-shadow:0 8px 30px rgba(0,0,0,0.5);
      animation: slideUp 0.3s ease; max-width:320px;
    `;
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

// ---- PDF Export ----
async function exportDashboard() {
    const btn = document.getElementById('exportBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Exporting…';

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        // Capture chart area
        const target = document.getElementById('exportTarget');
        const canvas = await html2canvas(target, {
            scale: 2,
            backgroundColor: '#0e1117',
            logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const W = pdf.internal.pageSize.getWidth();
        const H = pdf.internal.pageSize.getHeight();

        // Dark background
        pdf.setFillColor(7, 9, 15);
        pdf.rect(0, 0, W, H, 'F');

        // Title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.setTextColor(0, 180, 255);
        pdf.text('EduMetrics AI — Performance Report', 14, 14);

        pdf.setFontSize(10);
        pdf.setTextColor(136, 146, 164);
        pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, 14, 21);

        // Chart image
        const imgH = (canvas.height / canvas.width) * (W - 28);
        pdf.addImage(imgData, 'PNG', 14, 28, W - 28, Math.min(imgH, H - 60));

        // Test table
        const tests = getTestsSortedByDate().reverse();
        if (tests.length > 0) {
            pdf.addPage();
            pdf.setFillColor(7, 9, 15);
            pdf.rect(0, 0, W, H, 'F');

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(14);
            pdf.setTextColor(0, 180, 255);
            pdf.text('Test History', 14, 16);

            let y = 26;
            pdf.setFontSize(9);
            pdf.setTextColor(136, 146, 164);
            pdf.text('Test', 14, y); pdf.text('Date', 90, y); pdf.text('Marks', 130, y);
            pdf.text('%', 155, y); pdf.text('Rank', 170, y);
            y += 2;
            pdf.setDrawColor(30, 35, 55);
            pdf.line(14, y, W - 14, y);
            y += 6;

            for (const t of tests) {
                if (y > H - 14) { pdf.addPage(); y = 14; }
                pdf.setTextColor(232, 237, 245);
                pdf.text(t.name.slice(0, 35), 14, y);
                pdf.setTextColor(136, 146, 164);
                pdf.text(formatDate(t.date), 90, y);
                pdf.text(`${t.marks}/${t.maxMarks}`, 130, y);
                pdf.text(`${t.percentage}%`, 155, y);
                pdf.text(t.rank ? `#${t.rank}` : '—', 170, y);
                y += 8;
            }
        }

        pdf.save('EduMetrics_Report.pdf');
        showToast('PDF exported successfully! 📄');
    } catch (err) {
        console.error(err);
        showToast('Export failed. Please try again.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>📄</span> Export PDF';
    }
}
