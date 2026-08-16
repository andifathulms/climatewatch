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
export interface MapMetric {
  label: string;
  getValue: (region: Region) => number | null;
  color: (value: number) => string;
  format: (value: number) => string;
  domain: [number, number];
  diverging: boolean;
}

export default function IndonesiaMap({
  regions,
  geometry,
  metric = null,
}: {
  regions: Region[];
  geometry: MultiPolygon;
  /** DESIGN.md §6: colours cities by a ranking metric instead of the default
   *  has-data/not-loaded distinction. `null` (the homepage's usage) keeps the
   *  original blue/amber coverage colouring. */
  metric?: MapMetric | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const loaded = regions.filter((r) => r.has_data).length;

  const gradientStops = useMemo(() => {
    if (!metric) return [];
    const [lo, hi] = metric.domain;
    return Array.from({ length: 6 }, (_, i) =>
      metric.color(lo + (i / 5) * (hi - lo)),
    );
  }, [metric]);

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
      <ChartHeader
        eyebrow={metric ? "Rankings" : "Coverage"}
        title={metric ? metric.label : "Pick a city from the map"}
      >
        {metric ? (
          <div className="flex items-center gap-2.5">
            <span className="font-numeric text-2xs text-text-muted">
              {metric.format(metric.domain[0])}
            </span>
            <span
              aria-hidden
              className="h-2 w-24 rounded-full ring-1 ring-inset ring-border"
              style={{
                // Sampled from the same colour function the markers use,
                // rather than a second copy of the ramp — the legend cannot
                // drift from what is actually plotted.
                background: `linear-gradient(to right, ${gradientStops.join(", ")})`,
              }}
            />
            <span className="font-numeric text-2xs text-text-muted">
              {metric.format(metric.domain[1])}
            </span>
            {metric.diverging && (
              <span className="text-2xs text-text-muted">(0 at centre)</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-text-muted">
            <span className="font-numeric text-text-secondary">{loaded}</span>{" "}
            cities charted across the archipelago
          </p>
        )}
      </ChartHeader>

      <div
        ref={wrapRef}
        className="relative"
        onKeyDown={(e) => {
          if (e.key === "Escape") setTip(null);
        }}
      >
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
            const metricValue = metric ? metric.getValue(r) : null;
            const markerFill = metric
              ? metricValue !== null
                ? metric.color(metricValue)
                : "var(--null-cell)"
              : active
                ? "var(--rain-blue)"
                : "var(--drought-amber)";
            const markerOpacity = metric
              ? metricValue !== null
                ? 0.9
                : 0.5
              : active
                ? 0.9
                : 0.55;
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
                // 1.4.13: content available on hover must also be available on
                // focus, and must be dismissible without moving the pointer.
                // Positioned from the projected marker, not the pointer.
                onFocus={() => {
                  const box = wrapRef.current?.getBoundingClientRect();
                  if (!box) return;
                  setTip({
                    x: (x / WIDTH) * box.width,
                    y: (y / WIDTH) * box.width,
                    region: r,
                  });
                }}
                onBlur={() =>
                  setTip((t) => (t?.region.id === r.id ? null : t))
                }
              >
                {/* One interpolated string, not several children: React
                    special-cases <title> and silently renders nothing when it
                    has more than one child — which left all 94 links unnamed
                    on the first attempt at this fix. */}
                <title>
                  {metric
                    ? `${r.name}, ${r.province}${metricValue !== null ? ` — ${metric.format(metricValue)}` : " — no data for this metric"}`
                    : `${r.name}, ${r.province}${active ? "" : " — no climate data loaded yet"}`}
                </title>
                <circle
                  cx={x}
                  cy={y}
                  r={focused ? 8 : active ? 6 : 4.5}
                  fill={markerFill}
                  fillOpacity={markerOpacity}
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
                color: metric
                  ? (metric.getValue(tip.region) !== null
                      ? metric.color(metric.getValue(tip.region) as number)
                      : "var(--text-muted)")
                  : tip.region.has_data
                    ? "var(--rain-blue)"
                    : "var(--drought-amber)",
              }}
            >
              {metric
                ? metric.getValue(tip.region) !== null
                  ? metric.format(metric.getValue(tip.region) as number)
                  : "No data for this metric"
                : tip.region.has_data
                  ? "Data loaded"
                  : "Not loaded yet"}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
