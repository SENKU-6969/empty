/* ====================================================
   EduMetrics AI — Data Store (Firestore Cloud Sync)
   Each user's data lives at: users/{uid}/tests & users/{uid}/formulas
   ==================================================== */

// ---- Collection references (scoped to current user) ----

function testsCol() {
  const uid = firebase.auth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return db.collection('users').doc(uid).collection('tests');
}

function formulasCol() {
  const uid = firebase.auth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return db.collection('users').doc(uid).collection('formulas');
}

// ---- Test CRUD ----

async function getAllTests() {
  const snap = await testsCol().get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function saveTest(test) {
  const col = testsCol();
  if (test.id) {
    await col.doc(test.id).set(test);
  } else {
    const ref = await col.add(test);
    test.id = ref.id;
  }
  return test;
}

async function getTestById(id) {
  const doc = await testsCol().doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function deleteTest(id) {
  await testsCol().doc(id).delete();
}

function newTest({ name, date, maxMarks, marks, rank, percentage }) {
  return {
    name,
    date,
    maxMarks: parseFloat(maxMarks),
    marks: parseFloat(marks),
    rank: rank ? parseInt(rank) : null,
    percentage: parseFloat(percentage),
    subjects: { P: null, C: null, M: null },
    timeSpent: { P: 60, C: 60, M: 60 },
    weaknesses: '',
    missedFormulas: '',
    actionPlan: '',
    createdAt: new Date().toISOString()
  };
}

// ---- Formula CRUD ----

async function getAllFormulas() {
  const snap = await formulasCol().get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function saveFormula(formula) {
  const col = formulasCol();
  if (formula.id) {
    await col.doc(formula.id).set(formula);
  } else {
    const ref = await col.add(formula);
    formula.id = ref.id;
  }
  return formula;
}

async function deleteFormula(id) {
  await formulasCol().doc(id).delete();
}

function newFormula({ topic, content, sourceTestId, sourceTestName }) {
  return {
    topic,
    content,
    sourceTestId: sourceTestId || null,
    sourceTestName: sourceTestName || null,
    reviewed: false,
    createdAt: new Date().toISOString()
  };
}

// ---- Helpers ----

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function getTestsSortedByDate() {
  const tests = await getAllTests();
  return tests.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ---- AI Logic (pure functions — no I/O) ----

async function detectRecurringWeaknesses(currentTestId, text) {
  if (!text || text.trim().length < 3) return [];
  const tests = await getAllTests();
  const others = tests.filter(t => t.id !== currentTestId);
  const keywords = extractKeywords(text);
  const matches = [];

  for (const test of others) {
    const allText = [test.weaknesses, test.missedFormulas, test.actionPlan].join(' ').toLowerCase();
    for (const kw of keywords) {
      if (kw.length > 3 && allText.includes(kw.toLowerCase())) {
        matches.push({
          keyword: kw,
          testName: test.name,
          testDate: test.date,
          actionPlan: test.actionPlan,
          weakness: test.weaknesses
        });
        break;
      }
    }
  }
  return matches;
}

function extractKeywords(text) {
  const stopWords = new Set(['the','and','or','but','in','on','at','to','for','of','with','a','an','is','was','are','were','this','that']);
  return text.toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
}

function detectGhostMistake(timeSpent, subjectMarks) {
  const totalTime = (timeSpent.P || 0) + (timeSpent.C || 0) + (timeSpent.M || 0);
  const totalMarks = (subjectMarks.P || 0) + (subjectMarks.C || 0) + (subjectMarks.M || 0);
  if (totalTime === 0 || totalMarks === 0) return [];

  const subjectNames = { P: 'Physics', C: 'Chemistry', M: 'Maths' };
  const alerts = [];

  for (const s of ['P', 'C', 'M']) {
    const timeShare = ((timeSpent[s] || 0) / totalTime) * 100;
    const marksShare = ((subjectMarks[s] || 0) / totalMarks) * 100;
    const diff = timeShare - marksShare;
    if (diff > 20) {
      alerts.push({
        subject: subjectNames[s],
        timeShare: Math.round(timeShare),
        marksShare: Math.round(marksShare),
        diff: Math.round(diff),
        message: `${subjectNames[s]} Time Sink: You spent ${Math.round(timeShare)}% of your time here but only scored ${Math.round(marksShare)}% of your marks. Consider skipping tough ${subjectNames[s]} questions to secure marks in other subjects first.`
      });
    }
  }
  return alerts;
}

function predictNextScore(tests) {
  if (tests.length < 2) return null;
  const sorted = [...tests].sort((a, b) => new Date(a.date) - new Date(b.date));
  const pcts = sorted.map(t => t.percentage);
  const n = pcts.length;
  const xs = pcts.map((_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = pcts.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * pcts[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const nextPct = Math.min(100, Math.max(0, intercept + slope * n));
  const lastTest = sorted[sorted.length - 1];
  const nextMarks = Math.round((nextPct / 100) * lastTest.maxMarks);
  const delta = Math.round(nextMarks - lastTest.marks);
  return { nextPct: Math.round(nextPct), nextMarks, delta, trend: slope > 0 ? 'improving' : slope < 0 ? 'declining' : 'stable' };
}

function getWeaknessTopicClusters(tests) {
  const clusters = [
    { name: 'Mechanics', keywords: ['friction','newton','laws of motion','rotational','torque','angular','circular','centripetal'], subject: 'P', severity: 0 },
    { name: 'Optics', keywords: ['optics','lens','mirror','refraction','reflection','snell','ray','focal'], subject: 'P', severity: 0 },
    { name: 'Electrostatics', keywords: ['electrostatics','coulomb','electric field','capacitor','gauss','charge'], subject: 'P', severity: 0 },
    { name: 'Organic Chemistry', keywords: ['organic','carbon','hydrocarbon','ester','alcohol','reaction mechanism'], subject: 'C', severity: 0 },
    { name: 'Calculus', keywords: ['calculus','integral','derivative','limit','differentiation'], subject: 'M', severity: 0 },
  ];
  const allText = tests.map(t => [t.weaknesses, t.missedFormulas].join(' ')).join(' ').toLowerCase();
  for (const cluster of clusters) {
    for (const kw of cluster.keywords) {
      cluster.severity += (allText.match(new RegExp(kw, 'g')) || []).length;
    }
  }
  return clusters.filter(c => c.severity > 0).sort((a, b) => b.severity - a.severity);
}

function getConsistencyScore(tests) {
  if (!tests.length) return 0;
  const withPlan = tests.filter(t => t.actionPlan && t.actionPlan.trim().length > 10).length;
  return Math.round((withPlan / tests.length) * 100);
}

function getGraphAIAnnotations(sorted) {
  if (sorted.length < 2) return [];
  const annotations = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const marksUp = curr.marks > prev.marks;
    const rankDown = curr.rank && prev.rank && curr.rank > prev.rank;
    const rankUp = curr.rank && prev.rank && curr.rank < prev.rank;
    if (marksUp && rankDown) annotations.push({ index: i, msg: `📈 Marks improved but rank dropped — competition was tougher that day.` });
    else if (!marksUp && rankUp) annotations.push({ index: i, msg: `⬇️ Marks dipped but rank improved — others found it harder too.` });
    else if (marksUp && rankUp) annotations.push({ index: i, msg: `🚀 Great improvement! Both marks and rank improved.` });
  }
  return annotations;
}

// ---- Auth helpers ----

function updateUserDisplay(user) {
  const nameEl = document.querySelector('.student-name');
  const goalEl = document.querySelector('.student-goal');
  if (nameEl) nameEl.textContent = user.displayName || user.email.split('@')[0];
  if (goalEl) goalEl.textContent = user.email;
}

function addLogoutButton() {
  const footer = document.querySelector('.sidebar-footer');
  if (!footer) return;
  const btn = document.createElement('button');
  btn.className = 'btn btn-ghost';
  btn.style.cssText = 'width:100%; margin-top:10px; justify-content:center; font-size:12px; padding:8px;';
  btn.innerHTML = '↩ Sign Out';
  btn.onclick = () => firebase.auth().signOut().then(() => location.href = 'login.html');
  footer.appendChild(btn);
}

function requireAuth(callback) {
  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    // Dismiss the auth-guard overlay
    const guard = document.getElementById('authGuard');
    if (guard) {
      guard.style.transition = 'opacity 0.3s ease';
      guard.style.opacity = '0';
      setTimeout(() => guard.remove(), 300);
    }
    updateUserDisplay(user);
    addLogoutButton();
    callback(user);
  });
}

// ---- Seed demo data (runs only if user has 0 tests) ----
async function seedDemoData() {
  const existing = await getAllTests();
  if (existing.length > 0) return;

  const demos = [
    { name: 'JEE Mains Mock 1', date: '2026-01-05', maxMarks: 300, marks: 132, rank: 68, percentage: 44 },
    { name: 'JEE Mains Mock 2', date: '2026-01-20', maxMarks: 300, marks: 156, rank: 52, percentage: 52 },
    { name: 'JEE Mains Mock 3', date: '2026-02-03', maxMarks: 300, marks: 174, rank: 61, percentage: 58 },
    { name: 'AIEEE Practice Test', date: '2026-02-18', maxMarks: 360, marks: 198, rank: 38, percentage: 55 },
  ];
  const subData = [
    { P: 35, C: 55, M: 42, timeP: 80, timeC: 50, timeM: 50, w: 'Rotational Motion, Friction problems', mf: 'Forgot torque formula', ap: 'Revise rotational chapter' },
    { P: 48, C: 60, M: 48, timeP: 70, timeC: 45, timeM: 65, w: 'Optics, Lens formula sign convention', mf: "Snell's law constant mixed up", ap: 'Create optics formula card' },
    { P: 52, C: 68, M: 54, timeP: 65, timeC: 50, timeM: 65, w: 'Rotational Motion again, Integration by parts', mf: 'Kinematic equation under rotation', ap: 'Do 10 rotational problems, review calculus' },
    { P: 60, C: 75, M: 63, timeP: 80, timeC: 45, timeM: 55, w: 'Electrostatics, Organic Chemistry mechanisms', mf: 'Gauss law application', ap: 'Electrostatics chapter revision' },
  ];

  for (let i = 0; i < demos.length; i++) {
    const t = newTest(demos[i]);
    const sd = subData[i];
    t.subjects = { P: sd.P, C: sd.C, M: sd.M };
    t.timeSpent = { P: sd.timeP, C: sd.timeC, M: sd.timeM };
    t.weaknesses = sd.w;
    t.missedFormulas = sd.mf;
    t.actionPlan = sd.ap;
    await saveTest(t);
    if (sd.mf) {
      const f = newFormula({ topic: sd.mf.split(',')[0].trim(), content: sd.mf, sourceTestId: t.id, sourceTestName: t.name });
      await saveFormula(f);
    }
  }
}
