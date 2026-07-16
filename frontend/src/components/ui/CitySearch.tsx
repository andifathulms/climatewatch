"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Region } from "@/lib/types";

/**
 * Client-side search over the regions list, routing to /city/[slug].
 * Implements the ARIA combobox pattern: ↑/↓ to move, Enter to open, Esc to
 * dismiss — the list is unreachable by keyboard without it.
 */
export default function CitySearch({ regions }: { regions: Region[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  // Reset the highlight whenever the query changes, so Enter can never open a
  // stale row left over from the previous result set.
  useEffect(() => setActive(0), [q]);

  // Dismiss on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const show = open && matches.length > 0;

  function go(slug: string) {
    setOpen(false);
    router.push(`/city/${slug}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!show) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = matches[active];
      if (pick) go(pick.slug);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>

        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search any Indonesian city…"
          aria-label="Search for a city"
          role="combobox"
          aria-expanded={show}
          aria-controls="city-search-listbox"
          aria-autocomplete="list"
          aria-activedescendant={show ? `city-opt-${active}` : undefined}
          className="field w-full py-3.5 pl-11 pr-4 text-base placeholder:text-text-muted"
        />
      </div>

      {show && (
        <ul
          id="city-search-listbox"
          role="listbox"
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-border bg-surface-raised p-1.5 shadow-float"
        >
          {matches.map((r, i) => (
            <li key={r.slug} role="presentation">
              <button
                id={`city-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r.slug)}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                  i === active ? "bg-surface-muted" : ""
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      i === active ? "bg-rain-blue" : "bg-border-strong"
                    }`}
                  />
                  <span className="text-sm font-medium text-text-primary">
                    {r.name}
                  </span>
                </span>
                <span className="truncate text-xs text-text-muted">
                  {r.province}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
