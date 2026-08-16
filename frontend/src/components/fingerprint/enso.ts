import type { EnsoImpactResponse } from "@/lib/types";

/**
 * The ENSO layer's prose finding — DESIGN.md §5.3 / §10 step 6.
 *
 * `ENSOImpactCard` computed the same phase-average deltas and presented them
 * as a two-column stat grid in its own section, 800px from the grid it
 * described. This condenses the same numbers to the sentence DESIGN.md asks
 * for, meant to run as a caption directly beneath the fingerprint instead.
 */
export function ensoCaption(data: EnsoImpactResponse): string | null {
  const clauses: string[] = [];

  for (const [phase, label, subject] of [
    ["EL_NINO", "El Niño months here average", "than Neutral months"],
    ["LA_NINA", "La Niña months here average", "than Neutral months"],
  ] as const) {
    const months = data.phases[phase].months;
    const delta = data.deltas[phase];
    if (months === 0) continue;

    const bits: string[] = [];
    if (delta.precipitation_delta_pct !== null) {
      bits.push(
        `${Math.abs(delta.precipitation_delta_pct).toFixed(0)}% ${
          delta.precipitation_delta_pct >= 0 ? "wetter" : "drier"
        }`,
      );
    }
    if (delta.temp_delta_c !== null) {
      bits.push(
        `${Math.abs(delta.temp_delta_c).toFixed(1)}°C ${
          delta.temp_delta_c >= 0 ? "warmer" : "cooler"
        }`,
      );
    }
    if (bits.length === 0) continue;

    clauses.push(`${label} ${bits.join(" and ")} ${subject}`);
  }

  return clauses.length > 0 ? `${clauses.join("; ")}.` : null;
}
