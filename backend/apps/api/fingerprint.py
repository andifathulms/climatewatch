"""Helpers to shape ClimateMonthly rows into the D3 fingerprint response."""
from statistics import mean

from apps.climate.models import ClimateMonthly

# variable name -> ClimateMonthly field
VARIABLE_FIELDS = {
    "precipitation": "total_precipitation",
    "temp_max": "avg_temp_max",
    "hot_days": "hot_days",
    "dry_days": "dry_days",
}


def _percentile(values, pct):
    """Simple linear-interpolation percentile over a sorted list."""
    if not values:
        return None
    s = sorted(values)
    if len(s) == 1:
        return s[0]
    k = (len(s) - 1) * pct
    lo = int(k)
    hi = min(lo + 1, len(s) - 1)
    frac = k - lo
    return s[lo] + (s[hi] - s[lo]) * frac


def build_fingerprint(region, variable: str, year_from: int, year_to: int) -> dict:
    field = VARIABLE_FIELDS[variable]

    rows = ClimateMonthly.objects.filter(
        region=region, year__gte=year_from, year__lte=year_to
    ).values("year", "month", field)

    lookup = {(r["year"], r["month"]): r[field] for r in rows}

    data = []
    values = []
    for year in range(year_from, year_to + 1):
        for month in range(1, 13):
            val = lookup.get((year, month))
            data.append({"year": year, "month": month, "value": val})
            if val is not None:
                values.append(val)

    stats = {
        "min": min(values) if values else None,
        "max": max(values) if values else None,
        "p10": _percentile(values, 0.10),
        "p90": _percentile(values, 0.90),
        "mean": round(mean(values), 2) if values else None,
    }

    return {
        "region": {"id": region.id, "name": region.name, "slug": region.slug},
        "variable": variable,
        "year_from": year_from,
        "year_to": year_to,
        "data": data,
        "stats": stats,
    }
