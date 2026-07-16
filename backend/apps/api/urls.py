from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"regions", views.RegionViewSet, basename="region")
router.register(r"enso", views.ENSOViewSet, basename="enso")

climate_patterns = [
    path("rankings/", views.RankingsView.as_view()),
    path("<int:region_id>/daily/", views.DailyView.as_view()),
    path("<int:region_id>/monthly/", views.MonthlyView.as_view()),
    path("<int:region_id>/annual/", views.AnnualView.as_view()),
    path("<int:region_id>/fingerprint/", views.FingerprintView.as_view()),
    path("<int:region_id>/extremes/", views.ExtremesView.as_view()),
    path("<int:region_id>/season/", views.SeasonView.as_view()),
    path("<int:region_id>/enso-impact/", views.ENSOImpactView.as_view()),
    path("<int:region_id>/forecast-context/", views.ForecastContextView.as_view()),
]

urlpatterns = [
    path("", include(router.urls)),
    path("climate/", include(climate_patterns)),
    path("compare/", views.CompareView.as_view()),
]
