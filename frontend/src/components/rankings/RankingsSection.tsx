"use client";

import { useState } from "react";
import type { MultiPolygon } from "geojson";
import type { Region, RankingsResponse } from "@/lib/types";
import RankingsTable, { type MetricKey } from "./RankingsTable";
import { buildMapMetricConfig } from "./ranking-map-color";
import IndonesiaMap from "@/components/map/IndonesiaMap";

/**
 * Shares the selected ranking metric between the choropleth map and the
 * table below it — DESIGN.md §6: "The existing 6-metric segmented control
 * drives both map and table." The control itself still lives inside
 * `RankingsTable`; this just lifts *which* metric is selected one level up
 * so `IndonesiaMap` can read the same choice.
 */
export default function RankingsSection({
  regions,
  geometry,
  rankings,
}: {
  regions: Region[];
  geometry: MultiPolygon;
  rankings: RankingsResponse;
}) {
  const [metric, setMetric] = useState<MetricKey>("hottest");
  const mapMetric = buildMapMetricConfig(metric, rankings);

  return (
    <>
      <IndonesiaMap regions={regions} geometry={geometry} metric={mapMetric} />
      <RankingsTable data={rankings} metric={metric} onMetricChange={setMetric} />
    </>
  );
}
