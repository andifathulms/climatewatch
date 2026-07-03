import type { CompareProfile } from "@/lib/types";
import { fmt } from "@/lib/format";
import TrendArrow from "@/components/ui/TrendArrow";

/** Single-city summary panel — used twice on the compare page. */
export default function ComparePanel({ profile }: { profile: CompareProfile }) {
  const annual = profile.annual;
  const latest = annual[annual.length - 1];
  const years = annual.length > 1 ? annual[annual.length - 1].year - annual[0].year : 0;
  const slope = profile.warming_trend.slope;
  const warming = slope !== null ? slope * years : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="font-serif text-lg font-semibold">{profile.region.name}</h3>
      <p className="text-sm text-text-secondary">{profile.region.province}</p>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-text-secondary">Warming over {years} yrs</dt>
          <dd>
            {warming !== null ? (
              <TrendArrow
                direction={warming > 0 ? "up" : "down"}
                magnitude={Math.abs(warming)}
                unit="°C"
              />
            ) : (
              "—"
            )}
          </dd>
        </div>
        {latest && (
          <>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Latest avg max ({latest.year})</dt>
              <dd className="font-numeric">{fmt(latest.avg_temp_max, "°C")}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Annual rainfall ({latest.year})</dt>
              <dd className="font-numeric">{fmt(latest.total_precipitation, " mm")}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Hot days ({latest.year})</dt>
              <dd className="font-numeric">{latest.hot_days}</dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );
}
