import { api } from "@/lib/api";
import { routeMetadata } from "@/lib/metadata";
import RankingsTable from "@/components/rankings/RankingsTable";
import RecordsBoard from "@/components/rankings/RecordsBoard";
import LeadersOverTime from "@/components/rankings/LeadersOverTime";

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
  const [rankings, records, overTime] = await Promise.all([
    api.rankings().catch(() => ({ results: [] })),
    api.records().catch(() => null),
    api.overTime().catch(() => null),
  ]);

  return (
    <div className="space-y-8">
      <header className="relative -mx-5 overflow-hidden px-5 pb-6 pt-14 sm:-mx-8 sm:px-8">
        <div className="canvas-aurora opacity-50" aria-hidden />
        <div className="relative max-w-2xl">
          <p className="eyebrow">Leaderboard</p>
          <h1 className="mt-4 text-hero font-semibold">City rankings</h1>
          <p className="mt-4 text-lg leading-relaxed text-text-secondary">
            Every bootstrapped city, compared head-to-head on temperature,
            rainfall, warming trend, and extreme weather — all from the same
            ERA5 record, every year since 1950.
          </p>
        </div>
      </header>

      <RankingsTable data={rankings} />

      {overTime && <LeadersOverTime data={overTime} />}

      {records && <RecordsBoard data={records} />}
    </div>
  );
}
