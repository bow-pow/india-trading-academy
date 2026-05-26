// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURATION — fill these in before deploying
// ─────────────────────────────────────────────────────────────────────────────
//
//  Setup (one-time):
//
//  1. Create a Firebase project at https://console.firebase.google.com
//     → Enable Authentication → Google provider
//     → Create Firestore database (production mode)
//     → Apply firestore.rules to the database
//     → Project Settings → Your apps → Web app → copy the firebaseConfig below
//
//  2. In Firebase Authentication → Settings → Authorized domains, add your
//     GitHub Pages domain (e.g. yourname.github.io).
//
//  No other API keys are required. All 175+ lessons ship as static JSON
//  inside /lessons. The optional final 5 lessons (days 176–180) can be
//  dropped in later as /lessons/finallesson.json without any code changes.
//
// ─────────────────────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: "AIzaSyDHPmwSo1-StnyPjK12EtMd25szGFpa5QE",
  authDomain: "india-trading-academy.firebaseapp.com",
  projectId: "india-trading-academy",
  storageBucket: "india-trading-academy.firebasestorage.app",
  messagingSenderId: "505912356331",
  appId: "1:505912356331:web:81b2129b93bd412f67bdae"
};
