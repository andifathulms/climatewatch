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

  function go(slugA: string, slugB: string) {
    if (slugA && slugB && slugA !== slugB) {
      router.push(`/compare/${slugA}-vs-${slugB}`);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm text-text-secondary">
          City A
          <select
            value={a}
            onChange={(e) => setA(e.target.value)}
            className="mt-1 rounded-md border border-border bg-surface-muted px-3 py-2"
          >
            {regions.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <span className="pb-2 text-text-muted">vs</span>
        <label className="flex flex-col text-sm text-text-secondary">
          City B
          <select
            value={b}
            onChange={(e) => setB(e.target.value)}
            className="mt-1 rounded-md border border-border bg-surface-muted px-3 py-2"
          >
            {regions.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => go(a, b)}
          className="rounded-md bg-text-primary px-4 py-2 text-sm text-white hover:opacity-90"
        >
          Compare
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-xs text-text-muted">Presets:</span>
        {PRESETS.map(([pa, pb]) => (
          <button
            key={`${pa}-${pb}`}
            onClick={() => go(pa, pb)}
            className="rounded-full bg-surface-muted px-3 py-1 text-xs capitalize text-text-secondary hover:bg-border"
          >
            {pa} vs {pb}
          </button>
        ))}
      </div>
    </div>
  );
}
