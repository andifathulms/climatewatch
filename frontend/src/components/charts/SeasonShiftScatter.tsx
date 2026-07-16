"use client";

import { linearRegression } from "simple-statistics";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeasonResponse } from "@/lib/types";
import { MONTHS } from "@/lib/format";
import {
  AXIS,
  CHART_MARGIN,
  CURSOR,
  ChartHeader,
  ChartTooltip,
  LegendKey,
  GRID,
} from "./chart-ui";

/** Day-of-year (1–366) -> month label for the Y axis. */
function doyTick(doy: number): string {
  const d = new Date(2001, 0, 1);
  d.setDate(doy);
  return MONTHS[d.getMonth()];
}

function doyFull(doy: number): string {
  const d = new Date(2001, 0, 1);
  d.setDate(doy);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export default function SeasonShiftScatter({ data }: { data: SeasonResponse }) {
  const points = data.results
    .filter((r) => r.wet_season_onset_doy !== null)
    .map((r) => ({ year: r.year, doy: r.wet_season_onset_doy as number }));

  const reg =
    points.length > 1
      ? linearRegression(points.map((p) => [p.year, p.doy] as [number, number]))
      : null;

  // Merge scatter points + trend value into one row set for ComposedChart.
  const chartData = points.map((p) => ({
    year: p.year,
    doy: p.doy,
    trend: reg ? reg.m * p.year + reg.b : null,
  }));

  const shiftPerDecade = reg ? reg.m * 10 : null;

  return (
    <section className="card p-6">
      <ChartHeader eyebrow="Seasonality" title="Season Shift" />

      <p className="mb-5 max-w-prose text-sm leading-relaxed text-text-secondary">
        Wet season onset by year — the first 5-day spell of ≥40mm after Aug 1.
        {shiftPerDecade !== null && Math.abs(shiftPerDecade) >= 0.1 && (
          <>
            {" "}
            Onset is drifting{" "}
            <span className="font-numeric font-medium text-text-primary">
              {Math.abs(shiftPerDecade).toFixed(1)} days{" "}
              {shiftPerDecade > 0 ? "later" : "earlier"}
            </span>{" "}
            each decade.
          </>
        )}
        {data.null_onset_years > 0 && (
          <span className="text-text-muted">
            {" "}
            {data.null_onset_years} year
            {data.null_onset_years === 1 ? "" : "s"} had no detectable onset and{" "}
            {data.null_onset_years === 1 ? "is" : "are"} not plotted.
          </span>
        )}
      </p>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={CHART_MARGIN}>
          <CartesianGrid {...GRID} />
          <XAxis
            dataKey="year"
            type="number"
            domain={["dataMin", "dataMax"]}
            minTickGap={28}
            {...AXIS}
          />
          <YAxis
            dataKey="doy"
            domain={[210, 366]}
            tickFormatter={doyTick}
            width={44}
            {...AXIS}
          />
          <Tooltip
            cursor={CURSOR}
            content={
              <ChartTooltip
                format={(e) => {
                  if (typeof e.value !== "number") return null;
                  return e.dataKey === "trend"
                    ? { name: "Trend", value: doyFull(Math.round(e.value)) }
                    : { name: "Onset", value: doyFull(e.value) };
                }}
              />
            }
          />
          <Scatter
            dataKey="doy"
            fill="var(--rain-blue)"
            // >=8px marker with a 2px surface ring so overlapping years read.
            shape={(props: { cx?: number; cy?: number }) => (
              <circle
                cx={props.cx}
                cy={props.cy}
                r={4}
                fill="var(--rain-blue)"
                stroke="var(--surface)"
                strokeWidth={1.5}
              />
            )}
            name="Onset"
          />
          {reg && (
            <Line
              type="linear"
              dataKey="trend"
              stroke="var(--drought-amber)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={false}
              name="Trend"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <LegendKey
        items={[
          { label: "Wet season onset", color: "var(--rain-blue)" },
          { label: "Linear trend", color: "var(--drought-amber)", dashed: true },
        ]}
      />
    </section>
  );
}
