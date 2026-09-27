import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { routeMetadata } from "@/lib/metadata";
import { L } from "@/lib/i18n";
import { CityStructuredData } from "@/components/ui/StructuredData";
import FingerprintPanel from "@/components/fingerprint/FingerprintPanel";
import FingerprintRecordSection from "@/components/fingerprint/FingerprintRecordSection";
import ForecastContextLoader from "@/components/charts/ForecastContextLoader";
import WorkedExample from "@/components/fingerprint/WorkedExample";
import NullDataWarning from "@/components/ui/NullDataWarning";
import Stripes from "@/components/ui/Stripes";
import CityHeadline from "@/components/city/CityHeadline";
import SectionTabs from "@/components/city/SectionTabs";
import ShareMenu from "@/components/city/ShareMenu";
import NearbyCities from "@/components/city/NearbyCities";

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
    // Same helper the other routes use, so a city card carries the site
    // image and card type without this file restating them.
    return routeMetadata({
      title: `${region.name} climate`,
      cardTitle: `${region.name} — ${region.province}`,
      description: `Climate data for ${region.name}, ${region.province}, ${span} — rainfall, temperature, extreme days and season shift.`,
      path: `/city/${region.slug}`,
      // Rendered at build time from this city's own rainfall grid, so a shared
      // link previews the actual fingerprint rather than a generic logo.
      image: `/og/${region.slug}.png`,
      type: "article",
    });
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
        <p className="eyebrow">
          <L en="No data yet" id="Belum ada data" />
        </p>
        <h1 className="mt-4 text-hero font-semibold">{region.name}</h1>
        <p className="mt-4 leading-relaxed text-text-secondary">
          <L
            en={`Climate data for ${region.name} hasn't been loaded yet. It will appear here once it is.`}
            id={`Data iklim untuk ${region.name} belum dimuat. Data akan muncul di sini setelah dimuat.`}
          />
        </p>
        <Link href="/" className="btn-ghost mt-8 px-5 py-2.5 text-sm">
          <L en="← Back to cities" id="← Kembali ke daftar kota" />
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
    ensoEvents,
    stripes,
    regions,
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
      api.ensoEvents().catch(() => []),
      api.stripes().catch(() => null),
      api.allRegions().catch(() => []),
    ]);
  const stripeMap = new Map((stripes?.results ?? []).map((r) => [r.slug, r]));
  const ownStripes = stripeMap.get(region.slug) ?? null;

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

  // DESIGN.md §7/§10 step 9: "Render NullDataWarning wherever coverage for
  // the displayed window falls below 90%." No day-level coverage figure is
  // ever exposed to this frontend (ERA5 daily rows live only in the
  // backend), so this counts what the page actually renders: non-null
  // months in the precipitation fingerprint already fetched above, out of
  // every month the record's own year range implies.
  const coverage =
    fingerprint.data.length > 0
      ? fingerprint.data.filter((d) => d.value !== null).length /
        fingerprint.data.length
      : 1;

  return (
    <div className="space-y-8">
      <CityStructuredData
        name={region.name}
        province={region.province}
        slug={region.slug}
        yearFrom={year_from}
        yearTo={year_to}
        latitude={region.latitude}
        longitude={region.longitude}
      />

      {/* ── Masthead ────────────────────────────────────────────────────── */}
      <header className="pt-10 sm:pt-14">
        <nav aria-label="Breadcrumb" className="text-xs text-text-muted">
          <Link href="/" className="transition-colors hover:text-text-primary">
            <L en="Explore" id="Jelajah" />
          </Link>
          <span aria-hidden className="mx-2 text-border-strong">/</span>
          <span className="text-text-secondary">{region.province}</span>
        </nav>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="font-display text-display font-semibold">{region.name}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-text-secondary">
              <span>{region.province}</span>
              <span className="font-numeric text-2xs text-text-muted">
                {region.latitude.toFixed(3)}°, {region.longitude.toFixed(3)}° · {year_from}–{year_to}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ShareMenu slug={region.slug} title={`${region.name} — ClimateWatch`} />
            <Link href={`/compare?a=${region.slug}`} className="btn-ghost px-4 py-2 text-sm">
              <L en="Compare" id="Bandingkan" />
            </Link>
          </div>
        </div>
      </header>

      {/* Identity bar: this city's warming stripes, edge to edge. */}
      {ownStripes && (
        <div className="-mx-5 sm:-mx-8">
          <Stripes
            anomalies={ownStripes.anomalies}
            rounded={false}
            className="h-4 w-full"
            label={`Warming stripes for ${region.name}, ${ownStripes.year_from}–${ownStripes.year_from + ownStripes.anomalies.length - 1}`}
          />
          <div className="font-numeric mt-1.5 flex justify-between px-5 text-2xs text-text-muted sm:px-8">
            <span>{ownStripes.year_from}</span>
            <span className="hidden sm:inline">
              <L
                en="each stripe = one year's average daily high vs 1951–1980 · blue cooler, orange hotter"
                id="tiap garis = suhu tertinggi harian rata-rata setahun vs 1951–1980 · biru lebih sejuk, oranye lebih panas"
              />
            </span>
            <span>{ownStripes.year_from + ownStripes.anomalies.length - 1}</span>
          </div>
        </div>
      )}

      <NullDataWarning coverage={coverage} unit="months" />

      <CityHeadline name={region.name} stripes={ownStripes} movers={movers} />

      <SectionTabs />

      <div id="fingerprint" className="scroll-mt-32 space-y-8">
        {year_from !== null && year_to !== null ? (
          <FingerprintRecordSection
            region={region}
            initialFingerprint={fingerprint}
            ensoEvents={ensoEvents}
            season={season}
            ensoImpact={ensoImpact}
            extremes={extremes}
            tempMaxByYear={tempMaxByYear}
            regionName={region.name}
            yearFrom={year_from}
            yearTo={year_to}
          />
        ) : (
          <FingerprintPanel
            region={region}
            initial={fingerprint}
            ensoEvents={ensoEvents}
            season={season}
            ensoImpact={ensoImpact}
            extremes={extremes}
          />
        )}
      </div>

      <ForecastContextLoader region={region} />

      {workedExample && (
        <details id="how" className="card group scroll-mt-32">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 sm:px-8 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="eyebrow block">
                <L en="How to read it" id="Cara membaca" />
              </span>
              <span className="mt-2 block font-display text-2xl font-semibold">
                <L en="Where one square comes from" id="Dari mana satu kotak berasal" />
              </span>
            </span>
            <span aria-hidden className="font-numeric text-2xl text-text-muted transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="border-t border-border p-6 sm:p-8">
            <WorkedExample data={workedExample} />
          </div>
        </details>
      )}

      <NearbyCities region={region} regions={regions} stripes={stripeMap} />
    </div>
  );
}
