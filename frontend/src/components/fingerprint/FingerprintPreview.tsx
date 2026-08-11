import type { FingerprintResponse } from "@/lib/types";
import { buildColorScale } from "./color-scale";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/**
 * A read-only miniature of the Climate Fingerprint, for the landing page.
 *
 * The point is comprehension, not analysis: a visitor who has never heard of
 * this product should see the actual artifact in the first viewport instead of
 * a promise that one exists. It deliberately has no tooltip, no hover, no
 * scroll and no legend — the full instrument lives on the city page, and
 * duplicating its interactions here would just be a second thing to maintain.
 *
 * It renders server-side as plain divs (no D3 DOM work, no client bundle) but
 * imports the *real* `buildColorScale`, so the colors here are identical to
 * the ones on the city page rather than a lookalike that can drift.
 */
export default function FingerprintPreview({
  fingerprint,
  years = 24,
}: {
  fingerprint: FingerprintResponse;
  years?: number;
}) {
  const scale = buildColorScale(fingerprint.variable, fingerprint.stats);

  // Newest at the top, matching the full fingerprint's orientation.
  const allYears = [...new Set(fingerprint.data.map((d) => d.year))].sort(
    (a, b) => b - a,
  );

  // Drop leading years that are entirely empty — the current calendar year is
  // mostly unwritten, and a band of null cells is a poor first impression of a
  // dataset whose whole claim is completeness.
  const populated = allYears.filter((y) =>
    fingerprint.data.some((d) => d.year === y && d.value !== null),
  );
  const shown = populated.slice(0, years);

  const valueAt = new Map(
    fingerprint.data.map((d) => [`${d.year}-${d.month}`, d.value]),
  );

  return (
    <figure className="card overflow-hidden p-5 sm:p-6">
      <figcaption className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-display text-lg font-semibold text-text-primary">
          {fingerprint.region.name}&rsquo;s rainfall, {shown[shown.length - 1]}–
          {shown[0]}
        </span>
        <span className="text-xs text-text-muted">
          One row per year · one square per month
        </span>
      </figcaption>

      <div>
        <div
          className="grid gap-[2px]"
          style={{ gridTemplateColumns: `repeat(12, minmax(0, 1fr))` }}
          role="img"
          aria-label={`Monthly rainfall for ${fingerprint.region.name} from ${
            shown[shown.length - 1]
          } to ${shown[0]}. Darker squares are drier months, brighter squares are wetter ones.`}
        >
          {shown.map((year) =>
            MONTHS.map((_, i) => {
              const v = valueAt.get(`${year}-${i + 1}`) ?? null;
              return (
                <div
                  key={`${year}-${i}`}
                  className="h-[13px] rounded-[2px]"
                  style={{
                    background: v === null ? "var(--null-cell)" : scale(v),
                  }}
                />
              );
            }),
          )}
        </div>

        <div
          aria-hidden
          className="mt-1.5 grid gap-[2px] font-numeric text-2xs text-text-muted"
          style={{ gridTemplateColumns: `repeat(12, minmax(0, 1fr))` }}
        >
          {MONTHS.map((m, i) => (
            <span key={i} className="text-center">
              {m}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 text-sm text-text-secondary">
        Dark is a dry month, bright is a wet one. Read down a column to see one
        month drift across {shown.length} years — that drift is the story this
        site tells, for{" "}
        <span className="text-text-primary">every city in Indonesia</span>.
      </p>
    </figure>
  );
}
