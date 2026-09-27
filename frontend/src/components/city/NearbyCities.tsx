import Link from "next/link";
import type { Region, StripeSeries } from "@/lib/types";
import { L, N } from "@/lib/i18n";
import Stripes from "@/components/ui/Stripes";
import { decadeChange } from "./stripe-stats";

function km(a: Pick<Region, "latitude" | "longitude">, b: Pick<Region, "latitude" | "longitude">) {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** The four closest loaded cities, each with its own stripes. */
export default function NearbyCities({
  region,
  regions,
  stripes,
}: {
  region: Region;
  regions: Region[];
  stripes: Map<string, StripeSeries>;
}) {
  const nearby = regions
    .filter((r) => r.slug !== region.slug && r.has_data && stripes.has(r.slug))
    .map((r) => ({ r, d: km(region, r) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 4);
  if (!nearby.length) return null;

  return (
    <section id="nearby" className="scroll-mt-32">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            <L en="Nearby cities" id="Kota terdekat" />
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold">
            <L en={`How does ${region.name} compare?`} id={`Bagaimana ${region.name} dibanding kota lain?`} />
          </h2>
        </div>
        <Link href={`/compare?a=${region.slug}`} className="btn-primary px-5 py-2.5 text-sm">
          <L en="Compare with any city →" id="Bandingkan dengan kota lain →" />
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {nearby.map(({ r, d }) => {
          const s = stripes.get(r.slug)!;
          const c = decadeChange(s);
          return (
            <li key={r.slug}>
              <Link
                href={`/city/${r.slug}`}
                className="group block overflow-hidden rounded-lg border border-border bg-surface transition duration-200 ease-ease hover:-translate-y-0.5 hover:border-border-strong"
              >
                <Stripes anomalies={s.anomalies} rounded={false} className="h-10 w-full" />
                <div className="flex items-end justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="truncate font-display text-lg font-semibold leading-tight">{r.name}</div>
                    <div className="font-numeric mt-1 text-2xs text-text-muted">
                      {Math.round(d).toLocaleString("en-US")} km
                    </div>
                  </div>
                  {c && (
                    <span className="font-numeric shrink-0 text-xs text-heat-light">
                      <N value={c.delta} signed unit="°" />
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
