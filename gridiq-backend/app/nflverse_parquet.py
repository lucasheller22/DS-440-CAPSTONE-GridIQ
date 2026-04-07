"""Fetch nflverse Parquet over HTTPS via stdlib (avoids fragile remote I/O in pandas/pyarrow)."""

from __future__ import annotations

import io
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import pandas as pd

USER_AGENT = "GridIQ/1.0 (nflverse reader; +https://github.com/nflverse/nflverse-data)"


def download_url_bytes(url: str, *, timeout_sec: float = 300) -> bytes:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(req, timeout=timeout_sec) as resp:
            return resp.read()
    except HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} fetching {url}: {e.reason}") from e
    except URLError as e:
        raise RuntimeError(f"Network error fetching {url}: {e.reason}") from e


def read_parquet_from_url(
    url: str,
    *,
    columns: list[str] | None = None,
    timeout_sec: float = 300,
) -> pd.DataFrame:
    data = download_url_bytes(url, timeout_sec=timeout_sec)
    return pd.read_parquet(io.BytesIO(data), columns=columns, engine="auto")
