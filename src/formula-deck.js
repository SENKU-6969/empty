/* ====================================================
   EduMetrics AI — Formula Deck Logic
   ==================================================== */

window.addEventListener('DOMContentLoaded', () => {
    seedDemoData();
    renderFormulas('');
});

function renderFormulas(query) {
    let formulas = getAllFormulas();
    const q = (query || '').toLowerCase();
    if (q) {
        formulas = formulas.filter(f =>
            f.topic.toLowerCase().includes(q) || f.content.toLowerCase().includes(q)
        );
    }

    // Sort: unreviewed first, then by date desc
    formulas.sort((a, b) => {
        if (a.reviewed !== b.reviewed) return a.reviewed ? 1 : -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const all = getAllFormulas();
    const reviewed = all.filter(f => f.reviewed).length;
    document.getElementById('statTotal').textContent = all.length;
    document.getElementById('statPending').textContent = all.length - reviewed;
    document.getElementById('statReviewed').textContent = reviewed;

    const grid = document.getElementById('formulaGrid');
    const empty = document.getElementById('formulaEmpty');

    if (formulas.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = formulas.map(f => `
    <div class="formula-card ${f.reviewed ? 'reviewed' : ''}" id="card-${f.id}">
      <div class="formula-topic">${escapeHtml(f.topic)}</div>
      <div class="formula-content">${escapeHtml(f.content)}</div>
      <div class="formula-meta">
        <span>
          ${f.sourceTestName ? `📝 ${escapeHtml(f.sourceTestName)}` : 'Manual entry'} · ${formatDate(f.createdAt.split('T')[0])}
        </span>
        <div style="display:flex; gap:8px;">
          <button class="formula-reviewed-btn" onclick="toggleReviewed('${f.id}')">
            ${f.reviewed ? '↩ Unmark' : '✓ Mark Reviewed'}
          </button>
          <button class="formula-reviewed-btn" style="background:var(--neon-red-dim); border-color:rgba(255,61,90,0.25); color:var(--neon-red);" onclick="deleteCard('${f.id}')">🗑</button>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleReviewed(id) {
    const all = getAllFormulas();
    const f = all.find(x => x.id === id);
    if (!f) return;
    f.reviewed = !f.reviewed;
    saveFormula(f);
    renderFormulas(document.getElementById('searchInput').value);
}

function deleteCard(id) {
    deleteFormula(id);
    renderFormulas(document.getElementById('searchInput').value);
}

function clearReviewed() {
    const all = getAllFormulas();
    all.filter(f => f.reviewed).forEach(f => deleteFormula(f.id));
    renderFormulas(document.getElementById('searchInput').value);
}

function addFormulaManually() {
    document.getElementById('addFormulaModal').style.display = 'flex';
    document.getElementById('fTopic').focus();
}

function closeFormulaModal() {
    document.getElementById('addFormulaModal').style.display = 'none';
}

function handleAddFormula(e) {
    e.preventDefault();
    const topic = document.getElementById('fTopic').value.trim();
    const content = document.getElementById('fContent').value.trim();
    const f = newFormula({ topic, content, sourceTestId: null, sourceTestName: null });
    saveFormula(f);
    closeFormulaModal();
    renderFormulas(document.getElementById('searchInput').value);
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
