"""Local development settings."""
from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Run Celery tasks synchronously in local dev unless a worker is running.
CELERY_TASK_ALWAYS_EAGER = os.environ.get(  # noqa: F405
    "CELERY_TASK_ALWAYS_EAGER", "False"
).lower() in ("1", "true", "yes")
