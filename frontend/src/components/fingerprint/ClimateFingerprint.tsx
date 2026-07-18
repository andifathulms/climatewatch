"use client";

import * as d3 from "d3";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ENSOEvent,
  FingerprintResponse,
  FingerprintStats,
  FingerprintVariable,
} from "@/lib/types";
import { MONTHS } from "@/lib/format";

const CELL_H = 22; // row height — one year
const CELL_W_MIN = 26; // narrowest a month column may get before we scroll
const CELL_W_MAX = 64;
const PAD = 3; // >=2px surface gap between fills, per the dataviz mark spec
const LEFT = 54; // year labels
const TOP = 24; // month labels
const BORDER = 3; // ENSO left border width
const GUTTER = 6; // gap between the ENSO border and the first cell

const UNIT: Record<FingerprintVariable, string> = {
  precipitation: " mm",
  temp_max: "°C",
  hot_days: " days",
  dry_days: " days",
};

/**
 * Sequential ramps for the Musim Nokturnal (dark) surface.
 *
 * Anchored dark→vivid, not dark→pale. An earlier version of this ramp bottomed
 * out at a pale tint at the high end (e.g. near-white blue for max rainfall) —
 * technically the brightest cell, but pale/desaturated colors read as "faint"
 * regardless of lightness, so high-magnitude cells looked weaker than the
 * saturated-but-dark low-magnitude ones. Perceived "intensity" tracks
 * saturation more than raw lightness, so the fix keeps the low end dark *and*
 * muted (blends into the canvas, doesn't compete for attention) while the
 * high end is dark→light but stays fully saturated (vivid, "loud") the whole
 * way — never fading to pastel. That also satisfies the plain-language
 * reading "darker/more colorful = more rain/heat".
 *
 * Each ramp holds a single hue and is verified monotonic in both L* and
 * saturation (no dip at the top), and keeps its zero end chromatic so a true
 * zero stays distinct from a null cell (ΔE 13–26 vs --null-cell). Do not swap
 * these for the d3 built-ins.
 */
const RAMPS: Record<FingerprintVariable, string[]> = {
  precipitation: ["#122A42", "#1A4E7C", "#1C74AC", "#1998D6", "#22BBEF", "#4FD8FF"],
  temp_max: ["#2A1608", "#5C2A0E", "#9C3D14", "#D6591C", "#EE7A1E", "#FFA028"],
  hot_days: ["#3A1010", "#7A1E1A", "#B93227", "#E05B3D", "#F5794A", "#FF8A3C"],
  dry_days: ["#2E2108", "#5E4310", "#8F6816", "#C08F1C", "#E0B324", "#F5CC2E"],
};

/** Build the D3 sequential color scale for a variable (domains per CLAUDE.md). */
function buildColorScale(variable: FingerprintVariable, stats: FingerprintStats) {
  const p90 = stats.p90 ?? stats.max ?? 1;
  const p10 = stats.p10 ?? stats.min ?? 0;
  const max = stats.max ?? 1;
  const interp = d3.interpolateRgbBasis(RAMPS[variable]);
  switch (variable) {
    case "precipitation":
      return d3.scaleSequential(interp).domain([0, p90]);
    case "temp_max":
      return d3.scaleSequential(interp).domain([p10, p90]);
    case "hot_days":
      return d3.scaleSequential(interp).domain([0, max]);
    case "dry_days":
      return d3.scaleSequential(interp).domain([0, max]);
  }
}

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

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
      <div className="flex items-center gap-2.5">
        <span className="font-numeric text-[10px] text-text-muted">
          {lo.toFixed(0)}
        </span>
        <span
          className="h-2 w-28 rounded-full ring-1 ring-inset ring-border"
          style={{ background: gradient }}
          role="img"
          aria-label={`Color scale from ${lo.toFixed(0)} to ${hi.toFixed(0)}${UNIT[variable]}`}
        />
        <span className="font-numeric text-[10px] text-text-muted">
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
        <span className="text-[11px] text-text-muted">no data</span>
      </div>
    </div>
  );
}

export default function ClimateFingerprint({
  data,
  showEnso,
  onHoverYear,
}: {
  data: FingerprintResponse;
  showEnso: boolean;
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

  const cellW =
    avail > 0
      ? Math.max(
          CELL_W_MIN,
          Math.min(CELL_W_MAX, (avail - LEFT) / 12 - PAD),
        )
      : CELL_W_MIN;

  const years = useMemo(() => {
    const set = new Set(data.data.map((d) => d.year));
    // newest at top
    return Array.from(set).sort((a, b) => b - a);
  }, [data]);

  const color = useMemo(
    () => buildColorScale(data.variable, data.stats),
    [data],
  );
  const enso = useMemo(() => ensoByYear(data.enso_events), [data]);
  const cellMap = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const d of data.data) m.set(`${d.year}-${d.month}`, d.value);
    return m;
  }, [data]);

  const width = LEFT + 12 * (cellW + PAD);
  const height = TOP + years.length * (CELL_H + PAD);

  function clearHover() {
    setTip(null);
    setHoverRow(null);
    onHoverYear?.(null);
  }

  return (
    <div ref={wrapRef} className="relative overflow-x-auto pb-1">
      <svg
        width={width}
        height={height}
        className="select-none"
        role="img"
        aria-label={`Climate fingerprint for ${data.region.name}: monthly ${data.variable.replace("_", " ")} from ${data.year_from} to ${data.year_to}`}
        onMouseLeave={clearHover}
      >
        {/* Month labels */}
        {MONTHS.map((m, i) => (
          <text
            key={m}
            x={LEFT + i * (cellW + PAD) + cellW / 2}
            y={TOP - 9}
            textAnchor="middle"
            className="font-numeric"
            fill="var(--text-muted)"
            fontSize={10}
            letterSpacing={0.5}
          >
            {m.toUpperCase()}
          </text>
        ))}

        {years.map((year, row) => {
          const y = TOP + row * (CELL_H + PAD);
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
                  height={CELL_H + 3}
                  rx={4}
                  fill="none"
                  stroke="var(--border-strong)"
                  strokeWidth={1}
                />
              )}

              {/* Year label */}
              <text
                x={LEFT - GUTTER - BORDER - 4}
                y={y + CELL_H / 2 + 3.5}
                textAnchor="end"
                className="font-numeric"
                fill={
                  rowActive
                    ? "var(--text-primary)"
                    : isDecade
                      ? "var(--text-secondary)"
                      : "var(--text-muted)"
                }
                fontSize={10}
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
                  height={CELL_H}
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
                const isNull = value === null || value === undefined;
                const focused =
                  tip !== null && tip.year === year && tip.month === month;
                return (
                  <rect
                    key={month}
                    x={x}
                    y={y}
                    width={cellW}
                    height={CELL_H}
                    rx={3}
                    fill={isNull ? "var(--null-cell)" : (color(value) as string)}
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
        <div
          role="status"
          className="pointer-events-none absolute z-10 rounded-lg border border-border-strong bg-canvas-deep px-3 py-2 shadow-float"
          style={{
            // Flip to the left of the cursor near the right edge so the tooltip
            // never forces the scroll container wider.
            left: tip.x > width - 150 ? tip.x - 132 : tip.x + 14,
            top: tip.y + 14,
          }}
        >
          <div className="font-numeric text-[10px] uppercase tracking-wider text-text-muted">
            {MONTHS[tip.month - 1]} {tip.year}
          </div>
          <div className="font-numeric mt-0.5 text-sm font-medium text-text-primary">
            {tip.value === null
              ? "no data"
              : `${tip.value.toFixed(1)}${UNIT[data.variable]}`}
          </div>
          {showEnso && tip.enso && (
            <div className="mt-1.5 flex items-center gap-1.5 border-t border-border pt-1.5 text-[11px] text-text-secondary">
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
