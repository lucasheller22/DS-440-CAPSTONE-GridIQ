"""nflverse schedules via HTTPS (avoids nfl_data_py's HTTP habitatring.com source)."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from app.nflverse_parquet import read_parquet_from_url

SCHEDULES_PARQUET_URL = (
    "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.parquet"
)

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
_SCHEDULE_CACHE_PATH = _BACKEND_ROOT / ".cache" / "nflverse" / "games.parquet"

_schedule_df: pd.DataFrame | None = None


def get_schedules_dataframe() -> pd.DataFrame:
    """Full schedules table (all seasons), cached in-process; disk cache as fallback after first success."""
    global _schedule_df
    if _schedule_df is None:
        try:
            _schedule_df = read_parquet_from_url(SCHEDULES_PARQUET_URL, timeout_sec=120)
        except Exception:
            if _SCHEDULE_CACHE_PATH.is_file():
                _schedule_df = pd.read_parquet(_SCHEDULE_CACHE_PATH)
            else:
                raise
        else:
            try:
                _SCHEDULE_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
                _schedule_df.to_parquet(_SCHEDULE_CACHE_PATH, index=False)
            except Exception:
                pass
    return _schedule_df
