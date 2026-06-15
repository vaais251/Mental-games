import { mountTopbar, fetchGame, submitScore, formatRelative } from "./api.js";

const GAME = "sequence-memory";
const TILES = 9; // 3x3
const LIT_MS = 450;
const GAP_MS = 230;

let state;
const tiles = [];

const el = {
  grid: document.getElementById("grid"),
  level: document.getElementById("level"),
  phase: document.getElementById("phase"),
  best: document.getElementById("best"),
  status: document.getElementById("status"),
  start: document.getElementById("start"),
  lb: document.getElementById("lb"),
  overlay: document.getElementById("overlay"),
  result: document.getElementById("result"),
  badge: document.getElementById("badge"),
};

mountTopbar("#topbar");

function buildGrid() {
  el.grid.innerHTML = "";
  tiles.length = 0;
  for (let i = 0; i < TILES; i++) {
    const t = document.createElement("div");
    t.className = "sm-tile idle";
    t.dataset.i = i;
    t.addEventListener("click", () => onTileClick(i));
    el.grid.appendChild(t);
    tiles.push(t);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function flash(i, cls = "lit", ms = LIT_MS) {
  return new Promise((resolve) => {
    tiles[i].classList.add(cls);
    setTimeout(() => {
      tiles[i].classList.remove(cls);
      resolve();
    }, ms);
  });
}

function startGame() {
  state = { seq: [], input: 0, completed: 0, accepting: false, playing: true };
  el.overlay.classList.remove("show");
  el.start.disabled = true;
  el.best.textContent = el.best.textContent; // unchanged
  nextRound();
}

async function nextRound() {
  state.seq.push(Math.floor(Math.random() * TILES));
  state.input = 0;
  el.level.textContent = state.seq.length;
  el.phase.textContent = "Watch";
  el.status.textContent = "Watch the sequence…";
  state.accepting = false;
  tiles.forEach((t) => t.classList.add("idle"));

  await sleep(600);
  for (const i of state.seq) {
    await flash(i, "lit");
    await sleep(GAP_MS);
  }

  state.accepting = true;
  tiles.forEach((t) => t.classList.remove("idle"));
  el.phase.textContent = "Your turn";
  el.status.textContent = "Repeat the pattern.";
}

async function onTileClick(i) {
  if (!state || !state.accepting) return;

  if (i === state.seq[state.input]) {
    flash(i, "good", 220);
    state.input++;
    if (state.input === state.seq.length) {
      state.completed = state.seq.length;
      state.accepting = false;
      el.phase.textContent = "Nice!";
      await sleep(550);
      nextRound();
    }
  } else {
    state.accepting = false;
    state.playing = false;
    await flash(i, "bad", 500);
    gameOver();
  }
}

async function gameOver() {
  el.start.disabled = false;
  el.phase.textContent = "Over";
  el.status.textContent = "Press Start to try again.";
  const score = state.completed;
  el.result.textContent = "Level " + score;

  let isBest = false;
  try {
    const before = await fetchGame(GAME);
    const prevBest = before.best ? before.best.value : null;
    await submitScore(GAME, score);
    isBest = score > 0 && (prevBest === null || score > prevBest);
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
    el.best.textContent = data.best ? `Level ${data.best.value}` : "—";
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
        <span class="val">Level ${r.value}</span>
      </div>`
    )
    .join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

el.start.addEventListener("click", startGame);
document.getElementById("again").addEventListener("click", startGame);

buildGrid();
loadScores();
