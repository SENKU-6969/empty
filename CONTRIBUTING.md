# Contributing to EduMetrics

Thanks for your interest in contributing. Here's how to get the project running locally.

## Prerequisites

- A modern browser (Chrome/Firefox/Edge)
- A Firebase project with **Authentication** (Google sign-in) and **Firestore** enabled
- Python 3 for the local server (or VS Code with the Live Server extension)

## Local setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/Vbhv-Bolia/edumectrics.git
   cd edumectrics
   ```

2. **Configure Firebase**

   Copy the example config and fill in your values:
   ```bash
   cp src/js/core/firebase-config.example.js src/js/core/firebase-config.js
   ```
   Open `src/js/core/firebase-config.js` and replace each placeholder with your actual Firebase project credentials (found under Project Settings → Your apps in the Firebase console).

   > `firebase-config.js` is in `.gitignore` — never commit it.

3. **Run a local server**
   ```bash
   python -m http.server 8787
   # open http://localhost:8787
   ```
   Or right-click `index.html` in VS Code → **Open with Live Server**.

## Project layout

```
├── index.html            # dashboard
├── deep-dive.html        # per-test analysis
├── formula-deck.html     # formula flashcards
├── ai-insights.html      # trends + predictions
├── import.html           # CollegeDoors import portal
└── src/
    ├── css/style.css
    └── js/
        ├── core/
        │   ├── firebase-config.example.js   # template — copy this
        │   ├── firebase-config.js           # your keys — gitignored
        │   ├── firebase.js                  # auth + Firestore init
        │   └── store.js                     # data layer + logic
        └── pages/
            ├── dashboard.js
            ├── deep-dive.js
            ├── formula-deck.js
            ├── ai-insights.js
            └── import.js
```

## Firestore rules

Make sure your Firestore security rules restrict reads/writes to authenticated users only. A minimal starting point:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Notes

- No build step required — plain HTML/CSS/JS.
- CDN dependencies (Chart.js, jsPDF, Firebase) are loaded directly in each HTML file.
- PRs for bug fixes and UI improvements are welcome. Open an issue first for larger feature changes.
