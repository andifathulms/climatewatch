# ClimateWatch — Climate Intelligence for Indonesia

ClimateWatch turns 77 years of ERA5 weather reanalysis into one picture per
Indonesian city, so anyone can see how rainfall, heat and extreme weather have
actually changed. Bahasa Indonesia by default, English one tap away.

Built on [Open-Meteo](https://open-meteo.com)'s free ERA5 / ERA5-Land archive
(1950–present, `models=era5_seamless`) and its CMIP6 Climate API.

**🔴 Live:** [andifathulms.github.io/climatewatch](https://andifathulms.github.io/climatewatch/)
— a static export of the full dataset (see [Static export / GitHub Pages](#static-export--github-pages-demo)).

---

## Features

- **Warming stripes** for every city — one band per year against its own
  1951–1980 normal. The site's signature: logo, city header, cards, rankings,
  share images, and a wall of all 90+ cities on `/stories`.
- **Climate Fingerprint** — years × months heatmap of rainfall, max
  temperature, feels-like heat, hot days or dry days, with layers for the
  1951–1980 baseline, wet-season onset, El Niño / La Niña and extreme years.
- **An answer first** — every city page opens with a computed sentence
  ("Jakarta's afternoons are X °C hotter than in the 1950s") and a ranked list
  of what changed most.
- **Your lifetime** — enter your birth year, see how much hotter your city has
  become since.
- **Looking ahead** — CMIP6 HighResMIP projections to the 2040s (five models,
  delta method, model spread shown).
- **This week** — live 7-day forecast against the historical range.
- **Rankings** — linked map, list and dot plot: warming rate, heat, feels-like
  heat, rain, extreme rain, heatwaves.
- **Compare** — two cities: a verdict sentence, paired stripes, side-by-side
  fingerprints.
- **Stories** — findings computed from the data, rewritten on every refresh.
- **Share** — per-city 1200×630 link cards and 1080×1350 story cards.
- **Search anywhere** — ⌘K / `/` from any page; bottom tab bar on phones.

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

ClimateWatch ships two ways, from one codebase:

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
