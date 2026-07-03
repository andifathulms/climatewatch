"""Open-Meteo ERA5 ingestion for ClimateDaily."""
import time
from datetime import date, timedelta

import requests
from celery import shared_task
from django.conf import settings

from apps.climate.models import ClimateDaily
from apps.regions.models import IndonesiaRegion

DAILY_VARIABLES = (
    "temperature_2m_max,temperature_2m_min,temperature_2m_mean,"
    "precipitation_sum,windspeed_10m_max,et0_fao_evapotranspiration"
)


class RateLimited(Exception):
    """Open-Meteo rejected the request due to its free-tier request budget."""

    def __init__(self, reason: str, retry_after: float | None = None):
        super().__init__(reason)
        self.reason = reason
        self.retry_after = retry_after


def _retry_after_seconds(resp) -> float | None:
    val = resp.headers.get("Retry-After")
    if not val:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def fetch_historical(
    lat: float, lng: float, start: str, end: str,
    max_retries: int = 3, max_backoff: float = 900.0,
) -> dict:
    """
    Fetch ERA5 daily data from Open-Meteo. Returns the parsed JSON dict with a
    'daily' key of same-length lists. Missing values are None (not 0) — callers
    must preserve the null/zero distinction, especially for precipitation.

    Handles Open-Meteo's rate limiting: transient 429s are retried with backoff
    (honoring Retry-After up to `max_backoff`); a persistent limit — e.g. the
    hourly budget with no short retry window — raises `RateLimited` so callers
    can stop cleanly instead of hammering the API.
    """
    params = {
        "latitude": lat,
        "longitude": lng,
        "start_date": start,
        "end_date": end,
        "daily": DAILY_VARIABLES,
        "timezone": "Asia/Jakarta",
    }
    for attempt in range(max_retries + 1):
        resp = requests.get(settings.OPENMETEO_ARCHIVE, params=params, timeout=90)

        if resp.status_code == 429:
            wait = _retry_after_seconds(resp)
            reason = "Open-Meteo rate limit (HTTP 429)"
            if attempt < max_retries and wait is not None and wait <= max_backoff:
                time.sleep(wait)
                continue
            # No usable retry window (e.g. hourly limit) — give up cleanly.
            raise RateLimited(reason, wait)

        # Open-Meteo can also signal errors with a 200/4xx JSON body.
        try:
            data = resp.json()
        except ValueError:
            resp.raise_for_status()
            raise
        if isinstance(data, dict) and data.get("error"):
            reason = str(data.get("reason", "Open-Meteo error"))
            if "limit" in reason.lower():
                raise RateLimited(reason)
            raise RuntimeError(reason)

        resp.raise_for_status()
        return data

    raise RateLimited("Open-Meteo rate limit — retries exhausted")


def _rows_from_daily(region, daily: dict, source=ClimateDaily.Source.ERA5):
    """Build ClimateDaily instances from an Open-Meteo 'daily' block."""
    times = daily.get("time", [])
    tmax = daily.get("temperature_2m_max", [])
    tmin = daily.get("temperature_2m_min", [])
    tmean = daily.get("temperature_2m_mean", [])
    precip = daily.get("precipitation_sum", [])
    wind = daily.get("windspeed_10m_max", [])
    et0 = daily.get("et0_fao_evapotranspiration", [])

    def get(seq, i):
        return seq[i] if i < len(seq) else None

    rows = []
    for i, day in enumerate(times):
        rows.append(
            ClimateDaily(
                region=region,
                date=day,
                temp_max=get(tmax, i),
                temp_min=get(tmin, i),
                temp_mean=get(tmean, i),
                precipitation_mm=get(precip, i),
                windspeed_max_kmh=get(wind, i),
                evapotranspiration_mm=get(et0, i),
                source=source,
            )
        )
    return rows


def upsert_climate_daily(region, daily: dict) -> int:
    """Upsert a daily block into ClimateDaily using bulk_create with conflict update."""
    rows = _rows_from_daily(region, daily)
    if not rows:
        return 0
    ClimateDaily.objects.bulk_create(
        rows,
        update_conflicts=True,
        unique_fields=["region", "date"],
        update_fields=[
            "temp_max",
            "temp_min",
            "temp_mean",
            "precipitation_mm",
            "windspeed_max_kmh",
            "evapotranspiration_mm",
            "source",
        ],
        batch_size=2000,
    )
    return len(rows)


def fetch_in_yearly_chunks(region, start_year=1950, end_year=None,
                           chunk_years=25, delay=0.5) -> int:
    """
    Fetch and upsert ERA5 data in multi-year chunks. Returns row count.

    A single 75-year request is unreliable (times out), while one request per
    year is needlessly chatty. Chunking by ~25 years balances both: full
    1950–present is just three requests per region. Set chunk_years=1 to fall
    back to strict per-year fetching.
    """
    end_year = end_year or date.today().year
    today = date.today()
    total = 0
    year = start_year
    while year <= end_year:
        chunk_end_year = min(year + chunk_years - 1, end_year)
        start = f"{year}-01-01"
        end = f"{chunk_end_year}-12-31"
        if chunk_end_year >= today.year:
            end = today.isoformat()
        data = fetch_historical(region.latitude, region.longitude, start, end)
        total += upsert_climate_daily(region, data.get("daily", {}))
        time.sleep(delay)  # polite delay between requests
        year = chunk_end_year + 1
    return total


@shared_task
def bootstrap_region_task(region_id: int, start_year: int = 1950) -> int:
    """Celery entrypoint to bootstrap a single region on-demand."""
    region = IndonesiaRegion.objects.get(pk=region_id)
    rows = fetch_in_yearly_chunks(region, start_year=start_year)

    # Aggregate after ingest (imported here to avoid circular import)
    from apps.climate.tasks.aggregate import rebuild_region_all

    rebuild_region_all(region_id)
    return rows


@shared_task
def update_climate_yesterday_all() -> int:
    """Daily Celery Beat task: fetch yesterday for every loaded region."""
    yesterday = date.today() - timedelta(days=1)
    start = end = yesterday.isoformat()
    region_ids = (
        ClimateDaily.objects.values_list("region_id", flat=True).distinct()
    )
    total = 0
    from apps.climate.tasks.aggregate import (
        rebuild_climate_annual,
        rebuild_climate_monthly,
    )

    for rid in region_ids:
        region = IndonesiaRegion.objects.get(pk=rid)
        data = fetch_historical(region.latitude, region.longitude, start, end)
        total += upsert_climate_daily(region, data.get("daily", {}))
        rebuild_climate_monthly(rid, yesterday.year, yesterday.month)
        rebuild_climate_annual(rid, yesterday.year)
        time.sleep(0.5)
    return total
