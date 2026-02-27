/* ====================================================
   EduMetrics AI — CollegeDoors Import Logic
   ==================================================== */

let parsedTests = [];   // tests from uploaded JSON
let existingTests = []; // tests already in Firestore

requireAuth(async (user) => {
    existingTests = await getAllTests();
});

// ---- File Upload ----
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

    const newCount = tests.filter((t, i) => {
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

// ---- Helpers ----
function showError(msg) {
    const el = document.getElementById('errorMsg');
    el.textContent = msg;
    el.style.display = 'block';
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
