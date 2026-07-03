import type { ENSOEvent } from "@/lib/types";

const LABEL: Record<ENSOEvent["phase"], string> = {
  EL_NINO: "El Niño",
  LA_NINA: "La Niña",
  NEUTRAL: "Neutral",
};

export default function ENSOBadge({ phase, strength }: { phase: ENSOEvent["phase"]; strength?: string }) {
  if (phase === "NEUTRAL") return null;
  const color = phase === "EL_NINO" ? "var(--enso-nino)" : "var(--enso-nina)";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {LABEL[phase]}
      {strength && strength !== "NONE" ? ` · ${strength.toLowerCase().replace("_", " ")}` : ""}
    </span>
  );
}
