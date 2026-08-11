"""
One real month of daily readings, plus every number derived from it.

Why this exists
---------------
Every figure on this site is an aggregate of ~28,000 daily ERA5 values per
city, and the app never showed a single one of them. The rawest thing on any
screen was a monthly mean, so the visible chain of evidence began one full step
after the evidence: a reader was asked to accept "2.1°C hotter" without ever
seeing what a day, a month, or the act of aggregating looks like.

This payload is small on purpose — one month, ~31 rows — because its job is
pedagogical, not analytical. It is the worked example a newcomer can follow end
to end before touching a control: here are the days, here is the rule, here is
the count, and here is the single fingerprint cell they add up to.

Month selection
---------------
Deterministic, so the example never changes between exports for the same data:
the most recent *complete* calendar month that has a reading for every one of
its days. Recent because it should feel current; complete because a month with
gaps would need caveats that get in the way of the lesson.
"""
import calendar
from datetime import date

from apps.climate.models import ClimateDaily, ClimateMonthly


def _pick_month(region) -> tuple[int, int] | None:
    """Most recent fully-covered calendar month. See module docstring."""
    latest = (
        ClimateDaily.objects.filter(region=region, temp_max__isnull=False)
        .order_by("-date")
        .values_list("date", flat=True)
        .first()
    )
    if latest is None:
        return None

    year, month = latest.year, latest.month
    # Walk backwards from the newest data until a month is fully covered. Two
    # years of attempts is far more than any real gap in ERA5.
    for _ in range(24):
        month -= 1
        if month == 0:
            year, month = year - 1, 12
        days_in_month = calendar.monthrange(year, month)[1]
        covered = ClimateDaily.objects.filter(
            region=region,
            date__year=year,
            date__month=month,
            temp_max__isnull=False,
            precipitation_mm__isnull=False,
        ).count()
        if covered == days_in_month:
            return year, month
    return None


def build_worked_example(region) -> dict | None:
    """Daily rows for one month, with the aggregates they produce."""
    picked = _pick_month(region)
    if picked is None:
        return None
    year, month = picked

    rows = list(
        ClimateDaily.objects.filter(
            region=region, date__year=year, date__month=month
        )
        .order_by("date")
        .values("date", "temp_max", "precipitation_mm")
    )

    days = [
        {
            "day": r["date"].day,
            "temp_max": round(r["temp_max"], 1) if r["temp_max"] is not None else None,
            "precipitation_mm": (
                round(r["precipitation_mm"], 1)
                if r["precipitation_mm"] is not None
                else None
            ),
        }
        for r in rows
    ]

    # The stored monthly row — the one the fingerprint actually renders. Read
    # rather than recomputed on purpose: if the worked example recomputed its
    # own totals it could agree with itself while disagreeing with the grid,
    # which is the one failure mode that would make it worse than nothing.
    stored = (
        ClimateMonthly.objects.filter(region=region, year=year, month=month)
        .values(
            "total_precipitation",
            "avg_temp_max",
            "hot_days_local",
            "dry_days",
            "heavy_rain_days",
        )
        .first()
    )

    return {
        "region": {"id": region.id, "name": region.name, "slug": region.slug},
        "year": year,
        "month": month,
        "days": days,
        "stored": stored,
        # Thresholds restated here so the client can show the rule beside the
        # days it selects, without importing constants from four other places.
        "rules": {
            "hot_day_threshold_c": region.hot_day_threshold_c,
            "dry_day_mm": 1,
            "heavy_rain_mm": 50,
        },
    }
