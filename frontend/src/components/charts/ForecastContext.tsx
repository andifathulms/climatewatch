"use client";

import type { ForecastContextResponse } from "@/lib/types";
import { L, formatNumber } from "@/lib/i18n";
import { useLang } from "@/lib/use-lang";

/** 7-day forecast set against the historical range for this week of the year. */
export default function ForecastContext({
  data,
}: {
  data: ForecastContextResponse;
}) {
  const lang = useLang();
  const { forecast, historical } = data;
  const days = forecast.time ?? [];
  const tmax = forecast.temperature_2m_max ?? [];
  const precip = forecast.precipitation_sum ?? [];

  const todayMax = tmax[0];
  const { temp_max_p10, temp_max_p90, temp_max_mean } = historical;
  const n = (v: number | null | undefined, d = 1) =>
    v == null ? "—" : formatNumber(v, lang, d);

  // Status carries an icon + label, never colour alone.
  let flag: { en: string; id: string; color: string; icon: string } | null = null;
  if (todayMax != null && temp_max_p90 != null && temp_max_p10 != null) {
    if (todayMax > temp_max_p90) {
      flag = {
        en: "Today is hotter than 90% of past years this week",
        id: "Hari ini lebih panas dari 90% tahun lalu di minggu yang sama",
        color: "var(--heat-orange)",
        icon: "▲",
      };
    } else if (todayMax < temp_max_p10) {
      flag = {
        en: "Today is cooler than 90% of past years this week",
        id: "Hari ini lebih sejuk dari 90% tahun lalu di minggu yang sama",
        color: "var(--rain-blue)",
        icon: "▼",
      };
    } else {
      flag = {
        en: "Today is within the usual range for this week",
        id: "Hari ini masih dalam kisaran biasa untuk minggu ini",
        color: "var(--enso-nina)",
        icon: "●",
      };
    }
  }

  const locale = lang === "en" ? "en-GB" : "id-ID";
  const weekday = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { weekday: "short" });
  const dayMonth = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });

  // Where each day sits inside the historical p10–p90 band, so the row reads
  // as a distribution rather than seven unrelated numbers.
  function pct(v: number | undefined): number | null {
    if (v == null || temp_max_p10 == null || temp_max_p90 == null) return null;
    if (temp_max_p90 === temp_max_p10) return 50;
    return Math.max(
      0,
      Math.min(100, ((v - temp_max_p10) / (temp_max_p90 - temp_max_p10)) * 100),
    );
  }

  return (
    <section id="week" className="card scroll-mt-32 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">
            <L en="This week" id="Minggu ini" />
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold">
            <L en="Forecast against history" id="Prakiraan dibanding sejarah" />
          </h3>
        </div>
        {flag && (
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
            style={{
              color: flag.color,
              borderColor: flag.color,
              backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)",
            }}
          >
            <span aria-hidden className="text-2xs">
              {flag.icon}
            </span>
            <L en={flag.en} id={flag.id} />
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-text-muted">
        <L
          en="Usual daily high for this week, 1950–today:"
          id="Suhu tertinggi biasa untuk minggu ini, 1950–sekarang:"
        />{" "}
        <span className="font-numeric text-text-secondary">
          {n(temp_max_p10)}–{n(temp_max_p90)}°
        </span>{" "}
        <L en="(mean" id="(rata-rata" />{" "}
        <span className="font-numeric">{n(temp_max_mean)}°</span>,{" "}
        <span className="font-numeric">{historical.sample_days}</span>{" "}
        <L en="days sampled)" id="hari sampel)" />
      </p>

      <ol className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {days.map((d, i) => {
          const p = pct(tmax[i]);
          return (
            <li
              key={d}
              className="rounded-lg border border-border bg-surface-inset p-2.5 text-center"
            >
              <div className="text-2xs font-medium text-text-secondary">
                {i === 0 ? <L en="Today" id="Hari ini" /> : weekday(d)}
              </div>
              <div className="font-numeric text-2xs text-text-muted">{dayMonth(d)}</div>
              <div className="font-numeric mt-2 text-base font-medium text-heat-light">
                {n(tmax[i])}°
              </div>
              {/* Where this day sits inside the historical band. */}
              <div className="relative mt-2 h-1 rounded-full bg-border" aria-hidden>
                {p !== null && (
                  <span
                    className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-heat-orange ring-2 ring-surface-inset"
                    style={{ left: `${p}%` }}
                  />
                )}
              </div>
              <div className="font-numeric mt-2 text-2xs text-rain-light">
                {n(precip[i])} mm
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-2xs text-text-muted">
        <L
          en="The dot shows where each day's forecast high falls inside the usual range: left edge = cooler than 90% of past years, right edge = hotter than 90%. Forecast: Open-Meteo, updated live."
          id="Titik menunjukkan posisi suhu tertinggi prakiraan tiap hari di dalam kisaran biasa: kiri = lebih sejuk dari 90% tahun lalu, kanan = lebih panas dari 90%. Prakiraan: Open-Meteo, diperbarui langsung."
        />
      </p>
    </section>
  );
}
