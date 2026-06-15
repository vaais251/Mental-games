import { mountTopbar, fetchGame, submitScore, formatValue, formatRelative } from "./api.js";

const GAME = "memory-match";
const SYMBOLS = ["🍎", "🚀", "🎲", "🎸", "🌙", "🍩", "⚽", "🦊"]; // 8 pairs
const COLS = 4;

let state;

const el = {
  grid: document.getElementById("grid"),
  time: document.getElementById("time"),
  moves: document.getElementById("moves"),
  pairs: document.getElementById("pairs"),
  best: document.getElementById("best"),
  status: document.getElementById("status"),
  lb: document.getElementById("lb"),
  overlay: document.getElementById("overlay"),
  result: document.getElementById("result"),
  sub: document.getElementById("sub"),
  badge: document.getElementById("badge"),
};

mountTopbar("#topbar");

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function newGame() {
  const deck = shuffle([...SYMBOLS, ...SYMBOLS].map((s, i) => ({ id: i, symbol: s })));
  state = {
    deck,
    first: null,
    lock: false,
    moves: 0,
    matched: 0,
    startedAt: null,
    timer: null,
    done: false,
  };
  el.overlay.classList.remove("show");
  el.status.textContent = "Click any card to begin.";
  el.moves.textContent = "0";
  el.pairs.textContent = "0 / 8";
  el.time.textContent = "0.00s";
  render();
}

function render() {
  el.grid.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  el.grid.innerHTML = state.deck
    .map(
      (c) => `
      <div class="mm-card" data-id="${c.id}">
        <div class="mm-inner">
          <div class="mm-face mm-cover">?</div>
          <div class="mm-face mm-symbol">${c.symbol}</div>
        </div>
      </div>`
    )
    .join("");
  el.grid.querySelectorAll(".mm-card").forEach((node) =>
    node.addEventListener("click", () => onFlip(node))
  );
}

function startTimer() {
  state.startedAt = performance.now();
  state.timer = setInterval(() => {
    const s = (performance.now() - state.startedAt) / 1000;
    el.time.textContent = s.toFixed(2) + "s";
  }, 50);
}

function elapsed() {
  return (performance.now() - state.startedAt) / 1000;
}

function onFlip(node) {
  if (state.lock || state.done) return;
  const id = Number(node.dataset.id);
  const card = state.deck.find((c) => c.id === id);
  if (node.classList.contains("flipped") || node.classList.contains("matched")) return;

  if (!state.startedAt) {
    startTimer();
    el.status.textContent = "Find all the pairs!";
  }

  node.classList.add("flipped");

  if (state.first === null) {
    state.first = { id, node, symbol: card.symbol };
    return;
  }

  // second card
  state.lock = true;
  state.moves++;
  el.moves.textContent = state.moves;

  if (state.first.symbol === card.symbol) {
    // match
    state.first.node.classList.add("matched");
    node.classList.add("matched");
    state.matched++;
    el.pairs.textContent = `${state.matched} / ${SYMBOLS.length}`;
    state.first = null;
    state.lock = false;
    if (state.matched === SYMBOLS.length) finish();
  } else {
    setTimeout(() => {
      state.first.node.classList.remove("flipped");
      node.classList.remove("flipped");
      state.first = null;
      state.lock = false;
    }, 750);
  }
}

async function finish() {
  state.done = true;
  clearInterval(state.timer);
  const time = elapsed();
  el.time.textContent = time.toFixed(2) + "s";
  el.status.textContent = "Solved!";

  const value = Number(time.toFixed(2));
  el.result.textContent = value.toFixed(2) + "s";
  el.sub.textContent = `${state.moves} moves`;

  let isBest = false;
  try {
    const before = await fetchGame(GAME);
    const prevBest = before.best ? before.best.value : null;
    await submitScore(GAME, value);
    isBest = prevBest === null || value < prevBest;
  } catch (e) {
    console.warn(e);
  }
  el.badge.style.display = isBest ? "inline-block" : "none";
  el.overlay.classList.add("show");
  loadScores();
}

async function loadScores() {
  try {
    const data = await fetchGame(GAME);
    el.best.textContent = data.best ? formatValue(data.best.value, "s") : "—";
    renderLeaderboard(data.leaderboard);
  } catch (e) {
    console.warn(e);
  }
}

function renderLeaderboard(rows) {
  if (!rows || !rows.length) {
    el.lb.innerHTML = `<div class="lb-empty">No scores yet — be the first!</div>`;
    return;
  }
  el.lb.innerHTML = rows
    .map(
      (r, i) => `
      <div class="lb-row ${i === 0 ? "top1" : ""}">
        <span class="rank">${i === 0 ? "🥇" : i + 1}</span>
        <span>${escapeHtml(r.player)} <span style="color:var(--muted);font-size:12px">· ${formatRelative(r.created_at)}</span></span>
        <span class="val">${formatValue(r.value, "s")}</span>
      </div>`
    )
    .join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

document.getElementById("restart").addEventListener("click", newGame);
document.getElementById("again").addEventListener("click", newGame);

newGame();
loadScores();
