import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="canvas-aurora opacity-50" aria-hidden />

      <div className="relative">
        {/* A fingerprint row with a gap where the page should be. */}
        <div aria-hidden className="mb-10 flex justify-center gap-1.5">
          {[
            "#1D4E7A",
            "#2B7CB8",
            "#57A8DE",
            null,
            null,
            "#9BD0F0",
            "#57A8DE",
            "#2B7CB8",
          ].map((c, i) => (
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
