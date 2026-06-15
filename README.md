# 🧩 Mental Games

A small **brain-training web app** inspired by the *Games* section of AI Fiesta —
short games designed to sharpen **focus, memory, and reasoning**, with a hub,
score tracking, and per-game leaderboards.

Four games, all in one FastAPI app:

| Game | Goal | Scored by |
|------|------|-----------|
| 🃏 **Memory Match** | Flip a 4×4 grid and find all 8 pairs | Fastest time |
| 🧠 **Sequence Memory** | Repeat a growing 3×3 light pattern | Highest level |
| 🔢 **Schulte Table** | Tap numbers 1–25 in order | Fastest time |
| ⚡ **Reaction Time** | Tap the instant the screen turns green | Lowest milliseconds |

## Tech stack

- **Backend:** Python + [FastAPI](https://fastapi.tiangolo.com/) (served by Uvicorn)
- **Storage:** SQLite (`app/scores.db`, created automatically)
- **Frontend:** vanilla HTML / CSS / JS (ES modules) — no build step
- **Env / deps:** [`uv`](https://docs.astral.sh/uv/)

## Getting started

Requires [`uv`](https://docs.astral.sh/uv/) and Python 3.11+.

```bash
# 1. Install dependencies into a managed virtual environment
uv sync

# 2. Run the dev server (auto-reloads on file changes)
uv run uvicorn app.main:app --reload --port 8000
```

Then open **http://127.0.0.1:8000** in your browser.

## Project layout

```
Mental Games/
├── pyproject.toml          # uv project + dependencies
├── app/
│   ├── main.py             # FastAPI app + scores API
│   ├── db.py               # SQLite storage + game catalog
│   ├── scores.db           # created on first run (git-ignored)
│   └── static/
│       ├── index.html      # the hub
│       ├── css/styles.css  # shared design system
│       ├── js/
│       │   ├── api.js              # shared API + helpers
│       │   ├── hub.js
│       │   ├── memory-match.js
│       │   ├── sequence-memory.js
│       │   ├── schulte-table.js
│       │   └── reaction-time.js
│       └── games/*.html    # one page per game
```

## Scores API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/games` | Game catalog (titles, icons, scoring direction) |
| `GET`  | `/api/scores` | Best score for every game (hub) |
| `GET`  | `/api/scores/{game}` | Best + top-10 leaderboard for one game |
| `POST` | `/api/scores` | Submit `{ "game", "value", "player" }` |

Each game declares a scoring **direction** in `app/db.py` — `"low"` (time / ms,
smaller is better) or `"high"` (level reached, bigger is better) — and the
leaderboard sorts accordingly.

## Extending

- Add a game: add an entry to `GAMES` in [`app/db.py`](app/db.py), drop a
  `static/games/<id>.html` + `static/js/<id>.js`, and add a card in
  [`hub.js`](app/static/js/hub.js).
- Player names are stored per submission (defaults to `"You"`); wire up the
  `mg_player` localStorage key in `api.js` to a name input to support multiple
  players on a shared leaderboard.
