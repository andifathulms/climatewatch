"use client";

import { linearRegression } from "simple-statistics";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExtremesResponse } from "@/lib/types";
import {
  AXIS,
  CHART_MARGIN,
  CURSOR,
  ChartHeader,
  ChartTooltip,
  LegendKey,
  GRID,
} from "./chart-ui";

const METRICS: {
  key: keyof ExtremesResponse["results"][number];
  label: string;
  short: string;
}[] = [
  { key: "hot_days", label: "Hot days (>35°C)", short: "Hot days" },
  { key: "heavy_rain_days", label: "Heavy rain (>50mm)", short: "Heavy rain days" },
  { key: "extreme_rain_days", label: "Extreme rain (>100mm)", short: "Extreme rain days" },
  { key: "max_consecutive_dry_days", label: "Longest dry spell", short: "Dry spell (days)" },
  { key: "cool_days", label: "Cool days (<20°C)", short: "Cool days" },
];

export default function ExtremeDaysChart({ data }: { data: ExtremesResponse }) {
  const [metric, setMetric] = useState<string>("hot_days");
  const active = METRICS.find((m) => m.key === metric) ?? METRICS[0];

  const rows = data.results.map((r) => ({
    year: r.year,
    value: (r as unknown as Record<string, number>)[metric],
  }));

  // Trend line via simple-statistics linear regression.
  const pts = rows
    .filter((r) => r.value !== null && r.value !== undefined)
    .map((r) => [r.year, r.value] as [number, number]);
  const reg = pts.length > 1 ? linearRegression(pts) : null;
  const chartData = rows.map((r) => ({
    ...r,
    trend: reg ? reg.m * r.year + reg.b : null,
  }));

  const first = pts[0];
  const last = pts[pts.length - 1];
  const perDecade = reg ? reg.m * 10 : null;

  return (
    <section className="card p-6">
      <ChartHeader eyebrow="Extremes" title="Extreme Days">
        <label className="flex flex-col gap-1">
          <span className="sr-only">Metric</span>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="field px-3 py-1.5 text-xs"
          >
            {METRICS.map((m) => (
              <option key={m.key as string} value={m.key as string}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </ChartHeader>

      {/* The headline sentence — the chart's actual finding, in words. */}
      {first && last && (
        <p className="mb-5 max-w-prose text-sm leading-relaxed text-text-secondary">
          In <span className="font-numeric text-text-primary">{first[0]}</span>,{" "}
          {data.region.name} recorded{" "}
          <span className="font-numeric font-medium text-text-primary">
            {first[1]}
          </span>{" "}
          {active.short.toLowerCase()}. In{" "}
          <span className="font-numeric text-text-primary">{last[0]}</span>,{" "}
          <span className="font-numeric font-medium text-text-primary">
            {last[1]}
          </span>
          .
          {perDecade !== null && Math.abs(perDecade) >= 0.05 && (
            <>
              {" "}
              That trend runs{" "}
              <span
                className="font-numeric font-medium"
                style={{
                  color:
                    perDecade > 0 ? "var(--heat-orange)" : "var(--rain-blue)",
                }}
              >
                {perDecade > 0 ? "+" : "−"}
                {Math.abs(perDecade).toFixed(1)} per decade
              </span>
              .
            </>
          )}
        </p>
      )}

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={CHART_MARGIN}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="year" {...AXIS} minTickGap={28} />
          <YAxis {...AXIS} width={44} allowDecimals={false} />
          <Tooltip
            cursor={CURSOR}
            content={
              <ChartTooltip
                format={(e) =>
                  e.value == null
                    ? null
                    : {
                        name: e.dataKey === "trend" ? "Trend" : active.short,
                        value:
                          typeof e.value === "number"
                            ? e.value.toFixed(1)
                            : String(e.value),
                      }
                }
              />
            }
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--heat-orange)"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              fill: "var(--heat-orange)",
              // 2px surface ring so the active dot reads on top of the line.
              stroke: "var(--surface)",
              strokeWidth: 2,
            }}
            name={active.short}
          />
          <Line
            type="monotone"
            dataKey="trend"
            stroke="var(--drought-amber)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            activeDot={false}
            name="Trend"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Dash vs solid is the secondary encoding that separates trend from data
          without relying on the amber/orange hue difference alone. */}
      <LegendKey
        items={[
          { label: active.short, color: "var(--heat-orange)" },
          { label: "Linear trend", color: "var(--drought-amber)", dashed: true },
        ]}
      />
    </section>
  );
}
