import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { MultiPolygon } from "geojson";
import worldTopology from "world-atlas/countries-50m.json";

const INDONESIA_ISO_NUMERIC = "360";

/**
 * Decimal places kept per coordinate.
 *
 * The map renders 1000px wide across roughly 46 degrees of longitude, so one
 * pixel is about 0.046 degrees. Three decimals (0.001 degrees) is already ~46x
 * finer than the smallest thing the SVG can draw. The source carries up to 18
 * decimal places — float noise from the topojson quantisation — and every one
 * of those digits was being serialised into the home page's HTML.
 */
const COORD_PRECISION = 3;

/** Round in place, depth-first. MultiPolygon nests position arrays 3 deep. */
function roundCoords(node: unknown): unknown {
  if (typeof node === "number") {
    const f = 10 ** COORD_PRECISION;
    return Math.round(node * f) / f;
  }
  return Array.isArray(node) ? node.map(roundCoords) : node;
}

/**
 * Indonesia's national boundary (Natural Earth 50m resolution, via
 * world-atlas). Extracted server-side only — importing world-atlas in a
 * client component would ship the whole world's topology to the browser just
 * to render one country's outline.
 */
export function getIndonesiaGeometry(): MultiPolygon {
  const topology = worldTopology as unknown as Topology;
  const countries = feature(
    topology,
    topology.objects.countries as never,
  ) as unknown as GeoJSON.FeatureCollection;

  const indonesia = countries.features.find(
    (f) => String(f.id) === INDONESIA_ISO_NUMERIC,
  );
  if (!indonesia || indonesia.geometry.type !== "MultiPolygon") {
    throw new Error("Indonesia geometry not found in world-atlas topology");
  }

  // Rounded here rather than in the component: this runs once at build time,
  // and the geometry is serialised straight into the page's HTML, so the
  // saving is in bytes shipped rather than work avoided.
  return {
    ...indonesia.geometry,
    coordinates: roundCoords(
      indonesia.geometry.coordinates,
    ) as MultiPolygon["coordinates"],
  };
}
