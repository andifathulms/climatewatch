"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WorkedExampleResponse } from "@/lib/types";
import { MONTHS_EN, MONTHS_LONG_EN, MONTHS_LONG_ID } from "@/lib/i18n";
import { L, formatNumber } from "@/lib/i18n";
import { useLang } from "@/lib/use-lang";

/**
 * One real month, day by day, and every number derived from it.
 *
 * Every figure on this site is an aggregate of ~28,000 daily readings per
 * city, and until this component the app never showed one. The rawest thing on
 * any screen was a monthly mean, so the visible chain of evidence started a
 * full step after the evidence: a reader was asked to accept "2.1°C hotter"
 * without ever seeing a day, a month, or the act of aggregating.
 *
 * This is the worked example a newcomer can follow before touching anything —
 * here are the days, here is the rule, here is the count, and here is the one
 * fingerprint cell they add up to. It sits above the fingerprint on purpose:
 * learn to read one square before meeting 924 of them.
 *
 * The threshold is draggable because a rule you can move is a rule you
 * understand. Moving it recomputes *this month only* — the charts elsewhere
 * are built from the fixed threshold and do not change, which the component
 * says out loud rather than letting the reader assume otherwise.
 */

/** Round to one decimal without exposing float noise in the URL. */
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Quiet period before the URL is rewritten. Long enough that a full drag
 *  produces one history entry, short enough to feel instant on release. */
const URL_SYNC_MS = 300;

export default function WorkedExample({
  data,
}: {
  data: WorkedExampleResponse;
}) {
  const lang = useLang();
  const f1 = (v: number) => formatNumber(v, lang);
  const official = data.rules.hot_day_threshold_c;
  const [threshold, setThreshold] = useState<number | null>(null);

  // URL state, per the project rule that anything the reader can change must
  // survive a refresh and be linkable.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("t");
    if (!raw) return;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 20 && n <= 40) setThreshold(round1(n));
  }, []);

  // The URL write is debounced, the state update is not.
  //
  // A range input fires onChange on every pixel of a drag. Writing
  // history.replaceState on each one tripped Safari's "more than 100 times per
  // 10 seconds" limit, which throws a SecurityError — and because that throws
  // inside a React event handler it took the whole page down with "a
  // client-side exception has occurred". The slider felt fine right up until
  // it killed the app.
  //
  // So: state moves immediately (the bars, count and dashed rule stay live at
  // 60fps) and the URL catches up once the drag settles.
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (urlTimer.current) clearTimeout(urlTimer.current);
    };
  }, []);

  function apply(next: number) {
    const v = round1(next);
    setThreshold(v);

    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      const url = new URL(window.location.href);
      if (official !== null && v === round1(official)) {
        url.searchParams.delete("t");
      } else {
        url.searchParams.set("t", String(v));
      }
      window.history.replaceState(null, "", url);
    }, URL_SYNC_MS);
  }

  const active = threshold ?? official;
  const moved = official !== null && active !== null && active !== round1(official);

  const temps = data.days
    .map((d) => d.temp_max)
    .filter((v): v is number => v !== null);
  const rains = data.days
    .map((d) => d.precipitation_mm)
    .filter((v): v is number => v !== null);

  const derived = useMemo(() => {
    const sum = rains.reduce((a, b) => a + b, 0);
    const mean = temps.length
      ? temps.reduce((a, b) => a + b, 0) / temps.length
      : null;
    const count =
      active === null ? null : temps.filter((t) => t > active).length;
    return { sum, mean, count };
  }, [rains, temps, active]);

  // Same scale the bars use, so the dashed rule lands exactly where a bar of
  // that temperature would reach.
  const thresholdY =
    active === null || !temps.length
      ? null
      : Math.min(52, Math.max(0, 16 + ((active - Math.min(...temps)) /
          Math.max(Math.max(...temps) - Math.min(...temps), 1)) * 34));

  const hottest = temps.length ? Math.max(...temps) : 0;
  const coolest = temps.length ? Math.min(...temps) : 0;
  const span = Math.max(hottest - coolest, 1);
  void MONTHS_EN;
  const monthLabel = `${(lang === "en" ? MONTHS_LONG_EN : MONTHS_LONG_ID)[data.month - 1]} ${data.year}`;

  return (
    <section className="p-1">
      <p className="max-w-prose font-display text-title font-semibold text-text-primary">
        <L
          en="Every square in the fingerprint is one month. Here is one, day by day."
          id="Setiap kotak di sidik iklim adalah satu bulan. Ini satu di antaranya, hari demi hari."
        />
      </p>

      <p className="mt-4 max-w-prose leading-relaxed text-text-secondary">
        <L
          en={`${monthLabel} in ${data.region.name}: the most recent month with a reading for every day.`}
          id={`${monthLabel} di ${data.region.name}: bulan terbaru yang datanya lengkap setiap hari.`}
        />
      </p>

      {/* The strip has three rows and they were unlabelled, so the two numbers
          under each bar could have been anything. Say what they are before
          showing them. */}
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-2xs text-text-muted">
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-3 w-2 rounded-[2px]"
            style={{ background: "var(--border-strong)" }}
          />
          <L en="bar height = that day's highest temperature" id="tinggi batang = suhu tertinggi hari itu" />
        </li>
        <li>
          <span className="font-numeric text-text-secondary">30°</span>{" "}
          <L en="= the same number, in °C" id="= angka yang sama, dalam °C" />
        </li>
        <li>
          <span className="font-numeric text-rain-light">1mm</span>{" "}
          <L en="= that day's rainfall" id="= curah hujan hari itu" />
        </li>
      </ul>

      {/* ── The raw days ─────────────────────────────────────────────── */}
      <ol className="mt-6 flex flex-wrap gap-1">
        {data.days.map((d) => {
          const isHot =
            active !== null && d.temp_max !== null && d.temp_max > active;
          const height =
            d.temp_max === null
              ? 0
              : 16 + ((d.temp_max - coolest) / span) * 34;
          return (
            <li
              key={d.day}
              className="flex w-[calc((100%-7*0.25rem)/8)] flex-col items-center gap-1 sm:w-[calc((100%-15*0.25rem)/16)]"
            >
              <span className="font-numeric text-2xs text-text-muted">
                {d.day}
              </span>
              <span
                className="relative flex w-full items-end justify-center rounded-[3px]"
                style={{ height: 52 }}
              >
                {/* The threshold drawn across the bars, so dragging the slider
                    visibly raises or lowers the line and you can see which
                    bars cross it — rather than only watching a count change. */}
                {thresholdY !== null && (
                  <span
                    aria-hidden
                    className="absolute inset-x-0"
                    style={{
                      bottom: thresholdY,
                      borderTop: "1px dashed var(--heat-light)",
                      opacity: 0.75,
                    }}
                  />
                )}
                <span
                  className="w-full rounded-[3px]"
                  style={{
                    height,
                    // --surface-muted on a --surface card was near-invisible:
                    // the bars read as empty boxes and the height encoding
                    // conveyed nothing at all.
                    background: isHot
                      ? "var(--heat-orange)"
                      : "var(--border-strong)",
                  }}
                />
              </span>
              <span
                className={`font-numeric text-2xs ${
                  isHot ? "text-heat-light" : "text-text-muted"
                }`}
              >
                {d.temp_max === null ? "—" : `${d.temp_max.toFixed(0)}°`}
              </span>
              <span className="font-numeric text-2xs text-rain-light">
                {d.precipitation_mm === null
                  ? "—"
                  : `${d.precipitation_mm.toFixed(0)}mm`}
              </span>
            </li>
          );
        })}
      </ol>

      {/* ── The rule, movable ────────────────────────────────────────── */}
      {official !== null && active !== null && (
        <div className="mt-7 rounded-lg border border-border bg-surface-inset p-4">
          <label
            htmlFor="worked-threshold"
            className="block text-sm text-text-secondary"
          >
            <L en="A “hot day” is any day above" id="“Hari panas” adalah hari di atas" />{" "}
            <span className="font-numeric font-medium text-heat-light">
              {f1(active)}°C
            </span>
            .{" "}
            <L en="Drag to see the rule change what it counts." id="Geser untuk melihat aturan ini mengubah yang dihitung." />
          </label>
          <input
            id="worked-threshold"
            type="range"
            min={Math.floor(coolest)}
            max={Math.ceil(hottest)}
            step={0.1}
            value={active}
            onChange={(e) => apply(Number(e.target.value))}
            className="mt-3 w-full accent-heat-orange"
          />
          <div className="font-numeric mt-1 flex justify-between text-2xs text-text-muted">
            <span>{Math.floor(coolest)}°C</span>
            <span>{Math.ceil(hottest)}°C</span>
          </div>

          <p className="mt-3 text-sm text-text-secondary">
            <span className="font-numeric font-medium text-text-primary">
              {derived.count}
            </span>{" "}
            <L en={`of ${temps.length} days in ${monthLabel} qualify.`} id={`dari ${temps.length} hari di ${monthLabel} memenuhi syarat.`} />
          </p>

          {moved && (
            <p className="mt-2 text-2xs leading-relaxed text-drought-amber">
              <L
                en={`You moved the rule off this city's real threshold of ${f1(official)}°C. This changes only the example above; every chart on this page uses the fixed threshold.`}
                id={`Kamu menggeser aturan dari ambang asli kota ini, ${f1(official)}°C. Ini hanya mengubah contoh di atas; semua grafik di halaman ini tetap memakai ambang tetap.`}
              />{" "}
              <button
                type="button"
                onClick={() => apply(official)}
                className="underline decoration-drought-amber/50 underline-offset-2 hover:decoration-drought-amber"
              >
                <L en="Put it back" id="Kembalikan" />
              </button>
              .
            </p>
          )}
        </div>
      )}

      {/* ── What those days become ───────────────────────────────────── */}
      <p className="mt-7 max-w-prose leading-relaxed text-text-secondary">
        <L
          en={`Those ${data.days.length} days collapse into three numbers. That is all “a month” means on this site:`}
          id={`${data.days.length} hari itu diringkas menjadi tiga angka. Itulah arti “satu bulan” di situs ini:`}
        />
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface-inset p-4">
          <dt className="text-2xs uppercase tracking-wider text-text-muted">
            <L en="Add them up" id="Jumlahkan" />
          </dt>
          <dd className="font-numeric mt-1 text-2xl text-rain-light">
            {f1(derived.sum)} mm
          </dd>
          <dd className="mt-1.5 text-2xs leading-relaxed text-text-muted">
            <L en={`Total rainfall. This is the value the Rainfall fingerprint paints for ${monthLabel}.`} id={`Total curah hujan. Nilai inilah yang diwarnai sidik iklim Hujan untuk ${monthLabel}.`} />
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-surface-inset p-4">
          <dt className="text-2xs uppercase tracking-wider text-text-muted">
            <L en="Average them" id="Rata-ratakan" />
          </dt>
          <dd className="font-numeric mt-1 text-2xl text-heat-light">
            {derived.mean === null ? "—" : `${f1(derived.mean)}°C`}
          </dd>
          <dd className="mt-1.5 text-2xs leading-relaxed text-text-muted">
            <L en="Mean daily high: not the hottest day, the typical one." id="Rata-rata suhu tertinggi harian: bukan hari terpanas, tetapi hari yang biasa." />
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-surface-inset p-4">
          <dt className="text-2xs uppercase tracking-wider text-text-muted">
            <L en="Count them" id="Hitung" />
          </dt>
          <dd className="font-numeric mt-1 text-2xl text-text-primary">
            {derived.count ?? "—"} <L en="days" id="hari" />
          </dd>
          <dd className="mt-1.5 text-2xs leading-relaxed text-text-muted">
            <L en="Days over the threshold. A count, so one very hot day counts the same as any other." id="Hari di atas ambang. Ini hitungan, jadi satu hari yang sangat panas dihitung sama dengan hari panas lainnya." />
          </dd>
        </div>
      </dl>

      {/* ── Honesty about the join ───────────────────────────────────── */}
      {data.stored && (
        <p className="mt-5 max-w-prose border-t border-border pt-4 text-2xs leading-relaxed text-text-muted">
          <L
            en={`Checked against the stored record: the fingerprint holds ${data.stored.total_precipitation != null ? f1(data.stored.total_precipitation) : "—"} mm and ${data.stored.avg_temp_max != null ? f1(data.stored.avg_temp_max) : "—"}°C for ${monthLabel}, the same three operations on the same days. Repeat for 12 months and every year since 1950, and you have the fingerprint.`}
            id={`Dicocokkan dengan data tersimpan: sidik iklim menyimpan ${data.stored.total_precipitation != null ? f1(data.stored.total_precipitation) : "—"} mm dan ${data.stored.avg_temp_max != null ? f1(data.stored.avg_temp_max) : "—"}°C untuk ${monthLabel}, hasil tiga operasi yang sama pada hari yang sama. Ulangi untuk 12 bulan dan setiap tahun sejak 1950, jadilah sidik iklim.`}
          />
        </p>
      )}
    </section>
  );
}
