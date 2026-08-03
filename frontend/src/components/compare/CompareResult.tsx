"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { CompareProfile, CompareResponse, Region } from "@/lib/types";
import { diurnalSwing } from "@/lib/format";
import ComparePanel from "./ComparePanel";
import MonthlyBarChart from "@/components/charts/MonthlyBarChart";

/** Mean of the 12-month daily-mean climatology. */
function climMean(p: CompareProfile): number | null {
  const t = p.climatology.filter((c) => c.avg_temp_mean !== null);
  if (!t.length) return null;
  return t.reduce((s, c) => s + (c.avg_temp_mean ?? 0), 0) / t.length;
}

/** Plain-language read of the two cities' day–night rhythm and 24h average. */
function DayNightInsight({ a, b }: { a: CompareProfile; b: CompareProfile }) {
  const sA = diurnalSwing(a.climatology);
  const sB = diurnalSwing(b.climatology);
  const mA = climMean(a);
  const mB = climMean(b);
  if (sA === null || sB === null || mA === null || mB === null) return null;

  const tight = Math.abs(sA - sB) < 0.3;
  const smaller = sA <= sB ? a : b; // smaller swing = warmer nights
  const smallerColor = smaller === a ? "var(--series-1)" : "var(--series-2)";
  const warmer = mA >= mB ? a : b; // higher 24h average
  const warmerColor = warmer === a ? "var(--series-1)" : "var(--series-2)";

  return (
    <section className="card p-6">
      <p className="eyebrow mb-2">Day &amp; night</p>
      <p className="max-w-prose text-sm leading-relaxed text-text-secondary">
        {tight ? (
          <>
            Both cities have a similar day–night swing (
            <span className="font-numeric text-text-primary">
              {sA.toFixed(1)}°
            </span>{" "}
            vs{" "}
            <span className="font-numeric text-text-primary">
              {sB.toFixed(1)}°
            </span>
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
        afternoon peak, while the temperature chart below plots the 24-hour mean
        — so the same city can top one and not the other.
      </p>
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
