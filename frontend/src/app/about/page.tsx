export const metadata = { title: "About & methodology" };

const DEFINITIONS: { term: string; body: string; color: string }[] = [
  {
    term: "Hot day (local)",
    body: "A day hotter than 95% of days in this city's 1951–1980 record. The threshold is computed per city and then held fixed — a baseline that drifted upward with the warming it measures would report no change at all. This is what the Hot Days fingerprint shows.",
    color: "var(--heat-orange)",
  },
  {
    term: "Hot spell / heatwave",
    body: "The longest run of consecutive days above a threshold in a single year; a day with no data breaks the run rather than extending it, and runs do not carry across the New Year. City pages use the local threshold. The rankings table keeps the absolute 35°C version, because ranking cities against thresholds that differ per city would compare events that are not the same event — the cost is that 25 of 90 cities read “never” there.",
    color: "var(--heat-orange)",
  },
  {
    term: "Hot day (absolute)",
    body: "Daily maximum above 35°C. Kept for cross-city ranking, where a shared threshold is the point, but not used on city pages: 25 of the 90 loaded cities have never recorded a single one in 77 years, so it renders as an empty grid across a quarter of Indonesia. Warming in the tropics does not look like new record highs — it looks like the ordinary day moving.",
    color: "var(--heat-light)",
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
  {
    term: "Wet season end",
    body: "The last such 5-day spell before August 1 of the following year. This mirrors the onset rule rather than deriving from BMKG, so it is the weaker of the two definitions — and season length inherits the uncertainty of both.",
    color: "var(--enso-nina)",
  },
  {
    term: "Wet season length",
    body: "Onset paired with the end of the same season, which falls in the next calendar year — a season beginning in October ends the following April. Seasons missing either endpoint are omitted, never interpolated.",
    color: "var(--rain-light)",
  },
  {
    term: "Saturated onset",
    body: "The onset rule scans forward from August 1, so a city whose rain never really stops triggers it almost immediately nearly every year. Where that happens in more than half of years, the onset date reflects where the search starts rather than a seasonal turn: 12 of 90 cities behave this way, and for them we show no onset trend and no season length at all.",
    color: "var(--drought-amber)",
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
            How ClimateWatch knows what it knows
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
          consistency is exactly what makes a comparison across the whole record
          meaningful.
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
          El Niño / La Niña annotations use the Oceanic Niño Index (ONI) from
          the NOAA Climate Prediction Center. El Niño tends to bring drier
          conditions to Indonesia; La Niña wetter. Toggle the overlay on any
          Climate Fingerprint to see the pattern against the rainfall grid.
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

      <Section
        eyebrow="Ranking"
        title="How &ldquo;what moved most&rdquo; is chosen"
      >
        <p className="max-w-prose leading-relaxed text-text-secondary">
          Each city page leads with the one signal that changed most there,
          because the four charts below it are the same size everywhere and that
          quietly implies the four matter equally in every city. They do not.
        </p>
        <p className="max-w-prose leading-relaxed text-text-secondary">
          The rule, in full: fit an ordinary least-squares line to the annual
          series (the same fit drawn on every trend line on this site), express
          the slope as change per decade, then divide by that series&rsquo; own
          standard deviation. The result is standard deviations of movement per
          decade, which puts millimetres and days on one comparable scale. It is
          a normalisation, not a weighting — no signal is declared more
          important than another. A signal needs at least 30 years of data to
          rank, the incomplete current year is excluded, and when nothing clears
          0.15 standard deviations per decade the page says so rather than
          promoting the largest number in a flat field.
        </p>
      </Section>

      <Section eyebrow="Caveats" title="What this is not">
        <p className="max-w-prose leading-relaxed text-text-secondary">
          Reanalysis is a model. It is not a thermometer reading from your
          street, and it can smooth over local effects — urban heat islands,
          narrow valleys, coastal microclimates. Read the trends, not any single
          cell. Where a region&apos;s data coverage drops below 90%, the page
          says so.
        </p>
        <p className="max-w-prose leading-relaxed text-text-secondary">
          Every trend line here is a straight line fitted across the whole
          record, which assumes the rate of change has been constant. It very
          likely has not been. A straight fit cannot show a flat stretch
          followed by a steep one, so read these as &ldquo;how much,
          overall&rdquo; and not as &ldquo;when it started&rdquo;.
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
