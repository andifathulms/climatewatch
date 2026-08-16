"use client";

import SegmentedControl from "@/components/ui/SegmentedControl";
import Link from "next/link";
import { useMemo } from "react";
import type { RankingEntry, RankingsResponse } from "@/lib/types";

export type MetricKey =
  | "hottest"
  | "wettest"
  | "driest"
  | "warming"
  | "extreme_rain"
  | "heatwave";

export interface RankingMetric {
  key: MetricKey;
  label: string;
  eyebrow: string;
  get: (r: RankingEntry) => number | null;
  format: (v: number) => string;
  sort: "desc" | "asc";
  color: string;
  // Where the bar starts. "zero" for additive/count/rate metrics that have a
  // real zero (rainfall, days, warming rate); "min" for temperature, whose
  // meaningful range sits far from 0°C — a zero-based bar there is ~99% full
  // for every city and shows nothing. The min-based scale is disclosed to the
  // reader via the scale caption so it never reads as proportional-from-zero.
  baseline: "zero" | "min";
}

// Exported so RankingsSection can drive both the table and the choropleth map
// off the exact same metric definitions — DESIGN.md §6: "the existing 6-metric
// segmented control drives both map and table."
export const METRICS: RankingMetric[] = [
  {
    key: "hottest",
    label: "Hottest",
    eyebrow: "By average daily high",
    get: (r) => r.avg_temp_max,
    format: (v) => `${v.toFixed(1)}°C`,
    sort: "desc",
    color: "var(--heat-orange)",
    baseline: "min",
  },
  {
    key: "wettest",
    label: "Wettest",
    eyebrow: "By average annual rainfall",
    get: (r) => r.avg_annual_precipitation,
    format: (v) => `${v.toFixed(0)} mm/yr`,
    sort: "desc",
    color: "var(--rain-blue)",
    baseline: "zero",
  },
  {
    key: "driest",
    label: "Driest",
    eyebrow: "By average annual rainfall (least first)",
    get: (r) => r.avg_annual_precipitation,
    format: (v) => `${v.toFixed(0)} mm/yr`,
    sort: "asc",
    color: "var(--drought-amber)",
    baseline: "zero",
  },
  {
    key: "warming",
    label: "Fastest warming",
    eyebrow: "Linear trend in average daily high",
    get: (r) => r.warming_c_per_decade,
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}°C/decade`,
    sort: "desc",
    color: "var(--heat-orange)",
    baseline: "zero",
  },
  {
    key: "extreme_rain",
    label: "Most extreme rain",
    eyebrow: "Average days per year above 100mm",
    get: (r) => r.avg_extreme_rain_days_per_year,
    format: (v) => `${v.toFixed(1)} days/yr`,
    sort: "desc",
    color: "var(--rain-blue)",
    baseline: "zero",
  },
  {
    key: "heatwave",
    label: "Longest heatwave",
    // Stays on the absolute 35°C rule on purpose. This is a leaderboard, and
    // ranking cities against thresholds that differ per city would compare
    // events that are not the same event. The cost is that 25 of 90 cities
    // have never had one — which "never" states plainly and "0 days" did not.
    eyebrow: "Longest streak above 35°C, any year on record",
    get: (r) => r.max_consecutive_hot_days,
    format: (v) => (v === 0 ? "never" : `${v.toFixed(0)} days`),
    sort: "desc",
    color: "var(--heat-orange)",
    baseline: "zero",
  },
];

const TOP_N = 15;

export default function RankingsTable({
  data,
  metric,
  onMetricChange,
}: {
  data: RankingsResponse;
  /** Controlled rather than owning its own state — DESIGN.md §6 wants the
   *  same picker driving both this table and the map above it, which needs
   *  the selection lifted to a shared parent (`RankingsSection`). */
  metric: MetricKey;
  onMetricChange: (next: MetricKey) => void;
}) {
  const active = METRICS.find((m) => m.key === metric)!;

  // DESIGN.md §7: "Render NullDataWarning wherever coverage ... falls below
  // 90% ... any ranking row built on a thin region." There's no single
  // "expected" year count exposed here to divide against, so thin is
  // relative to the fullest row actually in this dataset — today that's
  // every row (all 90 currently load the full 77-year span), so this marks
  // nothing yet, but it is live logic, not a hypothetical: a partially
  // bootstrapped city added later would trip it immediately.
  const maxYearsLoaded = Math.max(1, ...data.results.map((r) => r.years_loaded));

  const { ranked, domainMin, domainMax } = useMemo(() => {
    const all = data.results
      .map((r) => ({ entry: r, value: active.get(r) }))
      .filter((r): r is { entry: RankingEntry; value: number } => r.value !== null);

    // Domain is computed over the FULL population, not the visible top-N — the
    // bar must encode each city's real magnitude, never its rank position in a
    // 15-row window (which exaggerated a 0.8°C spread into a 100%→4% sweep).
    const values = all.map((r) => r.value);
    const trueMin = values.length ? Math.min(...values) : 0;
    const trueMax = values.length ? Math.max(...values) : 1;

    all.sort((a, b) =>
      active.sort === "desc" ? b.value - a.value : a.value - b.value,
    );

    return {
      ranked: all.slice(0, TOP_N),
      // "zero" baseline clamps to <=0 so a stray negative (e.g. a cooling
      // trend) can't push the floor above 0 and invert the scale.
      domainMin: active.baseline === "min" ? trueMin : Math.min(0, trueMin),
      domainMax: trueMax,
    };
  }, [data, active]);

  const span = Math.max(domainMax - domainMin, 1e-6);

  return (
    <section className="card p-6">
      <div className="mb-5">
        <SegmentedControl
          name="rankings-metric"
          label="Ranking metric"
          variant="ghost"
          options={METRICS.map((m) => ({ value: m.key, label: m.label }))}
          value={metric}
          onChange={onMetricChange}
        />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="eyebrow">{active.eyebrow}</p>
        {/* Disclose the axis. This is what makes the temperature scale honest:
            the reader can see the bars run 25.6–30.8°C, not 0–30.8°C. */}
        <p className="font-numeric text-2xs text-text-muted">
          scale {active.format(domainMin)} – {active.format(domainMax)}
        </p>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Across all {data.results.length} cities with a complete 1950–present
        ERA5 record.
      </p>

      <ol className="mt-5 space-y-1">
        {ranked.map((row, i) => {
          // Honest, disclosed: fraction of the metric's real domain.
          const pct = ((row.value - domainMin) / span) * 100;
          const width = Math.min(100, Math.max(pct, 2));

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
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-text-primary">
                        {row.entry.region.name}
                      </span>
                      {row.entry.years_loaded < maxYearsLoaded * 0.9 && (
                        <span className="shrink-0 text-xs text-drought-amber">
                          <span aria-hidden>⚠</span>
                          {/* title is not reliably announced (see
                              LeadersOverTime's own note on the same
                              limitation) — a real sr-only text alternative
                              instead. */}
                          <span className="sr-only">
                            {" "}
                            Incomplete coverage — {row.entry.years_loaded} of{" "}
                            {maxYearsLoaded} years loaded
                          </span>
                        </span>
                      )}
                    </span>
                    <span className="font-numeric shrink-0 text-sm font-medium text-text-primary">
                      {active.format(row.value)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-inset">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${width}%`, background: active.color }}
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

      {/* Why a city you know is hot might rank mid-pack, and why the list isn't
          exhaustive — the two things a reader will reasonably doubt. */}
      <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-text-muted">
        Values come from ERA5 reanalysis, which smooths very local effects like
        urban heat islands — so a dense city can rank cooler here than it feels
        on the ground. Rankings cover the {data.results.length} cities loaded so
        far, not every city in Indonesia.
      </p>
    </section>
  );
}
