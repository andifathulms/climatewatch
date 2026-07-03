/**
 * Mandatory CC BY 4.0 attribution — must appear on every page.
 * See PRD "Data Attribution Requirements".
 */
export default function DataAttribution() {
  return (
    <footer className="mt-12 border-t border-border pt-6 text-xs leading-relaxed text-text-muted">
      <p>
        Climate data: <strong>Open-Meteo.com</strong> (CC BY 4.0). Based on ERA5
        reanalysis from Copernicus Climate Change Service / ECMWF. Historical
        data is model-based reanalysis — not direct station measurements. ENSO
        data: NOAA Climate Prediction Center.
      </p>
    </footer>
  );
}
