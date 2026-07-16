/** Skeleton mirroring the city page's real layout, so nothing jumps on load. */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 pt-12" aria-busy aria-label="Loading city">
      {/* Masthead */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="h-3 w-28 rounded bg-surface-muted" />
          <div className="h-11 w-64 rounded-lg bg-surface-muted" />
          <div className="h-3 w-40 rounded bg-surface-muted" />
        </div>
        <div className="h-16 w-52 rounded-lg bg-surface-muted" />
      </div>

      {/* Forecast strip */}
      <div className="h-44 rounded-lg bg-surface-muted" />

      {/* Fingerprint */}
      <div className="h-[34rem] rounded-lg bg-surface-muted" />

      {/* Two charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-lg bg-surface-muted" />
        <div className="h-80 rounded-lg bg-surface-muted" />
      </div>
    </div>
  );
}
