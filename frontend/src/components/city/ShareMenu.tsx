"use client";

import { useEffect, useRef, useState } from "react";
import { L } from "@/lib/i18n";
import { useT } from "@/lib/use-lang";
import { BASE_PATH } from "@/lib/data-mode";

/**
 * Share a city's page. Copy link keeps the current layers/baseline in the
 * URL, so the recipient sees exactly the view that was shared. Two ready-made
 * images, generated at build time from this city's data: a 4:5 card for
 * Instagram/TikTok/WhatsApp status and the 1200×630 link card.
 */
export default function ShareMenu({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t("Copy this link", "Salin tautan ini"), window.location.href);
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url: window.location.href });
    } catch {
      /* dismissed */
    }
  }

  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = encodeURIComponent(`${title} ${url}`);
  const item =
    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="btn-ghost px-4 py-2 text-sm"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
        </svg>
        <L en="Share" id="Bagikan" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-border-strong bg-surface-raised p-1.5 shadow-float">
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button type="button" className={item} onClick={nativeShare}>
              <L en="Share…" id="Bagikan…" />
            </button>
          )}
          <button type="button" className={item} onClick={copy}>
            {copied ? <L en="Link copied ✓" id="Tautan disalin ✓" /> : <L en="Copy link to this view" id="Salin tautan tampilan ini" />}
          </button>
          <a className={item} href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer">
            WhatsApp ↗
          </a>
          <a className={item} href={`https://twitter.com/intent/tweet?text=${text}`} target="_blank" rel="noopener noreferrer">
            X / Twitter ↗
          </a>
          <div className="my-1 border-t border-border" />
          <a className={item} href={`${BASE_PATH}/og/story/${slug}.png`} download={`climatewatch-${slug}.png`}>
            <L en="Save image (4:5, for stories)" id="Simpan gambar (4:5, untuk story)" />
          </a>
          <a className={item} href={`${BASE_PATH}/og/${slug}.png`} download={`climatewatch-${slug}-card.png`}>
            <L en="Save link card (1200×630)" id="Simpan kartu tautan (1200×630)" />
          </a>
        </div>
      )}
    </div>
  );
}
