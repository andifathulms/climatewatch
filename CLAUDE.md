# CLAUDE.md — Iklim

## What You Are Building

Iklim is a climate intelligence platform for Indonesia built on Open-Meteo's free
ERA5 historical weather reanalysis API (1950–present, no key required). It lets
users explore how temperature, rainfall, and extreme weather patterns in any
Indonesian city have changed over decades. The signature feature is the Climate
Fingerprint — a calendar heatmap showing 75 years of monthly climate data at a
glance.

Read PRD.md first. This file contains build conventions and exact build order.

---

## Repository Structure

```
iklim/
├── backend/
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── local.py
│   │   │   └── production.py
│   │   ├── celery.py
│   │   └── urls.py
│   ├── apps/
│   │   ├── regions/            # IndonesiaRegion model + seed data
│   │   ├── climate/            # ClimateDaily, ClimateMonthly, ClimateAnnual, ENSOEvent
│   │   │   ├── tasks/
│   │   │   │   ├── ingest.py   # Open-Meteo fetch + upsert
│   │   │   │   └── aggregate.py # Monthly/annual materialization
│   │   │   └── management/commands/climate_bootstrap.py
│   │   └── api/                # All DRF viewsets
│   ├── data/
│   │   ├── indonesia_regions.json   # seeded region list with lat/lng
│   │   └── enso_events.json         # historical ENSO event dataset
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   │   ├── fingerprint/     # ClimateFingerprint (D3 calendar heatmap)
│   │   │   ├── charts/          # ExtremeDaysChart, SeasonShiftScatter, etc.
│   │   │   ├── compare/         # CityCompare, ComparePanel
│   │   │   └── ui/              # TempBadge, RainfallBar, ENSOBadge, DataAttribution
│   │   ├── lib/api.ts
│   │   └── styles/tokens.css    # Musim design system tokens
│   └── package.json
├── docker-compose.yml
└── nginx/iklim.conf
```

---

## Environment Variables

```env
SECRET_KEY=
DEBUG=False
ALLOWED_HOSTS=
DATABASE_URL=postgresql://iklim:password@db:5432/iklim
REDIS_URL=redis://redis:6379/0

# Open-Meteo — no API key required, all endpoints are open
# NOAA ENSO data — public CSV download, no key

NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Django Conventions

- Django 5 + DRF 3.15+
- TimescaleDB hypertable on `ClimateDaily.date`
- All apps under `backend/apps/`

### Base Model
```python
class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True
```

### TimescaleDB Hypertable Migration
```python
# In ClimateDaily migration
migrations.RunSQL(
    "SELECT create_hypertable('climate_climatedaily', 'date', "
    "if_not_exists => TRUE);",
    reverse_sql="SELECT 1;"
)
```
Add a composite index on `(region_id, date)` — this is the primary query pattern.

---

## Open-Meteo API Conventions

### Historical API (ERA5) — Primary Data Source
```python
OPENMETEO_ARCHIVE = "https://archive.open-meteo.com/v1/archive"

DAILY_VARIABLES = (
    "temperature_2m_max,temperature_2m_min,temperature_2m_mean,"
    "precipitation_sum,windspeed_10m_max,et0_fao_evapotranspiration"
)

def fetch_historical(lat: float, lng: float,
                     start: str, end: str) -> dict:
    """
    Returns dict with 'daily' key containing lists of values.
    All lists are the same length as 'daily.time'.
    Missing values returned as None (not 0) — handle null carefully,
    especially for precipitation where None != 0mm rain.
    """
    resp = requests.get(
        OPENMETEO_ARCHIVE,
        params={
            "latitude": lat,
            "longitude": lng,
            "start_date": start,
            "end_date": end,
            "daily": DAILY_VARIABLES,
            "timezone": "Asia/Jakarta",
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()
```

### Response Shape
```json
{
  "latitude": -0.9492,
  "longitude": 116.7419,
  "daily": {
    "time": ["1950-01-01", "1950-01-02", ...],
    "temperature_2m_max": [31.2, 32.1, null, ...],
    "temperature_2m_min": [24.1, 23.8, null, ...],
    "temperature_2m_mean": [27.6, 27.9, null, ...],
    "precipitation_sum": [12.4, 0.0, null, ...],
    "windspeed_10m_max": [18.2, 15.6, null, ...],
    "et0_fao_evapotranspiration": [4.2, 4.8, null, ...]
  }
}
```

### Null Handling Rules
- `temperature_*`: null → store as NULL in DB (very rare in ERA5, skip in aggregations)
- `precipitation_sum`: null → store as NULL, treat as missing in counts (not zero rain)
- When computing ClimateMonthly: skip months with >5 null days in any variable
- Always show data coverage % in API responses so frontend can warn users

### Chunking for Large Date Ranges
```python
def fetch_in_yearly_chunks(region, start_year=1950):
    """ERA5 returns fine for large ranges but chunk by year for reliability."""
    for year in range(start_year, date.today().year + 1):
        start = f"{year}-01-01"
        end = f"{year}-12-31"
        data = fetch_historical(region.latitude, region.longitude, start, end)
        upsert_climate_daily(region, data['daily'])
        time.sleep(0.5)  # polite delay between requests
```

---

## Aggregation Logic

All aggregations live in `apps/climate/tasks/aggregate.py`.
**Never compute aggregations on query — always precompute and cache.**

### ClimateMonthly from ClimateDaily
```python
def rebuild_climate_monthly(region_id: int, year: int, month: int):
    qs = ClimateDaily.objects.filter(
        region_id=region_id,
        date__year=year,
        date__month=month,
    )
    result = qs.aggregate(
        avg_temp_max=Avg('temp_max'),
        avg_temp_min=Avg('temp_min'),
        avg_temp_mean=Avg('temp_mean'),
        total_precipitation=Sum('precipitation_mm'),
        hot_days=Count('id', filter=Q(temp_max__gt=35)),
        heavy_rain_days=Count('id', filter=Q(precipitation_mm__gt=50)),
        extreme_rain_days=Count('id', filter=Q(precipitation_mm__gt=100)),
        dry_days=Count('id', filter=Q(precipitation_mm__lt=1)),
    )
    ClimateMonthly.objects.update_or_create(
        region_id=region_id, year=year, month=month,
        defaults=result
    )
```

### Wet Season Onset (for ClimateAnnual)
```python
def compute_wet_season_onset(region_id: int, year: int) -> int | None:
    """
    Returns day-of-year of wet season onset for a given year, or None.
    Definition: first occurrence after August 1st of 5 consecutive days
    with cumulative rainfall >= 40mm.
    Returns None if no such period found (very dry year).
    """
    days = ClimateDaily.objects.filter(
        region_id=region_id,
        date__year=year,
        date__month__gte=8,
    ).order_by('date').values('date', 'precipitation_mm')

    window = []
    for day in days:
        window.append(day['precipitation_mm'] or 0)
        if len(window) > 5:
            window.pop(0)
        if len(window) == 5 and sum(window) >= 40:
            return day['date'].timetuple().tm_yday
    return None
```

---

## Fingerprint API Response Format

The `/api/climate/{region_id}/fingerprint/` endpoint must return data in a format
the D3 calendar heatmap can consume directly without client-side transformation.

```python
# Expected response shape:
{
  "region": {"id": 1, "name": "Balikpapan"},
  "variable": "precipitation",  # or "temp_max" | "hot_days" | "dry_days"
  "year_from": 1950,
  "year_to": 2024,
  "data": [
    {"year": 1950, "month": 1, "value": 124.5},
    {"year": 1950, "month": 2, "value": 98.2},
    ...
    {"year": 2024, "month": 12, "value": 210.1}
  ],
  "stats": {
    "min": 0.0,
    "max": 450.2,
    "p10": 45.0,
    "p90": 280.0,
    "mean": 150.3
  }
}
```
Return all year/month combinations including nulls (as null in JSON).
Client needs nulls to render empty cells correctly.

---

## DRF Conventions

- All list endpoints: `PageNumberPagination`, page_size=50
- Time-range params: `?year_from=1990&year_to=2024` — always inclusive
- Variable param: `?variable=precipitation|temp_max|hot_days|dry_days`
- No authentication (all public read-only)
- ENSO events included in relevant responses as `enso_events` array for overlay

---

## Frontend Conventions

- Next.js 14 App Router, TypeScript
- D3.js exclusively for ClimateFingerprint heatmap — complex enough to justify raw D3
- Recharts for all other charts (line, scatter, bar)
- All climate numbers formatted to 1 decimal place
- Temperature always shown in Celsius
- Rainfall always shown in mm
- Data attribution footer component required on every page (CC BY 4.0)

### ClimateFingerprint Component (core D3 component)
```tsx
// components/fingerprint/ClimateFingerprint.tsx
// Grid: rows = years (y-axis, newest at top), cols = months (x-axis)
// Cell size: ~20×20px minimum, with padding
// Color scale: D3 sequential scale based on variable
// Interaction:
//   - Hover cell → tooltip (month/year + value + ENSO label if applicable)
//   - Hover year row → highlight row + show annual total in sidebar
//   - Click cell → nothing in v1 (future: drill-down to daily view)
// ENSO overlay: when enabled, add colored left border per year row
//   (orange border = El Niño, green border = La Niña)
// null cells: render as light gray (#E8E0D0) — distinct from "zero" value

const buildColorScale = (variable: string, stats: FingerprintStats) => {
  switch(variable) {
    case 'precipitation':
      return d3.scaleSequential(d3.interpolateBlues).domain([0, stats.p90])
    case 'temp_max':
      return d3.scaleSequential(d3.interpolateOranges).domain([stats.p10, stats.p90])
    case 'hot_days':
      return d3.scaleSequential(d3.interpolateReds).domain([0, stats.max])
    case 'dry_days':
      return d3.scaleSequential(d3.interpolateYlOrBr).domain([0, stats.max])
  }
}
```

### Trend Line (all line charts)
Add a simple linear regression trend line to every annual time-series chart.
Use `simple-statistics` npm package for the regression calculation.
Color the trend line differently from the data series (use `--drought-amber`
for trend lines universally to distinguish from data).

### SeasonShiftScatter Component
```tsx
// Each point = one year
// X-axis = year (1950–present)
// Y-axis = day of year (1–365, labeled as month names)
// Color: single accent color (rain-blue)
// Null years: omit (don't plot, note in subtitle how many years had no wet season)
// Trend line: linear regression overlay
```

### Component Naming
```
components/
├── fingerprint/
│   └── ClimateFingerprint.tsx    # THE signature D3 component
├── charts/
│   ├── ExtremeDaysChart.tsx      # Recharts line + trend
│   ├── SeasonShiftScatter.tsx    # Recharts scatter + trend
│   ├── MonthlyBarChart.tsx       # 12-month rainfall/temp bar
│   └── ForecastContext.tsx       # 7-day forecast vs historical range
├── compare/
│   ├── CityCompare.tsx           # selector UI
│   └── ComparePanel.tsx          # single city panel (used ×2)
└── ui/
    ├── ENSOBadge.tsx             # El Niño / La Niña label pill
    ├── TrendArrow.tsx            # ↑ / ↓ with % change
    ├── DataAttribution.tsx       # mandatory CC BY 4.0 footer
    └── NullDataWarning.tsx       # shown when data coverage < 90%
```

---

## Docker Compose (Local)

```yaml
services:
  db:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_DB: iklim
      POSTGRES_USER: iklim
      POSTGRES_PASSWORD: password
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine

  backend:
    build: ./backend
    command: python manage.py runserver 0.0.0.0:8000
    volumes: ["./backend:/app"]
    env_file: .env
    depends_on: [db, redis]
    ports: ["8000:8000"]

  celery:
    build: ./backend
    command: celery -A config worker -l info
    volumes: ["./backend:/app"]
    env_file: .env
    depends_on: [db, redis]

  celery-beat:
    build: ./backend
    command: celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    env_file: .env
    depends_on: [db, redis]

  frontend:
    build: ./frontend
    command: npm run dev
    volumes: ["./frontend:/app"]
    env_file: .env
    ports: ["3000:3000"]

volumes:
  pgdata:
```

---

## Build Order

### Step 1 — Django Foundation
1. Scaffold Django with TimescaleDB enabled
2. Create all models + hypertable migration for ClimateDaily
3. Load seed data: `indonesia_regions.json` (34 province capitals + lat/lng)
4. Load seed data: `enso_events.json` (historical ENSO index 1950–present)
5. Register all models in admin
6. Verify: migrations run clean, admin loads

### Step 2 — Open-Meteo Bootstrap
1. Write `climate_bootstrap` management command
2. Fetch ERA5 daily data for all 34 seeded province capitals, 1950–present
3. Bulk-insert into ClimateDaily (use `bulk_create(update_conflicts=True)`)
4. Run `rebuild_climate_monthly` and `rebuild_climate_annual` for all regions
5. Verify: `ClimateDaily.objects.count()` > 800k rows

### Step 3 — DRF Endpoints
1. Build all endpoints listed in PRD
2. Fingerprint endpoint must return exact shape defined in CLAUDE.md
3. Test fingerprint response with Balikpapan — verify all 75 years × 12 months present

### Step 4 — Frontend: Fingerprint First
1. Tailwind + Musim design tokens
2. Build `ClimateFingerprint` D3 component — this is the hardest component,
   do it first while energy is high
3. Build `DataAttribution` component — required on every page, wire immediately
4. Build city page layout around the fingerprint
5. Add ENSO overlay toggle

### Step 5 — Remaining Charts + Pages
1. `ExtremeDaysChart` with trend line
2. `SeasonShiftScatter`
3. `ForecastContext` panel (live Open-Meteo forecast API call)
4. Compare page + `MonthlyBarChart`
5. Homepage with city search

---

## Key Decisions (Do Not Change)

- **ERA5 for all historical analysis** — not Historical Forecast API (which
  only goes to 2021 and changes with model upgrades — inconsistent for climate trends)
- **ClimateMonthly and ClimateAnnual are precomputed** — never aggregate from
  ClimateDaily on a live query
- **Nulls are stored as NULL** — never substitute 0 for missing precipitation;
  0mm rain and missing data are different things
- **On-demand region load for non-seeded cities** — trigger bootstrap task,
  show loading state, don't block
- **CC BY 4.0 attribution is legally required** — `DataAttribution` component
  appears on every page, this is non-optional
- **D3 for fingerprint only** — all other charts use Recharts

---

## Definition of Done (Phase 1–3)

- [ ] `climate_bootstrap` loads all 34 province capitals with 1950–present data
- [ ] `ClimateMonthly` + `ClimateAnnual` populated for all bootstrapped regions
- [ ] `/api/climate/{id}/fingerprint/` returns complete 75yr × 12mo grid
- [ ] `/api/climate/{id}/annual/` returns extreme days counts by year with trend data
- [ ] `/api/climate/{id}/season/` returns wet season onset scatter data
- [ ] Climate Fingerprint D3 heatmap renders correctly for Balikpapan (real data)
- [ ] ENSO overlay toggle works on the heatmap
- [ ] City page shows all 5 features (fingerprint, extremes, season, ENSO, forecast)
- [ ] `DataAttribution` component visible on every page
- [ ] `docker-compose up` works cleanly from fresh clone
