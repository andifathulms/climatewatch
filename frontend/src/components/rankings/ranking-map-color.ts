import * as d3 from "d3";
import type { RankingEntry, RankingsResponse, Region } from "@/lib/types";
import { RAMPS, ANOMALY_RAMP } from "@/components/fingerprint/color-scale";
import type { MetricKey } from "./RankingsTable";
import { METRICS } from "./RankingsTable";

/**
 * Which fingerprint ramp a rankings metric borrows — DESIGN.md §6: "Colour
 * cities by the selected metric — the anomaly ramp when the metric is signed
 * (warming since 1950), the appropriate sequential ramp when it is not."
 *
 * DESIGN.md names the rule, not the mapping — these five sequential ramps
 * were built for the fingerprint's four variables, and rankings has six
 * metrics, so two ramps each cover more than one metric here. Chosen by
 * family: temperature metrics get temp_max, rain-amount metrics get
 * precipitation (wettest and driest share it deliberately — colour encodes
 * the same avg_annual_precipitation value either sort order ranks by, so a
 * city is not two different colours depending which list you are looking
 * at), day-count heat metrics get hot_days. "warming" is the one signed
 * metric and gets the diverging ramp, not a sequential one.
 */
const SEQUENTIAL_RAMP_FOR: Record<Exclude<MetricKey, "warming">, string[]> = {
  hottest: RAMPS.temp_max,
  wettest: RAMPS.precipitation,
  driest: RAMPS.precipitation,
  extreme_rain: RAMPS.precipitation,
  heatwave: RAMPS.hot_days,
};

export interface MapMetricConfig {
  label: string;
  getValue: (region: Region) => number | null;
  color: (value: number) => string;
  format: (value: number) => string;
  /** For the legend: the low/high end of the scale actually in use. */
  domain: [number, number];
  /** True for "warming" — the diverging ramp, zero-marked legend. */
  diverging: boolean;
}

/**
 * Builds the map's colour function for the currently selected ranking
 * metric. Joins `RankingsResponse.results` (which carries the metric values
 * but not lat/long) to `Region[]` (which has coordinates but not the metric)
 * by region id — the two responses are fetched separately because rankings
 * covers only bootstrapped cities while `allRegions()` covers every seeded
 * one, has_data or not.
 */
export function buildMapMetricConfig(
  metricKey: MetricKey,
  data: RankingsResponse,
): MapMetricConfig {
  const active = METRICS.find((m) => m.key === metricKey)!;
  const byRegionId = new Map<number, RankingEntry>(
    data.results.map((r) => [r.region.id, r]),
  );
  const getValue = (region: Region): number | null => {
    const entry = byRegionId.get(region.id);
    return entry ? active.get(entry) : null;
  };

  const values = data.results
    .map((r) => active.get(r))
    .filter((v): v is number => v !== null);

  if (metricKey === "warming") {
    const maxAbs = values.length
      ? Math.max(...values.map((v) => Math.abs(v)))
      : 1;
    const interp = d3.interpolateRgbBasis(ANOMALY_RAMP);
    const scale = d3.scaleSequential(interp).domain([-maxAbs, maxAbs]);
    return {
      label: active.label,
      getValue,
      color: (v) => scale(v) as string,
      format: active.format,
      domain: [-maxAbs, maxAbs],
      diverging: true,
    };
  }

  const lo = values.length ? Math.min(...values) : 0;
  const hi = values.length ? Math.max(...values) : 1;
  const ramp = SEQUENTIAL_RAMP_FOR[metricKey];
  const interp = d3.interpolateRgbBasis(ramp);
  const scale = d3.scaleSequential(interp).domain([lo, hi]);
  return {
    label: active.label,
    getValue,
    color: (v) => scale(v) as string,
    format: active.format,
    domain: [lo, hi],
    diverging: false,
  };
}
