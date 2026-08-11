"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Region } from "@/lib/types";

/**
 * Grouped, searchable, keyboard-navigable city picker — a themed replacement
 * for the bare native <select>, whose option list can't be styled and dumped
 * all 54 cities in one flat alphabetical run.
 *
 * Cities are grouped by Indonesian island region (the province → region map
 * below), in west-to-east order, so the list reads the way the archipelago
 * does. Typing filters across every group at once.
 */

const REGION_ORDER = [
  "Sumatera",
  "Jawa",
  "Kalimantan",
  "Bali & Nusa Tenggara",
  "Sulawesi",
  "Maluku & Papua",
] as const;

type RegionName = (typeof REGION_ORDER)[number];

const PROVINCE_TO_REGION: Record<string, RegionName> = {
  // Sumatera
  Aceh: "Sumatera",
  "Sumatera Utara": "Sumatera",
  "Sumatera Barat": "Sumatera",
  Riau: "Sumatera",
  "Kepulauan Riau": "Sumatera",
  Jambi: "Sumatera",
  Bengkulu: "Sumatera",
  "Sumatera Selatan": "Sumatera",
  "Kepulauan Bangka Belitung": "Sumatera",
  Lampung: "Sumatera",
  // Jawa
  "DKI Jakarta": "Jawa",
  Banten: "Jawa",
  "Jawa Barat": "Jawa",
  "Jawa Tengah": "Jawa",
  "DI Yogyakarta": "Jawa",
  "Jawa Timur": "Jawa",
  // Kalimantan
  "Kalimantan Barat": "Kalimantan",
  "Kalimantan Tengah": "Kalimantan",
  "Kalimantan Selatan": "Kalimantan",
  "Kalimantan Timur": "Kalimantan",
  "Kalimantan Utara": "Kalimantan",
  // Bali & Nusa Tenggara
  Bali: "Bali & Nusa Tenggara",
  "Nusa Tenggara Barat": "Bali & Nusa Tenggara",
  "Nusa Tenggara Timur": "Bali & Nusa Tenggara",
  // Sulawesi
  "Sulawesi Utara": "Sulawesi",
  "Sulawesi Tengah": "Sulawesi",
  "Sulawesi Selatan": "Sulawesi",
  "Sulawesi Tenggara": "Sulawesi",
  Gorontalo: "Sulawesi",
  "Sulawesi Barat": "Sulawesi",
  // Maluku & Papua
  Maluku: "Maluku & Papua",
  "Maluku Utara": "Maluku & Papua",
  Papua: "Maluku & Papua",
  "Papua Barat": "Maluku & Papua",
  "Papua Barat Daya": "Maluku & Papua",
};

function regionOf(province: string): RegionName {
  return PROVINCE_TO_REGION[province] ?? "Maluku & Papua";
}

interface Group {
  region: RegionName;
  cities: Region[];
}

export default function CityPicker({
  regions,
  value,
  onChange,
  label,
  color,
  disabledSlug,
}: {
  regions: Region[];
  value: string;
  onChange: (slug: string) => void;
  label: string;
  color: string;
  /** The city chosen on the other side — shown but not selectable here. */
  disabledSlug?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const selected = regions.find((r) => r.slug === value) ?? null;

  // Build ordered, filtered groups + a flat list for keyboard traversal.
  const { groups, flat } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const buckets = new Map<RegionName, Region[]>();
    for (const r of regions) {
      if (
        q &&
        !r.name.toLowerCase().includes(q) &&
        !r.province.toLowerCase().includes(q)
      )
        continue;
      const region = regionOf(r.province);
      const arr = buckets.get(region) ?? [];
      arr.push(r);
      buckets.set(region, arr);
    }

    const gs: Group[] = [];
    const flatList: Region[] = [];
    for (const region of REGION_ORDER) {
      const cities = buckets.get(region);
      if (!cities?.length) continue;
      cities.sort((a, b) => a.name.localeCompare(b.name));
      gs.push({ region, cities });
      flatList.push(...cities);
    }
    return { groups: gs, flat: flatList };
  }, [regions, query]);

  // Keep the active row in range as the filter narrows.
  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(flat.length - 1, 0)));
  }, [flat.length]);

  // On open: focus the search and highlight the current selection.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    const idx = flat.findIndex((r) => r.slug === value);
    setActive(idx >= 0 ? idx : 0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Dismiss on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function choose(r: Region) {
    if (r.slug === disabledSlug) return;
    onChange(r.slug);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = flat[active];
      if (pick) choose(pick);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  // Running index so each rendered row maps back to its flat position.
  let cursor = -1;

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-1 flex-col gap-2">
      <span className="flex items-center gap-2 text-xs font-medium text-text-secondary">
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ background: color }}
        />
        {label}
      </span>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className="field flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium text-text-primary">
            {selected ? selected.name : "Select a city"}
          </span>
          {selected && (
            <span className="block truncate text-xs text-text-muted">
              {selected.province}
            </span>
          )}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`shrink-0 text-text-muted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-float">
          <div className="border-b border-border p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search city or province…"
              aria-label="Search cities"
              aria-controls={listboxId}
              aria-activedescendant={
                flat[active] ? `${listboxId}-${active}` : undefined
              }
              className="field w-full px-3 py-2 text-sm placeholder:text-text-muted"
            />
          </div>

          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="max-h-72 overflow-y-auto p-1.5"
          >
            {groups.map((g) => (
              <li key={g.region} role="presentation">
                <p className="eyebrow sticky top-0 bg-surface-raised px-2 py-1.5">
                  {g.region}
                </p>
                <ul role="presentation">
                  {g.cities.map((r) => {
                    cursor += 1;
                    const idx = cursor;
                    const isActive = idx === active;
                    const isSelected = r.slug === value;
                    const isDisabled = r.slug === disabledSlug;
                    return (
                      <li key={r.slug} role="presentation">
                        <button
                          type="button"
                          id={`${listboxId}-${idx}`}
                          data-idx={idx}
                          role="option"
                          aria-selected={isSelected}
                          aria-disabled={isDisabled}
                          disabled={isDisabled}
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => choose(r)}
                          className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                            isDisabled
                              ? "cursor-not-allowed opacity-35"
                              : isActive
                                ? "bg-surface-muted"
                                : ""
                          }`}
                        >
                          <span className="truncate text-text-primary">
                            {r.name}
                          </span>
                          {isSelected ? (
                            <span
                              aria-hidden
                              className="shrink-0 text-2xs"
                              style={{ color }}
                            >
                              ● selected
                            </span>
                          ) : isDisabled ? (
                            <span className="shrink-0 text-2xs uppercase tracking-wide text-text-muted">
                              other side
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}

            {flat.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-text-muted">
                No city matches “{query}”.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
