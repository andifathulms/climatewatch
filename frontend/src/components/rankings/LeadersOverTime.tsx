"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OverTimeMetric, OverTimeResponse } from "@/lib/types";
import { AXIS, CHART_MARGIN, CURSOR, GRID } from "@/components/charts/chart-ui";

// Validated all-pairs on the dark surface (#1B1813): worst CVD ΔE 8.2, worst
// normal-vision ΔE 18.2 — see the dataviz validator. Colour follows the entity:
// each city holds its slot across the chart, legend, and reigns ribbon.
const LINE_COLORS = ["#3E93D0", "#E2661F", "#45A05F", "#CB4F9E"];

type MetricKey = "temp" | "rain";

interface Reign {
  slug: string;
  name: string;
  color: string;
  from: number;
  to: number;
}

function buildReigns(
  metric: OverTimeMetric,
  colorOf: Map<string, string>,
  nameOf: Map<string, string>,
): Reign[] {
  const out: Reign[] = [];
  const { years, leader_by_year } = metric;
  for (let i = 0; i < years.length; i++) {
    const slug = leader_by_year[i];
    if (!slug) continue;
    const last = out[out.length - 1];
    if (last && last.slug === slug) {
      last.to = years[i];
    } else {
      out.push({
        slug,
        name: nameOf.get(slug) ?? slug,
        color: colorOf.get(slug) ?? "var(--text-muted)",
        from: years[i],
        to: years[i],
      });
    }
  }
  return out;
}

export default function LeadersOverTime({ data }: { data: OverTimeResponse }) {
  const [metricKey, setMetricKey] = useState<MetricKey>("temp");
  const metric = data[metricKey];

  const colorOf = useMemo(() => {
    const m = new Map<string, string>();
    metric.series.forEach((s, i) =>
      m.set(s.region.slug, LINE_COLORS[i % LINE_COLORS.length]),
    );
    return m;
  }, [metric]);

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    metric.series.forEach((s) => m.set(s.region.slug, s.region.name));
    return m;
  }, [metric]);

  const rows = useMemo(
    () =>
      metric.years.map((year, i) => {
        const row: Record<string, number | null> = { year };
        for (const s of metric.series) row[s.region.slug] = s.values[i];
        return row;
      }),
    [metric],
  );

  const reigns = useMemo(
    () => buildReigns(metric, colorOf, nameOf),
    [metric, colorOf, nameOf],
  );

  // Tight, honest domain: these cluster in a narrow band (esp. temperature),
  // and a line makes no zero-baseline claim, so pad around the real values.
  const [lo, hi] = useMemo(() => {
    const vals = metric.series
      .flatMap((s) => s.values)
      .filter((v): v is number => v !== null);
    if (!vals.length) return [0, 1];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min || 1) * 0.15;
    return [min - pad, max + pad];
  }, [metric]);

  const totalSpan = metric.years.length - 1 || 1;
  const fmt = (v: number) =>
    metric.decimals === 0 ? Math.round(v).toString() : v.toFixed(metric.decimals);

  return (
    <section className="card p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Leaders over time</p>
          <h2 className="mt-1.5 font-display text-xl font-semibold">
            Who led each year
          </h2>
        </div>
        <div
          role="tablist"
          aria-label="Metric"
          className="inline-flex rounded-full border border-border bg-surface-inset p-1"
        >
          {(["temp", "rain"] as MetricKey[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={metricKey === k}
              onClick={() => setMetricKey(k)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                metricKey === k
                  ? "bg-text-primary text-canvas"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {data[k].label}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 max-w-prose text-sm leading-relaxed text-text-secondary">
        Only the cities that ever held #1 are drawn, as a{" "}
        <span className="text-text-primary">
          {metric.smoothing_years}-year average
        </span>{" "}
        so eras reflect real shifts, not single-year noise. Values in{" "}
        {metric.unit}.
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={rows} margin={CHART_MARGIN}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} minTickGap={32} {...AXIS} />
          <YAxis domain={[lo, hi]} width={46} tickFormatter={fmt} {...AXIS} />
          <Tooltip
            cursor={CURSOR}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const idx = metric.years.indexOf(Number(label));
              const leader = metric.leader_by_year[idx];
              return (
                <div className="rounded-lg border border-border-strong bg-canvas-deep px-3 py-2 shadow-float">
                  <div className="font-numeric text-[10px] uppercase tracking-wider text-text-muted">
                    {label}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {payload
                      .slice()
                      .sort((a, b) => Number(b.value) - Number(a.value))
                      .map((e) => {
                        const slug = String(e.dataKey);
                        const isLeader = slug === leader;
                        return (
                          <div
                            key={slug}
                            className="flex items-center justify-between gap-4 text-xs"
                          >
                            <span className="flex items-center gap-1.5 text-text-secondary">
                              <span
                                aria-hidden
                                className="h-2 w-2 rounded-[2px]"
                                style={{ background: e.color }}
                              />
                              {nameOf.get(slug)}
                              {isLeader && (
                                <span
                                  aria-hidden
                                  style={{ color: e.color }}
                                  title="leader"
                                >
                                  ★
                                </span>
                              )}
                            </span>
                            <span className="font-numeric font-medium text-text-primary">
                              {e.value == null ? "—" : fmt(Number(e.value))}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            }}
          />
          {metric.series.map((s) => (
            <Line
              key={s.region.slug}
              type="monotone"
              dataKey={s.region.slug}
              stroke={colorOf.get(s.region.slug)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
              connectNulls
              name={s.region.name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend — identity is carried here, not by colour alone. */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {metric.series.map((s) => (
          <span
            key={s.region.slug}
            className="flex items-center gap-2 text-xs text-text-secondary"
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ background: colorOf.get(s.region.slug) }}
            />
            {s.region.name}
          </span>
        ))}
      </div>

      {/* Reigns ribbon — the plain-language "who led when", to scale. */}
      <div className="mt-6">
        <p className="eyebrow mb-2">Reigns</p>
        <div className="flex h-9 overflow-hidden rounded-md border border-border">
          {reigns.map((r, i) => {
            const width = ((r.to - r.from + 1) / (totalSpan + 1)) * 100;
            return (
              <div
                key={`${r.slug}-${r.from}`}
                title={`${r.name}: ${r.from}–${r.to}`}
                className={`flex items-center justify-center overflow-hidden px-1 ${
                  i > 0 ? "border-l border-canvas-deep" : ""
                }`}
                style={{
                  width: `${width}%`,
                  background: `color-mix(in srgb, ${r.color} 22%, transparent)`,
                  borderTop: `2px solid ${r.color}`,
                }}
              >
                <span className="truncate text-[10px] font-medium text-text-primary">
                  {width > 8 ? r.name : ""}
                </span>
              </div>
            );
          })}
        </div>
        <div className="font-numeric mt-1 flex justify-between text-[10px] text-text-muted">
          <span>{metric.years[0]}</span>
          <span>{metric.years[metric.years.length - 1]}</span>
        </div>
      </div>
    </section>
  );
}
