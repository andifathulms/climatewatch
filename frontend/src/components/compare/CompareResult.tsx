"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { CompareProfile, CompareResponse, Region } from "@/lib/types";
import { diurnalSwing } from "@/lib/format";
import ComparePanel from "./ComparePanel";
import CompareFingerprints from "./CompareFingerprints";
import MonthlyBarChart from "@/components/charts/MonthlyBarChart";
import NullDataWarning from "@/components/ui/NullDataWarning";
import Stripes from "@/components/ui/Stripes";
import { L, N, formatNumber } from "@/lib/i18n";
import { useLang } from "@/lib/use-lang";
import type { StripeSeries } from "@/lib/types";

/** DESIGN.md §7: "any ranking row built on a thin region" generalises here to
 *  either compare side. `annual` rows exist per year already loaded, so a
 *  null `avg_temp_max` within one is the signal — the coverage figure this
 *  page can actually verify, same reasoning as the city page's own. */
function annualCoverage(p: CompareProfile): number {
  if (p.annual.length === 0) return 1;
  return (
    p.annual.filter((r) => r.avg_temp_max !== null).length / p.annual.length
  );
}

type ClimField = "avg_temp_max" | "avg_temp_min" | "avg_temp_mean";

/** Mean of a 12-month climatology field. */
function avgField(p: CompareProfile, f: ClimField): number | null {
  const v = p.climatology
    .map((c) => c[f])
    .filter((x): x is number => x !== null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

/** One city's day→night range drawn on a shared temperature axis. */
function RangeBar({
  name,
  color,
  lo,
  hi,
  mean,
  domLo,
  domHi,
}: {
  name: string;
  color: string;
  lo: number;
  hi: number;
  mean: number;
  domLo: number;
  domHi: number;
}) {
  const pct = (v: number) => ((v - domLo) / (domHi - domLo)) * 100;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium" style={{ color }}>
          {name}
        </span>
        <span className="font-numeric text-text-muted">
          {lo.toFixed(1)}°–{hi.toFixed(1)}°{" "}
          <span className="text-text-secondary">· Δ {(hi - lo).toFixed(1)}°</span>
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-surface-inset">
        {/* night → day span */}
        <div
          className="absolute inset-y-0 rounded-full"
          style={{
            left: `${pct(lo)}%`,
            width: `${pct(hi) - pct(lo)}%`,
            background: `color-mix(in srgb, ${color} 55%, transparent)`,
          }}
        />
        {/* 24-hour mean marker */}
        <span
          className="absolute top-1/2 h-3.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${pct(mean)}%`, background: color }}
          title={`24h mean ${mean.toFixed(1)}°`}
        />
      </div>
    </div>
  );
}

/** Plain-language read of the two cities' day–night rhythm and 24h average. */
function DayNightInsight({ a, b }: { a: CompareProfile; b: CompareProfile }) {
  const lang = useLang();
  const f = (v: number) => formatNumber(v, lang);
  const sA = diurnalSwing(a.climatology);
  const sB = diurnalSwing(b.climatology);
  const mA = avgField(a, "avg_temp_mean");
  const mB = avgField(b, "avg_temp_mean");
  const hiA = avgField(a, "avg_temp_max");
  const loA = avgField(a, "avg_temp_min");
  const hiB = avgField(b, "avg_temp_max");
  const loB = avgField(b, "avg_temp_min");
  if (
    sA === null || sB === null || mA === null || mB === null ||
    hiA === null || loA === null || hiB === null || loB === null
  )
    return null;

  const tight = Math.abs(sA - sB) < 0.3;
  const smaller = sA <= sB ? a : b; // smaller swing = warmer nights
  const smallerColor = smaller === a ? "var(--series-1)" : "var(--series-2)";
  const warmer = mA >= mB ? a : b; // higher 24h average
  const warmerColor = warmer === a ? "var(--series-1)" : "var(--series-2)";

  const domLo = Math.floor(Math.min(loA, loB) - 0.5);
  const domHi = Math.ceil(Math.max(hiA, hiB) + 0.5);

  return (
    <section className="card grid gap-x-10 gap-y-6 p-6 md:grid-cols-2 md:items-center">
      <div>
        <p className="eyebrow mb-2">
          <L en="Day & night" id="Siang & malam" />
        </p>
        <p className="text-sm leading-relaxed text-text-secondary">
          {tight ? (
            <L
              en={`Both cities have a similar day–night swing (${f(sA)}° vs ${f(sB)}°).`}
              id={`Kedua kota punya selisih siang–malam yang mirip (${f(sA)}° vs ${f(sB)}°).`}
            />
          ) : (
            <>
              <span style={{ color: smallerColor }}>{smaller.region.name}</span>{" "}
              <L
                en={`has the smaller day–night swing, ${f(Math.min(sA, sB))}° vs ${f(Math.max(sA, sB))}°, so its nights stay warmer.`}
                id={`punya selisih siang–malam lebih kecil, ${f(Math.min(sA, sB))}° vs ${f(Math.max(sA, sB))}°, jadi malamnya tetap lebih hangat.`}
              />
            </>
          )}{" "}
          <span style={{ color: warmerColor }}>{warmer.region.name}</span>{" "}
          <L
            en={`runs warmer over the full 24 hours (${f(Math.max(mA, mB))}° vs ${f(Math.min(mA, mB))}° mean). “Avg daily high” above is the afternoon peak; the temperature chart below plots the 24-hour mean.`}
            id={`lebih hangat sepanjang 24 jam (rata-rata ${f(Math.max(mA, mB))}° vs ${f(Math.min(mA, mB))}°). “Rata-rata suhu maks” di atas adalah puncak siang; grafik suhu di bawah memakai rata-rata 24 jam.`}
          />
        </p>
      </div>

      {/* Both ranges on one axis: bar = night→day span, tick = 24h mean. */}
      <div>
        <div className="space-y-4">
          <RangeBar
            name={a.region.name}
            color="var(--series-1)"
            lo={loA}
            hi={hiA}
            mean={mA}
            domLo={domLo}
            domHi={domHi}
          />
          <RangeBar
            name={b.region.name}
            color="var(--series-2)"
            lo={loB}
            hi={hiB}
            mean={mB}
            domLo={domLo}
            domHi={domHi}
          />
        </div>
        <div className="font-numeric mt-2 flex justify-between text-2xs text-text-muted">
          <span>{domLo}°</span>
          <span className="text-text-secondary">
            <L en="bar = night→day · tick = 24h mean" id="batang = malam→siang · garis = rata-rata 24 jam" />
          </span>
          <span>{domHi}°</span>
        </div>
      </div>
    </section>
  );
}

/**
 * Reads ?a=slug&b=slug and renders the comparison client-side.
 *
 * This used to be a /compare/[a]-vs-[b] route rendered server-side. A static
 * export (`output: 'export'`) can't do that: every dynamic route segment has
 * to be enumerated at build time, and 75 cities means ~2,775 possible pairs —
 * far too many to pre-render. Query params sidestep the problem entirely:
 * there's only one static /compare page, and reading `a`/`b` plus fetching
 * the comparison happens in the browser after the page has already loaded —
 * which works the same whether the data behind it is a live API call or a
 * static JSON file (api.compare() already branches on that internally).
 */
/** One sentence on how the two cities differ, from the fitted warming trend
 *  and the long-run average daily high. Says "similar" rather than
 *  inventing a ratio when the two rates are close or either is ~flat. */
function Verdict({ a, b }: { a: CompareProfile; b: CompareProfile }) {
  const wa = a.warming_trend.slope !== null ? a.warming_trend.slope * 10 : null;
  const wb = b.warming_trend.slope !== null ? b.warming_trend.slope * 10 : null;
  const ha = avgField(a, "avg_temp_max");
  const hb = avgField(b, "avg_temp_max");
  if (wa === null || wb === null || ha === null || hb === null) return null;
  const A = <span style={{ color: "var(--series-1)" }}>{a.region.name}</span>;
  const B = <span style={{ color: "var(--series-2)" }}>{b.region.name}</span>;
  const aFaster = wa >= wb;
  const wf = aFaster ? wa : wb;
  const ws = aFaster ? wb : wa;
  const F = aFaster ? A : B;
  const S = aFaster ? B : A;
  const ratio = ws > 0.02 ? wf / ws : null;
  const hotter = ha >= hb ? A : B;
  const gap = Math.abs(ha - hb);
  return (
    <p className="max-w-4xl font-display text-title font-semibold leading-snug text-text-primary">
      {ratio !== null && ratio >= 1.25 ? (
        <>
          {F} <L en="is warming about" id="memanas sekitar" />{" "}
          <span className="num-display">
            <N value={ratio} />×
          </span>{" "}
          <L en="as fast as" id="lebih cepat dari" /> {S}
        </>
      ) : (
        <>
          {A} <L en="and" id="dan" /> {B}{" "}
          <L en="are warming at a similar pace" id="memanas dengan laju yang mirip" />
        </>
      )}{" "}
      (<span className="num-display"><N value={wf} digits={2} signed /></span> vs{" "}
      <span className="num-display"><N value={ws} digits={2} signed /></span>{" "}
      <L en="°C per decade)." id="°C per dekade)." />{" "}
      {gap >= 0.3 ? (
        <>
          {hotter}{" "}
          <L en="is the hotter city by" id="lebih panas sekitar" />{" "}
          <span className="num-display text-heat-light"><N value={gap} unit=" °C" /></span>{" "}
          <L en="on a typical afternoon." id="pada siang hari biasa." />
        </>
      ) : (
        <L en="Their afternoons are about equally hot." id="Siang harinya kira-kira sama panas." />
      )}
    </p>
  );
}

export default function CompareResult({ regions }: { regions: Region[] }) {
  const params = useSearchParams();
  const slugA = params.get("a");
  const slugB = params.get("b");

  const [compare, setCompare] = useState<CompareResponse | null>(null);
  const [error, setError] = useState(false);
  const [stripes, setStripes] = useState<Map<string, StripeSeries>>(new Map());
  const lang = useLang();

  useEffect(() => {
    api
      .stripes()
      .then((s) => setStripes(new Map(s.results.map((r) => [r.slug, r]))))
      .catch(() => {});
  }, []);

  const regionA = regions.find((r) => r.slug === slugA);
  const regionB = regions.find((r) => r.slug === slugB);

  useEffect(() => {
    setCompare(null);
    setError(false);
    if (!regionA || !regionB) return;
    let cancelled = false;
    api
      .compare(regionA, regionB)
      .then((d) => !cancelled && setCompare(d))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionA?.slug, regionB?.slug]);

  if (!slugA || !slugB) return null;

  if (!regionA || !regionB || error) {
    return (
      <div className="card p-6 text-sm text-text-secondary">
        <L en="Couldn't load that comparison." id="Perbandingan itu tidak bisa dimuat." />{" "}
        <Link href="/compare" className="text-rain-blue hover:underline">
          <L en="Pick two cities again." id="Pilih dua kota lagi." />
        </Link>
      </div>
    );
  }

  if (!compare) {
    return (
      <div className="card p-10 text-center text-sm text-text-muted">
        <L en="Loading…" id="Memuat…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-6 pt-2">
        <h2 className="font-display text-hero font-semibold">
          <span style={{ color: "var(--series-1)" }}>{compare.a.region.name}</span>
          <span className="mx-3 font-sans text-2xl font-normal text-text-muted">vs</span>
          <span style={{ color: "var(--series-2)" }}>{compare.b.region.name}</span>
        </h2>
        <Verdict a={compare.a} b={compare.b} />
        {stripes.has(compare.a.region.slug) && stripes.has(compare.b.region.slug) && (
          <div className="space-y-2">
            {[compare.a, compare.b].map((p, i) => (
              <div key={p.region.slug} className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <span
                  className="truncate font-display text-lg font-semibold"
                  style={{ color: i === 0 ? "var(--series-1)" : "var(--series-2)" }}
                >
                  {p.region.name}
                </span>
                <Stripes anomalies={stripes.get(p.region.slug)!.anomalies} className="h-9 w-full" />
              </div>
            ))}
            <p className="font-numeric pl-[8rem] text-2xs text-text-muted sm:pl-[11rem]">
              <L
                en="each stripe = one year's average daily high vs its own 1951–1980 · blue cooler, orange hotter"
                id="tiap garis = suhu tertinggi harian setahun vs 1951–1980 kota itu · biru lebih sejuk, oranye lebih panas"
              />
            </p>
          </div>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <ComparePanel profile={compare.a} slot={1} />
        <ComparePanel profile={compare.b} slot={2} />
      </div>

      {(annualCoverage(compare.a) < 0.9 || annualCoverage(compare.b) < 0.9) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            {annualCoverage(compare.a) < 0.9 && (
              <NullDataWarning coverage={annualCoverage(compare.a)} unit="years" />
            )}
          </div>
          <div>
            {annualCoverage(compare.b) < 0.9 && (
              <NullDataWarning coverage={annualCoverage(compare.b)} unit="years" />
            )}
          </div>
        </div>
      )}

      {/* DESIGN.md §9: "two fingerprints, same variable, same layers, same
          zoom, side by side" — the fingerprint's own record-spanning ramps,
          not the entity colours above, so it goes before the smaller
          day/night and monthly-shape insights below it. */}
      <CompareFingerprints regionA={regionA} regionB={regionB} />

      <DayNightInsight a={compare.a} b={compare.b} />

      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyBarChart
          a={compare.a}
          b={compare.b}
          metric="avg_temp_mean"
          title={lang === "en" ? "Average monthly temperature" : "Rata-rata suhu bulanan"}
          unit={lang === "en" ? "°C (daily mean)" : "°C (rata-rata harian)"}
        />
        <MonthlyBarChart
          a={compare.a}
          b={compare.b}
          metric="avg_precipitation"
          title={lang === "en" ? "Average monthly rainfall" : "Rata-rata curah hujan bulanan"}
          unit="mm"
        />
      </div>
    </div>
  );
}
