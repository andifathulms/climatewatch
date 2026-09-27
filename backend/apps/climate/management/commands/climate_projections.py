"""
Load CMIP6 HighResMIP projections (Open-Meteo Climate API) as annual values
per model, 1995–2049.

    python manage.py climate_projections                 # every loaded region
    python manage.py climate_projections --slug jakarta
    python manage.py climate_projections --skip-existing # resume

Five 20–50 km models whose future runs follow a high-emissions pathway
(HighResMIP highresSST-future / SSP5-8.5-like forcing). One request per
region (~80 s). Years with fewer than 300 daily values are dropped rather
than averaged from a part-year.
"""
import time

import requests
from django.conf import settings
from django.core.management.base import BaseCommand

from apps.climate.models import ClimateAnnual, ClimateProjection
from apps.regions.models import IndonesiaRegion

MODELS = [
    "CMCC_CM2_VHR4",
    "EC_Earth3P_HR",
    "MPI_ESM1_2_XR",
    "MRI_AGCM3_2_S",
    "NICAM16_8S",
]
START, END = "1995-01-01", "2049-12-31"
MIN_DAYS = 300


def fetch(lat: float, lng: float, retries: int = 4) -> dict:
    params = {
        "latitude": lat,
        "longitude": lng,
        "start_date": START,
        "end_date": END,
        "models": ",".join(MODELS),
        "daily": "temperature_2m_max,precipitation_sum",
    }
    for attempt in range(retries):
        try:
            resp = requests.get(settings.OPENMETEO_CLIMATE, params=params, timeout=240)
        except requests.RequestException:
            time.sleep(30 * (attempt + 1))
            continue
        if resp.status_code == 429:
            time.sleep(90 * (attempt + 1))
            continue
        resp.raise_for_status()
        return resp.json()
    raise RuntimeError("Open-Meteo Climate API: retries exhausted")


def annualise(daily: dict) -> list[ClimateProjection]:
    times = daily.get("time", [])
    out = []
    for model in MODELS:
        tmax = daily.get(f"temperature_2m_max_{model}", [])
        prec = daily.get(f"precipitation_sum_{model}", [])
        by_year: dict[int, dict] = {}
        for i, day in enumerate(times):
            y = int(day[:4])
            b = by_year.setdefault(y, {"t": [], "p": []})
            if i < len(tmax) and tmax[i] is not None:
                b["t"].append(tmax[i])
            if i < len(prec) and prec[i] is not None:
                b["p"].append(prec[i])
        for y, b in by_year.items():
            out.append(
                ClimateProjection(
                    model=model,
                    year=y,
                    avg_temp_max=(sum(b["t"]) / len(b["t"])) if len(b["t"]) >= MIN_DAYS else None,
                    total_precipitation=sum(b["p"]) if len(b["p"]) >= MIN_DAYS else None,
                )
            )
    return out


class Command(BaseCommand):
    help = "Fetch CMIP6 HighResMIP projections per region (annual, per model)."

    def add_arguments(self, parser):
        parser.add_argument("--slug", type=str, default=None)
        parser.add_argument("--skip-existing", action="store_true")

    def handle(self, *args, **opts):
        loaded = ClimateAnnual.objects.values_list("region_id", flat=True).distinct()
        qs = IndonesiaRegion.objects.filter(id__in=loaded).order_by("name")
        if opts["slug"]:
            qs = qs.filter(slug=opts["slug"])
        if opts["skip_existing"]:
            done = ClimateProjection.objects.values_list("region_id", flat=True).distinct()
            qs = qs.exclude(id__in=done)
        regions = list(qs)
        self.stdout.write(f"Projections for {len(regions)} region(s).")
        for i, region in enumerate(regions, 1):
            self.stdout.write(f"[{i}/{len(regions)}] {region.name}… ", ending="")
            self.stdout.flush()
            try:
                data = fetch(region.latitude, region.longitude)
                rows = annualise(data.get("daily", {}))
                for r in rows:
                    r.region = region
                ClimateProjection.objects.bulk_create(
                    rows,
                    update_conflicts=True,
                    unique_fields=["region", "model", "year"],
                    update_fields=["avg_temp_max", "total_precipitation"],
                )
                self.stdout.write(self.style.SUCCESS(f"{len(rows)} model-years."))
            except Exception as exc:
                self.stderr.write(self.style.ERROR(f"FAILED: {exc}"))
        self.stdout.write(self.style.SUCCESS("Projections complete."))
