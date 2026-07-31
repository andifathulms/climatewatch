# Iklim — Climate Intelligence for Indonesia

Iklim turns 75+ years of ERA5 weather reanalysis data into visual stories about
how Indonesian cities, regions, and seasons are actually changing. The signature
feature is the **Climate Fingerprint** — a calendar heatmap showing decades of
monthly climate data at a glance.

Built on [Open-Meteo](https://open-meteo.com)'s free ERA5 historical API
(1950–present, no key required).

**🔴 Live demo:** [andifathulms.github.io/climatewatch](https://andifathulms.github.io/climatewatch/)
— a static export, some cities running on real ERA5 data and the rest
pending a refresh (see [Static export / GitHub Pages](#static-export--github-pages-demo) below).

---

## Features

- **Climate Fingerprint** — a GitHub-style calendar heatmap (years × months) of
  rainfall, max temperature, hot days, or dry days for any city, 1950–present
- **Extreme weather tracker** — heat days, heavy/extreme rain days, and
  longest heatwave streak per year, each with a linear regression trend
- **Season shift scatter** — when wet season actually starts each year, and
  whether that's drifting earlier or later
- **City vs. city compare** — side-by-side climate profiles for any two
  Indonesian cities
- **ENSO impact overlay** — how El Niño / La Niña phases shift a city's
  rainfall and temperature relative to neutral years
- **Cross-city rankings** — hottest, wettest, driest, fastest-warming,
  longest heatwave streak, computed across every seeded region
- **Live forecast context** — today's 7-day forecast plotted against the
  historical range for this week of the year

## Stack

| Layer | Technology |
|---|---|
| Backend | Django 5 + Django REST Framework |
| Task Queue | Celery + Redis |
| Database | PostgreSQL 16 + TimescaleDB |
| Frontend | Next.js 14 (App Router) + Tailwind |
| Charts | Recharts + D3.js |
| Container | Docker + Docker Compose |

## Architecture

Iklim ships two ways, from one codebase:

1. **Live** — the full stack above, a real REST API backed by a database.
   Precomputed monthly/annual aggregates, a daily Celery Beat refresh, live
   forecast comparisons, on-demand loading for any city not yet seeded.
2. **Static** — the same Next.js frontend built with `output: 'export'`,
   reading pre-baked JSON instead of hitting a live API. No server to run,
   deployable for free on GitHub Pages. See
   [Static export / GitHub Pages](#static-export--github-pages-demo).

A single env var, `NEXT_PUBLIC_DATA_MODE`, switches the frontend between the
two — every component calls the same `api.ts` functions either way.

## Quick Start (live stack)

```bash
cp .env.example .env
docker-compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3000

### Bootstrap climate data

```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py load_regions   # 75 seeded cities
docker-compose exec backend python manage.py load_enso      # ENSO / ONI events
docker-compose exec backend python manage.py climate_bootstrap   # ERA5 1950–present
```

> `climate_bootstrap` fetches ERA5 in chunked requests per region with a
> polite delay, so a full 75-city bootstrap takes a while. Use `--slug
> balikpapan` to load a single city first, `--start-year 1990` to shorten the
> range, or `--skip-existing` to resume a partial run.
>
> Open-Meteo's archive API has been observed to time out or rate-limit
> requests from some cloud/CI IP ranges (GitHub Actions in particular) — if
> `climate_bootstrap` fails outright, it's usually the network, not this code.
> Runs fine from a normal residential/office connection.

If the Open-Meteo archive API is unreachable (offline / blocked network), seed
reproducible **synthetic** data instead so the app is fully viewable:

```bash
docker-compose exec backend python manage.py seed_demo         # 7 preset cities
docker-compose exec backend python manage.py seed_demo --all   # every seeded region
```

## Static export / GitHub Pages demo

The live site at
[andifathulms.github.io/climatewatch](https://andifathulms.github.io/climatewatch/)
is a fully static build — no server, no database at request time. It reads
JSON exported ahead of time from the same Django aggregation logic the live
API uses:

```bash
docker-compose exec backend python manage.py export_static --out ../data/static_export
```

That output is committed to [`data/static_export/`](data/static_export/) in
this repo. `.github/workflows/pages.yml` copies it into
`frontend/public/data/`, builds the frontend with
`NEXT_PUBLIC_DATA_MODE=static`, and deploys to GitHub Pages on every push to
`main` — no bootstrap step runs in CI at all, since Open-Meteo has been
unreliable from GitHub Actions' IP ranges. To refresh or extend the demo's
data coverage:

1. Bootstrap more cities locally (`climate_bootstrap --skip-existing`)
2. Re-run `export_static` as above
3. Commit the updated `data/static_export/` and push

## Data Attribution

Climate data: Open-Meteo.com (CC BY 4.0). Based on ERA5 reanalysis from
Copernicus Climate Change Service / ECMWF. ENSO data: NOAA Climate Prediction
Center.

See [`PRD.md`](PRD.md) and [`CLAUDE.md`](CLAUDE.md) for full specification and
build conventions.
