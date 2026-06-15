// Shared helpers used by the hub and every game.

export const PLAYER_KEY = "mg_player";

export function getPlayer() {
  return localStorage.getItem(PLAYER_KEY) || "You";
}

export async function fetchAllBest() {
  const r = await fetch("/api/scores");
  if (!r.ok) throw new Error("Failed to load scores");
  return r.json();
}

export async function fetchGame(game) {
  const r = await fetch(`/api/scores/${game}`);
  if (!r.ok) throw new Error("Failed to load game scores");
  return r.json();
}

export async function submitScore(game, value, player = getPlayer()) {
  const r = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game, value, player }),
  });
  if (!r.ok) throw new Error("Failed to submit score");
  return r.json();
}

// ----- formatting -----
export function formatValue(value, unit) {
  if (value === null || value === undefined) return "—";
  if (unit === "ms") return `${Math.round(value)} ms`;
  if (unit === "s") return `${value.toFixed(2)} s`;
  return `${value}`;
}

export function formatRelative(iso) {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T") + "Z");
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Inject the standard top bar into a game page.
export function mountTopbar(target) {
  const el = document.querySelector(target);
  if (!el) return;
  el.innerHTML = `
    <a class="brand" href="/">
      <span class="logo">🧩</span>
      <span>Mental Games<small>AI Fiesta-style brain training</small></span>
    </a>
    <a class="back-link" href="/">← All games</a>`;
}
