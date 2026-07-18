import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { MultiPolygon } from "geojson";
import worldTopology from "world-atlas/countries-50m.json";

const INDONESIA_ISO_NUMERIC = "360";

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
  return indonesia.geometry;
}
