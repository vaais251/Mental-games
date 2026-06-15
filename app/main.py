"""FastAPI application: serves the static game frontend and a small scores API."""
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import db

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="Mental Games", description="AI Fiesta-style brain games")


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


class ScoreIn(BaseModel):
    game: str
    value: float
    player: str = Field(default="You", max_length=24)


@app.get("/api/games")
def list_games() -> dict:
    return db.GAMES


@app.get("/api/scores")
def all_best() -> dict:
    return db.get_all_best()


@app.get("/api/scores/{game}")
def game_scores(game: str, limit: int = 10) -> dict:
    if game not in db.GAMES:
        raise HTTPException(status_code=404, detail="Unknown game")
    return {
        "game": game,
        "meta": db.GAMES[game],
        "best": db.get_best(game),
        "leaderboard": db.get_leaderboard(game, limit),
    }


@app.post("/api/scores")
def submit_score(payload: ScoreIn) -> dict:
    if payload.game not in db.GAMES:
        raise HTTPException(status_code=404, detail="Unknown game")
    db.add_score(payload.game, payload.player, payload.value)
    return {"ok": True, "best": db.get_best(payload.game)}


# Mount the static frontend LAST so the /api/* routes above take precedence.
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
