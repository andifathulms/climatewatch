import Link from "next/link";
import { api } from "@/lib/api";
import CitySearch from "@/components/ui/CitySearch";
import DataAttribution from "@/components/ui/DataAttribution";

export default async function HomePage() {
  const { results: regions } = await api.regions().catch(() => ({ results: [] }));
  const featured = regions.filter((r) => r.is_featured);

  return (
    <div>
      <section className="py-10 text-center">
        <h1 className="mx-auto max-w-2xl font-serif text-4xl font-bold leading-tight md:text-5xl">
          Is your city actually getting hotter?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-text-secondary">
          Iklim turns 75+ years of ERA5 climate data into a visual story for any
          Indonesian city. Pick a city and see how rainfall, temperature, and
          extreme weather have really changed.
        </p>
        <div className="mx-auto mt-8 max-w-lg">
          <CitySearch regions={regions} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Featured cities</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {featured.map((r) => (
            <Link
              key={r.slug}
              href={`/city/${r.slug}`}
              className="rounded-lg border border-border bg-surface p-4 transition hover:border-rain-blue"
            >
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-text-muted">{r.province}</div>
            </Link>
          ))}
          {featured.length === 0 && (
            <p className="col-span-full text-sm text-text-muted">
              No regions loaded yet. Run{" "}
              <code className="font-numeric">manage.py load_regions</code> on the
              backend.
            </p>
          )}
        </div>
      </section>

      <DataAttribution />
    </div>
  );
}
