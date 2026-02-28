/* ====================================================
   EduMetrics AI — CollegeDoors Import Logic
   Supports:
     - Classic JSON upload (bookmarklet → download → upload)
     - Mega Sync (live postMessage relay from CD tab)
   ==================================================== */

let parsedTests = [];   // tests from uploaded JSON
let existingTests = []; // tests already in Firestore

// Mega Sync state
let cdWindow = null;           // reference to the opened CollegeDoors tab
let megaSyncQueue = [];        // list of {tsid, name, date, examType, score, maxMarks, rank, totalStudents}
let megaSyncIndex = 0;         // current position in queue
let megaSyncResults = [];      // accumulated results
let megaSyncActive = false;

requireAuth(async (user) => {
    existingTests = await getAllTests();
});

// ================================================================
//  MEGA SYNC
// ================================================================

function startMegaSync() {
    const btn = document.getElementById('megaSyncBtn');
    btn.disabled = true;
    btn.innerHTML = '⏳ Opening CollegeDoors…';

    // Open CD dashboard in a new window
    cdWindow = window.open(
        'https://demotests.collegedoors.com/pages/cdmypage.php',
        'cdSyncWindow',
        'width=1100,height=700,left=100,top=100'
    );

    if (!cdWindow) {
        showMegaStatus('error', '🚫 Popup blocked! Please allow popups for this site and try again.');
        btn.disabled = false;
        btn.innerHTML = '⚡ Start Mega Sync';
        return;
    }

    megaSyncActive = true;
    showMegaPanel();
    showMegaStatus('info', '🌐 CollegeDoors opened. Log in if needed, then click the <strong>📡 EduMetrics Mega Sync</strong> bookmarklet on that page.');

    // Listen for messages from the CollegeDoors tab
    window.removeEventListener('message', handleSyncMessage); // avoid double listeners
    window.addEventListener('message', handleSyncMessage);
}

function handleSyncMessage(event) {
    // Validate origin is CollegeDoors
    if (!event.origin.includes('collegedoors.com')) return;

    const msg = event.data;
    if (!msg || !msg.type) return;

    if (msg.type === 'cd_dashboard') {
        handleDashboardSync(msg);
    } else if (msg.type === 'cd_test') {
        handleTestSync(msg);
    }
}

async function handleDashboardSync(msg) {
    const tests = msg.tests || [];
    if (!tests.length) {
        showMegaStatus('error', '⚠️ No tests found on the dashboard. Make sure you are on cdmypage.php.');
        return;
    }

    megaSyncQueue = tests;
    megaSyncIndex = 0;
    megaSyncResults = [];
    existingTests = await getAllTests();

    updateMegaProgress(0, tests.length);
    showMegaStatus('info', `📋 Found <strong>${tests.length} tests</strong> on your CollegeDoors dashboard. Now navigate to each test's Analysis page and click the bookmarklet, or use "All" mode below.`);

    // Render queue preview
    renderSyncQueue(tests);
}

async function handleTestSync(msg) {
    const d = msg;
    if (!d.tsid) return;

    // Duplicate check
    const existing = await findTestByTsid(d.tsid);
    if (existing) {
        appendSyncLog(d.testName || `tsid:${d.tsid}`, 'skip', 'Already synced');
        megaSyncIndex++;
        updateMegaProgress(megaSyncIndex, megaSyncQueue.length);
        return;
    }

    try {
        const test = buildMegaTest(d);
        await saveTest(test);
        existingTests.push(test);
        megaSyncResults.push(test);
        appendSyncLog(test.name, 'ok', `${test.marks}/${test.maxMarks} · Rank ${test.rank || '—'}`);
    } catch (e) {
        appendSyncLog(d.testName || `tsid:${d.tsid}`, 'error', 'Save failed');
        console.error('[MegaSync] save error', e);
    }

    megaSyncIndex++;
    updateMegaProgress(megaSyncIndex, megaSyncQueue.length);

    if (megaSyncQueue.length > 0 && megaSyncIndex >= megaSyncQueue.length) {
        finishMegaSync();
    }
}

function buildMegaTest(d) {
    // Subject marks (scored out of max)
    const subMarks = {};
    const subTime = {};
    const subjectMap = { Physics: 'P', Chemistry: 'C', Mathematics: 'M', Biology: 'B', Botany: 'Bo', Zoology: 'Z' };
    for (const [subName, key] of Object.entries(subjectMap)) {
        if (d.subjects && d.subjects[subName]) {
            subMarks[key] = d.subjects[subName].scored;
            // Convert seconds → minutes, round
            subTime[key] = Math.round((d.subjects[subName].totalTimeSec || 0) / 60);
        }
    }

    const pct = d.maxMarks ? Math.round((d.marks / d.maxMarks) * 100) : 0;

    const test = newTest({
        name: d.testName,
        date: d.date,
        maxMarks: d.maxMarks,
        marks: d.marks,
        rank: d.rank,
        percentage: pct,
        category: guessCategoryFromExamType(d.examType),
        tsid: d.tsid,
        totalStudents: d.totalStudents || null,
    });

    // Enrich with mega data
    test.subjects = subMarks;
    test.timeSpent = subTime;
    test.chapters = d.chapters || null;
    test.perQuestion = d.perQuestion || null;

    return test;
}

function guessCategoryFromExamType(examType) {
    if (!examType) return 'other';
    const et = examType.toLowerCase();
    if (et.includes('jee') && et.includes('adv')) return 'jee-adv';
    if (et.includes('jee')) return 'jee-main';
    if (et.includes('cet') || et.includes('mht')) return 'cet';
    if (et.includes('neet')) return 'neet';
    return 'other';
}

function finishMegaSync() {
    megaSyncActive = false;
    const n = megaSyncResults.length;
    showMegaStatus('success', `✅ Mega Sync complete! <strong>${n} test${n !== 1 ? 's' : ''}</strong> synced to EduMetrics.`);
    document.getElementById('megaSyncBtn').innerHTML = `✓ Synced ${n} tests`;

    if (cdWindow && !cdWindow.closed) cdWindow.close();

    if (n > 0) {
        setTimeout(() => location.href = 'index.html', 2500);
    }
}

// ================================================================
//  MEGA SYNC UI HELPERS
// ================================================================

function showMegaPanel() {
    document.getElementById('megaSyncPanel').style.display = 'block';
    document.getElementById('megaSyncPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showMegaStatus(type, html) {
    const el = document.getElementById('megaStatus');
    el.style.display = 'block';
    el.className = 'mega-status mega-status-' + type;
    el.innerHTML = html;
}

function updateMegaProgress(done, total) {
    const bar = document.getElementById('megaProgressBar');
    const label = document.getElementById('megaProgressLabel');
    if (!total) return;
    const pct = Math.round((done / total) * 100);
    bar.style.width = pct + '%';
    label.textContent = `${done} / ${total} tests`;
}

function renderSyncQueue(tests) {
    const tbody = document.getElementById('syncQueueBody');
    const section = document.getElementById('syncQueueSection');
    if (!tbody) return;
    tbody.innerHTML = tests.map(t => {
        const dup = existingTests.some(e => e.tsid == t.tsid);
        return `<tr>
            <td style="font-family:'JetBrains Mono';font-size:11px;color:var(--text-muted)">${t.tsid}</td>
            <td>${escHtml(t.testName || '—')}</td>
            <td style="color:var(--text-muted);font-size:12px">${t.date || '—'}</td>
            <td style="color:var(--neon-blue)">${t.examType || '—'}</td>
            <td id="sync-row-${t.tsid}">${dup
                ? '<span style="color:var(--neon-amber);font-size:11px">⚠ Already synced</span>'
                : '<span style="color:var(--text-muted);font-size:11px">⏳ Pending</span>'
            }</td>
        </tr>`;
    }).join('');
    section.style.display = 'block';
}

function appendSyncLog(name, status, detail) {
    const log = document.getElementById('syncLog');
    const icons = { ok: '✅', skip: '⏭', error: '❌' };
    const colors = { ok: 'var(--neon-green)', skip: 'var(--neon-amber)', error: '#ff4d4f' };
    const row = document.createElement('div');
    row.style.cssText = 'font-size:12px;padding:3px 0;display:flex;gap:8px;align-items:center;';
    row.innerHTML = `<span style="color:${colors[status]}">${icons[status]}</span>
                     <span style="flex:1">${escHtml(name)}</span>
                     <span style="color:var(--text-muted)">${detail}</span>`;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
}

// ================================================================
//  CLASSIC FILE UPLOAD
// ================================================================

document.getElementById('importFile').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error('Expected an array');
            parsedTests = data;
            renderPreview(parsedTests);
        } catch (err) {
            showError('Invalid file. Please upload the JSON downloaded from the bookmarklet.');
        }
    };
    reader.readAsText(file);
});

// ---- Preview Table ----
function renderPreview(tests) {
    const tbody = document.getElementById('previewBody');
    const section = document.getElementById('previewSection');
    const countEl = document.getElementById('previewCount');

    if (!tests.length) {
        showError('No tests found in the file.');
        return;
    }

    const existingKeys = new Set(
        existingTests.map(t => (t.name + '|' + t.date).toLowerCase())
    );

    tbody.innerHTML = tests.map((t, i) => {
        const key = (t.name + '|' + t.date).toLowerCase();
        const isDup = existingKeys.has(key);
        const pct = t.maxMarks ? Math.round((t.marks / t.maxMarks) * 100) : '—';
        return `
      <tr class="${isDup ? 'dup-row' : ''}">
        <td><input type="checkbox" class="import-cb" data-index="${i}" ${isDup ? '' : 'checked'} /></td>
        <td>${escHtml(t.name)}</td>
        <td>${t.date || '—'}</td>
        <td style="font-family:'JetBrains Mono';color:var(--neon-blue)">${t.marks}/${t.maxMarks}</td>
        <td>${pct}%</td>
        <td>${t.rank ? '#' + t.rank : '—'}</td>
        <td>${isDup
                ? '<span style="color:var(--neon-amber);font-size:11px;">⚠ Already exists</span>'
                : '<span style="color:var(--neon-green);font-size:11px;">✓ New</span>'}</td>
      </tr>`;
    }).join('');

    const newCount = tests.filter((t) => {
        const key = (t.name + '|' + t.date).toLowerCase();
        return !existingKeys.has(key);
    }).length;

    countEl.textContent = `${tests.length} tests found · ${newCount} new · ${tests.length - newCount} already imported`;
    section.style.display = 'block';
    document.getElementById('errorMsg').style.display = 'none';
}

// ---- Select All toggle ----
function toggleAll(checked) {
    document.querySelectorAll('.import-cb').forEach(cb => cb.checked = checked);
}

// ---- Import ----
async function runImport() {
    const btn = document.getElementById('importBtn');
    const selected = [...document.querySelectorAll('.import-cb:checked')]
        .map(cb => parsedTests[parseInt(cb.dataset.index)]);

    if (!selected.length) {
        showError('No tests selected to import.');
        return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ Importing…';

    const existingKeys = new Set(existingTests.map(t => (t.name + '|' + t.date).toLowerCase()));
    let imported = 0;
    let skipped = 0;

    for (const t of selected) {
        const key = (t.name + '|' + t.date).toLowerCase();
        if (existingKeys.has(key)) { skipped++; continue; }
        const test = newTest({
            name: t.name,
            date: t.date,
            maxMarks: t.maxMarks,
            marks: t.marks,
            rank: t.rank || null,
            percentage: t.maxMarks ? Math.round((t.marks / t.maxMarks) * 100) : 0,
        });
        await saveTest(test);
        existingKeys.add(key);
        imported++;
    }

    btn.textContent = `✓ Done! ${imported} imported${skipped ? ', ' + skipped + ' skipped' : ''}`;
    btn.style.background = 'linear-gradient(135deg, var(--neon-green), #00aa55)';
    setTimeout(() => location.href = 'index.html', 1800);
}

// ================================================================
//  HELPERS
// ================================================================

function showError(msg) {
    const el = document.getElementById('errorMsg');
    el.textContent = msg;
    el.style.display = 'block';
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
