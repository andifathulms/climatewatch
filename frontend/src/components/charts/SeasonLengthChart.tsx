"use client";

import { linearRegression } from "simple-statistics";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeasonResponse } from "@/lib/types";
import {
  AXIS,
  CHART_MARGIN,
  CURSOR,
  ChartHeader,
  type HeadingLevel,
  ChartTooltip,
  LegendKey,
  GRID,
} from "./chart-ui";
import SeasonRuleNote from "./SeasonRuleNote";

/**
 * How long the wet season lasted, per season.
 *
 * Onset alone answers "when"; every practical consequence — planting windows,
 * reservoir filling, how long a household budgets for — depends on "how long".
 * Both endpoints have been computed and stored since the first bootstrap and
 * neither the length nor the end date was ever rendered anywhere.
 *
 * The backend pairs onset[Y] with end[Y+1], because a season that starts in
 * October ends the following April. Seasons missing either endpoint are
 * dropped upstream rather than interpolated.
 */
export default function SeasonLengthChart({
  data,
  headingLevel = "h2",
}: {
  data: SeasonResponse;
  headingLevel?: HeadingLevel;
}) {
  const points = data.lengths ?? [];

  const reg =
    points.length > 1
      ? linearRegression(
          points.map((p) => [p.year, p.length_days] as [number, number]),
        )
      : null;

  const chartData = points.map((p) => ({
    year: p.year,
    length: p.length_days,
    trend: reg ? reg.m * p.year + reg.b : null,
  }));

  const perDecade = reg ? reg.m * 10 : null;
  const meanLength =
    points.length > 0
      ? points.reduce((a, p) => a + p.length_days, 0) / points.length
      : null;

  // A city with no dry season has no season length either. Say so instead of
  // drawing a trend through an artifact of where the onset scan starts.
  if (data.onset_saturated) {
    return (
      <section className="card p-6">
        <ChartHeader level={headingLevel} eyebrow="Seasonality" title="Wet season length" />
        <p className="max-w-prose text-sm leading-relaxed text-text-secondary">
          {data.region.name} has no detectable dry season by our rule — rain
          heavy enough to start a wet season falls here in almost every week of
          the year, so the onset date just reflects where the search begins (Aug
          1) rather than a real seasonal turn. Season length is not meaningful
          here and is not plotted.
        </p>
        <SeasonRuleNote saturatedShare={data.onset_saturated_share} />
      </section>
    );
  }

  if (points.length < 2) {
    return null;
  }

  return (
    <section className="card p-6">
      <ChartHeader level={headingLevel} eyebrow="Seasonality" title="Wet season length" />

      <p className="mb-5 max-w-prose text-sm leading-relaxed text-text-secondary">
        Days from onset to the end of the same wet season.
        {meanLength !== null && (
          <>
            {" "}
            {data.region.name} averages{" "}
            <span className="font-numeric font-medium text-text-primary">
              {Math.round(meanLength)} days
            </span>
            .
          </>
        )}
        {perDecade !== null && Math.abs(perDecade) >= 0.5 && (
          <>
            {" "}
            The season is getting{" "}
            <span className="font-numeric font-medium text-text-primary">
              {Math.abs(perDecade).toFixed(1)} days{" "}
              {perDecade > 0 ? "longer" : "shorter"}
            </span>{" "}
            each decade.
          </>
        )}
      </p>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={CHART_MARGIN}>
          <CartesianGrid {...GRID} />
          <XAxis
            dataKey="year"
            type="number"
            domain={["dataMin", "dataMax"]}
            minTickGap={28}
            {...AXIS}
          />
          <YAxis
            dataKey="length"
            domain={["dataMin - 15", "dataMax + 15"]}
            width={44}
            unit="d"
            {...AXIS}
          />
          <Tooltip
            cursor={CURSOR}
            content={
              <ChartTooltip
                format={(e) => {
                  if (typeof e.value !== "number") return null;
                  return e.dataKey === "trend"
                    ? { name: "Trend", value: `${Math.round(e.value)} days` }
                    : { name: "Length", value: `${e.value} days` };
                }}
              />
            }
          />
          <Scatter
            dataKey="length"
            fill="var(--enso-nina)"
            shape={(props: { cx?: number; cy?: number }) => (
              <circle
                cx={props.cx}
                cy={props.cy}
                r={4}
                fill="var(--enso-nina)"
                stroke="var(--surface)"
                strokeWidth={1.5}
              />
            )}
            name="Length"
          />
          {reg && (
            <Line
              type="linear"
              dataKey="trend"
              stroke="var(--drought-amber)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={false}
              name="Trend"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <LegendKey
        items={[
          { label: "Wet season length", color: "var(--enso-nina)" },
          {
            label: "Linear trend",
            color: "var(--drought-amber)",
            dashed: true,
          },
        ]}
      />
      <SeasonRuleNote />
    </section>
  );
}
