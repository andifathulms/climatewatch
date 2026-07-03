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

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["is_featured"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.province})" if self.province else self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
