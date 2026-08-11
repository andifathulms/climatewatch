"use client";

import { useEffect, useMemo, useState } from "react";
import type { FingerprintResponse } from "@/lib/types";
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

function meanBetween(
  fp: FingerprintResponse,
  from: number,
  to: number,
): number | null {
  const values = fp.data
    .filter((d) => d.year >= from && d.year <= to && d.value !== null)
    .map((d) => d.value as number);
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export default function PersonalBaseline({
  tempMax,
  yearFrom,
  yearTo,
}: {
  tempMax: FingerprintResponse;
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
    setAnnouncement("");
    const url = new URL(window.location.href);
    if (next === null) {
      url.searchParams.delete("since");
    } else {
      url.searchParams.set("since", String(next));
    }
    window.history.replaceState(null, "", url);
  }

  const baselineYear = since ?? yearFrom;

  const result = useMemo(() => {
    // The most recent complete decade, against the decade starting at the
    // chosen baseline.
    const early = meanBetween(tempMax, baselineYear, baselineYear + WINDOW - 1);
    const recent = meanBetween(tempMax, yearTo - WINDOW, yearTo - 1);
    if (early === null || recent === null) return null;
    return { early, recent, delta: recent - early };
  }, [tempMax, baselineYear, yearTo]);

  return (
    <section className="card p-6">
      <h3 className="eyebrow">Your baseline</h3>

      {result ? (
        <p className="mt-3 max-w-prose font-display text-title font-semibold text-text-primary">
          Since {baselineYear}, {tempMax.region.name}&rsquo;s average daily high
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
