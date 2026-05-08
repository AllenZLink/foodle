/* Foodle game core: board + keyboard + state machine */

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ---------- helpers ----------
const STATUS = { EMPTY: "empty", TBD: "tbd", CORRECT: "correct", PRESENT: "present", ABSENT: "absent" };
const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

function dailySeed() {
  // YYYYMMDD as integer
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function hourlySeed() {
  const d = new Date();
  return dailySeed() * 100 + d.getHours();
}
function unlimitedSeed() {
  return Math.floor(Math.random() * 1e9);
}

function pickWord(mode, len) {
  const list = window.FOODLE_WORDS[len];
  let seed;
  if (mode === "daily") seed = dailySeed() * 17 + len;
  else if (mode === "hourly") seed = hourlySeed() * 17 + len;
  else seed = unlimitedSeed();
  // simple LCG-ish
  const idx = Math.abs(Math.imul(seed, 2654435761)) % list.length;
  return list[idx];
}

function evaluate(guess, answer) {
  const result = Array(guess.length).fill(STATUS.ABSENT);
  const aChars = answer.split("");
  // pass 1: correct
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === aChars[i]) {
      result[i] = STATUS.CORRECT;
      aChars[i] = null;
    }
  }
  // pass 2: present
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === STATUS.CORRECT) continue;
    const idx = aChars.indexOf(guess[i]);
    if (idx !== -1) {
      result[i] = STATUS.PRESENT;
      aChars[idx] = null;
    }
  }
  return result;
}

function maxGuesses(len) {
  return len === 5 ? 6 : len === 6 ? 7 : 8;
}

function gameKey(mode, len) {
  if (mode === "daily") return `foodle:${mode}:${len}:${dailySeed()}`;
  if (mode === "hourly") return `foodle:${mode}:${len}:${hourlySeed()}`;
  return `foodle:unlimited:${len}:session`;
}

function loadGame(mode, len) {
  try {
    const raw = localStorage.getItem(gameKey(mode, len));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}
function saveGame(mode, len, state) {
  try { localStorage.setItem(gameKey(mode, len), JSON.stringify(state)); } catch (e) {}
}

function loadStats(mode, len) {
  try {
    const raw = localStorage.getItem(`foodle:stats:${mode}:${len}`);
    return raw ? JSON.parse(raw) : { played: 0, won: 0, streak: 0, maxStreak: 0, dist: [0,0,0,0,0,0,0,0], lastWonKey: null };
  } catch (e) {
    return { played: 0, won: 0, streak: 0, maxStreak: 0, dist: [0,0,0,0,0,0,0,0], lastWonKey: null };
  }
}
function saveStats(mode, len, stats) {
  try { localStorage.setItem(`foodle:stats:${mode}:${len}`, JSON.stringify(stats)); } catch (e) {}
}

// ---------- Tile ----------
function Tile({ ch, status, idx, animate, shape, shake, animSpeed }) {
  const radius = shape === "round" ? "50%" : shape === "rounded" ? "12px" : "2px";
  const flipDelay = animate ? `${idx * 0.18 * animSpeed}s` : "0s";
  const flipDur = `${0.55 * animSpeed}s`;
  const popDur = `${0.1 * animSpeed}s`;
  return (
    <div
      className={`tile tile-${status} ${animate ? "tile-flip" : ""} ${shake ? "tile-shake" : ""} ${ch ? "tile-pop" : ""}`}
      style={{
        borderRadius: radius,
        animationDelay: flipDelay,
        animationDuration: animate ? flipDur : popDur,
      }}
    >
      {ch}
    </div>
  );
}

// ---------- Board ----------
function Board({ guesses, evals, current, length, maxRows, shape, shakeRow, animSpeed }) {
  const rows = [];
  for (let r = 0; r < maxRows; r++) {
    const isCurrent = r === guesses.length;
    const word = isCurrent ? current.padEnd(length, " ") : (guesses[r] || "").padEnd(length, " ");
    const ev = evals[r];
    rows.push(
      <div key={r} className="board-row" style={{ gridTemplateColumns: `repeat(${length}, 1fr)` }}>
        {word.split("").map((ch, i) => (
          <Tile
            key={i}
            ch={ch.trim()}
            status={ev ? ev[i] : ch.trim() ? STATUS.TBD : STATUS.EMPTY}
            idx={i}
            animate={!!ev}
            shape={shape}
            shake={shakeRow === r}
            animSpeed={animSpeed}
          />
        ))}
      </div>
    );
  }
  return <div className="board">{rows}</div>;
}

// ---------- Keyboard ----------
function Keyboard({ keyState, onKey, onEnter, onBack, shape }) {
  const radius = shape === "round" ? "50%" : shape === "rounded" ? "10px" : "4px";
  return (
    <div className="kb">
      {KEYBOARD_ROWS.map((row, ri) => (
        <div key={ri} className="kb-row">
          {ri === 2 && (
            <button className="kb-key kb-wide" onClick={onEnter} style={{ borderRadius: radius }}>Enter</button>
          )}
          {row.split("").map(k => (
            <button
              key={k}
              className={`kb-key kb-${keyState[k] || "default"}`}
              onClick={() => onKey(k)}
              style={{ borderRadius: radius }}
            >
              {k}
            </button>
          ))}
          {ri === 2 && (
            <button className="kb-key kb-wide" onClick={onBack} style={{ borderRadius: radius }} aria-label="Backspace">⌫</button>
          )}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { FoodleBoard: Board, FoodleKeyboard: Keyboard, foodleEval: evaluate, foodleMaxGuesses: maxGuesses, foodlePickWord: pickWord, foodleLoadGame: loadGame, foodleSaveGame: saveGame, foodleLoadStats: loadStats, foodleSaveStats: saveStats, foodleGameKey: gameKey, FOODLE_STATUS: STATUS });
