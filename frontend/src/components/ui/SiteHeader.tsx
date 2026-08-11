"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
// The ClimateWatch mark (same art as app/icon.png, the browser-tab favicon).
// A local copy — not app/icon.png — so importing it can't collide with Next's
// icon file-convention, and next/image resolves the basePath in static export.
import icon from "./brand-icon.png";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/rankings", label: "Rankings" },
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
      <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-4 py-3.5 sm:gap-6 sm:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label="ClimateWatch — home"
        >
          {/* The ClimateWatch app icon — same mark as the browser-tab favicon. */}
          <Image
            src={icon}
            alt=""
            aria-hidden
            width={28}
            height={28}
            className="rounded-[7px] ring-1 ring-border-strong transition group-hover:ring-rain-blue"
            priority
          />
          {/* Wordmark is hidden on the narrowest screens — "ClimateWatch" plus
              four nav items can't share one row at 360px, so the mark carries
              the brand there. */}
          <span className="hidden font-display text-xl font-semibold tracking-tight min-[420px]:inline">
            ClimateWatch
          </span>
        </Link>

        {/* overflow-x-auto is the safety net: if the labels ever exceed the row
            (long future item, 320px device), the nav scrolls inside the header
            instead of widening the page. */}
        <nav className="-mr-1 flex items-center gap-0.5 overflow-x-auto text-2xs [scrollbar-width:none] sm:mr-0 sm:gap-1 sm:text-sm [&::-webkit-scrollbar]:hidden">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors duration-150 sm:px-3.5 ${
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
