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
      <div className="canvas-aurora opacity-50" aria-hidden />

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

        <p className="eyebrow">Error 404 · no data</p>
        <h1 className="mt-4 text-hero font-semibold">Nothing recorded here</h1>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-text-secondary">
          That city or page doesn&apos;t exist yet. Try searching for an
          Indonesian city from the homepage.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary px-5 py-2.5 text-sm">
            Back to home
          </Link>
          <Link href="/compare" className="btn-ghost px-5 py-2.5 text-sm">
            Compare cities
          </Link>
        </div>
      </div>
    </div>
  );
}
