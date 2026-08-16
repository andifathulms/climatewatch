import Link from "next/link";

/**
 * The wet-season rules, stated wherever a season number is shown.
 *
 * The end-of-season rule is weaker than the onset rule — onset is BMKG-derived,
 * the end is our own mirror of it — and length inherits the error of both.
 * Length is also the most quotable number on the page ("three weeks shorter per
 * decade"), so the definition travels with it rather than living only on the
 * methodology page.
 */
export default function SeasonRuleNote({
  saturatedShare,
  bordered = true,
}: {
  saturatedShare?: number;
  /** False when a caller already draws its own separator above this note
   *  (e.g. FingerprintPanel's Season layer sidebar) — avoids stacking two. */
  bordered?: boolean;
}) {
  return (
    <p
      className={`text-2xs leading-relaxed text-text-muted ${bordered ? "mt-4 border-t border-border pt-3" : ""}`}
    >
      Onset: first 5-day spell totalling ≥40 mm after Aug 1 — the threshold
      BMKG uses, because 40 mm over five days is roughly the point where soil
      holds enough water to plant into, and a five-day window is long enough
      that one thunderstorm cannot trigger a false start. August 1 is the scan
      start because the dry season bottoms out around July across most of
      Indonesia. End: the last such spell before Aug 1 of the following year —
      our own mirror of the onset rule, not BMKG&rsquo;s, so it is the weaker
      of the two. Length pairs the two across the calendar boundary.
      {saturatedShare !== undefined && (
        <>
          {" "}
          Here the onset rule fires within 10 days of Aug 1 in{" "}
          <span className="font-numeric">
            {Math.round(saturatedShare * 100)}%
          </span>{" "}
          of years, which is what marks it as saturated.
        </>
      )}{" "}
      <Link
        href="/about"
        className="underline decoration-border-strong underline-offset-2 transition-colors hover:text-text-secondary"
      >
        Full definitions
      </Link>
      .
    </p>
  );
}
