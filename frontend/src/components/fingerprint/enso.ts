import type { EnsoImpactResponse } from "@/lib/types";

/**
 * The ENSO layer's prose finding — DESIGN.md §5.3 / §10 step 6.
 *
 * `ENSOImpactCard` computed the same phase-average deltas and presented them
 * as a two-column stat grid in its own section, 800px from the grid it
 * described. This condenses the same numbers to the sentence DESIGN.md asks
 * for, meant to run as a caption directly beneath the fingerprint instead.
 */
export function ensoCaption(
  data: EnsoImpactResponse,
  lang: "en" | "id" = "en",
): string | null {
  const en = lang === "en";
  const dec = (v: number, d: number) =>
    en ? v.toFixed(d) : v.toFixed(d).replace(".", ",");
  const clauses: string[] = [];

  for (const phase of ["EL_NINO", "LA_NINA"] as const) {
    const months = data.phases[phase].months;
    const delta = data.deltas[phase];
    if (months === 0) continue;
    const name = phase === "EL_NINO" ? "El Niño" : "La Niña";

    const bits: string[] = [];
    if (delta.precipitation_delta_pct !== null) {
      const wet = delta.precipitation_delta_pct >= 0;
      bits.push(
        `${dec(Math.abs(delta.precipitation_delta_pct), 0)}% ${
          en ? (wet ? "wetter" : "drier") : wet ? "lebih basah" : "lebih kering"
        }`,
      );
    }
    if (delta.temp_delta_c !== null) {
      const warm = delta.temp_delta_c >= 0;
      bits.push(
        `${dec(Math.abs(delta.temp_delta_c), 1)}°C ${
          en ? (warm ? "warmer" : "cooler") : warm ? "lebih hangat" : "lebih sejuk"
        }`,
      );
    }
    if (bits.length === 0) continue;

    clauses.push(
      en
        ? `${name} months here average ${bits.join(" and ")} than neutral months`
        : `Bulan-bulan ${name} di sini rata-rata ${bits.join(" dan ")} daripada bulan netral`,
    );
  }

  return clauses.length > 0 ? `${clauses.join("; ")}.` : null;
}
