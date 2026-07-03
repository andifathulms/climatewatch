"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Region } from "@/lib/types";

/** Client-side fuzzy search over the featured regions list, routes to /city/[slug]. */
export default function CitySearch({ regions }: { regions: Region[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return regions
      .filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.province.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [q, regions]);

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search any Indonesian city…"
        className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base outline-none focus:border-rain-blue"
      />
      {matches.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {matches.map((r) => (
            <li key={r.slug}>
              <button
                onClick={() => router.push(`/city/${r.slug}`)}
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-surface-muted"
              >
                <span>{r.name}</span>
                <span className="text-xs text-text-muted">{r.province}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
