"""Read-only nflverse data for the dashboard (via nfl_data_py / nflverse releases)."""

from __future__ import annotations

import math
from datetime import date, datetime
from typing import Any

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

# One season of play-by-play in memory after first request (narrow columns only).
_season_pbp_frames: dict[int, pd.DataFrame] = {}

_PBP_COLS = [
    "play_id",
    "game_id",
    "week",
    "qtr",
    "down",
    "ydstogo",
    "play_type",
    "desc",
    "posteam",
    "defteam",
    "epa",
    "yards_gained",
]


def _cell_json(v: Any) -> Any:
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    if isinstance(v, (np.floating,)):
        x = float(v)
        return None if math.isnan(x) else x
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if isinstance(v, (np.bool_,)):
        return bool(v)
    return v


def _schedule_row_dict(row: pd.Series) -> dict[str, Any]:
    gd = row.get("gameday")
    if gd is None or pd.isna(gd):
        gameday_str = None
    elif hasattr(gd, "isoformat"):
        gameday_str = gd.isoformat()
    else:
        gameday_str = str(gd)

    def num(x: Any) -> float | None:
        if x is None or (isinstance(x, float) and math.isnan(x)):
            return None
        try:
            return float(x)
        except (TypeError, ValueError):
            return None

    return {
        "gameId": str(row["game_id"]),
        "season": int(row["season"]),
        "gameType": str(row["game_type"]),
        "week": int(row["week"]),
        "gameday": gameday_str,
        "weekday": None if pd.isna(row.get("weekday")) else str(row["weekday"]),
        "gametime": None if pd.isna(row.get("gametime")) else str(row["gametime"]),
        "awayTeam": str(row["away_team"]),
        "homeTeam": str(row["home_team"]),
        "awayScore": num(row.get("away_score")),
        "homeScore": num(row.get("home_score")),
        "stadium": None if pd.isna(row.get("stadium")) else str(row["stadium"]),
    }


def _play_row_dict(row: pd.Series) -> dict[str, Any]:
    pid = row.get("play_id")
    play_id = str(int(pid)) if pd.notna(pid) and not isinstance(pid, str) else (str(pid) if pid is not None else "")

    down = row.get("down")
    ytg = row.get("ydstogo")

    return {
        "id": play_id,
        "gameId": str(row["game_id"]),
        "quarter": None if pd.isna(row.get("qtr")) else int(row["qtr"]),
        "down": None if pd.isna(down) else int(down),
        "yardsToGo": None if pd.isna(ytg) else int(ytg),
        "playType": None if pd.isna(row.get("play_type")) else str(row["play_type"]),
        "description": None if pd.isna(row.get("desc")) else str(row["desc"]),
        "offense": None if pd.isna(row.get("posteam")) else str(row["posteam"]),
        "defense": None if pd.isna(row.get("defteam")) else str(row["defteam"]),
        "epa": _cell_json(row.get("epa")),
        "yardsGained": _cell_json(row.get("yards_gained")),
    }


def _season_from_game_id(game_id: str) -> int:
    parts = game_id.split("_")
    if len(parts) < 1 or not parts[0].isdigit():
        raise HTTPException(status_code=400, detail="Invalid game_id format")
    return int(parts[0])


@router.get("/nflverse/schedule")
def nflverse_schedule(
    season: int = Query(..., ge=1999, le=2035, description="NFL season year"),
    week: int | None = Query(None, ge=1, le=22, description="Restrict to a single week"),
    game_type: str = Query("REG", description="REG, POST, or ALL"),
):
    """Regular-season (or postseason) schedule from nflverse."""
    try:
        import nfl_data_py as nfl
    except ImportError as e:
        raise HTTPException(status_code=503, detail=f"nfl_data_py not available: {e}") from e

    try:
        df = nfl.import_schedules([season])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to load nflverse schedule: {e}") from e

    if game_type.upper() != "ALL":
        gt = game_type.upper()
        df = df[df["game_type"] == gt]
    if week is not None:
        df = df[df["week"] == week]

    df = df.sort_values(["week", "gameday", "gametime", "game_id"], na_position="last")
    games = [_schedule_row_dict(row) for _, row in df.iterrows()]
    return {"season": season, "source": "nflverse", "games": games}


@router.get("/nflverse/games/{game_id}/plays")
def nflverse_game_plays(
    game_id: str,
    limit: int = Query(250, ge=1, le=500),
):
    """Play-by-play for one game (nflverse game_id), e.g. 2023_01_DET_KC."""
    try:
        import nfl_data_py as nfl
    except ImportError as e:
        raise HTTPException(status_code=503, detail=f"nfl_data_py not available: {e}") from e

    season = _season_from_game_id(game_id)

    try:
        if season not in _season_pbp_frames:
            _season_pbp_frames[season] = nfl.import_pbp_data(
                [season],
                columns=_PBP_COLS,
                cache=True,
                downcast=True,
            )
        frame = _season_pbp_frames[season]
        sub = frame[frame["game_id"] == game_id]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to load nflverse play-by-play: {e}") from e

    if sub.empty:
        raise HTTPException(status_code=404, detail="Game not found in play-by-play for that season")

    sub = sub.head(limit)
    plays = [_play_row_dict(row) for _, row in sub.iterrows()]
    return {"gameId": game_id, "source": "nflverse", "plays": plays}
