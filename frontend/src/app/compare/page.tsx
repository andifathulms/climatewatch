import { api } from "@/lib/api";
import CityCompare from "@/components/compare/CityCompare";
import DataAttribution from "@/components/ui/DataAttribution";

export const metadata = { title: "Compare cities" };

export default async function ComparePage() {
  const { results: regions } = await api.regions().catch(() => ({ results: [] }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-bold">Compare cities</h1>
        <p className="mt-2 text-text-secondary">
          Put two Indonesian cities side by side — monthly climate, warming
          trend, and extreme weather.
        </p>
      </header>

      <CityCompare regions={regions} />
      <DataAttribution />
    </div>
  );
}
