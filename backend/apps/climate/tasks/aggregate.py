"""
Materialization of ClimateMonthly and ClimateAnnual from ClimateDaily.

Never compute aggregations on a live query — always precompute here and cache.
"""
import calendar
from datetime import date

from django.db.models import Avg, Count, Q, Sum

from apps.climate.models import ClimateAnnual, ClimateDaily, ClimateMonthly


def rebuild_climate_monthly(region_id: int, year: int, month: int):
    """Rebuild one ClimateMonthly row from ClimateDaily."""
    qs = ClimateDaily.objects.filter(
        region_id=region_id, date__year=year, date__month=month
    )
    result = qs.aggregate(
        avg_temp_max=Avg("temp_max"),
        avg_temp_min=Avg("temp_min"),
        avg_temp_mean=Avg("temp_mean"),
        total_precipitation=Sum("precipitation_mm"),
        hot_days=Count("id", filter=Q(temp_max__gt=35)),
        heavy_rain_days=Count("id", filter=Q(precipitation_mm__gt=50)),
        extreme_rain_days=Count("id", filter=Q(precipitation_mm__gt=100)),
        dry_days=Count("id", filter=Q(precipitation_mm__lt=1)),
    )

    days_in_month = calendar.monthrange(year, month)[1]
    days_with_temp = qs.filter(temp_mean__isnull=False).count()
    result["coverage"] = (
        round(days_with_temp / days_in_month, 4) if days_in_month else 0.0
    )

    ClimateMonthly.objects.update_or_create(
        region_id=region_id, year=year, month=month, defaults=result
    )


def compute_max_consecutive_dry_days(region_id: int, year: int) -> int:
    days = (
        ClimateDaily.objects.filter(region_id=region_id, date__year=year)
        .order_by("date")
        .values_list("precipitation_mm", flat=True)
    )
    best = run = 0
    for p in days:
        if p is not None and p < 1:
            run += 1
            best = max(best, run)
        else:
            run = 0
    return best


def compute_max_consecutive_hot_days(region_id: int, year: int) -> int:
    days = (
        ClimateDaily.objects.filter(region_id=region_id, date__year=year)
        .order_by("date")
        .values_list("temp_max", flat=True)
    )
    best = run = 0
    for t in days:
        if t is not None and t > 35:
            run += 1
            best = max(best, run)
        else:
            run = 0
    return best


def compute_wet_season_onset(region_id: int, year: int) -> int | None:
    """
    Day-of-year of wet season onset, or None. Definition: first occurrence
    after August 1st of 5 consecutive days with cumulative rainfall >= 40mm.
    """
    days = (
        ClimateDaily.objects.filter(
            region_id=region_id, date__year=year, date__month__gte=8
        )
        .order_by("date")
        .values("date", "precipitation_mm")
    )
    window = []
    for day in days:
        window.append(day["precipitation_mm"] or 0)
        if len(window) > 5:
            window.pop(0)
        if len(window) == 5 and sum(window) >= 40:
            return day["date"].timetuple().tm_yday
    return None


def compute_wet_season_end(region_id: int, year: int) -> int | None:
    """
    Day-of-year of wet season end, or None. Simplified: last occurrence before
    August 1st of a 5-day window with cumulative rainfall >= 40mm (the tail end
    of the wet season that began the prior calendar year).
    """
    days = list(
        ClimateDaily.objects.filter(
            region_id=region_id, date__year=year, date__month__lt=8
        )
        .order_by("date")
        .values("date", "precipitation_mm")
    )
    last_wet = None
    window = []
    for day in days:
        window.append(day["precipitation_mm"] or 0)
        if len(window) > 5:
            window.pop(0)
        if len(window) == 5 and sum(window) >= 40:
            last_wet = day["date"].timetuple().tm_yday
    return last_wet


def rebuild_climate_annual(region_id: int, year: int):
    """Rebuild one ClimateAnnual row from ClimateDaily."""
    qs = ClimateDaily.objects.filter(region_id=region_id, date__year=year)
    result = qs.aggregate(
        avg_temp_max=Avg("temp_max"),
        avg_temp_min=Avg("temp_min"),
        total_precipitation=Sum("precipitation_mm"),
        rainy_days=Count("id", filter=Q(precipitation_mm__gte=1)),
        hot_days=Count("id", filter=Q(temp_max__gt=35)),
        cool_days=Count("id", filter=Q(temp_min__lt=20)),
        heavy_rain_days=Count("id", filter=Q(precipitation_mm__gt=50)),
        extreme_rain_days=Count("id", filter=Q(precipitation_mm__gt=100)),
    )
    result["max_consecutive_dry_days"] = compute_max_consecutive_dry_days(
        region_id, year
    )
    result["max_consecutive_hot_days"] = compute_max_consecutive_hot_days(
        region_id, year
    )
    result["wet_season_onset_doy"] = compute_wet_season_onset(region_id, year)
    result["wet_season_end_doy"] = compute_wet_season_end(region_id, year)

    ClimateAnnual.objects.update_or_create(
        region_id=region_id, year=year, defaults=result
    )


def rebuild_region_all(region_id: int, start_year: int = 1950, end_year: int | None = None):
    """Rebuild all monthly + annual aggregates for a region across its history."""
    end_year = end_year or date.today().year
    for year in range(start_year, end_year + 1):
        for month in range(1, 13):
            rebuild_climate_monthly(region_id, year, month)
        rebuild_climate_annual(region_id, year)
