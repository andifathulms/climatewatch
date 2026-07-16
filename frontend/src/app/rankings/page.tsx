import { api } from "@/lib/api";
import RankingsTable from "@/components/rankings/RankingsTable";

export const metadata = { title: "Rankings" };

export default async function RankingsPage() {
  const rankings = await api.rankings().catch(() => ({ results: [] }));

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
            75-year ERA5 record.
          </p>
        </div>
      </header>

      <RankingsTable data={rankings} />
    </div>
  );
}
