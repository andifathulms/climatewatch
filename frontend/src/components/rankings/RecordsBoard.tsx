"use client";

import SegmentedControl from "@/components/ui/SegmentedControl";
import Link from "next/link";
import { useState } from "react";
import type {
  ClimateRecord,
  RecordMetric,
  RecordsResponse,
} from "@/lib/types";
import { MONTHS_EN, MONTHS_ID, formatNumber } from "@/lib/i18n";
import { useLang } from "@/lib/use-lang";

type Grain = "month" | "year";

type Lg = "en" | "id";
const unitWord = (g: Grain, lang: Lg) =>
  lang === "en" ? g : g === "month" ? "bulan" : "tahun";

const METRICS: {
  key: RecordMetric;
  label: Record<Lg, string>;
  color: string;
  format: (v: number, lang: Lg) => string;
  eyebrow: (g: Grain, lang: Lg) => string;
  note: (g: Grain, lang: Lg) => string;
}[] = [
  {
    key: "hottest",
    label: { en: "Hottest", id: "Terpanas" },
    color: "var(--heat-orange)",
    format: (v, lang) => `${formatNumber(v, lang)}°C`,
    eyebrow: (g, lang) =>
      lang === "en"
        ? `Highest ${g === "month" ? "monthly" : "yearly"} average daily high`
        : `Rata-rata suhu tertinggi harian ${g === "month" ? "bulanan" : "tahunan"} tertinggi`,
    note: (g, lang) =>
      lang === "en"
        ? `An average of the daily high across a whole ${g}: a hot ${g}, not a single scorching day.`
        : `Rata-rata suhu tertinggi harian selama satu ${unitWord(g, lang)} penuh: ${unitWord(g, lang)} yang panas, bukan satu hari yang sangat terik.`,
  },
  {
    key: "coolest",
    label: { en: "Coolest", id: "Tersejuk" },
    color: "var(--rain-blue)",
    format: (v, lang) => `${formatNumber(v, lang)}°C`,
    eyebrow: (g, lang) =>
      lang === "en"
        ? `Lowest ${g === "month" ? "monthly" : "yearly"} average daily high`
        : `Rata-rata suhu tertinggi harian ${g === "month" ? "bulanan" : "tahunan"} terendah`,
    note: (_g, lang) =>
      lang === "en" ? "Highland cities dominate the cool end." : "Kota dataran tinggi mendominasi ujung sejuk.",
  },
  {
    key: "wettest",
    label: { en: "Wettest", id: "Terbasah" },
    color: "var(--rain-blue)",
    format: (v) => `${v.toFixed(0)} mm`,
    eyebrow: (g, lang) =>
      lang === "en" ? `Most rain in a single ${g}` : `Hujan terbanyak dalam satu ${unitWord(g, lang)}`,
    note: (_g, lang) =>
      lang === "en" ? "Total rainfall accumulated over the period." : "Total curah hujan selama periode itu.",
  },
  {
    key: "driest",
    label: { en: "Driest", id: "Terkering" },
    color: "var(--drought-amber)",
    format: (v) => `${v.toFixed(0)} mm`,
    eyebrow: (g, lang) =>
      lang === "en" ? `Least rain in a single ${g}` : `Hujan paling sedikit dalam satu ${unitWord(g, lang)}`,
    note: (g, lang) =>
      g === "month"
        ? lang === "en"
          ? "Dry-season months near 0 mm often tie."
          : "Bulan kemarau yang mendekati 0 mm sering seri."
        : lang === "en"
          ? "Total rainfall accumulated over the year."
          : "Total curah hujan sepanjang tahun.",
  },
];

function when(r: ClimateRecord, lang: "en" | "id"): string {
  const m = lang === "en" ? MONTHS_EN : MONTHS_ID;
  return r.month ? `${m[r.month - 1]} ${r.year}` : `${r.year}`;
}

export default function RecordsBoard({ data }: { data: RecordsResponse }) {
  const lang = useLang();
  const [metric, setMetric] = useState<RecordMetric>("hottest");
  const [grain, setGrain] = useState<Grain>("month");
  const active = METRICS.find((m) => m.key === metric)!;
  const rows: ClimateRecord[] = data[grain]?.[metric] ?? [];

  return (
    <section className="card p-6">
      <p className="eyebrow">{lang === "en" ? "Record book" : "Buku rekor"}</p>
      <h2 className="mb-5 mt-1.5 font-display text-2xl font-semibold">
        {lang === "en" ? "The most extreme months and years" : "Bulan dan tahun paling ekstrem"}
      </h2>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          name="records-metric"
          label={lang === "en" ? "Record type" : "Jenis rekor"}
          variant="ghost"
          options={METRICS.map((m) => ({ value: m.key, label: m.label[lang] }))}
          value={metric}
          onChange={setMetric}
        />

        {/* Granularity toggle — the whole point of the section. */}
        <SegmentedControl
          name="records-grain"
          label={lang === "en" ? "Granularity" : "Rentang"}
          options={[
            { value: "month" as Grain, label: lang === "en" ? "Month" : "Bulan" },
            { value: "year" as Grain, label: lang === "en" ? "Year" : "Tahun" },
          ]}
          value={grain}
          onChange={setGrain}
        />
      </div>

      <p className="eyebrow">{active.eyebrow(grain, lang)}</p>
      <p className="mt-1 text-xs text-text-muted">
        {lang === "en"
          ? `The 15 most extreme single ${grain}s across all cities, 1950–present.`
          : `15 ${unitWord(grain, lang)} paling ekstrem di semua kota, 1950–sekarang.`}
      </p>

      {/* The rank column is dropped below sm rather than scrolled: it restates
          the row order, which is already conveyed by position, so it is the one
          column that costs nothing to lose. With it and province hidden, the
          remaining three fit 320px and the nested horizontal scroller never
          engages. overflow-x-auto stays as the safety net for long city names. */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {/* The visible section heading names the board; it does not say which
              of the ten metric x granularity combinations is on screen. Without
              that, a screen-reader user landing on the table by table-navigation
              has no idea what they are reading. */}
          <caption className="sr-only">
            {active.label[lang]} · {unitWord(grain, lang)}
          </caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="hidden w-8 py-2 pr-2 text-right font-normal text-2xs uppercase tracking-wider text-text-muted sm:table-cell">
                #
              </th>
              <th scope="col" className="py-2 pr-4 font-normal text-2xs uppercase tracking-wider text-text-muted">
                {lang === "en" ? "City" : "Kota"}
              </th>
              <th scope="col" className="hidden py-2 pr-4 font-normal text-2xs uppercase tracking-wider text-text-muted sm:table-cell">
                {lang === "en" ? "Province" : "Provinsi"}
              </th>
              <th scope="col" className="py-2 pr-4 font-normal text-2xs uppercase tracking-wider text-text-muted">
                {grain === "month" ? (lang === "en" ? "Month" : "Bulan") : lang === "en" ? "Year" : "Tahun"}
              </th>
              <th scope="col" className="py-2 pl-4 text-right font-normal text-2xs uppercase tracking-wider text-text-muted">
                {metric === "wettest" || metric === "driest" ? (lang === "en" ? "Rainfall" : "Hujan") : lang === "en" ? "Avg high" : "Rata-rata maks"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.region.slug}-${r.year}-${r.month ?? "y"}`}
                className="group border-b border-border/60 last:border-0"
              >
                <td className="font-numeric hidden py-2.5 pr-2 text-right text-xs text-text-muted sm:table-cell">
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
                  {when(r, lang)}
                </td>
                <td
                  className="font-numeric py-2.5 pl-4 text-right font-semibold"
                  style={{ color: active.color }}
                >
                  {active.format(r.value, lang)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-text-muted">
        {active.note(grain, lang)}
      </p>
    </section>
  );
}
