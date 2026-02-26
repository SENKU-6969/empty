/* ====================================================
   EduMetrics AI — Data Store (localStorage)
   ==================================================== */

const STORE_KEY = 'edumetrics_tests';
const FORMULA_KEY = 'edumetrics_formulas';

// ---- Test CRUD ----

function getAllTests() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  } catch { return []; }
}

function saveTest(test) {
  const tests = getAllTests();
  const idx = tests.findIndex(t => t.id === test.id);
  if (idx >= 0) {
    tests[idx] = test;
  } else {
    tests.push(test);
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(tests));
  return test;
}

function getTestById(id) {
  return getAllTests().find(t => t.id === id) || null;
}

function deleteTest(id) {
  const tests = getAllTests().filter(t => t.id !== id);
  localStorage.setItem(STORE_KEY, JSON.stringify(tests));
}

function createTestId() {
  return 'test_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function newTest({name, date, maxMarks, marks, rank, percentage}) {
  return {
    id: createTestId(),
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

function getAllFormulas() {
  try {
    return JSON.parse(localStorage.getItem(FORMULA_KEY) || '[]');
  } catch { return []; }
}

function saveFormula(formula) {
  const formulas = getAllFormulas();
  const idx = formulas.findIndex(f => f.id === formula.id);
  if (idx >= 0) {
    formulas[idx] = formula;
  } else {
    formulas.push(formula);
  }
  localStorage.setItem(FORMULA_KEY, JSON.stringify(formulas));
}

function deleteFormula(id) {
  const formulas = getAllFormulas().filter(f => f.id !== id);
  localStorage.setItem(FORMULA_KEY, JSON.stringify(formulas));
}

function newFormula({topic, content, sourceTestId, sourceTestName}) {
  return {
    id: 'formula_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    topic,
    content,
    sourceTestId,
    sourceTestName,
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

function getTestsSortedByDate() {
  return getAllTests().sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ---- AI Logic ----

function detectRecurringWeaknesses(currentTestId, text) {
  if (!text || text.trim().length < 3) return [];
  const tests = getAllTests().filter(t => t.id !== currentTestId);
  const keywords = extractKeywords(text);
  const matches = [];

  for (const test of tests) {
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

function detectGhostMistake(timeSpent, subjectMarks, maxMarks) {
  // timeSpent: {P, C, M}, subjectMarks: {P, C, M}
  const totalTime = (timeSpent.P || 0) + (timeSpent.C || 0) + (timeSpent.M || 0);
  const totalMarks = (subjectMarks.P || 0) + (subjectMarks.C || 0) + (subjectMarks.M || 0);
  if (totalTime === 0 || totalMarks === 0) return [];

  const subjects = ['P', 'C', 'M'];
  const subjectNames = { P: 'Physics', C: 'Chemistry', M: 'Maths' };
  const alerts = [];

  for (const s of subjects) {
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
  // Simple linear regression
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
  const mechanics = ['friction', 'newton', 'laws of motion', 'rotational', 'torque', 'moment of inertia', 'angular', 'circular', 'centripetal'];
  const optics = ['optics', 'lens', 'mirror', 'refraction', 'reflection', 'snell', 'ray', 'focal'];
  const electrostatics = ['electrostatics', 'coulomb', 'electric field', 'capacitor', 'gauss', 'charge'];
  const organic = ['organic', 'carbon', 'hydrocarbon', 'ester', 'alcohol', 'reaction mechanism'];
  const calculus = ['calculus', 'integral', 'derivative', 'limit', 'differentiation'];

  const allText = tests.map(t => [t.weaknesses, t.missedFormulas].join(' ')).join(' ').toLowerCase();

  const clusters = [
    { name: 'Mechanics', keywords: mechanics, subject: 'P', severity: 0 },
    { name: 'Optics', keywords: optics, subject: 'P', severity: 0 },
    { name: 'Electrostatics', keywords: electrostatics, subject: 'P', severity: 0 },
    { name: 'Organic Chemistry', keywords: organic, subject: 'C', severity: 0 },
    { name: 'Calculus', keywords: calculus, subject: 'M', severity: 0 },
  ];

  for (const cluster of clusters) {
    for (const kw of cluster.keywords) {
      const matches = (allText.match(new RegExp(kw, 'g')) || []).length;
      cluster.severity += matches;
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

    if (marksUp && rankDown) {
      annotations.push({ index: i, type: 'competition', msg: `📈 Marks improved but rank dropped — competition was tougher that day.` });
    } else if (!marksUp && rankUp) {
      annotations.push({ index: i, type: 'relative', msg: `⬇️ Marks dipped but rank improved — others found it harder too.` });
    } else if (marksUp && rankUp) {
      annotations.push({ index: i, type: 'great', msg: `🚀 Great improvement! Both marks and rank improved.` });
    }
  }
  return annotations;
}

// Seed demo data if empty
function seedDemoData() {
  if (getAllTests().length > 0) return;
  const demos = [
    { name: 'JEE Mains Mock 1', date: '2026-01-05', maxMarks: 300, marks: 132, rank: 68, percentage: 44 },
    { name: 'JEE Mains Mock 2', date: '2026-01-20', maxMarks: 300, marks: 156, rank: 52, percentage: 52 },
    { name: 'JEE Mains Mock 3', date: '2026-02-03', maxMarks: 300, marks: 174, rank: 61, percentage: 58 },
    { name: 'AIEEE Practice Test', date: '2026-02-18', maxMarks: 360, marks: 198, rank: 38, percentage: 55 },
  ];
  const subData = [
    { P: 35, C: 55, M: 42, timeP: 80, timeC: 50, timeM: 50, w: 'Rotational Motion, Friction problems', mf: 'Forgot torque formula', ap: 'Revise rotational chapter' },
    { P: 48, C: 60, M: 48, timeP: 70, timeC: 45, timeM: 65, w: 'Optics, Lens formula sign convention', mf: 'Snell\'s law constant mixed up', ap: 'Create optics formula card' },
    { P: 52, C: 68, M: 54, timeP: 65, timeC: 50, timeM: 65, w: 'Rotational Motion again, Integration by parts', mf: 'Kinematic equation under rotation', ap: 'Do 10 rotational problems, review calculus' },
    { P: 60, C: 75, M: 63, timeP: 80, timeC: 45, timeM: 55, w: 'Electrostatics, Organic Chemistry mechanisms', mf: 'Gauss law application', ap: 'Electrostatics chapter revision' },
  ];
  demos.forEach((d, i) => {
    const t = newTest(d);
    const sd = subData[i];
    t.subjects = { P: sd.P, C: sd.C, M: sd.M };
    t.timeSpent = { P: sd.timeP, C: sd.timeC, M: sd.timeM };
    t.weaknesses = sd.w;
    t.missedFormulas = sd.mf;
    t.actionPlan = sd.ap;
    saveTest(t);

    if (sd.mf) {
      const f = newFormula({ topic: sd.mf.split(',')[0].trim(), content: sd.mf, sourceTestId: t.id, sourceTestName: t.name });
      saveFormula(f);
    }
  });
}
