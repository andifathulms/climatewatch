"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Region } from "@/lib/types";

const PRESETS: [string, string][] = [
  ["balikpapan", "jakarta"],
  ["makassar", "surabaya"],
  ["medan", "denpasar"],
  ["manado", "jakarta"],
];

/** Two-city selector that routes to /compare/[a]-vs-[b]. */
export default function CityCompare({ regions }: { regions: Region[] }) {
  const router = useRouter();
  const [a, setA] = useState<string>(regions[0]?.slug ?? "");
  const [b, setB] = useState<string>(regions[1]?.slug ?? "");

  const same = a === b;
  const ready = Boolean(a && b) && !same;

  function go(slugA: string, slugB: string) {
    if (slugA && slugB && slugA !== slugB) {
      router.push(`/compare/${slugA}-vs-${slugB}`);
    }
  }

  // The swatch previews the color the city will wear in the charts, so the
  // mapping is established before the reader ever gets there.
  function Picker({
    label,
    value,
    onChange,
    color,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    color: string;
  }) {
    return (
      <label className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex items-center gap-2 text-xs font-medium text-text-secondary">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{ background: color }}
          />
          {label}
        </span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field w-full px-3 py-2.5 text-sm"
        >
          {regions.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
        <Picker
          label="City A"
          value={a}
          onChange={setA}
          color="var(--series-1)"
        />

        <button
          type="button"
          onClick={() => {
            setA(b);
            setB(a);
          }}
          aria-label="Swap cities"
          title="Swap cities"
          className="btn-ghost h-[42px] w-full shrink-0 px-3 text-sm sm:w-[42px]"
        >
          <span aria-hidden>⇄</span>
        </button>

        <Picker
          label="City B"
          value={b}
          onChange={setB}
          color="var(--series-2)"
        />

        <button
          onClick={() => go(a, b)}
          disabled={!ready}
          className="btn-primary h-[42px] shrink-0 px-6 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          Compare
        </button>
      </div>

      {same && (
        <p className="mt-3 text-xs text-drought-amber">
          Pick two different cities to compare.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
        <span className="eyebrow mr-1">Presets</span>
        {PRESETS.map(([pa, pb]) => (
          <button
            key={`${pa}-${pb}`}
            onClick={() => go(pa, pb)}
            className="rounded-full border border-border bg-surface-inset px-3 py-1.5 text-xs capitalize text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
          >
            {pa} <span className="text-text-muted">vs</span> {pb}
          </button>
        ))}
      </div>
    </div>
  );
}
