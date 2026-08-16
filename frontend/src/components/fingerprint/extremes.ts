import type { AnnualRow, ExtremesResponse } from "@/lib/types";

/**
 * The Extremes layer's rule — DESIGN.md §5.5 / §10 step 7.
 *
 * `ExtremesResponse.results` is one row per year (`AnnualRow`) — there is no
 * monthly breakdown of, say, "how many heavy-rain days fell in June 1998,"
 * only the year's total. DESIGN.md's "cells outlined ... where the month set
 * a record" can't be honoured at cell granularity for data that doesn't
 * exist at cell granularity, so this outlines the whole year's row instead —
 * the same accommodation the sr-only note for this layer states plainly,
 * rather than implying a precision the data doesn't have.
 *
 * The threshold itself: DESIGN.md's examples (">35°C days," ">100mm days,"
 * "longest dry spell") name three different metrics, not three different
 * rules for picking which years count. A flat ">0" would mark nearly every
 * year for a metric like longest dry spell (rarely zero) and a flat "top N"
 * would need a different N per metric's actual spread. The 90th-percentile
 * rule below is the one rule that works the same way for all eight metrics,
 * and — because it's a plain percentile — is the one a reader can verify
 * against the same p90 vocabulary the fingerprint's own sequential legend
 * already uses.
 */

export interface ExtremeMetric {
  key: keyof AnnualRow;
  label: string;
  short: string;
}

export const EXTREME_METRICS: ExtremeMetric[] = [
  // Local threshold first, and the default — matches ExtremeDaysChart's old
  // default and its reasoning: a fixed 35°C is zero for a quarter of the
  // country's cities across the whole record.
  { key: "hot_days_local", label: "Hot days (local)", short: "Hot days" },
  { key: "heavy_rain_days", label: "Heavy rain (>50mm)", short: "Heavy rain days" },
  { key: "extreme_rain_days", label: "Extreme rain (>100mm)", short: "Extreme rain days" },
  { key: "max_consecutive_dry_days", label: "Longest dry spell", short: "Dry spell (days)" },
  {
    key: "max_consecutive_hot_days_local",
    label: "Longest hot spell",
    short: "Hot spell (days)",
  },
  { key: "cool_days", label: "Cool days (<20°C)", short: "Cool days" },
  { key: "hot_days", label: "Hot days (>35°C)", short: "Hot days >35°C" },
  {
    key: "max_consecutive_hot_days",
    label: "Longest heatwave (>35°C)",
    short: "Heatwave (days)",
  },
];

/** 90th percentile (nearest-rank) of a metric's values across every year on
 *  record. `0` if there are no rows at all — callers must also check
 *  `results.length`, since a genuine 0 threshold and "no data" look the same
 *  as a bare number. */
export function metricP90(results: AnnualRow[], key: keyof AnnualRow): number {
  const values = results
    .map((r) => Number(r[key]))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  if (values.length === 0) return 0;
  const idx = Math.min(values.length - 1, Math.ceil(values.length * 0.9) - 1);
  return values[idx];
}

/**
 * Years whose value for `key` is in the top decile AND actually above zero —
 * the zero check keeps a low-signal metric (most years genuinely 0) from
 * outlining every zero-year just because 0 is also its own 90th percentile.
 */
export function outlinedYears(
  results: AnnualRow[],
  key: keyof AnnualRow,
): Set<number> {
  const threshold = metricP90(results, key);
  const out = new Set<number>();
  for (const r of results) {
    const v = Number(r[key]);
    if (Number.isFinite(v) && v > 0 && v >= threshold) out.add(r.year);
  }
  return out;
}

export function extremeMetricValue(row: AnnualRow, key: keyof AnnualRow): number | null {
  const v = Number(row[key]);
  return Number.isFinite(v) ? v : null;
}

/** Convenience for callers that only have the full response. */
export function outlinedYearsFor(
  data: ExtremesResponse,
  key: keyof AnnualRow,
): Set<number> {
  return outlinedYears(data.results, key);
}
