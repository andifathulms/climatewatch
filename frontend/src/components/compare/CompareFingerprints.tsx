"use client";

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

const VARIABLES: { key: FingerprintVariable; label: string }[] = [
  { key: "precipitation", label: "Rainfall" },
  { key: "temp_max", label: "Temperature" },
  { key: "hot_days_local", label: "Hot Days" },
  { key: "dry_days", label: "Dry Days" },
];

const ZOOMS: { key: FingerprintZoom; label: string }[] = [
  { key: "record", label: "Whole record" },
  { key: "decade", label: "Decade" },
  { key: "year", label: "Year" },
];

const LAYER_TOGGLES: { key: FingerprintLayer; label: string }[] = [
  { key: "baseline", label: "Baseline" },
  { key: "season", label: "Season" },
  { key: "enso", label: "ENSO" },
  { key: "extremes", label: "Extremes" },
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
          <p className="eyebrow">Side by side</p>
          <h2 className="mt-2 font-display text-2xl font-semibold">
            Climate Fingerprint
          </h2>
          <p className="mt-1.5 max-w-prose text-sm text-text-secondary">
            Same variable, same layers, same zoom, both cities — one control
            row drives both grids below.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <SegmentedControl
            name="compare-fingerprint-variable"
            label="Climate variable"
            options={VARIABLES.map((v) => ({ value: v.key, label: v.label }))}
            value={variable}
            onChange={setVariable}
          />

          <div className="flex items-center gap-3">
            <SegmentedControl
              name="compare-fingerprint-zoom"
              label="Zoom"
              variant="ghost"
              options={ZOOMS.map((z) => ({ value: z.key, label: z.label }))}
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
                  aria-label="Earlier"
                  className="rounded-full border border-border p-1 text-text-secondary transition-colors hover:text-text-primary"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => stepWindow(-1)}
                  disabled={windowStart <= 0}
                  aria-label="Later"
                  className="rounded-full border border-border p-1 text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30"
                >
                  →
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {LAYER_TOGGLES.map((l) => {
              const active = layers.has(l.key);
              return (
                <button
                  key={l.key}
                  type="button"
                  role="switch"
                  aria-checked={active}
                  onClick={() => handleToggleLayer(l.key)}
                  className="group flex items-center gap-2 text-xs text-text-secondary transition-colors hover:text-text-primary"
                >
                  <span
                    aria-hidden
                    className={`relative h-4 w-7 rounded-full transition-colors duration-200 ${
                      active ? "bg-heat-orange" : "bg-border-strong"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform duration-200 ${
                        active ? "translate-x-3.5" : "translate-x-0.5"
                      }`}
                    />
                  </span>
                  {l.label}
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
