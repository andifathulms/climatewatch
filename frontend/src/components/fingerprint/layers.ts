/**
 * Fingerprint layer infrastructure — DESIGN.md §5.6 / §10 step 3.
 *
 * No layer draws anything yet (Baseline/Season/ENSO/Extremes land in steps
 * 4-7). This module is only the plumbing every one of them will share: the
 * key type, the URL encoding, and the cap enforcement — so each later step
 * is "register a layer," not "reinvent how layers toggle."
 */

export type FingerprintLayer = "baseline" | "season" | "enso" | "extremes";

/** Render/parse order — also the order layer notes append to the sr-only
 *  table, so a screen-reader user hears them in the same order the (future)
 *  toggle row shows them, regardless of the order they were switched on. */
export const LAYER_KEYS: readonly FingerprintLayer[] = [
  "baseline",
  "season",
  "enso",
  "extremes",
];

export const LAYER_LABEL: Record<FingerprintLayer, string> = {
  baseline: "Baseline",
  season: "Season",
  enso: "ENSO",
  extremes: "Extremes",
};

/** DESIGN.md §5.6: "Maximum three layers at once. Enforce it — the fourth
 *  toggle should visibly refuse rather than silently degrade the reading." */
export const MAX_LAYERS = 3;

/**
 * Sentence a layer contributes to the sr-only table's caption, keyed by
 * layer. Empty until steps 4-7 register one each (a null/undefined entry
 * contributes nothing, so a layer can land its visuals before it has
 * anything worth saying in the caption). The lookup itself — not any given
 * entry — is `§10 step 3`'s "sr-only table extension mechanism."
 */
export const LAYER_TABLE_NOTE: Partial<Record<FingerprintLayer, string>> = {};

function isLayerKey(value: string): value is FingerprintLayer {
  return (LAYER_KEYS as readonly string[]).includes(value);
}

/**
 * Parse `?layers=season,enso` into a validated set. Unknown tokens (a typo,
 * a future key an older build doesn't recognise yet) are dropped rather than
 * thrown on — a hand-edited or stale shared URL should degrade gracefully,
 * per the same rule the rest of this app applies to missing data. Anything
 * past the cap is dropped in the order it appeared, never silently expanded
 * past three on load just because the URL asked for four.
 */
export function parseLayersParam(raw: string | null | undefined): Set<FingerprintLayer> {
  const out = new Set<FingerprintLayer>();
  if (!raw) return out;
  for (const token of raw.split(",")) {
    const key = token.trim();
    if (!isLayerKey(key) || out.has(key)) continue;
    if (out.size >= MAX_LAYERS) break;
    out.add(key);
  }
  return out;
}

/** Inverse of `parseLayersParam`, in canonical `LAYER_KEYS` order so the URL
 *  a given layer set produces is stable regardless of toggle order. */
export function serializeLayersParam(layers: Set<FingerprintLayer>): string {
  return LAYER_KEYS.filter((k) => layers.has(k)).join(",");
}

/**
 * Add or remove `key`. Removing always succeeds. Adding past `MAX_LAYERS`
 * refuses and returns the *same* Set instance (not a copy with identical
 * contents) so a caller can tell a refusal from a real change with `===`
 * and, e.g., surface that refusal instead of quietly doing nothing.
 */
export function toggleLayer(
  layers: Set<FingerprintLayer>,
  key: FingerprintLayer,
): Set<FingerprintLayer> {
  if (layers.has(key)) {
    const next = new Set(layers);
    next.delete(key);
    return next;
  }
  if (layers.size >= MAX_LAYERS) return layers;
  const next = new Set(layers);
  next.add(key);
  return next;
}
