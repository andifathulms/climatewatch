"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CompareProfile } from "@/lib/types";
import { MONTHS } from "@/lib/format";

type Metric = "avg_temp_mean" | "avg_precipitation";

/** 12-month bar chart overlaying two cities. Used on the compare page. */
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

  const colorA = metric === "avg_precipitation" ? "var(--rain-blue)" : "var(--heat-orange)";
  const colorB = metric === "avg_precipitation" ? "var(--rain-light)" : "var(--heat-light)";

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="mb-3 text-lg font-semibold">
        {title} <span className="text-sm font-normal text-text-muted">({unit})</span>
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey={a.region.name} fill={colorA} radius={[2, 2, 0, 0]} />
          <Bar dataKey={b.region.name} fill={colorB} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
