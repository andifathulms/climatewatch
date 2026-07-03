"""
Bootstrap ERA5 daily climate data for seeded regions, then materialize
ClimateMonthly + ClimateAnnual.

    python manage.py climate_bootstrap                 # all featured regions
    python manage.py climate_bootstrap --slug balikpapan
    python manage.py climate_bootstrap --start-year 1980
"""
from datetime import date

from django.core.management.base import BaseCommand

from apps.climate.tasks.aggregate import rebuild_region_all
from apps.climate.tasks.ingest import fetch_in_yearly_chunks
from apps.regions.models import IndonesiaRegion


class Command(BaseCommand):
    help = "Fetch ERA5 daily data from Open-Meteo and build aggregates."

    def add_arguments(self, parser):
        parser.add_argument("--slug", type=str, default=None,
                            help="Bootstrap only this region slug.")
        parser.add_argument("--start-year", type=int, default=1950)
        parser.add_argument("--featured-only", action="store_true",
                            help="Limit to is_featured regions (default: all).")

    def handle(self, *args, **options):
        qs = IndonesiaRegion.objects.all()
        if options["slug"]:
            qs = qs.filter(slug=options["slug"])
        elif options["featured_only"]:
            qs = qs.filter(is_featured=True)

        regions = list(qs)
        if not regions:
            self.stderr.write(self.style.ERROR("No matching regions found."))
            return

        start_year = options["start_year"]
        end_year = date.today().year
        self.stdout.write(
            f"Bootstrapping {len(regions)} region(s), {start_year}–{end_year}."
        )

        for i, region in enumerate(regions, 1):
            self.stdout.write(f"[{i}/{len(regions)}] {region.name}… ", ending="")
            self.stdout.flush()
            try:
                rows = fetch_in_yearly_chunks(region, start_year=start_year)
                rebuild_region_all(region.id, start_year=start_year, end_year=end_year)
                self.stdout.write(self.style.SUCCESS(f"{rows} daily rows, aggregates built."))
            except Exception as exc:  # keep going on a single-region failure
                self.stderr.write(self.style.ERROR(f"FAILED: {exc}"))

        self.stdout.write(self.style.SUCCESS("Bootstrap complete."))
