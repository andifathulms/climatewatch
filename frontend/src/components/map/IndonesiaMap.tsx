"use client";

import * as d3 from "d3";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
      [[PAD, PAD], [WIDTH - PAD, WIDTH - PAD]],
      feature,
    );
    const [[x0, y0], [x1, y1]] = d3.geoPath(probe).bounds(feature);
    const height = (y1 - y0) + PAD * 2;

    const projection = d3.geoMercator().fitExtent(
      [[PAD, PAD], [WIDTH - PAD, height - PAD]],
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
      <ChartHeader eyebrow="Coverage" title="Cities with real data">
        <p className="font-numeric text-xs text-text-muted">
          {loaded} / {regions.length} loaded
        </p>
      </ChartHeader>

      <div ref={wrapRef} className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label="Map of Indonesia with a dot for every seeded city, colored by whether real climate data has been loaded"
        >
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
              <circle
                key={r.id}
                cx={x}
                cy={y}
                r={focused ? 8 : active ? 6 : 4.5}
                fill={active ? "var(--rain-blue)" : "var(--drought-amber)"}
                fillOpacity={active ? 0.9 : 0.55}
                stroke={focused ? "var(--text-primary)" : "none"}
                strokeWidth={focused ? 1.5 : 0}
                className="cursor-pointer transition-[r] duration-100"
                onMouseMove={(e) => {
                  const box = wrapRef.current?.getBoundingClientRect();
                  if (!box) return;
                  setTip({
                    x: e.clientX - box.left,
                    y: e.clientY - box.top,
                    region: r,
                  });
                }}
                onMouseLeave={() => setTip((t) => (t?.region.id === r.id ? null : t))}
                onClick={() => router.push(`/city/${r.slug}`)}
              />
            );
          })}
        </svg>

        {tip && (
          <div
            role="status"
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
              className="font-numeric mt-1.5 text-[11px]"
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
