import * as d3 from "d3";
import type { FingerprintStats, FingerprintVariable } from "@/lib/types";

/*
 * The fingerprint's color scale, deliberately kept out of
 * ClimateFingerprint.tsx: that file is a "use client" module, and a server
 * component importing from it receives a client-reference proxy rather than
 * the function itself. Both the interactive fingerprint and the server-
 * rendered landing-page preview import from here, so the two can never drift
 * apart into two different-looking encodings of the same data.
 */

/**
 * Sequential ramps for the Musim Nokturnal (dark) surface.
 *
 * Anchored dark→vivid, not dark→pale. An earlier version of this ramp bottomed
 * out at a pale tint at the high end (e.g. near-white blue for max rainfall) —
 * technically the brightest cell, but pale/desaturated colors read as "faint"
 * regardless of lightness, so high-magnitude cells looked weaker than the
 * saturated-but-dark low-magnitude ones. Perceived "intensity" tracks
 * saturation more than raw lightness, so the fix keeps the low end dark *and*
 * muted (blends into the canvas, doesn't compete for attention) while the
 * high end is dark→light but stays fully saturated (vivid, "loud") the whole
 * way — never fading to pastel. That also satisfies the plain-language
 * reading "darker/more colorful = more rain/heat".
 *
 * Each ramp holds a single hue and is verified monotonic in both L* and
 * saturation (no dip at the top), and keeps its zero end chromatic so a true
 * zero stays distinct from a null cell (ΔE 13–26 vs --null-cell). Do not swap
 * these for the d3 built-ins.
 */
export const RAMPS: Record<FingerprintVariable, string[]> = {
  precipitation: [
    "#122A42",
    "#1A4E7C",
    "#1C74AC",
    "#1998D6",
    "#22BBEF",
    "#4FD8FF",
  ],
  temp_max: ["#2A1608", "#5C2A0E", "#9C3D14", "#D6591C", "#EE7A1E", "#FFA028"],
  hot_days: ["#3A1010", "#7A1E1A", "#B93227", "#E05B3D", "#F5794A", "#FF8A3C"],
  dry_days: ["#2E2108", "#5E4310", "#8F6816", "#C08F1C", "#E0B324", "#F5CC2E"],
};

/** Build the D3 sequential color scale for a variable (domains per CLAUDE.md). */
export function buildColorScale(
  variable: FingerprintVariable,
  stats: FingerprintStats,
) {
  const p90 = stats.p90 ?? stats.max ?? 1;
  const p10 = stats.p10 ?? stats.min ?? 0;
  const max = stats.max ?? 1;
  const interp = d3.interpolateRgbBasis(RAMPS[variable]);
  switch (variable) {
    case "precipitation":
      return d3.scaleSequential(interp).domain([0, p90]);
    case "temp_max":
      return d3.scaleSequential(interp).domain([p10, p90]);
    case "hot_days":
      return d3.scaleSequential(interp).domain([0, max]);
    case "dry_days":
      return d3.scaleSequential(interp).domain([0, max]);
  }
}
