import { mountTopbar, fetchGame, submitScore, formatRelative } from "./api.js";

const GAME = "track-switch";

// ---- canvas geometry (internal resolution) ----
const W = 760, H = 440;
const CENTER_Y = 220;
const SPAWN_X = -90;
const FORK_X = 380;
const PLATFORM_X = 660;     // where train "arrives"
const TOP_Y = 96;
const BOTTOM_Y = 344;

const COLORS = {
  red:    "#f87171",
  blue:   "#60a5fa",
  green:  "#34d399",
  yellow: "#fbbf24",
  purple: "#c084fc",
  orange: "#fb923c",
};
const COLOR_KEYS = Object.keys(COLORS);

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const el = {
  score: document.getElementById("score"),
  lives: document.getElementById("lives"),
  speed: document.getElementById("speed"),
  best: document.getElementById("best"),
  status: document.getElementById("status"),
  start: document.getElementById("start"),
  lb: document.getElementById("lb"),
  overlay: document.getElementById("overlay"),
  result: document.getElementById("result"),
  sub: document.getElementById("sub"),
  badge: document.getElementById("badge"),
};

mountTopbar("#topbar");

let state = null;       // null = idle
let lastTs = 0;
let flash = null;       // {color, t} brief feedback tint

function newState() {
  return {
    running: true,
    score: 0,
    lives: 3,
    switch: "up",       // "up" -> top track, "down" -> bottom track
    train: null,
    platforms: { top: "red", bottom: "blue" },
    spawnDelay: 0.4,    // seconds until next train
    over: false,
  };
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function spawnTrain() {
  const trainColor = pick(COLOR_KEYS);
  const other = pick(COLOR_KEYS.filter((c) => c !== trainColor));
  // place the matching colour on a random platform, the decoy on the other
  const topMatches = Math.random() < 0.5;
  state.platforms = topMatches
    ? { top: trainColor, bottom: other }
    : { top: other, bottom: trainColor };
  state.train = { x: SPAWN_X, y: CENTER_Y, color: trainColor, routed: null, correct: null };
}

const BASE_SPEED = 210;
function currentSpeed() {
  // px per second, ramps with score, capped
  return Math.min(620, BASE_SPEED + state.score * 12);
}

function speedMultiplier() {
  return (currentSpeed() / BASE_SPEED);
}

function setSwitch(dir) {
  if (!state || !state.running || state.over) return;
  const t = state.train;
  if (t && t.routed !== null) return; // already past the fork — locked
  state.switch = dir;
}
function toggleSwitch() { setSwitch(state && state.switch === "up" ? "down" : "up"); }

// ---------- update ----------
function update(dt) {
  if (!state.train) {
    state.spawnDelay -= dt;
    if (state.spawnDelay <= 0) spawnTrain();
    return;
  }

  const t = state.train;
  t.x += currentSpeed() * dt;

  // crossing the fork: lock the decision
  if (t.routed === null && t.x >= FORK_X) {
    t.routed = state.switch;
    const destColor = state.switch === "up" ? state.platforms.top : state.platforms.bottom;
    t.correct = destColor === t.color;
    if (t.correct) {
      state.score += 1;
      flash = { color: "#34d399", t: 0.35 };
    } else {
      state.lives -= 1;
      flash = { color: "#f87171", t: 0.5 };
    }
    syncStats();
  }

  // after the fork, glide toward the chosen platform
  if (t.routed !== null) {
    const targetY = t.routed === "up" ? TOP_Y : BOTTOM_Y;
    const progress = Math.min(1, (t.x - FORK_X) / (PLATFORM_X - FORK_X));
    t.y = CENTER_Y + (targetY - CENTER_Y) * progress;
  }

  // arrived / left the stage
  if (t.x >= PLATFORM_X + 70) {
    state.train = null;
    state.spawnDelay = Math.max(0.35, 1.2 - state.score * 0.02);
    if (state.lives <= 0) endGame();
  }
}

function syncStats() {
  el.score.textContent = state.score;
  el.lives.textContent = "❤".repeat(Math.max(0, state.lives)) || "—";
  el.speed.textContent = speedMultiplier().toFixed(1) + "×";
}

// ---------- drawing ----------
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawRail(x1, y1, x2, y2, active) {
  ctx.strokeStyle = active ? "#7c5cff" : "#2a3550";
  ctx.lineWidth = active ? 7 : 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawPlatform(x, y, color, label) {
  ctx.fillStyle = COLORS[color];
  roundRect(x, y - 30, 84, 60, 14);
  ctx.fill();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  roundRect(x, y + 12, 84, 18, 9);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.font = "bold 13px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + 42, y + 5);
}

function drawTrain(t) {
  ctx.save();
  ctx.translate(t.x, t.y);
  // shadow
  ctx.globalAlpha = 0.25; ctx.fillStyle = "#000";
  roundRect(-40, 22, 80, 10, 5); ctx.fill();
  ctx.globalAlpha = 1;
  // body
  ctx.fillStyle = COLORS[t.color];
  roundRect(-40, -22, 80, 44, 12); ctx.fill();
  // cab window
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  roundRect(8, -14, 22, 18, 5); ctx.fill();
  // front nose
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  roundRect(30, -22, 10, 44, 6); ctx.fill();
  // chimney
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundRect(-26, -34, 12, 14, 4); ctx.fill();
  // wheels
  ctx.fillStyle = "#0b0f1c";
  for (const wx of [-26, -6, 18]) { ctx.beginPath(); ctx.arc(wx, 24, 7, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // ground band
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.fillRect(0, CENTER_Y - 60, FORK_X, 120);

  // rails: main line, then the two branches
  const upActive = state ? state.switch === "up" : true;
  drawRail(0, CENTER_Y, FORK_X, CENTER_Y, true);
  drawRail(FORK_X, CENTER_Y, PLATFORM_X, TOP_Y, !!state && upActive);
  drawRail(FORK_X, CENTER_Y, PLATFORM_X, BOTTOM_Y, !!state && !upActive);

  // fork hub
  ctx.fillStyle = "#1f2740";
  ctx.beginPath(); ctx.arc(FORK_X, CENTER_Y, 12, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#7c5cff"; ctx.lineWidth = 3; ctx.stroke();

  // platforms
  if (state) {
    drawPlatform(PLATFORM_X, TOP_Y, state.platforms.top, "TOP");
    drawPlatform(PLATFORM_X, BOTTOM_Y, state.platforms.bottom, "BOTTOM");
    if (state.train) drawTrain(state.train);
  } else {
    drawPlatform(PLATFORM_X, TOP_Y, "blue", "TOP");
    drawPlatform(PLATFORM_X, BOTTOM_Y, "orange", "BOTTOM");
  }

  // switch indicator near the fork
  if (state && !state.over) {
    ctx.fillStyle = "#9a97c0";
    ctx.font = "bold 12px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SWITCH: " + (state.switch === "up" ? "▲ TOP" : "▼ BOTTOM"), FORK_X, CENTER_Y + 42);
  }

  // feedback flash tint
  if (flash) {
    ctx.fillStyle = flash.color;
    ctx.globalAlpha = Math.max(0, flash.t) * 0.18;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  if (!state) {
    ctx.fillStyle = "rgba(236,233,255,0.9)";
    ctx.font = "bold 22px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Press Start to begin", W / 2, CENTER_Y - 90);
  }
}

// ---------- loop ----------
function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
  lastTs = ts;
  if (state && state.running && !state.over) update(dt);
  if (flash) { flash.t -= dt; if (flash.t <= 0) flash = null; }
  draw();
  requestAnimationFrame(loop);
}

// ---------- game flow ----------
function startGame() {
  state = newState();
  flash = null;
  el.overlay.classList.remove("show");
  el.start.disabled = true;
  el.status.textContent = "Route each train to its matching colour!";
  syncStats();
}

async function endGame() {
  state.over = true;
  state.running = false;
  el.start.disabled = false;
  el.status.textContent = "Press Start to play again.";
  const score = state.score;
  el.result.textContent = `${score} routed`;
  el.sub.textContent = `Top speed ${speedMultiplier().toFixed(1)}×`;

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

// ---------- input ----------
canvas.addEventListener("click", toggleSwitch);
document.getElementById("btn-up").addEventListener("click", () => setSwitch("up"));
document.getElementById("btn-down").addEventListener("click", () => setSwitch("down"));
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" || e.key === "w") { setSwitch("up"); e.preventDefault(); }
  else if (e.key === "ArrowDown" || e.key === "s") { setSwitch("down"); e.preventDefault(); }
  else if (e.key === " ") { toggleSwitch(); e.preventDefault(); }
});
el.start.addEventListener("click", startGame);
document.getElementById("again").addEventListener("click", startGame);

// expose minimal hooks for automated testing
window.__track = {
  get state() { return state; },
  setSwitch,
};

// ---------- scores ----------
async function loadScores() {
  try {
    const data = await fetchGame(GAME);
    el.best.textContent = data.best ? `${data.best.value}` : "—";
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
        <span class="val">${r.value} routed</span>
      </div>`
    )
    .join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

loadScores();
requestAnimationFrame((ts) => { lastTs = ts; requestAnimationFrame(loop); });
