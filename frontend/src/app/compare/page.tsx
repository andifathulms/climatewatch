import { Suspense } from "react";
import { routeMetadata } from "@/lib/metadata";
import { api } from "@/lib/api";
import CityCompare from "@/components/compare/CityCompare";
import CompareResult from "@/components/compare/CompareResult";
import { L } from "@/lib/i18n";

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
      <header className="max-w-3xl pt-12 sm:pt-16">
        <p className="eyebrow">
          <L en="Compare" id="Bandingkan" />
        </p>
        <h1 className="mt-4 font-display text-hero font-semibold">
          <L en="How is your city different?" id="Apa bedanya kotamu?" />
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-text-secondary">
          <L
            en="Put two Indonesian cities side by side: how fast each is warming, their stripes, and their fingerprints on the same controls."
            id="Letakkan dua kota Indonesia berdampingan: seberapa cepat masing-masing memanas, garis-garisnya, dan sidik iklimnya dengan kontrol yang sama."
          />
        </p>
      </header>

      <CityCompare regions={regions} />

      <Suspense>
        <CompareResult regions={regions} />
      </Suspense>
    </div>
  );
}
