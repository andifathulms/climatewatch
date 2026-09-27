"use client";

import { useMemo } from "react";
import type { RankingsResponse } from "@/lib/types";
import { L } from "@/lib/i18n";
import { useLang } from "@/lib/use-lang";
import { METRICS, type MetricKey } from "./RankingsTable";

const W = 1000;
const H = 190;
const PADX = 24;
const BASE = H - 44;
const R = 7;

/**
 * Every city on one axis, on the metric's own range. Replaces bars that all
 * looked ~full: temperatures sit between 25 and 31 °C, so a zero-based bar
 * says nothing, and a min-based bar exaggerates. A dot's position on an
 * honest, labelled axis shows the spread instead. Cities with near-equal
 * values stack upward so none hides behind another.
 */
export default function DotPlot({
  data,
  metric,
  highlighted,
  color,
}: {
  data: RankingsResponse;
  metric: MetricKey;
  highlighted: string | null;
  color: (v: number) => string;
}) {
  const lang = useLang();
  const active = METRICS.find((m) => m.key === metric)!;

  const { dots, ticks, lo, hi } = useMemo(() => {
    const vals = data.results
      .map((r) => ({ slug: r.region.slug, name: r.region.name, v: active.get(r) }))
      .filter((d): d is { slug: string; name: string; v: number } => d.v !== null)
      .sort((a, b) => a.v - b.v);
    if (!vals.length) return { dots: [], ticks: [], lo: 0, hi: 1 };
    const lo = vals[0].v;
    const hi = vals[vals.length - 1].v;
    const span = hi - lo || 1;
    const x = (v: number) => PADX + ((v - lo) / span) * (W - PADX * 2);
    // Stack dots whose centres would overlap.
    const placed: { x: number; y: number }[] = [];
    const dots = vals.map((d) => {
      const cx = x(d.v);
      let level = 0;
      while (placed.some((p) => Math.abs(p.x - cx) < R * 2 && p.y === level)) level++;
      placed.push({ x: cx, y: level });
      return { ...d, cx, cy: BASE - R - level * (R * 2 + 1) };
    });
    const ticks = Array.from({ length: 5 }, (_, i) => lo + (i / 4) * span);
    return { dots, ticks, lo, hi };
  }, [data, active]);

  if (!dots.length) return null;
  const top = active.sort === "desc" ? dots[dots.length - 1] : dots[0];
  const lit = dots.find((d) => d.slug === highlighted);

  return (
    <figure>
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="eyebrow">
          <L en="Where every city sits" id="Posisi semua kota" />
        </span>
        <span className="text-2xs text-text-muted">
          <L en="one dot per city · axis runs from lowest to highest" id="satu titik per kota · sumbu dari terendah ke tertinggi" />
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${lang === "en" ? active.en : active.id}: ${active.format(lo, lang)} – ${active.format(hi, lang)}`}
      >
        <line x1={PADX} x2={W - PADX} y1={BASE + 2} y2={BASE + 2} stroke="var(--axis-line)" />
        {ticks.map((t, i) => {
          const x = PADX + (i / 4) * (W - PADX * 2);
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={BASE + 2} y2={BASE + 7} stroke="var(--axis-line)" />
              <text
                x={x}
                y={H - 12}
                textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}
                fontSize={20}
                className="font-numeric"
                fill="var(--text-muted)"
              >
                {active.format(t, lang)}
              </text>
            </g>
          );
        })}
        {dots.map((d) => (
          <circle
            key={d.slug}
            cx={d.cx}
            cy={d.cy}
            r={d.slug === highlighted ? R + 2.5 : R}
            fill={color(d.v)}
            stroke={d.slug === highlighted ? "var(--text-primary)" : "var(--canvas)"}
            strokeWidth={d.slug === highlighted ? 2 : 1}
          />
        ))}
        {[lit ?? top].map((d) => (
          <text
            key={`label-${d.slug}`}
            x={Math.min(Math.max(d.cx, 170), W - 170)}
            y={Math.max(d.cy - 14, 20)}
            textAnchor="middle"
            fontSize={21}
            fontWeight={600}
            fill="var(--text-primary)"
          >
            {d.name} · {active.format(d.v, lang)}
          </text>
        ))}
      </svg>
    </figure>
  );
}
