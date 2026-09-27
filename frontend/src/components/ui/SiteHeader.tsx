"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { L } from "@/lib/i18n";
import { useT } from "@/lib/use-lang";
import StripeMark from "./StripeMark";
import LangToggle from "./LangToggle";
import CommandSearch, { openSearch } from "./CommandSearch";
import { NAV, isActive } from "./nav";

/**
 * Sticky header: stripe logo, sections, search (⌘K) and the language switch.
 * On phones the section links move to the bottom tab bar (MobileTabBar); the
 * header keeps only the logo, search and language.
 */
export default function SiteHeader({ national }: { national: number[] }) {
  const pathname = usePathname();
  const t = useT();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-canvas/85 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/70">
      <div className="mx-auto flex max-w-shell items-center gap-3 px-4 py-3 sm:gap-5 sm:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label="ClimateWatch — home"
        >
          <StripeMark
            national={national}
            size={28}
            className="ring-1 ring-border-strong transition group-hover:ring-text-muted"
          />
          <span className="font-display text-xl font-semibold tracking-tight">
            ClimateWatch
          </span>
        </Link>

        <nav aria-label={t("Main", "Utama")} className="hidden items-center gap-0.5 text-sm lg:flex">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 transition-colors duration-150 ${
                  active
                    ? "bg-surface-raised text-text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <L en={item.en} id={item.id} />
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={openSearch}
          className="ml-auto flex min-w-0 items-center gap-2.5 rounded-full border border-border bg-surface-inset py-1.5 pl-3.5 pr-2 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text-secondary sm:w-60"
          aria-label={t("Search cities", "Cari kota")}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span className="hidden flex-1 truncate text-left sm:block">
            <L en="Search a city" id="Cari kota" />
          </span>
          <kbd className="font-numeric hidden rounded border border-border-strong px-1.5 text-2xs sm:block">
            ⌘K
          </kbd>
        </button>

        <LangToggle />
      </div>
      <CommandSearch />
    </header>
  );
}
