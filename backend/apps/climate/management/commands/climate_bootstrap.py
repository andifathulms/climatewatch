"""
Bootstrap ERA5 daily climate data for seeded regions, then materialize
ClimateMonthly + ClimateAnnual.

    python manage.py climate_bootstrap                 # all featured regions
    python manage.py climate_bootstrap --slug balikpapan
    python manage.py climate_bootstrap --start-year 1980
    python manage.py climate_bootstrap --skip-existing  # resume: skip loaded cities

Open-Meteo's free tier has an hourly request budget. A full 34-city bootstrap
will exceed it, so the command stops cleanly when the limit is hit — re-run
later with --skip-existing to resume where it left off.
"""
from datetime import date

from django.core.management.base import BaseCommand
from django.db.models import Min

from apps.climate.models import ClimateDaily
from apps.climate.tasks.aggregate import rebuild_region_all
from apps.climate.tasks.ingest import RateLimited, fetch_in_yearly_chunks
from apps.regions.models import IndonesiaRegion


class Command(BaseCommand):
    help = "Fetch ERA5 daily data from Open-Meteo and build aggregates."

    def add_arguments(self, parser):
        parser.add_argument("--slug", type=str, default=None,
                            help="Bootstrap only this region slug.")
        parser.add_argument("--start-year", type=int, default=1950)
        parser.add_argument("--featured-only", action="store_true",
                            help="Limit to is_featured regions (default: all).")
        parser.add_argument("--skip-existing", action="store_true",
                            help="Skip regions already loaded back to --start-year.")
        parser.add_argument("--delay", type=float, default=0.5,
                            help="Seconds to wait between per-region API calls.")

    def handle(self, *args, **options):
        qs = IndonesiaRegion.objects.all()
        if options["slug"]:
            qs = qs.filter(slug=options["slug"])
        elif options["featured_only"]:
            qs = qs.filter(is_featured=True)

        start_year = options["start_year"]
        end_year = date.today().year

        if options["skip_existing"]:
            # A region counts as loaded if its earliest daily row is at/before
            # the requested start year (allow a 1-year grace for coverage gaps).
            loaded = {
                r["region_id"]
                for r in ClimateDaily.objects.values("region_id")
                .annotate(first=Min("date"))
                .filter(first__year__lte=start_year + 1)
            }
            qs = qs.exclude(id__in=loaded)

        regions = list(qs)
        if not regions:
            self.stdout.write(self.style.SUCCESS("Nothing to do — all targets loaded."))
            return

        self.stdout.write(
            f"Bootstrapping {len(regions)} region(s), {start_year}–{end_year}."
        )

        done = 0
        for i, region in enumerate(regions, 1):
            self.stdout.write(f"[{i}/{len(regions)}] {region.name}… ", ending="")
            self.stdout.flush()
            try:
                rows = fetch_in_yearly_chunks(
                    region, start_year=start_year, delay=options["delay"],
                )
                rebuild_region_all(region.id, start_year=start_year, end_year=end_year)
                done += 1
                self.stdout.write(
                    self.style.SUCCESS(f"{rows} daily rows, aggregates built.")
                )
            except RateLimited as exc:
                # Hourly budget hit — stop cleanly; re-run with --skip-existing.
                self.stdout.write("")
                self.stderr.write(self.style.WARNING(
                    f"Rate limited ({exc.reason}). Stopping after {done} region(s). "
                    f"Re-run with --skip-existing after the limit resets."
                ))
                return
            except Exception as exc:  # keep going on a single-region failure
                self.stderr.write(self.style.ERROR(f"FAILED: {exc}"))

        self.stdout.write(self.style.SUCCESS(f"Bootstrap complete — {done} region(s)."))
