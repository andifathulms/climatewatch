import type { EnsoImpactResponse } from "@/lib/types";
import { fmt } from "@/lib/format";
import { ChartHeader, type HeadingLevel } from "./chart-ui";

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
export default function ENSOImpactCard({
  data,
  headingLevel = "h2",
}: {
  data: EnsoImpactResponse;
  headingLevel?: HeadingLevel;
}) {
  const { phases, deltas } = data;
  const hasSignal = PHASES.some((p) => phases[p.key].months > 0);

  if (!hasSignal) return null;

  return (
    <section className="card p-6">
      <ChartHeader level={headingLevel} eyebrow="ENSO" title="El Niño / La Niña Impact" />
      {/* "ENSO" was used as a section label with no expansion anywhere on the
          page. Defined here, at the only place the site uses it, with the
          source named where the rule is applied rather than in a footnote. */}
      <p className="mb-4 max-w-prose text-sm leading-relaxed text-text-secondary">
        ENSO is a Pacific Ocean cycle that swings Indonesia&rsquo;s weather from
        year to year. When the central Pacific runs warm it is{" "}
        <span className="text-text-primary">El Niño</span> — usually drier here;
        when it runs cool,{" "}
        <span className="text-text-primary">La Niña</span> — usually wetter. A
        month counts as one phase or the other when the{" "}
        <a
          href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php"
          target="_blank"
          rel="noopener noreferrer"
          className="text-rain-blue underline decoration-rain-blue/40 underline-offset-2 hover:decoration-rain-blue"
        >
          NOAA Oceanic Niño Index
        </a>{" "}
        — a three-month average sea-surface temperature anomaly — sits at or
        beyond ±0.5°C. Everything else is Neutral.
      </p>

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
                <span className="font-numeric ml-auto text-2xs uppercase tracking-wider text-text-muted">
                  {phase.months} months
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-2xs uppercase tracking-wider text-text-muted">
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
                  <dt className="text-2xs uppercase tracking-wider text-text-muted">
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
