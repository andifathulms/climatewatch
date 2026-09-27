import type { StripeSeries } from "@/lib/types";

const WINDOW = 10;

function meanOf(values: (number | null)[]): number | null {
  const v = values.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/**
 * First-decade vs last-decade average daily high, in °C, from a city's
 * stripes (baseline + anomaly = the absolute annual mean). Ten-year means at
 * both ends so one hot or cool year cannot swing the comparison.
 */
export function decadeChange(s: StripeSeries) {
  const n = s.anomalies.length;
  const early = meanOf(s.anomalies.slice(0, WINDOW));
  const recent = meanOf(s.anomalies.slice(Math.max(0, n - WINDOW)));
  if (early === null || recent === null) return null;
  const lastYear = s.year_from + n - 1;
  return {
    early: s.baseline_c + early,
    recent: s.baseline_c + recent,
    delta: recent - early,
    earlyRange: `${s.year_from}–${s.year_from + WINDOW - 1}`,
    recentRange: `${lastYear - WINDOW + 1}–${lastYear}`,
    lastYear,
  };
}
