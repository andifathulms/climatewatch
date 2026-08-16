import type { MoversResponse, MoverSignal } from "@/lib/types";

/**
 * The city page's opening claim — DESIGN.md §3.3's "headline sentence."
 *
 * Every city page used to show the same four charts at the same size, which
 * quietly asserted the four signals matter equally everywhere. They do not:
 * Jambi's story is a lengthening wet season, Madiun's is heat. This leads
 * with the signal that actually moved, ranked by a rule the reader can
 * re-derive, set as a bare sentence directly under the masthead — not a
 * stat card, not a <dl> — because a headline is a claim, not a panel.
 *
 * Deliberately not prose generation. It is a template around numbers lifted
 * straight from the export, and the ranking rule is stated in the footnote —
 * a headline the reader cannot check is the one thing this project refuses
 * to ship.
 *
 * Graceful degradation: when nothing in the record clears the movement
 * floor, the sentence is replaced by a plain statement that nothing did,
 * with the threshold it was measured against — never a rounded-into-existence
 * number, never a silently empty section.
 */
function formatDelta(signal: MoverSignal): string {
  const magnitude = Math.abs(signal.per_decade);
  // Rainfall totals are large; a decimal place on them is noise. Everything
  // else is small enough that the decimal carries real information.
  const decimals = magnitude >= 20 ? 0 : 1;
  return `${magnitude.toFixed(decimals)} ${signal.unit.replace("/yr", "")}`;
}

export default function WhatMovedMost({ data }: { data: MoversResponse }) {
  const leader = data.leader;

  // Nothing cleared the movement floor — say that, rather than promoting the
  // largest number in a set of numbers that are all indistinguishable from
  // flat. The sentence degrades to what is actually knowable; it does not
  // disappear and it does not round a flat signal into a claim.
  if (!leader) {
    return (
      <section>
        <p className="max-w-prose font-display text-hero font-semibold leading-tight text-text-primary">
          Nothing in {data.region.name}&rsquo;s record stands out yet.
        </p>
        <p className="mt-3 max-w-prose leading-relaxed text-text-secondary">
          Every tracked measure has drifted by less than{" "}
          <span className="font-numeric">{data.rule.min_abs_z}</span> standard
          deviations per decade — the threshold this page uses to call a
          signal a finding rather than noise. The charts below show each one
          in full.
        </p>
      </section>
    );
  }

  const others = data.signals
    .filter((s) => s.field !== leader.field)
    .slice(0, 3);

  return (
    <section>
      {/* DESIGN.md §3.3: the page opens with one computed sentence, set in
          Fraunces at --text-hero — not a stat card, not a <dl>. The numbers
          inside it are the one place JetBrains Mono appears at display size. */}
      <p className="max-w-prose font-display text-hero font-semibold leading-tight text-text-primary">
        {leader.label} in {data.region.name} is trending{" "}
        <span className="text-heat-light">{leader.direction}</span> —{" "}
        <span className="font-numeric">{formatDelta(leader)}</span> per decade.
      </p>

      <p className="mt-4 max-w-prose leading-relaxed text-text-secondary">
        Averaged over the first ten years of the record it was{" "}
        <span className="font-numeric text-text-primary">
          {leader.early_mean}
        </span>
        ; over the last ten,{" "}
        <span className="font-numeric text-text-primary">
          {leader.recent_mean}
        </span>{" "}
        <span className="text-text-muted">
          ({leader.unit}, {leader.first_year}–{leader.last_year})
        </span>
        .
      </p>

      {others.length > 0 && (
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-4">
          {others.map((s) => (
            <div key={s.field}>
              <dt className="text-2xs text-text-muted">{s.label}</dt>
              <dd className="font-numeric mt-0.5 text-sm text-text-secondary">
                {s.per_decade > 0 ? "↑" : "↓"} {formatDelta(s)} / decade
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="mt-5 border-t border-border pt-3 text-2xs leading-relaxed text-text-muted">
        Ranked by {data.rule.method}, which puts signals measured in different
        units on one comparable scale. It is a normalisation, not a weighting —
        no signal is declared more important than another. Needs{" "}
        <span className="font-numeric">{data.rule.min_years}</span>+ years; the
        current, incomplete year is excluded.
      </p>
    </section>
  );
}
