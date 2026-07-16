import Link from "next/link";
import DataAttribution from "./DataAttribution";

/**
 * Global footer. It hosts DataAttribution so the CC BY 4.0 credit is present on
 * every page *structurally* — rendered once by the root layout rather than
 * re-added by hand on each new page, where it was one forgotten import away
 * from a licensing violation.
 */
export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-canvas-deep">
      <div className="mx-auto max-w-shell px-5 py-12 sm:px-8">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div className="max-w-xs">
            <div className="font-display text-lg font-semibold">Iklim</div>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Seventy-five years of Indonesian climate, made legible.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="flex gap-12 text-sm sm:gap-16"
          >
            <div>
              <h2 className="eyebrow mb-3">Explore</h2>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/"
                    className="text-text-secondary transition-colors hover:text-text-primary"
                  >
                    Cities
                  </Link>
                </li>
                <li>
                  <Link
                    href="/compare"
                    className="text-text-secondary transition-colors hover:text-text-primary"
                  >
                    Compare
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="eyebrow mb-3">Data</h2>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/about"
                    className="text-text-secondary transition-colors hover:text-text-primary"
                  >
                    Methodology
                  </Link>
                </li>
                <li>
                  <a
                    href="https://open-meteo.com"
                    className="text-text-secondary transition-colors hover:text-text-primary"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Open-Meteo ↗
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <DataAttribution />
      </div>
    </footer>
  );
}
