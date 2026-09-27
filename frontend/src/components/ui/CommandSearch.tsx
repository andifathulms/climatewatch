"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Region, StripeSeries } from "@/lib/types";
import { L } from "@/lib/i18n";
import { useT } from "@/lib/use-lang";
import Stripes from "./Stripes";
import LiveAnnouncement from "./LiveAnnouncement";

/** Fire from anywhere (tab bar, hero button) to open the search. */
export const OPEN_SEARCH_EVENT = "cw:search";
export function openSearch() {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}

/** Shown before anything is typed — one per major island group. */
const SUGGESTED = [
  "jakarta",
  "surabaya",
  "bandung",
  "medan",
  "denpasar",
  "makassar",
  "balikpapan",
  "jayapura",
];

/**
 * Site-wide city search: ⌘K / Ctrl+K / "/" from any page, or the header
 * button. Before this, the only search box lived on the homepage, so moving
 * from one city to another meant going home first.
 *
 * Regions and stripes are fetched on first open, not shipped with every page:
 * the header renders on all ~100 routes and most visits never open search.
 *
 * Combobox pattern inside a modal dialog: ↑/↓ moves, Enter opens, Esc closes
 * and returns focus to whatever opened it.
 */
export default function CommandSearch() {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [regions, setRegions] = useState<Region[] | null>(null);
  const [stripes, setStripes] = useState<Map<string, StripeSeries>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const show = useCallback(() => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    returnFocus.current?.focus?.();
  }, []);

  // Global shortcuts + the open event.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        show();
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        show();
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, show);
    };
  }, [show]);

  // Lazy data load on first open.
  useEffect(() => {
    if (!open || regions) return;
    api.allRegions().then(setRegions).catch(() => setRegions([]));
    api
      .stripes()
      .then((s) => setStripes(new Map(s.results.map((r) => [r.slug, r]))))
      .catch(() => {});
  }, [open, regions]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => setActive(0), [q]);

  const matches = useMemo(() => {
    if (!regions) return [];
    const loaded = regions.filter((r) => r.has_data);
    const query = q.trim().toLowerCase();
    if (!query) {
      return SUGGESTED.map((s) => loaded.find((r) => r.slug === s)).filter(
        (r): r is Region => Boolean(r),
      );
    }
    // Name matches first (prefix before substring), then province matches.
    const score = (r: Region) => {
      const n = r.name.toLowerCase();
      if (n.startsWith(query)) return 0;
      if (n.includes(query)) return 1;
      if (r.province.toLowerCase().includes(query)) return 2;
      return 9;
    };
    return loaded
      .map((r) => [r, score(r)] as const)
      .filter(([, s]) => s < 9)
      .sort((a, b) => a[1] - b[1] || a[0].name.localeCompare(b[0].name))
      .slice(0, 8)
      .map(([r]) => r);
  }, [regions, q]);

  function go(slug: string) {
    setOpen(false);
    setQ("");
    router.push(`/city/${slug}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown" && matches.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp" && matches.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = matches[active];
      if (pick) go(pick.slug);
    } else if (e.key === "Tab") {
      // The input is the only focusable element that matters here; keep
      // focus inside the dialog rather than tabbing into the page behind.
      e.preventDefault();
    }
  }

  if (!open) return null;

  const resultCount = q.trim()
    ? t(
        `${matches.length} ${matches.length === 1 ? "city" : "cities"} found.`,
        `${matches.length} kota ditemukan.`,
      )
    : "";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-canvas-deep/70 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Search cities", "Cari kota")}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border-strong bg-surface-raised shadow-float"
      >
        <LiveAnnouncement message={resultCount} />
        <div className="flex items-center gap-3 border-b border-border px-4">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="shrink-0 text-text-muted"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("City or province…", "Kota atau provinsi…")}
            aria-label={t("Search for a city", "Cari kota")}
            role="combobox"
            aria-expanded={matches.length > 0}
            aria-controls="cmd-search-list"
            aria-autocomplete="list"
            aria-activedescendant={matches.length ? `cmd-opt-${active}` : undefined}
            className="h-14 w-full bg-transparent text-base text-text-primary outline-none placeholder:text-text-muted"
          />
          <button
            type="button"
            onClick={close}
            className="font-numeric shrink-0 rounded-md border border-border-strong px-1.5 py-0.5 text-2xs text-text-muted hover:text-text-primary"
          >
            Esc
          </button>
        </div>

        {regions === null ? (
          <p className="px-4 py-6 text-sm text-text-muted">
            <L en="Loading cities…" id="Memuat daftar kota…" />
          </p>
        ) : matches.length === 0 ? (
          <p className="px-4 py-6 text-sm text-text-muted">
            <L
              en="No loaded city matches that. Try a province name."
              id="Tidak ada kota yang cocok. Coba nama provinsi."
            />
          </p>
        ) : (
          <>
            {!q.trim() && (
              <p className="eyebrow px-4 pb-1 pt-3">
                <L en="Popular" id="Populer" />
              </p>
            )}
            <ul id="cmd-search-list" role="listbox" className="max-h-[55vh] overflow-y-auto p-1.5">
              {matches.map((r, i) => {
                const s = stripes.get(r.slug);
                return (
                  <li key={r.slug} role="presentation">
                    <button
                      id={`cmd-opt-${i}`}
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(r.slug)}
                      className={`grid w-full grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-4 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        i === active ? "bg-surface" : ""
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-text-primary">
                          {r.name}
                        </span>
                        <span className="block truncate text-2xs text-text-muted">
                          {r.province}
                        </span>
                      </span>
                      {s ? (
                        <Stripes anomalies={s.anomalies} className="h-5 w-full" />
                      ) : (
                        <span />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-2xs text-text-muted">
          <span>
            <L
              en="Stripes: each year's daily high vs 1951–1980"
              id="Garis: suhu siang tiap tahun vs 1951–1980"
            />
          </span>
          <span className="hidden font-numeric sm:inline">↑↓ ↵</span>
        </div>
      </div>
    </div>
  );
}
