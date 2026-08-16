"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ENSOEvent,
  FingerprintResponse,
  FingerprintStats,
  FingerprintVariable,
} from "@/lib/types";
import { MONTHS } from "@/lib/format";
import { RAMPS, buildColorScale, buildAnomalyColorScale, ANOMALY_RAMP } from "./color-scale";
import {
  BASELINE_FROM,
  BASELINE_TO,
  monthlyClimatology,
  anomalyFor,
  anomalyDomain,
} from "./baseline";
import { LAYER_KEYS, LAYER_TABLE_NOTE, type FingerprintLayer } from "./layers";

const CELL_H_MAX = 22; // row height ceiling — legible even at a handful of rows
const CELL_H_MIN = 4; // row height floor — a coloured hairline, still a mark
const CELL_W_MIN = 26; // narrowest a month column may get before we scroll
const CELL_W_MAX = 64;
const PAD = 3; // >=2px surface gap between fills, per the dataviz mark spec
const LEFT = 54; // year labels
const TOP = 24; // month labels
const BORDER = 3; // ENSO left border width
const GUTTER = 6; // gap between the ENSO border and the first cell

export type FingerprintZoom = "record" | "decade" | "year";

/** Rows visible at each zoom stop. `null` = the whole record, unwindowed. */
export const ZOOM_WINDOW: Record<FingerprintZoom, number | null> = {
  record: null,
  decade: 10,
  year: 1,
};

/** Target height (px) the whole-record view is fit into. DESIGN.md §5.1:
 *  "At 75 years in a ~700px viewport this lands near 8–9px." Clamped so it
 *  neither collapses on a short window nor sprawls on a tall one. */
function recordHeightBudget(viewportH: number): number {
  return Math.min(720, Math.max(320, viewportH * 0.62));
}

/** Years present in a fingerprint response, newest first. Shared by
 *  `ClimateFingerprint` and its panel so the zoom window's bounds are
 *  computed from the exact same list the grid renders. */
export function fingerprintYears(data: FingerprintResponse): number[] {
  const set = new Set(data.data.map((d) => d.year));
  return Array.from(set).sort((a, b) => b - a);
}

// Stable reference so an omitted `layers` prop doesn't invalidate memos on
// every render the way a fresh `new Set()` default literal would.
const EMPTY_LAYERS: Set<FingerprintLayer> = new Set();

export const UNIT: Record<FingerprintVariable, string> = {
  precipitation: " mm",
  temp_max: "°C",
  hot_days: " days",
  hot_days_local: " days",
  dry_days: " days",
};

/** Reduce ENSO monthly events to a dominant phase per year. */
function ensoByYear(events: ENSOEvent[]): Map<number, ENSOEvent["phase"]> {
  const counts = new Map<number, { EL_NINO: number; LA_NINA: number }>();
  for (const e of events) {
    if (e.phase === "NEUTRAL") continue;
    const c = counts.get(e.year) ?? { EL_NINO: 0, LA_NINA: 0 };
    c[e.phase] += 1;
    counts.set(e.year, c);
  }
  const out = new Map<number, ENSOEvent["phase"]>();
  for (const [year, c] of counts) {
    out.set(year, c.EL_NINO >= c.LA_NINA ? "EL_NINO" : "LA_NINA");
  }
  return out;
}

interface Tooltip {
  x: number;
  y: number;
  year: number;
  month: number;
  value: number | null;
  enso?: ENSOEvent["phase"];
}

/** The sequential legend. A magnitude encoding is unreadable without one. */
export function FingerprintLegend({
  variable,
  stats,
}: {
  variable: FingerprintVariable;
  stats: FingerprintStats;
}) {
  const ramp = RAMPS[variable];
  const gradient = `linear-gradient(to right, ${ramp.join(", ")})`;
  const scale = buildColorScale(variable, stats);
  const [lo, hi] = scale.domain() as [number, number];

  // The scale tops out at the 90th percentile, not the maximum, so roughly one
  // month in ten sits at or past the bright end and they are all drawn the same
  // colour. Printing "0 … 385mm" with no qualifier reads as "385 is the
  // wettest month" — it is not, and the months a reader most wants to find are
  // exactly the ones this flattens. Say so where the scale is shown.
  const cappedTop = stats.max !== null && hi < stats.max;
  // temp_max runs p10..p90, so its scale clips at the cold end too — saying
  // only "stops at the 90th" would be half the truth for that variable.
  const cappedBottom = stats.min !== null && lo > stats.min;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <div className="flex items-center gap-2.5">
          <span className="font-numeric text-2xs text-text-muted">
            {lo.toFixed(0)}
          </span>
          <span
            className="h-2 w-28 rounded-full ring-1 ring-inset ring-border"
            style={{ background: gradient }}
            role="img"
            aria-label={`Color scale from ${lo.toFixed(0)} to ${hi.toFixed(0)}${UNIT[variable]}`}
          />
          <span className="font-numeric text-2xs text-text-muted">
            {hi.toFixed(0)}
            {UNIT[variable]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-[2px] ring-1 ring-inset ring-border-strong"
            style={{ background: "var(--null-cell)" }}
          />
          <span className="text-2xs text-text-muted">no data</span>
        </div>
      </div>

      {(cappedTop || cappedBottom) && (
        <p className="max-w-prose text-2xs leading-relaxed text-text-muted">
          The scale stops at the 90th percentile —{" "}
          <span className="font-numeric">
            {hi.toFixed(0)}
            {UNIT[variable]}
          </span>
          , the value nine months in ten fall below — so every month above it is
          drawn the same brightest colour. The record maximum is actually{" "}
          <span className="font-numeric text-text-secondary">
            {stats.max?.toFixed(0)}
            {UNIT[variable]}
          </span>
          .
          {cappedBottom && (
            <>
              {" "}
              The dark end is clipped the same way at the 10th percentile (
              <span className="font-numeric">
                {lo.toFixed(0)}
                {UNIT[variable]}
              </span>
              ; lowest on record{" "}
              <span className="font-numeric text-text-secondary">
                {stats.min?.toFixed(0)}
                {UNIT[variable]}
              </span>
              ).
            </>
          )}{" "}
          The extremes are flattened on purpose — it keeps the middle 80% legible
          — but it means this grid understates the outliers.
        </p>
      )}
    </div>
  );
}

/** The diverging legend for the Baseline layer (DESIGN.md §3.2/§5.4). Unlike
 *  `FingerprintLegend`, the midpoint carries meaning here, so it gets its own
 *  marked tick rather than reusing the two-ends layout. Never rendered
 *  alongside `FingerprintLegend` — DESIGN.md §5.4: "Two ramps must never be
 *  on screen at once." */
export function AnomalyLegend({
  domainMax,
  unit,
  from,
  to,
}: {
  /** `null` when no departure could be computed at all (e.g. the baseline
   *  window has no overlap with this variable's coverage) — the legend
   *  states that rather than rendering a scale with nothing behind it. */
  domainMax: number | null;
  unit: string;
  from: number;
  to: number;
}) {
  const gradient = `linear-gradient(to right, ${ANOMALY_RAMP.join(", ")})`;

  if (domainMax === null) {
    return (
      <p className="max-w-prose text-2xs leading-relaxed text-text-muted">
        No {from}–{to} reference average is available to compare against for
        this variable.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <div className="relative flex items-center gap-2.5">
          <span className="font-numeric text-2xs text-text-muted">
            −{domainMax.toFixed(1)}
            {unit}
          </span>
          <span className="relative h-2 w-28">
            <span
              className="block h-full w-full rounded-full ring-1 ring-inset ring-border"
              style={{ background: gradient }}
              role="img"
              aria-label={`Diverging color scale from ${domainMax.toFixed(1)}${unit} below the ${from}–${to} average to ${domainMax.toFixed(1)}${unit} above it, midpoint at zero departure`}
            />
            {/* The zero tick — the one thing this legend has that the
                sequential one does not need. */}
            <span
              aria-hidden
              className="absolute -top-1 left-1/2 h-4 w-px -translate-x-1/2 bg-text-primary"
            />
          </span>
          <span className="font-numeric text-2xs text-text-muted">
            +{domainMax.toFixed(1)}
            {unit}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-[2px] ring-1 ring-inset ring-border-strong"
            style={{ background: "var(--anomaly-zero)" }}
          />
          <span className="text-2xs text-text-muted">
            {from}–{to} average
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-[2px] ring-1 ring-inset ring-border-strong"
            style={{ background: "var(--null-cell)" }}
          />
          <span className="text-2xs text-text-muted">no data</span>
        </div>
      </div>

      <p className="max-w-prose text-2xs leading-relaxed text-text-muted">
        Departure from that calendar month&rsquo;s {from}–{to} average, not
        the raw value — a cell can be the same colour in two different cities
        for entirely different absolute numbers.
      </p>
    </div>
  );
}

export default function ClimateFingerprint({
  data,
  ensoEvents,
  showEnso,
  zoom = "record",
  windowStart = 0,
  layers = EMPTY_LAYERS,
  baselineFrom = BASELINE_FROM,
  baselineTo = BASELINE_TO,
  onHoverYear,
}: {
  data: FingerprintResponse;
  /** Passed in rather than read off `data`: it is one global array, so it is
   *  fetched once per page instead of being embedded in all five fingerprint
   *  variants of all 90 cities. */
  ensoEvents: ENSOEvent[];
  showEnso: boolean;
  /** "record" fits every year on screen at once (default). "decade"/"year"
   *  trade coverage for row height, per DESIGN.md §5.1 — never the data or
   *  the active layers, only how many rows are drawn and how tall each is. */
  zoom?: FingerprintZoom;
  /** Index into the newest-first year list where a "decade"/"year" window
   *  starts. Ignored at "record" zoom, where every year renders. */
  windowStart?: number;
  /** Active layers (DESIGN.md §5.6/§10 step 3). Only "baseline" (§10 step 4)
   *  draws anything yet; the rest are read for their sr-only table notes. */
  layers?: Set<FingerprintLayer>;
  /** The Baseline layer's climatology window — DESIGN.md §5.4: "the baseline
   *  window is ... stated in the UI, not buried." Defaults to the stated
   *  1951-1980 default; `FingerprintPanel` passes the reader's chosen year
   *  (via PersonalBaseline) once one is picked. */
  baselineFrom?: number;
  baselineTo?: number;
  onHoverYear?: (year: number | null) => void;
}) {
  const [tip, setTip] = useState<Tooltip | null>(null);
  const [hoverRow, setHoverRow] = useState<number | null>(null);

  // Month columns stretch to fill whatever width the panel gives us. At the
  // fixed 22px the grid was a narrow ribbon stranded beside a dead half-panel,
  // and the month labels collided into "JANFEBMAR…". Cells are deliberately
  // non-square: a month is wider than it is tall.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setAvail(entry.contentRect.width),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Row height at "record" zoom depends on the viewport, not the panel width
  // ResizeObserver above already tracks — a 77-row grid has to shrink against
  // vertical space, which scales with the window, not with how wide its card
  // happens to be. "decade"/"year" zoom trade rows for legibility instead and
  // always draw at the ceiling.
  const [viewportH, setViewportH] = useState(0);
  useEffect(() => {
    function measure() {
      setViewportH(window.innerHeight);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const cellW =
    avail > 0
      ? Math.max(CELL_W_MIN, Math.min(CELL_W_MAX, (avail - LEFT) / 12 - PAD))
      : CELL_W_MIN;

  const allYears = useMemo(() => fingerprintYears(data), [data]);

  const windowSize = ZOOM_WINDOW[zoom];
  const years = useMemo(() => {
    if (windowSize === null) return allYears;
    return allYears.slice(windowStart, windowStart + windowSize);
  }, [allYears, windowSize, windowStart]);

  const rowHeight = useMemo(() => {
    if (zoom !== "record") return CELL_H_MAX;
    if (years.length === 0 || viewportH === 0) return CELL_H_MAX;
    const budget = recordHeightBudget(viewportH);
    // DESIGN.md §5.1: rowHeight = clamp(4, floor((available - axis) / years),
    // 22). PAD is subtracted per row here (not in the source formula) so the
    // rendered height in `height` below actually lands inside `budget`
    // instead of overshooting it by one PAD per row — the entire point of
    // this computation is that the grid stops needing to scroll to be seen.
    const perRow = Math.floor((budget - TOP) / years.length) - PAD;
    return Math.max(CELL_H_MIN, Math.min(CELL_H_MAX, perRow));
  }, [zoom, years.length, viewportH]);

  const color = useMemo(
    () => buildColorScale(data.variable, data.stats),
    [data],
  );

  // Baseline layer (DESIGN.md §5.4). Computed from `data.data` — the full,
  // unwindowed record already fetched for the current variable — never from
  // `years`/the zoomed subset, so the domain (and therefore every cell's
  // colour) stays identical regardless of zoom stop.
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
  // DESIGN.md §5.4: "never let the renderer derive an asymmetric domain from
  // the data" — buildAnomalyColorScale takes the already-symmetric max and
  // does not touch it further.
  const anomalyColor = useMemo(
    () => (anomalyMax !== null ? buildAnomalyColorScale(anomalyMax) : null),
    [anomalyMax],
  );

  const layerNotes = useMemo(() => {
    const notes: string[] = [];
    if (baselineActive) {
      notes.push(
        anomalyMax === null
          ? `Baseline layer: no ${baselineFrom}–${baselineTo} reference average is available for this variable, so no departures could be computed.`
          : `Baseline layer active: colours show each month's departure from its own ${baselineFrom}–${baselineTo} average, not the ${data.variable.replace(/_/g, " ")} value itself.`,
      );
    }
    for (const key of LAYER_KEYS) {
      if (key === "baseline" || !layers.has(key)) continue;
      const note = LAYER_TABLE_NOTE[key];
      if (note) notes.push(note);
    }
    return notes;
  }, [baselineActive, anomalyMax, baselineFrom, baselineTo, data.variable, layers]);

  const enso = useMemo(() => ensoByYear(ensoEvents), [ensoEvents]);
  const cellMap = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const d of data.data) m.set(`${d.year}-${d.month}`, d.value);
    return m;
  }, [data]);

  const width = LEFT + 12 * (cellW + PAD);
  const height = TOP + years.length * (rowHeight + PAD);

  function clearHover() {
    setTip(null);
    setHoverRow(null);
    onHoverYear?.(null);
  }

  return (
    <div
      ref={wrapRef}
      // tabIndex makes the horizontal scroller reachable: the grid is wider
      // than its container at most widths, and with nothing focusable inside
      // it a keyboard user could not scroll it at all. (WCAG 2.1.1)
      tabIndex={0}
      aria-label={`${data.region.name} fingerprint grid, scrollable`}
      // overflow-y-visible is deliberate, on two counts. First, the CSS quirk:
      // setting overflow-x to anything but `visible` computes the other axis
      // to `auto` too, so `overflow-x-auto` alone would give this container a
      // vertical scrollbar of its own. Second, and now the real reason: at
      // "record" zoom the row-height computation above sizes the grid to fit
      // without one — DESIGN.md §5.1 forbids the fingerprint scrolling inside
      // itself, so there must be no vertical overflow left to clip or scroll.
      // Horizontal scroll stays: 12 columns under ~26px each stop being
      // hoverable on narrow phones, and that is a deliberate exception.
      className="relative overflow-x-auto overflow-y-visible pb-1"
      // 1.4.13: hover content must be dismissible without moving the pointer.
      onKeyDown={(e) => {
        if (e.key === "Escape") clearHover();
      }}
    >
      {/* The text alternative. A real table, so screen readers get their own
          navigation (next column, read row header) with no ARIA at all —
          rather than a bespoke grid pattern that would have to reimplement
          all of it. Visually hidden because the SVG above is the same data. */}
      <table className="sr-only">
        <caption>
          {`Monthly ${data.variable.replace(/_/g, " ")} for ${data.region.name}, ${data.year_from} to ${data.year_to}${UNIT[data.variable] ? `, in ${UNIT[data.variable].trim() || "degrees"}` : ""}`}
          {/* DESIGN.md §5.6: "Every layer extends the sr-only table with its
              own column or note. A layer that exists only visually is not
              finished." No layer contributes one yet (§10 step 3 is
              infrastructure only), but the caption is where a future layer's
              note is meant to land, so it reaches every table-reading screen
              reader user without a bespoke announcement path per layer. */}
          {layerNotes.length > 0 ? ` ${layerNotes.join(" ")}` : ""}
        </caption>
        <thead>
          <tr>
            <th scope="col">Year</th>
            {MONTHS.map((m) => (
              <th key={m} scope="col">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* allYears, not the (possibly windowed) `years` the SVG draws —
              DESIGN.md §5.1: the text alternative always contains the full
              record regardless of the visual zoom stop. */}
          {allYears.map((year) => (
            <tr key={year}>
              <th scope="row">{year}</th>
              {MONTHS.map((_, mi) => {
                const v = cellMap.get(`${year}-${mi + 1}`) ?? null;
                return (
                  <td key={mi}>
                    {v === null
                      ? "no data"
                      : `${v.toFixed(1)}${UNIT[data.variable]}`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {/* aria-hidden because the <table> below is the same data with real
          semantics. role="img" + one aria-label previously made 924 values a
          single opaque node: a screen-reader user got "climate fingerprint for
          Jakarta, monthly precipitation from 1950 to 2026" and nothing else —
          the whole point of the product, unavailable. (WCAG 1.1.1) */}
      <svg
        width={width}
        height={height}
        className="select-none"
        aria-hidden
        onMouseLeave={clearHover}
      >
        {/* Month labels */}
        {MONTHS.map((m, i) => (
          <text
            key={m}
            x={LEFT + i * (cellW + PAD) + cellW / 2}
            y={TOP - 9}
            textAnchor="middle"
            className="svg-tick font-numeric"
            fill="var(--text-muted)"
            letterSpacing={0.5}
          >
            {m.toUpperCase()}
          </text>
        ))}

        {years.map((year, row) => {
          const y = TOP + row * (rowHeight + PAD);
          const phase = enso.get(year);
          const rowActive = hoverRow === row;
          // Decade anchors stay legible while intermediate years recede.
          const isDecade = year % 10 === 0;
          return (
            <g
              key={year}
              onMouseEnter={() => {
                setHoverRow(row);
                onHoverYear?.(year);
              }}
            >
              {/* Row highlight band */}
              {rowActive && (
                <rect
                  x={LEFT - 2}
                  y={y - 1.5}
                  width={12 * (cellW + PAD) - PAD + 4}
                  height={rowHeight + 3}
                  rx={4}
                  fill="none"
                  stroke="var(--border-strong)"
                  strokeWidth={1}
                />
              )}

              {/* Year label */}
              <text
                x={LEFT - GUTTER - BORDER - 4}
                y={y + rowHeight / 2 + 3.5}
                textAnchor="end"
                className="svg-tick font-numeric"
                fill={
                  rowActive
                    ? "var(--text-primary)"
                    : isDecade
                      ? "var(--text-secondary)"
                      : "var(--text-muted)"
                }
                opacity={rowActive || isDecade ? 1 : 0.65}
              >
                {year}
              </text>

              {/* ENSO left border */}
              {showEnso && phase && (
                <rect
                  x={LEFT - GUTTER - BORDER}
                  y={y}
                  width={BORDER}
                  height={rowHeight}
                  rx={1.5}
                  fill={
                    phase === "EL_NINO"
                      ? "var(--enso-nino)"
                      : "var(--enso-nina)"
                  }
                />
              )}

              {/* Month cells */}
              {MONTHS.map((_, mi) => {
                const month = mi + 1;
                const value = cellMap.get(`${year}-${month}`) ?? null;
                const x = LEFT + mi * (cellW + PAD);
                const focused =
                  tip !== null && tip.year === year && tip.month === month;
                // Baseline mutually excludes the plain variable ramp per
                // DESIGN.md §5.4/§5.6 — one fill, never a blend of the two.
                const anomaly =
                  baselineActive && climatology
                    ? anomalyFor(value, month, climatology)
                    : null;
                const isNull = baselineActive
                  ? anomaly === null
                  : value === null || value === undefined;
                const fill = isNull
                  ? "var(--null-cell)"
                  : baselineActive && anomalyColor
                    ? (anomalyColor(anomaly as number) as string)
                    : (color(value as number) as string);
                return (
                  <rect
                    key={month}
                    x={x}
                    y={y}
                    width={cellW}
                    height={rowHeight}
                    rx={3}
                    fill={fill}
                    stroke={focused ? "var(--text-primary)" : "none"}
                    strokeWidth={focused ? 1.5 : 0}
                    opacity={hoverRow !== null && !rowActive ? 0.55 : 1}
                    style={{ transition: "opacity 120ms var(--ease)" }}
                    onMouseMove={(e) =>
                      setTip({
                        x: e.nativeEvent.offsetX,
                        y: e.nativeEvent.offsetY,
                        year,
                        month,
                        value,
                        enso: phase,
                      })
                    }
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {tip && (
        // Not role="status". A live region that follows the pointer
        // re-announces on every mouse move, and a keyboard user never opens
        // it at all — wrong in both directions. The values are exposed to
        // assistive tech through the grid itself, not through this.
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 rounded-lg border border-border-strong bg-canvas-deep px-3 py-2 shadow-float"
          style={{
            // Flip to the left of the cursor near the right edge so the tooltip
            // never forces the scroll container wider.
            left: tip.x > width - 150 ? tip.x - 132 : tip.x + 14,
            top: tip.y + 14,
          }}
        >
          <div className="font-numeric text-2xs uppercase tracking-wider text-text-muted">
            {MONTHS[tip.month - 1]} {tip.year}
          </div>
          <div className="font-numeric mt-0.5 text-sm font-medium text-text-primary">
            {tip.value === null
              ? "no data"
              : `${tip.value.toFixed(1)}${UNIT[data.variable]}`}
          </div>
          {baselineActive &&
            (() => {
              // Computed here rather than carried on `tip`: the tooltip must
              // show the same number the cell's colour encodes, and deriving
              // it from the same `climatology` the fill above reads keeps the
              // two from ever quietly disagreeing.
              const a =
                tip.value !== null && climatology
                  ? anomalyFor(tip.value, tip.month, climatology)
                  : null;
              return (
                <div className="font-numeric mt-1 border-t border-border pt-1.5 text-2xs text-text-secondary">
                  {a === null
                    ? `no ${baselineFrom}–${baselineTo} average to compare`
                    : `${a >= 0 ? "+" : "−"}${Math.abs(a).toFixed(1)}${UNIT[data.variable]} vs ${baselineFrom}–${baselineTo} avg`}
                </div>
              );
            })()}
          {showEnso && tip.enso && (
            <div className="mt-1.5 flex items-center gap-1.5 border-t border-border pt-1.5 text-2xs text-text-secondary">
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{
                  background:
                    tip.enso === "EL_NINO"
                      ? "var(--enso-nino)"
                      : "var(--enso-nina)",
                }}
              />
              {tip.enso === "EL_NINO" ? "El Niño year" : "La Niña year"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
