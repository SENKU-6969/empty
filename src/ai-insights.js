/* ====================================================
   EduMetrics AI — AI Insights Logic
   ==================================================== */

window.addEventListener('DOMContentLoaded', () => {
    seedDemoData();
    buildInsights();
});

function buildInsights() {
    const tests = getAllTests();
    const grid = document.getElementById('insightsGrid');
    const empty = document.getElementById('insightsEmpty');

    if (tests.length < 2) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    const sorted = [...tests].sort((a, b) => new Date(a.date) - new Date(b.date));
    const prediction = predictNextScore(sorted);
    const clusters = getWeaknessTopicClusters(tests);
    const consistency = getConsistencyScore(tests);
    const formulas = getAllFormulas();

    grid.innerHTML = `
    ${renderPrediction(prediction, sorted)}
    ${renderConsistency(consistency, tests)}
    ${renderTopicClusters(clusters)}
    ${renderGhostSummary(tests)}
    ${renderFormulaDeckInsight(formulas)}
    ${renderRecentActivity(sorted)}
  `;

    // Animate SVG ring
    animateRing(consistency);
}

// ---- Prediction Card ----
function renderPrediction(pred, tests) {
    if (!pred) return '';
    const arrow = pred.delta > 0 ? '↑' : pred.delta < 0 ? '↓' : '→';
    const color = pred.delta > 0 ? 'var(--neon-green)' : pred.delta < 0 ? 'var(--neon-red)' : 'var(--neon-amber)';
    const trendMsg = {
        improving: 'You are on an upward trajectory. Keep your current study routine!',
        declining: 'Performance is trending down. Time to revisit your action plans.',
        stable: 'Performance is stable. Focus on eliminating recurring weaknesses to break through.'
    }[pred.trend] || '';

    const last = tests[tests.length - 1];
    return `
    <div class="insight-card">
      <span class="insight-emoji">🔮</span>
      <div class="insight-title">Predictive Score</div>
      <div class="insight-value" style="color:${color};">${arrow} ${pred.nextMarks}</div>
      <div class="insight-sublabel">Projected marks in next test (${pred.nextPct}%)</div>
      <div class="insight-desc" style="margin-top:12px;">
        ${trendMsg}
        <br><br>
        <span style="color:var(--text-muted); font-size:12px;">Based on ${tests.length} tests · Last score: <span style="color:var(--neon-blue); font-family:'JetBrains Mono';">${last.marks}/${last.maxMarks}</span></span>
      </div>
    </div>
  `;
}

// ---- Consistency Score Ring ----
function renderConsistency(score, tests) {
    const withPlan = tests.filter(t => t.actionPlan && t.actionPlan.trim().length > 10).length;
    const color = score >= 70 ? 'var(--neon-green)' : score >= 40 ? 'var(--neon-amber)' : 'var(--neon-red)';
    const msg = score >= 70 ? 'Excellent! You\'re consistently logging action plans.' :
        score >= 40 ? 'Good progress. Try to fill action plans for every test.' :
            'Action plans are missing for most tests. This is your biggest leverage point!';

    const r = 45;
    const circ = 2 * Math.PI * r;
    const filled = (score / 100) * circ;

    return `
    <div class="insight-card">
      <span class="insight-emoji">📋</span>
      <div class="insight-title">Study Consistency Score</div>
      <div class="score-ring-wrap">
        <div class="score-ring">
          <svg viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--bg-surface-3)" stroke-width="10"/>
            <circle id="ringFill" cx="60" cy="60" r="${r}" fill="none" stroke="${color}"
              stroke-width="10" stroke-linecap="round"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${circ}"
              style="transition: stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1);"
            />
          </svg>
          <div class="score-ring-value" style="color:${color};">${score}%</div>
        </div>
      </div>
      <div class="insight-desc">${msg}</div>
      <div style="font-size:12px; color:var(--text-muted); margin-top:8px;">${withPlan}/${tests.length} tests have action plans</div>
    </div>
  `;
}

function animateRing(score) {
    setTimeout(() => {
        const ring = document.getElementById('ringFill');
        if (!ring) return;
        const r = 45;
        const circ = 2 * Math.PI * r;
        ring.style.strokeDashoffset = circ - (score / 100) * circ;
    }, 200);
}

// ---- Topic Clusters ----
function renderTopicClusters(clusters) {
    if (!clusters.length) {
        return `
      <div class="insight-card">
        <span class="insight-emoji">🎯</span>
        <div class="insight-title">Smart Topic Association</div>
        <div class="insight-desc" style="margin-top:8px;">No weakness patterns detected yet. Fill in Deep Dive weakness logs to enable this feature.</div>
      </div>
    `;
    }

    const tags = clusters.map((c, i) => {
        const level = i === 0 ? '' : i === 1 ? 'medium' : 'low';
        return `<span class="topic-tag ${level}">${c.name} (${c.subject})</span>`;
    }).join('');

    const top = clusters[0];
    return `
    <div class="insight-card">
      <span class="insight-emoji">🧠</span>
      <div class="insight-title">Smart Topic Association</div>
      <div class="insight-desc">AI detected recurring patterns in your weakness logs. <span style="color:var(--neon-red);">${top.name}</span> appears most frequently.</div>
      <div class="topic-tags">${tags}</div>
      <div style="margin-top:16px; padding:14px; background:var(--bg-surface-2); border-radius:var(--radius-sm); border:1px solid var(--border);">
        <div style="font-size:12px; font-weight:700; color:var(--neon-blue); margin-bottom:6px;">💡 AI Suggestion</div>
        <div style="font-size:13px; color:var(--text-secondary);">I notice you're weak in <strong>${top.name}</strong>. Review related chapters and try 5-7 focused practice problems on this cluster before your next test.</div>
      </div>
    </div>
  `;
}

// ---- Ghost Mistake Summary ----
function renderGhostSummary(tests) {
    const timeWasters = [];
    for (const t of tests) {
        if (!t.subjects || !t.timeSpent) continue;
        const alerts = detectGhostMistake(t.timeSpent, {
            P: t.subjects.P || 0,
            C: t.subjects.C || 0,
            M: t.subjects.M || 0
        }, t.maxMarks);
        alerts.forEach(a => timeWasters.push({ ...a, testName: t.name }));
    }

    const dominated = {};
    for (const w of timeWasters) {
        dominated[w.subject] = (dominated[w.subject] || 0) + 1;
    }
    const sorted = Object.entries(dominated).sort((a, b) => b[1] - a[1]);

    return `
    <div class="insight-card">
      <span class="insight-emoji">👻</span>
      <div class="insight-title">Ghost Mistake History</div>
      <div class="insight-desc">Subjects where you consistently spend too much time relative to marks scored.</div>
      ${sorted.length === 0
            ? `<div style="margin-top:12px; color:var(--neon-green); font-size:13px;">✅ No time management issues detected — great allocation!</div>`
            : sorted.map(([subj, count]) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">
            <span style="font-weight:600; color:var(--text-primary);">${subj}</span>
            <span style="color:var(--neon-red); font-family:'JetBrains Mono'; font-size:13px;">⚡ ${count} test${count > 1 ? 's' : ''}</span>
          </div>
        `).join('')
        }
    </div>
  `;
}

// ---- Formula Deck Insight ----
function renderFormulaDeckInsight(formulas) {
    const pending = formulas.filter(f => !f.reviewed);
    const reviewed = formulas.filter(f => f.reviewed);
    const pct = formulas.length > 0 ? Math.round((reviewed.length / formulas.length) * 100) : 0;

    return `
    <div class="insight-card">
      <span class="insight-emoji">🧮</span>
      <div class="insight-title">Formula Deck Status</div>
      <div class="insight-value" style="font-size:28px; color:${pct >= 70 ? 'var(--neon-green)' : 'var(--neon-amber)'};">${pct}%</div>
      <div class="insight-sublabel">Formulas reviewed (${reviewed.length}/${formulas.length})</div>
      <div class="insight-desc" style="margin-top:12px;">
        ${pending.length === 0 ? '🎉 All formula cards reviewed! Great job.' :
            `You have <span style="color:var(--neon-red);">${pending.length} unreviewed</span> formula cards. Spending 10 minutes on these before your next test can recover crucial marks.`}
      </div>
      <div style="margin-top:12px;">
        <button class="btn btn-ghost" onclick="location.href='formula-deck.html'" style="width:100%; justify-content:center;">Open Formula Deck →</button>
      </div>
    </div>
  `;
}

// ---- Recent Activity Timeline ----
function renderRecentActivity(sorted) {
    const recent = sorted.slice(-5).reverse();
    return `
    <div class="insight-card full">
      <span class="insight-emoji">📅</span>
      <div class="insight-title">Recent Activity</div>
      <div style="margin-top:16px;">
        ${recent.map((t, i) => {
        const prev = sorted[sorted.indexOf(t) - 1];
        const delta = prev ? t.percentage - prev.percentage : null;
        const arrow = delta === null ? '' : delta > 0
            ? `<span style="color:var(--neon-green); font-size:12px;">↑ ${delta.toFixed(1)}%</span>`
            : delta < 0
                ? `<span style="color:var(--neon-red); font-size:12px;">↓ ${Math.abs(delta).toFixed(1)}%</span>`
                : `<span style="color:var(--neon-amber); font-size:12px;">→ —</span>`;

        return `
            <div style="display:flex; align-items:center; gap:16px; padding:12px 0; ${i < recent.length - 1 ? 'border-bottom:1px solid var(--border)' : ''}; cursor:pointer;"
              onclick="location.href='deep-dive.html?id=${t.id}'">
              <div style="width:44px; height:44px; background:var(--neon-blue-dim); border:1px solid rgba(0,180,255,0.2); border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; font-family:'JetBrains Mono'; font-weight:700; color:var(--neon-blue); font-size:13px; flex-shrink:0;">${t.percentage}%</div>
              <div style="flex:1;">
                <div style="font-weight:600; font-size:14px; color:var(--text-primary);">${t.name}</div>
                <div style="font-size:12px; color:var(--text-secondary);">${formatDate(t.date)} · ${t.marks}/${t.maxMarks}${t.rank ? ' · Rank #' + t.rank : ''}</div>
                ${t.weaknesses ? `<div style="font-size:11px; color:var(--text-muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:400px;">⚠️ ${t.weaknesses.slice(0, 60)}${t.weaknesses.length > 60 ? '…' : ''}</div>` : ''}
              </div>
              ${arrow}
              <span style="color:var(--text-muted);">›</span>
            </div>
          `;
    }).join('')}
      </div>
    </div>
  `;
}
