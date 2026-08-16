import type { SeasonResponse, SeasonRow } from "@/lib/types";

/**
 * The Season layer's geometry — DESIGN.md §5.2 / §10 step 5.
 *
 * Kept out of ClimateFingerprint.tsx for the same reason baseline.ts is:
 * plain, testable functions over already-fetched data. Pixel placement
 * (which needs the grid's cell size/padding constants) stays in the
 * component; this module only maps a day-of-year onto a (month, day)
 * pair and groups points into break-separated runs.
 */

/** Non-leap reference year, matching `doyToLabel`/`doyTick` elsewhere in
 *  this app — ERA5 day-of-year values are computed the same way. */
const REF_YEAR = 2001;

export function doyToMonthDay(doy: number): { month: number; day: number } {
  const d = new Date(REF_YEAR, 0, 1);
  d.setDate(doy);
  return { month: d.getMonth() + 1, day: d.getDate() };
}

export interface SeasonPoint {
  /** The calendar year this point's (month, day) falls in — not
   *  necessarily the `SeasonRow.year` it was stored against; see
   *  `endPoints` below. */
  year: number;
  month: number;
  day: number;
}

/** Onset points: one per row with a defined onset, in the row's own year. */
export function onsetPoints(rows: SeasonRow[]): SeasonPoint[] {
  const out: SeasonPoint[] = [];
  for (const r of rows) {
    if (r.wet_season_onset_doy === null) continue;
    out.push({ year: r.year, ...doyToMonthDay(r.wet_season_onset_doy) });
  }
  return out;
}

/**
 * End points: one per row with a defined end — placed in `row.year + 1`,
 * never `row.year`. CLAUDE.md's onset rule scans from Aug 1 within a single
 * year; `SeasonLengthChart`'s own comment on the end rule ("the last such
 * spell before Aug 1 of the following year") means the stored end day-of-year
 * is always a date in the calendar year *after* the row it's attached to —
 * confirmed against the actual export (e.g. Jakarta 1950's end_doy is 99,
 * April, which is only sensible as April 1951). Plotting it at `row.year`
 * would place it four to eight months before the record it actually
 * describes.
 */
export function endPoints(rows: SeasonRow[]): SeasonPoint[] {
  const out: SeasonPoint[] = [];
  for (const r of rows) {
    if (r.wet_season_end_doy === null) continue;
    out.push({ year: r.year + 1, ...doyToMonthDay(r.wet_season_end_doy) });
  }
  return out;
}

/**
 * DESIGN.md §5.2: "Years with no detectable wet season: the line breaks. It
 * does not interpolate across the gap." Given `years` in the order they are
 * actually drawn (whatever the current zoom window is) and a point for each
 * year that has one, returns runs of consecutive, calendar-adjacent years —
 * never a run spanning a null year or a window boundary.
 */
export function breakIntoRuns(
  years: readonly number[],
  pointByYear: Map<number, SeasonPoint>,
): SeasonPoint[][] {
  const runs: SeasonPoint[][] = [];
  let current: SeasonPoint[] = [];
  let prevYear: number | null = null;

  for (const year of years) {
    const point = pointByYear.get(year);
    const adjacent = prevYear !== null && Math.abs(year - prevYear) === 1;
    if (!point || !adjacent) {
      if (current.length > 0) runs.push(current);
      current = [];
    }
    if (point) current.push(point);
    prevYear = year;
  }
  if (current.length > 0) runs.push(current);
  return runs;
}

/** DESIGN.md §5.2: "Count the breaks ... state the count in the layer's
 *  caption." Counted from the full record (`data.results`), not whatever
 *  zoom window happens to be visible — the same convention the anomaly
 *  domain and every other record-level stat on this grid already follows. */
export function seasonBreakCounts(data: SeasonResponse): {
  onsetMissing: number;
  endMissing: number;
} {
  return {
    onsetMissing: data.null_onset_years,
    endMissing: data.results.filter((r) => r.wet_season_end_doy === null)
      .length,
  };
}
