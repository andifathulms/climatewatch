import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.regions.models import IndonesiaRegion


class Command(BaseCommand):
    help = "Load Indonesian regions from data/indonesia_regions.json"

    def handle(self, *args, **options):
        path = Path(settings.BASE_DIR) / "data" / "indonesia_regions.json"
        with open(path, encoding="utf-8") as fh:
            rows = json.load(fh)

        created, updated = 0, 0
        for row in rows:
            slug = slugify(row["name"])
            obj, was_created = IndonesiaRegion.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": row["name"],
                    "type": row.get("type", "kota"),
                    "province": row.get("province", ""),
                    "latitude": row["latitude"],
                    "longitude": row["longitude"],
                    "bps_code": row.get("bps_code", ""),
                    "is_featured": row.get("is_featured", False),
                },
            )
            created += was_created
            updated += not was_created

        self.stdout.write(
            self.style.SUCCESS(
                f"Regions loaded: {created} created, {updated} updated "
                f"({IndonesiaRegion.objects.count()} total)."
            )
        )
