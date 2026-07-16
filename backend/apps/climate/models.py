from django.db import models

from apps.common.models import BaseModel
from apps.regions.models import IndonesiaRegion


class ClimateDaily(models.Model):
    """
    Daily climate values from ERA5 reanalysis.

    Stored in a TimescaleDB hypertable keyed on `date`. Missing values are
    stored as NULL — never substitute 0 for missing precipitation.
    """

    class Source(models.TextChoices):
        ERA5 = "ERA5", "ERA5"
        CMIP6_MRI = "CMIP6_MRI", "CMIP6 MRI"
        CMIP6_NICAM = "CMIP6_NICAM", "CMIP6 NICAM"

    region = models.ForeignKey(
        IndonesiaRegion, on_delete=models.CASCADE, related_name="daily"
    )
    date = models.DateField()
    temp_max = models.FloatField(null=True, blank=True)
    temp_min = models.FloatField(null=True, blank=True)
    temp_mean = models.FloatField(null=True, blank=True)
    precipitation_mm = models.FloatField(null=True, blank=True)
    windspeed_max_kmh = models.FloatField(null=True, blank=True)
    evapotranspiration_mm = models.FloatField(null=True, blank=True)
    source = models.CharField(
        max_length=16, choices=Source.choices, default=Source.ERA5
    )

    class Meta:
        # Hypertables cannot use a surrogate PK alone; the composite
        # (region, date) uniqueness is the primary query + upsert key.
        constraints = [
            models.UniqueConstraint(
                fields=["region", "date"], name="uniq_region_date"
            )
        ]
        indexes = [
            models.Index(fields=["region", "date"], name="climate_region_date_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.region_id} {self.date}"


class ClimateMonthly(BaseModel):
    """Materialized monthly aggregate — rebuilt from ClimateDaily, never queried live."""

    region = models.ForeignKey(
        IndonesiaRegion, on_delete=models.CASCADE, related_name="monthly"
    )
    year = models.IntegerField()
    month = models.IntegerField()

    avg_temp_max = models.FloatField(null=True, blank=True)
    avg_temp_min = models.FloatField(null=True, blank=True)
    avg_temp_mean = models.FloatField(null=True, blank=True)
    total_precipitation = models.FloatField(null=True, blank=True)
    hot_days = models.IntegerField(default=0)
    heavy_rain_days = models.IntegerField(default=0)
    extreme_rain_days = models.IntegerField(default=0)
    dry_days = models.IntegerField(default=0)
    coverage = models.FloatField(default=0.0, help_text="Fraction of days with data")

    class Meta:
        ordering = ["year", "month"]
        constraints = [
            models.UniqueConstraint(
                fields=["region", "year", "month"], name="uniq_monthly"
            )
        ]
        indexes = [
            models.Index(
                fields=["region", "year", "month"],
                name="climate_monthly_rym_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.region_id} {self.year}-{self.month:02d}"


class ClimateAnnual(BaseModel):
    """Materialized annual aggregate — rebuilt from ClimateMonthly / ClimateDaily."""

    region = models.ForeignKey(
        IndonesiaRegion, on_delete=models.CASCADE, related_name="annual"
    )
    year = models.IntegerField()

    avg_temp_max = models.FloatField(null=True, blank=True)
    avg_temp_min = models.FloatField(null=True, blank=True)
    total_precipitation = models.FloatField(null=True, blank=True)
    rainy_days = models.IntegerField(default=0)
    hot_days = models.IntegerField(default=0)
    cool_days = models.IntegerField(default=0)
    heavy_rain_days = models.IntegerField(default=0)
    extreme_rain_days = models.IntegerField(default=0)
    max_consecutive_dry_days = models.IntegerField(default=0)
    max_consecutive_hot_days = models.IntegerField(
        default=0, help_text="Longest streak of consecutive days with temp_max > 35C"
    )
    wet_season_onset_doy = models.IntegerField(null=True, blank=True)
    wet_season_end_doy = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ["year"]
        constraints = [
            models.UniqueConstraint(
                fields=["region", "year"], name="uniq_annual"
            )
        ]
        indexes = [
            models.Index(
                fields=["region", "year"],
                name="climate_annual_ry_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.region_id} {self.year}"


class ENSOEvent(BaseModel):
    """Oceanic Niño Index (ONI) value for a given month — ENSO overlay data."""

    class Phase(models.TextChoices):
        EL_NINO = "EL_NINO", "El Niño"
        LA_NINA = "LA_NINA", "La Niña"
        NEUTRAL = "NEUTRAL", "Neutral"

    class Strength(models.TextChoices):
        WEAK = "WEAK", "Weak"
        MODERATE = "MODERATE", "Moderate"
        STRONG = "STRONG", "Strong"
        VERY_STRONG = "VERY_STRONG", "Very Strong"
        NONE = "NONE", "None"

    year = models.IntegerField()
    month = models.IntegerField()
    oni_index = models.FloatField()
    phase = models.CharField(max_length=8, choices=Phase.choices)
    strength = models.CharField(
        max_length=12, choices=Strength.choices, default=Strength.NONE
    )

    class Meta:
        ordering = ["year", "month"]
        constraints = [
            models.UniqueConstraint(
                fields=["year", "month"], name="uniq_enso_month"
            )
        ]

    def __str__(self) -> str:
        return f"{self.year}-{self.month:02d} {self.phase} ({self.oni_index})"
