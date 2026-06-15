import { mountTopbar, fetchGame, submitScore, formatValue, formatRelative } from "./api.js";

const GAME = "schulte-table";
const SIZE = 5;
const COUNT = SIZE * SIZE; // 25

let state;

const el = {
  grid: document.getElementById("grid"),
  next: document.getElementById("next"),
  time: document.getElementById("time"),
  miss: document.getElementById("miss"),
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
  const numbers = shuffle(Array.from({ length: COUNT }, (_, i) => i + 1));
  state = { numbers, next: 1, mistakes: 0, startedAt: null, timer: null, done: false };
  el.overlay.classList.remove("show");
  el.next.textContent = "1";
  el.miss.textContent = "0";
  el.time.textContent = "0.00s";
  el.status.textContent = "Tap “1” to start the clock.";
  render();
}

function render() {
  el.grid.innerHTML = state.numbers
    .map((n) => `<div class="st-cell" data-n="${n}">${n}</div>`)
    .join("");
  el.grid.querySelectorAll(".st-cell").forEach((node) =>
    node.addEventListener("click", () => onClick(node))
  );
}

function startTimer() {
  state.startedAt = performance.now();
  state.timer = setInterval(() => {
    el.time.textContent = ((performance.now() - state.startedAt) / 1000).toFixed(2) + "s";
  }, 50);
}

function onClick(node) {
  if (state.done) return;
  const n = Number(node.dataset.n);
  if (node.classList.contains("done")) return;

  if (n === state.next) {
    if (state.next === 1) {
      startTimer();
      el.status.textContent = "Keep going — find them in order!";
    }
    node.classList.add("done");
    state.next++;
    el.next.textContent = state.next > COUNT ? "✓" : state.next;
    if (state.next > COUNT) finish();
  } else {
    state.mistakes++;
    el.miss.textContent = state.mistakes;
    node.classList.add("wrong");
    setTimeout(() => node.classList.remove("wrong"), 280);
  }
}

async function finish() {
  state.done = true;
  clearInterval(state.timer);
  const time = (performance.now() - state.startedAt) / 1000;
  const value = Number(time.toFixed(2));
  el.time.textContent = value.toFixed(2) + "s";
  el.status.textContent = "Done!";
  el.result.textContent = value.toFixed(2) + "s";
  el.sub.textContent = `${state.mistakes} mistake${state.mistakes === 1 ? "" : "s"}`;

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
