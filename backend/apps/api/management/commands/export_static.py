"""
Bake every read-only API response to static JSON, keyed by region slug.

This does not change or replace the live DRF endpoints — it reuses the same
view logic (build_fingerprint, build_compare_profile, the ENSO-impact and
rankings math) to produce a static snapshot for the GitHub Pages deployment.
The Django backend keeps serving the live API unchanged; this command is an
additional, independent entry point into the same aggregation code.

Output layout (mirrors the live endpoint shapes exactly so the frontend's
static-mode fetcher needs no response reshaping):

    <out>/regions.json
    <out>/region/<slug>.json
    <out>/fingerprint/<slug>/<variable>.json
    <out>/extremes/<slug>.json
    <out>/season/<slug>.json
    <out>/enso-impact/<slug>.json
    <out>/compare-profile/<slug>.json
    <out>/doy-climatology/<slug>.json
    <out>/rankings.json
    <out>/monthly-records.json
    <out>/leaders-over-time.json
"""
import json
from datetime import date
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.climate.models import ClimateAnnual, ENSOEvent
from apps.regions.models import IndonesiaRegion

from ...fingerprint import VARIABLE_FIELDS, build_fingerprint
from ...serializers import ENSOEventSerializer, RegionDetailSerializer, RegionSerializer
from ...views import (
    ENSOImpactView,
    ExtremesView,
    OverTimeView,
    RankingsView,
    RecordsView,
    SeasonView,
    build_compare_profile,
    build_doy_climatology,
)


class _Req:
    """Minimal stand-in for a DRF Request — enough for the view methods below,
    none of which read query params beyond what we pass explicitly."""
    query_params = {}


class Command(BaseCommand):
    help = "Export every climate API response to static JSON files for the GitHub Pages build."

    def add_arguments(self, parser):
        parser.add_argument(
            "--out",
            default="data/static_export",
            help="Output directory (relative to backend/ unless absolute).",
        )

    def handle(self, *args, **options):
        out = Path(options["out"])
        regions = list(IndonesiaRegion.objects.all())
        loaded = [r for r in regions if ClimateAnnual.objects.filter(region=r).exists()]

        self._write(out / "regions.json", RegionSerializer(regions, many=True).data)

        endpoint = ExtremesView()
        season = SeasonView()
        enso_impact = ENSOImpactView()
        rankings_view = RankingsView()
        req = _Req()

        for region in loaded:
            self._write(
                out / "region" / f"{region.slug}.json",
                RegionDetailSerializer(region).data,
            )

            for variable in VARIABLE_FIELDS:
                payload = build_fingerprint(region, variable, 1950, date.today().year)
                payload["enso_events"] = self._enso_overlay(1950, date.today().year)
                self._write(out / "fingerprint" / region.slug / f"{variable}.json", payload)

            self._write(
                out / "extremes" / f"{region.slug}.json",
                self._response_data(endpoint.get(req, region.id)),
            )
            self._write(
                out / "season" / f"{region.slug}.json",
                self._response_data(season.get(req, region.id)),
            )
            self._write(
                out / "enso-impact" / f"{region.slug}.json",
                self._response_data(enso_impact.get(req, region.id)),
            )
            self._write(
                out / "compare-profile" / f"{region.slug}.json",
                build_compare_profile(region),
            )
            self._write(
                out / "doy-climatology" / f"{region.slug}.json",
                build_doy_climatology(region),
            )
            self.stdout.write(f"  exported {region.slug}")

        self._write(
            out / "rankings.json",
            self._response_data(rankings_view.get(req)),
        )
        self._write(
            out / "monthly-records.json",
            self._response_data(RecordsView().get(req)),
        )
        self._write(
            out / "leaders-over-time.json",
            self._response_data(OverTimeView().get(req)),
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Exported {len(loaded)}/{len(regions)} regions (skipped: no climate data) to {out}"
            )
        )

    @staticmethod
    def _enso_overlay(year_from, year_to):
        events = ENSOEvent.objects.filter(year__gte=year_from, year__lte=year_to)
        return ENSOEventSerializer(events, many=True).data

    @staticmethod
    def _response_data(response):
        # APIView.get() returns a DRF Response; .data is the plain dict/list
        # we want, already run through the same serializers as the live API.
        return response.data

    @staticmethod
    def _write(path: Path, data) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, default=str))
