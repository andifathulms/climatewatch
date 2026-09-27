import type { ReactNode } from "react";

/**
 * Two languages, one static export.
 *
 * Bahasa Indonesia is the default; English is one tap away. The site is a
 * static export with most text in server components, so the language cannot
 * be a server-side decision. Instead every translated string renders BOTH
 * variants, each tagged with `data-l` and its own `lang`, and one CSS rule
 * (globals.css) hides whichever does not match `<html data-lang>`. An inline
 * script in the root layout sets that attribute from localStorage before
 * first paint, so a returning English reader never sees a flash of Indonesian.
 *
 * Why not route-per-locale (/en/...): it doubles every generated page and
 * every share URL, and a shared link would carry the sharer's language
 * instead of the reader's. One URL per finding matters more here.
 *
 * `display:none` also removes the hidden variant from the accessibility tree,
 * so a screen reader reads one language, pronounced correctly via `lang`.
 *
 * Use `<L>` for text nodes (works in server and client components). Use
 * `useT()` (./use-lang) only where a node cannot hold markup: attributes (aria-label,
 * placeholder, title), `<option>` labels, SVG/canvas text.
 */

export type Lang = "id" | "en";
export const DEFAULT_LANG: Lang = "id";
export const LANG_STORAGE_KEY = "cw-lang";
export const LANG_EVENT = "cw:lang";

/** Both variants, CSS picks one. */
export function L({ en, id }: { en: ReactNode; id: ReactNode }) {
  return (
    <>
      <span lang="id" data-l="id">
        {id}
      </span>
      <span lang="en" data-l="en">
        {en}
      </span>
    </>
  );
}

/** Decimal number in the reader's convention: 29,3 (id) / 29.3 (en). */
export function formatNumber(
  value: number,
  lang: Lang,
  digits = 1,
  signed = false,
): string {
  const abs = Math.abs(value).toLocaleString(lang === "id" ? "id-ID" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  if (!signed) return value < 0 ? `−${abs}` : abs;
  // A rounded zero carries no direction — "+0,0" would claim one.
  if (Number(Math.abs(value).toFixed(digits)) === 0) return abs;
  return `${value < 0 ? "−" : "+"}${abs}`;
}

/** A number rendered in both conventions. `unit` is appended verbatim. */
export function N({
  value,
  digits = 1,
  unit = "",
  signed = false,
}: {
  value: number | null | undefined;
  digits?: number;
  unit?: string;
  signed?: boolean;
}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <>—</>;
  }
  return (
    <L
      id={`${formatNumber(value, "id", digits, signed)}${unit}`}
      en={`${formatNumber(value, "en", digits, signed)}${unit}`}
    />
  );
}

/** Runs before paint (inlined in <head>). Kept tiny and dependency-free. */
export const LANG_BOOT_SCRIPT = `try{var l=localStorage.getItem("${LANG_STORAGE_KEY}");if(l==="en"||l==="id"){document.documentElement.dataset.lang=l;document.documentElement.lang=l}}catch(e){}`;

export const MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
export const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
export const MONTHS_LONG_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
export const MONTHS_LONG_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
