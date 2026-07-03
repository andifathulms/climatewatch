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

const METRICS: { key: keyof ExtremesResponse["results"][number]; label: string }[] = [
  { key: "hot_days", label: "Hot days (>35°C)" },
  { key: "heavy_rain_days", label: "Heavy rain (>50mm)" },
  { key: "extreme_rain_days", label: "Extreme rain (>100mm)" },
  { key: "max_consecutive_dry_days", label: "Longest dry spell" },
  { key: "cool_days", label: "Cool days (<20°C)" },
];

export default function ExtremeDaysChart({ data }: { data: ExtremesResponse }) {
  const [metric, setMetric] = useState<string>("hot_days");

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

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Extreme Days</h2>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          className="rounded-md border border-border bg-surface-muted px-2 py-1 text-sm"
        >
          {METRICS.map((m) => (
            <option key={m.key as string} value={m.key as string}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {first && last && (
        <p className="mb-3 text-sm text-text-secondary">
          In {first[0]}, {data.region.name} had{" "}
          <span className="font-numeric font-medium">{first[1]}</span>. In {last[0]}, it had{" "}
          <span className="font-numeric font-medium">{last[1]}</span>.
        </p>
      )}

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--heat-orange)"
            strokeWidth={2}
            dot={false}
            name="Days"
          />
          <Line
            type="monotone"
            dataKey="trend"
            stroke="var(--drought-amber)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            name="Trend"
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
