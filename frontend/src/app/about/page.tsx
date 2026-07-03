import DataAttribution from "@/components/ui/DataAttribution";

export const metadata = { title: "About & methodology" };

export default function AboutPage() {
  return (
    <article className="prose-sm max-w-2xl space-y-4">
      <h1 className="font-serif text-3xl font-bold">Methodology & data</h1>

      <section>
        <h2 className="mt-6 text-xl font-semibold">Where the data comes from</h2>
        <p className="text-text-secondary">
          All historical climate values come from{" "}
          <strong>ERA5 reanalysis</strong> via the free{" "}
          <a href="https://open-meteo.com" className="text-rain-blue underline">
            Open-Meteo Historical Weather API
          </a>{" "}
          (1950–present). ERA5 is a model-based reanalysis optimized for
          consistency over decades — the right basis for long-term climate
          trend analysis, and different from direct weather-station readings.
        </p>
      </section>

      <section>
        <h2 className="mt-6 text-xl font-semibold">How we define things</h2>
        <ul className="list-disc space-y-1 pl-5 text-text-secondary">
          <li>Hot day: daily max temperature above 35°C.</li>
          <li>Heavy rain day: daily rainfall above 50mm; extreme above 100mm.</li>
          <li>Dry day: daily rainfall below 1mm.</li>
          <li>
            Wet season onset: first 5 consecutive days after August 1 with
            cumulative rainfall ≥ 40mm (a simplified BMKG-style definition).
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mt-6 text-xl font-semibold">ENSO overlay</h2>
        <p className="text-text-secondary">
          El Niño / La Niña annotations use the Oceanic Niño Index (ONI) from
          the NOAA Climate Prediction Center. El Niño tends to bring drier
          conditions to Indonesia; La Niña wetter.
        </p>
      </section>

      <section>
        <h2 className="mt-6 text-xl font-semibold">Citation</h2>
        <p className="text-sm text-text-muted">
          Hersbach, H., et al. (2020). The ERA5 global reanalysis.{" "}
          <em>Quarterly Journal of the Royal Meteorological Society.</em>
        </p>
      </section>

      <DataAttribution />
    </article>
  );
}
