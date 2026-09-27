import { api } from "@/lib/api";
import { routeMetadata } from "@/lib/metadata";
import RankingsSection from "@/components/rankings/RankingsSection";
import RecordsBoard from "@/components/rankings/RecordsBoard";
import LeadersOverTime from "@/components/rankings/LeadersOverTime";
import { getIndonesiaGeometry } from "@/lib/indonesia-geo";
import { L } from "@/lib/i18n";

// Own canonical and share card. Without these the root layout's
// `canonical: "/"` is inherited, which told search engines this page was a
// duplicate of the homepage and should not be indexed separately — worse than
// having no canonical at all.
export const metadata = routeMetadata({
  title: "Rankings",
  cardTitle: "City rankings",
  description:
    "Every loaded Indonesian city ranked on temperature, rainfall, warming rate and extreme weather — from the same ERA5 record, every year since 1950.",
  path: "/rankings",
});

export default async function RankingsPage() {
  const [rankings, records, overTime, regions, stripes] = await Promise.all([
    api.rankings().catch(() => ({ results: [] })),
    api.records().catch(() => null),
    api.overTime().catch(() => null),
    api.allRegions().catch(() => []),
    api.stripes().catch(() => null),
  ]);
  const geometry = getIndonesiaGeometry();

  return (
    <div className="space-y-12">
      <header className="max-w-3xl pt-12 sm:pt-16">
        <p className="eyebrow">
          <L en="Rankings" id="Peringkat" />
        </p>
        <h1 className="mt-4 font-display text-hero font-semibold">
          <L en="Where is it changing fastest?" id="Di mana perubahan paling cepat?" />
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-text-secondary">
          <L
            en={`Every loaded city on the same ERA5 record since 1950, ranked on warming, heat, feels-like heat, rain and heatwaves. Hover a row to find it on the map.`}
            id={`Semua kota yang dimuat, dari catatan ERA5 yang sama sejak 1950, diurutkan menurut pemanasan, panas, suhu terasa, hujan dan gelombang panas. Arahkan kursor ke baris untuk menemukannya di peta.`}
          />
        </p>
      </header>

      <RankingsSection
        regions={regions}
        geometry={geometry}
        rankings={rankings}
        stripes={stripes?.results ?? []}
      />

      {overTime && <LeadersOverTime data={overTime} />}

      {records && <RecordsBoard data={records} />}
    </div>
  );
}
