// ─── India Trading Academy · main app ────────────────────────────────────────
import { h, render, Fragment } from "https://esm.sh/preact@10.22.0";
import { useState, useEffect, useCallback, useRef } from "https://esm.sh/preact@10.22.0/hooks";
import htm from "https://esm.sh/htm@3.1.1";

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, deleteField, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { firebaseConfig } from "./config.js";
import { CURRICULUM, PHASE_COLORS, PHASE_ORDER } from "./curriculum.js";

const html = htm.bind(h);
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ─── Static Lesson Loader ────────────────────────────────────────────────────
// Lessons are pre-generated and ship with the site as JSON files.
// `lessons.json`        — main batch, days 1..N (currently 1..175)
// `finallesson.json`    — optional trailing batch (days 176..180), added later
//
// Both files are fetched in parallel on app start. If `finallesson.json` is
// missing (404), the app gracefully runs with whatever days are available.
let LESSONS_MAP = null;       // day (int) -> lesson object
let LESSONS_LOADED = false;

async function loadAllLessons() {
  if (LESSONS_LOADED) return LESSONS_MAP;

  const fetchJSON = async (path) => {
    try {
      const r = await fetch(path, { cache: "force-cache" });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  };

  const [main, final] = await Promise.all([
    fetchJSON("./lessons/lessons.json"),
    fetchJSON("./lessons/finallesson.json"),
  ]);

  const map = {};
  if (Array.isArray(main))  main.forEach(l => { if (l && l.day) map[l.day] = l; });
  if (Array.isArray(final)) final.forEach(l => { if (l && l.day) map[l.day] = l; });

  LESSONS_MAP = map;
  LESSONS_LOADED = true;
  return map;
}

function getLesson(day) {
  return LESSONS_MAP ? LESSONS_MAP[day] || null : null;
}

// ─── LaTeX-ish renderer ──────────────────────────────────────────────────────
function renderFormula(latex) {
  if (!latex) return "";
  return latex
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1) / ($2)")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\sum/g, "Σ").replace(/\\prod/g, "Π")
    .replace(/\\sigma/g, "σ").replace(/\\mu/g, "μ")
    .replace(/\\alpha/g, "α").replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ").replace(/\\delta/g, "δ").replace(/\\Delta/g, "Δ")
    .replace(/\\lambda/g, "λ").replace(/\\rho/g, "ρ")
    .replace(/\\theta/g, "θ").replace(/\\Theta/g, "Θ")
    .replace(/\\nu/g, "ν").replace(/\\pi/g, "π").replace(/\\infty/g, "∞")
    .replace(/\\times/g, "×").replace(/\\cdot/g, "·").replace(/\\pm/g, "±")
    .replace(/\\leq/g, "≤").replace(/\\geq/g, "≥").replace(/\\neq/g, "≠").replace(/\\approx/g, "≈")
    .replace(/\\ln/g, "ln").replace(/\\log/g, "log").replace(/\\exp/g, "exp")
    .replace(/\\left\(/g, "(").replace(/\\right\)/g, ")")
    .replace(/\\left\[/g, "[").replace(/\\right\]/g, "]")
    .replace(/\\,|\\;|\\:/g, " ")
    .replace(/\\\\/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\\_/g, "_");
}

// ─── Firestore helpers ───────────────────────────────────────────────────────
const userRef    = uid => doc(db, "users", uid);

async function loadUserData(uid) {
  const snap = await getDoc(userRef(uid));
  if (!snap.exists()) {
    const blank = {
      currentDay: 1, completed: [], favorites: [], notes: {},
      startedAt: serverTimestamp(),
    };
    await setDoc(userRef(uid), blank);
    return { ...blank, completed: [], favorites: [], notes: {} };
  }
  const d = snap.data();
  return {
    currentDay: d.currentDay || 1,
    completed:  d.completed  || [],
    favorites:  d.favorites  || [],
    notes:      d.notes      || {},
  };
}

// (Lesson caching in Firestore removed — lessons now ship statically with site.)

// ─── Login Screen ────────────────────────────────────────────────────────────
function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const signIn = async () => {
    setBusy(true); setErr(null);
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return html`
    <div class="login">
      <div class="login-card slide-in">
        <div class="login-brand">
          <div class="login-brand-dot blink"></div>
          <span class="login-brand-text">INDIA TRADING ACADEMY</span>
        </div>
        <h1 class="login-title">Your 180-day study partner</h1>
        <p class="login-subtitle">
          One math-heavy lesson a day. NSE, BSE, F&O, SEBI rules. Real INR examples.
          Your progress, favourites and notes sync across devices.
        </p>
        <div class="login-features">
          <div class="login-feature"><strong>📐 Math-first</strong>Formulas, derivations, worked examples</div>
          <div class="login-feature"><strong>🇮🇳 India-focused</strong>Nifty, BankNifty, SEBI, F&O</div>
          <div class="login-feature"><strong>♥ Favourites</strong>Save lessons to revisit</div>
          <div class="login-feature"><strong>✎ Notes</strong>Your thoughts, per lesson</div>
        </div>
        <button class="btn-google" onClick=${signIn} disabled=${busy}>
          ${busy ? "SIGNING IN…" : "CONTINUE WITH GOOGLE →"}
        </button>
        ${err && html`<p style="color:#f87171;font-size:11px;margin-top:12px;text-align:center">${err}</p>`}
        <p class="login-footer">
          Your data is stored in your own Firebase project.<br/>
          No tracking · No ads · One lesson per day forever.
        </p>
      </div>
    </div>
  `;
}

// ─── Lesson View ─────────────────────────────────────────────────────────────
function LessonView({ user, state, setState, day, goToDay }) {
  const dayData = CURRICULUM[day - 1];
  const phase = dayData.phase;
  const colors = PHASE_COLORS[phase];

  const [lesson, setLesson]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState(null);
  const [showAns, setShowAns] = useState(false);
  const [noteText, setNoteText] = useState(state.notes[day] || "");
  const [noteStatus, setNoteStatus] = useState("idle"); // idle | saving | saved
  const noteTimer = useRef(null);

  // CSS vars for theme
  const cssVars = {
    "--accent":            colors.accent,
    "--accent-bg":         colors.bg,
    "--accent-soft":       `${colors.accent}18`,
    "--accent-border":     `${colors.accent}40`,
    "--accent-text":       `${colors.accent}cc`,
    "--accent-glow":       `${colors.glow}40`,
    "--accent-glow-solid": colors.glow,
  };

  useEffect(() => { setNoteText(state.notes[day] || ""); setNoteStatus("idle"); }, [day]);

  // Load lesson from pre-generated static JSON
  const fetchLesson = useCallback(async () => {
    setLoading(true); setErr(null); setLesson(null); setShowAns(false);
    try {
      await loadAllLessons();
      const l = getLesson(day);
      if (!l) {
        setErr("upcoming");  // sentinel: lesson exists in curriculum but JSON not yet shipped
      } else {
        setLesson(l);
      }
    } catch (e) {
      setErr(e.message || "Failed to load lesson");
    }
    setLoading(false);
  }, [day]);

  useEffect(() => { fetchLesson(); }, [day]);

  // Notes auto-save (debounced)
  const onNoteChange = e => {
    const v = e.target.value;
    setNoteText(v);
    setNoteStatus("saving");
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(async () => {
      const newNotes = { ...state.notes };
      if (v.trim()) newNotes[day] = v;
      else delete newNotes[day];
      try {
        await updateDoc(userRef(user.uid), v.trim()
          ? { [`notes.${day}`]: v }
          : { [`notes.${day}`]: deleteField() });
        setState({ ...state, notes: newNotes });
        setNoteStatus("saved");
        setTimeout(() => setNoteStatus("idle"), 1500);
      } catch (e) { setNoteStatus("idle"); }
    }, 800);
  };

  // Favourite toggle
  const isFav = state.favorites.includes(day);
  const toggleFav = async () => {
    const newFavs = isFav ? state.favorites.filter(d => d !== day) : [...state.favorites, day];
    setState({ ...state, favorites: newFavs });
    await updateDoc(userRef(user.uid), { favorites: newFavs });
  };

  // Mark complete
  const markComplete = async () => {
    if (state.completed.includes(day)) return;
    const newCompleted = [...state.completed, day];
    const nextDay = Math.min(day + 1, 180);
    setState({ ...state, completed: newCompleted, currentDay: nextDay });
    await updateDoc(userRef(user.uid), { completed: newCompleted, currentDay: nextDay });
    if (day < 180) goToDay(day + 1);
  };

  const completed = state.completed.includes(day);

  return html`
    <div class="lesson-wrap" style=${cssVars}>
      <div class="lesson-head slide-in">
        <div>
          <div class="lesson-meta">
            <span class="day-label">DAY ${day} / 180</span>
            <span class="phase-pill">${phase.toUpperCase()}</span>
            ${completed && html`<span class="completed-pill">✓ COMPLETE</span>`}
          </div>
          <h1 class="lesson-title">${dayData.topic}</h1>
          <div class="tag-row">
            ${dayData.tags.map(t => html`<span class="tag">${t}</span>`)}
          </div>
        </div>
        <div class="nav-arrows">
          <button class="icon-btn ${isFav ? "active" : ""}" onClick=${toggleFav} title="Favourite">
            ${isFav ? "♥" : "♡"}
          </button>
          <button class="nav-arrow" onClick=${() => day > 1 && goToDay(day - 1)} disabled=${day <= 1}>←</button>
          <button class="nav-arrow" onClick=${() => day < 180 && goToDay(day + 1)} disabled=${day >= 180}>→</button>
        </div>
      </div>

      ${loading && html`
        <div class="loading-wrap">
          <div class="loading-text blink">LOADING LESSON…</div>
          <div class="loading-sub">India-specific math & examples</div>
        </div>
      `}

      ${err === "upcoming" && !loading && html`
        <div class="error-card">
          <div class="error-msg" style=${{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
            📘 Lesson coming soon
          </div>
          <div class="error-sub" style=${{ opacity: 0.7, fontSize: "0.85rem", lineHeight: 1.5 }}>
            Day ${day} (<strong>${dayData?.topic || ""}</strong>) is part of the upcoming
            final batch. You can keep exploring earlier days — the curriculum map shows everything.
          </div>
          <button class="btn-retry" onClick=${fetchLesson} style=${{ marginTop: "1rem" }}>Retry</button>
        </div>
      `}

      ${err && err !== "upcoming" && html`
        <div class="error-card">
          <div class="error-msg">${err}</div>
          <button class="btn-retry" onClick=${fetchLesson}>Retry</button>
        </div>
      `}

      ${lesson && !loading && html`
        <div class="slide-in">
          <div class="card card-concept">
            <div class="card-label">CONCEPT</div>
            <p class="concept-text">${lesson.concept}</p>
            <p class="concept-why">${lesson.why_matters}</p>
          </div>

          <div class="formula-row">
            <div class="formula-card primary">
              <div class="card-label">CORE FORMULA</div>
              <div class="formula-box">${renderFormula(lesson.core_formula?.latex)}</div>
              ${lesson.core_formula?.variables?.map(v => html`<div class="formula-var">${v}</div>`)}
            </div>
            <div class="formula-card secondary">
              <div class="card-label" style="color:#475569">SECONDARY</div>
              <div class="formula-name">${lesson.secondary_formula?.name}</div>
              <div class="formula-box muted">${renderFormula(lesson.secondary_formula?.latex)}</div>
              <div class="formula-note">${lesson.secondary_formula?.note}</div>
            </div>
          </div>

          <div class="card">
            <div class="card-label" style="color:#10b981">WORKED EXAMPLE · INDIA</div>
            <div class="worked-grid">
              <div class="worked-cell setup">
                <div class="worked-cell-label">SETUP</div>
                <div class="worked-cell-content">${lesson.worked_example?.setup}</div>
              </div>
              <div class="worked-cell calc">
                <div class="worked-cell-label">CALCULATION</div>
                <div class="worked-cell-content">${lesson.worked_example?.calculation}</div>
              </div>
              <div class="worked-cell result">
                <div class="worked-cell-label">RESULT</div>
                <div class="worked-cell-content">${lesson.worked_example?.result}</div>
              </div>
            </div>
          </div>

          <div class="card card-insight">
            <div class="card-label">🇮🇳 INDIA INSIGHT</div>
            <p class="insight-text">${lesson.india_insight}</p>
          </div>

          <div class="card">
            <div class="card-label" style="color:#475569">KEY NUMBERS TO MEMORIZE</div>
            <div class="key-numbers">
              ${lesson.key_numbers?.map(n => html`<div class="key-num">${n}</div>`)}
            </div>
          </div>

          <div class="card card-mistake">
            <span class="icon">⚠</span>
            <div>
              <div class="card-label">COMMON MISTAKE</div>
              <div class="mistake-text">${lesson.common_mistake}</div>
            </div>
          </div>

          <div class="card">
            <div class="card-label">PRACTICE PROBLEM</div>
            <p class="practice-text">${lesson.practice_problem}</p>
            <button class="btn-reveal ${showAns ? "active" : ""}" onClick=${() => setShowAns(!showAns)}>
              ${showAns ? "HIDE ANSWER" : "REVEAL ANSWER"}
            </button>
            ${showAns && html`
              <div class="answer-box slide-in">
                <div class="answer-box-label">ANSWER</div>
                <div class="answer-text">${lesson.practice_answer}</div>
              </div>
            `}
          </div>

          <div class="card">
            <div class="card-label">YOUR NOTES</div>
            <textarea
              class="notes-textarea"
              placeholder="Write down your thoughts, questions, observations…"
              value=${noteText}
              onInput=${onNoteChange}
            ></textarea>
            <div class="notes-status ${noteStatus}">
              ${noteStatus === "saving" ? "SAVING…" : noteStatus === "saved" ? "✓ SAVED" : noteText ? "AUTOSAVED" : "PRIVATE TO YOU"}
            </div>
          </div>

          <div class="next-step">
            <span class="next-step-label">NEXT → </span>${lesson.next_step}
          </div>

          <div class="action-row">
            <button class="btn-complete" onClick=${markComplete} disabled=${completed}>
              ${completed ? "✓ COMPLETED" : `MARK DAY ${day} COMPLETE →`}
            </button>
          </div>
        </div>
      `}
    </div>
  `;
}

// ─── Map View ────────────────────────────────────────────────────────────────
function MapView({ state, goToDay, currentDay }) {
  return html`
    <div class="map-wrap slide-in">
      <div class="map-legend">
        Select any day to jump to that lesson. Solid = completed · Glowing = today · <span style="color:#f43f5e">♥</span> = favourited
      </div>
      ${PHASE_ORDER.map(ph => {
        const days = CURRICULUM.filter(d => d.phase === ph);
        const pc = PHASE_COLORS[ph];
        return html`
          <div class="map-phase">
            <div class="map-phase-label" style=${{ color: pc.accent }}>
              ${ph} · Days ${days[0].day}–${days[days.length-1].day}
            </div>
            <div class="map-grid">
              ${days.map(d => {
                const isDone = state.completed.includes(d.day);
                const isFav  = state.favorites.includes(d.day);
                const isCur  = d.day === currentDay;
                return html`
                  <div class="day-dot ${isDone && isFav ? "completed-fav" : ""}"
                    title="Day ${d.day}: ${d.topic}"
                    onClick=${() => goToDay(d.day)}
                    style=${{
                      background: isDone ? pc.accent : isCur ? `${pc.accent}55` : "#1e293b",
                      border: isCur ? `1px solid ${pc.accent}` : "1px solid transparent",
                      boxShadow: isCur ? `0 0 8px ${pc.accent}` : "none",
                    }}
                  ></div>
                `;
              })}
            </div>
          </div>
        `;
      })}
    </div>
  `;
}

// ─── Favorites List ──────────────────────────────────────────────────────────
function FavoritesView({ state, goToDay }) {
  const favs = state.favorites.sort((a, b) => a - b);
  return html`
    <div class="list-wrap slide-in">
      <div class="list-title">♥ YOUR FAVOURITES · ${favs.length}</div>
      ${favs.length === 0 ? html`
        <div class="list-empty">
          No favourites yet. Tap the ♡ icon on any lesson to save it here.
        </div>
      ` : favs.map(d => {
        const data = CURRICULUM[d - 1];
        const pc = PHASE_COLORS[data.phase];
        return html`
          <div class="list-item" onClick=${() => goToDay(d)}
            style=${{ "--accent": pc.accent, "--accent-soft": `${pc.accent}18` }}>
            <div class="list-item-head">
              <span class="list-item-day">DAY ${d}</span>
              <span class="list-item-phase">${data.phase.toUpperCase()}</span>
            </div>
            <div class="list-item-title">${data.topic}</div>
          </div>
        `;
      })}
    </div>
  `;
}

// ─── Notes List ──────────────────────────────────────────────────────────────
function NotesView({ state, goToDay }) {
  const noteDays = Object.keys(state.notes).map(Number).sort((a, b) => a - b);
  return html`
    <div class="list-wrap slide-in">
      <div class="list-title">✎ YOUR NOTES · ${noteDays.length}</div>
      ${noteDays.length === 0 ? html`
        <div class="list-empty">
          No notes yet. Open any lesson and write your thoughts at the bottom — they'll appear here.
        </div>
      ` : noteDays.map(d => {
        const data = CURRICULUM[d - 1];
        const pc = PHASE_COLORS[data.phase];
        return html`
          <div class="list-item" onClick=${() => goToDay(d)}
            style=${{ "--accent": pc.accent, "--accent-soft": `${pc.accent}18` }}>
            <div class="list-item-head">
              <span class="list-item-day">DAY ${d}</span>
              <span class="list-item-phase">${data.phase.toUpperCase()}</span>
            </div>
            <div class="list-item-title">${data.topic}</div>
            <div class="list-item-note">${state.notes[d]}</div>
          </div>
        `;
      })}
    </div>
  `;
}

// ─── App Shell ───────────────────────────────────────────────────────────────
function AppShell({ user }) {
  const [state, setState] = useState(null);
  const [day, setDay]     = useState(1);
  const [view, setView]   = useState("lesson");
  const [showMenu, setShowMenu] = useState(false);

  // Load user data on mount
  useEffect(() => {
    (async () => {
      const s = await loadUserData(user.uid);
      setState(s);
      setDay(s.currentDay || 1);
    })();
  }, [user.uid]);

  if (!state) return html`<div class="boot"><div class="boot-dot"></div><div class="boot-text">LOADING YOUR PROGRESS…</div></div>`;

  const dayData = CURRICULUM[day - 1];
  const colors  = PHASE_COLORS[dayData.phase];

  // Streak: contiguous completed days ending at currentDay-1
  const streak = (() => {
    let s = 0;
    for (let i = state.currentDay - 1; i >= 1; i--) {
      if (state.completed.includes(i)) s++; else break;
    }
    return s;
  })();
  const progress = Math.round((state.completed.length / 180) * 100);

  const goToDay = (d) => { setDay(d); setView("lesson"); };
  const handleSignOut = async () => { await signOut(auth); };

  const cssVars = {
    "--accent":        colors.accent,
    "--accent-soft":   `${colors.accent}18`,
    "--accent-glow":   `${colors.glow}40`,
  };

  return html`
    <div style=${cssVars}>
      <div class="topbar">
        <div class="brand">
          <div class="brand-mark">
            <div class="brand-dot blink"></div>
            <span class="brand-name">INDIA TRADING ACADEMY</span>
          </div>
          <span class="brand-sub">NSE · BSE · F&O</span>
        </div>

        <div class="topbar-stats">
          <div class="stat"><div class="stat-num accent">${streak}</div><div class="stat-lbl">STREAK</div></div>
          <div class="stat"><div class="stat-num green">${state.completed.length}</div><div class="stat-lbl">DONE</div></div>
          <div class="stat"><div class="stat-num white">${180 - state.completed.length}</div><div class="stat-lbl">LEFT</div></div>

          <div class="nav-tabs">
            ${["lesson","map","favorites","notes"].map(v => html`
              <button class="nav-tab ${view === v ? "active" : ""}" onClick=${() => setView(v)}>
                ${v === "favorites" ? "♥" : v === "notes" ? "✎" : v}
              </button>
            `)}
          </div>

          <div class="user-menu">
            <div class="user-avatar" onClick=${() => setShowMenu(!showMenu)}>
              ${user.photoURL
                ? html`<img src=${user.photoURL} style="width:100%;height:100%;border-radius:50%"/>`
                : (user.displayName?.[0] || "?")}
            </div>
            ${showMenu && html`
              <div class="user-dropdown">
                <div class="user-info">
                  <div class="user-info-name">${user.displayName || "Anonymous"}</div>
                  ${user.email}
                </div>
                <div class="user-action" onClick=${() => { goToDay(state.currentDay); setShowMenu(false); }}>
                  → Today's lesson (Day ${state.currentDay})
                </div>
                <div class="user-action" onClick=${handleSignOut}>
                  ↗ Sign out
                </div>
              </div>
            `}
          </div>
        </div>
      </div>

      <div class="progress-bar"><div class="progress-fill" style=${{ width: `${progress}%` }}></div></div>

      ${view === "lesson"    && html`<${LessonView} user=${user} state=${state} setState=${setState} day=${day} goToDay=${goToDay} />`}
      ${view === "map"       && html`<${MapView} state=${state} currentDay=${state.currentDay} goToDay=${goToDay} />`}
      ${view === "favorites" && html`<${FavoritesView} state=${state} goToDay=${goToDay} />`}
      ${view === "notes"     && html`<${NotesView} state=${state} goToDay=${goToDay} />`}

      <div class="footer">INDIA TRADING ACADEMY · 180 DAYS · NSE · BSE · F&O · SEBI</div>
    </div>
  `;
}

// ─── Root ────────────────────────────────────────────────────────────────────
function Root() {
  const [user, setUser]       = useState(undefined); // undefined = loading
  useEffect(() => onAuthStateChanged(auth, u => setUser(u || null)), []);
  useEffect(() => { loadAllLessons(); }, []);  // warm cache early
  if (user === undefined) return html`<div class="boot"><div class="boot-dot"></div><div class="boot-text">CHECKING SESSION…</div></div>`;
  if (user === null)      return html`<${LoginScreen} />`;
  return html`<${AppShell} user=${user} />`;
}

render(html`<${Root} />`, document.getElementById("app"));
