# Iklim — Climate Intelligence for Indonesia

Iklim turns 75+ years of ERA5 weather reanalysis data into visual stories about
how Indonesian cities, regions, and seasons are actually changing. The signature
feature is the **Climate Fingerprint** — a calendar heatmap showing decades of
monthly climate data at a glance.

Built on [Open-Meteo](https://open-meteo.com)'s free ERA5 historical API
(1950–present, no key required).

## Stack

| Layer | Technology |
|---|---|
| Backend | Django 5 + Django REST Framework |
| Task Queue | Celery + Redis |
| Database | PostgreSQL 16 + TimescaleDB |
| Frontend | Next.js 14 (App Router) + Tailwind |
| Charts | Recharts + D3.js |
| Container | Docker + Docker Compose |

## Quick Start

```bash
cp .env.example .env
docker-compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3000

### Bootstrap climate data

```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py load_regions   # 34 province capitals
docker-compose exec backend python manage.py load_enso      # ENSO / ONI events
docker-compose exec backend python manage.py climate_bootstrap   # ERA5 1950–present
```

> `climate_bootstrap` hits Open-Meteo once per region-year with a polite delay,
> so a full 34-city bootstrap takes a while. Use `--slug balikpapan` to load a
> single city first, or `--start-year 1990` to shorten the range.

## Data Attribution

Climate data: Open-Meteo.com (CC BY 4.0). Based on ERA5 reanalysis from
Copernicus Climate Change Service / ECMWF. ENSO data: NOAA Climate Prediction
Center.

See `PRD.md` and `CLAUDE.md` for full specification.
