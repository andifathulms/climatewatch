"use client";

import { L } from "@/lib/i18n";
import { useEffect } from "react";
import Link from "next/link";

/**
 * City-page error boundary — DESIGN.md §8/§10 step 9. The city page renders
 * eight-plus data-dependent sections; this catches a render failure in any
 * of them without taking down the header/footer or the rest of the app.
 * Distinct copy from the root boundary because a reader landing here almost
 * always got here from a real city link, not a broken URL — "try again"
 * matters more here than "go home."
 */
export default function CityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="relative">
        <p className="eyebrow">
          <L en="Error · something broke" id="Galat · ada yang rusak" />
        </p>
        <h1 className="mt-4 text-title font-semibold">
          <L en="This city's page hit a snag" id="Halaman kota ini tersandung" />
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-text-secondary">
          <L
            en="The data itself is likely fine; something in rendering it failed. Reloading usually clears it."
            id="Datanya kemungkinan baik-baik saja; ada yang gagal saat ditampilkan. Memuat ulang biasanya menyelesaikannya."
          />
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="btn-primary px-5 py-2.5 text-sm"
          >
            <L en="Try again" id="Coba lagi" />
          </button>
          <Link href="/" className="btn-ghost px-5 py-2.5 text-sm">
            <L en="Back to home" id="Kembali ke beranda" />
          </Link>
        </div>
      </div>
    </div>
  );
}
