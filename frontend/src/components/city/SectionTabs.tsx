"use client";

import { useEffect, useState } from "react";
import { L } from "@/lib/i18n";

const SECTIONS = [
  { id: "fingerprint", en: "Fingerprint", idn: "Sidik iklim" },
  { id: "lifetime", en: "Your lifetime", idn: "Seumur hidupmu" },
  { id: "future", en: "Looking ahead", idn: "Ke depan" },
  { id: "week", en: "This week", idn: "Minggu ini" },
  { id: "how", en: "How to read it", idn: "Cara membaca" },
  { id: "nearby", en: "Nearby cities", idn: "Kota terdekat" },
];

/**
 * In-page section nav, sticky under the site header. Highlights the section
 * currently in view so a reader always knows where they are on a long page.
 */
export default function SectionTabs() {
  const [active, setActive] = useState("fingerprint");

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (e): e is HTMLElement => e !== null,
    );
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-140px 0px -55% 0px" },
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, []);

  return (
    <nav
      aria-label="Sections"
      className="sticky top-[57px] z-30 -mx-5 border-b border-border bg-canvas/90 px-5 backdrop-blur-xl sm:-mx-8 sm:px-8"
    >
      <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "location" : undefined}
              className={`block whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors ${
                active === s.id
                  ? "border-heat-light text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              <L en={s.en} id={s.idn} />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
