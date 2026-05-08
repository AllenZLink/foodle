/* Foodle modals: How-to-play, Stats, Win, Hint, Mode/Length picker */

const { useState: useStateM, useEffect: useEffectM, useMemo: useMemoM } = React;

// ---------- countdown ----------
function useCountdown(mode) {
  const [now, setNow] = useStateM(Date.now());
  useEffectM(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (mode === "unlimited") return null;
  const d = new Date();
  let target;
  if (mode === "daily") {
    target = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0);
  } else {
    target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1, 0, 0);
  }
  const diff = Math.max(0, target.getTime() - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = n => String(n).padStart(2, "0");
  return mode === "daily" ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// ---------- modal shell ----------
function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        {title && <h2 className="modal-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

// ---------- How to play ----------
function HowToPlay({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="How to play">
      <p className="modal-body">Guess the food word. Each guess must be a real word.</p>
      <p className="modal-body">After each guess, the tiles flip to show how close you were.</p>
      <div className="howto-examples">
        <div className="howto-row">
          <span className="ex-tile ex-correct">B</span>
          <span className="ex-tile">R</span>
          <span className="ex-tile">E</span>
          <span className="ex-tile">A</span>
          <span className="ex-tile">D</span>
        </div>
        <p className="howto-line"><b>B</b> is in the word and in the right spot.</p>
        <div className="howto-row">
          <span className="ex-tile">P</span>
          <span className="ex-tile ex-present">I</span>
          <span className="ex-tile">Z</span>
          <span className="ex-tile">Z</span>
          <span className="ex-tile">A</span>
        </div>
        <p className="howto-line"><b>I</b> is in the word but in the wrong spot.</p>
        <div className="howto-row">
          <span className="ex-tile">S</span>
          <span className="ex-tile">A</span>
          <span className="ex-tile">L</span>
          <span className="ex-tile ex-absent">A</span>
          <span className="ex-tile">D</span>
        </div>
        <p className="howto-line">The second <b>A</b> is not in the word.</p>
        <div className="howto-modes">
          <div><b>Daily</b> — one fresh word every midnight.</div>
          <div><b>Hourly</b> — a new word at the top of every hour.</div>
          <div><b>Unlimited</b> — keep going as long as you like.</div>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Stats modal ----------
function Stats({ open, onClose, stats, mode, len, lastRow, won, countdown, onPlayNext }) {
  const winPct = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
  const max = Math.max(1, ...stats.dist);
  const rows = stats.dist.slice(0, foodleMaxGuesses(len));
  return (
    <Modal open={open} onClose={onClose} title="Statistics">
      <div className="stats-grid">
        <div className="stat-cell"><div className="stat-num">{stats.played}</div><div className="stat-label">Played</div></div>
        <div className="stat-cell"><div className="stat-num">{winPct}</div><div className="stat-label">Win %</div></div>
        <div className="stat-cell"><div className="stat-num">{stats.streak}</div><div className="stat-label">Streak</div></div>
        <div className="stat-cell"><div className="stat-num">{stats.maxStreak}</div><div className="stat-label">Best</div></div>
      </div>
      <h3 className="modal-subhead">Guess distribution</h3>
      <div className="dist">
        {rows.map((n, i) => (
          <div key={i} className="dist-row">
            <span className="dist-idx">{i + 1}</span>
            <div className="dist-bar-wrap">
              <div
                className={`dist-bar ${won && lastRow === i ? "dist-bar-active" : ""}`}
                style={{ width: `${Math.max(7, (n / max) * 100)}%` }}
              >
                {n}
              </div>
            </div>
          </div>
        ))}
      </div>
      {countdown && (
        <div className="next-strip">
          <div>
            <div className="next-label">Next {mode === "daily" ? "daily" : "hourly"} word</div>
            <div className="next-time">{countdown}</div>
          </div>
          {mode === "unlimited" && <button className="btn btn-primary" onClick={onPlayNext}>Play next</button>}
        </div>
      )}
      {mode === "unlimited" && (
        <div className="next-strip">
          <div className="next-label">Unlimited mode</div>
          <button className="btn btn-primary" onClick={onPlayNext}>Next word</button>
        </div>
      )}
    </Modal>
  );
}

// ---------- Win / loss card with food info ----------
function FoodCard({ word, isWin, attempts, onShare, onNext, onClose, mode, countdown }) {
  if (!word) return null;
  return (
    <div className="food-card">
      <div className="food-emoji">{word.e}</div>
      <div className="food-eyebrow">{isWin ? `Solved in ${attempts}` : "The word was"}</div>
      <div className="food-word">{word.w}</div>
      <div className="food-origin">{word.o}</div>
      <p className="food-desc">{word.d}</p>
      <div className="food-actions">
        <button className="btn btn-primary" onClick={onShare}>Share result</button>
        {mode === "unlimited"
          ? <button className="btn btn-ghost" onClick={onNext}>Next word →</button>
          : countdown && <span className="food-countdown">Next in {countdown}</span>}
      </div>
    </div>
  );
}

// ---------- Hint modal ----------
function HintModal({ open, onClose, word, onUseHint, hintsUsed }) {
  if (!word) return null;
  const hints = [
    `Origin: ${word.o}`,
    `Starts with the letter "${word.w[0]}"`,
    `Contains the letter "${word.w[Math.floor(word.w.length / 2)]}"`,
  ];
  return (
    <Modal open={open} onClose={onClose} title="Need a hint?">
      <p className="modal-body">Each hint costs one of your guesses. Use them wisely.</p>
      <div className="hint-list">
        {hints.map((h, i) => (
          <div key={i} className={`hint-row ${i < hintsUsed ? "hint-revealed" : ""}`}>
            <span className="hint-num">{i + 1}</span>
            <span className="hint-text">{i < hintsUsed ? h : "•••••••••••••••••••"}</span>
          </div>
        ))}
      </div>
      {hintsUsed < hints.length && (
        <button className="btn btn-primary btn-block" onClick={onUseHint}>
          Reveal hint #{hintsUsed + 1} (costs 1 guess)
        </button>
      )}
    </Modal>
  );
}

// ---------- Share grid generator ----------
function buildShareText({ word, evals, mode, len, attempts, won }) {
  const head = `Foodle ${mode === "daily" ? "Daily" : mode === "hourly" ? "Hourly" : ""} ${len}-letter — ${won ? attempts : "X"}/${foodleMaxGuesses(len)}`;
  const map = { correct: "🟩", present: "🟨", absent: "⬛" };
  const grid = evals.map(row => row.map(s => map[s] || "⬜").join("")).join("\n");
  return `${head}\n\n${grid}\n\nfoodle.game`;
}

Object.assign(window, { useFoodleCountdown: useCountdown, FoodleModal: Modal, FoodleHowTo: HowToPlay, FoodleStats: Stats, FoodleFoodCard: FoodCard, FoodleHintModal: HintModal, foodleShareText: buildShareText });
