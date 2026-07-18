"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Region } from "@/lib/types";
import { ChartHeader } from "@/components/charts/chart-ui";

interface Tip {
  x: number;
  y: number;
  region: Region;
}

/**
 * Every seeded region plotted at its real lat/lng — no coastline data, just
 * an equirectangular projection fit to the regions' own bounding box. Near
 * the equator that's accurate enough that the archipelago's shape emerges
 * from the dots themselves, with zero extra geo dependency.
 */
export default function IndonesiaMap({ regions }: { regions: Region[] }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const loaded = regions.filter((r) => r.has_data).length;

  const { project, width, height } = useMemo(() => {
    const lats = regions.map((r) => r.latitude);
    const lons = regions.map((r) => r.longitude);
    const latMin = Math.min(...lats);
    const latMax = Math.max(...lats);
    const lonMin = Math.min(...lons);
    const lonMax = Math.max(...lons);

    const padLat = (latMax - latMin) * 0.1 || 1;
    const padLon = (lonMax - lonMin) * 0.04 || 1;
    const lat0 = latMin - padLat;
    const lat1 = latMax + padLat;
    const lon0 = lonMin - padLon;
    const lon1 = lonMax + padLon;

    const width = 1000;
    const height = width * ((lat1 - lat0) / (lon1 - lon0));

    return {
      width,
      height,
      project: (lat: number, lon: number) => ({
        x: ((lon - lon0) / (lon1 - lon0)) * width,
        y: ((lat1 - lat) / (lat1 - lat0)) * height,
      }),
    };
  }, [regions]);

  return (
    <section className="card overflow-hidden p-6">
      <ChartHeader eyebrow="Coverage" title="Cities with real data">
        <p className="font-numeric text-xs text-text-muted">
          {loaded} / {regions.length} loaded
        </p>
      </ChartHeader>

      <div ref={wrapRef} className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label="Map of Indonesia with a dot for every seeded city, colored by whether real climate data has been loaded"
        >
          {regions.map((r) => {
            const { x, y } = project(r.latitude, r.longitude);
            const active = r.has_data;
            const focused = tip?.region.id === r.id;
            return (
              <circle
                key={r.id}
                cx={x}
                cy={y}
                r={focused ? 8 : active ? 6 : 4.5}
                fill={active ? "var(--rain-blue)" : "var(--border-strong)"}
                fillOpacity={active ? 0.85 : 0.5}
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
              left: tip.x > width * 0.7 ? tip.x - 150 : tip.x + 14,
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
                  : "var(--text-muted)",
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
