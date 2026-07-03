import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import ComparePanel from "@/components/compare/ComparePanel";
import MonthlyBarChart from "@/components/charts/MonthlyBarChart";
import DataAttribution from "@/components/ui/DataAttribution";

export async function generateMetadata({ params }: { params: { slug: string } }) {
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
      <header>
        <h1 className="font-serif text-3xl font-bold">
          {compare.a.region.name} <span className="text-text-muted">vs</span>{" "}
          {compare.b.region.name}
        </h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <ComparePanel profile={compare.a} />
        <ComparePanel profile={compare.b} />
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

      <DataAttribution />
    </div>
  );
}
