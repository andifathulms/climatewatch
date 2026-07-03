"""
Seed realistic SYNTHETIC daily climate data, then materialize aggregates.

Use this when the Open-Meteo archive API is unreachable (offline dev, blocked
network) or for a quick reproducible demo. It generates a warming trend,
seasonal monsoon rainfall, and ENSO drying so the fingerprint and trend charts
are meaningful. This is NOT real ERA5 data — run `climate_bootstrap` for that.

    python manage.py seed_demo
    python manage.py seed_demo --slugs balikpapan jakarta --start-year 2000
"""
import datetime as dt
import math
import random

from django.core.management.base import BaseCommand

from apps.climate.models import ClimateDaily, ENSOEvent
from apps.climate.tasks.aggregate import rebuild_region_all
from apps.regions.models import IndonesiaRegion

DEFAULT_SLUGS = [
    "balikpapan", "jakarta", "makassar",
    "surabaya", "denpasar", "medan", "manado",
]


class Command(BaseCommand):
    help = "Seed synthetic demo climate data (offline fallback for climate_bootstrap)."

    def add_arguments(self, parser):
        parser.add_argument("--slugs", nargs="+", default=DEFAULT_SLUGS)
        parser.add_argument("--start-year", type=int, default=1990)
        parser.add_argument("--end-year", type=int, default=dt.date.today().year - 1)
        parser.add_argument("--seed", type=int, default=42)

    def handle(self, *args, **options):
        start_year = options["start_year"]
        end_year = options["end_year"]
        rng = random.Random(options["seed"])

        # ENSO phase per (year, month) modulates rainfall.
        enso = {(e.year, e.month): e.phase for e in ENSOEvent.objects.all()}

        self.stdout.write(
            self.style.WARNING(
                "Seeding SYNTHETIC data (not real ERA5). "
                f"{start_year}–{end_year}."
            )
        )

        for slug in options["slugs"]:
            region = IndonesiaRegion.objects.filter(slug=slug).first()
            if not region:
                self.stderr.write(self.style.ERROR(f"  skip {slug} (not seeded)"))
                continue

            lat = abs(region.latitude)
            base_temp = 33.5 - lat * 0.25
            base_rain = 7.0 + max(0.0, 2.0 - lat)

            rows = []
            for year in range(start_year, end_year + 1):
                warming = (year - start_year) * 0.035  # ~1.2°C / 35 yrs
                d = dt.date(year, 1, 1)
                while d.year == year:
                    doy = d.timetuple().tm_yday
                    seasonal = math.cos((doy / 365.0) * 2 * math.pi)  # +1 in Jan
                    phase = enso.get((year, d.month), "NEUTRAL")
                    mult = 0.55 if phase == "EL_NINO" else (1.4 if phase == "LA_NINA" else 1.0)

                    rain_mean = max(0.0, base_rain * (1.0 + 1.3 * seasonal) * mult)
                    precip = max(0.0, rng.gauss(rain_mean, rain_mean * 0.9))
                    if rng.random() < 0.12:
                        precip += rng.uniform(20, 90)

                    tmax = base_temp + warming - 1.5 * seasonal + rng.gauss(0, 1.3)
                    tmin = tmax - rng.uniform(7, 10)
                    rows.append(ClimateDaily(
                        region=region, date=d,
                        temp_max=round(tmax, 1), temp_min=round(tmin, 1),
                        temp_mean=round((tmax + tmin) / 2, 1),
                        precipitation_mm=round(precip, 1),
                        windspeed_max_kmh=round(rng.uniform(8, 25), 1),
                        evapotranspiration_mm=round(rng.uniform(3.5, 5.5), 1),
                    ))
                    d += dt.timedelta(days=1)

            ClimateDaily.objects.filter(region=region).delete()
            ClimateDaily.objects.bulk_create(rows, batch_size=5000)
            rebuild_region_all(region.id, start_year=start_year, end_year=end_year)
            self.stdout.write(
                self.style.SUCCESS(f"  {region.name}: {len(rows)} daily rows + aggregates")
            )

        self.stdout.write(self.style.SUCCESS("Synthetic demo seed complete."))
