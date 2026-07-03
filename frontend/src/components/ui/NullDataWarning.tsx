/** Shown when data coverage for a region drops below 90%. */
export default function NullDataWarning({ coverage }: { coverage: number }) {
  if (coverage >= 0.9) return null;
  return (
    <div className="rounded-md border border-drought-amber/40 bg-drought-amber/10 px-3 py-2 text-xs text-text-secondary">
      ⚠ Data coverage for this region is{" "}
      <strong>{Math.round(coverage * 100)}%</strong>. Some months may be
      incomplete — trends should be read with caution.
    </div>
  );
}
