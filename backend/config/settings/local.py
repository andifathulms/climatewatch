"""Local development settings."""
from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

# In local dev, accept requests from any frontend origin (dev ports vary).
CORS_ALLOW_ALL_ORIGINS = True

# Run Celery tasks synchronously in local dev unless a worker is running.
CELERY_TASK_ALWAYS_EAGER = os.environ.get(  # noqa: F405
    "CELERY_TASK_ALWAYS_EAGER", "False"
).lower() in ("1", "true", "yes")
