"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { L } from "@/lib/i18n";
import { useT } from "@/lib/use-lang";
import { openSearch } from "./CommandSearch";
import { isActive } from "./nav";

const ICON = {
  home: <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4-4" />
    </>
  ),
  rank: <path d="M5 20v-8M12 20V5M19 20v-5" />,
  compare: <path d="M4 7h12m-3-3 3 3-3 3M20 17H8m3-3-3 3 3 3" />,
  stories: <path d="M5 4h10l4 4v12H5zM15 4v4h4M8 12h8M8 16h6" />,
};

/**
 * Thumb-reach navigation on phones, replacing the header links that could
 * not fit a 360px row. Hidden from `lg` up, where the header carries them.
 * The page gets bottom padding for it in the root layout.
 */
export default function MobileTabBar() {
  const pathname = usePathname();
  const t = useT();
  const items = [
    { href: "/", en: "Explore", id: "Jelajah", icon: ICON.home },
    { href: "#search", en: "Search", id: "Cari", icon: ICON.search },
    { href: "/rankings", en: "Rankings", id: "Peringkat", icon: ICON.rank },
    { href: "/compare", en: "Compare", id: "Bandingkan", icon: ICON.compare },
    { href: "/stories", en: "Stories", id: "Cerita", icon: ICON.stories },
  ];
  return (
    <nav
      aria-label={t("Sections", "Bagian")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-canvas-deep/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((it) => {
          const active = it.href !== "#search" && isActive(pathname, it.href);
          const inner = (
            <>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {it.icon}
              </svg>
              <span className="text-2xs leading-none">
                <L en={it.en} id={it.id} />
              </span>
            </>
          );
          const cls = `flex w-full flex-col items-center gap-1 py-2.5 transition-colors ${
            active ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
          }`;
          return (
            <li key={it.href}>
              {it.href === "#search" ? (
                <button type="button" onClick={openSearch} className={cls}>
                  {inner}
                </button>
              ) : (
                <Link href={it.href} aria-current={active ? "page" : undefined} className={cls}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
