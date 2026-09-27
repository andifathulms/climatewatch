import { L } from "@/lib/i18n";
import Link from "next/link";
import * as d3 from "d3";
import { RAMPS } from "@/components/fingerprint/color-scale";

// Sampled from the real precipitation ramp (DESIGN.md §8: this row used to
// be 8 hardcoded hexes with no relationship to the actual fingerprint
// colours) rather than a second, independent set of literals to keep in
// sync by hand. Two gaps in the middle read as "missing," which is the
// entire joke — a fingerprint row with a hole in it, on the page that is
// itself a hole in the site.
const swatchRamp = d3.interpolateRgbBasis(RAMPS.precipitation);
const ROW_SWATCHES: (string | null)[] = [0, 0.2, 0.4, null, null, 0.75, 0.55, 0.3].map(
  (t) => (t === null ? null : swatchRamp(t)),
);

export default function NotFound() {
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center text-center">

      <div className="relative">
        {/* A fingerprint row with a gap where the page should be. */}
        <div aria-hidden className="mb-10 flex justify-center gap-1.5">
          {ROW_SWATCHES.map((c, i) => (
            <span
              key={i}
              className="h-6 w-6 rounded-[3px]"
              style={{
                background: c ?? "var(--null-cell)",
                outline: c ? "none" : "1px dashed var(--border-strong)",
                outlineOffset: "-1px",
              }}
            />
          ))}
        </div>

        <p className="eyebrow">
          <L en="Error 404 · no data" id="Galat 404 · tidak ada data" />
        </p>
        <h1 className="mt-4 text-hero font-semibold">
          <L en="Nothing recorded here" id="Tidak ada catatan di sini" />
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-text-secondary">
          <L
            en="That city or page doesn't exist yet. Press ⌘K to search for an Indonesian city."
            id="Kota atau halaman itu belum ada. Tekan ⌘K untuk mencari kota di Indonesia."
          />
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary px-5 py-2.5 text-sm">
            <L en="Back to home" id="Kembali ke beranda" />
          </Link>
          <Link href="/compare" className="btn-ghost px-5 py-2.5 text-sm">
            <L en="Compare cities" id="Bandingkan kota" />
          </Link>
        </div>
      </div>
    </div>
  );
}
