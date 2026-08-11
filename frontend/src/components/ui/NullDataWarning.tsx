/** Shown when data coverage for a region drops below 90%. */
export default function NullDataWarning({ coverage }: { coverage: number }) {
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
        of days in this region have data. Some months may be partial — read the
        trends with caution.
      </p>
    </div>
  );
}
