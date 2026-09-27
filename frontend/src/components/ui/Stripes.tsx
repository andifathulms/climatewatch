import { stripeColor } from "@/components/fingerprint/color-scale";

/**
 * Warming stripes — ClimateWatch's signature mark.
 *
 * One vertical band per year, coloured by that year's departure of the
 * average daily high from the city's own 1951–1980 mean, on the diverging
 * anomaly ramp (blue = cooler, orange = hotter). A fixed ±2 °C domain on
 * every city, so two stripes placed side by side are directly comparable.
 *
 * Plain SVG with no client code, so it renders into the static HTML at every
 * size it is used: logo, card art, city identity bar, ranking rows, share
 * cards. `preserveAspectRatio="none"` lets one drawing stretch to any box.
 *
 * Decorative by default (aria-hidden). Pass `label` where the stripes are
 * the content rather than an ornament, and it becomes a single labelled
 * image; the numbers themselves are always available elsewhere on the page.
 */
export default function Stripes({
  anomalies,
  label,
  className = "",
  rounded = true,
}: {
  anomalies: (number | null)[];
  label?: string;
  className?: string;
  rounded?: boolean;
}) {
  const n = anomalies.length;
  if (n === 0) return null;
  return (
    <svg
      viewBox={`0 0 ${n} 1`}
      preserveAspectRatio="none"
      className={`block ${rounded ? "rounded-[3px]" : ""} ${className}`}
      shapeRendering="crispEdges"
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
    >
      {anomalies.map((a, i) => (
        <rect
          key={i}
          x={i}
          y={0}
          // A hair of overlap so no anti-aliased seam shows between bands.
          width={1.04}
          height={1}
          fill={a === null ? "var(--null-cell)" : stripeColor(a)}
        />
      ))}
    </svg>
  );
}
