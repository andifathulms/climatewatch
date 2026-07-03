"""API contract tests — endpoint shapes the frontend depends on."""
import datetime as dt

from rest_framework.test import APITestCase

from apps.climate.models import ClimateMonthly, ENSOEvent
from apps.climate.tasks.aggregate import rebuild_region_all
from apps.climate.models import ClimateDaily
from apps.regions.models import IndonesiaRegion


class RegionApiTests(APITestCase):
    def setUp(self):
        self.jkt = IndonesiaRegion.objects.create(
            name="Jakarta", latitude=-6.2, longitude=106.8,
            province="DKI Jakarta", is_featured=True,
        )

    def test_region_detail_by_slug_and_pk(self):
        by_slug = self.client.get("/api/regions/jakarta/")
        by_pk = self.client.get(f"/api/regions/{self.jkt.id}/")
        self.assertEqual(by_slug.status_code, 200)
        self.assertEqual(by_pk.status_code, 200)
        self.assertEqual(by_slug.data["slug"], "jakarta")
        self.assertIn("data_availability", by_slug.data)

    def test_region_search(self):
        r = self.client.get("/api/regions/search/?q=jak")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["name"], "Jakarta")

    def test_unknown_region_404(self):
        self.assertEqual(self.client.get("/api/regions/atlantis/").status_code, 404)


class FingerprintApiTests(APITestCase):
    def setUp(self):
        self.region = IndonesiaRegion.objects.create(
            name="Balikpapan", slug="balikpapan",
            latitude=-1.24, longitude=116.85,
        )
        # Two months of monthly data across 2 years.
        for year in (2020, 2021):
            for month in (1, 2):
                ClimateMonthly.objects.create(
                    region=self.region, year=year, month=month,
                    total_precipitation=100.0 + month, hot_days=month,
                    coverage=1.0,
                )
        ENSOEvent.objects.create(year=2020, month=1, oni_index=2.4,
                                 phase="EL_NINO", strength="VERY_STRONG")

    def test_fingerprint_returns_full_grid_including_nulls(self):
        r = self.client.get(
            "/api/climate/%d/fingerprint/?variable=precipitation"
            "&year_from=2020&year_to=2021" % self.region.id
        )
        self.assertEqual(r.status_code, 200)
        # 2 years x 12 months = 24 cells, even though only 4 have data.
        self.assertEqual(len(r.data["data"]), 24)
        non_null = [c for c in r.data["data"] if c["value"] is not None]
        self.assertEqual(len(non_null), 4)
        self.assertIn("stats", r.data)
        self.assertEqual(r.data["variable"], "precipitation")
        # ENSO overlay is attached for the frontend.
        self.assertTrue(len(r.data["enso_events"]) >= 1)

    def test_fingerprint_rejects_unknown_variable(self):
        r = self.client.get(
            "/api/climate/%d/fingerprint/?variable=humidity" % self.region.id
        )
        self.assertEqual(r.status_code, 400)


class ExtremesApiTests(APITestCase):
    def test_extremes_returns_trend(self):
        region = IndonesiaRegion.objects.create(
            name="Medan", slug="medan", latitude=3.6, longitude=98.7,
        )
        # One 40°C day per year across 3 years -> extremes + trend computed.
        for year in (2018, 2019, 2020):
            ClimateDaily.objects.create(
                region=region, date=dt.date(year, 6, 1),
                temp_max=40.0, temp_min=25.0, precipitation_mm=0.0,
            )
        rebuild_region_all(region.id, start_year=2018, end_year=2020)
        r = self.client.get(f"/api/climate/{region.id}/extremes/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("hot_days", r.data["trends"])
        self.assertEqual(len(r.data["results"]), 3)
