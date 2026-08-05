#!/usr/bin/env bash
#
# Load ERA5 climate data for not-yet-loaded seeded cities, then regenerate the
# committed static export. Run this on a machine with normal internet — the
# Open-Meteo *archive* host must be reachable (it is blocked in some sandboxed
# CI/agent environments; a normal laptop is fine). This is how the first 70
# cities were loaded.
#
#   bash scripts/add-cities.sh                     # every missing city (resumable)
#   bash scripts/add-cities.sh rantepao waingapu   # only these slugs
#
# climate_bootstrap stops cleanly when Open-Meteo's hourly budget is hit; just
# re-run to resume (already-loaded cities are skipped). Afterward:
#
#   git status data/static_export      # review
#   git add data/static_export && git commit -m "data: add cities" && git push
#
# The DB is brought up on the existing volume and torn down on exit; the volume
# (climatewatch_pgdata) is never deleted.
set -euo pipefail

cd "$(dirname "$0")/.."            # repo root
REPO="$PWD"
DB=cw-add-db
NET=cw-add-net
IMG=climatewatch-backend
VOL=climatewatch_pgdata
COMMON=(--network "$NET" -v "$REPO:/repo" -w /repo/backend
        -e DJANGO_SETTINGS_MODULE=config.settings.local
        -e DATABASE_URL="postgresql://iklim:password@${DB}:5432/iklim"
        -e SECRET_KEY=add-cities -e DEBUG=True -e ALLOWED_HOSTS='*')

cleanup() {
  docker rm -f "$DB" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "▸ backend image (built on first run only)…"
docker image inspect "$IMG" >/dev/null 2>&1 || docker build -t "$IMG" ./backend

echo "▸ starting TimescaleDB on volume ${VOL}…"
docker network create "$NET" >/dev/null 2>&1 || true
docker run -d --name "$DB" --network "$NET" \
  -v "${VOL}:/var/lib/postgresql/data" \
  -e POSTGRES_DB=iklim -e POSTGRES_USER=iklim -e POSTGRES_PASSWORD=password \
  timescale/timescaledb:latest-pg16 >/dev/null
for _ in $(seq 1 30); do
  docker exec "$DB" pg_isready -U iklim >/dev/null 2>&1 && break
  sleep 2
done

echo "▸ bootstrapping from Open-Meteo (this is the step that needs internet)…"
if [ "$#" -gt 0 ]; then
  for slug in "$@"; do
    echo "  · $slug"
    docker run --rm "${COMMON[@]}" "$IMG" \
      python manage.py climate_bootstrap --slug "$slug"
  done
else
  # Loads every city not fully loaded; stops cleanly on rate-limit — re-run to resume.
  docker run --rm "${COMMON[@]}" "$IMG" \
    python manage.py climate_bootstrap --skip-existing
fi

echo "▸ regenerating static export…"
docker run --rm "${COMMON[@]}" "$IMG" \
  python manage.py export_static --out /repo/data/static_export

echo
echo "✓ done. Review:  git status data/static_export"
echo "  deploy:  git add data/static_export && git commit -m 'data: add cities' && git push"
