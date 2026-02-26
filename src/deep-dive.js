/* ====================================================
   EduMetrics AI — Deep Dive Logic
   ==================================================== */

let currentTest = null;
let currentTestId = null;

window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    currentTestId = params.get('id');
    if (!currentTestId) { location.href = 'index.html'; return; }

    currentTest = getTestById(currentTestId);
    if (!currentTest) { location.href = 'index.html'; return; }

    loadTestData();
});

function loadTestData() {
    const t = currentTest;

    // Header
    document.getElementById('ddTitle').textContent = t.name;
    document.getElementById('ddSubtitle').textContent = formatDate(t.date) + ' · Deep Dive Analysis';
    document.getElementById('ddScore').textContent = t.marks + '/' + t.maxMarks + ' (' + t.percentage + '%)';
    document.getElementById('ddDate').textContent = t.rank ? 'Rank #' + t.rank : 'No rank recorded';

    // Subject marks
    if (t.subjects.P !== null) { document.getElementById('physicsMarks').value = t.subjects.P; }
    if (t.subjects.C !== null) { document.getElementById('chemistryMarks').value = t.subjects.C; }
    if (t.subjects.M !== null) { document.getElementById('mathMarks').value = t.subjects.M; }

    // Time sliders
    document.getElementById('physicsTime').value = t.timeSpent.P || 60;
    document.getElementById('chemistryTime').value = t.timeSpent.C || 60;
    document.getElementById('mathTime').value = t.timeSpent.M || 60;
    updateSlider('physics');
    updateSlider('chemistry');
    updateSlider('math');

    // Weaknesses
    document.getElementById('weaknesses').value = t.weaknesses || '';
    document.getElementById('missedFormulas').value = t.missedFormulas || '';
    document.getElementById('actionPlan').value = t.actionPlan || '';

    // Run AI checks if data already exists
    onSubjectChange();
    onTimeChange();
    if (t.weaknesses) checkRecurringWeakness(t.weaknesses);
}

// ---- Slider ----
function updateSlider(subject) {
    const slider = document.getElementById(subject + 'Time');
    const label = document.getElementById(subject + 'TimeVal');
    const val = parseInt(slider.value);
    const h = Math.floor(val / 60);
    const m = val % 60;
    label.textContent = val + ' min';

    // Update total
    const p = parseInt(document.getElementById('physicsTime').value) || 0;
    const c = parseInt(document.getElementById('chemistryTime').value) || 0;
    const mathVal = parseInt(document.getElementById('mathTime').value) || 0;
    const total = p + c + mathVal;
    const totalH = Math.floor(total / 60);
    const totalM = total % 60;
    document.getElementById('totalTimeVal').textContent = total + ' min';
    document.querySelector('#totalTimeVal + div').textContent = `${totalH}h ${totalM}m`;
}

// ---- Subject change → update bars + trigger ghost check ----
function onSubjectChange() {
    const pVal = parseFloat(document.getElementById('physicsMarks').value) || 0;
    const cVal = parseFloat(document.getElementById('chemistryMarks').value) || 0;
    const mVal = parseFloat(document.getElementById('mathMarks').value) || 0;
    const total = pVal + cVal + mVal;

    // Update progress bars
    const pPct = total > 0 ? (pVal / total) * 100 : 0;
    const cPct = total > 0 ? (cVal / total) * 100 : 0;
    const mPct = total > 0 ? (mVal / total) * 100 : 0;

    document.querySelector('#physicsBar .progress-bar-fill').style.width = pPct + '%';
    document.querySelector('#chemistryBar .progress-bar-fill').style.width = cPct + '%';
    document.querySelector('#mathBar .progress-bar-fill').style.width = mPct + '%';

    triggerGhostMistakeCheck();
    updateEfficiencyChart();
}

// ---- Time change → trigger ghost check ----
function onTimeChange() {
    triggerGhostMistakeCheck();
    updateEfficiencyChart();
}

// ---- Efficiency Chart ----
function updateEfficiencyChart() {
    const timeSpent = {
        P: parseInt(document.getElementById('physicsTime').value) || 0,
        C: parseInt(document.getElementById('chemistryTime').value) || 0,
        M: parseInt(document.getElementById('mathTime').value) || 0,
    };
    const subjectMarks = {
        P: parseFloat(document.getElementById('physicsMarks').value) || 0,
        C: parseFloat(document.getElementById('chemistryMarks').value) || 0,
        M: parseFloat(document.getElementById('mathMarks').value) || 0,
    };

    const totalTime = timeSpent.P + timeSpent.C + timeSpent.M;
    const totalMarks = subjectMarks.P + subjectMarks.C + subjectMarks.M;

    if (totalTime === 0 || totalMarks === 0) {
        document.getElementById('efficiencySection').style.display = 'none';
        return;
    }

    document.getElementById('efficiencySection').style.display = 'block';
    const subjects = [
        { key: 'P', name: 'Physics', timeColor: 'var(--neon-amber)', marksColor: 'var(--neon-blue)' },
        { key: 'C', name: 'Chemistry', timeColor: 'var(--neon-amber)', marksColor: 'var(--neon-purple)' },
        { key: 'M', name: 'Maths', timeColor: 'var(--neon-amber)', marksColor: 'var(--neon-amber)' },
    ];

    const container = document.getElementById('effBars');
    container.innerHTML = subjects.map(s => {
        const tPct = Math.round((timeSpent[s.key] / totalTime) * 100);
        const mPct = Math.round((subjectMarks[s.key] / totalMarks) * 100);
        return `
      <div class="efficiency-row">
        <div class="efficiency-subject">${s.name}</div>
        <div class="efficiency-bars-wrap">
          <div class="efficiency-bar"><div class="efficiency-bar-fill time" style="width:${tPct}%;"></div></div>
          <div class="efficiency-label">Time: ${tPct}%</div>
          <div class="efficiency-bar"><div class="efficiency-bar-fill marks" style="background:${s.marksColor}; width:${mPct}%;"></div></div>
          <div class="efficiency-label">Marks: ${mPct}%</div>
        </div>
      </div>
    `;
    }).join('');
}

// ---- Ghost Mistake Detector ----
function triggerGhostMistakeCheck() {
    const timeSpent = {
        P: parseInt(document.getElementById('physicsTime').value) || 0,
        C: parseInt(document.getElementById('chemistryTime').value) || 0,
        M: parseInt(document.getElementById('mathTime').value) || 0,
    };
    const subjectMarks = {
        P: parseFloat(document.getElementById('physicsMarks').value) || null,
        C: parseFloat(document.getElementById('chemistryMarks').value) || null,
        M: parseFloat(document.getElementById('mathMarks').value) || null,
    };

    if (subjectMarks.P === null && subjectMarks.C === null && subjectMarks.M === null) return;

    const alerts = detectGhostMistake(timeSpent, {
        P: subjectMarks.P || 0,
        C: subjectMarks.C || 0,
        M: subjectMarks.M || 0
    }, currentTest?.maxMarks || 300);

    const alertDiv = document.getElementById('ghostAlert');
    const alertBody = document.getElementById('ghostAlertBody');

    if (alerts.length > 0) {
        alertBody.innerHTML = alerts.map(a =>
            `<div style="margin-bottom:6px;">⚠️ <strong>${a.message}</strong></div>`
        ).join('');
        alertDiv.classList.add('show');
    } else {
        alertDiv.classList.remove('show');
    }
}

// ---- Recurring Weakness Checker ----
let recurringTimeout = null;
function checkRecurringWeakness(text) {
    clearTimeout(recurringTimeout);
    recurringTimeout = setTimeout(() => {
        const matches = detectRecurringWeaknesses(currentTestId, text);
        const banner = document.getElementById('recurringBanner');
        const itemsDiv = document.getElementById('recurringItems');

        if (matches.length > 0) {
            itemsDiv.innerHTML = matches.map(m => `
        <div class="recurring-item">
          <strong>"${m.keyword}"</strong> was flagged in <strong>${m.testName}</strong> (${formatDate(m.testDate)})
          ${m.weakness ? `<div style="margin-top:4px; color:var(--text-muted);">Weakness: ${m.weakness}</div>` : ''}
          ${m.actionPlan ? `<div style="margin-top:4px; color:var(--neon-amber);">📌 Previous Plan: ${m.actionPlan}</div>` : ''}
        </div>
      `).join('');
            banner.classList.add('show');
        } else {
            banner.classList.remove('show');
        }
    }, 600);
}

// ---- Save ----
function saveDeepDive() {
    if (!currentTest) return;

    const pMarks = parseFloat(document.getElementById('physicsMarks').value);
    const cMarks = parseFloat(document.getElementById('chemistryMarks').value);
    const mMarks = parseFloat(document.getElementById('mathMarks').value);
    const missedFormulas = document.getElementById('missedFormulas').value.trim();
    const weaknesses = document.getElementById('weaknesses').value.trim();
    const actionPlan = document.getElementById('actionPlan').value.trim();

    currentTest.subjects = {
        P: isNaN(pMarks) ? null : pMarks,
        C: isNaN(cMarks) ? null : cMarks,
        M: isNaN(mMarks) ? null : mMarks,
    };
    currentTest.timeSpent = {
        P: parseInt(document.getElementById('physicsTime').value) || 0,
        C: parseInt(document.getElementById('chemistryTime').value) || 0,
        M: parseInt(document.getElementById('mathTime').value) || 0,
    };
    currentTest.weaknesses = weaknesses;
    currentTest.missedFormulas = missedFormulas;
    currentTest.actionPlan = actionPlan;

    saveTest(currentTest);

    // Auto-add missed formulas to formula deck
    if (missedFormulas) {
        const lines = missedFormulas.split(/[,\n]/).map(s => s.trim()).filter(s => s.length > 3);
        lines.forEach(line => {
            // Check for duplicates
            const existing = getAllFormulas().find(f =>
                f.sourceTestId === currentTestId && f.content.toLowerCase() === line.toLowerCase()
            );
            if (!existing) {
                const f = newFormula({
                    topic: extractKeywords(line).slice(0, 2).join(' ') || line.slice(0, 20),
                    content: line,
                    sourceTestId: currentTestId,
                    sourceTestName: currentTest.name
                });
                saveFormula(f);
            }
        });
    }

    // Visual feedback
    const btn = document.getElementById('saveBtn');
    btn.textContent = '✓ Saved!';
    btn.style.background = 'linear-gradient(135deg, var(--neon-green), #00aa55)';
    setTimeout(() => {
        btn.textContent = 'Save Analysis ✓';
        btn.style.background = '';
    }, 2000);
}
