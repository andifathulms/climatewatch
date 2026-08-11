import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import FingerprintPanel from "@/components/fingerprint/FingerprintPanel";
import ExtremeDaysChart from "@/components/charts/ExtremeDaysChart";
import SeasonShiftScatter from "@/components/charts/SeasonShiftScatter";
import ForecastContextLoader from "@/components/charts/ForecastContextLoader";
import ENSOImpactCard from "@/components/charts/ENSOImpactCard";
import SeasonLengthChart from "@/components/charts/SeasonLengthChart";
import WhatMovedMost from "@/components/charts/WhatMovedMost";
import PersonalBaseline from "@/components/charts/PersonalBaseline";

// Required for `output: 'export'` (static mode) — every dynamic segment must
// be enumerated at build time since there's no server to resolve one on
// request. Harmless in live mode too: Next just uses it to prerender/cache.
export async function generateStaticParams() {
  const regions = await api.allRegions().catch(() => []);
  return regions.filter((r) => r.has_data).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const region = await api.region(params.slug);
    // Derived, not asserted. This said "75 years" while the home page said 77,
    // so search results and the page they led to disagreed about the size of
    // the archive. The range is per-city anyway.
    const { year_from, year_to } = region.data_availability;
    const span = year_from && year_to ? `${year_from}–${year_to}` : "since 1950";
    return {
      title: `${region.name} climate`,
      description: `Climate data for ${region.name}, ${region.province}, ${span} — rainfall, temperature, extreme days and season shift.`,
    };
  } catch {
    return { title: "City" };
  }
}

export default async function CityPage({
  params,
}: {
  params: { slug: string };
}) {
  const region = await api.region(params.slug).catch(() => null);
  if (!region) notFound();

  if (!region.data_availability.has_data) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <p className="eyebrow">No data yet</p>
        <h1 className="mt-4 text-hero font-semibold">{region.name}</h1>
        <p className="mt-4 leading-relaxed text-text-secondary">
          Climate data for {region.name} hasn&apos;t been loaded yet. Run this
          on the backend to fetch it:
        </p>
        <code className="font-numeric mt-5 block overflow-x-auto rounded-lg border border-border bg-surface-inset px-4 py-3 text-left text-xs text-heat-light">
          manage.py climate_bootstrap --slug {region.slug}
        </code>
        <Link href="/" className="btn-ghost mt-8 px-5 py-2.5 text-sm">
          ← Back to cities
        </Link>
      </div>
    );
  }

  const [fingerprint, tempMax, extremes, season, ensoImpact, movers] =
    await Promise.all([
      api.fingerprint(region, "precipitation"),
      // Fetched here rather than inside PersonalBaseline: that panel is a
      // client component (it re-baselines on ?since after mount) and so
      // cannot read the static export off disk itself.
      api.fingerprint(region, "temp_max").catch(() => null),
      api.extremes(region).catch(() => null),
      api.season(region).catch(() => null),
      api.ensoImpact(region).catch(() => null),
      api.movers(region).catch(() => null),
    ]);

  const { year_from, year_to, years_loaded } = region.data_availability;

  return (
    <div className="space-y-6">
      {/* ── City masthead ───────────────────────────────────────────────── */}
      <header className="relative -mx-5 overflow-hidden px-5 pb-10 pt-12 sm:-mx-8 sm:px-8">
        <div className="canvas-aurora opacity-60" aria-hidden />

        <nav aria-label="Breadcrumb" className="relative">
          <Link
            href="/"
            className="text-xs text-text-muted transition-colors hover:text-text-primary"
          >
            Cities
          </Link>
          <span aria-hidden className="mx-2 text-border-strong">
            /
          </span>
          <span className="text-xs text-text-secondary">{region.province}</span>
        </nav>

        <div className="relative mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-hero font-semibold">{region.name}</h1>
            <p className="font-numeric mt-2 text-xs uppercase tracking-wider text-text-muted">
              {region.latitude.toFixed(3)}°, {region.longitude.toFixed(3)}°
            </p>
          </div>

          <dl className="flex divide-x divide-border rounded-lg border border-border bg-surface/60 backdrop-blur-sm">
            <div className="px-5 py-3">
              <dt className="text-2xs uppercase tracking-wider text-text-muted">
                Record
              </dt>
              <dd className="font-numeric mt-0.5 text-sm font-medium">
                {year_from}–{year_to}
              </dd>
            </div>
            <div className="px-5 py-3">
              <dt className="text-2xs uppercase tracking-wider text-text-muted">
                Years
              </dt>
              <dd className="font-numeric mt-0.5 text-sm font-medium">
                {years_loaded}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <ForecastContextLoader region={region} />

      {/* Lead with the signal that actually moved here, before the charts that
          treat all four as equally important. */}
      {movers && <WhatMovedMost data={movers} />}

      <FingerprintPanel region={region} initial={fingerprint} />

      {tempMax && year_from !== null && year_to !== null && (
        <PersonalBaseline
          tempMax={tempMax}
          yearFrom={year_from}
          yearTo={year_to}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {extremes && <ExtremeDaysChart data={extremes} />}
        {season && <SeasonShiftScatter data={season} />}
      </div>

      {season && <SeasonLengthChart data={season} />}

      {ensoImpact && <ENSOImpactCard data={ensoImpact} />}

      {/* Compare CTA — the natural next step from a single city. */}
      <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">
            How does {region.name} compare?
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Put it side by side with another Indonesian city.
          </p>
        </div>
        <Link href="/compare" className="btn-primary px-5 py-2.5 text-sm">
          Compare cities →
        </Link>
      </section>
    </div>
  );
}
