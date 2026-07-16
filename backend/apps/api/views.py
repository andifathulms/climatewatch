from datetime import date

import requests
from django.conf import settings
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.climate.models import ClimateAnnual, ClimateDaily, ClimateMonthly, ENSOEvent
from apps.regions.models import IndonesiaRegion

from .fingerprint import VARIABLE_FIELDS, build_fingerprint
from .serializers import (
    ClimateAnnualSerializer,
    ClimateDailySerializer,
    ClimateMonthlySerializer,
    ENSOEventSerializer,
    RegionDetailSerializer,
    RegionSerializer,
)


def _year_range(request, region):
    """Resolve ?year_from / ?year_to, clamped to available annual data."""
    years = list(region.annual.values_list("year", flat=True))
    default_from = min(years) if years else 1950
    default_to = max(years) if years else date.today().year
    year_from = int(request.query_params.get("year_from", default_from))
    year_to = int(request.query_params.get("year_to", default_to))
    return year_from, year_to


class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = IndonesiaRegion.objects.all()
    serializer_class = RegionSerializer
    filterset_fields = ["type", "is_featured", "province"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return RegionDetailSerializer
        return RegionSerializer

    def get_object(self):
        """Resolve the detail lookup by numeric pk or by slug."""
        value = self.kwargs[self.lookup_field]
        lookup = {"pk": value} if str(value).isdigit() else {"slug": value}
        obj = get_object_or_404(IndonesiaRegion, **lookup)
        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=False, methods=["get"])
    def search(self, request):
        q = request.query_params.get("q", "").strip()
        qs = self.queryset
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(province__icontains=q))
        qs = qs[:50]
        return Response(RegionSerializer(qs, many=True).data)


class ENSOViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ENSOEvent.objects.all()
    serializer_class = ENSOEventSerializer
    pagination_class = None
    filterset_fields = ["phase", "strength", "year"]


class ClimateEndpoint(APIView):
    """Base for region-scoped climate endpoints resolved by region_id (pk)."""

    def get_region(self, region_id):
        return get_object_or_404(IndonesiaRegion, pk=region_id)

    def enso_overlay(self, year_from, year_to):
        events = ENSOEvent.objects.filter(year__gte=year_from, year__lte=year_to)
        return ENSOEventSerializer(events, many=True).data


class DailyView(ClimateEndpoint):
    def get(self, request, region_id):
        region = self.get_region(region_id)
        qs = ClimateDaily.objects.filter(region=region)
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if start:
            qs = qs.filter(date__gte=start)
        if end:
            qs = qs.filter(date__lte=end)
        qs = qs.order_by("date")[:5000]
        return Response(ClimateDailySerializer(qs, many=True).data)


class MonthlyView(ClimateEndpoint):
    def get(self, request, region_id):
        region = self.get_region(region_id)
        year_from, year_to = _year_range(request, region)
        qs = ClimateMonthly.objects.filter(
            region=region, year__gte=year_from, year__lte=year_to
        ).order_by("year", "month")
        return Response(
            {
                "region": RegionSerializer(region).data,
                "year_from": year_from,
                "year_to": year_to,
                "results": ClimateMonthlySerializer(qs, many=True).data,
            }
        )


class AnnualView(ClimateEndpoint):
    def get(self, request, region_id):
        region = self.get_region(region_id)
        qs = ClimateAnnual.objects.filter(region=region).order_by("year")
        return Response(
            {
                "region": RegionSerializer(region).data,
                "enso_events": self.enso_overlay(1950, date.today().year),
                "results": ClimateAnnualSerializer(qs, many=True).data,
            }
        )


class FingerprintView(ClimateEndpoint):
    def get(self, request, region_id):
        region = self.get_region(region_id)
        variable = request.query_params.get("variable", "precipitation")
        if variable not in VARIABLE_FIELDS:
            return Response(
                {"error": f"Unknown variable '{variable}'. "
                          f"Choose from {list(VARIABLE_FIELDS)}."},
                status=400,
            )
        year_from, year_to = _year_range(request, region)
        payload = build_fingerprint(region, variable, year_from, year_to)
        payload["enso_events"] = self.enso_overlay(year_from, year_to)
        return Response(payload)


class ExtremesView(ClimateEndpoint):
    """Extreme weather day counts by year, with a linear-regression trend."""

    def get(self, request, region_id):
        region = self.get_region(region_id)
        qs = ClimateAnnual.objects.filter(region=region).order_by("year")
        rows = list(qs.values(
            "year", "hot_days", "cool_days", "heavy_rain_days",
            "extreme_rain_days", "max_consecutive_dry_days",
            "max_consecutive_hot_days",
        ))

        trends = {}
        for metric in ("hot_days", "cool_days", "heavy_rain_days",
                       "extreme_rain_days", "max_consecutive_dry_days",
                       "max_consecutive_hot_days"):
            pts = [(r["year"], r[metric]) for r in rows if r[metric] is not None]
            trends[metric] = _linreg(pts)

        return Response(
            {
                "region": RegionSerializer(region).data,
                "results": rows,
                "trends": trends,
                "enso_events": self.enso_overlay(1950, date.today().year),
            }
        )


class SeasonView(ClimateEndpoint):
    """Wet season onset/end scatter data by year."""

    def get(self, request, region_id):
        region = self.get_region(region_id)
        qs = ClimateAnnual.objects.filter(region=region).order_by("year")
        rows = list(qs.values("year", "wet_season_onset_doy", "wet_season_end_doy"))

        onset_pts = [
            (r["year"], r["wet_season_onset_doy"])
            for r in rows if r["wet_season_onset_doy"] is not None
        ]
        null_years = sum(1 for r in rows if r["wet_season_onset_doy"] is None)

        return Response(
            {
                "region": RegionSerializer(region).data,
                "results": rows,
                "onset_trend": _linreg(onset_pts),
                "null_onset_years": null_years,
            }
        )


class ForecastContextView(ClimateEndpoint):
    """7-day live forecast vs historical range for this week of the year."""

    def get(self, request, region_id):
        region = self.get_region(region_id)
        try:
            resp = requests.get(
                settings.OPENMETEO_FORECAST,
                params={
                    "latitude": region.latitude,
                    "longitude": region.longitude,
                    "daily": "temperature_2m_max,precipitation_sum",
                    "timezone": "Asia/Jakarta",
                    "forecast_days": 7,
                },
                timeout=15,
            )
            resp.raise_for_status()
            forecast = resp.json().get("daily", {})
        except requests.RequestException as exc:
            return Response({"error": f"Forecast unavailable: {exc}"}, status=502)

        # Historical context for the current week-of-year from ClimateDaily.
        today = date.today()
        doy = today.timetuple().tm_yday
        window = (doy - 3, doy + 3)
        hist = ClimateDaily.objects.filter(
            region=region, temp_max__isnull=False
        )
        temps = [
            d.temp_max for d in hist
            if window[0] <= d.date.timetuple().tm_yday <= window[1]
        ]
        temps.sort()

        def pct(p):
            if not temps:
                return None
            return temps[min(int(len(temps) * p), len(temps) - 1)]

        return Response(
            {
                "region": RegionSerializer(region).data,
                "forecast": forecast,
                "historical": {
                    "week_of_year": doy,
                    "temp_max_p10": pct(0.10),
                    "temp_max_p90": pct(0.90),
                    "temp_max_mean": round(sum(temps) / len(temps), 1) if temps else None,
                    "sample_days": len(temps),
                },
            }
        )


class CompareView(APIView):
    """Side-by-side climate profile for two regions."""

    def get(self, request):
        a_id = request.query_params.get("a")
        b_id = request.query_params.get("b")
        if not (a_id and b_id):
            return Response({"error": "Provide ?a= and ?b= region ids."}, status=400)

        def profile(region_id):
            region = get_object_or_404(IndonesiaRegion, pk=region_id)
            monthly = ClimateMonthly.objects.filter(region=region)
            annual = list(
                ClimateAnnual.objects.filter(region=region)
                .order_by("year")
                .values("year", "avg_temp_max", "total_precipitation",
                        "hot_days", "extreme_rain_days")
            )
            # 12-month climatology (avg across all years)
            climatology = []
            for m in range(1, 13):
                mrows = [r for r in monthly if r.month == m]
                t = [r.avg_temp_mean for r in mrows if r.avg_temp_mean is not None]
                p = [r.total_precipitation for r in mrows if r.total_precipitation is not None]
                climatology.append({
                    "month": m,
                    "avg_temp_mean": round(sum(t) / len(t), 1) if t else None,
                    "avg_precipitation": round(sum(p) / len(p), 1) if p else None,
                })
            temp_pts = [(r["year"], r["avg_temp_max"]) for r in annual
                        if r["avg_temp_max"] is not None]
            return {
                "region": RegionSerializer(region).data,
                "climatology": climatology,
                "annual": annual,
                "warming_trend": _linreg(temp_pts),
            }

        return Response({"a": profile(a_id), "b": profile(b_id)})


def _linreg(points):
    """Ordinary least-squares slope/intercept over (x, y) points."""
    n = len(points)
    if n < 2:
        return {"slope": None, "intercept": None, "n": n}
    sx = sum(x for x, _ in points)
    sy = sum(y for _, y in points)
    sxx = sum(x * x for x, _ in points)
    sxy = sum(x * y for x, y in points)
    denom = n * sxx - sx * sx
    if denom == 0:
        return {"slope": None, "intercept": None, "n": n}
    slope = (n * sxy - sx * sy) / denom
    intercept = (sy - slope * sx) / n
    return {"slope": round(slope, 5), "intercept": round(intercept, 3), "n": n}
