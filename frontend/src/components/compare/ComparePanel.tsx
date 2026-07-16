import type { CompareProfile } from "@/lib/types";
import { fmt } from "@/lib/format";
import TrendArrow from "@/components/ui/TrendArrow";

/**
 * Single-city summary panel — used twice on the compare page.
 * `slot` ties the panel to the series color that city wears in the charts below.
 */
export default function ComparePanel({
  profile,
  slot,
}: {
  profile: CompareProfile;
  slot: 1 | 2;
}) {
  const annual = profile.annual;
  const latest = annual[annual.length - 1];
  const years =
    annual.length > 1 ? annual[annual.length - 1].year - annual[0].year : 0;
  const slope = profile.warming_trend.slope;
  const warming = slope !== null ? slope * years : null;
  const color = slot === 1 ? "var(--series-1)" : "var(--series-2)";

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: `Warming over ${years} yrs`,
      value:
        warming !== null ? (
          <TrendArrow
            direction={warming > 0 ? "up" : "down"}
            magnitude={Math.abs(warming)}
            unit="°C"
          />
        ) : (
          <span className="text-text-muted">—</span>
        ),
    },
    ...(latest
      ? [
          {
            label: `Latest avg max (${latest.year})`,
            value: (
              <span className="font-numeric">{fmt(latest.avg_temp_max, "°C")}</span>
            ),
          },
          {
            label: `Annual rainfall (${latest.year})`,
            value: (
              <span className="font-numeric">
                {fmt(latest.total_precipitation, " mm")}
              </span>
            ),
          },
          {
            label: `Hot days (${latest.year})`,
            value: <span className="font-numeric">{latest.hot_days}</span>,
          },
        ]
      : []),
  ];

  return (
    <div className="card relative overflow-hidden p-6">
      {/* Series rail — anchors this panel to its color in the charts below. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: color }}
      />

      <div className="flex items-baseline gap-2.5">
        <h2 className="font-display text-xl font-semibold">
          {profile.region.name}
        </h2>
      </div>
      <p className="mt-0.5 text-xs text-text-muted">{profile.region.province}</p>

      <dl className="mt-5 space-y-0">
        {rows.map((r, i) => (
          <div
            key={r.label}
            className={`flex items-center justify-between gap-4 py-2.5 text-sm ${
              i > 0 ? "border-t border-border" : ""
            }`}
          >
            <dt className="text-text-secondary">{r.label}</dt>
            <dd className="shrink-0 font-medium text-text-primary">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
