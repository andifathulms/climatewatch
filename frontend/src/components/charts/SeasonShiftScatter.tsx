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

/** Day-of-year (1–366) -> month label for the Y axis. */
function doyTick(doy: number): string {
  const d = new Date(2001, 0, 1);
  d.setDate(doy);
  return MONTHS[d.getMonth()];
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

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <h2 className="text-xl font-semibold">Season Shift</h2>
      <p className="mb-3 text-sm text-text-secondary">
        Wet season onset by year (first 5-day ≥40mm spell after Aug 1).
        {data.null_onset_years > 0 &&
          ` ${data.null_onset_years} year(s) had no detectable onset.`}
      </p>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
          <XAxis
            dataKey="year"
            type="number"
            domain={["dataMin", "dataMax"]}
            tick={{ fontSize: 11 }}
            stroke="var(--text-muted)"
          />
          <YAxis
            dataKey="doy"
            domain={[210, 366]}
            tickFormatter={doyTick}
            tick={{ fontSize: 11 }}
            stroke="var(--text-muted)"
          />
          <Tooltip
            formatter={(v: number, name) =>
              name === "doy" ? [`${doyTick(v)} (day ${v})`, "Onset"] : [Math.round(v), "Trend"]
            }
            contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
          />
          <Scatter dataKey="doy" fill="var(--rain-blue)" />
          {reg && (
            <Line
              type="linear"
              dataKey="trend"
              stroke="var(--drought-amber)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </section>
  );
}
