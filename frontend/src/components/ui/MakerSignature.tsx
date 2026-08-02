/**
 * Maker's mark — personal authorship credit, distinct from the CC BY 4.0 data
 * attribution (which credits Open-Meteo/ERA5, not the author).
 *
 * Self-contained on purpose: no imports beyond React, all identity in the LINKS
 * array below, so this file can be dropped into any project's footer unchanged.
 * To reuse elsewhere, copy this file and render <MakerSignature /> in the footer.
 */

const AUTHOR = "Andi Fathul Mukminin";
const PORTFOLIO = "https://andifathulms.github.io/en/";

const LINKS: { label: string; href: string; icon: JSX.Element }[] = [
  {
    label: "Portfolio",
    href: PORTFOLIO,
    icon: (
      // Globe
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
      </svg>
    ),
  },
  {
    label: "GitHub",
    href: "https://github.com/andifathulms",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.47c.52.1.71-.23.71-.5v-1.76c-2.89.63-3.5-1.39-3.5-1.39-.47-1.2-1.15-1.52-1.15-1.52-.94-.64.07-.63.07-.63 1.04.07 1.59 1.07 1.59 1.07.93 1.59 2.44 1.13 3.03.86.09-.67.36-1.13.65-1.39-2.3-.26-4.73-1.15-4.73-5.13 0-1.13.4-2.06 1.07-2.78-.11-.26-.46-1.31.1-2.73 0 0 .87-.28 2.85 1.06a9.9 9.9 0 0 1 5.19 0c1.98-1.34 2.85-1.06 2.85-1.06.56 1.42.21 2.47.1 2.73.67.72 1.07 1.65 1.07 2.78 0 3.99-2.43 4.86-4.75 5.12.37.32.7.95.7 1.92v2.85c0 .28.19.61.72.5A10.5 10.5 0 0 0 12 1.5Z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/andifathulmukminin/",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/andifathulms/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export default function MakerSignature() {
  const year = new Date().getFullYear();

  return (
    <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-text-muted">
        Designed &amp; built by{" "}
        <a
          href={PORTFOLIO}
          rel="noopener noreferrer"
          target="_blank"
          className="font-medium text-text-secondary underline decoration-border-strong underline-offset-2 transition-colors hover:text-text-primary hover:decoration-rain-blue"
        >
          {AUTHOR}
        </a>
        <span className="mx-1.5 text-border-strong">·</span>
        <span className="font-numeric">© {year}</span>
      </p>

      <nav aria-label="Author links" className="flex items-center gap-0.5">
        {LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            aria-label={l.label}
            title={l.label}
            rel="noopener noreferrer"
            target="_blank"
            className="rounded-md p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary"
          >
            <span className="block h-[18px] w-[18px]">{l.icon}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
