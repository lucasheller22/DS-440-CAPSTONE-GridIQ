"""nflverse schedules via HTTPS (avoids nfl_data_py's HTTP habitatring.com source)."""

from __future__ import annotations

import pandas as pd

SCHEDULES_PARQUET_URL = (
    "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.parquet"
)

_schedule_df: pd.DataFrame | None = None


def get_schedules_dataframe() -> pd.DataFrame:
    """Full schedules table (all seasons), cached for the lifetime of the process."""
    global _schedule_df
    if _schedule_df is None:
        _schedule_df = pd.read_parquet(SCHEDULES_PARQUET_URL)
    return _schedule_df
