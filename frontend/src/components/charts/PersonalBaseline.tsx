"use client";

import { useCallback, useMemo, useState } from "react";
import type { YearlyAggregate } from "@/lib/types";
import BaselineYearPicker from "@/components/ui/BaselineYearPicker";
import LiveAnnouncement from "@/components/ui/LiveAnnouncement";
import { MIN_YEARS_AFTER_BASELINE } from "@/components/fingerprint/baseline";

/**
 * Re-anchors the warming figure to a year the reader chooses.
 *
 * "Since 1950" is a claim about a dataset. "Since 1992" is a claim about a
 * life, and it is the one that lands — most of this audience was not alive in
 * 1950, so the site's headline number describes a world they have no memory
 * of and cannot check against.
 *
 * `since` is owned by `FingerprintRecordSection`, not this component — per
 * DESIGN.md §5.4, this is now "the control that changes [the Baseline
 * layer's] window," so the year has to live somewhere both it and the
 * fingerprint can read. The default baseline still renders on the server
 * (the parent's `since` starts `null`, resolving to the stated 1951-1980
 * default), so the figure is in the HTML before any JavaScript runs. The
 * arithmetic here is a mean of monthly values already in the fingerprint
 * payload — no extra request, no new rule.
 */

// Both ends are averaged over a decade so a single strong El Niño at either
// end cannot masquerade as a trend.
const WINDOW = 10;

/**
 * Mean of the monthly values across an inclusive year range.
 *
 * Takes per-year {sum, n} rather than the 924 monthly cells this used to
 * receive: sum(sums) / sum(counts) is arithmetically identical to averaging
 * the months directly, including where a year has missing months, because the
 * counts carry the weighting. 77 numbers instead of 924 serialised into the
 * page for a component that only ever needed decade averages.
 */
function meanBetween(
  series: YearlyAggregate[],
  from: number,
  to: number,
): number | null {
  let sum = 0;
  let n = 0;
  for (const y of series) {
    if (y.year >= from && y.year <= to) {
      sum += y.sum;
      n += y.n;
    }
  }
  return n === 0 ? null : sum / n;
}

export default function PersonalBaseline({
  series,
  regionName,
  yearFrom,
  yearTo,
  since,
  onChangeSince,
}: {
  series: YearlyAggregate[];
  regionName: string;
  yearFrom: number;
  yearTo: number;
  /** Owned by `FingerprintRecordSection` — `null` means the stated default. */
  since: number | null;
  /** Also updates the fingerprint's Baseline layer window and the URL; see
   *  `FingerprintRecordSection`. */
  onChangeSince: (next: number | null) => void;
}) {
  const latestAllowed = yearTo - MIN_YEARS_AFTER_BASELINE;
  // Empty until the reader changes something, so nothing is announced on load.
  const [announcement, setAnnouncement] = useState("");

  function apply(next: number | null) {
    onChangeSince(next);
    // Announced from here, not from an effect on `since`: an effect would also
    // fire for the deep-link read on mount, announcing a figure the reader
    // never asked to change.
    const year = next ?? yearFrom;
    const d = deltaFor(year);
    setAnnouncement(
      d === null
        ? `Not enough data around ${year} to compare.`
        : `Since ${year}, ${regionName}'s average daily high has moved ` +
          `${d >= 0 ? "up" : "down"} ${Math.abs(d).toFixed(1)} degrees Celsius.`,
    );
  }

  const baselineYear = since ?? yearFrom;

  // Shared by the rendered figure and the announcement so the two cannot
  // disagree about what the number is.
  const deltaFor = useCallback(
    (from: number): number | null => {
      const early = meanBetween(series, from, from + WINDOW - 1);
      const recent = meanBetween(series, yearTo - WINDOW, yearTo - 1);
      if (early === null || recent === null) return null;
      return recent - early;
    },
    [series, yearTo],
  );

  const result = useMemo(() => {
    const delta = deltaFor(baselineYear);
    return delta === null ? null : { delta };
  }, [deltaFor, baselineYear]);

  return (
    <section className="card p-6">
      <h3 className="eyebrow">Your baseline</h3>

      {result ? (
        <p className="mt-3 max-w-prose font-display text-title font-semibold text-text-primary">
          Since {baselineYear}, {regionName}&rsquo;s average daily high
          has moved{" "}
          <span
            className={
              result.delta >= 0 ? "text-heat-light" : "text-rain-light"
            }
          >
            {result.delta >= 0 ? "+" : "−"}
            <span className="font-numeric">
              {Math.abs(result.delta).toFixed(1)} °C
            </span>
          </span>
          .
        </p>
      ) : (
        <p className="mt-3 text-text-secondary">
          Not enough data around {baselineYear} to compare.
        </p>
      )}

      <div className="mt-5">
        <BaselineYearPicker
          yearFrom={yearFrom}
          latestAllowed={latestAllowed}
          value={since}
          onChange={apply}
        />
      </div>

      <p className="mt-4 border-t border-border pt-3 text-2xs leading-relaxed text-text-muted">
        An endpoint comparison, not the fitted trend in &ldquo;what moved
        most&rdquo; above — the two answer different questions and will not
        agree. This compares the {WINDOW}-year mean starting at your baseline
        against the last {WINDOW} complete years ({yearTo - WINDOW}–
        {yearTo - 1}), using monthly average daily maximum. Both ends are decade means so one strong
        El Niño cannot pass for a trend. Baselines after{" "}
        <span className="font-numeric">{latestAllowed}</span> are not offered —
        too few years remain for the comparison to mean anything.
      </p>
    </section>
  );
}
