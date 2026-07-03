"use client";

import * as d3 from "d3";
import { useMemo, useState } from "react";
import type {
  ENSOEvent,
  FingerprintResponse,
  FingerprintStats,
  FingerprintVariable,
} from "@/lib/types";
import { MONTHS } from "@/lib/format";

const CELL = 22;
const PAD = 3;
const LEFT = 52; // year labels
const TOP = 22; // month labels
const BORDER = 4; // ENSO left border width

const UNIT: Record<FingerprintVariable, string> = {
  precipitation: " mm",
  temp_max: "°C",
  hot_days: " days",
  dry_days: " days",
};

/** Build the D3 sequential color scale for a variable (per CLAUDE.md spec). */
function buildColorScale(variable: FingerprintVariable, stats: FingerprintStats) {
  const p90 = stats.p90 ?? stats.max ?? 1;
  const p10 = stats.p10 ?? stats.min ?? 0;
  const max = stats.max ?? 1;
  switch (variable) {
    case "precipitation":
      return d3.scaleSequential(d3.interpolateBlues).domain([0, p90]);
    case "temp_max":
      return d3.scaleSequential(d3.interpolateOranges).domain([p10, p90]);
    case "hot_days":
      return d3.scaleSequential(d3.interpolateReds).domain([0, max]);
    case "dry_days":
      return d3.scaleSequential(d3.interpolateYlOrBr).domain([0, max]);
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

  const width = LEFT + 12 * (CELL + PAD);
  const height = TOP + years.length * (CELL + PAD);

  return (
    <div className="relative overflow-x-auto">
      <svg width={width} height={height} className="select-none">
        {/* Month labels */}
        {MONTHS.map((m, i) => (
          <text
            key={m}
            x={LEFT + i * (CELL + PAD) + CELL / 2}
            y={TOP - 8}
            textAnchor="middle"
            className="fill-text-secondary font-numeric"
            fontSize={11}
          >
            {m}
          </text>
        ))}

        {years.map((year, row) => {
          const y = TOP + row * (CELL + PAD);
          const phase = enso.get(year);
          return (
            <g
              key={year}
              onMouseEnter={() => onHoverYear?.(year)}
              onMouseLeave={() => onHoverYear?.(null)}
            >
              {/* Year label */}
              <text
                x={LEFT - 10}
                y={y + CELL / 2 + 4}
                textAnchor="end"
                className="fill-text-secondary font-numeric"
                fontSize={11}
              >
                {year}
              </text>

              {/* ENSO left border */}
              {showEnso && phase && (
                <rect
                  x={LEFT - BORDER - 2}
                  y={y}
                  width={BORDER}
                  height={CELL}
                  fill={phase === "EL_NINO" ? "var(--enso-nino)" : "var(--enso-nina)"}
                />
              )}

              {/* Month cells */}
              {MONTHS.map((_, mi) => {
                const month = mi + 1;
                const value = cellMap.get(`${year}-${month}`) ?? null;
                const x = LEFT + mi * (CELL + PAD);
                const fill =
                  value === null || value === undefined
                    ? "var(--null-cell)"
                    : (color(value) as string);
                return (
                  <rect
                    key={month}
                    x={x}
                    y={y}
                    width={CELL}
                    height={CELL}
                    rx={2}
                    fill={fill}
                    stroke={tip && tip.year === year && tip.month === month ? "var(--text-primary)" : "none"}
                    strokeWidth={tip && tip.year === year && tip.month === month ? 1.5 : 0}
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
                    onMouseLeave={() => setTip(null)}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {tip && (
        <div
          className="pointer-events-none absolute z-10 rounded-md bg-text-primary px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: tip.x + 12, top: tip.y + 12 }}
        >
          <div className="font-numeric">
            {MONTHS[tip.month - 1]} {tip.year}
          </div>
          <div className="font-numeric text-sm font-medium">
            {tip.value === null
              ? "no data"
              : `${tip.value.toFixed(1)}${UNIT[data.variable]}`}
          </div>
          {showEnso && tip.enso && (
            <div className="mt-1 opacity-80">
              {tip.enso === "EL_NINO" ? "El Niño year" : "La Niña year"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
