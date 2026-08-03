export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Format a climate number to 1 decimal place; em-dash for null. */
export function fmt(value: number | null | undefined, unit = ""): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}${unit}`;
}

/**
 * Mean day–night swing (avg daily high − avg daily low) across the year's
 * climatology. A small swing means warm nights / a maritime climate — the city
 * can average warmer than a rival while peaking lower in the afternoon.
 */
export function diurnalSwing(
  climatology: { avg_temp_max: number | null; avg_temp_min: number | null }[],
): number | null {
  const pairs = climatology.filter(
    (c) => c.avg_temp_max !== null && c.avg_temp_min !== null,
  );
  if (!pairs.length) return null;
  const sum = pairs.reduce(
    (s, c) => s + (c.avg_temp_max! - c.avg_temp_min!),
    0,
  );
  return sum / pairs.length;
}

/** Day-of-year (1–365) to an approximate "Mon D" label. */
export function doyToLabel(doy: number): string {
  const d = new Date(2001, 0, 1);
  d.setDate(doy);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Percentage change described as ↑/↓ with magnitude. */
export function trendDelta(
  slope: number | null,
  years: number,
): { direction: "up" | "down" | "flat"; magnitude: number } {
  if (slope === null || slope === 0) return { direction: "flat", magnitude: 0 };
  const total = slope * years;
  return {
    direction: total > 0 ? "up" : "down",
    magnitude: Math.abs(total),
  };
}
