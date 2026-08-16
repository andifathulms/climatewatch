"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Root error boundary — DESIGN.md §8/§10 step 9: "ClimateWatch has none
 * anywhere." Catches a render error anywhere below the root layout and shows
 * a page instead of Next's default unstyled fallback. Must be a Client
 * Component (Next's own requirement for error.tsx) and cannot import
 * anything that only runs on the server.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No analytics/logging pipeline exists on this static export to send
    // this to — console is the honest floor, not a placeholder for one.
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="canvas-aurora opacity-50" aria-hidden />
      <div className="relative">
        <p className="eyebrow">Error · something broke</p>
        <h1 className="mt-4 text-hero font-semibold">
          This page hit a snag
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-text-secondary">
          Not missing data this time — something in the page itself failed to
          render. Reloading usually clears it.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="btn-primary px-5 py-2.5 text-sm"
          >
            Try again
          </button>
          <Link href="/" className="btn-ghost px-5 py-2.5 text-sm">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
