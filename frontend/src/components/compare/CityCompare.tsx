"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  // Seed the pickers from ?a=/?b= so arriving from a city page's "How does X
  // compare?" lands with X already selected, and so a shared /compare URL
  // reopens with the pickers matching the chart below them. They previously
  // always started at the first two regions alphabetically — Ambon and
  // Balikpapan — whichever city you had come from.
  //
  // Read from window on mount rather than via useSearchParams: in a static
  // export that hook forces the whole component behind a Suspense boundary,
  // which shipped an empty selector card in the prerendered HTML. Defaults
  // render server-side and correct themselves once mounted.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const known = (slug: string | null) =>
      slug && regions.some((r) => r.slug === slug) ? slug : null;

    const nextA = known(q.get("a"));
    const nextB = known(q.get("b"));
    if (nextA) setA(nextA);
    if (nextB) setB(nextB);
    // Never leave both sides on the same city — the compare button would be
    // dead on arrival, since a city cannot be compared with itself.
    if (nextA && !nextB) {
      setB((prev) =>
        prev === nextA
          ? (regions.find((r) => r.slug !== nextA)?.slug ?? prev)
          : prev,
      );
    }
  }, [regions]);

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
