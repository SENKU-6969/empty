/* ====================================================
   EduMetrics AI — Firebase Initialization
   ==================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyBW88ENCVv7QT5CFHIgzH8GqG3t75TzrYc",
  authDomain: "edumetrics-aea83.firebaseapp.com",
  projectId: "edumetrics-aea83",
  storageBucket: "edumetrics-aea83.firebasestorage.app",
  messagingSenderId: "355793163702",
  appId: "1:355793163702:web:45e2921648e6d61fef9d17",
  measurementId: "G-M107J6DDC4"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence (so app works even with bad network)
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence unavailable (multiple tabs open).');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not supported in this browser.');
  }
});
