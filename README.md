# India Trading Academy · 180-Day Curriculum

A static webapp delivering one math-heavy day trading lesson per day, focused on
Indian markets (NSE / BSE / F&O / SEBI). 175 lessons pre-generated and ship with
the site; an optional final batch of 5 lessons (days 176–180) can be dropped in
later without any code changes

## Architecture ..

```
┌───────────────────┐         ┌──────────────────────┐
│  GitHub Pages     │ static  │  Firebase            │
│  (HTML/CSS/JS)    │◄────────┤  • Auth (Google)     │
│  + lessons/*.json │         │  • Firestore (state) │
└───────────────────┘         └──────────────────────┘
```

* **No build step.** Preact + htm from esm.sh CDN.
* **No runtime LLM.** All lessons ship as static JSON.
* **No backend.** Firebase handles auth + per-user state (currentDay, completed,
  favorites, notes).

## Files

```
index.html           HTML shell
style.css            Trading-terminal aesthetic
app.js               Main Preact app
config.js            FILL IN: your Firebase config
curriculum.js        180-day curriculum (topics, phases, tags)
firestore.rules      Security: users only access their own doc
lessons/
  lessons.json                  Days 1–175 (already merged)
  finallesson.json              Days 176–180 (OPTIONAL — drop in later)
  finallesson.json.template     Schema reference for the trailing batch
```

## One-time setup

1. **Firebase project** → https://console.firebase.google.com
   - Enable **Authentication → Google** provider.
   - Create a **Firestore** database (production mode).
   - Paste contents of `firestore.rules` into Firestore → Rules → Publish.
   - Project Settings → Your apps → Web app → copy the `firebaseConfig` object
     into `config.js`.
   - Authentication → Settings → Authorized domains → add your GitHub Pages
     domain (e.g. `yourname.github.io`).

2. **GitHub repo** → create, push everything in this folder to `main`.

3. **GitHub Pages** → Repository → Settings → Pages → Source: `main` / root.
   Your site goes live at `https://<username>.github.io/<repo>/`.

That's it. No API keys, no Cloud Functions, no server. Sign in with Google,
your progress syncs across devices.

## Adding the final 5 lessons later

When you're ready to ship days 176–180:

1. Generate the JSON in the schema shown in `lessons/finallesson.json.template`.
2. Save it as `lessons/finallesson.json` in this repo.
3. Commit and push. GitHub Pages redeploys; the app picks up the new days
   automatically on next page load.

No code changes. No Firestore migration. Days 176–180 simply transition from
"📘 Lesson coming soon" placeholders to fully-functional lessons.

## Adding NEW lessons / replacing existing ones

* Regenerate `lessons/lessons.json` if you want to revise days 1–175.
* The cache header `cache: "force-cache"` plus the static path means users may
  see the old version until their browser cache expires. To force a refresh,
  bump a query string in `app.js` (`./lessons/lessons.json?v=2`).

## Curriculum overview

| Phase | Days     | Theme                                              |
| ----- | -------- | -------------------------------------------------- |
| 1     | 1–20     | Foundations · NSE/BSE/SEBI, indices, statistics    |
| 2     | 21–40    | Price Action · candles, Fibonacci, VWAP, ORB       |
| 3     | 41–70    | Indicators · MA/MACD/RSI/Bollinger/Ichimoku/etc.   |
| 4     | 71–100   | Options & F&O · Greeks, BSM, IV, spreads, condors  |
| 5     | 101–130  | Risk Mgmt · Kelly, VaR, drawdowns, sizing, psych   |
| 6     | 131–160  | Strategies · trend, mean-rev, pairs, events, expiry|
| 7     | 161–180  | Quantitative · backtesting, GARCH, ML, execution   |

Each lesson follows the same 11-field schema (concept, why_matters, core_formula,
secondary_formula, worked_example, india_insight, practice_problem,
practice_answer, key_numbers, common_mistake, next_step).

## Local development

Any static server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Firebase Auth requires `http://localhost` in Authorized domains (already
allowlisted by default for local development).
