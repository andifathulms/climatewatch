"use client";

import * as d3 from "d3";
import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import type { MultiPolygon } from "geojson";
import type { Region } from "@/lib/types";
import { L } from "@/lib/i18n";
import { useT } from "@/lib/use-lang";

interface Tip {
  x: number;
  y: number;
  region: Region;
}

const WIDTH = 1000;
const PAD = 16;

/**
 * Every seeded region plotted on Indonesia's real coastline (Natural Earth
 * 50m via world-atlas, extracted server-side in lib/indonesia-geo.ts).
 *
 * Coloured by a metric when one is passed (home: warming rate; rankings:
 * the selected ranking), so the map says *what*, not only *where*. It can
 * also be driven from outside: `highlighted` lights one marker (rankings
 * rows hover it), `selected` marks the active city (home hero), and
 * `onSelect` turns a click into a selection instead of a navigation.
 */
export interface MapMetric {
  label: string;
  getValue: (region: Region) => number | null;
  color: (value: number) => string;
  format: (value: number) => string;
  domain: [number, number];
  diverging: boolean;
}

/** Two decimals is ~0.1px at this viewBox; server and client floats then
 *  serialise identically, which the raw projection output did not. */
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function IndonesiaMap({
  regions,
  geometry,
  metric = null,
  selected = null,
  highlighted = null,
  onSelect,
  onHover,
  header,
  bare = false,
}: {
  regions: Region[];
  geometry: MultiPolygon;
  metric?: MapMetric | null;
  selected?: string | null;
  highlighted?: string | null;
  /** When given, clicking a marker selects instead of navigating. */
  onSelect?: (slug: string) => void;
  onHover?: (slug: string | null) => void;
  /** Replaces the default header row. */
  header?: ReactNode;
  /** No card chrome — for embedding inside another panel. */
  bare?: boolean;
}) {
  const t = useT();
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
    const probe = d3.geoMercator().fitExtent(
      [
        [PAD, PAD],
        [WIDTH - PAD, WIDTH - PAD],
      ],
      feature,
    );
    const [[, y0], [, y1]] = d3.geoPath(probe).bounds(feature);
    const height = r2(y1 - y0 + PAD * 2);
    const projection = d3.geoMercator().fitExtent(
      [
        [PAD, PAD],
        [WIDTH - PAD, height - PAD],
      ],
      feature,
    );
    const path = d3.geoPath(projection).digits(1);
    return {
      height,
      pathData: path(feature) ?? "",
      project: (lon: number, lat: number) => {
        const p = projection([lon, lat]);
        return p ? { x: r2(p[0]), y: r2(p[1]) } : { x: -100, y: -100 };
      },
    };
  }, [geometry]);

  // Highlighted/selected markers are drawn last so they sit on top.
  const ordered = useMemo(() => {
    const top = new Set([selected, highlighted].filter(Boolean));
    return [...regions.filter((r) => !top.has(r.slug)), ...regions.filter((r) => top.has(r.slug))];
  }, [regions, selected, highlighted]);

  const legend = metric ? (
    <div className="flex items-center gap-2.5">
      <span className="font-numeric text-2xs text-text-muted">
        {metric.format(metric.domain[0])}
      </span>
      <span
        aria-hidden
        className="relative h-2 w-28 rounded-full ring-1 ring-inset ring-border"
        style={{ background: `linear-gradient(to right, ${gradientStops.join(", ")})` }}
      >
        {metric.diverging && (
          <span className="absolute -top-1 left-1/2 h-4 w-px -translate-x-1/2 bg-text-primary" />
        )}
      </span>
      <span className="font-numeric text-2xs text-text-muted">
        {metric.format(metric.domain[1])}
      </span>
    </div>
  ) : (
    <p className="text-xs text-text-muted">
      <span className="font-numeric text-text-secondary">{loaded}</span>{" "}
      <L en="cities charted across the archipelago" id="kota di seluruh nusantara" />
    </p>
  );

  const body = (
    <>
      {header !== undefined ? (
        header
      ) : (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">
              {metric ? <L en="Map" id="Peta" /> : <L en="Coverage" id="Cakupan" />}
            </p>
            <h3 className="mt-1.5 font-display text-xl font-semibold">
              {metric ? metric.label : <L en="Pick a city from the map" id="Pilih kota dari peta" />}
            </h3>
          </div>
          {legend}
        </div>
      )}

      <div
        ref={wrapRef}
        className="relative"
        onKeyDown={(e) => {
          if (e.key === "Escape") setTip(null);
        }}
      >
        {/* No role="img": it would hide the city links from assistive tech. */}
        <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-auto w-full" aria-labelledby="map-title">
          <title id="map-title">
            {t(
              "Map of Indonesia. Every loaded city is a link to its climate page.",
              "Peta Indonesia. Setiap kota yang dimuat adalah tautan ke halaman iklimnya.",
            )}
          </title>
          <path d={pathData} fill="var(--surface-inset)" stroke="var(--border-strong)" strokeWidth={1} />

          {ordered.map((r) => {
            const { x, y } = project(r.longitude, r.latitude);
            const active = r.has_data;
            const lit =
              tip?.region.id === r.id || highlighted === r.slug || selected === r.slug;
            const metricValue = metric ? metric.getValue(r) : null;
            const fill = metric
              ? metricValue !== null
                ? metric.color(metricValue)
                : "var(--null-cell)"
              : active
                ? "var(--rain-blue)"
                : "var(--drought-amber)";
            const opacity = metric ? (metricValue !== null ? 0.95 : 0.5) : active ? 0.9 : 0.55;
            const label = metric
              ? `${r.name}, ${r.province}${metricValue !== null ? ` — ${metric.format(metricValue)}` : ""}`
              : `${r.name}, ${r.province}${active ? "" : t(" — not loaded yet", " — belum dimuat")}`;
            return (
              <Link
                key={r.id}
                href={`/city/${r.slug}`}
                className="map-marker"
                onClick={(e) => {
                  if (onSelect && active) {
                    e.preventDefault();
                    onSelect(r.slug);
                  }
                }}
                onMouseMove={(e) => {
                  const box = wrapRef.current?.getBoundingClientRect();
                  if (!box) return;
                  setTip({ x: e.clientX - box.left, y: e.clientY - box.top, region: r });
                  onHover?.(r.slug);
                }}
                onMouseLeave={() => {
                  setTip((tp) => (tp?.region.id === r.id ? null : tp));
                  onHover?.(null);
                }}
                onFocus={() => {
                  const box = wrapRef.current?.getBoundingClientRect();
                  if (!box) return;
                  setTip({ x: (x / WIDTH) * box.width, y: (y / WIDTH) * box.width, region: r });
                  onHover?.(r.slug);
                }}
                onBlur={() => {
                  setTip((tp) => (tp?.region.id === r.id ? null : tp));
                  onHover?.(null);
                }}
              >
                {/* One interpolated string: React renders nothing for a
                    <title> with several children. */}
                <title>{label}</title>
                {selected === r.slug && (
                  <circle cx={x} cy={y} r={14} fill="none" stroke="var(--text-primary)" strokeWidth={1.5} opacity={0.6} />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={lit ? 9 : active ? 6 : 4.5}
                  fill={fill}
                  fillOpacity={opacity}
                  stroke={lit ? "var(--text-primary)" : "var(--canvas)"}
                  strokeWidth={lit ? 2 : 1}
                  className="cursor-pointer transition-[r] duration-150"
                />
              </Link>
            );
          })}
        </svg>

        {tip && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 rounded-lg border border-border-strong bg-canvas-deep px-3 py-2 shadow-float"
            style={{
              left: tip.x > (wrapRef.current?.clientWidth ?? WIDTH) * 0.7 ? tip.x - 160 : tip.x + 14,
              top: tip.y + 14,
            }}
          >
            <div className="text-sm font-semibold text-text-primary">{tip.region.name}</div>
            <div className="mt-0.5 text-xs text-text-muted">{tip.region.province}</div>
            <div className="font-numeric mt-1.5 text-2xs text-text-secondary">
              {metric
                ? metric.getValue(tip.region) !== null
                  ? metric.format(metric.getValue(tip.region) as number)
                  : t("No data for this metric", "Tidak ada data untuk ukuran ini")
                : tip.region.has_data
                  ? t("Open climate record →", "Buka catatan iklim →")
                  : t("Not loaded yet", "Belum dimuat")}
            </div>
          </div>
        )}
      </div>
      {header !== undefined && metric && <div className="mt-3">{legend}</div>}
    </>
  );

  return bare ? <div>{body}</div> : <section className="card overflow-hidden p-5 sm:p-6">{body}</section>;
}
