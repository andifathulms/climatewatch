import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.climate.models import ENSOEvent


def _months(start: str, end: str):
    """Yield (year, month) inclusive between 'YYYY-MM' strings."""
    sy, sm = (int(x) for x in start.split("-"))
    ey, em = (int(x) for x in end.split("-"))
    y, m = sy, sm
    while (y, m) <= (ey, em):
        yield y, m
        m += 1
        if m > 12:
            m = 1
            y += 1


class Command(BaseCommand):
    help = "Load ENSO events from data/enso_events.json (expands episodes to months)."

    def handle(self, *args, **options):
        path = Path(settings.BASE_DIR) / "data" / "enso_events.json"
        with open(path, encoding="utf-8") as fh:
            payload = json.load(fh)

        count = 0
        for ep in payload["episodes"]:
            peak = ep["peak_oni"]
            for year, month in _months(ep["start"], ep["end"]):
                ENSOEvent.objects.update_or_create(
                    year=year,
                    month=month,
                    defaults={
                        "oni_index": peak,
                        "phase": ep["phase"],
                        "strength": ep["strength"],
                    },
                )
                count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"ENSO months loaded: {count} "
                f"({ENSOEvent.objects.count()} total rows)."
            )
        )
