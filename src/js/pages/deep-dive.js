/* ====================================================
   EduMetrics AI — Deep Dive Logic (Firebase/Firestore)
   ==================================================== */

// ---- Preset map (mirrors dashboard.js presets) ----
const DD_PRESETS = {
  'jee-main': { badge: 'JEE MAIN', cls: 'jee-main' },
  'jee-adv-2p': { badge: 'ADV 2P', cls: 'jee-adv-2p' },
  'jee-adv-1p': { badge: 'ADV 1P', cls: 'jee-adv-1p' },
  'cet': { badge: 'CET', cls: 'cet' },
  'other': { badge: 'OTHER', cls: 'other' },
};


let currentTest = null;
let currentTestId = null;

requireAuth(async (user) => {
  const params = new URLSearchParams(window.location.search);
  currentTestId = params.get('id');
  if (!currentTestId) { location.href = 'index.html'; return; }
  currentTest = await getTestById(currentTestId);
  if (!currentTest) { location.href = 'index.html'; return; }
  loadTestData();
});

function loadTestData() {
  const t = currentTest;
  document.getElementById('ddTitle').textContent = t.name;
  document.getElementById('ddSubtitle').textContent = formatDate(t.date) + ' · Deep Dive Analysis';
  document.getElementById('ddScore').textContent = t.marks + '/' + t.maxMarks + ' (' + t.percentage + '%)';
  document.getElementById('ddDate').textContent = t.rank ? 'Rank #' + t.rank : 'No rank recorded';

  // Load category into dropdown and badge
  const catSel = document.getElementById('ddCategory');
  catSel.value = t.category || '';
  updateCategoryBadge(t.category || '');

  if (t.subjects?.P !== null) document.getElementById('physicsMarks').value = t.subjects.P;
  if (t.subjects?.C !== null) document.getElementById('chemistryMarks').value = t.subjects.C;
  if (t.subjects?.M !== null) document.getElementById('mathMarks').value = t.subjects.M;

  document.getElementById('physicsTime').value = t.timeSpent?.P || 60;
  document.getElementById('chemistryTime').value = t.timeSpent?.C || 60;
  document.getElementById('mathTime').value = t.timeSpent?.M || 60;
  updateSlider('physics'); updateSlider('chemistry'); updateSlider('math');

  document.getElementById('weaknesses').value = t.weaknesses || '';
  document.getElementById('missedFormulas').value = t.missedFormulas || '';
  document.getElementById('actionPlan').value = t.actionPlan || '';

  onSubjectChange(); onTimeChange();
  if (t.weaknesses) checkRecurringWeakness(t.weaknesses);
}

// ---- Category ----
function onCategoryChange() {
  const val = document.getElementById('ddCategory').value;
  updateCategoryBadge(val);
}

function updateCategoryBadge(val) {
  const badgeEl = document.getElementById('ddCategoryBadge');
  if (!val || !DD_PRESETS[val]) { badgeEl.innerHTML = ''; return; }
  const p = DD_PRESETS[val];
  badgeEl.innerHTML = `<span class="category-badge category-badge--${p.cls}">${p.badge}</span>`;
}


// ---- Slider ----
function updateSlider(subject) {
  const val = parseInt(document.getElementById(subject + 'Time').value);
  document.getElementById(subject + 'TimeVal').textContent = val + ' min';
  const p = parseInt(document.getElementById('physicsTime').value) || 0;
  const c = parseInt(document.getElementById('chemistryTime').value) || 0;
  const m = parseInt(document.getElementById('mathTime').value) || 0;
  const total = p + c + m;
  document.getElementById('totalTimeVal').textContent = total + ' min';
  document.querySelector('#totalTimeVal + div').textContent = `${Math.floor(total / 60)}h ${total % 60}m`;
}

// ---- Subject & Time Events ----
function onSubjectChange() {
  const p = parseFloat(document.getElementById('physicsMarks').value) || 0;
  const c = parseFloat(document.getElementById('chemistryMarks').value) || 0;
  const m = parseFloat(document.getElementById('mathMarks').value) || 0;
  const total = p + c + m;
  document.querySelector('#physicsBar .progress-bar-fill').style.width = (total > 0 ? (p / total) * 100 : 0) + '%';
  document.querySelector('#chemistryBar .progress-bar-fill').style.width = (total > 0 ? (c / total) * 100 : 0) + '%';
  document.querySelector('#mathBar .progress-bar-fill').style.width = (total > 0 ? (m / total) * 100 : 0) + '%';

  // Update the header score in real-time
  if (currentTest) {
    const maxMarks = currentTest.maxMarks || 360;
    const pct = Math.round((total / maxMarks) * 100);
    document.getElementById('ddScore').textContent = total + '/' + maxMarks + ' (' + pct + '%)';
    // sync back to currentTest so Save picks it up correctly
    currentTest.marks = total;
    currentTest.percentage = pct;
  }

  triggerGhostMistakeCheck();
  updateEfficiencyChart();
}

function onTimeChange() { triggerGhostMistakeCheck(); updateEfficiencyChart(); }

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
  if (!totalTime || !totalMarks) { document.getElementById('efficiencySection').style.display = 'none'; return; }
  document.getElementById('efficiencySection').style.display = 'block';
  const subjects = [
    { key: 'P', name: 'Physics', marksColor: 'var(--neon-blue)' },
    { key: 'C', name: 'Chemistry', marksColor: 'var(--neon-purple)' },
    { key: 'M', name: 'Maths', marksColor: 'var(--neon-amber)' },
  ];
  document.getElementById('effBars').innerHTML = subjects.map(s => {
    const tPct = Math.round((timeSpent[s.key] / totalTime) * 100);
    const mPct = Math.round((subjectMarks[s.key] / totalMarks) * 100);
    return `<div class="efficiency-row">
      <div class="efficiency-subject">${s.name}</div>
      <div class="efficiency-bars-wrap">
        <div class="efficiency-bar"><div class="efficiency-bar-fill time" style="width:${tPct}%"></div></div>
        <div class="efficiency-label">Time: ${tPct}%</div>
        <div class="efficiency-bar"><div class="efficiency-bar-fill" style="background:${s.marksColor};width:${mPct}%"></div></div>
        <div class="efficiency-label">Marks: ${mPct}%</div>
      </div>
    </div>`;
  }).join('');
}

// ---- Ghost Mistake ----
function triggerGhostMistakeCheck() {
  const timeSpent = { P: parseInt(document.getElementById('physicsTime').value) || 0, C: parseInt(document.getElementById('chemistryTime').value) || 0, M: parseInt(document.getElementById('mathTime').value) || 0 };
  const subjectMarks = { P: parseFloat(document.getElementById('physicsMarks').value) || 0, C: parseFloat(document.getElementById('chemistryMarks').value) || 0, M: parseFloat(document.getElementById('mathMarks').value) || 0 };
  const alerts = detectGhostMistake(timeSpent, subjectMarks);
  const alertDiv = document.getElementById('ghostAlert');
  const alertBody = document.getElementById('ghostAlertBody');
  if (alerts.length) {
    alertBody.innerHTML = alerts.map(a => `<div style="margin-bottom:6px;"><img src="src/icons/icon-warning.svg" class="svg-icon" alt="warning"> <strong>${a.message}</strong></div>`).join('');
    alertDiv.classList.add('show');
  } else {
    alertDiv.classList.remove('show');
  }
}

// ---- Recurring Weakness ----
let recurringTimeout = null;
function checkRecurringWeakness(text) {
  clearTimeout(recurringTimeout);
  recurringTimeout = setTimeout(async () => {
    const matches = await detectRecurringWeaknesses(currentTestId, text);
    const banner = document.getElementById('recurringBanner');
    const itemsDiv = document.getElementById('recurringItems');
    if (matches.length) {
      itemsDiv.innerHTML = matches.map(m => `
        <div class="recurring-item">
          <strong>"${m.keyword}"</strong> was flagged in <strong>${m.testName}</strong> (${formatDate(m.testDate)})
          ${m.weakness ? `<div style="margin-top:4px;color:var(--text-muted);">Weakness: ${m.weakness}</div>` : ''}
          ${m.actionPlan ? `<div style="margin-top:4px;color:var(--neon-amber);"><img src="src/icons/icon-pin.svg" class="svg-icon" alt="pin"> Previous Plan: ${m.actionPlan}</div>` : ''}
        </div>`).join('');
      banner.classList.add('show');
    } else {
      banner.classList.remove('show');
    }
  }, 600);
}

// ---- Save ----
async function saveDeepDive() {
  if (!currentTest) return;
  const btn = document.getElementById('saveBtn');
  btn.disabled = true; btn.textContent = '⏳ Saving…';

  const pMarks = parseFloat(document.getElementById('physicsMarks').value);
  const cMarks = parseFloat(document.getElementById('chemistryMarks').value);
  const mMarks = parseFloat(document.getElementById('mathMarks').value);
  const missedFormulas = document.getElementById('missedFormulas').value.trim();
  const weaknesses = document.getElementById('weaknesses').value.trim();
  const actionPlan = document.getElementById('actionPlan').value.trim();

  currentTest.subjects = { P: isNaN(pMarks) ? null : pMarks, C: isNaN(cMarks) ? null : cMarks, M: isNaN(mMarks) ? null : mMarks };
  currentTest.timeSpent = { P: parseInt(document.getElementById('physicsTime').value) || 0, C: parseInt(document.getElementById('chemistryTime').value) || 0, M: parseInt(document.getElementById('mathTime').value) || 0 };
  currentTest.weaknesses = weaknesses;
  currentTest.missedFormulas = missedFormulas;
  currentTest.actionPlan = actionPlan;
  currentTest.category = document.getElementById('ddCategory').value || currentTest.category || 'other';


  await saveTest(currentTest);

  if (missedFormulas) {
    const existing = await getAllFormulas();
    const lines = missedFormulas.split(/[,\n]/).map(s => s.trim()).filter(s => s.length > 3);
    for (const line of lines) {
      const dup = existing.find(f => f.sourceTestId === currentTestId && f.content.toLowerCase() === line.toLowerCase());
      if (!dup) {
        const f = newFormula({ topic: extractKeywords(line).slice(0, 2).join(' ') || line.slice(0, 20), content: line, sourceTestId: currentTestId, sourceTestName: currentTest.name });
        await saveFormula(f);
      }
    }
  }

  btn.disabled = false; btn.textContent = '✓ Saved!';
  btn.style.background = 'linear-gradient(135deg, var(--neon-green), #00aa55)';
  setTimeout(() => { btn.textContent = 'Save Analysis ✓'; btn.style.background = ''; }, 2000);
}

// ---- Delete ----
async function deleteCurrentTest() {
  if (!currentTest) return;
  const confirmed = confirm(`<img src="src/icons/icon-warning.svg" class="svg-icon" alt="warning"> Delete "${currentTest.name}"?\n\nThis will permanently remove the test and all its analysis data. This cannot be undone.`);
  if (!confirmed) return;

  const btn = document.getElementById('deleteBtn');
  btn.disabled = true; btn.textContent = '⏳ Deleting…';

  try {
    await deleteTest(currentTestId);
    location.href = 'index.html';
  } catch (e) {
    console.error('Delete failed:', e);
    alert('Failed to delete the test. Please try again.');
    btn.disabled = false; btn.textContent = '<img src="src/icons/icon-delete.svg" class="svg-icon" alt="delete"> Delete Test';
  }
}
