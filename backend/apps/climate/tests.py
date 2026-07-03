"""Tests for climate aggregation logic — the numbers that back every chart."""
import datetime as dt

from django.test import TestCase

from apps.climate.models import ClimateAnnual, ClimateDaily, ClimateMonthly
from apps.climate.tasks.aggregate import (
    compute_max_consecutive_dry_days,
    compute_wet_season_onset,
    rebuild_climate_annual,
    rebuild_climate_monthly,
)
from apps.regions.models import IndonesiaRegion


def make_region(**kw):
    defaults = dict(name="Testville", latitude=-1.0, longitude=116.0)
    defaults.update(kw)
    return IndonesiaRegion.objects.create(**defaults)


class MonthlyAggregationTests(TestCase):
    def setUp(self):
        self.region = make_region()

    def _daily(self, date, temp_max=None, precip=None):
        return ClimateDaily.objects.create(
            region=self.region, date=date, temp_max=temp_max,
            temp_min=None, temp_mean=temp_max, precipitation_mm=precip,
        )

    def test_hot_and_dry_day_counts(self):
        # Jan 2020: two hot days (>35), one dry day (<1mm), one wet day.
        self._daily(dt.date(2020, 1, 1), temp_max=36.0, precip=0.0)   # hot + dry
        self._daily(dt.date(2020, 1, 2), temp_max=37.5, precip=60.0)  # hot + heavy rain
        self._daily(dt.date(2020, 1, 3), temp_max=30.0, precip=5.0)
        rebuild_climate_monthly(self.region.id, 2020, 1)

        m = ClimateMonthly.objects.get(region=self.region, year=2020, month=1)
        self.assertEqual(m.hot_days, 2)
        self.assertEqual(m.dry_days, 1)
        self.assertEqual(m.heavy_rain_days, 1)
        self.assertAlmostEqual(m.total_precipitation, 65.0)

    def test_null_precip_is_not_counted_as_dry(self):
        # A null precip day is missing data, NOT a 0mm dry day.
        self._daily(dt.date(2020, 2, 1), temp_max=30.0, precip=None)
        self._daily(dt.date(2020, 2, 2), temp_max=30.0, precip=0.0)
        rebuild_climate_monthly(self.region.id, 2020, 2)

        m = ClimateMonthly.objects.get(region=self.region, year=2020, month=2)
        self.assertEqual(m.dry_days, 1)  # only the real 0mm day


class DrySpellTests(TestCase):
    def setUp(self):
        self.region = make_region()

    def test_max_consecutive_dry_days(self):
        # 3 dry, 1 wet, 5 dry  ->  longest spell = 5
        start = dt.date(2021, 6, 1)
        pattern = [0, 0, 0, 10, 0, 0, 0, 0, 0]
        for i, p in enumerate(pattern):
            ClimateDaily.objects.create(
                region=self.region, date=start + dt.timedelta(days=i),
                precipitation_mm=float(p),
            )
        self.assertEqual(compute_max_consecutive_dry_days(self.region.id, 2021), 5)


class WetSeasonOnsetTests(TestCase):
    def setUp(self):
        self.region = make_region()

    def test_onset_detected_after_august(self):
        # Dry Aug–Sep, then 8mm/day Oct 1..5. The 5-day sum first reaches the
        # 40mm threshold on Oct 5 (5 x 8 = 40) -> onset = Oct 5 doy.
        for i in range(61):  # Aug 1 .. Sep 30 dry
            ClimateDaily.objects.create(
                region=self.region, date=dt.date(2022, 8, 1) + dt.timedelta(days=i),
                precipitation_mm=0.0,
            )
        for i in range(5):   # Oct 1..5, 8mm each; cumulative hits 40 on day 5
            ClimateDaily.objects.create(
                region=self.region, date=dt.date(2022, 10, 1) + dt.timedelta(days=i),
                precipitation_mm=8.0,
            )
        onset = compute_wet_season_onset(self.region.id, 2022)
        self.assertEqual(onset, dt.date(2022, 10, 5).timetuple().tm_yday)

    def test_no_onset_in_dry_year_returns_none(self):
        for i in range(120):
            ClimateDaily.objects.create(
                region=self.region, date=dt.date(2023, 8, 1) + dt.timedelta(days=i),
                precipitation_mm=1.0,  # never reaches 40mm over any 5-day window
            )
        self.assertIsNone(compute_wet_season_onset(self.region.id, 2023))


class AnnualAggregationTests(TestCase):
    def test_annual_rolls_up_counts(self):
        region = make_region()
        for m in range(1, 13):
            ClimateDaily.objects.create(
                region=region, date=dt.date(2020, m, 15),
                temp_max=36.0, temp_min=25.0, precipitation_mm=120.0,
            )
        rebuild_climate_annual(region.id, 2020)
        a = ClimateAnnual.objects.get(region=region, year=2020)
        self.assertEqual(a.hot_days, 12)           # every sample >35
        self.assertEqual(a.extreme_rain_days, 12)  # every sample >100mm
