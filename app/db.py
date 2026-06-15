"""SQLite-backed score storage for the games.

Each game declares a scoring *direction*:
  - "low"  -> a smaller value is better (time, milliseconds, moves)
  - "high" -> a larger value is better (level reached)
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "scores.db"

# Catalog of games. The key is used in URLs, the API and the DB.
GAMES: dict[str, dict] = {
    "memory-match": {
        "title": "Memory Match",
        "tagline": "Flip the cards and find every matching pair.",
        "icon": "🃏",
        "direction": "low",
        "unit": "s",
        "metric": "Best time",
    },
    "sequence-memory": {
        "title": "Sequence Memory",
        "tagline": "Watch the pattern, then repeat it back. It grows every round.",
        "icon": "🧠",
        "direction": "high",
        "unit": "",
        "metric": "Best level",
    },
    "schulte-table": {
        "title": "Schulte Table",
        "tagline": "Tap the numbers 1–25 in order as fast as you can.",
        "icon": "🔢",
        "direction": "low",
        "unit": "s",
        "metric": "Best time",
    },
    "reaction-time": {
        "title": "Reaction Time",
        "tagline": "Tap the instant the screen turns green.",
        "icon": "⚡",
        "direction": "low",
        "unit": "ms",
        "metric": "Best reaction",
    },
    "track-switch": {
        "title": "Track Switch",
        "tagline": "Flip the switch to send each train to its matching platform — before it reaches the fork.",
        "icon": "🚆",
        "direction": "high",
        "unit": "",
        "metric": "Best routed",
    },
}


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scores (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                game       TEXT NOT NULL,
                player     TEXT NOT NULL DEFAULT 'You',
                value      REAL NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_scores_game ON scores(game)")


def add_score(game: str, player: str, value: float) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO scores (game, player, value) VALUES (?, ?, ?)",
            (game, player or "You", value),
        )


def _order(game: str) -> str:
    return "ASC" if GAMES[game]["direction"] == "low" else "DESC"


def get_best(game: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            f"SELECT player, value, created_at FROM scores "
            f"WHERE game = ? ORDER BY value {_order(game)}, id ASC LIMIT 1",
            (game,),
        ).fetchone()
    return dict(row) if row else None


def get_leaderboard(game: str, limit: int = 10) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            f"SELECT player, value, created_at FROM scores "
            f"WHERE game = ? ORDER BY value {_order(game)}, id ASC LIMIT ?",
            (game, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def get_all_best() -> dict[str, dict | None]:
    return {game: get_best(game) for game in GAMES}
