import type { FingerprintCell } from "@/lib/types";

/**
 * The Baseline layer's anomaly math — DESIGN.md §5.4 / §10 step 4.
 *
 * Kept out of ClimateFingerprint.tsx for the same reason color-scale.ts is:
 * plain functions over already-fetched data, easy to reason about and reuse
 * (FingerprintPanel needs the domain for its legend; ClimateFingerprint
 * needs it for cell fills) without duplicating the computation.
 */

/** The stated default baseline window — a 30-year climate-normal span, not
 *  picked for this feature: `Region.hot_day_threshold_c` already uses the
 *  same 1951-1980 reference period for its own percentile. PersonalBaseline's
 *  picker can move the start year; this is only the default until it does. */
export const BASELINE_FROM = 1951;
export const BASELINE_TO = 1980;

/** Years of record required after a chosen baseline start for both this
 *  layer's climatology and PersonalBaseline's own decade-endpoint comparison
 *  to mean anything. Shared so the two never offer different year ranges for
 *  what is, per DESIGN.md §5.4, meant to be one shared control. */
export const MIN_YEARS_AFTER_BASELINE = 20;

/**
 * Mean value per calendar month (index 0 = January) over an inclusive year
 * range, ignoring nulls. `null` at an index means that month had zero
 * non-null values in the window, not zero departure — callers must treat a
 * null climatology month as "no baseline," not "average of 0."
 */
export function monthlyClimatology(
  cells: FingerprintCell[],
  from: number,
  to: number,
): (number | null)[] {
  const sums = new Array(12).fill(0);
  const counts = new Array(12).fill(0);
  for (const c of cells) {
    if (c.value === null || c.year < from || c.year > to) continue;
    sums[c.month - 1] += c.value;
    counts[c.month - 1] += 1;
  }
  return sums.map((s, i) => (counts[i] > 0 ? s / counts[i] : null));
}

/** A cell's departure from its own calendar month's climatology, or `null`
 *  when either the cell's value or that month's climatology is undefined —
 *  never coerced to a numeric zero, per CLAUDE.md's null-handling rules. */
export function anomalyFor(
  value: number | null,
  month: number,
  climatology: (number | null)[],
): number | null {
  if (value === null) return null;
  const base = climatology[month - 1];
  if (base === null) return null;
  return value - base;
}

/**
 * DESIGN.md §5.4: "Symmetric domain: [-max(|min|,|max|), +max(|min|,|max|)]
 * ... never let the renderer derive an asymmetric domain from the data."
 * Returns the largest absolute departure across every cell that has both a
 * value and a defined climatology month — `null` if none does (e.g. the
 * window and the record's actual coverage never overlap).
 */
export function anomalyDomain(
  cells: FingerprintCell[],
  climatology: (number | null)[],
): number | null {
  let max = 0;
  let found = false;
  for (const c of cells) {
    const a = anomalyFor(c.value, c.month, climatology);
    if (a === null) continue;
    max = Math.max(max, Math.abs(a));
    found = true;
  }
  return found ? max : null;
}
