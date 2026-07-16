"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CompareProfile } from "@/lib/types";
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

type Metric = "avg_temp_mean" | "avg_precipitation";

/**
 * 12-month climate chart overlaying two cities. Used on the compare page.
 *
 * Color follows the *entity*, not the metric: city A is always series-1 and
 * city B always series-2, identically in the temperature and rainfall charts.
 * (Previously each chart re-hued by metric — blue pair for rain, orange pair for
 * temp — so the same city changed color between two charts sitting side by side,
 * and the two cities within a chart were only separated by a light/dark step of
 * one hue.) The metric is named by the title and axis; it does not need a hue.
 *
 * The *form* also follows the metric, which is why this is not always bars:
 *   · rainfall is an additive magnitude — bars, anchored at a zero baseline.
 *   · temperature is a cycle over time — a line, on its own range.
 * Tropical monthly means span roughly 26–28°C, so zero-baselined bars rendered
 * twelve identical stumps and hid the entire seasonal signal. Truncating a bar
 * axis to fix that would misstate the ratios the bar lengths imply; a line
 * carries no such claim and is the honest form here.
 */
export default function MonthlyBarChart({
  a,
  b,
  metric,
  title,
  unit,
}: {
  a: CompareProfile;
  b: CompareProfile;
  metric: Metric;
  title: string;
  unit: string;
}) {
  const data = MONTHS.map((m, i) => ({
    month: m,
    [a.region.name]: a.climatology[i]?.[metric] ?? null,
    [b.region.name]: b.climatology[i]?.[metric] ?? null,
  }));

  const colorA = "var(--series-1)";
  const colorB = "var(--series-2)";
  const asLine = metric === "avg_temp_mean";

  return (
    <div className="card p-6">
      <ChartHeader
        eyebrow={metric === "avg_precipitation" ? "Rainfall" : "Temperature"}
        title={title}
      >
        <span className="font-numeric rounded-full border border-border bg-surface-inset px-2.5 py-1 text-[10px] text-text-muted">
          {unit}
        </span>
      </ChartHeader>

      <ResponsiveContainer width="100%" height={240}>
        {asLine ? (
          <LineChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="month" {...AXIS} />
            <YAxis
              {...AXIS}
              width={44}
              // A line makes no zero-baseline claim, so it can breathe around
              // the actual range and show the seasonal swing.
              domain={[
                (min: number) => Math.floor(min - 1),
                (max: number) => Math.ceil(max + 1),
              ]}
            />
            <Tooltip
              cursor={CURSOR}
              content={<ChartTooltip labelSuffix={` · ${unit}`} />}
            />
            {[
              { name: a.region.name, color: colorA },
              { name: b.region.name, color: colorB },
            ].map((s) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
                activeDot={{
                  r: 5,
                  fill: s.color,
                  stroke: "var(--surface)",
                  strokeWidth: 2,
                }}
                connectNulls
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data} margin={CHART_MARGIN} barGap={2}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="month" {...AXIS} />
            <YAxis {...AXIS} width={44} />
            <Tooltip
              cursor={{ fill: "var(--surface-muted)", opacity: 0.5 }}
              content={<ChartTooltip labelSuffix={` · ${unit}`} />}
            />
            <Bar dataKey={a.region.name} fill={colorA} radius={[3, 3, 0, 0]} />
            <Bar dataKey={b.region.name} fill={colorB} radius={[3, 3, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>

      <LegendKey
        items={[
          { label: a.region.name, color: colorA },
          { label: b.region.name, color: colorB },
        ]}
      />
    </div>
  );
}
