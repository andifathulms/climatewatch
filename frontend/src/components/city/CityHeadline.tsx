import type { MoversResponse, StripeSeries } from "@/lib/types";
import { L, N } from "@/lib/i18n";
import { decadeChange } from "./stripe-stats";
import { SIGNAL_LABEL, unitLabel } from "./signals";

/**
 * The city page's opening claim (DESIGN.md §3.3): one computed sentence in
 * the display face, numbers set in Fraunces lining figures so they read as
 * part of the sentence. The temperature change leads because it is the
 * question the site asks on its homepage; the ranked "what moved most"
 * signals follow as evidence, with the rule that ranks them.
 *
 * Degrades rather than inventing: no stripes → the movers sentence alone;
 * a change inside ±0.25 °C → "about as warm", not a rounded-up claim.
 */
export default function CityHeadline({
  name,
  stripes,
  movers,
}: {
  name: string;
  stripes: StripeSeries | null;
  movers: MoversResponse | null;
}) {
  const change = stripes ? decadeChange(stripes) : null;
  const signals = (movers?.signals ?? []).slice(0, 4);

  return (
    <section className="max-w-4xl">
      {change ? (
        <>
          <p className="font-display text-hero font-semibold leading-[1.08] text-text-primary">
            {Math.abs(change.delta) < 0.25 ? (
              <L
                en={<>Afternoons in {name} are about as warm as in the {change.earlyRange.slice(0, 4)}s.</>}
                id={<>Siang hari di {name} kira-kira sama hangatnya dengan tahun {change.earlyRange.slice(0, 4)}-an.</>}
              />
            ) : (
              <>
                <L en={<>{name}&rsquo;s afternoons are </>} id={<>Siang hari di {name} kini </>} />
                <span className={`num-display ${change.delta > 0 ? "text-heat-light" : "text-rain-light"}`}>
                  <N value={Math.abs(change.delta)} unit=" °C" />
                </span>
                <L
                  en={<> {change.delta > 0 ? "hotter" : "cooler"} than in the {change.earlyRange.slice(0, 4)}s.</>}
                  id={<> {change.delta > 0 ? "lebih panas" : "lebih sejuk"} daripada tahun {change.earlyRange.slice(0, 4)}-an.</>}
                />
              </>
            )}
          </p>
          <p className="mt-4 max-w-prose text-lg leading-relaxed text-text-secondary">
            <L en="A typical day now peaks at" id="Hari biasa kini mencapai puncak" />{" "}
            <strong className="font-semibold text-text-primary">
              <N value={change.recent} unit=" °C" />
            </strong>{" "}
            ({change.recentRange}),{" "}
            <L en="up from" id="dari" />{" "}
            <strong className="font-semibold text-text-primary">
              <N value={change.early} unit=" °C" />
            </strong>{" "}
            ({change.earlyRange}).{" "}
            <L
              en="Both are ten-year averages, so one unusual year can't swing them."
              id="Keduanya rata-rata sepuluh tahun, jadi satu tahun yang tidak biasa tidak bisa menggesernya."
            />
          </p>
        </>
      ) : (
        <p className="font-display text-hero font-semibold leading-tight text-text-primary">
          <L en={`${name}'s climate record`} id={`Catatan iklim ${name}`} />
        </p>
      )}

      {signals.length > 0 && (
        <div className="mt-7 border-t border-border pt-4">
          <p className="eyebrow">
            <L en="Biggest changes, per decade" id="Perubahan terbesar, per dekade" />
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            {signals.map((s, i) => {
              const label = SIGNAL_LABEL[s.field] ?? { en: s.label, id: s.label };
              const big = Math.abs(s.per_decade) >= 20;
              return (
                <div key={s.field}>
                  <dt className="text-2xs text-text-muted">
                    <L en={label.en} id={label.id} />
                    {i === 0 && movers?.leader && (
                      <span className="ml-1.5 rounded-full border border-heat-orange/50 px-1.5 text-2xs text-heat-light">
                        #1
                      </span>
                    )}
                  </dt>
                  <dd className="font-numeric mt-0.5 text-sm text-text-primary">
                    <span aria-hidden className={s.per_decade > 0 ? "text-heat-light" : "text-rain-light"}>
                      {s.per_decade > 0 ? "↑" : "↓"}
                    </span>{" "}
                    <N value={Math.abs(s.per_decade)} digits={big ? 0 : 1} />{" "}
                    <L en={unitLabel(s.unit, "en")} id={unitLabel(s.unit, "id")} />
                  </dd>
                </div>
              );
            })}
          </dl>
          {movers && (
            <p className="mt-3 max-w-prose text-2xs leading-relaxed text-text-muted">
              <L
                en={`Ranked by fitted trend per decade divided by each series' own year-to-year spread, so changes in different units compare fairly. Needs ${movers.rule.min_years}+ years; the current, incomplete year is excluded.`}
                id={`Diurutkan berdasarkan tren per dekade dibagi sebaran tahunan tiap seri, agar perubahan dengan satuan berbeda bisa dibandingkan adil. Butuh ${movers.rule.min_years}+ tahun; tahun berjalan tidak dihitung.`}
              />
            </p>
          )}
        </div>
      )}
    </section>
  );
}
