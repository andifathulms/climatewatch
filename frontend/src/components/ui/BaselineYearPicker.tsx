"use client";

import { L } from "@/lib/i18n";

/**
 * Controlled year input for the personal baseline ("the year you were
 * born"). Deliberately dumb — the owner holds the state and the URL sync.
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
        <L en="I was born in" id="Saya lahir tahun" />
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
            e.target.value = value === null ? "" : String(value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="field font-numeric w-24 px-3 py-2 text-base"
        aria-describedby="baseline-help"
      />
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="btn-ghost px-3 py-1.5 text-2xs"
        >
          <L en={`Reset to ${yearFrom}`} id={`Kembali ke ${yearFrom}`} />
        </button>
      )}
      <span id="baseline-help" className="font-numeric text-2xs text-text-muted">
        {yearFrom}–{latestAllowed}
      </span>
    </div>
  );
}
