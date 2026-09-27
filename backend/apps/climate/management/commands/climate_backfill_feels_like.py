"""
Backfill the "feels like" daily high (apparent_temperature_max) for years
already loaded before the column existed, then refresh the monthly/annual
averages for that one field.

    python manage.py climate_backfill_feels_like                # all regions, 1950–2016
    python manage.py climate_backfill_feels_like --slug jakarta
    python manage.py climate_backfill_feels_like --end-year 2016

Only one variable is requested, so this costs a fraction of a full bootstrap's
Open-Meteo budget. Resumable: a region whose `apparent_temp_max` is already
filled for its first and last backfill year is skipped. Stops cleanly on the
hourly rate limit — re-run later to continue.
"""
import time

from django.core.management.base import BaseCommand
from django.db import connection

from apps.climate.models import ClimateDaily
from apps.climate.tasks.ingest import RateLimited, fetch_historical
from apps.regions.models import IndonesiaRegion

VARIABLE = "apparent_temperature_max"


def _refresh_aggregates(region_id: int) -> None:
    """Recompute avg_apparent_temp_max for every month/year in one pass each."""
    with connection.cursor() as cur:
        cur.execute(
            """
            UPDATE climate_climatemonthly m
               SET avg_apparent_temp_max = s.v
              FROM (SELECT extract(year FROM date)::int AS y,
                           extract(month FROM date)::int AS mo,
                           avg(apparent_temp_max) AS v
                      FROM climate_climatedaily
                     WHERE region_id = %s
                     GROUP BY 1, 2) s
             WHERE m.region_id = %s AND m.year = s.y AND m.month = s.mo
            """,
            [region_id, region_id],
        )
        cur.execute(
            """
            UPDATE climate_climateannual a
               SET avg_apparent_temp_max = s.v
              FROM (SELECT extract(year FROM date)::int AS y,
                           avg(apparent_temp_max) AS v
                      FROM climate_climatedaily
                     WHERE region_id = %s
                     GROUP BY 1) s
             WHERE a.region_id = %s AND a.year = s.y
            """,
            [region_id, region_id],
        )


class Command(BaseCommand):
    help = "Backfill apparent_temperature_max for already-loaded years."

    def add_arguments(self, parser):
        parser.add_argument("--slug", type=str, default=None)
        parser.add_argument("--start-year", type=int, default=1950)
        parser.add_argument("--end-year", type=int, default=2016)
        parser.add_argument("--chunk-years", type=int, default=25)
        parser.add_argument("--delay", type=float, default=0.5)

    def handle(self, *args, **opts):
        qs = IndonesiaRegion.objects.filter(daily__isnull=False).distinct()
        if opts["slug"]:
            qs = qs.filter(slug=opts["slug"])
        start, end = opts["start_year"], opts["end_year"]

        todo = []
        for region in qs.order_by("name"):
            done = ClimateDaily.objects.filter(
                region=region, apparent_temp_max__isnull=False
            )
            if (
                done.filter(date__year=start).exists()
                and done.filter(date__year=end).exists()
            ):
                continue
            todo.append(region)

        self.stdout.write(f"Backfilling {len(todo)} region(s), {start}–{end}.")
        for i, region in enumerate(todo, 1):
            self.stdout.write(f"[{i}/{len(todo)}] {region.name}… ", ending="")
            self.stdout.flush()
            try:
                updated = 0
                year = start
                while year <= end:
                    chunk_end = min(year + opts["chunk_years"] - 1, end)
                    data = fetch_historical(
                        region.latitude, region.longitude,
                        f"{year}-01-01", f"{chunk_end}-12-31",
                        variables=VARIABLE,
                    )
                    daily = data.get("daily", {})
                    rows = [
                        ClimateDaily(region=region, date=d, apparent_temp_max=v)
                        for d, v in zip(daily.get("time", []), daily.get(VARIABLE, []))
                    ]
                    # Rows already exist for every date; on conflict only the
                    # new column is written, the rest of the day is untouched.
                    ClimateDaily.objects.bulk_create(
                        rows,
                        update_conflicts=True,
                        unique_fields=["region", "date"],
                        update_fields=["apparent_temp_max"],
                        batch_size=2000,
                    )
                    updated += len(rows)
                    time.sleep(opts["delay"])
                    year = chunk_end + 1
                _refresh_aggregates(region.id)
                self.stdout.write(self.style.SUCCESS(f"{updated} days."))
            except RateLimited as exc:
                self.stdout.write("")
                self.stderr.write(self.style.WARNING(
                    f"Rate limited ({exc.reason}). Re-run to resume."
                ))
                return
            except Exception as exc:
                self.stderr.write(self.style.ERROR(f"FAILED: {exc}"))
        self.stdout.write(self.style.SUCCESS("Backfill complete."))
