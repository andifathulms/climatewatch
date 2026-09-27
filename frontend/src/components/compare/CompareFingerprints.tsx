"use client";

import { L } from "@/lib/i18n";
import { useLang } from "@/lib/use-lang";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ClimateFingerprint, {
  FingerprintLegend,
  AnomalyLegend,
  ZOOM_WINDOW,
  fingerprintYears,
  UNIT,
  type FingerprintZoom,
} from "@/components/fingerprint/ClimateFingerprint";
import {
  parseLayersParam,
  serializeLayersParam,
  toggleLayer,
  type FingerprintLayer,
} from "@/components/fingerprint/layers";
import {
  BASELINE_FROM,
  BASELINE_TO,
  monthlyClimatology,
  anomalyDomain,
} from "@/components/fingerprint/baseline";
import SegmentedControl from "@/components/ui/SegmentedControl";
import type {
  ENSOEvent,
  ExtremesResponse,
  FingerprintResponse,
  FingerprintVariable,
  Region,
  SeasonResponse,
} from "@/lib/types";

const VARIABLES: { key: FingerprintVariable; label: string; id: string }[] = [
  { key: "precipitation", label: "Rainfall", id: "Hujan" },
  { key: "temp_max", label: "Max temp", id: "Suhu maks" },
  { key: "feels_like", label: "Feels like", id: "Terasa" },
  { key: "hot_days_local", label: "Hot days", id: "Hari panas" },
  { key: "dry_days", label: "Dry days", id: "Hari kering" },
];

const ZOOMS: { key: FingerprintZoom; label: string; id: string }[] = [
  { key: "record", label: "Whole record", id: "Semua tahun" },
  { key: "decade", label: "Decade", id: "Dekade" },
  { key: "year", label: "Year", id: "Tahun" },
];

const LAYER_TOGGLES: { key: FingerprintLayer; label: string; id: string }[] = [
  { key: "baseline", label: "vs 1951–1980", id: "vs 1951–1980" },
  { key: "season", label: "Wet season", id: "Musim hujan" },
  { key: "enso", label: "El Niño / La Niña", id: "El Niño / La Niña" },
  { key: "extremes", label: "Extreme years", id: "Tahun ekstrem" },
];

interface CitySlice {
  fingerprint: FingerprintResponse | null;
  season: SeasonResponse | null;
  extremes: ExtremesResponse | null;
}

/**
 * Two fingerprints, one set of controls — DESIGN.md §9: "Layers make this
 * page stronger for free: two fingerprints, same variable, same layers, same
 * zoom, side by side. Two anomaly grids next to each other say more about
 * two cities than any pair of bar charts."
 *
 * `--series-1`/`--series-2` entity colouring (the compare page's rule for
 * everything else — panel rails, line charts) is deliberately NOT applied to
 * either grid here. A fingerprint cell always carries the variable's own
 * ramp (or the Baseline layer's diverging one) — that encoding is fixed by
 * CLAUDE.md/DESIGN.md regardless of which city or "slot" is looking at it,
 * so entity colour would either fight the variable colour or mean nothing.
 * City identity here comes from the label above each grid, not its cells.
 */
export default function CompareFingerprints({
  regionA,
  regionB,
}: {
  regionA: Region;
  regionB: Region;
}) {
  const lang = useLang();
  const [variable, setVariable] = useState<FingerprintVariable>("precipitation");
  const [zoom, setZoom] = useState<FingerprintZoom>("record");
  const [windowStart, setWindowStart] = useState(0);
  const [layers, setLayers] = useState<Set<FingerprintLayer>>(new Set());
  const [ensoEvents, setEnsoEvents] = useState<ENSOEvent[]>([]);
  const [a, setA] = useState<CitySlice>({ fingerprint: null, season: null, extremes: null });
  const [b, setB] = useState<CitySlice>({ fingerprint: null, season: null, extremes: null });

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("layers");
    const parsed = parseLayersParam(raw);
    if (parsed.size > 0) setLayers(parsed);
    api.ensoEvents().then(setEnsoEvents).catch(() => {});
  }, []);

  // Season/extremes don't depend on `variable`, so they're fetched once per
  // city rather than refetched on every variable switch.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.season(regionA).catch(() => null),
      api.extremes(regionA).catch(() => null),
    ]).then(([season, extremes]) => {
      if (!cancelled) setA((s) => ({ ...s, season, extremes }));
    });
    return () => {
      cancelled = true;
    };
  }, [regionA.id]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.season(regionB).catch(() => null),
      api.extremes(regionB).catch(() => null),
    ]).then(([season, extremes]) => {
      if (!cancelled) setB((s) => ({ ...s, season, extremes }));
    });
    return () => {
      cancelled = true;
    };
  }, [regionB.id]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.fingerprint(regionA, variable).catch(() => null),
      api.fingerprint(regionB, variable).catch(() => null),
    ]).then(([fpA, fpB]) => {
      if (cancelled) return;
      setA((s) => ({ ...s, fingerprint: fpA }));
      setB((s) => ({ ...s, fingerprint: fpB }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionA.id, regionB.id, variable]);

  function handleToggleLayer(key: FingerprintLayer) {
    setLayers((prev) => {
      const next = toggleLayer(prev, key);
      if (next === prev) return prev;
      const url = new URL(window.location.href);
      const encoded = serializeLayersParam(next);
      if (encoded) url.searchParams.set("layers", encoded);
      else url.searchParams.delete("layers");
      window.history.replaceState(null, "", url);
      return next;
    });
  }

  const baselineActive = layers.has("baseline");
  const windowSize = ZOOM_WINDOW[zoom];

  function windowFor(data: FingerprintResponse | null) {
    if (!data) return 0;
    const years = fingerprintYears(data);
    const maxStart = Math.max(0, years.length - (windowSize ?? years.length));
    return Math.min(windowStart, maxStart);
  }

  function stepWindow(direction: -1 | 1) {
    if (windowSize === null) return;
    setWindowStart((s) => Math.max(0, s + direction * windowSize));
  }

  // Same computation FingerprintPanel does for its own legend — each city's
  // anomaly domain is its own, even though both grids share one baseline
  // window (BASELINE_FROM/BASELINE_TO), since the departures themselves
  // depend on that city's own climatology.
  function anomalyMaxFor(data: FingerprintResponse): number | null {
    const climatology = monthlyClimatology(data.data, BASELINE_FROM, BASELINE_TO);
    return anomalyDomain(data.data, climatology);
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border p-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="eyebrow">
            <L en="Side by side" id="Berdampingan" />
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold">
            <L en="Climate Fingerprint" id="Sidik Iklim" />
          </h2>
          <p className="mt-1.5 max-w-prose text-sm text-text-secondary">
            <L
              en="Same variable, same layers, same zoom for both cities. One row of controls drives both grids."
              id="Variabel, lapisan dan zoom yang sama untuk kedua kota. Satu baris kontrol menggerakkan kedua grid."
            />
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <SegmentedControl
            name="compare-fingerprint-variable"
            label={lang === "en" ? "Climate variable" : "Variabel iklim"}
            options={VARIABLES.map((v) => ({ value: v.key, label: lang === "en" ? v.label : v.id }))}
            value={variable}
            onChange={setVariable}
          />

          <div className="flex items-center gap-3">
            <SegmentedControl
              name="compare-fingerprint-zoom"
              label="Zoom"
              variant="ghost"
              options={ZOOMS.map((z) => ({ value: z.key, label: lang === "en" ? z.label : z.id }))}
              value={zoom}
              onChange={(next) => {
                setZoom(next);
                setWindowStart(0);
              }}
            />
            {windowSize !== null && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => stepWindow(1)}
                  aria-label={lang === "en" ? "Earlier" : "Lebih awal"}
                  className="rounded-full border border-border p-1 text-text-secondary transition-colors hover:text-text-primary"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => stepWindow(-1)}
                  disabled={windowStart <= 0}
                  aria-label={lang === "en" ? "Later" : "Lebih baru"}
                  className="rounded-full border border-border p-1 text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30"
                >
                  →
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {LAYER_TOGGLES.map((l) => {
              const active = layers.has(l.key);
              return (
                <button
                  key={l.key}
                  type="button"
                  className="chip"
                  aria-pressed={active}
                  onClick={() => handleToggleLayer(l.key)}
                >
                  {lang === "en" ? l.label : l.id}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        {[
          { region: regionA, slice: a, color: "var(--series-1)" as const },
          { region: regionB, slice: b, color: "var(--series-2)" as const },
        ].map(({ region, slice, color }) => (
          <div key={region.id} className="min-w-0">
            {/* City identity lives here, in the label — never in the grid's
                own cell colours, which always carry the variable/Baseline
                ramp regardless of which side of the comparison this is. */}
            <p className="mb-3 flex items-center gap-2 text-sm font-medium">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: color }}
              />
              {region.name}
            </p>
            {slice.fingerprint ? (
              <>
                <ClimateFingerprint
                  data={slice.fingerprint}
                  ensoEvents={ensoEvents}
                  zoom={zoom}
                  windowStart={windowFor(slice.fingerprint)}
                  layers={layers}
                  baselineFrom={BASELINE_FROM}
                  baselineTo={BASELINE_TO}
                  season={slice.season}
                  extremes={slice.extremes}
                />
                <div className="mt-4">
                  {baselineActive ? (
                    <AnomalyLegend
                      domainMax={anomalyMaxFor(slice.fingerprint)}
                      unit={UNIT[slice.fingerprint.variable]}
                      from={BASELINE_FROM}
                      to={BASELINE_TO}
                    />
                  ) : (
                    <FingerprintLegend
                      variable={slice.fingerprint.variable}
                      stats={slice.fingerprint.stats}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-text-muted">
                Loading…
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
