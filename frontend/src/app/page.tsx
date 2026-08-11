import Link from "next/link";
import { api } from "@/lib/api";
import CitySearch from "@/components/ui/CitySearch";
import IndonesiaMap from "@/components/map/IndonesiaMap";
import FingerprintPreview from "@/components/fingerprint/FingerprintPreview";
import { getIndonesiaGeometry } from "@/lib/indonesia-geo";
import type { FingerprintResponse, Region } from "@/lib/types";

/** The city the hero speaks for when nothing has been searched yet. */
const LEAD_CITY = "jakarta";

/**
 * Mean of a fingerprint variable across an inclusive year range, ignoring
 * null months. Used to answer the headline's question with a real number
 * instead of restating the question.
 */
function meanOverYears(
  fp: FingerprintResponse,
  from: number,
  to: number,
): number | null {
  const values = fp.data
    .filter((d) => d.year >= from && d.year <= to && d.value !== null)
    .map((d) => d.value as number);
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export default async function HomePage() {
  const regions = await api.allRegions().catch(() => []);
  const indonesiaGeometry = getIndonesiaGeometry();

  // Every seeded region currently ships with is_featured=true, so this section
  // would otherwise render as a 45-card wall. Cap it at two rows and send the
  // long tail to the search box, which already covers all of them.
  const FEATURED_LIMIT = 8;
  const allFeatured = regions.filter((r) => r.is_featured);
  const featured = allFeatured.slice(0, FEATURED_LIMIT);
  const remaining = allFeatured.length - featured.length;

  const withData = regions.filter((r) => r.has_data);
  const lead: Region | undefined =
    withData.find((r) => r.slug === LEAD_CITY) ?? withData[0];

  // The hero shows the product, not a description of it: one real city's
  // rainfall fingerprint, and one real warming figure derived from the same
  // dataset. Both are read at build time from the static export — nothing here
  // is a hard-coded headline number.
  const [leadRain, leadHeat] = lead
    ? await Promise.all([
        api.fingerprint(lead, "precipitation").catch(() => null),
        api.fingerprint(lead, "temp_max").catch(() => null),
      ])
    : [null, null];

  const yearFrom = 1950;
  const yearTo = new Date().getFullYear();

  // Inclusive span: 1950–2026 is 77 years of record, not 76. The old
  // subtraction silently under-reported the archive by one year.
  const yearsOfRecord = yearTo - yearFrom + 1;

  // First full decade of the record against the most recent complete one.
  const baseline = leadHeat ? meanOverYears(leadHeat, 1950, 1959) : null;
  const recent = leadHeat
    ? meanOverYears(leadHeat, yearTo - 10, yearTo - 1)
    : null;
  const warming =
    baseline !== null && recent !== null ? recent - baseline : null;

  const stats = [
    {
      value: `${yearsOfRecord}`,
      label: "years of daily records",
      suffix: "yr",
    },
    {
      value: `${withData.length || "—"}`,
      label: "Indonesian cities loaded",
    },
    {
      // The grid size, not a count of populated months — the current year is
      // still filling in, so "mapped" would overclaim.
      value: `${(yearsOfRecord * 12).toLocaleString("en-US")}`,
      label: "months per fingerprint",
    },
  ];

  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative -mx-5 overflow-hidden px-5 pb-16 pt-16 sm:-mx-8 sm:px-8 sm:pt-24">
        <div className="canvas-aurora" aria-hidden />
        <div className="canvas-grid" aria-hidden />

        <div className="relative mx-auto max-w-4xl text-center">
          <p className="eyebrow animate-rise">
            {yearFrom}–{yearTo} · ERA5 Reanalysis
          </p>

          <h1 className="animate-rise mt-6 text-display font-semibold">
            Is your city actually
            <br className="hidden sm:block" />{" "}
            <span className="text-gradient">getting hotter?</span>
          </h1>

          {/* Answer the question — and show the arithmetic that produced the
              answer. A bare "+2.1 °C" asks to be trusted; the two decade means
              either side of it can be checked against the city page. */}
          {/* One measure for the whole hero body. The answer, the caveat and
              the pitch previously ran at max-w-2xl, max-w-prose and max-w-xl —
              three widths stacked and centred, which tapered the block into a
              pyramid with ragged gaps down both sides. */}
          {lead && warming !== null && baseline !== null && recent !== null && (
            <div className="animate-rise mx-auto mt-6 max-w-2xl">
              <p className="text-balance text-xl text-text-primary">
                Yes. In the 1950s an average day in {lead.name} peaked at{" "}
                <span className="font-numeric whitespace-nowrap">
                  {baseline.toFixed(1)} °C
                </span>
                . Over {yearTo - 10}–{yearTo - 1} it peaked at{" "}
                <span className="font-numeric whitespace-nowrap">
                  {recent.toFixed(1)} °C
                </span>
                .
              </p>
              <p className="mt-3 text-balance text-xl text-text-primary">
                That is{" "}
                <span className="font-numeric whitespace-nowrap font-medium text-heat-light">
                  {warming.toFixed(1)} °C
                </span>{" "}
                of warming, inside one lifetime.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-text-muted">
                Both figures are ten-year averages of the daily maximum, so one
                hot year cannot swing them. Subtracting two endpoints is not the
                same as fitting a line through all 77 years — {lead.name}&rsquo;s
                page reports that separately, and the two will not match. Neither
                is wrong; they answer different questions.
              </p>
            </div>
          )}

          <p className="animate-rise mx-auto mt-5 max-w-2xl text-balance text-lg text-text-secondary">
            ClimateWatch turns {yearsOfRecord} years of daily weather records
            into one picture per city, so you can see how rainfall, temperature
            and extreme weather have{" "}
            <em className="not-italic text-text-primary">actually</em> changed —
            not how they feel.
          </p>

          {/* Two ways in, because most first-time visitors will not type.

              relative z-20 is load-bearing: .animate-rise animates a transform,
              which gives this div and the stat strip below it each their own
              stacking context. The search results' z-30 is then trapped inside
              this one, and the stat strip — a later sibling — painted over the
              dropdown. Raising this whole context fixes it; bumping the
              dropdown's own z-index could not. */}
          <div className="animate-rise relative z-20 mx-auto mt-10 flex max-w-xl flex-col gap-3">
            <CitySearch regions={regions} />
            {lead && (
              <p className="text-sm text-text-muted">
                or jump straight to{" "}
                <Link
                  href={`/city/${lead.slug}`}
                  className="font-medium text-rain-light underline decoration-rain-blue/40 underline-offset-4 transition-colors hover:decoration-rain-light"
                >
                  {lead.name}&rsquo;s full climate record →
                </Link>
              </p>
            )}
          </div>

          {/* Stat strip */}
          <dl className="animate-rise mx-auto mt-14 flex max-w-2xl items-stretch justify-center divide-x divide-border">
            {stats.map((s) => (
              <div key={s.label} className="flex-1 px-4 sm:px-8">
                <dd className="font-numeric text-2xl font-medium text-text-primary sm:text-3xl">
                  {s.value}
                  {s.suffix && (
                    <span className="ml-0.5 text-base text-text-muted">
                      {s.suffix}
                    </span>
                  )}
                </dd>
                <dt className="mt-1.5 text-xs leading-tight text-text-muted">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── The artifact itself ─────────────────────────────────────────── */}
      {/* Showing one real fingerprint beats describing it. This is the first
          thing below the headline for a reason: it is the fastest available
          explanation of what the product produces. */}
      {leadRain && (
        <section className="animate-rise mt-2">
          <div className="mb-5">
            <p className="eyebrow">The Climate Fingerprint</p>
            <h2 className="mt-2 text-title font-semibold">
              Every city gets one of these
            </h2>
          </div>
          <FingerprintPreview fingerprint={leadRain} />

          {/* "ERA5 Reanalysis" is in the eyebrow at the top of this page and
              nowhere is it explained. It is the single biggest assumed word on
              the site, and what it means changes how much weight a reader
              should put on any number here. */}
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-text-muted">
            Where this comes from:{" "}
            <span className="text-text-secondary">ERA5 reanalysis</span> is not
            a thermometer archive. It is a weather model re-run over every
            historical observation available — satellites, ships, balloons,
            stations — to produce one gap-free record with the same method
            applied to 1950 as to today. That consistency is what makes a
            77-year comparison possible, and it is also the catch: a value is a
            modelled estimate for a ~30km grid square, not a reading from your
            street. Local effects like an urban heat island or a narrow valley
            are smoothed away.
          </p>
        </section>
      )}

      {/* ── Featured cities ─────────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Start here</p>
            <h2 className="mt-2 text-title font-semibold">Featured cities</h2>
          </div>
          <p className="hidden max-w-xs text-right text-sm text-text-muted sm:block">
            {remaining > 0 ? (
              <>{remaining} more in the search box above.</>
            ) : (
              <>Each city opens on its Climate Fingerprint.</>
            )}
          </p>
        </div>

        {featured.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/city/${r.slug}`}
                  className="group relative flex h-full flex-col justify-between overflow-hidden rounded-lg border border-border bg-surface p-5 transition duration-200 ease-ease hover:-translate-y-0.5 hover:border-border-strong hover:shadow-float"
                >
                  {/* Hover wash — warm, subtle, non-informational. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rain-blue/0 to-heat-orange/0 opacity-0 transition-opacity duration-300 group-hover:from-rain-blue/[0.07] group-hover:to-heat-orange/[0.07] group-hover:opacity-100"
                  />
                  <div className="relative">
                    <div className="font-display text-xl font-semibold leading-tight text-text-primary">
                      {r.name}
                    </div>
                    {/* Province, not latitude. A visitor locates a city by the
                        province it sits in; nobody recognises a city from its
                        decimal coordinates, which is what used to occupy this
                        slot in 10px type. */}
                    <div className="mt-1.5 text-sm leading-snug text-text-secondary">
                      {r.province}
                    </div>
                  </div>
                  <div className="relative mt-6 flex items-center justify-between">
                    <span className="text-2xs text-text-muted">
                      {yearFrom}–{yearTo}
                    </span>
                    <span
                      aria-hidden
                      className="text-text-muted transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-text-primary"
                    >
                      →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface/50 p-10 text-center">
            {/* User-facing wording only. The old copy printed a Django
                management command at visitors, who can neither run it nor
                read it as anything but a broken page. */}
            <p className="text-base text-text-secondary">
              No cities are available right now.
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">
              The climate archive could not be reached. This is on our end —
              please try again shortly.
            </p>
          </div>
        )}
      </section>

      {regions.length > 0 && (
        <section className="mt-4">
          <IndonesiaMap regions={regions} geometry={indonesiaGeometry} />
        </section>
      )}
    </>
  );
}
