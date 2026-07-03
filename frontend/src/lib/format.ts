export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Format a climate number to 1 decimal place; em-dash for null. */
export function fmt(value: number | null | undefined, unit = ""): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}${unit}`;
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
