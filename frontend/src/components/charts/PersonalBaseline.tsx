"use client";

import { useCallback, useMemo, useState } from "react";
import type { YearlyAggregate } from "@/lib/types";
import BaselineYearPicker from "@/components/ui/BaselineYearPicker";
import LiveAnnouncement from "@/components/ui/LiveAnnouncement";
import { MIN_YEARS_AFTER_BASELINE } from "@/components/fingerprint/baseline";
import { L, N } from "@/lib/i18n";
import { useLang } from "@/lib/use-lang";

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
  const lang = useLang();
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
        ? lang === "en"
          ? `Not enough data around ${year} to compare.`
          : `Data di sekitar ${year} tidak cukup untuk dibandingkan.`
        : lang === "en"
          ? `Since ${year}, ${regionName}'s average daily high has moved ` +
            `${d >= 0 ? "up" : "down"} ${Math.abs(d).toFixed(1)} degrees Celsius.`
          : `Sejak ${year}, rata-rata suhu tertinggi harian ${regionName} ` +
            `${d >= 0 ? "naik" : "turun"} ${Math.abs(d).toFixed(1).replace(".", ",")} derajat Celsius.`,
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

  const firstDecade = `${baselineYear}–${baselineYear + WINDOW - 1}`;
  const lastDecade = `${yearTo - WINDOW}–${yearTo - 1}`;

  return (
    <section id="lifetime" className="card scroll-mt-32 p-6 sm:p-8">
      <LiveAnnouncement message={announcement} />
      <p className="eyebrow">
        <L en="Your lifetime" id="Seumur hidupmu" />
      </p>
      <h3 className="mt-2 font-display text-2xl font-semibold">
        <L en={`Grew up in ${regionName}?`} id={`Besar di ${regionName}?`} />
      </h3>

      <div className="mt-5">
        <BaselineYearPicker
          yearFrom={yearFrom}
          latestAllowed={latestAllowed}
          value={since}
          onChange={apply}
        />
      </div>

      {result && since === null ? (
        <p className="mt-6 max-w-prose font-display text-title font-semibold leading-snug text-text-primary">
          <L en="Enter the year you were born to see how much hotter" id="Masukkan tahun lahirmu untuk melihat seberapa panas" />{" "}
          {regionName}{" "}
          <L en="has become in your lifetime." id="kota ini selama hidupmu." />
        </p>
      ) : result ? (
        <p className="mt-6 max-w-prose font-display text-title font-semibold leading-snug text-text-primary">
          <L
            en={<>Days in {regionName} now peak </>}
            id={<>Siang hari di {regionName} kini </>}
          />
          <span
            className={`num-display ${result.delta >= 0 ? "text-heat-light" : "text-rain-light"}`}
          >
            <N value={result.delta} signed unit=" °C" />
          </span>
          <L
            en={<> {result.delta >= 0 ? "hotter" : "cooler"} than in your first ten years ({firstDecade}).</>}
            id={<> {result.delta >= 0 ? "lebih panas" : "lebih sejuk"} daripada sepuluh tahun pertamamu ({firstDecade}).</>}
          />
        </p>
      ) : (
        <p className="mt-6 text-text-secondary">
          <L
            en={`Not enough data around ${baselineYear} to compare.`}
            id={`Data di sekitar ${baselineYear} tidak cukup untuk dibandingkan.`}
          />
        </p>
      )}

      <p className="mt-5 max-w-prose border-t border-border pt-3 text-2xs leading-relaxed text-text-muted">
        <L
          en={`Average daily high over ${firstDecade} compared with ${lastDecade}. Both ends are ten-year means, so one strong El Niño cannot pass for a trend. This is an endpoint comparison, not the fitted trend in the headline, so the two numbers will differ. Changing the year also moves the fingerprint's “vs 1951–1980” layer to your years.`}
          id={`Rata-rata suhu tertinggi harian ${firstDecade} dibandingkan dengan ${lastDecade}. Kedua ujung adalah rata-rata sepuluh tahun, jadi satu El Niño kuat tidak bisa terbaca sebagai tren. Ini perbandingan dua ujung, bukan tren garis lurus di judul, jadi angkanya bisa berbeda. Mengganti tahun juga menggeser lapisan “vs 1951–1980” pada sidik iklim ke tahun-tahunmu.`}
        />
      </p>
    </section>
  );
}
