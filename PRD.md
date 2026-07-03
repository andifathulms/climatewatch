# PRD — Iklim

> A climate intelligence platform for Indonesia. Turns 75+ years of weather
> reanalysis data into visual stories about how Indonesian cities, regions, and
> seasons are actually changing — not in theory, but in the data.

---

## Vision

Climate change is abstract until you look at your own city's data. Iklim makes
it concrete: pick any kabupaten, and see how its rainfall, temperature, and
extreme weather days have actually shifted over the last 30–75 years. The
platform answers the question most Indonesians never get to ask: **"Is my city
actually getting hotter/wetter/drier — and by how much?"**

---

## Target Users

| User | Need |
|---|---|
| Curious Indonesian public | "Is Balikpapan getting hotter? What about Lombok?" |
| Students & researchers | Historical climate data for research, free of charge |
| Journalists | Quick factual climate context for articles |
| Farmers / agricultural sector | Rainfall reliability, season shift data |
| OIKN / city planners | Climate baseline for IKN urban planning context |
| TikTok/content creators | Shareable "30 years of data" visual content |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 5 + Django REST Framework |
| Task Queue | Celery + Redis |
| Database | PostgreSQL 16 + TimescaleDB (daily climate time-series) |
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Charts | Recharts + D3.js |
| Maps | Leaflet.js + CartoDB tiles |
| Container | Docker + Docker Compose |
| Deployment | GCP VM + Nginx |

---

## Data Sources

### Primary — Open-Meteo Historical Weather API (ERA5)
Free, no key, no rate limit for non-commercial use. ERA5 reanalysis from
**1940 to present**, hourly, globally, gap-free.

```
GET https://archive.open-meteo.com/v1/archive
  ?latitude=-0.9492
  &longitude=116.7419
  &start_date=1950-01-01
  &end_date=2024-12-31
  &daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,
         precipitation_sum,rain_sum,windspeed_10m_max,
         et0_fao_evapotranspiration
  &timezone=Asia/Jakarta
```

Key variables:
- `temperature_2m_max/min/mean` — daily temperature extremes and average
- `precipitation_sum` — daily total rainfall (mm)
- `rain_sum` — liquid precipitation only (excludes rare solid precipitation)
- `windspeed_10m_max` — daily max wind speed
- `et0_fao_evapotranspiration` — reference evapotranspiration (drought proxy)

**Use for:** All historical trend analysis, climate fingerprint, season shift,
long-term baseline. ERA5 is optimized for consistency over decades — right
choice for climate analysis.

### Secondary — Open-Meteo Climate API (CMIP6)
```
GET https://climate-api.open-meteo.com/v1/climate
  ?latitude=-0.9492
  &longitude=116.7419
  &start_date=1950-01-01
  &end_date=2050-12-31
  &models=MRI_AGCM3_2_S,NICAM16_8S
  &daily=temperature_2m_max,temperature_2m_min,precipitation_sum
```
Provides climate model projections to 2050 at 10km resolution. Use for the
"What does the future look like?" feature. CMIP6 data, CC BY 4.0.

### Tertiary — Open-Meteo Forecast API
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=-0.9492
  &longitude=116.7419
  &daily=temperature_2m_max,precipitation_sum
  &forecast_days=7
```
Used for the "today vs historical average" contextual panel on city pages.
No key required.

### Reference Data — ENSO Index (static + updated monthly)
El Niño/La Niña index (ONI — Oceanic Niño Index) from NOAA. Downloadable
as CSV, updated monthly. Used as annotation layer on all historical charts.
Store in a simple `ENSOEvent` model — does not need real-time polling.

---

## Core Features

### 1. Climate Fingerprint (Hero Feature)
Pick any Indonesian city/kabupaten → see a GitHub-style calendar heatmap
of climate data going back 30–75 years.

**Heatmap variants (toggle):**
- **Rainfall**: daily precipitation per month, aggregated to monthly total
- **Temperature max**: average daily max per month across years
- **Hot days**: days per month exceeding 35°C
- **Dry days**: days per month with < 1mm rainfall

**Layout:** Y-axis = years (1950–present), X-axis = months (Jan–Dec). Each
cell = one month. Color intensity = value magnitude. Immediately shows:
- Is the wet season arriving later?
- Are there more dry months than 30 years ago?
- Is the hot season intensifying?

This is the most visually distinctive feature — the "wow" chart that gets
shared on TikTok.

### 2. Extreme Weather Frequency Tracker
How many days per year exceeded a threshold, and is that changing over time?

**Metrics tracked per city:**
- Days with temperature > 35°C per year (heat days)
- Days with temperature < 20°C per year (cool days — relevant for highlands)
- Days with rainfall > 50mm (heavy rain days)
- Days with rainfall > 100mm (extreme rain days — flood risk proxy)
- Consecutive dry days per year (drought spell tracker)

**Output:** Line chart with trend line (linear regression overlay). Show:
"In 1980, [City] had X extreme heat days per year. In 2023, it had Y."

### 3. Season Shift Visualizer
When does wet season actually start/end per year, and is this drifting?

**Definition of wet season onset (per year):**
First occurrence of 5 consecutive days with cumulative rainfall > 40mm,
after August 1st — a simplified version of BMKG's own definition.

**Output:** Scatter plot — one point per year, Y-axis = day of year of wet
season onset. Connect with trend line. Immediately shows if onset is coming
earlier or later. Same for wet season end.

**Why this matters:** Farmers, planners, and water resource managers in
Indonesia depend on wet season timing. This is genuinely useful data
presented visually for the first time.

### 4. City vs City Climate Compare
Side-by-side climate profile for any two Indonesian cities.

**Panels (side by side):**
- Average monthly temperature (12-month bar chart, both cities overlaid)
- Monthly rainfall pattern (same)
- Trend comparison: "City A warmed X°C over 30 years, City B warmed Y°C"
- Extreme weather day count comparison

**Preset comparisons:**
- Balikpapan vs Jakarta
- Balikpapan vs Makassar
- Medan vs Surabaya
- Manado vs Denpasar

### 5. ENSO Impact Overlay
Annotate any historical chart with El Niño / La Niña events. Toggle on/off.

Shows visually: El Niño 2015–2016 caused a dramatic rainfall deficit in
Kalimantan — the heatmap cell for those months turns noticeably drier.

**ENSO legend:** Red = El Niño (tends drier in Indonesia), Blue = La Niña
(tends wetter). Match with actual data to show how strongly each event
affected a specific region.

### 6. Forecast vs Historical Context Panel
For any city, the current 7-day forecast shown alongside:
- Historical average for this week of the year
- Historical range (10th–90th percentile)
- Color flag: "This week is hotter/wetter/drier than X% of historical years"

The answer to: "Is this heat normal for this time of year, or unusual?"

### 7. 2050 Projection View (Future / Phase 3)
Using Open-Meteo Climate API (CMIP6), show projected temperature and
rainfall changes by 2050 under standard scenarios.

**Important disclaimer:** Projections are model estimates, not forecasts.
Always show uncertainty bands. Always label clearly as "climate scenario
projection, not a prediction."

---

## Database Models

### IndonesiaRegion
```
id, name, type (provinsi | kabupaten | kota),
latitude, longitude,   # centroid for API queries
province, bps_code,
is_featured (bool)     # pre-loaded cities shown in browse/search
```

### ClimateDaily (TimescaleDB hypertable on date)
```
id, region FK,
date (date),
temp_max, temp_min, temp_mean (float, °C),
precipitation_mm (float),
windspeed_max_kmh (float),
evapotranspiration_mm (float),
source (ERA5 | CMIP6_MRI | CMIP6_NICAM)
```

### ClimateMonthly (materialized, rebuilt from ClimateDaily)
```
id, region FK, year, month,
avg_temp_max, avg_temp_min, avg_temp_mean,
total_precipitation_mm,
hot_days_count (temp_max > 35),
heavy_rain_days_count (precip > 50mm),
extreme_rain_days_count (precip > 100mm),
dry_days_count (precip < 1mm)
```
Materialized nightly from ClimateDaily — never computed on query.

### ClimateAnnual (materialized, rebuilt from ClimateMonthly)
```
id, region FK, year,
avg_temp_max, avg_temp_min,
total_precipitation_mm, rainy_days_count,
hot_days_count, extreme_rain_days_count,
max_consecutive_dry_days,
wet_season_onset_doy (day of year),
wet_season_end_doy (day of year)
```

### ENSOEvent
```
id, year, month,
oni_index (float),     # Oceanic Niño Index value
phase (EL_NINO | LA_NINA | NEUTRAL),
strength (WEAK | MODERATE | STRONG | VERY_STRONG)
```
Static dataset, updated manually monthly.

### ProjectionScenario (Phase 3)
```
id, region FK, model, scenario,
year, month,
projected_temp_max, projected_temp_min, projected_precipitation_mm
```

---

## Ingestion Architecture

### Bootstrap (one-time per city)
```python
# management command: python manage.py climate_bootstrap
# For each IndonesiaRegion, fetch ERA5 daily data 1950–present from Open-Meteo
# Then compute ClimateMonthly and ClimateAnnual aggregates

def bootstrap_region(region: IndonesiaRegion):
    response = requests.get(
        "https://archive.open-meteo.com/v1/archive",
        params={
            "latitude": region.latitude,
            "longitude": region.longitude,
            "start_date": "1950-01-01",
            "end_date": date.today().isoformat(),
            "daily": "temperature_2m_max,temperature_2m_min,temperature_2m_mean,"
                     "precipitation_sum,windspeed_10m_max,et0_fao_evapotranspiration",
            "timezone": "Asia/Jakarta",
        }
    )
    data = response.json()
    # data['daily']['time'] = list of date strings
    # data['daily']['temperature_2m_max'] = list of float values
    bulk_insert_climate_daily(region, data['daily'])
    time.sleep(1)  # be polite even on a no-limit API
```

### Rate Strategy
Open-Meteo has no hard rate limit for non-commercial use, but recommends
reasonable usage. Bootstrap all 34 provinces + 50 featured kabupaten cities.
Total bootstrap: ~84 API calls, run sequentially with 1-second sleep.
Each call returns ~27,000 daily rows (75 years). Total: ~2.3M rows for
featured regions. This is manageable for a single TimescaleDB hypertable.

### Daily Update (Celery Beat)
```
Daily at 06:00 WIB:
  → update_climate_yesterday()      # fetch yesterday's data for all loaded regions
  → rebuild_climate_monthly()       # recompute ClimateMonthly for current month
  → rebuild_climate_annual()        # recompute ClimateAnnual for current year
  → update_enso_if_new_month()      # check NOAA for new ONI value
```

### On-Demand Region Load
When user searches for a city not yet in the DB → trigger a background task
to bootstrap that region, show "Loading climate data for [city]..." state
on frontend while ingestion runs (~5-10 seconds per region).

---

## DRF API Endpoints

```
GET /api/regions/                         → list all pre-loaded regions
GET /api/regions/search/?q={name}         → search by city/kabupaten name
GET /api/regions/{id}/                    → region detail + data availability

GET /api/climate/{region_id}/daily/       → raw daily data (?start=&end=)
GET /api/climate/{region_id}/monthly/     → monthly aggregates (?year_from=&year_to=)
GET /api/climate/{region_id}/annual/      → annual aggregates (full history)
GET /api/climate/{region_id}/fingerprint/ → calendar heatmap data (months × years grid)
GET /api/climate/{region_id}/extremes/    → extreme weather day counts by year
GET /api/climate/{region_id}/season/      → wet season onset/end by year scatter data
GET /api/climate/{region_id}/forecast-context/ → 7-day forecast vs historical range

GET /api/compare/?a={region_id}&b={region_id} → side-by-side comparison data

GET /api/enso/                            → full ENSO event list for overlay
```

---

## Frontend Pages (Next.js App Router)

```
/                          → Home: search bar, featured cities, what is Iklim
/city/[slug]               → City climate page (all 7 features)
/compare                   → City vs City selector
/compare/[a]-vs-[b]        → Side-by-side comparison page
/about                     → Methodology, data sources, Open-Meteo attribution
```

### City Page Layout
```
┌─────────────────────────────────────────────┐
│  IKLIM    [Search any Indonesian city...]   │
├─────────────────────────────────────────────┤
│  📍 Balikpapan, Kalimantan Timur            │
│  Today: 34°C | Forecast context: ↑2° above │
│  historical average for this week           │
├─────────────────────────────────────────────┤
│                                             │
│   CLIMATE FINGERPRINT                       │
│   [toggle: Rainfall | Temp | Hot Days]      │
│   [calendar heatmap, 1950–2024]             │
│                                             │
├────────────────────┬────────────────────────┤
│  EXTREME DAYS      │  SEASON SHIFT           │
│  [line + trend]    │  [scatter plot]         │
│                    │                         │
├────────────────────┴────────────────────────┤
│  ENSO IMPACT                                │
│  [annotated rainfall timeline]              │
└─────────────────────────────────────────────┘
```

---

## Design System — "Musim" (Season)

**Philosophy:** Warm, natural, scientific but accessible. Feels like a calm
National Geographic data visualization — authoritative without being cold.
Color encodes data meaning everywhere (warm colors = heat, blue = rain).

**Color Palette**
```
--earth-cream:     #F5F0E8    (page background — warm off-white)
--surface:         #FFFFFF    (card background)
--surface-muted:   #F0EBE0    (secondary panels)
--border:          #DDD8CF    (dividers)

--rain-blue:       #2B7CB8    (rainfall data, wet season, cool)
--rain-light:      #A8CBEA    (low rainfall values)
--heat-orange:     #E85D2F    (high temperature, hot days)
--heat-light:      #F5B89A    (moderate temperature values)
--drought-amber:   #C49A2B    (dry days, evapotranspiration)
--enso-nino:       #D95F02    (El Niño annotation)
--enso-nina:       #1B7837    (La Niña annotation)

--text-primary:    #1A1208    (dark warm black)
--text-secondary:  #6B6050
--text-muted:      #A89880
```

**Typography**
- Climate numbers/axes: `DM Mono`
- Headlines: `Lora` (serif — gives it editorial, scientific weight)
- Body/UI: `Inter`

**Fingerprint Heatmap Colors:**
- Rainfall: sequential blue (`#EFF3FF` → `#084594`)
- Temperature: sequential orange-red (`#FFF5EB` → `#7F2704`)
- Hot days: sequential red (`#FEE5D9` → `#A50F15`)
- Dry days: sequential amber (`#FFFFD4` → `#993404`)

**Signature Element:** The Climate Fingerprint heatmap. 75 rows × 12 columns,
hoverable cells showing exact month/year and value. This single component is
the entire value proposition rendered visually.

---

## Phase Plan

### Phase 1 — Foundation + 34 Province Capitals (Week 1–2)
- [ ] Django + TimescaleDB, all models + hypertable migrations
- [ ] `climate_bootstrap` management command
- [ ] Bootstrap 34 Indonesian province capital cities (ERA5, 1950–present)
- [ ] Compute ClimateMonthly + ClimateAnnual for all bootstrapped regions
- [ ] Daily update Celery task
- [ ] DRF endpoints: region list/search, monthly, annual, fingerprint

### Phase 2 — City Page + Fingerprint (Week 3–4)
- [ ] Next.js city page scaffold
- [ ] Climate Fingerprint heatmap component (D3.js calendar heatmap)
- [ ] Extreme days chart (Recharts line + trend)
- [ ] Season shift scatter (Recharts scatter)
- [ ] ENSO overlay toggle
- [ ] Forecast context panel (live Open-Meteo forecast API call)

### Phase 3 — Compare + Search (Week 5)
- [ ] City vs City compare endpoint + page
- [ ] City search with on-demand region load
- [ ] Pre-built comparison pages (Balikpapan vs Jakarta, etc.)
- [ ] Homepage with featured cities and search bar

### Phase 4 — Polish + 50 Featured Kabupaten (Week 6)
- [ ] Bootstrap additional 50 featured kabupaten cities
- [ ] About/methodology page with Open-Meteo + ERA5 attribution
- [ ] Mobile responsive polish
- [ ] SEO: per-city metadata and sitemap

### Phase 5 — Future
- [ ] CMIP6 2050 projection view
- [ ] Full kabupaten coverage on-demand (all 514)
- [ ] Bahasa Indonesia i18n
- [ ] Embeddable climate widget

---

## Data Attribution Requirements

Open-Meteo data is licensed **CC BY 4.0**. Display on every page:

*"Climate data: Open-Meteo.com (CC BY 4.0). Based on ERA5 reanalysis from
Copernicus Climate Change Service / ECMWF. Historical data is model-based
reanalysis — not direct station measurements. ENSO data: NOAA Climate
Prediction Center."*

ERA5 citation (in About page):
*"Hersbach, H., et al. (2020). The ERA5 global reanalysis. Quarterly Journal
of the Royal Meteorological Society."*

---

## Out of Scope (v1)
- Non-Indonesian regions
- Real-time weather station data
- Air quality / pollution tracking
- Flood/drought alert system
- User accounts
- CMIP6 projections (Phase 5)
