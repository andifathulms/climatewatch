"""Celery application for Iklim."""
import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

app = Celery("iklim")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Daily update at 06:00 WIB (Asia/Jakarta)
app.conf.beat_schedule = {
    "daily-climate-update": {
        "task": "apps.climate.tasks.ingest.update_climate_yesterday_all",
        "schedule": crontab(hour=6, minute=0),
    },
}


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
