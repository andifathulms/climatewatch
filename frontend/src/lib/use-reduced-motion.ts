"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Whether the user has asked for reduced motion.
 *
 * The global `@media (prefers-reduced-motion: reduce)` block in tokens.css
 * zeroes CSS animation and transition durations, which covers everything the
 * stylesheet drives. It cannot touch Recharts, which animates in JavaScript —
 * so every chart on the site kept animating on mount regardless of the
 * setting. This hook closes that gap.
 *
 * useSyncExternalStore rather than useState + useEffect: the effect version
 * reports "no preference" on the first client render, which is the exact
 * render the mount animation starts on, so the animation would play once
 * before being switched off — precisely what the user asked to avoid. The
 * server snapshot returns true (assume reduced) so prerendered HTML never
 * commits to motion it might have to retract.
 */
function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
}
