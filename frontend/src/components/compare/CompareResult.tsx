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
          <span className="text-text-secondary">· {(hi - lo).toFixed(1)}° swing</span>
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
        <p className="eyebrow mb-2">Day &amp; night</p>
        <p className="text-sm leading-relaxed text-text-secondary">
          {tight ? (
            <>
              Both cities have a similar day–night swing (
              <span className="font-numeric text-text-primary">{sA.toFixed(1)}°</span>{" "}
              vs{" "}
              <span className="font-numeric text-text-primary">{sB.toFixed(1)}°</span>
              ).
            </>
          ) : (
            <>
              <span style={{ color: smallerColor }}>{smaller.region.name}</span> has
              the smaller day–night swing —{" "}
              <span className="font-numeric text-text-primary">
                {Math.min(sA, sB).toFixed(1)}°
              </span>{" "}
              vs{" "}
              <span className="font-numeric text-text-primary">
                {Math.max(sA, sB).toFixed(1)}°
              </span>{" "}
              — so its nights stay warmer.
            </>
          )}{" "}
          <span style={{ color: warmerColor }}>{warmer.region.name}</span> runs
          warmer over the full 24 hours (
          <span className="font-numeric text-text-primary">
            {Math.max(mA, mB).toFixed(1)}°
          </span>{" "}
          vs{" "}
          <span className="font-numeric text-text-primary">
            {Math.min(mA, mB).toFixed(1)}°
          </span>{" "}
          mean). That&apos;s the gap to keep in mind above: “avg daily high” is the
          afternoon peak, while the temperature chart below plots the 24-hour mean.
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
          <span className="text-text-secondary">bar = night→day · tick = 24h mean</span>
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
export default function CompareResult({ regions }: { regions: Region[] }) {
  const params = useSearchParams();
  const slugA = params.get("a");
  const slugB = params.get("b");

  const [compare, setCompare] = useState<CompareResponse | null>(null);
  const [error, setError] = useState(false);

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
        Couldn&apos;t load that comparison.{" "}
        <Link href="/compare" className="text-rain-blue hover:underline">
          Pick two cities
        </Link>{" "}
        again.
      </div>
    );
  }

  if (!compare) {
    return <div className="card p-10 text-center text-sm text-text-muted">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <header className="relative -mx-5 overflow-hidden px-5 pb-8 pt-4 sm:-mx-8 sm:px-8">
        <h2 className="relative text-hero font-semibold">
          <span style={{ color: "var(--series-1)" }}>{compare.a.region.name}</span>
          <span className="mx-3 font-sans text-2xl font-normal text-text-muted">vs</span>
          <span style={{ color: "var(--series-2)" }}>{compare.b.region.name}</span>
        </h2>
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
          title="Average monthly temperature"
          unit="°C (daily mean)"
        />
        <MonthlyBarChart
          a={compare.a}
          b={compare.b}
          metric="avg_precipitation"
          title="Average monthly rainfall"
          unit="mm"
        />
      </div>
    </div>
  );
}
