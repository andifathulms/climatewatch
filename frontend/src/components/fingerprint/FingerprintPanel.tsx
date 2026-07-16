"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FingerprintResponse, FingerprintVariable } from "@/lib/types";
import ClimateFingerprint, { FingerprintLegend } from "./ClimateFingerprint";

const VARIABLES: { key: FingerprintVariable; label: string }[] = [
  { key: "precipitation", label: "Rainfall" },
  { key: "temp_max", label: "Temperature" },
  { key: "hot_days", label: "Hot Days" },
  { key: "dry_days", label: "Dry Days" },
];

const BLURB: Record<FingerprintVariable, string> = {
  precipitation: "Total monthly rainfall",
  temp_max: "Average monthly maximum temperature",
  hot_days: "Days above 35°C per month",
  dry_days: "Days below 1mm rain per month",
};

/**
 * How a year's 12 cells roll up. Rainfall and day-counts are additive; a
 * temperature is not — summing 12 monthly means yields a meaningless ~340°C,
 * so temp_max averages instead.
 */
const ROLLUP: Record<
  FingerprintVariable,
  { kind: "sum" | "mean"; label: string; unit: string }
> = {
  precipitation: { kind: "sum", label: "Annual total", unit: " mm" },
  temp_max: { kind: "mean", label: "Annual average", unit: "°C" },
  hot_days: { kind: "sum", label: "Hot days this year", unit: "" },
  dry_days: { kind: "sum", label: "Dry days this year", unit: "" },
};

export default function FingerprintPanel({
  regionId,
  initial,
}: {
  regionId: number;
  initial: FingerprintResponse;
}) {
  const [variable, setVariable] = useState<FingerprintVariable>("precipitation");
  const [data, setData] = useState<FingerprintResponse>(initial);
  const [showEnso, setShowEnso] = useState(false);
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (variable === initial.variable && data.variable === variable) return;
    let cancelled = false;
    setLoading(true);
    api
      .fingerprint(regionId, variable)
      .then((d) => !cancelled && setData(d))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variable, regionId]);

  const rollup = ROLLUP[data.variable];
  const yearCells =
    hoverYear !== null
      ? data.data.filter((d) => d.year === hoverYear && d.value !== null)
      : [];
  const yearValue =
    yearCells.length > 0
      ? rollup.kind === "sum"
        ? yearCells.reduce((s, d) => s + (d.value ?? 0), 0)
        : yearCells.reduce((s, d) => s + (d.value ?? 0), 0) / yearCells.length
      : null;

  return (
    <section className="card overflow-hidden">
      {/* ── Panel header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-border p-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="eyebrow">The signature view</p>
          <h2 className="mt-2 font-display text-2xl font-semibold">
            Climate Fingerprint
          </h2>
          <p className="mt-1.5 text-sm text-text-secondary">
            {BLURB[data.variable]} ·{" "}
            <span className="font-numeric">
              {data.year_from}–{data.year_to}
            </span>
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          {/* Segmented control */}
          <div
            role="tablist"
            aria-label="Climate variable"
            className="inline-flex rounded-full border border-border bg-surface-inset p-1"
          >
            {VARIABLES.map((v) => {
              const on = variable === v.key;
              return (
                <button
                  key={v.key}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setVariable(v.key)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                    on
                      ? "bg-text-primary text-canvas shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>

          {/* ENSO switch */}
          <button
            type="button"
            role="switch"
            aria-checked={showEnso}
            onClick={() => setShowEnso((v) => !v)}
            className="group flex items-center gap-2.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
          >
            <span
              aria-hidden
              className={`relative h-4 w-7 rounded-full transition-colors duration-200 ${
                showEnso ? "bg-rain-blue" : "bg-border-strong"
              }`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform duration-200 ${
                  showEnso ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </span>
            ENSO overlay
          </button>
        </div>
      </div>

      {/* ── Grid + sidebar ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 p-6 lg:flex-row-reverse lg:items-start">
        {/* Sidebar sticks: the grid is ~1,900px tall for a 77-year record, so a
            static readout would scroll out of sight before you finish reading
            the rows it describes. Ordered first in the DOM only via
            flex-row-reverse — it stays after the grid for screen readers. */}
        <aside className="flex w-full min-w-0 flex-col gap-5 lg:sticky lg:top-20 lg:w-[15rem] lg:shrink-0">
          {/* Hovered-year readout. Reserves its own height so the panel does
              not reflow as the pointer moves across the grid. */}
          <div className="min-h-[7.5rem] rounded-lg border border-border bg-surface-inset p-4">
            {hoverYear !== null ? (
              <>
                <div className="font-numeric text-3xl font-medium leading-none text-text-primary">
                  {hoverYear}
                </div>
                <div className="mt-3 text-xs text-text-muted">
                  {rollup.label}
                </div>
                <div className="font-numeric mt-0.5 text-lg text-text-primary">
                  {yearValue !== null
                    ? `${yearValue.toFixed(1)}${rollup.unit}`
                    : "—"}
                </div>
              </>
            ) : (
              <p className="text-xs leading-relaxed text-text-muted">
                Hover a cell for the month, or a row for the whole year.
                <br />
                <span className="mt-2 inline-block opacity-70">
                  Newest year sits at the top.
                </span>
              </p>
            )}
          </div>

          <FingerprintLegend variable={data.variable} stats={data.stats} />

          {showEnso && (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="eyebrow">ENSO</p>
              <div className="flex items-center gap-2.5 text-xs text-text-secondary">
                <span
                  aria-hidden
                  className="inline-block h-3.5 w-1 rounded-full"
                  style={{ background: "var(--enso-nino)" }}
                />
                El Niño — tends drier
              </div>
              <div className="flex items-center gap-2.5 text-xs text-text-secondary">
                <span
                  aria-hidden
                  className="inline-block h-3.5 w-1 rounded-full"
                  style={{ background: "var(--enso-nina)" }}
                />
                La Niña — tends wetter
              </div>
            </div>
          )}
        </aside>

        <div
          className="min-w-0 flex-1 transition-opacity duration-200"
          style={{ opacity: loading ? 0.4 : 1 }}
          aria-busy={loading}
        >
          <ClimateFingerprint
            data={data}
            showEnso={showEnso}
            onHoverYear={setHoverYear}
          />
        </div>
      </div>
    </section>
  );
}
