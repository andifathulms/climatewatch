import { L } from "@/lib/i18n";

/**
 * Mandatory CC BY 4.0 attribution — must appear on every page.
 * See PRD "Data Attribution Requirements".
 *
 * Rendered by SiteFooter in the root layout, so it is present site-wide by
 * construction. Do not remove it, and do not rely on individual pages to add it.
 */
export default function DataAttribution() {
  // No divider/margin of its own: SiteFooter owns the single bottom-bar divider
  // and lays this out next to the maker's mark. Kept as a bare <p> so it stays
  // a drop-in credit wherever it's placed.
  return (
    <p className="max-w-prose text-xs leading-relaxed text-text-muted">
      <L en="Climate data:" id="Data iklim:" />{" "}
      <a
        href="https://open-meteo.com"
        rel="noopener noreferrer"
        target="_blank"
        className="font-medium text-text-secondary underline decoration-border-strong underline-offset-2 transition-colors hover:text-text-primary hover:decoration-rain-blue"
      >
        Open-Meteo.com
      </a>{" "}
      (CC BY 4.0).{" "}
      <L
        en="Based on ERA5 and ERA5-Land reanalysis from the Copernicus Climate Change Service / ECMWF. Historical data is model-based reanalysis, not direct station measurements. ENSO data: NOAA Climate Prediction Center."
        id="Berdasarkan reanalisis ERA5 dan ERA5-Land dari Copernicus Climate Change Service / ECMWF. Data historis adalah reanalisis berbasis model, bukan pengukuran langsung dari stasiun. Data ENSO: NOAA Climate Prediction Center."
      />
    </p>
  );
}
