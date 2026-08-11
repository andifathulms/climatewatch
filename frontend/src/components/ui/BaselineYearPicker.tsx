"use client";

/**
 * Controlled year input for the personal baseline.
 *
 * Deliberately dumb — the owning component holds the state and the URL sync.
 * An earlier version read `useSearchParams()` itself, which forced the whole
 * panel to render client-only in the static export: the server HTML contained
 * no baseline figure at all until hydration.
 */
export default function BaselineYearPicker({
  yearFrom,
  latestAllowed,
  value,
  onChange,
}: {
  yearFrom: number;
  latestAllowed: number;
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="baseline-year" className="text-sm text-text-secondary">
        Compare against
      </label>
      <input
        id="baseline-year"
        type="number"
        inputMode="numeric"
        min={yearFrom}
        max={latestAllowed}
        placeholder={String(yearFrom)}
        defaultValue={value ?? ""}
        onBlur={(e) => {
          const raw = e.target.value.trim();
          if (!raw) return onChange(null);
          const n = Number(raw);
          if (Number.isInteger(n) && n >= yearFrom && n <= latestAllowed) {
            onChange(n);
          } else {
            // Out of range: snap the field back rather than silently keeping
            // a number the panel is not actually using.
            e.target.value = value === null ? "" : String(value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="field font-numeric w-24 px-3 py-2 text-sm"
        aria-describedby="baseline-help"
      />
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="btn-ghost px-3 py-1.5 text-2xs"
        >
          Reset to {yearFrom}
        </button>
      )}
      <span id="baseline-help" className="text-2xs text-text-muted">
        {yearFrom}–{latestAllowed}
      </span>
    </div>
  );
}
