import { Suspense } from "react";
import { routeMetadata } from "@/lib/metadata";
import { api } from "@/lib/api";
import CityCompare from "@/components/compare/CityCompare";
import CompareResult from "@/components/compare/CompareResult";

export const metadata = routeMetadata({
  title: "Compare cities",
  cardTitle: "Compare two Indonesian cities",
  description:
    "Put two Indonesian cities on the same axes — monthly climate, warming trend and extreme weather, across the full ERA5 record.",
  path: "/compare",
});

export default async function ComparePage() {
  const regions = await api.allRegions().catch(() => []);

  return (
    <div className="space-y-8">
      <header className="relative -mx-5 overflow-hidden px-5 pb-6 pt-14 sm:-mx-8 sm:px-8">
        <div className="canvas-aurora opacity-50" aria-hidden />
        <div className="relative max-w-2xl">
          <p className="eyebrow">Side by side</p>
          <h1 className="mt-4 text-hero font-semibold">Compare cities</h1>
          <p className="mt-4 text-lg leading-relaxed text-text-secondary">
            Put two Indonesian cities against each other — monthly climate,
            warming trend, and extreme weather, on the same axes.
          </p>
        </div>
      </header>

      <CityCompare regions={regions} />

      <Suspense>
        <CompareResult regions={regions} />
      </Suspense>
    </div>
  );
}
