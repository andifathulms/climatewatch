"use client";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OverTimeMetric, OverTimeResponse } from "@/lib/types";
import { AXIS, CHART_MARGIN, CURSOR, GRID } from "@/components/charts/chart-ui";

// Validated all-pairs on the dark surface (#1B1813): worst CVD ΔE 8.2, worst
// normal-vision ΔE 18.2 — see the dataviz validator. Only the cities that led
// #1 get a colour (≤4, the CVD-safe cap); the #2/#3 contenders are drawn in the
// muted tone so the champions stay legible.
const LINE_COLORS = ["#3E93D0", "#E2661F", "#45A05F", "#CB4F9E"];
const MUTED = "var(--text-muted)";

type MetricKey = "temp" | "rain";

interface Reign {
  slug: string;
  name: string;
  color: string;
  from: number;
  to: number;
}

/** Collapse a per-year slug array into contiguous reign segments. */
function buildReigns(
  years: number[],
  slugs: (string | null)[],
  colorOf: Map<string, string>,
  nameOf: Map<string, string>,
): Reign[] {
  const out: Reign[] = [];
  for (let i = 0; i < years.length; i++) {
    const slug = slugs[i];
    if (!slug) continue;
    const last = out[out.length - 1];
    if (last && last.slug === slug) {
      last.to = years[i];
    } else {
      out.push({
        slug,
        name: nameOf.get(slug) ?? slug,
        color: colorOf.get(slug) ?? "var(--text-muted)",
        from: years[i],
        to: years[i],
      });
    }
  }
  return out;
}

export default function LeadersOverTime({ data }: { data: OverTimeResponse }) {
  const reducedMotion = usePrefersReducedMotion();
  const [metricKey, setMetricKey] = useState<MetricKey>("temp");
  const metric = data[metricKey];

  // Colour the first ≤4 cities that ever led; everyone else (extra leaders past
  // 4, and pure #2/#3 contenders) takes the muted tone.
  const { colorOf, colored } = useMemo(() => {
    const colorOf = new Map<string, string>();
    const colored = new Map<string, boolean>();
    let ci = 0;
    for (const s of metric.series) {
      const isColored = s.led && ci < LINE_COLORS.length;
      colorOf.set(s.region.slug, isColored ? LINE_COLORS[ci++] : MUTED);
      colored.set(s.region.slug, isColored);
    }
    return { colorOf, colored };
  }, [metric]);

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    metric.series.forEach((s) => m.set(s.region.slug, s.region.name));
    return m;
  }, [metric]);

  const rows = useMemo(
    () =>
      metric.years.map((year, i) => {
        const row: Record<string, number | null> = { year };
        for (const s of metric.series) row[s.region.slug] = s.values[i];
        return row;
      }),
    [metric],
  );

  // Podium over time: rank the drawn cities each year and collapse positions
  // 1/2/3 into their own reign strips. Derived from the same series values the
  // lines use — no extra data needed. (Row 0 equals the #1 leader_by_year.)
  const reignRows = useMemo(() => {
    const rank: (string | null)[][] = [[], [], []];
    metric.years.forEach((_year, i) => {
      const ordered = metric.series
        .map((s) => ({ slug: s.region.slug, v: s.values[i] }))
        .filter((x): x is { slug: string; v: number } => x.v !== null)
        .sort((a, b) => b.v - a.v);
      for (let r = 0; r < 3; r++) rank[r].push(ordered[r]?.slug ?? null);
    });
    return [
      { place: "1st", reigns: buildReigns(metric.years, rank[0], colorOf, nameOf) },
      { place: "2nd", reigns: buildReigns(metric.years, rank[1], colorOf, nameOf) },
      { place: "3rd", reigns: buildReigns(metric.years, rank[2], colorOf, nameOf) },
    ];
  }, [metric, colorOf, nameOf]);

  // Tight, honest domain: these cluster in a narrow band (esp. temperature),
  // and a line makes no zero-baseline claim, so pad around the real values.
  const [lo, hi] = useMemo(() => {
    const vals = metric.series
      .flatMap((s) => s.values)
      .filter((v): v is number => v !== null);
    if (!vals.length) return [0, 1];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min || 1) * 0.15;
    return [min - pad, max + pad];
  }, [metric]);

  const totalSpan = metric.years.length - 1 || 1;
  const fmt = (v: number) =>
    metric.decimals === 0 ? Math.round(v).toString() : v.toFixed(metric.decimals);

  return (
    <section className="card p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Leaders over time</p>
          <h2 className="mt-1.5 font-display text-xl font-semibold">
            Who led each year
          </h2>
        </div>
        <SegmentedControl
          name="leaders-metric"
          label="Metric"
          options={(["temp", "rain"] as MetricKey[]).map((k) => ({
            value: k,
            label: data[k].label,
          }))}
          value={metricKey}
          onChange={setMetricKey}
        />
      </div>

      <p className="mb-4 max-w-prose text-sm leading-relaxed text-text-secondary">
        Every city that ever reached the top 3, as a{" "}
        <span className="text-text-primary">
          {metric.smoothing_years}-year average
        </span>{" "}
        so eras reflect real shifts, not single-year noise.{" "}
        <span className="text-text-primary">Coloured</span> lines led #1 at some
        point; grey lines are the #2/#3 pack. Values in {metric.unit}.
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={rows} margin={CHART_MARGIN}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} minTickGap={32} {...AXIS} />
          <YAxis domain={[lo, hi]} width={46} tickFormatter={fmt} {...AXIS} />
          <Tooltip
            cursor={CURSOR}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const idx = metric.years.indexOf(Number(label));
              const leader = metric.leader_by_year[idx];
              return (
                <div className="rounded-lg border border-border-strong bg-canvas-deep px-3 py-2 shadow-float">
                  <div className="font-numeric text-2xs uppercase tracking-wider text-text-muted">
                    {label}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {payload
                      .slice()
                      .sort((a, b) => Number(b.value) - Number(a.value))
                      .map((e) => {
                        const slug = String(e.dataKey);
                        const isLeader = slug === leader;
                        return (
                          <div
                            key={slug}
                            className="flex items-center justify-between gap-4 text-xs"
                          >
                            <span className="flex items-center gap-1.5 text-text-secondary">
                              <span
                                aria-hidden
                                className="h-2 w-2 rounded-[2px]"
                                style={{ background: e.color }}
                              />
                              {nameOf.get(slug)}
                              {isLeader && (
                                <span
                                  aria-hidden
                                  style={{ color: e.color }}
                                  title="leader"
                                >
                                  ★
                                </span>
                              )}
                            </span>
                            <span className="font-numeric font-medium text-text-primary">
                              {e.value == null ? "—" : fmt(Number(e.value))}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            }}
          />
          {/* Muted contenders first so the coloured champions render on top. */}
          {[...metric.series]
            .sort(
              (a, b) =>
                Number(colored.get(a.region.slug)) -
                Number(colored.get(b.region.slug)),
            )
            .map((s) => {
              const isColored = colored.get(s.region.slug);
              return (
                <Line isAnimationActive={!reducedMotion}
                  key={s.region.slug}
                  type="monotone"
                  dataKey={s.region.slug}
                  stroke={colorOf.get(s.region.slug)}
                  strokeWidth={isColored ? 2 : 1.5}
                  strokeOpacity={isColored ? 1 : 0.4}
                  dot={false}
                  activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
                  connectNulls
                  name={s.region.name}
                />
              );
            })}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend — identity is carried here, not by colour alone. Champions
          first, then the greyed contenders. */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {[...metric.series]
          .sort(
            (a, b) =>
              Number(colored.get(b.region.slug)) -
              Number(colored.get(a.region.slug)),
          )
          .map((s) => {
            const isColored = colored.get(s.region.slug);
            return (
              <span
                key={s.region.slug}
                className={`flex items-center gap-2 text-xs ${
                  isColored ? "text-text-secondary" : "text-text-muted"
                }`}
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-[2px]"
                  style={{
                    background: colorOf.get(s.region.slug),
                    opacity: isColored ? 1 : 0.5,
                  }}
                />
                {s.region.name}
              </span>
            );
          })}
      </div>

      {/* Podium over time — who sat 1st / 2nd / 3rd each year, to scale. The
          #1 row is the leader ribbon; #2 and #3 stack beneath it. */}
      <div className="mt-6">
        <p className="eyebrow mb-2">Podium over time</p>

        {/* The visual timeline encodes each reign as a proportional width and
            drops the label under ~10% — the years exist only as geometry, and
            the `title` attribute on a <div> is not reliably announced. The
            sr-only list below is the text alternative; the bars are marked
            aria-hidden so the same data is not announced twice. (WCAG 1.1.1) */}
        <ul className="sr-only">
          {reignRows.map((row) => (
            <li key={`sr-${row.place}`}>
              {row.place}:{" "}
              {row.reigns
                .map((r) => `${r.name} ${r.from} to ${r.to}`)
                .join(", ")}
            </li>
          ))}
        </ul>

        <div aria-hidden className="space-y-1">
          {reignRows.map((row) => (
            <div key={row.place} className="flex items-center gap-2">
              <span className="font-numeric w-6 shrink-0 text-2xs text-text-muted">
                {row.place}
              </span>
              <div className="flex h-7 flex-1 overflow-hidden rounded border border-border">
                {row.reigns.map((r, i) => {
                  const width = ((r.to - r.from + 1) / (totalSpan + 1)) * 100;
                  return (
                    <div
                      key={`${r.slug}-${r.from}`}
                      title={`${row.place} · ${r.name}: ${r.from}–${r.to}`}
                      className={`flex items-center justify-center overflow-hidden px-1 ${
                        i > 0 ? "border-l border-canvas-deep" : ""
                      }`}
                      style={{
                        width: `${width}%`,
                        background: `color-mix(in srgb, ${r.color} 22%, transparent)`,
                        borderTop: `2px solid ${r.color}`,
                      }}
                    >
                      <span className="truncate text-2xs font-medium text-text-primary">
                        {width > 10 ? r.name : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="font-numeric ml-8 mt-1 flex justify-between text-2xs text-text-muted">
          <span>{metric.years[0]}</span>
          <span>{metric.years[metric.years.length - 1]}</span>
        </div>
      </div>
    </section>
  );
}
