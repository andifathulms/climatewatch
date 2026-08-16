/**
 * Shown when data coverage for a region drops below 90% — DESIGN.md §7 /
 * §10 step 9: "Render NullDataWarning wherever coverage for the displayed
 * window falls below 90%." Built long before it had a caller (zero import
 * sites, flagged in DESIGN-AUDIT.md as "a trust bug wearing a design
 * costume") — this wiring is what makes the component real.
 */
export default function NullDataWarning({
  coverage,
  unit = "months",
}: {
  coverage: number;
  /** What was actually counted. ERA5's daily granularity is never exposed to
   *  this frontend — every caller here computes coverage from monthly cells
   *  or annual rows, so the copy says so rather than claiming a day-level
   *  precision nothing on this page can verify. */
  unit?: "months" | "years";
}) {
  if (coverage >= 0.9) return null;

  return (
    // No role="status": this renders from prerendered HTML at page load, so
    // it is never a status *message* in the 4.1.3 sense. It is already
    // announced in normal reading order; the role only duplicated it.
    <div
      className="flex items-start gap-3 rounded-lg border border-drought-amber/40 bg-drought-amber/[0.08] px-4 py-3"
    >
      {/* Icon + label pairing — a status never rests on color alone. */}
      <span
        aria-hidden
        className="mt-0.5 shrink-0 text-sm text-drought-amber"
      >
        ⚠
      </span>
      <p className="text-xs leading-relaxed text-text-secondary">
        <span className="font-medium text-drought-amber">
          Incomplete coverage.
        </span>{" "}
        Only{" "}
        <strong className="font-numeric font-medium text-text-primary">
          {Math.round(coverage * 100)}%
        </strong>{" "}
        of {unit} in this record have a value. Some periods may be partial —
        read the trends with caution.
      </p>
    </div>
  );
}
