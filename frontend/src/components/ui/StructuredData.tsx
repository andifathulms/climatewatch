/**
 * JSON-LD, built from the same values the page renders.
 *
 * Search engines had no machine-readable description of what this site is.
 * The city pages in particular are a scientific dataset with a named source, a
 * licence and a temporal range — all of which schema.org can express and none
 * of which was being said.
 *
 * Everything here is derived from props that come from the same API payloads
 * the visible page uses, so the structured data cannot drift from the content
 * the way a hand-maintained block would.
 */

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://andifathulms.github.io/climatewatch";

/** Serialise safely: JSON-LD sits in a <script>, so `</script>` in any string
 *  value would end the block early. */
function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function SiteStructuredData() {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: jsonLd({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "ClimateWatch",
          url: `${SITE}/`,
          description:
            "ERA5 climate data for every year since 1950, for any Indonesian city, rendered as a Climate Fingerprint.",
          inLanguage: "en",
        }),
      }}
    />
  );
}

export function CityStructuredData({
  name,
  province,
  slug,
  yearFrom,
  yearTo,
  latitude,
  longitude,
}: {
  name: string;
  province: string;
  slug: string;
  yearFrom: number | null;
  yearTo: number | null;
  latitude: number;
  longitude: number;
}) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: jsonLd({
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: `${name} climate record, ${yearFrom}–${yearTo}`,
          description: `Daily ERA5 reanalysis for ${name}, ${province}, aggregated to monthly and annual climate indicators: rainfall, temperature, extreme days and wet-season timing.`,
          url: `${SITE}/city/${slug}/`,
          inLanguage: "en",
          // CC BY 4.0 is a licence condition of the source data, not a
          // decoration — stating it in machine-readable form is the same
          // obligation DataAttribution discharges for humans.
          license: "https://creativecommons.org/licenses/by/4.0/",
          isAccessibleForFree: true,
          creator: {
            "@type": "Organization",
            name: "ClimateWatch",
            url: `${SITE}/`,
          },
          temporalCoverage:
            yearFrom && yearTo ? `${yearFrom}/${yearTo}` : undefined,
          spatialCoverage: {
            "@type": "Place",
            name: `${name}, ${province}, Indonesia`,
            geo: {
              "@type": "GeoCoordinates",
              latitude,
              longitude,
            },
          },
          variableMeasured: [
            "daily maximum temperature",
            "precipitation",
            "hot days",
            "dry days",
            "wet season onset",
          ],
          isBasedOn: {
            "@type": "Dataset",
            name: "ERA5 reanalysis",
            url: "https://open-meteo.com/",
            creator: {
              "@type": "Organization",
              name: "Copernicus Climate Change Service / ECMWF",
            },
          },
        }),
      }}
    />
  );
}
