"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RankingEntry, RankingsResponse, StripeSeries } from "@/lib/types";
import { L, formatNumber, type Lang } from "@/lib/i18n";
import { useLang } from "@/lib/use-lang";
import Stripes from "@/components/ui/Stripes";

export type MetricKey =
  | "hottest"
  | "feels"
  | "wettest"
  | "driest"
  | "warming"
  | "extreme_rain"
  | "heatwave";

export interface RankingMetric {
  key: MetricKey;
  en: string;
  id: string;
  eyebrowEn: string;
  eyebrowId: string;
  get: (r: RankingEntry) => number | null;
  format: (v: number, lang: Lang) => string;
  /** Compact form for the list column; the unit is in the list's eyebrow. */
  short?: (v: number, lang: Lang) => string;
  sort: "desc" | "asc";
}

const dec = (lang: Lang) => (lang === "en" ? "decade" : "dekade");

export const METRICS: RankingMetric[] = [
  {
    key: "warming",
    en: "Warming fastest",
    id: "Memanas tercepat",
    eyebrowEn: "Trend in the average daily high, °C per decade",
    eyebrowId: "Tren rata-rata suhu tertinggi harian, °C per dekade",
    get: (r) => r.warming_c_per_decade,
    format: (v, lang) => `${formatNumber(v, lang, 2, true)} °C/${dec(lang)}`,
    short: (v, lang) => `${formatNumber(v, lang, 2, true)}°`,
    sort: "desc",
  },
  {
    key: "hottest",
    en: "Hottest",
    id: "Terpanas",
    eyebrowEn: "Average daily high, whole record",
    eyebrowId: "Rata-rata suhu tertinggi harian, seluruh catatan",
    get: (r) => r.avg_temp_max,
    format: (v, lang) => `${formatNumber(v, lang)} °C`,
    sort: "desc",
  },
  {
    key: "feels",
    en: "Feels hottest",
    id: "Terasa terpanas",
    eyebrowEn: "Average feels-like daily high (heat + humidity)",
    eyebrowId: "Rata-rata suhu terasa tertinggi harian (panas + lembap)",
    get: (r) => r.avg_apparent_temp_max ?? null,
    format: (v, lang) => `${formatNumber(v, lang)} °C`,
    sort: "desc",
  },
  {
    key: "wettest",
    en: "Wettest",
    id: "Terbasah",
    eyebrowEn: "Average annual rainfall",
    eyebrowId: "Rata-rata curah hujan tahunan",
    get: (r) => r.avg_annual_precipitation,
    format: (v, lang) => `${Math.round(v).toLocaleString(lang === "en" ? "en-US" : "id-ID")} mm`,
    sort: "desc",
  },
  {
    key: "driest",
    en: "Driest",
    id: "Terkering",
    eyebrowEn: "Average annual rainfall, least first",
    eyebrowId: "Rata-rata curah hujan tahunan, dari yang paling sedikit",
    get: (r) => r.avg_annual_precipitation,
    format: (v, lang) => `${Math.round(v).toLocaleString(lang === "en" ? "en-US" : "id-ID")} mm`,
    sort: "asc",
  },
  {
    key: "extreme_rain",
    en: "Most extreme rain",
    id: "Hujan ekstrem terbanyak",
    eyebrowEn: "Average days per year above 100 mm",
    eyebrowId: "Rata-rata hari per tahun di atas 100 mm",
    get: (r) => r.avg_extreme_rain_days_per_year,
    format: (v, lang) => `${formatNumber(v, lang)} ${lang === "en" ? "days/yr" : "hari/thn"}`,
    sort: "desc",
  },
  {
    key: "heatwave",
    en: "Longest heatwave",
    id: "Gelombang panas terlama",
    eyebrowEn: "Longest streak above 35 °C, any year",
    eyebrowId: "Rentetan terpanjang di atas 35 °C, tahun mana pun",
    get: (r) => r.max_consecutive_hot_days,
    format: (v, lang) =>
      v === 0 ? (lang === "en" ? "never" : "tidak pernah") : `${v.toFixed(0)} ${lang === "en" ? "days" : "hari"}`,
    sort: "desc",
  },
];

export function metricsWithData(data: RankingsResponse): RankingMetric[] {
  return METRICS.filter((m) => data.results.some((r) => m.get(r) !== null));
}

const TOP_N = 12;

/**
 * The ranked list. Each row carries the city's warming stripes, so the list
 * shows the *shape* of each city's change as well as its rank. Hovering or
 * focusing a row lights the same city on the map (`onHover`).
 */
export default function RankingsTable({
  data,
  metric,
  stripes,
  highlighted,
  onHover,
}: {
  data: RankingsResponse;
  metric: MetricKey;
  stripes: Map<string, StripeSeries>;
  highlighted: string | null;
  onHover: (slug: string | null) => void;
}) {
  const lang = useLang();
  const [showAll, setShowAll] = useState(false);
  const active = METRICS.find((m) => m.key === metric)!;
  const maxYearsLoaded = Math.max(1, ...data.results.map((r) => r.years_loaded));

  const ranked = useMemo(() => {
    const all = data.results
      .map((r) => ({ entry: r, value: active.get(r) }))
      .filter((r): r is { entry: RankingEntry; value: number } => r.value !== null);
    all.sort((a, b) => (active.sort === "desc" ? b.value - a.value : a.value - b.value));
    return all;
  }, [data, active]);

  const shown = showAll ? ranked : ranked.slice(0, TOP_N);

  return (
    <div className="flex flex-col">
      <p className="eyebrow">
        <L en={active.eyebrowEn} id={active.eyebrowId} />
      </p>
      <ol className="mt-3">
        {shown.map((row, i) => {
          const slug = row.entry.region.slug;
          const s = stripes.get(slug);
          const lit = highlighted === slug;
          return (
            <li key={row.entry.region.id}>
              <Link
                href={`/city/${slug}`}
                onMouseEnter={() => onHover(slug)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(slug)}
                onBlur={() => onHover(null)}
                className={`grid grid-cols-[1.75rem_minmax(0,1fr)_5.5rem_auto] items-center gap-3 border-b border-border px-1.5 py-2.5 transition-colors sm:grid-cols-[1.75rem_minmax(0,1fr)_7rem_6rem] ${
                  lit ? "bg-surface-raised" : "hover:bg-surface-raised"
                }`}
              >
                <span className="font-numeric text-right text-2xs text-text-muted">{i + 1}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-text-primary">
                      {row.entry.region.name}
                    </span>
                    {row.entry.years_loaded < maxYearsLoaded * 0.9 && (
                      <span className="shrink-0 text-xs text-drought-amber">
                        <span aria-hidden>⚠</span>
                        <span className="sr-only">
                          {" "}
                          {lang === "en"
                            ? `Incomplete coverage: ${row.entry.years_loaded} of ${maxYearsLoaded} years`
                            : `Cakupan tidak lengkap: ${row.entry.years_loaded} dari ${maxYearsLoaded} tahun`}
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-2xs text-text-muted">{row.entry.region.province}</span>
                </span>
                {s ? <Stripes anomalies={s.anomalies} className="h-5 w-full" /> : <span />}
                <span className="font-numeric text-right text-xs text-text-primary sm:text-sm">
                  {(active.short ?? active.format)(row.value, lang)}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {ranked.length > TOP_N && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="btn-ghost mt-4 self-start px-4 py-2 text-sm"
        >
          {showAll ? (
            <L en="Show top 12" id="Tampilkan 12 teratas" />
          ) : (
            <L en={`Show all ${ranked.length} cities`} id={`Tampilkan semua ${ranked.length} kota`} />
          )}
        </button>
      )}
      {ranked.length === 0 && (
        <p className="py-8 text-center text-sm text-text-muted">
          <L en="Not enough data yet for this measure." id="Data untuk ukuran ini belum cukup." />
        </p>
      )}
    </div>
  );
}
