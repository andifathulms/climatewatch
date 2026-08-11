"use client";

import * as d3 from "d3";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { MultiPolygon } from "geojson";
import type { Region } from "@/lib/types";
import { ChartHeader } from "@/components/charts/chart-ui";

interface Tip {
  x: number;
  y: number;
  region: Region;
}

const WIDTH = 1000;
const PAD = 16;

/**
 * Every seeded region plotted on Indonesia's real coastline (Natural Earth
 * 50m, via world-atlas — extracted server-side in lib/indonesia-geo.ts so the
 * client only receives this one country's geometry, not the whole world's).
 *
 * d3-geo is a projection/geometry library, distinct from the general d3
 * selection-DOM API the fingerprint uses — Recharts has no map support, so a
 * geo projection is the only way to place dots on an actual coastline. d3 is
 * already a dependency; this doesn't add a new one.
 */
export default function IndonesiaMap({
  regions,
  geometry,
}: {
  regions: Region[];
  geometry: MultiPolygon;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const loaded = regions.filter((r) => r.has_data).length;

  const { pathData, project, height } = useMemo(() => {
    const feature: GeoJSON.Feature<MultiPolygon> = {
      type: "Feature",
      properties: {},
      geometry,
    };

    // Fit the coastline to a square-ish box first to measure its true aspect
    // ratio, then re-fit to that exact height so the SVG has no dead margin.
    const probe = d3.geoMercator().fitExtent(
      [
        [PAD, PAD],
        [WIDTH - PAD, WIDTH - PAD],
      ],
      feature,
    );
    const [[x0, y0], [x1, y1]] = d3.geoPath(probe).bounds(feature);
    const height = y1 - y0 + PAD * 2;

    const projection = d3.geoMercator().fitExtent(
      [
        [PAD, PAD],
        [WIDTH - PAD, height - PAD],
      ],
      feature,
    );
    const path = d3.geoPath(projection);

    return {
      height,
      pathData: path(feature) ?? "",
      project: (lon: number, lat: number) => {
        const p = projection([lon, lat]);
        return p ? { x: p[0], y: p[1] } : { x: -100, y: -100 };
      },
    };
  }, [geometry]);

  return (
    <section className="card overflow-hidden p-6">
      {/* Reads to a visitor, not to whoever runs the ingest. The old header
          ("Cities with real data" / "12 / 45 loaded") framed the map as a
          pipeline status board and led with the shortfall rather than the
          coverage. Same numbers, phrased as reach. */}
      <ChartHeader eyebrow="Coverage" title="Pick a city from the map">
        <p className="text-xs text-text-muted">
          <span className="font-numeric text-text-secondary">{loaded}</span>{" "}
          cities charted across the archipelago
        </p>
      </ChartHeader>

      <div ref={wrapRef} className="relative">
        {/* role="img" removed on purpose: it collapses the subtree into a
            single node, which would hide the 94 city links from assistive tech
            the moment they became real links. The <title> below names the
            graphic instead, and the markers are announced as what they are. */}
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="h-auto w-full"
          aria-labelledby="map-title"
        >
          <title id="map-title">
            Map of Indonesia. Every loaded city is a link to its climate page.
          </title>
          <path
            d={pathData}
            fill="var(--surface-inset)"
            stroke="var(--border-strong)"
            strokeWidth={1}
          />

          {regions.map((r) => {
            const { x, y } = project(r.longitude, r.latitude);
            const active = r.has_data;
            const focused = tip?.region.id === r.id;
            return (
              // A real <a>, not a click handler on a <circle>. That gives
              // keyboard focus, Enter activation and link semantics from the
              // browser, and the <title> supplies the accessible name — so
              // this needs no role, no tabIndex and no aria-label. Previously
              // the marker was a bare <circle> with onClick: unreachable
              // without a mouse. (WCAG 2.1.1)
              <Link
                key={r.id}
                href={`/city/${r.slug}`}
                className="map-marker"
                onMouseMove={(e) => {
                  const box = wrapRef.current?.getBoundingClientRect();
                  if (!box) return;
                  setTip({
                    x: e.clientX - box.left,
                    y: e.clientY - box.top,
                    region: r,
                  });
                }}
                onMouseLeave={() =>
                  setTip((t) => (t?.region.id === r.id ? null : t))
                }
              >
                {/* One interpolated string, not several children: React
                    special-cases <title> and silently renders nothing when it
                    has more than one child — which left all 94 links unnamed
                    on the first attempt at this fix. */}
                <title>{`${r.name}, ${r.province}${
                  active ? "" : " — no climate data loaded yet"
                }`}</title>
                <circle
                  cx={x}
                  cy={y}
                  r={focused ? 8 : active ? 6 : 4.5}
                  fill={active ? "var(--rain-blue)" : "var(--drought-amber)"}
                  fillOpacity={active ? 0.9 : 0.55}
                  stroke={focused ? "var(--text-primary)" : "none"}
                  strokeWidth={focused ? 1.5 : 0}
                  className="cursor-pointer transition-[r] duration-100"
                />
              </Link>
            );
          })}
        </svg>

        {tip && (
          // Pointer-following tooltip, not a status message — see the same
          // note in ClimateFingerprint. The city list is reachable by
          // keyboard from the markers themselves.
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 rounded-lg border border-border-strong bg-canvas-deep px-3 py-2 shadow-float"
            style={{
              left: tip.x > WIDTH * 0.7 ? tip.x - 150 : tip.x + 14,
              top: tip.y + 14,
            }}
          >
            <div className="text-sm font-medium text-text-primary">
              {tip.region.name}
            </div>
            <div className="mt-0.5 text-xs text-text-muted">
              {tip.region.province}
            </div>
            <div
              className="font-numeric mt-1.5 text-2xs"
              style={{
                color: tip.region.has_data
                  ? "var(--rain-blue)"
                  : "var(--drought-amber)",
              }}
            >
              {tip.region.has_data ? "Data loaded" : "Not loaded yet"}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
