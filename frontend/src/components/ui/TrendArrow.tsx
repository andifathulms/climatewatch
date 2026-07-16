import { fmt } from "@/lib/format";

/**
 * ↑ / ↓ arrow with a magnitude, colored by direction.
 * The arrow glyph is the point: direction never rests on color alone.
 */
export default function TrendArrow({
  direction,
  magnitude,
  unit = "",
  invertColor = false,
}: {
  direction: "up" | "down" | "flat";
  magnitude: number;
  unit?: string;
  invertColor?: boolean;
}) {
  if (direction === "flat") {
    return (
      <span className="inline-flex items-center gap-1.5 text-text-muted">
        <span aria-hidden>→</span>
        no clear trend
      </span>
    );
  }

  const isUp = direction === "up";
  // For "hot days" up is bad (heat-orange); for wet-season a neutral read.
  const bad = invertColor ? !isUp : isUp;
  const color = bad ? "var(--heat-orange)" : "var(--rain-blue)";

  return (
    <span
      className="font-numeric inline-flex items-center gap-1 font-medium tabular-nums"
      style={{ color }}
    >
      <span aria-hidden className="text-[0.9em]">
        {isUp ? "↑" : "↓"}
      </span>
      <span className="sr-only">{isUp ? "up" : "down"} </span>
      {fmt(magnitude, unit)}
    </span>
  );
}
