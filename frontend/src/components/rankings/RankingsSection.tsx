"use client";

import { useMemo, useState } from "react";
import type { MultiPolygon } from "geojson";
import type { Region, RankingsResponse, StripeSeries } from "@/lib/types";
import { L } from "@/lib/i18n";
import { useLang } from "@/lib/use-lang";
import SegmentedControl from "@/components/ui/SegmentedControl";
import RankingsTable, { metricsWithData, type MetricKey } from "./RankingsTable";
import { buildMapMetricConfig } from "./ranking-map-color";
import IndonesiaMap from "@/components/map/IndonesiaMap";
import DotPlot from "./DotPlot";

/**
 * One metric picker drives the map, the ranked list and the dot plot, and
 * the three are linked: hovering a row lights its dot on the map and on the
 * plot, hovering a map dot lights its row.
 */
export default function RankingsSection({
  regions,
  geometry,
  rankings,
  stripes,
}: {
  regions: Region[];
  geometry: MultiPolygon;
  rankings: RankingsResponse;
  stripes: StripeSeries[];
}) {
  const lang = useLang();
  const [metric, setMetric] = useState<MetricKey>("warming");
  const [hover, setHover] = useState<string | null>(null);
  const available = metricsWithData(rankings);
  const mapMetric = useMemo(
    () => buildMapMetricConfig(metric, rankings, lang),
    [metric, rankings, lang],
  );
  const stripeMap = useMemo(() => new Map(stripes.map((s) => [s.slug, s])), [stripes]);

  return (
    <section className="space-y-6">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <SegmentedControl
          name="rankings-metric"
          label={lang === "en" ? "Ranking measure" : "Ukuran peringkat"}
          options={available.map((m) => ({ value: m.key, label: lang === "en" ? m.en : m.id }))}
          value={metric}
          onChange={setMetric}
        />
      </div>

      <div className="card grid gap-8 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <IndonesiaMap
            regions={regions}
            geometry={geometry}
            metric={mapMetric}
            highlighted={hover}
            onHover={setHover}
            bare
            header={
              <h2 className="mb-3 font-display text-2xl font-semibold">{mapMetric.label}</h2>
            }
          />
          <div className="mt-8">
            <DotPlot data={rankings} metric={metric} highlighted={hover} color={mapMetric.color} />
          </div>
        </div>
        <RankingsTable
          data={rankings}
          metric={metric}
          stripes={stripeMap}
          highlighted={hover}
          onHover={setHover}
        />
      </div>

      <p className="max-w-prose text-xs leading-relaxed text-text-muted">
        <L
          en={`Values come from ERA5 reanalysis, which smooths very local effects such as urban heat islands, so a dense city can rank cooler here than it feels on the street. Rankings cover the ${rankings.results.length} cities loaded so far and exclude the current, incomplete year.`}
          id={`Nilai berasal dari reanalisis ERA5 yang menghaluskan efek sangat lokal seperti pulau panas perkotaan, jadi kota padat bisa berperingkat lebih sejuk daripada yang terasa di jalan. Peringkat mencakup ${rankings.results.length} kota yang sudah dimuat dan tidak menghitung tahun berjalan.`}
        />
      </p>
    </section>
  );
}
