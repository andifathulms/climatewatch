"use client";

import SegmentedControl from "@/components/ui/SegmentedControl";
import Link from "next/link";
import { useState } from "react";
import type {
  ClimateRecord,
  RecordMetric,
  RecordsResponse,
} from "@/lib/types";
import { MONTHS } from "@/lib/format";

type Grain = "month" | "year";

const METRICS: {
  key: RecordMetric;
  label: string;
  color: string;
  format: (v: number) => string;
  eyebrow: (g: Grain) => string;
  note: (g: Grain) => string;
}[] = [
  {
    key: "hottest",
    label: "Hottest",
    color: "var(--heat-orange)",
    format: (v) => `${v.toFixed(1)}°C`,
    eyebrow: (g) => `Highest ${g === "month" ? "monthly" : "yearly"} average daily high`,
    note: (g) =>
      `An average of the daily high across a whole ${g} — a hot ${g}, not a single scorching day.`,
  },
  {
    key: "coolest",
    label: "Coolest",
    color: "var(--rain-blue)",
    format: (v) => `${v.toFixed(1)}°C`,
    eyebrow: (g) => `Lowest ${g === "month" ? "monthly" : "yearly"} average daily high`,
    note: () => "Highland cities dominate the cool end.",
  },
  {
    key: "wettest",
    label: "Wettest",
    color: "var(--rain-blue)",
    format: (v) => `${v.toFixed(0)} mm`,
    eyebrow: (g) => `Most rain in a single ${g}`,
    note: () => "Total rainfall accumulated over the period.",
  },
  {
    key: "driest",
    label: "Driest",
    color: "var(--drought-amber)",
    format: (v) => `${v.toFixed(0)} mm`,
    eyebrow: (g) => `Least rain in a single ${g}`,
    note: (g) =>
      g === "month"
        ? "Dry-season months near 0mm tie often."
        : "Total rainfall accumulated over the year.",
  },
];

function when(r: ClimateRecord): string {
  return r.month ? `${MONTHS[r.month - 1]} ${r.year}` : `${r.year}`;
}

export default function RecordsBoard({ data }: { data: RecordsResponse }) {
  const [metric, setMetric] = useState<RecordMetric>("hottest");
  const [grain, setGrain] = useState<Grain>("month");
  const active = METRICS.find((m) => m.key === metric)!;
  const rows: ClimateRecord[] = data[grain]?.[metric] ?? [];

  return (
    <section className="card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          name="records-metric"
          label="Record type"
          variant="ghost"
          options={METRICS.map((m) => ({ value: m.key, label: m.label }))}
          value={metric}
          onChange={setMetric}
        />

        {/* Granularity toggle — the whole point of the section. */}
        <SegmentedControl
          name="records-grain"
          label="Granularity"
          options={[
            { value: "month" as Grain, label: "Month" },
            { value: "year" as Grain, label: "Year" },
          ]}
          value={grain}
          onChange={setGrain}
        />
      </div>

      <p className="eyebrow">{active.eyebrow(grain)}</p>
      <p className="mt-1 text-xs text-text-muted">
        The 15 most extreme single {grain}s across all cities, 1950–present.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {/* The visible section heading names the board; it does not say which
              of the ten metric x granularity combinations is on screen. Without
              that, a screen-reader user landing on the table by table-navigation
              has no idea what they are reading. */}
          <caption className="sr-only">
            {active.label} records, by {grain === "month" ? "month" : "year"}
          </caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="w-8 py-2 pr-2 text-right font-normal text-2xs uppercase tracking-wider text-text-muted">
                #
              </th>
              <th scope="col" className="py-2 pr-4 font-normal text-2xs uppercase tracking-wider text-text-muted">
                City
              </th>
              <th scope="col" className="hidden py-2 pr-4 font-normal text-2xs uppercase tracking-wider text-text-muted sm:table-cell">
                Province
              </th>
              <th scope="col" className="py-2 pr-4 font-normal text-2xs uppercase tracking-wider text-text-muted">
                {grain === "month" ? "Month" : "Year"}
              </th>
              <th scope="col" className="py-2 pl-4 text-right font-normal text-2xs uppercase tracking-wider text-text-muted">
                {metric === "wettest" || metric === "driest" ? "Rainfall" : "Avg high"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.region.slug}-${r.year}-${r.month ?? "y"}`}
                className="group border-b border-border/60 last:border-0"
              >
                <td className="font-numeric py-2.5 pr-2 text-right text-xs text-text-muted">
                  {i + 1}
                </td>
                <td className="py-2.5 pr-4">
                  <Link
                    href={`/city/${r.region.slug}`}
                    className="font-medium text-text-primary underline decoration-transparent underline-offset-2 transition group-hover:decoration-border-strong"
                  >
                    {r.region.name}
                  </Link>
                </td>
                <td className="hidden py-2.5 pr-4 text-text-muted sm:table-cell">
                  {r.region.province}
                </td>
                <td className="font-numeric py-2.5 pr-4 text-text-secondary">
                  {when(r)}
                </td>
                <td
                  className="font-numeric py-2.5 pl-4 text-right font-semibold"
                  style={{ color: active.color }}
                >
                  {active.format(r.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-text-muted">
        {active.note(grain)}
      </p>
    </section>
  );
}
