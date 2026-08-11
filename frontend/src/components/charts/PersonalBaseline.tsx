"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { YearlyAggregate } from "@/lib/types";
import BaselineYearPicker from "@/components/ui/BaselineYearPicker";
import LiveAnnouncement from "@/components/ui/LiveAnnouncement";

/**
 * Re-anchors the warming figure to a year the reader chooses.
 *
 * "Since 1950" is a claim about a dataset. "Since 1992" is a claim about a
 * life, and it is the one that lands — most of this audience was not alive in
 * 1950, so the site's headline number describes a world they have no memory
 * of and cannot check against.
 *
 * The default baseline renders on the server, so the figure is in the HTML
 * before any JavaScript runs. `?since` is read on mount instead of through
 * useSearchParams, which in a static export would force this whole panel to
 * render client-only and ship an empty card to anyone without JS. The
 * arithmetic is a mean of monthly values already in the fingerprint payload —
 * no extra request, no new rule.
 */

// A baseline needs enough years after it before a comparison means anything.
// Below this the figure is dominated by whichever ENSO phase happened to sit
// at each end, and it would be the most screenshotted number on the page.
const MIN_WINDOW = 20;

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
}: {
  series: YearlyAggregate[];
  regionName: string;
  yearFrom: number;
  yearTo: number;
}) {
  const latestAllowed = yearTo - MIN_WINDOW;
  const [since, setSince] = useState<number | null>(null);
  // Empty until the reader changes something, so nothing is announced on load.
  const [announcement, setAnnouncement] = useState("");

  // Deep links still work: read the URL once on mount, after the server HTML
  // (which always shows the full-record baseline) has already painted.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("since");
    if (!raw) return;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= yearFrom && n <= latestAllowed) setSince(n);
  }, [yearFrom, latestAllowed]);

  // Keep the URL in step so the view stays shareable and citable — a figure in
  // a screenshot can always be traced back to the baseline that produced it.
  function apply(next: number | null) {
    setSince(next);
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
    const url = new URL(window.location.href);
    if (next === null) {
      url.searchParams.delete("since");
    } else {
      url.searchParams.set("since", String(next));
    }
    window.history.replaceState(null, "", url);
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
