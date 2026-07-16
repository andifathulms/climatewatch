import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import ComparePanel from "@/components/compare/ComparePanel";
import MonthlyBarChart from "@/components/charts/MonthlyBarChart";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const [a, b] = params.slug.split("-vs-");
  return { title: `${a} vs ${b}` };
}

export default async function CompareDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const parts = params.slug.split("-vs-");
  if (parts.length !== 2) notFound();
  const [slugA, slugB] = parts;

  const [regionA, regionB] = await Promise.all([
    api.region(slugA).catch(() => null),
    api.region(slugB).catch(() => null),
  ]);
  if (!regionA || !regionB) notFound();

  const compare = await api.compare(regionA.id, regionB.id).catch(() => null);
  if (!compare) notFound();

  return (
    <div className="space-y-6">
      <header className="relative -mx-5 overflow-hidden px-5 pb-8 pt-12 sm:-mx-8 sm:px-8">
        <div className="canvas-aurora opacity-50" aria-hidden />

        <nav aria-label="Breadcrumb" className="relative">
          <Link
            href="/compare"
            className="text-xs text-text-muted transition-colors hover:text-text-primary"
          >
            ← All comparisons
          </Link>
        </nav>

        <h1 className="relative mt-4 text-hero font-semibold">
          <span style={{ color: "var(--series-1)" }}>
            {compare.a.region.name}
          </span>
          <span className="mx-3 font-sans text-2xl font-normal text-text-muted">
            vs
          </span>
          <span style={{ color: "var(--series-2)" }}>
            {compare.b.region.name}
          </span>
        </h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <ComparePanel profile={compare.a} slot={1} />
        <ComparePanel profile={compare.b} slot={2} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyBarChart
          a={compare.a}
          b={compare.b}
          metric="avg_temp_mean"
          title="Average monthly temperature"
          unit="°C"
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
