import Link from "next/link";
import { api } from "@/lib/api";
import CitySearch from "@/components/ui/CitySearch";
import IndonesiaMap from "@/components/map/IndonesiaMap";

export default async function HomePage() {
  const regions = await api.allRegions().catch(() => []);

  // Every seeded region currently ships with is_featured=true, so this section
  // would otherwise render as a 45-card wall. Cap it at two rows and send the
  // long tail to the search box, which already covers all of them.
  const FEATURED_LIMIT = 8;
  const allFeatured = regions.filter((r) => r.is_featured);
  const featured = allFeatured.slice(0, FEATURED_LIMIT);
  const remaining = allFeatured.length - featured.length;

  // Derived from real data only — never hard-code a headline number.
  const yearFrom = 1950;
  const yearTo = new Date().getFullYear();
  const stats = [
    { value: `${yearTo - yearFrom}`, label: "years of record", suffix: "yr" },
    { value: `${regions.length || "—"}`, label: "Indonesian cities" },
    { value: "ERA5", label: "reanalysis source" },
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

          <p className="animate-rise mx-auto mt-7 max-w-xl text-lg leading-relaxed text-text-secondary">
            Iklim turns three-quarters of a century of climate data into a
            visual story for any Indonesian city — how rainfall, temperature,
            and extreme weather have <em className="text-text-primary not-italic">really</em> changed.
          </p>

          <div className="animate-rise mx-auto mt-10 max-w-xl">
            <CitySearch regions={regions} />
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

      {/* ── Featured cities ─────────────────────────────────────────────── */}
      <section className="mt-4">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Start here</p>
            <h2 className="mt-2 text-title font-semibold">Featured cities</h2>
          </div>
          <p className="hidden max-w-xs text-right text-sm text-text-muted sm:block">
            {remaining > 0 ? (
              <>
                {remaining} more cities — search above.
              </>
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
                    <div className="font-display text-lg font-semibold leading-tight text-text-primary">
                      {r.name}
                    </div>
                    <div className="mt-1 text-xs leading-snug text-text-muted">
                      {r.province}
                    </div>
                  </div>
                  <div className="relative mt-6 flex items-center justify-between">
                    <span className="font-numeric text-[10px] uppercase tracking-wider text-text-muted">
                      {r.latitude.toFixed(2)}°, {r.longitude.toFixed(2)}°
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
            <p className="text-sm text-text-secondary">
              No regions loaded yet. Run{" "}
              <code className="font-numeric rounded bg-surface-inset px-1.5 py-0.5 text-xs text-heat-light">
                manage.py load_regions
              </code>{" "}
              on the backend.
            </p>
          </div>
        )}
      </section>

      {regions.length > 0 && (
        <section className="mt-4">
          <IndonesiaMap regions={regions} />
        </section>
      )}
    </>
  );
}
