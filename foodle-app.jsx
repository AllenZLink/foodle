/* Foodle main app */

const { useState: useS, useEffect: useE, useMemo: useM, useRef: useR, useCallback: useC } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "kitchen",
  "font": "newsreader",
  "tileShape": "rounded",
  "animSpeed": 1,
  "dark": false,
  "difficulty": "normal"
}/*EDITMODE-END*/;

const THEMES = {
  kitchen: { name: "Kitchen", correct: "#5b8a4a", present: "#d29a3a", accent: "#c44536", cream: "#f8f3e7", ink: "#231f1c" },
  midnight: { name: "Midnight", correct: "#6aa56a", present: "#e0b651", accent: "#e07856", cream: "#f8f3e7", ink: "#231f1c" },
  citrus:  { name: "Citrus", correct: "#9bb83a", present: "#e9a430", accent: "#e7572f", cream: "#fbf6e8", ink: "#1f1d18" },
  berry:   { name: "Berry",  correct: "#7a4d8c", present: "#d65a8a", accent: "#a83258", cream: "#faf2ee", ink: "#241620" },
  espresso:{ name: "Espresso", correct: "#7d6240", present: "#c89b4b", accent: "#a13d2d", cream: "#f5ede0", ink: "#21170f" },
};

const FONTS = {
  newsreader: { ui: "'Geist', system-ui, sans-serif", display: "'Newsreader', Georgia, serif", tile: "'Geist Mono', ui-monospace, monospace" },
  serif:      { ui: "'Source Serif 4', Georgia, serif", display: "'Source Serif 4', Georgia, serif", tile: "'Source Serif 4', Georgia, serif" },
  mono:       { ui: "'Geist Mono', ui-monospace, monospace", display: "'Geist Mono', ui-monospace, monospace", tile: "'Geist Mono', ui-monospace, monospace" },
  rounded:    { ui: "'DM Sans', system-ui, sans-serif", display: "'Fraunces', serif", tile: "'DM Sans', system-ui, sans-serif" },
};

const DIFF_DELTA = { easy: +1, normal: 0, hard: -1 };

function App() {
  // tweaks (TweaksPanel manages its own open state via host message protocol)
  const [tweaks, setTweak] = window.useTweaks
    ? window.useTweaks(TWEAK_DEFAULTS)
    : [TWEAK_DEFAULTS, () => {}];

  const FORCED_MODE = window.FOODLE_FORCED_MODE || null;

  // top-level state
  const [mode, setMode] = useS(() => FORCED_MODE || localStorage.getItem("foodle:mode") || "daily");
  const [len, setLen] = useS(() => parseInt(localStorage.getItem("foodle:len") || "5", 10));
  const maxRows = useM(() => Math.max(4, foodleMaxGuesses(len) + (DIFF_DELTA[tweaks.difficulty] || 0)), [len, tweaks.difficulty]);
  useE(() => localStorage.setItem("foodle:mode", mode), [mode]);
  useE(() => localStorage.setItem("foodle:len", String(len)), [len]);

  // game state
  const [answer, setAnswer] = useS(null);  // {w, e, o, d}
  const [guesses, setGuesses] = useS([]);
  const [evals, setEvals] = useS([]);
  const [current, setCurrent] = useS("");
  const [status, setStatus] = useS("playing"); // playing | won | lost
  const [shakeRow, setShakeRow] = useS(null);
  const [toast, setToast] = useS("");
  const [hintsUsed, setHintsUsed] = useS(0);

  // modals
  const [showHow, setShowHow] = useS(false);
  const [showStats, setShowStats] = useS(false);
  const [showHint, setShowHint] = useS(false);
  const [showShare, setShowShare] = useS(false);
  const [showMenu, setShowMenu] = useS(false);

  // session id for unlimited mode (lets us regenerate)
  const [sessionTick, setSessionTick] = useS(0);

  // load / init game on mode/len change
  useE(() => {
    let saved = mode === "unlimited" ? null : foodleLoadGame(mode, len);
    if (saved && saved.answer && saved.answer.w && saved.answer.w.length === len) {
      setAnswer(saved.answer);
      setGuesses(saved.guesses || []);
      setEvals(saved.evals || []);
      setStatus(saved.status || "playing");
      setHintsUsed(saved.hintsUsed || 0);
    } else {
      const w = foodlePickWord(mode, len);
      setAnswer(w); setGuesses([]); setEvals([]); setStatus("playing"); setHintsUsed(0);
    }
    setCurrent("");
  }, [mode, len, sessionTick]);

  // persist
  useE(() => {
    if (!answer) return;
    if (mode === "unlimited") return;
    foodleSaveGame(mode, len, { answer, guesses, evals, status, hintsUsed });
  }, [answer, guesses, evals, status, hintsUsed, mode, len]);

  // dark mode
  useE(() => {
    document.documentElement.dataset.theme = tweaks.dark ? "dark" : "light";
  }, [tweaks.dark]);

  // theme + fonts
  useE(() => {
    const t = THEMES[tweaks.theme] || THEMES.kitchen;
    const f = FONTS[tweaks.font] || FONTS.newsreader;
    const r = document.documentElement;
    r.style.setProperty("--c-correct", t.correct);
    r.style.setProperty("--c-present", t.present);
    r.style.setProperty("--c-accent", t.accent);
    r.style.setProperty("--c-cream", t.cream);
    r.style.setProperty("--c-ink", t.ink);
    r.style.setProperty("--font-ui", f.ui);
    r.style.setProperty("--font-display", f.display);
    r.style.setProperty("--font-tile", f.tile);
  }, [tweaks.theme, tweaks.font]);

  // input
  const handleKey = useC((k) => {
    if (status !== "playing" || !answer) return;
    if (current.length < len) setCurrent(c => c + k);
  }, [status, current, len, answer]);
  const handleBack = useC(() => {
    if (status !== "playing") return;
    setCurrent(c => c.slice(0, -1));
  }, [status]);
  const handleEnter = useC(() => {
    if (status !== "playing" || !answer) return;
    if (current.length !== len) {
      flashToast("Not enough letters");
      setShakeRow(guesses.length);
      setTimeout(() => setShakeRow(null), 600);
      return;
    }
    const G = current.toUpperCase();
    const valid = window.FOODLE_VALID[len];
    if (!valid.has(G)) {
      flashToast("Not in word list");
      setShakeRow(guesses.length);
      setTimeout(() => setShakeRow(null), 600);
      return;
    }
    const ev = foodleEval(G, answer.w);
    const newGuesses = [...guesses, G];
    const newEvals = [...evals, ev];
    setGuesses(newGuesses); setEvals(newEvals); setCurrent("");
    if (G === answer.w) {
      setStatus("won");
      const reveal = 600 + len * 180 * (tweaks.animSpeed || 1);
      setTimeout(() => { recordResult(true, newGuesses.length); setShowStats(true); }, reveal);
      flashToast(["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!", "Nice!", "Saved it!"][newGuesses.length - 1] || "Well done!");
    } else if (newGuesses.length >= maxRows) {
      setStatus("lost");
      const reveal = 600 + len * 180 * (tweaks.animSpeed || 1);
      setTimeout(() => { recordResult(false, 0); setShowStats(true); }, reveal);
    }
  }, [status, current, len, answer, guesses, evals, maxRows, tweaks.animSpeed]);

  // physical keyboard
  useE(() => {
    function onKeyDown(e) {
      if (showHow || showStats || showHint || showShare || showMenu) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") { e.preventDefault(); handleEnter(); }
      else if (e.key === "Backspace") { e.preventDefault(); handleBack(); }
      else if (/^[a-zA-Z]$/.test(e.key)) { handleKey(e.key.toUpperCase()); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey, handleEnter, handleBack, showHow, showStats, showHint, showShare, showMenu]);

  function flashToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }

  function recordResult(won, attempts) {
    const stats = foodleLoadStats(mode, len);
    const key = foodleGameKey(mode, len);
    if (stats.lastWonKey === key) return;
    stats.played += 1;
    if (won) {
      stats.won += 1;
      stats.streak += 1;
      stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      stats.dist[attempts - 1] = (stats.dist[attempts - 1] || 0) + 1;
      stats.lastWonKey = key;
    } else {
      stats.streak = 0;
    }
    foodleSaveStats(mode, len, stats);
  }

  // keyboard color state
  const keyState = useM(() => {
    const m = {};
    const order = { absent: 1, present: 2, correct: 3 };
    for (let i = 0; i < guesses.length; i++) {
      const g = guesses[i]; const ev = evals[i];
      for (let j = 0; j < g.length; j++) {
        const ch = g[j], s = ev[j];
        if (!m[ch] || (order[s] || 0) > (order[m[ch]] || 0)) m[ch] = s;
      }
    }
    return m;
  }, [guesses, evals]);

  function nextWord() {
    setSessionTick(t => t + 1);
    setShowStats(false);
  }

  function useHint() {
    if (status !== "playing") return;
    setHintsUsed(h => h + 1);
    // costs one guess: pad evals/guesses with a blank entry that shifts maxRows
    // simpler implementation: just decrement remaining attempts via a phantom guess row marked absent
    setGuesses(g => [...g, ""]);
    setEvals(e => [...e, Array(len).fill("absent")]);
  }

  const stats = useM(() => foodleLoadStats(mode, len), [mode, len, showStats, status]);
  const countdown = useFoodleCountdown(mode);

  // share
  function shareResult() {
    if (!answer) return;
    const realEvals = evals.filter((_, i) => guesses[i] && guesses[i].length === len);
    const text = foodleShareText({
      word: answer, evals: realEvals, mode, len,
      attempts: realEvals.length, won: status === "won",
    });
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => flashToast("Copied to clipboard!"));
    } else {
      flashToast("Copy: " + text.split("\n")[0]);
    }
    setShowShare(true);
  }

  // ----- render -----
  const t = THEMES[tweaks.theme] || THEMES.kitchen;
  const isDone = status !== "playing";

  return (
    <div className="app">
      <header className="topbar">
        <button className="icon-btn" onClick={() => setShowMenu(s => !s)} aria-label="Menu">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <div className="brand">
          <span className="brand-mark">●</span>
          <span className="brand-name">Foodle</span>
        </div>
        <div className="topbar-right">
          <button className="icon-btn" onClick={() => setShowHow(true)} aria-label="How to play">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4M12 17.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <button className="icon-btn" onClick={() => setShowStats(true)} aria-label="Stats">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M5 20V10M12 20V4M19 20v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <button className="icon-btn" onClick={() => setTweak("dark", !tweaks.dark)} aria-label="Toggle dark mode">
            {tweaks.dark
              ? <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              : <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>}
          </button>
        </div>
      </header>

      {showMenu && (
        <div className="menu-drop" onMouseLeave={() => setShowMenu(false)}>
          <a href={(/\/(hourly|unlimited)\//.test(location.pathname) ? "../" : "") + "wordle-hint-today.html"}>NYT Wordle hint &amp; answer (today)</a>
          <a href={(/\/(hourly|unlimited)\//.test(location.pathname) ? "../" : "") + "hints-date.html"}>Wordle archive by date</a>
          <a href={(/\/(hourly|unlimited)\//.test(location.pathname) ? "../" : "") + "privacy-policy.html"}>Privacy Policy</a>
          <a href={(/\/(hourly|unlimited)\//.test(location.pathname) ? "../" : "") + "terms-and-conditions.html"}>Terms &amp; Conditions</a>
          <button className="menu-link" onClick={() => { setShowHow(true); setShowMenu(false); }}>How to play</button>
        </div>
      )}

      <div className="control-strip">
        <div className="seg" role="tablist" aria-label="Mode">
          {[
            { id: "daily", href: "index.html", label: "Daily" },
            { id: "hourly", href: "hourly/", label: "Hourly" },
            { id: "unlimited", href: "unlimited/", label: "Unlimited" },
          ].map(m => {
            const on = mode === m.id;
            const inSub = /\/(hourly|unlimited)\//.test(window.location.pathname);
            const href = inSub ? (m.id === "daily" ? "../index.html" : `../${m.href}`) : m.href;
            return FORCED_MODE
              ? <a key={m.id} className={`seg-btn ${on ? "seg-on" : ""}`} href={href}>{m.label}</a>
              : <button key={m.id} className={`seg-btn ${on ? "seg-on" : ""}`} onClick={() => setMode(m.id)}>{m.label}</button>;
          })}
        </div>
        <div className="seg seg-small" role="tablist" aria-label="Length">
          {[5, 6, 7].map(n => (
            <button key={n} className={`seg-btn ${len === n ? "seg-on" : ""}`} onClick={() => setLen(n)}>{n}</button>
          ))}
        </div>
        {countdown && (
          <div className="countdown" title={`Next ${mode} word in`}>
            <span className="cd-dot">⏱</span>{countdown}
          </div>
        )}
      </div>

      <main className="play-area">
        {isDone && answer && (
          <FoodleFoodCard
            word={answer}
            isWin={status === "won"}
            attempts={guesses.filter(g => g && g.length === len).length}
            onShare={shareResult}
            onNext={nextWord}
            onClose={() => {}}
            mode={mode}
            countdown={countdown}
          />
        )}

        {!isDone && (
          <FoodleBoard
            guesses={guesses}
            evals={evals}
            current={current}
            length={len}
            maxRows={maxRows}
            shape={tweaks.tileShape}
            shakeRow={shakeRow}
            animSpeed={tweaks.animSpeed}
          />
        )}

        <div className="game-meta">
          <div className="meta-cell">
            <div className="meta-label">Streak</div>
            <div className="meta-val">🔥 {stats.streak}</div>
          </div>
          <button
            className="hint-btn"
            disabled={isDone}
            onClick={() => setShowHint(true)}
          >
            💡 Hint <span className="hint-ct">{hintsUsed}/3 used</span>
          </button>
          <div className="meta-cell">
            <div className="meta-label">Guesses</div>
            <div className="meta-val">{guesses.filter(g => g && g.length === len).length}/{maxRows - hintsUsed}</div>
          </div>
        </div>
      </main>

      <FoodleKeyboard keyState={keyState} onKey={handleKey} onEnter={handleEnter} onBack={handleBack} shape={tweaks.tileShape} />

      {toast && <div className="toast">{toast}</div>}

      <FoodleHowTo open={showHow} onClose={() => setShowHow(false)} />
      <FoodleStats
        open={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
        mode={mode}
        len={len}
        lastRow={guesses.filter(g => g && g.length === len).length - 1}
        won={status === "won"}
        countdown={countdown}
        onPlayNext={nextWord}
      />
      <FoodleHintModal
        open={showHint}
        onClose={() => setShowHint(false)}
        word={answer}
        hintsUsed={hintsUsed}
        onUseHint={() => { useHint(); setShowHint(false); }}
      />
      <FoodleModal open={showShare} onClose={() => setShowShare(false)} title="Share your result">
        <pre className="share-pre">{answer && foodleShareText({
          word: answer,
          evals: evals.filter((_, i) => guesses[i] && guesses[i].length === len),
          mode, len,
          attempts: guesses.filter(g => g && g.length === len).length,
          won: status === "won",
        })}</pre>
        <button className="btn btn-primary btn-block" onClick={() => {
          const text = foodleShareText({
            word: answer,
            evals: evals.filter((_, i) => guesses[i] && guesses[i].length === len),
            mode, len,
            attempts: guesses.filter(g => g && g.length === len).length,
            won: status === "won",
          });
          navigator.clipboard?.writeText(text);
          flashToast("Copied to clipboard!");
        }}>Copy to clipboard</button>
      </FoodleModal>

      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection label="Theme">
            <window.TweakRadio label="Mode" value={tweaks.dark ? "dark" : "light"} options={["light", "dark"]} onChange={v => setTweak("dark", v === "dark")} />
            <window.TweakSelect label="Color theme" value={tweaks.theme} options={Object.keys(THEMES).map(k => ({ value: k, label: THEMES[k].name }))} onChange={v => setTweak("theme", v)} />
            <window.TweakSelect label="Font set" value={tweaks.font} options={[{value:"newsreader",label:"Newsreader + Geist"},{value:"serif",label:"Source Serif"},{value:"mono",label:"Geist Mono"},{value:"rounded",label:"Fraunces + DM Sans"}]} onChange={v => setTweak("font", v)} />
          </window.TweakSection>
          <window.TweakSection label="Tiles">
            <window.TweakRadio label="Shape" value={tweaks.tileShape} options={["square", "rounded", "round"]} onChange={v => setTweak("tileShape", v)} />
            <window.TweakSlider label="Animation speed" value={tweaks.animSpeed} min={0.3} max={2} step={0.1} unit="×" onChange={v => setTweak("animSpeed", v)} />
          </window.TweakSection>
          <window.TweakSection label="Difficulty">
            <window.TweakRadio label="Guesses" value={tweaks.difficulty} options={["easy", "normal", "hard"]} onChange={v => setTweak("difficulty", v)} />
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </div>
  );
}

window.FoodleApp = App;
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
