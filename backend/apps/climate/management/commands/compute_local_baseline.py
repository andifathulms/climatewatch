"""
Compute each region's local hot-day threshold and backfill what derives from it.

Why this exists
---------------
The fixed "hot day = above 35°C" rule is a temperate-climate convention, and
across maritime Indonesia it is mostly dead: 25 of 90 loaded cities recorded
*zero* days above 35°C in 77 years, so the "hot days" fingerprint rendered as
an empty grid for more than a quarter of the country. That is not an absence
of warming — it is a threshold imported from the wrong climate.

Warming here does not look like new record highs. It looks like the ordinary
day moving. The local rule measures exactly that:

    a hot day is a day hotter than 95% of days in 1951-1980

The threshold is per region and, once written, fixed. It must never be
recomputed against a moving window — a baseline that drifts upward with the
warming it measures would report no change at all.

Derived from the threshold, and refreshed on every run:
  · ClimateMonthly.hot_days_local
  · ClimateAnnual.hot_days_local
  · ClimateAnnual.max_consecutive_hot_days_local

Running it
----------
    python manage.py compute_local_baseline            # all regions
    python manage.py compute_local_baseline --slug jakarta
    python manage.py compute_local_baseline --force    # recompute thresholds

Idempotent, and safe to re-run when a new derived field is added: an existing
threshold is reused rather than recomputed, so only --force can ever move a
baseline. Everything downstream of it is rebuilt from scratch each time.
"""
from django.core.management.base import BaseCommand
from django.db import connection, transaction

from apps.climate.models import ClimateAnnual, ClimateDaily, ClimateMonthly
from apps.regions.models import IndonesiaRegion

BASELINE_FROM = 1951
BASELINE_TO = 1980
PERCENTILE = 0.95

# The reference period must be substantially complete or the percentile is
# measuring whichever years happened to load, not the 1951-1980 climate.
MIN_BASELINE_DAYS = 7000  # ~64% of the 10,957 days in 1951-1980


class Command(BaseCommand):
    help = (
        "Compute per-region 1951-1980 p95 temp_max threshold, then rebuild "
        "every count and streak that derives from it."
    )

    def add_arguments(self, parser):
        parser.add_argument("--slug", help="Only this region.")
        parser.add_argument(
            "--force",
            action="store_true",
            help=(
                "Recompute thresholds that are already set. This MOVES the "
                "baseline — derived counts are rebuilt on every run without it."
            ),
        )

    def handle(self, *args, **options):
        regions = IndonesiaRegion.objects.all()
        if options["slug"]:
            regions = regions.filter(slug=options["slug"])

        computed = reused = insufficient = 0

        for region in regions:
            # Two separable steps: establishing the baseline, and recounting
            # what derives from it. --force governs only the first. Keeping
            # them apart means adding a new derived field (as
            # max_consecutive_hot_days_local was) can be backfilled by a plain
            # re-run, without --force and so without any risk of moving a
            # baseline that is supposed to be permanent.
            if region.hot_day_threshold_c is None or options["force"]:
                threshold = self._percentile_temp_max(region.id)
                if threshold is None:
                    insufficient += 1
                    self.stdout.write(
                        f"  – {region.slug}: insufficient "
                        f"{BASELINE_FROM}-{BASELINE_TO} data, skipped"
                    )
                    continue
                region.hot_day_threshold_c = round(threshold, 2)
                computed += 1
                note = "computed"
            else:
                reused += 1
                note = "existing"

            with transaction.atomic():
                region.save(update_fields=["hot_day_threshold_c"])
                monthly, annual = self._backfill(
                    region.id, region.hot_day_threshold_c
                )

            self.stdout.write(
                f"  ✓ {region.slug}: {region.hot_day_threshold_c}°C ({note}) "
                f"— {monthly} monthly, {annual} annual rows"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Thresholds computed: {computed} · reused: {reused} · "
                f"insufficient baseline: {insufficient}"
            )
        )

    @staticmethod
    def _percentile_temp_max(region_id: int) -> float | None:
        """
        p95 of daily temp_max across the reference period.

        Uses Postgres percentile_cont rather than pulling ~11k rows per region
        into Python — same definition, one round trip.
        """
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT percentile_cont(%s) WITHIN GROUP (ORDER BY temp_max),
                       COUNT(temp_max)
                  FROM climate_climatedaily
                 WHERE region_id = %s
                   AND temp_max IS NOT NULL
                   AND date >= %s AND date <= %s
                """,
                [
                    PERCENTILE,
                    region_id,
                    f"{BASELINE_FROM}-01-01",
                    f"{BASELINE_TO}-12-31",
                ],
            )
            value, count = cur.fetchone()

        if value is None or count < MIN_BASELINE_DAYS:
            return None
        return value

    @staticmethod
    def _backfill(region_id: int, threshold: float) -> tuple[int, int]:
        """
        Recount hot_days_local for every stored month and year of this region.

        Set-based on purpose: the per-month ORM rebuild in aggregate.py would
        issue ~900 queries per region (77 years x 12 months), which is fine
        nightly for one month but not for a full-archive backfill across 90
        regions. This is two statements per region and produces identical
        counts — the same `temp_max > threshold` predicate.
        """
        # Zero first, then apply counts. The joins below only touch periods
        # that contain at least one qualifying day, so without this a re-run
        # after a threshold change would leave stale non-zero counts behind in
        # periods that no longer qualify.
        ClimateMonthly.objects.filter(region_id=region_id).update(hot_days_local=0)
        ClimateAnnual.objects.filter(region_id=region_id).update(hot_days_local=0)

        with connection.cursor() as cur:
            cur.execute(
                """
                UPDATE climate_climatemonthly m
                   SET hot_days_local = COALESCE(d.n, 0)
                  FROM (
                        SELECT EXTRACT(YEAR FROM date)::int  AS y,
                               EXTRACT(MONTH FROM date)::int AS mo,
                               COUNT(*)                      AS n
                          FROM climate_climatedaily
                         WHERE region_id = %(rid)s AND temp_max > %(t)s
                         GROUP BY 1, 2
                       ) d
                 WHERE m.region_id = %(rid)s AND m.year = d.y AND m.month = d.mo
                """,
                {"rid": region_id, "t": threshold},
            )
            monthly = cur.rowcount

            cur.execute(
                """
                UPDATE climate_climateannual a
                   SET hot_days_local = COALESCE(d.n, 0)
                  FROM (
                        SELECT EXTRACT(YEAR FROM date)::int AS y, COUNT(*) AS n
                          FROM climate_climatedaily
                         WHERE region_id = %(rid)s AND temp_max > %(t)s
                         GROUP BY 1
                       ) d
                 WHERE a.region_id = %(rid)s AND a.year = d.y
                """,
                {"rid": region_id, "t": threshold},
            )
            annual = cur.rowcount

        Command._backfill_streaks(region_id, threshold)
        return monthly, annual

    @staticmethod
    def _backfill_streaks(region_id: int, threshold: float) -> None:
        """
        Longest run of consecutive days above the threshold, per year.

        Done in Python rather than SQL: a streak is a gaps-and-islands problem,
        and the window-function version is far harder to read than the loop
        while producing the same answer. One query per region, one pass.

        A null day breaks the run rather than extending it — missing data is
        not evidence that a heatwave continued.
        """
        rows = (
            ClimateDaily.objects.filter(region_id=region_id)
            .order_by("date")
            .values_list("date", "temp_max")
        )

        best_by_year: dict[int, int] = {}
        run = 0
        current_year: int | None = None
        for day, temp in rows.iterator(chunk_size=20_000):
            # Reset at the year boundary. rebuild_climate_annual() computes
            # this per year and would otherwise overwrite the backfill with a
            # different number the first time it runs — a streak carried from
            # December into January would also be credited entirely to the new
            # year, which is not what "longest heatwave of 1998" means.
            if day.year != current_year:
                current_year = day.year
                run = 0
            if temp is not None and temp > threshold:
                run += 1
            else:
                run = 0
            if run > best_by_year.get(day.year, 0):
                best_by_year[day.year] = run

        annual_rows = list(
            ClimateAnnual.objects.filter(region_id=region_id).only(
                "id", "year", "max_consecutive_hot_days_local"
            )
        )
        for row in annual_rows:
            row.max_consecutive_hot_days_local = best_by_year.get(row.year, 0)
        ClimateAnnual.objects.bulk_update(
            annual_rows, ["max_consecutive_hot_days_local"], batch_size=500
        )
