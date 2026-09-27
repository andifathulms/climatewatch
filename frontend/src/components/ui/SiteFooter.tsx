import Link from "next/link";
import { L } from "@/lib/i18n";
import DataAttribution from "./DataAttribution";
import MakerSignature from "./MakerSignature";
import { NAV } from "./nav";

/**
 * Global footer. It hosts DataAttribution so the CC BY 4.0 credit is present on
 * every page *structurally* — rendered once by the root layout rather than
 * re-added by hand on each new page, where it was one forgotten import away
 * from a licensing violation.
 */
export default function SiteFooter() {
  const linkCls = "text-text-secondary transition-colors hover:text-text-primary";
  return (
    <footer className="mt-auto border-t border-border bg-canvas-deep">
      <div className="mx-auto max-w-shell px-5 py-12 sm:px-8">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div className="max-w-xs">
            <div className="font-display text-lg font-semibold">ClimateWatch</div>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              <L
                en="Indonesian climate since 1950, one picture per city."
                id="Iklim Indonesia sejak 1950, satu gambar untuk tiap kota."
              />
            </p>
          </div>

          {/* Labelled with <p> + aria-labelledby rather than <h2>: these name
              nav lists, not document sections, and as headings they polluted
              every page's outline. */}
          <nav aria-label="Footer" className="flex gap-12 text-sm sm:gap-16">
            <div>
              <p id="footer-explore" className="eyebrow mb-3">
                <L en="Explore" id="Jelajah" />
              </p>
              <ul aria-labelledby="footer-explore" className="space-y-2">
                {NAV.slice(0, 4).map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className={linkCls}>
                      <L en={n.en} id={n.id} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p id="footer-data" className="eyebrow mb-3">
                Data
              </p>
              <ul aria-labelledby="footer-data" className="space-y-2">
                <li>
                  <Link href="/about" className={linkCls}>
                    <L en="About the data" id="Tentang data" />
                  </Link>
                </li>
                <li>
                  <a
                    href="https://open-meteo.com"
                    className={linkCls}
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

        <div className="mt-10 flex flex-col gap-6 border-t border-border pt-6 md:flex-row md:items-start md:justify-between">
          <DataAttribution />
          <MakerSignature />
        </div>
      </div>
    </footer>
  );
}
