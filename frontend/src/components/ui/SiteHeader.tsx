"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/compare", label: "Compare" },
  { href: "/about", label: "Method" },
];

/** Sticky, translucent app header with an active-route indicator. */
export default function SiteHeader() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-canvas/80 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/60">
      <div className="mx-auto flex max-w-shell items-center justify-between gap-6 px-5 py-3.5 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          aria-label="Iklim — home"
        >
          {/* Mark: a four-cell fingerprint swatch, the product in miniature. */}
          <span
            aria-hidden
            className="grid grid-cols-2 gap-[2px] rounded-[5px] p-[3px] ring-1 ring-border-strong transition group-hover:ring-rain-blue"
          >
            <span className="h-[7px] w-[7px] rounded-[1.5px] bg-rain-blue" />
            <span className="h-[7px] w-[7px] rounded-[1.5px] bg-rain-light/60" />
            <span className="h-[7px] w-[7px] rounded-[1.5px] bg-heat-light/50" />
            <span className="h-[7px] w-[7px] rounded-[1.5px] bg-heat-orange" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            Iklim
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-full px-3.5 py-1.5 transition-colors duration-150 ${
                  active
                    ? "text-text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {active && (
                  <span className="absolute inset-0 rounded-full bg-surface-muted ring-1 ring-border" />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
