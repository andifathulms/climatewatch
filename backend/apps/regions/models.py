from django.db import models
from django.utils.text import slugify

from apps.common.models import BaseModel


class IndonesiaRegion(BaseModel):
    """An Indonesian administrative region with a query centroid."""

    class RegionType(models.TextChoices):
        PROVINSI = "provinsi", "Provinsi"
        KABUPATEN = "kabupaten", "Kabupaten"
        KOTA = "kota", "Kota"

    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    type = models.CharField(
        max_length=12,
        choices=RegionType.choices,
        default=RegionType.KOTA,
    )
    # Centroid used for Open-Meteo API queries
    latitude = models.FloatField()
    longitude = models.FloatField()
    province = models.CharField(max_length=120, blank=True)
    bps_code = models.CharField(max_length=16, blank=True)
    is_featured = models.BooleanField(default=False)

    # 95th percentile of daily temp_max over the 1951-1980 reference period,
    # in °C. This is the region's *own* definition of an unusually hot day.
    #
    # The fixed 35°C rule is a temperate-climate convention and it is simply
    # dead across most of maritime Indonesia: 25 of 90 loaded cities recorded
    # zero days above 35°C in 77 years, so the "hot days" fingerprint rendered
    # as an empty grid for a quarter of the country. Warming here does not
    # look like new record highs; it looks like the ordinary day moving. A
    # local percentile measures that, and it is alive everywhere.
    #
    # Written once by `manage.py compute_local_baseline`, then held fixed —
    # it is a *baseline*, so it must not drift as new years arrive.
    hot_day_threshold_c = models.FloatField(
        null=True,
        blank=True,
        help_text="95th percentile of 1951-1980 daily temp_max (°C).",
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"], name="regions_ind_slug_idx"),
            models.Index(fields=["is_featured"], name="regions_ind_featured_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.province})" if self.province else self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
