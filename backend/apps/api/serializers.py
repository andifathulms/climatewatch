from rest_framework import serializers

from apps.climate.models import ClimateAnnual, ClimateDaily, ClimateMonthly, ENSOEvent
from apps.regions.models import IndonesiaRegion


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = IndonesiaRegion
        fields = (
            "id", "name", "slug", "type", "latitude", "longitude",
            "province", "bps_code", "is_featured",
        )


class RegionDetailSerializer(RegionSerializer):
    data_availability = serializers.SerializerMethodField()

    class Meta(RegionSerializer.Meta):
        fields = RegionSerializer.Meta.fields + ("data_availability",)

    def get_data_availability(self, obj):
        annual = obj.annual.all()
        years = [a.year for a in annual]
        return {
            "has_data": bool(years),
            "year_from": min(years) if years else None,
            "year_to": max(years) if years else None,
            "years_loaded": len(years),
        }


class ClimateDailySerializer(serializers.ModelSerializer):
    class Meta:
        model = ClimateDaily
        fields = (
            "date", "temp_max", "temp_min", "temp_mean",
            "precipitation_mm", "windspeed_max_kmh",
            "evapotranspiration_mm", "source",
        )


class ClimateMonthlySerializer(serializers.ModelSerializer):
    class Meta:
        model = ClimateMonthly
        fields = (
            "year", "month", "avg_temp_max", "avg_temp_min", "avg_temp_mean",
            "total_precipitation", "hot_days", "heavy_rain_days",
            "extreme_rain_days", "dry_days", "coverage",
        )


class ClimateAnnualSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClimateAnnual
        fields = (
            "year", "avg_temp_max", "avg_temp_min", "total_precipitation",
            "rainy_days", "hot_days", "cool_days", "heavy_rain_days",
            "extreme_rain_days", "max_consecutive_dry_days",
            "wet_season_onset_doy", "wet_season_end_doy",
        )


class ENSOEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ENSOEvent
        fields = ("year", "month", "oni_index", "phase", "strength")
