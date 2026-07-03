from django.contrib import admin

from .models import ClimateAnnual, ClimateDaily, ClimateMonthly, ENSOEvent


@admin.register(ClimateDaily)
class ClimateDailyAdmin(admin.ModelAdmin):
    list_display = ("region", "date", "temp_max", "temp_min", "precipitation_mm", "source")
    list_filter = ("source", "region")
    date_hierarchy = "date"
    raw_id_fields = ("region",)


@admin.register(ClimateMonthly)
class ClimateMonthlyAdmin(admin.ModelAdmin):
    list_display = (
        "region", "year", "month", "avg_temp_mean",
        "total_precipitation", "hot_days", "dry_days", "coverage",
    )
    list_filter = ("region", "year")
    raw_id_fields = ("region",)


@admin.register(ClimateAnnual)
class ClimateAnnualAdmin(admin.ModelAdmin):
    list_display = (
        "region", "year", "avg_temp_max", "total_precipitation",
        "hot_days", "extreme_rain_days", "wet_season_onset_doy",
    )
    list_filter = ("region", "year")
    raw_id_fields = ("region",)


@admin.register(ENSOEvent)
class ENSOEventAdmin(admin.ModelAdmin):
    list_display = ("year", "month", "oni_index", "phase", "strength")
    list_filter = ("phase", "strength", "year")
