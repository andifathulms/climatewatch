import type { ENSOEvent } from "@/lib/types";

const LABEL: Record<ENSOEvent["phase"], string> = {
  EL_NINO: "El Niño",
  LA_NINA: "La Niña",
  NEUTRAL: "Neutral",
};

/**
 * El Niño / La Niña pill.
 *
 * Tinted-on-dark rather than white-on-solid: white text over the enso fills
 * lands near 3:1, which fails WCAG for label-sized text. The colored text on a
 * dark tint clears 4.5:1, and a dot keeps the phase from resting on hue alone.
 */
export default function ENSOBadge({
  phase,
  strength,
}: {
  phase: ENSOEvent["phase"];
  strength?: string;
}) {
  if (phase === "NEUTRAL") return null;
  const color = phase === "EL_NINO" ? "var(--enso-nino)" : "var(--enso-nina)";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      {LABEL[phase]}
      {strength && strength !== "NONE"
        ? ` · ${strength.toLowerCase().replace("_", " ")}`
        : ""}
    </span>
  );
}
