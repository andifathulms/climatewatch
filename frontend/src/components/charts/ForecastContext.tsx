import type { ForecastContextResponse } from "@/lib/types";
import { fmt, MONTHS } from "@/lib/format";

/** 7-day forecast vs historical range for this week of the year. */
export default function ForecastContext({
  data,
}: {
  data: ForecastContextResponse;
}) {
  const { forecast, historical } = data;
  const days = forecast.time ?? [];
  const tmax = forecast.temperature_2m_max ?? [];
  const precip = forecast.precipitation_sum ?? [];

  const todayMax = tmax[0];
  const { temp_max_p10, temp_max_p90, temp_max_mean } = historical;

  // Status carries an icon + label, never color alone.
  let flag: { text: string; color: string; icon: string } | null = null;
  if (todayMax != null && temp_max_p90 != null && temp_max_p10 != null) {
    if (todayMax > temp_max_p90) {
      flag = {
        text: "Hotter than 90% of historical years for this week",
        color: "var(--heat-orange)",
        icon: "▲",
      };
    } else if (todayMax < temp_max_p10) {
      flag = {
        text: "Cooler than 90% of historical years for this week",
        color: "var(--rain-blue)",
        icon: "▼",
      };
    } else {
      flag = {
        text: "Within the normal historical range for this week",
        color: "var(--enso-nina)",
        icon: "●",
      };
    }
  }

  function fmtDate(iso: string): string {
    const d = new Date(iso);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }

  function weekday(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", { weekday: "short" });
  }

  // Position each day within the historical p10–p90 band, so the row of cards
  // reads as a distribution rather than seven unrelated numbers.
  function pct(v: number | undefined): number | null {
    if (v == null || temp_max_p10 == null || temp_max_p90 == null) return null;
    if (temp_max_p90 === temp_max_p10) return 50;
    return Math.max(
      0,
      Math.min(100, ((v - temp_max_p10) / (temp_max_p90 - temp_max_p10)) * 100),
    );
  }

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Right now</p>
          <h2 className="mt-1.5 font-display text-xl font-semibold">
            Forecast vs Historical
          </h2>
        </div>
        {flag && (
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
            style={{
              color: flag.color,
              borderColor: flag.color,
              backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)",
            }}
          >
            <span aria-hidden className="text-[9px]">
              {flag.icon}
            </span>
            {flag.text}
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-text-muted">
        Historical max range for this week:{" "}
        <span className="font-numeric text-text-secondary">
          {fmt(temp_max_p10, "°")}–{fmt(temp_max_p90, "°")}
        </span>{" "}
        (mean <span className="font-numeric">{fmt(temp_max_mean, "°")}</span>,{" "}
        {historical.sample_days} days sampled)
      </p>

      <ol className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {days.map((d, i) => {
          const p = pct(tmax[i]);
          return (
            <li
              key={d}
              className="rounded-lg border border-border bg-surface-inset p-2.5 text-center"
            >
              <div className="text-[10px] font-medium text-text-secondary">
                {i === 0 ? "Today" : weekday(d)}
              </div>
              <div className="font-numeric text-[9px] text-text-muted">
                {fmtDate(d)}
              </div>
              <div className="font-numeric mt-2 text-base font-medium text-heat-light">
                {fmt(tmax[i], "°")}
              </div>

              {/* Where this day sits inside the historical band. */}
              <div
                className="relative mt-2 h-1 rounded-full bg-border"
                aria-hidden
              >
                {p !== null && (
                  <span
                    className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-heat-orange ring-2 ring-surface-inset"
                    style={{ left: `${p}%` }}
                  />
                )}
              </div>

              <div className="font-numeric mt-2 text-[10px] text-rain-light">
                {fmt(precip[i], "mm")}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
