"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Region } from "@/lib/types";
import CityPicker from "@/components/ui/CityPicker";

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
      router.push(`/compare?a=${slugA}&b=${slugB}`);
    }
  }

  return (
    <div className="card p-6">
      {/* items-end keeps the swap/compare buttons aligned with the picker
          triggers; the pickers own their popovers, so this row can't clip them
          (the card doesn't set overflow). */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
        <CityPicker
          label="City A"
          value={a}
          onChange={setA}
          color="var(--series-1)"
          regions={regions}
          disabledSlug={b}
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

        <CityPicker
          label="City B"
          value={b}
          onChange={setB}
          color="var(--series-2)"
          regions={regions}
          disabledSlug={a}
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
