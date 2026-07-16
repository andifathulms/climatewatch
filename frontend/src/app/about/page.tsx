export const metadata = { title: "About & methodology" };

const DEFINITIONS: { term: string; body: string; color: string }[] = [
  {
    term: "Hot day",
    body: "Daily maximum temperature above 35°C.",
    color: "var(--heat-orange)",
  },
  {
    term: "Heavy rain day",
    body: "Daily rainfall above 50mm. Above 100mm counts as extreme rain.",
    color: "var(--rain-blue)",
  },
  {
    term: "Dry day",
    body: "Daily rainfall below 1mm.",
    color: "var(--drought-amber)",
  },
  {
    term: "Wet season onset",
    body: "The first 5 consecutive days after August 1 with cumulative rainfall ≥ 40mm — a simplified BMKG-style definition.",
    color: "var(--enso-nina)",
  },
];

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-10">
      <div className="grid gap-6 md:grid-cols-[10rem_1fr]">
        <p className="eyebrow md:pt-1.5">{eyebrow}</p>
        <div>
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          <div className="mt-4 space-y-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <article>
      <header className="relative -mx-5 overflow-hidden px-5 pb-8 pt-14 sm:-mx-8 sm:px-8">
        <div className="canvas-aurora opacity-50" aria-hidden />
        <div className="relative max-w-2xl">
          <p className="eyebrow">Methodology</p>
          <h1 className="mt-4 text-hero font-semibold">
            How Iklim knows what it knows
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-text-secondary">
            Every number on this site traces back to one open dataset and a
            handful of explicit definitions. Here they are.
          </p>
        </div>
      </header>

      <Section eyebrow="Source" title="Where the data comes from">
        <p className="max-w-prose leading-relaxed text-text-secondary">
          All historical climate values come from{" "}
          <strong className="font-medium text-text-primary">
            ERA5 reanalysis
          </strong>{" "}
          via the free{" "}
          <a
            href="https://open-meteo.com"
            rel="noopener noreferrer"
            target="_blank"
            className="text-rain-blue underline decoration-rain-blue/40 underline-offset-2 transition-colors hover:decoration-rain-blue"
          >
            Open-Meteo Historical Weather API
          </a>{" "}
          (1950–present).
        </p>
        <p className="max-w-prose leading-relaxed text-text-secondary">
          ERA5 is a model-based reanalysis optimized for consistency over
          decades — the right basis for long-term trend analysis, and different
          from direct weather-station readings. A station moves, changes
          instruments, or goes offline; the reanalysis does not. That
          consistency is exactly what makes a 75-year comparison meaningful.
        </p>
      </Section>

      <Section eyebrow="Definitions" title="How we define things">
        <dl className="space-y-0">
          {DEFINITIONS.map((d, i) => (
            <div
              key={d.term}
              className={`flex gap-4 py-4 ${i > 0 ? "border-t border-border" : ""}`}
            >
              <span
                aria-hidden
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ background: d.color }}
              />
              <div>
                <dt className="font-medium text-text-primary">{d.term}</dt>
                <dd className="mt-1 max-w-prose text-sm leading-relaxed text-text-secondary">
                  {d.body}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </Section>

      <Section eyebrow="Overlay" title="ENSO">
        <p className="max-w-prose leading-relaxed text-text-secondary">
          El Niño / La Niña annotations use the Oceanic Niño Index (ONI) from the
          NOAA Climate Prediction Center. El Niño tends to bring drier conditions
          to Indonesia; La Niña wetter. Toggle the overlay on any Climate
          Fingerprint to see the pattern against the rainfall grid.
        </p>
        <div className="flex flex-wrap gap-6 pt-2">
          <span className="flex items-center gap-2.5 text-sm text-text-secondary">
            <span
              aria-hidden
              className="h-4 w-1 rounded-full"
              style={{ background: "var(--enso-nino)" }}
            />
            El Niño — tends drier
          </span>
          <span className="flex items-center gap-2.5 text-sm text-text-secondary">
            <span
              aria-hidden
              className="h-4 w-1 rounded-full"
              style={{ background: "var(--enso-nina)" }}
            />
            La Niña — tends wetter
          </span>
        </div>
      </Section>

      <Section eyebrow="Caveats" title="What this is not">
        <p className="max-w-prose leading-relaxed text-text-secondary">
          Reanalysis is a model. It is not a thermometer reading from your
          street, and it can smooth over local effects — urban heat islands,
          narrow valleys, coastal microclimates. Read the trends, not any single
          cell. Where a region&apos;s data coverage drops below 90%, the page
          says so.
        </p>
      </Section>

      <Section eyebrow="Citation" title="Cite the source">
        <p className="max-w-prose text-sm leading-relaxed text-text-muted">
          Hersbach, H., et al. (2020). The ERA5 global reanalysis.{" "}
          <em className="text-text-secondary">
            Quarterly Journal of the Royal Meteorological Society
          </em>
          , 146(730), 1999–2049.
        </p>
      </Section>
    </article>
  );
}
