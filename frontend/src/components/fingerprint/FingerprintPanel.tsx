"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type {
  ENSOEvent,
  FingerprintResponse,
  FingerprintVariable,
  Region,
} from "@/lib/types";
import ClimateFingerprint, {
  FingerprintLegend,
  AnomalyLegend,
  ZOOM_WINDOW,
  fingerprintYears,
  UNIT,
  type FingerprintZoom,
} from "./ClimateFingerprint";
import {
  parseLayersParam,
  serializeLayersParam,
  toggleLayer,
  type FingerprintLayer,
} from "./layers";
import {
  BASELINE_FROM,
  BASELINE_TO,
  monthlyClimatology,
  anomalyDomain,
} from "./baseline";
import SegmentedControl from "@/components/ui/SegmentedControl";
import LiveAnnouncement from "@/components/ui/LiveAnnouncement";

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

const BLURB: Record<FingerprintVariable, string> = {
  precipitation: "Total monthly rainfall",
  temp_max: "Average monthly maximum temperature",
  hot_days: "Days above 35°C per month",
  hot_days_local: "Days hotter than 95% of this city's 1951–1980 days",
  dry_days: "Days below 1mm rain per month",
};

/**
 * How a year's 12 cells roll up. Rainfall and day-counts are additive; a
 * temperature is not — summing 12 monthly means yields a meaningless ~340°C,
 * so temp_max averages instead.
 */
const ROLLUP: Record<
  FingerprintVariable,
  { kind: "sum" | "mean"; label: string; unit: string }
> = {
  precipitation: { kind: "sum", label: "Annual total", unit: " mm" },
  temp_max: { kind: "mean", label: "Annual average", unit: "°C" },
  hot_days: { kind: "sum", label: "Hot days this year", unit: "" },
  hot_days_local: { kind: "sum", label: "Hot days this year", unit: "" },
  dry_days: { kind: "sum", label: "Dry days this year", unit: "" },
};

export default function FingerprintPanel({
  region,
  initial,
  ensoEvents,
  baselineFrom = BASELINE_FROM,
  baselineTo = BASELINE_TO,
}: {
  region: Pick<Region, "id" | "slug">;
  initial: FingerprintResponse;
  ensoEvents: ENSOEvent[];
  /** The Baseline layer's climatology window. Defaults to the stated
   *  1951-1980 default (DESIGN.md §5.4); `FingerprintRecordSection` passes
   *  the reader's PersonalBaseline choice once one is picked, per "wire them
   *  together." */
  baselineFrom?: number;
  baselineTo?: number;
}) {
  const [variable, setVariable] = useState<FingerprintVariable>("precipitation");
  const [data, setData] = useState<FingerprintResponse>(initial);
  const [showEnso, setShowEnso] = useState(false);
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState<FingerprintZoom>("record");
  // Index into the newest-first year list where the "decade"/"year" window
  // starts. Meaningless at "record" zoom, where every year renders.
  const [windowStart, setWindowStart] = useState(0);
  // Silent until the reader picks a different variable. A live region that
  // ships with content in the prerendered HTML risks being read out on load,
  // which is not what "the result changed" means.
  const [touched, setTouched] = useState(false);

  // DESIGN.md §5.6 / §10 step 3: layer state lives in the URL so a finding
  // is shareable. No layer has a visual yet (§10 steps 4-7) — this hydrates
  // and stays in sync regardless, so the URL contract is already correct
  // once the first real layer lands. Server HTML always renders zero layers
  // active, the same deferred-hydration shape `?since=`/`?t=` use elsewhere
  // on this page, so a static export never ships a client-only-looking gap.
  const [layers, setLayers] = useState<Set<FingerprintLayer>>(new Set());

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("layers");
    const parsed = parseLayersParam(raw);
    if (parsed.size > 0) setLayers(parsed);
  }, []);

  // Not called from anywhere yet — the first layer's toggle button (DESIGN.md
  // §10 step 4) is what wires this to the UI. Kept here rather than added
  // alongside that button so the cap/URL-sync behaviour is exercised by
  // steps 4-7 as pure addition, not written and debugged four times.
  function handleToggleLayer(key: FingerprintLayer) {
    setLayers((prev) => {
      const next = toggleLayer(prev, key);
      if (next === prev) return prev; // refused: at the cap, nothing to sync
      const url = new URL(window.location.href);
      const encoded = serializeLayersParam(next);
      if (encoded) url.searchParams.set("layers", encoded);
      else url.searchParams.delete("layers");
      window.history.replaceState(null, "", url);
      return next;
    });
  }

  // For the legend swap below only — ClimateFingerprint computes this same
  // thing again internally for the cell fills themselves (see its own
  // `climatology`/`anomalyMax`). Recomputing here from the same `data` state
  // rather than plumbing a callback up keeps the two components' props
  // one-directional (data down), at the cost of the pure-function call
  // running twice; both are O(cells), not worth a ref/callback to avoid.
  const baselineActive = layers.has("baseline");
  const climatology = useMemo(
    () =>
      baselineActive
        ? monthlyClimatology(data.data, baselineFrom, baselineTo)
        : null,
    [data, baselineActive, baselineFrom, baselineTo],
  );
  const anomalyMax = useMemo(
    () => (climatology ? anomalyDomain(data.data, climatology) : null),
    [data, climatology],
  );

  useEffect(() => {
    if (variable === initial.variable && data.variable === variable) return;
    let cancelled = false;
    setLoading(true);
    api
      .fingerprint(region, variable)
      .then((d) => !cancelled && setData(d))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variable, region.id, region.slug]);

  const years = useMemo(() => fingerprintYears(data), [data]);
  const windowSize = ZOOM_WINDOW[zoom]; // null at "record" — every year renders
  const maxWindowStart = Math.max(0, years.length - (windowSize ?? years.length));
  const clampedWindowStart = Math.min(windowStart, maxWindowStart);
  const windowLabel =
    windowSize === null
      ? null
      : windowSize === 1
        ? `${years[clampedWindowStart]}`
        : `${years[Math.min(clampedWindowStart + windowSize - 1, years.length - 1)]}–${years[clampedWindowStart]}`;

  function stepWindow(direction: -1 | 1) {
    if (windowSize === null) return;
    setWindowStart((s) =>
      Math.max(0, Math.min(maxWindowStart, s + direction * windowSize)),
    );
  }

  const rollup = ROLLUP[data.variable];
  const yearCells =
    hoverYear !== null
      ? data.data.filter((d) => d.year === hoverYear && d.value !== null)
      : [];
  const yearValue =
    yearCells.length > 0
      ? rollup.kind === "sum"
        ? yearCells.reduce((s, d) => s + (d.value ?? 0), 0)
        : yearCells.reduce((s, d) => s + (d.value ?? 0), 0) / yearCells.length
      : null;

  return (
    <section className="card overflow-hidden">
      {/* ── Panel header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-border p-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="eyebrow">The signature view</p>
          <h3 className="mt-2 font-display text-2xl font-semibold">
            Climate Fingerprint
          </h3>
          <p className="mt-1.5 text-sm text-text-secondary">
            {BLURB[data.variable]}
            {/* Name the actual threshold. A relative rule the reader cannot
                see the value of is not a citable rule. */}
            {data.variable === "hot_days_local" &&
              data.hot_day_threshold_c !== null && (
                <>
                  {" — above "}
                  <span className="font-numeric text-text-primary">
                    {data.hot_day_threshold_c.toFixed(1)}°C
                  </span>
                </>
              )}{" "}
            ·{" "}
            <span className="font-numeric">
              {data.year_from}–{data.year_to}
            </span>
          </p>

          {/* Vocabulary where it is used, not on a page the reader has to go
              find. Both terms are load-bearing: every cell is an aggregate,
              and the hot-day rule is a percentile. */}
          <p className="mt-3 max-w-prose text-2xs leading-relaxed text-text-muted">
            One cell is one month — an average (or a count) over its 28–31
            days, not a single reading.
            {data.variable === "hot_days_local" &&
              data.hot_day_threshold_c !== null && (
                <>
                  {" "}
                  &ldquo;Hotter than 95%&rdquo; means: line up every daily high
                  from 1951–1980 coldest to hottest, and the value 95% of the
                  way along is{" "}
                  <span className="font-numeric text-text-secondary">
                    {data.hot_day_threshold_c.toFixed(1)}°C
                  </span>
                  . Days above it were roughly the hottest 1 in 20 back then.
                </>
              )}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          {/* Segmented control */}
          <SegmentedControl
            name="fingerprint-variable"
            label="Climate variable"
            options={VARIABLES.map((v) => ({ value: v.key, label: v.label }))}
            value={variable}
            onChange={(next) => {
              setTouched(true);
              setVariable(next);
            }}
          />

          {/* Zoom. "Whole record" is the default and the product's central
              claim — DESIGN.md §5.1 — so it always resets the window rather
              than leaving it mid-decade when a reader zooms back out. */}
          <div className="flex items-center gap-3">
            <SegmentedControl
              name="fingerprint-zoom"
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
                  disabled={clampedWindowStart >= maxWindowStart}
                  aria-label="Earlier"
                  className="rounded-full border border-border p-1 text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30 disabled:hover:text-text-secondary"
                >
                  ←
                </button>
                <span className="font-numeric min-w-[5.5rem] text-center text-xs text-text-secondary">
                  {windowLabel}
                </span>
                <button
                  type="button"
                  onClick={() => stepWindow(-1)}
                  disabled={clampedWindowStart <= 0}
                  aria-label="Later"
                  className="rounded-full border border-border p-1 text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30 disabled:hover:text-text-secondary"
                >
                  →
                </button>
              </div>
            )}
          </div>

          {/* Layers. Only Baseline exists yet (DESIGN.md §10 step 4) — Season/
              ENSO overlay/Extremes are still standalone (the switch below,
              ExtremeDaysChart, etc.) until steps 5-7 fold them in here too. */}
          <div className="flex flex-col items-start gap-1.5 lg:items-end">
            <button
              type="button"
              role="switch"
              aria-checked={baselineActive}
              onClick={() => handleToggleLayer("baseline")}
              className="group flex items-center gap-2.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
            >
              <span
                aria-hidden
                className={`relative h-4 w-7 rounded-full transition-colors duration-200 ${
                  baselineActive ? "bg-heat-orange" : "bg-border-strong"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform duration-200 ${
                    baselineActive ? "translate-x-3.5" : "translate-x-0.5"
                  }`}
                />
              </span>
              Baseline layer
            </button>
            {/* DESIGN.md §5.4: "the baseline window is ... stated in the UI,
                not buried." */}
            {baselineActive && (
              <span className="font-numeric text-2xs text-text-muted">
                vs {baselineFrom}–{baselineTo} average
              </span>
            )}
          </div>

          {/* ENSO switch */}
          <button
            type="button"
            role="switch"
            aria-checked={showEnso}
            onClick={() => setShowEnso((v) => !v)}
            className="group flex items-center gap-2.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
          >
            <span
              aria-hidden
              className={`relative h-4 w-7 rounded-full transition-colors duration-200 ${
                showEnso ? "bg-rain-blue" : "bg-border-strong"
              }`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform duration-200 ${
                  showEnso ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </span>
            ENSO overlay
          </button>
        </div>
      </div>

      {/* ── Grid + sidebar ────────────────────────────────────────────── */}
      {/* Grid first in the DOM, sidebar second — matching the reading order,
          which is what a reversed row previously broke. The <aside> was the
          first DOM child of a flex-row-reverse container, so it rendered on
          the right but was announced *before* the figure it describes: a
          screen reader met an empty "—" readout, then the grid. (WCAG 1.3.2)
          The old comment claimed the opposite of what the code did.

          The sidebar sticks because the grid is ~1,900px tall for a 77-year
          record, so a static readout would scroll out of sight before you
          finish reading the rows it describes. Plain flex-row with the grid
          first gives the same visual placement the reversed row did. */}
      {/* Announced only once the swap has landed — saying "showing rainfall"
          while the old grid is still on screen would be a lie. */}
      <LiveAnnouncement
        message={
          touched && !loading
            ? `Showing ${BLURB[data.variable].toLowerCase()}.`
            : ""
        }
      />

      <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start">
        <div
          className="min-w-0 flex-1 transition-opacity duration-200"
          style={{ opacity: loading ? 0.4 : 1 }}
          aria-busy={loading}
        >
          <ClimateFingerprint
            data={data}
            ensoEvents={ensoEvents}
            showEnso={showEnso}
            zoom={zoom}
            windowStart={clampedWindowStart}
            layers={layers}
            baselineFrom={baselineFrom}
            baselineTo={baselineTo}
            onHoverYear={setHoverYear}
          />
        </div>

        <aside className="flex w-full min-w-0 flex-col gap-5 lg:sticky lg:top-20 lg:w-[15rem] lg:shrink-0">
          {/* Hovered-year readout. Reserves its own height so the panel does
              not reflow as the pointer moves across the grid. */}
          <div className="min-h-[7.5rem] rounded-lg border border-border bg-surface-inset p-4">
            {hoverYear !== null ? (
              <>
                <div className="font-numeric text-3xl font-medium leading-none text-text-primary">
                  {hoverYear}
                </div>
                <div className="mt-3 text-xs text-text-muted">
                  {rollup.label}
                </div>
                <div className="font-numeric mt-0.5 text-lg text-text-primary">
                  {yearValue !== null
                    ? `${yearValue.toFixed(1)}${rollup.unit}`
                    : "—"}
                </div>
              </>
            ) : (
              <p className="text-xs leading-relaxed text-text-muted">
                Hover a cell for the month, or a row for the whole year.
                <br />
                <span className="mt-2 inline-block opacity-70">
                  Newest year sits at the top.
                </span>
              </p>
            )}
          </div>

          {/* DESIGN.md §5.4: "When this layer is on, the sequential legend is
              replaced by the diverging one with its zero marked. Two ramps
              must never be on screen at once." */}
          {baselineActive ? (
            <AnomalyLegend
              domainMax={anomalyMax}
              unit={UNIT[data.variable]}
              from={baselineFrom}
              to={baselineTo}
            />
          ) : (
            <FingerprintLegend variable={data.variable} stats={data.stats} />
          )}

          {showEnso && (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="eyebrow">ENSO</p>
              <div className="flex items-center gap-2.5 text-xs text-text-secondary">
                <span
                  aria-hidden
                  className="inline-block h-3.5 w-1 rounded-full"
                  style={{ background: "var(--enso-nino)" }}
                />
                El Niño — tends drier
              </div>
              <div className="flex items-center gap-2.5 text-xs text-text-secondary">
                <span
                  aria-hidden
                  className="inline-block h-3.5 w-1 rounded-full"
                  style={{ background: "var(--enso-nina)" }}
                />
                La Niña — tends wetter
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
