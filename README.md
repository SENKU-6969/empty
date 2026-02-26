# EduMetrics AI 📊⚡

An intelligent, AI-powered study companion for PCM (Physics, Chemistry, Mathematics) students targeting JEE and similar competitive exams.

> **"Don't just track marks — understand *why* they went up or down."**

---

## 🚀 Features

### 📊 Dashboard
- Dual-axis performance graph — **Blue line** (Marks) + **Red line** (Rank, inverted so Rank 1 = top)
- AI annotation: detects patterns like *"Marks improved but competition was tougher"*
- Stats overview: Tests taken, Average %, Best Rank, Trend delta
- Test history list, sortable and clickable

### 🎯 Deep Dive (Per-Test Analysis)
- Subject-wise marks entry (Physics, Chemistry, Maths) with live progress bars
- **Time Analysis sliders** — set minutes spent per subject
- **👻 Ghost Mistake Detector** — fires when time spent on a subject heavily outweighs marks scored (e.g. "Physics Time Sink: 70% time for 26% marks")
- **⚠️ Recurring Weakness Detector** — automatically surfaces your *previous* action plan when the same topic appears again
- Action Plan + Missed Formulas logger

### 🧮 Formula Deck
- Auto-populated from every Deep Dive's "Missed Formulas" field
- Search by topic or content
- Mark as Reviewed / Unmark per card
- Manual add support

### 🤖 AI Insights
- **Predictive Score** — linear regression across test history to project next score
- **Consistency Score** — animated SVG ring showing % of tests with action plans
- **Smart Topic Association** — clusters weakness keywords (Mechanics, Optics, Electrostatics, Organic, Calculus)
- **Ghost Mistake History** — aggregate view of time-sink subjects across all tests
- **Recent Activity Timeline** — last 5 tests with % deltas and weakness snippets

### 📄 PDF Export
- Exports performance chart + full test history as a PDF

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | Vanilla CSS (dark theme, CSS custom properties) |
| Charts | [Chart.js 4](https://www.chartjs.org/) via CDN |
| PDF Export | [jsPDF](https://github.com/parallax/jsPDF) + [html2canvas](https://html2canvas.hertzen.com/) via CDN |
| Storage | `localStorage` (no backend required) |
| Fonts | Inter + JetBrains Mono (Google Fonts) |

> **No build step, no Node.js, no dependencies to install.** Just open in a browser.

---

## 📂 Project Structure

```
edumetrics-ai/
├── index.html          ← Dashboard (start here)
├── deep-dive.html      ← Per-test Deep Dive analysis
├── formula-deck.html   ← Weak Formula flashcard deck
├── ai-insights.html    ← AI predictions & insights
└── src/
    ├── style.css       ← Global dark theme stylesheet
    ├── store.js        ← localStorage data layer + all AI logic
    ├── dashboard.js    ← Dashboard chart, modal, PDF export
    ├── deep-dive.js    ← Subject inputs, sliders, Ghost Mistake, weakness log
    ├── formula-deck.js ← Card rendering, search, reviewed toggle
    └── ai-insights.js  ← Predictive analysis, consistency ring, topic clusters
```

---

## ▶️ Running Locally

Since this is a pure HTML/JS app, you just need a local HTTP server (to avoid CORS issues with CDN scripts).

### Option 1 — Python (recommended, no install)
```bash
cd edumetrics-ai
python -m http.server 8787
# Then open: http://localhost:8787
```

### Option 2 — VS Code Live Server
Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer), right-click `index.html` → **Open with Live Server**.

### Option 3 — Node.js (if installed)
```bash
npx serve .
```

---

## 🌐 Deploying to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to **Deploy from a branch → main → / (root)**
4. Your app will be live at `https://<your-username>.github.io/edumetrics-ai/`

> ✅ Works perfectly on GitHub Pages — no server-side code, no build step.

---

## 📤 Pushing to GitHub (First Time)

```bash
git init
git add .
git commit -m "Initial commit: EduMetrics AI"
git branch -M main
git remote add origin https://github.com/<your-username>/edumetrics-ai.git
git push -u origin main
```

---

## 🧠 AI Features Explained

All AI logic runs **entirely client-side** — no API keys, no external calls.

| Feature | How It Works |
|---|---|
| Ghost Mistake | Compares `timeShare%` vs `marksShare%` per subject. If time > marks + 20%, fires alert |
| Recurring Weakness | Keyword extraction + substring match across all stored test logs |
| Predictive Score | Simple linear regression on the marks percentage history |
| Topic Clustering | Keyword matching against pre-defined topic dictionaries (Mechanics, Optics, etc.) |
| Consistency Score | `tests_with_action_plan / total_tests × 100` |

---

## 👤 Author

**Made with ❤️ by Vaibhav Bolia**

---

## 📄 License

MIT License — feel free to use, fork, and modify.
