"use client";

import { useEffect, useMemo, useState } from "react";
import type { WorkedExampleResponse } from "@/lib/types";
import { MONTHS } from "@/lib/format";

/**
 * One real month, day by day, and every number derived from it.
 *
 * Every figure on this site is an aggregate of ~28,000 daily readings per
 * city, and until this component the app never showed one. The rawest thing on
 * any screen was a monthly mean, so the visible chain of evidence started a
 * full step after the evidence: a reader was asked to accept "2.1°C hotter"
 * without ever seeing a day, a month, or the act of aggregating.
 *
 * This is the worked example a newcomer can follow before touching anything —
 * here are the days, here is the rule, here is the count, and here is the one
 * fingerprint cell they add up to. It sits above the fingerprint on purpose:
 * learn to read one square before meeting 924 of them.
 *
 * The threshold is draggable because a rule you can move is a rule you
 * understand. Moving it recomputes *this month only* — the charts elsewhere
 * are built from the fixed threshold and do not change, which the component
 * says out loud rather than letting the reader assume otherwise.
 */

/** Round to one decimal without exposing float noise in the URL. */
const round1 = (n: number) => Math.round(n * 10) / 10;

export default function WorkedExample({
  data,
}: {
  data: WorkedExampleResponse;
}) {
  const official = data.rules.hot_day_threshold_c;
  const [threshold, setThreshold] = useState<number | null>(null);

  // URL state, per the project rule that anything the reader can change must
  // survive a refresh and be linkable.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("t");
    if (!raw) return;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 20 && n <= 40) setThreshold(round1(n));
  }, []);

  function apply(next: number) {
    const v = round1(next);
    setThreshold(v);
    const url = new URL(window.location.href);
    if (official !== null && v === round1(official)) {
      url.searchParams.delete("t");
    } else {
      url.searchParams.set("t", String(v));
    }
    window.history.replaceState(null, "", url);
  }

  const active = threshold ?? official;
  const moved = official !== null && active !== null && active !== round1(official);

  const temps = data.days
    .map((d) => d.temp_max)
    .filter((v): v is number => v !== null);
  const rains = data.days
    .map((d) => d.precipitation_mm)
    .filter((v): v is number => v !== null);

  const derived = useMemo(() => {
    const sum = rains.reduce((a, b) => a + b, 0);
    const mean = temps.length
      ? temps.reduce((a, b) => a + b, 0) / temps.length
      : null;
    const count =
      active === null ? null : temps.filter((t) => t > active).length;
    return { sum, mean, count };
  }, [rains, temps, active]);

  const hottest = temps.length ? Math.max(...temps) : 0;
  const coolest = temps.length ? Math.min(...temps) : 0;
  const span = Math.max(hottest - coolest, 1);
  const monthLabel = `${MONTHS[data.month - 1]} ${data.year}`;

  return (
    <section className="card p-6">
      <h3 className="eyebrow">Where the numbers come from</h3>
      <p className="mt-3 max-w-prose font-display text-title font-semibold text-text-primary">
        Every square in the grid below is one month. Here is one, day by day.
      </p>

      <p className="mt-4 max-w-prose leading-relaxed text-text-secondary">
        {monthLabel} in {data.region.name} — the most recent month with a
        reading for every single day. Each bar is one day&rsquo;s highest
        temperature; the number under it is that day&rsquo;s rainfall.
      </p>

      {/* ── The raw days ─────────────────────────────────────────────── */}
      <ol className="mt-6 flex flex-wrap gap-1">
        {data.days.map((d) => {
          const isHot =
            active !== null && d.temp_max !== null && d.temp_max > active;
          const height =
            d.temp_max === null
              ? 0
              : 16 + ((d.temp_max - coolest) / span) * 34;
          return (
            <li
              key={d.day}
              className="flex w-[calc((100%-7*0.25rem)/8)] flex-col items-center gap-1 sm:w-[calc((100%-15*0.25rem)/16)]"
            >
              <span className="font-numeric text-2xs text-text-muted">
                {d.day}
              </span>
              <span
                className="flex w-full items-end justify-center rounded-[3px]"
                style={{ height: 52 }}
              >
                <span
                  className="w-full rounded-[3px]"
                  style={{
                    height,
                    background: isHot
                      ? "var(--heat-orange)"
                      : "var(--surface-muted)",
                    outline: isHot ? "1px solid var(--heat-light)" : "none",
                  }}
                />
              </span>
              <span
                className={`font-numeric text-2xs ${
                  isHot ? "text-heat-light" : "text-text-muted"
                }`}
              >
                {d.temp_max === null ? "—" : d.temp_max.toFixed(0)}
              </span>
              <span className="font-numeric text-2xs text-rain-light">
                {d.precipitation_mm === null
                  ? "—"
                  : d.precipitation_mm.toFixed(0)}
              </span>
            </li>
          );
        })}
      </ol>

      {/* ── The rule, movable ────────────────────────────────────────── */}
      {official !== null && active !== null && (
        <div className="mt-7 rounded-lg border border-border bg-surface-inset p-4">
          <label
            htmlFor="worked-threshold"
            className="block text-sm text-text-secondary"
          >
            A &ldquo;hot day&rdquo; is any day above{" "}
            <span className="font-numeric font-medium text-heat-light">
              {active.toFixed(1)}°C
            </span>
            . Drag to see the rule change what it counts.
          </label>
          <input
            id="worked-threshold"
            type="range"
            min={Math.floor(coolest)}
            max={Math.ceil(hottest)}
            step={0.1}
            value={active}
            onChange={(e) => apply(Number(e.target.value))}
            className="mt-3 w-full accent-heat-orange"
          />
          <div className="font-numeric mt-1 flex justify-between text-2xs text-text-muted">
            <span>{Math.floor(coolest)}°C</span>
            <span>{Math.ceil(hottest)}°C</span>
          </div>

          <p className="mt-3 text-sm text-text-secondary">
            <span className="font-numeric font-medium text-text-primary">
              {derived.count}
            </span>{" "}
            of {temps.length} days in {monthLabel} qualify.
          </p>

          {moved && (
            <p className="mt-2 text-2xs leading-relaxed text-drought-amber">
              You have moved the rule off this city&rsquo;s real threshold of{" "}
              <span className="font-numeric">{official.toFixed(1)}°C</span>.
              This changes only the example above — every chart on this page is
              built from the fixed threshold and is unaffected.{" "}
              <button
                type="button"
                onClick={() => apply(official)}
                className="underline decoration-drought-amber/50 underline-offset-2 hover:decoration-drought-amber"
              >
                Put it back
              </button>
              .
            </p>
          )}
        </div>
      )}

      {/* ── What those days become ───────────────────────────────────── */}
      <p className="mt-7 max-w-prose leading-relaxed text-text-secondary">
        Those {data.days.length} days collapse into three numbers. That is the
        whole of what &ldquo;a month&rdquo; means on this site:
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface-inset p-4">
          <dt className="text-2xs uppercase tracking-wider text-text-muted">
            Add them up
          </dt>
          <dd className="font-numeric mt-1 text-2xl text-rain-light">
            {derived.sum.toFixed(1)} mm
          </dd>
          <dd className="mt-1.5 text-2xs leading-relaxed text-text-muted">
            Total rainfall. This is the value the Rainfall fingerprint paints
            for {monthLabel}.
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-surface-inset p-4">
          <dt className="text-2xs uppercase tracking-wider text-text-muted">
            Average them
          </dt>
          <dd className="font-numeric mt-1 text-2xl text-heat-light">
            {derived.mean === null ? "—" : `${derived.mean.toFixed(1)}°C`}
          </dd>
          <dd className="mt-1.5 text-2xs leading-relaxed text-text-muted">
            Mean daily high — not the hottest day, the typical one.
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-surface-inset p-4">
          <dt className="text-2xs uppercase tracking-wider text-text-muted">
            Count them
          </dt>
          <dd className="font-numeric mt-1 text-2xl text-text-primary">
            {derived.count ?? "—"} days
          </dd>
          <dd className="mt-1.5 text-2xs leading-relaxed text-text-muted">
            Days over the threshold. A count, so one very hot day counts the
            same as any other.
          </dd>
        </div>
      </dl>

      {/* ── Honesty about the join ───────────────────────────────────── */}
      {data.stored && (
        <p className="mt-5 max-w-prose border-t border-border pt-4 text-2xs leading-relaxed text-text-muted">
          Checked against the stored record: the grid below holds{" "}
          <span className="font-numeric text-text-secondary">
            {data.stored.total_precipitation?.toFixed(1) ?? "—"} mm
          </span>{" "}
          and{" "}
          <span className="font-numeric text-text-secondary">
            {data.stored.avg_temp_max?.toFixed(1) ?? "—"}°C
          </span>{" "}
          for {monthLabel}. Those are the same three operations on the same
          days, so they match what is shown above exactly — verified for all 90
          cities, not assumed. Multiply this by 12 months and 77 years and you
          have the fingerprint.
        </p>
      )}
    </section>
  );
}
