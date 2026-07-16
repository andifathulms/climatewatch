"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RankingEntry, RankingsResponse } from "@/lib/types";
import { fmt } from "@/lib/format";

type MetricKey =
  | "hottest"
  | "wettest"
  | "driest"
  | "warming"
  | "extreme_rain"
  | "heatwave";

const METRICS: {
  key: MetricKey;
  label: string;
  eyebrow: string;
  get: (r: RankingEntry) => number | null;
  format: (v: number) => string;
  sort: "desc" | "asc";
  color: string;
}[] = [
  {
    key: "hottest",
    label: "Hottest",
    eyebrow: "By average daily high",
    get: (r) => r.avg_temp_max,
    format: (v) => `${v.toFixed(1)}°C`,
    sort: "desc",
    color: "var(--heat-orange)",
  },
  {
    key: "wettest",
    label: "Wettest",
    eyebrow: "By average annual rainfall",
    get: (r) => r.avg_annual_precipitation,
    format: (v) => `${v.toFixed(0)}mm/yr`,
    sort: "desc",
    color: "var(--rain-blue)",
  },
  {
    key: "driest",
    label: "Driest",
    eyebrow: "By average annual rainfall",
    get: (r) => r.avg_annual_precipitation,
    format: (v) => `${v.toFixed(0)}mm/yr`,
    sort: "asc",
    color: "var(--drought-amber)",
  },
  {
    key: "warming",
    label: "Fastest warming",
    eyebrow: "Linear trend, avg daily high",
    get: (r) => r.warming_c_per_decade,
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}°C/decade`,
    sort: "desc",
    color: "var(--heat-orange)",
  },
  {
    key: "extreme_rain",
    label: "Most extreme rain",
    eyebrow: "Avg days/year with >100mm rain",
    get: (r) => r.avg_extreme_rain_days_per_year,
    format: (v) => `${v.toFixed(1)} days/yr`,
    sort: "desc",
    color: "var(--rain-blue)",
  },
  {
    key: "heatwave",
    label: "Longest heatwave",
    eyebrow: "Longest streak of days >35°C, any year on record",
    get: (r) => r.max_consecutive_hot_days,
    format: (v) => `${v.toFixed(0)} days`,
    sort: "desc",
    color: "var(--heat-orange)",
  },
];

export default function RankingsTable({ data }: { data: RankingsResponse }) {
  const [metric, setMetric] = useState<MetricKey>("hottest");
  const active = METRICS.find((m) => m.key === metric)!;

  const ranked = useMemo(() => {
    const rows = data.results
      .map((r) => ({ entry: r, value: active.get(r) }))
      .filter((r): r is { entry: RankingEntry; value: number } => r.value !== null);
    rows.sort((a, b) => (active.sort === "desc" ? b.value - a.value : a.value - b.value));
    return rows.slice(0, 15);
  }, [data, active]);

  const max = ranked[0]?.value ?? 1;
  const min = ranked[ranked.length - 1]?.value ?? 0;
  const span = Math.max(Math.abs(max - min), 1e-6);

  return (
    <section className="card p-6">
      <div className="mb-5 flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              m.key === metric
                ? "bg-surface-muted text-text-primary ring-1 ring-border-strong"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="eyebrow">{active.eyebrow}</p>
      <p className="mt-1 text-xs text-text-muted">
        Ranked across {data.results.length} bootstrapped cities, 1950–present.
      </p>

      <ol className="mt-5 space-y-1">
        {ranked.map((row, i) => {
          // Bar width scaled within this metric's own min–max span, not zero-based —
          // the point is relative standing among cities, not an absolute-zero axis.
          const pct =
            active.sort === "desc"
              ? ((row.value - min) / span) * 100
              : ((max - row.value) / span) * 100;

          return (
            <li key={row.entry.region.id}>
              <Link
                href={`/city/${row.entry.region.slug}`}
                className="group flex items-center gap-4 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-muted"
              >
                <span className="font-numeric w-5 shrink-0 text-right text-xs text-text-muted">
                  {i + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-text-primary group-hover:text-text-primary">
                      {row.entry.region.name}
                    </span>
                    <span className="font-numeric shrink-0 text-sm font-medium text-text-primary">
                      {active.format(row.value)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-inset">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(pct, 4)}%`,
                        background: active.color,
                      }}
                    />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      {ranked.length === 0 && (
        <p className="py-8 text-center text-sm text-text-muted">
          Not enough data yet for this metric.
        </p>
      )}
    </section>
  );
}
