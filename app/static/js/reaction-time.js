import { mountTopbar, fetchGame, submitScore, formatValue, formatRelative } from "./api.js";

const GAME = "reaction-time";

// State machine: idle -> wait -> go -> result  (or wait -> toosoon)
let phase = "idle";
let greenAt = 0;
let waitTimer = null;
const attempts = [];

const el = {
  zone: document.getElementById("zone"),
  last: document.getElementById("last"),
  avg: document.getElementById("avg"),
  tries: document.getElementById("tries"),
  best: document.getElementById("best"),
  lb: document.getElementById("lb"),
};

mountTopbar("#topbar");

function setZone(cls, html) {
  el.zone.className = "rt-zone " + cls;
  el.zone.innerHTML = `<div>${html}</div>`;
}

function showIdle() {
  phase = "idle";
  setZone("idle", `
    <div class="big-emoji">⚡</div>
    <div class="head">Reaction Time Test</div>
    <div class="small">Click anywhere here to begin.</div>`);
}

function startWaiting() {
  phase = "wait";
  setZone("wait", `
    <div class="big-emoji">✋</div>
    <div class="head">Wait for green…</div>
    <div class="small">Don't click too early!</div>`);
  const delay = 1200 + Math.random() * 2600; // 1.2s – 3.8s
  waitTimer = setTimeout(goGreen, delay);
}

function goGreen() {
  phase = "go";
  greenAt = performance.now();
  setZone("go", `
    <div class="big-emoji">⚡</div>
    <div class="head">CLICK!</div>
    <div class="ms">now</div>`);
}

function tooSoon() {
  clearTimeout(waitTimer);
  phase = "toosoon";
  setZone("toosoon", `
    <div class="big-emoji">😅</div>
    <div class="head">Too soon!</div>
    <div class="small">Click to try again.</div>`);
}

async function recordResult() {
  const ms = Math.round(performance.now() - greenAt);
  phase = "result";
  attempts.push(ms);

  el.last.textContent = ms + " ms";
  el.tries.textContent = attempts.length;
  el.avg.textContent = Math.round(attempts.reduce((a, b) => a + b, 0) / attempts.length) + " ms";

  let rating = ms < 200 ? "⚡ Lightning fast!" : ms < 280 ? "🔥 Great reflexes" : ms < 380 ? "👍 Solid" : "🐢 Keep practicing";
  setZone("result", `
    <div class="ms">${ms} ms</div>
    <div class="small" style="margin:8px 0 4px">${rating}</div>
    <div class="small">Click to go again.</div>`);

  try {
    await submitScore(GAME, ms);
  } catch (e) {
    console.warn(e);
  }
  loadScores();
}

el.zone.addEventListener("click", () => {
  switch (phase) {
    case "idle":
    case "result":
    case "toosoon":
      startWaiting();
      break;
    case "wait":
      tooSoon();
      break;
    case "go":
      recordResult();
      break;
  }
});

async function loadScores() {
  try {
    const data = await fetchGame(GAME);
    el.best.textContent = data.best ? formatValue(data.best.value, "ms") : "—";
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
        <span class="val">${formatValue(r.value, "ms")}</span>
      </div>`
    )
    .join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

showIdle();
loadScores();
