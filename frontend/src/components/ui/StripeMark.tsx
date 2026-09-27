import { stripeColor } from "@/components/fingerprint/color-scale";

/**
 * The ClimateWatch logo: the national warming stripes (median across every
 * loaded city) folded into a handful of bands, so the mark itself is data.
 * Bins are averaged, then amplified so the cool→warm arc survives
 * at 24px, where a faithful ±2 °C mapping would read as grey.
 */
const BINS = 12;
const GAIN = 3.5;

export default function StripeMark({
  national,
  size = 28,
  className = "",
}: {
  national: number[];
  size?: number;
  className?: string;
}) {
  const per = Math.max(1, Math.floor(national.length / BINS));
  const bands = Array.from({ length: BINS }, (_, i) => {
    const seg = national.slice(i * per, i === BINS - 1 ? undefined : (i + 1) * per);
    return seg.length ? seg.reduce((a, b) => a + b, 0) / seg.length : 0;
  });
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${BINS} ${BINS}`}
      className={`block shrink-0 overflow-hidden rounded-[7px] ${className}`}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {bands.map((v, i) => (
        <rect key={i} x={i} y={0} width={1.05} height={BINS} fill={stripeColor(v * GAIN)} />
      ))}
    </svg>
  );
}
