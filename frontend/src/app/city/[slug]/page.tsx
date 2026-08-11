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
import WorkedExample from "@/components/fingerprint/WorkedExample";

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
    const title = `${region.name} climate`;
    const description = `Climate data for ${region.name}, ${region.province}, ${span} — rainfall, temperature, extreme days and season shift.`;

    // One title/description pair, reused for the page, the share card and the
    // tweet. Previously only `title` and `description` were set here, so
    // openGraph fell through to the root layout's static block and all 90
    // city pages previewed as the generic site — pasting a Jakarta link into
    // Slack showed "ClimateWatch — Climate Intelligence for Indonesia".
    // Building them from the same two consts is what stops the share card
    // drifting from the page.
    return {
      title,
      description,
      alternates: { canonical: `/city/${region.slug}` },
      openGraph: {
        type: "article",
        siteName: "ClimateWatch",
        locale: "en",
        url: `/city/${region.slug}`,
        title: `${region.name} — ${region.province}`,
        description,
      },
      twitter: {
        card: "summary",
        title: `${region.name} climate`,
        description,
      },
    };
  } catch {
    return { title: "City" };
  }
}

/**
 * One band of related panels.
 *
 * The group label is the <h2>; the panels inside carry <h3>. That is what
 * makes this page's outline two levels deep — it was nine sibling <h2>s with
 * no indication of which belonged together.
 */
function PageGroup({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="pt-6">
      <h2 id={id} className="eyebrow mb-4">
        {label}
      </h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
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

  const [
    fingerprint,
    tempMax,
    extremes,
    season,
    ensoImpact,
    movers,
    workedExample,
  ] =
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
      api.workedExample(region).catch(() => null),
    ]);

  // Collapse 924 monthly cells to 77 {year, sum, n} rows before they cross
  // into a client component. PersonalBaseline only ever averages over year
  // ranges, and sum/count preserves that exactly — including for years with
  // missing months, where the count carries the weighting.
  const tempMaxByYear = tempMax
    ? Object.values(
        tempMax.data.reduce<Record<number, { year: number; sum: number; n: number }>>(
          (acc, d) => {
            if (d.value === null) return acc;
            acc[d.year] ??= { year: d.year, sum: 0, n: 0 };
            acc[d.year].sum += d.value;
            acc[d.year].n += 1;
            return acc;
          },
          {},
        ),
      )
    : null;

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
            {/* Province leads, coordinates follow. This matched the home cards'
                old ordering, which put a decimal lat/long where the
                identifying fact belongs — nobody recognises a city from
                106.846°, and the province was buried in the breadcrumb. */}
            <p className="mt-2 text-base text-text-secondary">
              {region.province}
            </p>
            <p className="font-numeric mt-1 text-2xs uppercase tracking-wider text-text-muted">
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

      {/* Three groups, not eight identical slabs. Every panel used to be a
          `.card p-6` at the same width and weight in one flat space-y-6, so
          nothing signalled that some are findings, some are trends and one is
          a driver. Spacing carries the grouping — tighter within a group than
          between — with no new chrome and no new colour. */}
      <PageGroup id="g-record" label="What the record shows">
        {movers && <WhatMovedMost data={movers} />}
        {/* Before the grid, not after: learn to read one square before
            meeting 924 of them. */}
        {workedExample && <WorkedExample data={workedExample} />}

        <FingerprintPanel region={region} initial={fingerprint} />
        {tempMaxByYear && year_from !== null && year_to !== null && (
          <PersonalBaseline
            series={tempMaxByYear}
            regionName={region.name}
            yearFrom={year_from}
            yearTo={year_to}
          />
        )}
      </PageGroup>

      <PageGroup id="g-trends" label="Trends over time">
        <div className="grid gap-5 lg:grid-cols-2">
          {extremes && <ExtremeDaysChart data={extremes} headingLevel="h3" />}
          {season && <SeasonShiftScatter data={season} headingLevel="h3" />}
        </div>
        {season && <SeasonLengthChart data={season} headingLevel="h3" />}
      </PageGroup>

      {ensoImpact && (
        <PageGroup id="g-drivers" label="What drives the swings">
          <ENSOImpactCard data={ensoImpact} headingLevel="h3" />
        </PageGroup>
      )}

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
