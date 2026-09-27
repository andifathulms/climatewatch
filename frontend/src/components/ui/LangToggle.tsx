"use client";

import { setLang, useLang } from "@/lib/use-lang";
import type { Lang } from "@/lib/i18n";

/** ID / EN switch. Indonesian is the default (see lib/i18n.tsx). */
export default function LangToggle({ className = "" }: { className?: string }) {
  const lang = useLang();
  const opts: { key: Lang; label: string; name: string }[] = [
    { key: "id", label: "ID", name: "Bahasa Indonesia" },
    { key: "en", label: "EN", name: "English" },
  ];
  return (
    <div
      role="group"
      aria-label="Bahasa / Language"
      className={`font-numeric inline-flex shrink-0 overflow-hidden rounded-full border border-border-strong text-2xs ${className}`}
    >
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          lang={o.key}
          aria-pressed={lang === o.key}
          aria-label={o.name}
          onClick={() => setLang(o.key)}
          className={`px-2.5 py-1 font-medium transition-colors ${
            lang === o.key
              ? "bg-text-primary text-canvas"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
