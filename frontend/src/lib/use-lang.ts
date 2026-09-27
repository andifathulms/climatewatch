"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_LANG,
  LANG_EVENT,
  LANG_STORAGE_KEY,
  type Lang,
} from "./i18n";

function readLang(): Lang {
  if (typeof document === "undefined") return DEFAULT_LANG;
  return document.documentElement.dataset.lang === "en" ? "en" : "id";
}

/** The active language, for strings that cannot be rendered with `<L>`.
 *  Server render and first client render both use the default so hydration
 *  matches; the real value lands one effect later. */
export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  useEffect(() => {
    const sync = () => setLang(readLang());
    sync();
    window.addEventListener(LANG_EVENT, sync);
    return () => window.removeEventListener(LANG_EVENT, sync);
  }, []);
  return lang;
}

/** `t(en, id)` → the active variant. English first, matching `<L en id>`. */
export function useT() {
  const lang = useLang();
  return function t<T>(en: T, id: T): T {
    return lang === "en" ? en : id;
  };
}

export function setLang(next: Lang) {
  const root = document.documentElement;
  root.dataset.lang = next;
  root.lang = next;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, next);
  } catch {
    /* private mode — the choice just won't persist */
  }
  window.dispatchEvent(new Event(LANG_EVENT));
}

