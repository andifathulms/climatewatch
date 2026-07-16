"use client";

import type { ReactNode } from "react";

/**
 * Shared chart chrome. Recharts defaults to light-mode styling, so axes, grid,
 * and tooltips are themed once here instead of being re-specified (and drifting)
 * in every chart.
 */

export const AXIS = {
  tick: { fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--font-mono)" },
  stroke: "var(--axis-line)",
  tickLine: false,
} as const;

export const GRID = {
  stroke: "var(--grid-line)",
  strokeDasharray: "2 5",
  vertical: false,
} as const;

// right leaves room for the final x-axis label ("Dec"/last year) to sit inside
// the plot rather than clipping against the card edge.
export const CHART_MARGIN = { top: 8, right: 20, bottom: 4, left: -12 } as const;

/** Cursor line shown behind the tooltip on hover. */
export const CURSOR = {
  stroke: "var(--border-strong)",
  strokeWidth: 1,
  strokeDasharray: "3 3",
} as const;

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

/**
 * Dark tooltip matching the fingerprint's. `format` lets a chart relabel or
 * unit-suffix a row without reimplementing the shell.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  labelSuffix = "",
  format,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  labelSuffix?: string;
  format?: (entry: TooltipEntry) => { name: string; value: string } | null;
}) {
  if (!active || !payload?.length) return null;

  const rows = payload
    .map((entry) => {
      const formatted = format
        ? format(entry)
        : {
            name: String(entry.name ?? ""),
            value:
              typeof entry.value === "number"
                ? entry.value.toFixed(1)
                : String(entry.value ?? "—"),
          };
      return formatted ? { ...formatted, color: entry.color } : null;
    })
    .filter(Boolean) as { name: string; value: string; color?: string }[];

  if (!rows.length) return null;

  return (
    <div className="rounded-lg border border-border-strong bg-canvas-deep px-3 py-2 shadow-float">
      <div className="font-numeric text-[10px] uppercase tracking-wider text-text-muted">
        {label}
        {labelSuffix}
      </div>
      <div className="mt-1 space-y-0.5">
        {rows.map((r) => (
          <div
            key={r.name}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="flex items-center gap-1.5 text-text-secondary">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ background: r.color }}
              />
              {r.name}
            </span>
            {/* Values wear text ink, never the series color. */}
            <span className="font-numeric font-medium text-text-primary">
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Consistent header for every chart card. */
export function ChartHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-1.5 font-display text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

/** Inline legend swatch + label. Identity is never carried by color alone. */
export function LegendKey({
  items,
}: {
  items: { label: string; color: string; dashed?: boolean }[];
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
      {items.map((it) => (
        <span
          key={it.label}
          className="flex items-center gap-2 text-xs text-text-secondary"
        >
          {it.dashed ? (
            <svg width="16" height="2" aria-hidden className="shrink-0">
              <line
                x1="0"
                y1="1"
                x2="16"
                y2="1"
                stroke={it.color}
                strokeWidth="2"
                strokeDasharray="5 4"
              />
            </svg>
          ) : (
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ background: it.color }}
            />
          )}
          {it.label}
        </span>
      ))}
    </div>
  );
}
