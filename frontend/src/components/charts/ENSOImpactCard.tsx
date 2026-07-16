import type { EnsoImpactResponse } from "@/lib/types";
import { fmt } from "@/lib/format";
import { ChartHeader } from "./chart-ui";

const PHASES: {
  key: "EL_NINO" | "LA_NINA";
  label: string;
  color: string;
}[] = [
  { key: "EL_NINO", label: "El Niño", color: "var(--enso-nino)" },
  { key: "LA_NINA", label: "La Niña", color: "var(--enso-nina)" },
];

/**
 * How this city's rainfall/temperature actually shift during El Niño / La Niña
 * months, relative to its own Neutral-month baseline (not a global norm —
 * "drier than usual here", not "dry in absolute terms").
 */
export default function ENSOImpactCard({ data }: { data: EnsoImpactResponse }) {
  const { phases, deltas } = data;
  const hasSignal = PHASES.some((p) => phases[p.key].months > 0);

  if (!hasSignal) return null;

  return (
    <section className="card p-6">
      <ChartHeader eyebrow="ENSO" title="El Niño / La Niña Impact" />
      <p className="mb-5 max-w-prose text-sm leading-relaxed text-text-secondary">
        Average monthly rainfall and temperature during each ENSO phase since
        1950, compared against this city&apos;s own{" "}
        <span className="text-text-primary">Neutral-month</span> baseline of{" "}
        <span className="font-numeric text-text-primary">
          {fmt(phases.NEUTRAL.avg_precipitation, "mm")}
        </span>{" "}
        rain and{" "}
        <span className="font-numeric text-text-primary">
          {fmt(phases.NEUTRAL.avg_temp_mean, "°C")}
        </span>{" "}
        per month.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {PHASES.map((p) => {
          const phase = phases[p.key];
          const delta = deltas[p.key];
          if (phase.months === 0) return null;
          const wetter =
            delta.precipitation_delta_pct !== null &&
            delta.precipitation_delta_pct > 0;

          return (
            <div
              key={p.key}
              className="rounded-lg border px-4 py-3.5"
              style={{
                borderColor: `color-mix(in srgb, ${p.color} 35%, var(--border))`,
                backgroundColor: `color-mix(in srgb, ${p.color} 6%, transparent)`,
              }}
            >
              <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: p.color }}>
                <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
                {p.label}
                <span className="font-numeric ml-auto text-[10px] uppercase tracking-wider text-text-muted">
                  {phase.months} months
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-text-muted">
                    Rainfall
                  </dt>
                  <dd className="font-numeric mt-0.5 text-sm font-medium text-text-primary">
                    {fmt(phase.avg_precipitation, "mm")}
                  </dd>
                  {delta.precipitation_delta_pct !== null && (
                    <dd
                      className="font-numeric text-xs"
                      style={{ color: wetter ? "var(--rain-blue)" : "var(--drought-amber)" }}
                    >
                      {delta.precipitation_delta_pct > 0 ? "+" : ""}
                      {delta.precipitation_delta_pct.toFixed(0)}% vs neutral
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-text-muted">
                    Temperature
                  </dt>
                  <dd className="font-numeric mt-0.5 text-sm font-medium text-text-primary">
                    {fmt(phase.avg_temp_mean, "°C")}
                  </dd>
                  {delta.temp_delta_c !== null && (
                    <dd
                      className="font-numeric text-xs"
                      style={{
                        color:
                          delta.temp_delta_c > 0
                            ? "var(--heat-orange)"
                            : "var(--rain-blue)",
                      }}
                    >
                      {delta.temp_delta_c > 0 ? "+" : ""}
                      {delta.temp_delta_c.toFixed(1)}°C vs neutral
                    </dd>
                  )}
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
