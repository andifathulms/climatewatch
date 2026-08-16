"use client";

import { useEffect, useState } from "react";
import FingerprintPanel from "./FingerprintPanel";
import PersonalBaseline from "@/components/charts/PersonalBaseline";
import { BASELINE_FROM, BASELINE_TO, MIN_YEARS_AFTER_BASELINE } from "./baseline";
import type {
  ENSOEvent,
  EnsoImpactResponse,
  ExtremesResponse,
  FingerprintResponse,
  Region,
  SeasonResponse,
  YearlyAggregate,
} from "@/lib/types";

/**
 * Shares one baseline year between the fingerprint's Baseline layer and
 * PersonalBaseline, per DESIGN.md §5.4: "PersonalBaseline already implements
 * a variant of this with a user-chosen year. Wire them together:
 * PersonalBaseline becomes the control that changes this layer's baseline
 * window, not a separate component with its own computation."
 *
 * The two still compute different things from that one year — the layer's
 * per-month climatology vs. PersonalBaseline's decade-endpoint delta — and
 * each states its own window length where it renders. What they no longer
 * do is disagree about *which* year the reader picked.
 *
 * A thin client wrapper rather than lifting state onto the (server, async)
 * city page: `?since=` hydration and URL sync need `window`, and putting
 * that in a Client Component that simply renders its two children is the
 * standard App Router shape for state shared across a server-rendered tree.
 */
export default function FingerprintRecordSection({
  region,
  initialFingerprint,
  ensoEvents,
  season,
  ensoImpact,
  extremes,
  tempMaxByYear,
  regionName,
  yearFrom,
  yearTo,
}: {
  region: Pick<Region, "id" | "slug">;
  initialFingerprint: FingerprintResponse;
  ensoEvents: ENSOEvent[];
  season: SeasonResponse | null;
  ensoImpact: EnsoImpactResponse | null;
  extremes: ExtremesResponse | null;
  tempMaxByYear: YearlyAggregate[] | null;
  regionName: string;
  yearFrom: number;
  yearTo: number;
}) {
  const latestAllowed = yearTo - MIN_YEARS_AFTER_BASELINE;
  const [since, setSinceState] = useState<number | null>(null);

  // Deep links still work: read the URL once on mount, after the server HTML
  // (which always renders the stated 1951-1980 default) has already painted
  // — the same deferred-hydration shape every other `?param=` on this page
  // uses, so a static export never ships a client-only-looking gap.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("since");
    if (!raw) return;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= yearFrom && n <= latestAllowed) {
      setSinceState(n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setSince(next: number | null) {
    setSinceState(next);
    const url = new URL(window.location.href);
    if (next === null) url.searchParams.delete("since");
    else url.searchParams.set("since", String(next));
    window.history.replaceState(null, "", url);
  }

  const baselineFrom = since ?? BASELINE_FROM;
  // A full 30-year span from `since`, matching the stated 1951-1980 default's
  // length — clamped to the record's actual end, which BaselineYearPicker's
  // `latestAllowed` already guarantees leaves at least
  // MIN_YEARS_AFTER_BASELINE years, never fewer.
  const baselineTo =
    since === null ? BASELINE_TO : Math.min(since + (BASELINE_TO - BASELINE_FROM), yearTo);

  return (
    <>
      <FingerprintPanel
        region={region}
        initial={initialFingerprint}
        ensoEvents={ensoEvents}
        season={season}
        ensoImpact={ensoImpact}
        extremes={extremes}
        baselineFrom={baselineFrom}
        baselineTo={baselineTo}
      />
      {tempMaxByYear && (
        <PersonalBaseline
          series={tempMaxByYear}
          regionName={regionName}
          yearFrom={yearFrom}
          yearTo={yearTo}
          since={since}
          onChangeSince={setSince}
        />
      )}
    </>
  );
}
