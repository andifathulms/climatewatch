import type { ForecastContextResponse } from "@/lib/types";
import { fmt, MONTHS } from "@/lib/format";

/** 7-day forecast vs historical range for this week of the year. */
export default function ForecastContext({ data }: { data: ForecastContextResponse }) {
  const { forecast, historical } = data;
  const days = forecast.time ?? [];
  const tmax = forecast.temperature_2m_max ?? [];
  const precip = forecast.precipitation_sum ?? [];

  const todayMax = tmax[0];
  const { temp_max_p10, temp_max_p90, temp_max_mean } = historical;

  let flag: { text: string; color: string } | null = null;
  if (todayMax != null && temp_max_p90 != null && temp_max_p10 != null) {
    if (todayMax > temp_max_p90) {
      flag = { text: "Hotter than 90% of historical years for this week", color: "var(--heat-orange)" };
    } else if (todayMax < temp_max_p10) {
      flag = { text: "Cooler than 90% of historical years for this week", color: "var(--rain-blue)" };
    } else {
      flag = { text: "Within the normal historical range for this week", color: "var(--enso-nina)" };
    }
  }

  function fmtDate(iso: string): string {
    const d = new Date(iso);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <h2 className="text-xl font-semibold">Forecast vs Historical</h2>
      {flag && (
        <p className="mt-2 text-sm font-medium" style={{ color: flag.color }}>
          {flag.text}
        </p>
      )}
      <p className="mt-1 text-xs text-text-muted">
        Historical max range for this week: {fmt(temp_max_p10, "°")}–{fmt(temp_max_p90, "°")}{" "}
        (mean {fmt(temp_max_mean, "°")}, {historical.sample_days} days sampled)
      </p>

      <div className="mt-4 grid grid-cols-7 gap-2">
        {days.map((d, i) => (
          <div key={d} className="rounded-lg bg-surface-muted p-2 text-center">
            <div className="text-[10px] text-text-muted">{fmtDate(d)}</div>
            <div className="font-numeric text-sm font-medium text-heat-orange">
              {fmt(tmax[i], "°")}
            </div>
            <div className="font-numeric text-[10px] text-rain-blue">
              {fmt(precip[i], "mm")}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
