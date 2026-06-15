import { fetchAllBest, formatValue } from "./api.js";

const GAMES = [
  { id: "memory-match",    title: "Memory Match",    icon: "🃏", unit: "s",  metric: "Best time",
    tagline: "Flip the cards and find every matching pair." },
  { id: "sequence-memory", title: "Sequence Memory", icon: "🧠", unit: "",   metric: "Best level",
    tagline: "Watch the pattern, then repeat it back. It grows every round." },
  { id: "schulte-table",   title: "Schulte Table",   icon: "🔢", unit: "s",  metric: "Best time",
    tagline: "Tap the numbers 1–25 in order as fast as you can." },
  { id: "reaction-time",   title: "Reaction Time",   icon: "⚡", unit: "ms", metric: "Best reaction",
    tagline: "Tap the instant the screen turns green." },
  { id: "track-switch",    title: "Track Switch",    icon: "🚆", unit: "",   metric: "Best routed",
    tagline: "Flip the switch to send each train to its matching platform — fast." },
];

async function render() {
  const grid = document.getElementById("grid");
  let best = {};
  try {
    best = await fetchAllBest();
  } catch (e) {
    console.warn("Could not load scores:", e);
  }

  grid.innerHTML = GAMES.map((g) => {
    const b = best[g.id];
    const value = b ? formatValue(b.value, g.unit) : "—";
    return `
      <a class="game-card" href="/games/${g.id}.html">
        <span class="play">›</span>
        <div class="icon">${g.icon}</div>
        <h3>${g.title}</h3>
        <p>${g.tagline}</p>
        <div class="stat">
          <span>${g.metric}</span>
          <b>${value}</b>
        </div>
      </a>`;
  }).join("");
}

render();
