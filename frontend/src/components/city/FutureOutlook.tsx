import type { ProjectionResponse } from "@/lib/types";
import { L, N } from "@/lib/i18n";

const W = 1000;
const H = 320;
const M = { l: 56, r: 20, t: 20, b: 40 };

/**
 * "Looking ahead": where five high-resolution climate models put this city's
 * average daily high by the 2040s. Delta method throughout: each model's
 * change against its own 1995–2014 mean, added to what ERA5 observed over
 * the same years. The spread between models is drawn, not averaged away,
 * and the scenario is named. Rainfall is stated as a range and called
 * uncertain when the models disagree on its direction.
 */
export default function FutureOutlook({
  data,
  name,
}: {
  data: ProjectionResponse;
  name: string;
}) {
  const t = data.temp_delta_c;
  const p = data.precip_delta_pct;
  if (!t) return null;

  const years0 = data.observed_anomaly[0]?.[0] ?? 1950;
  const x0 = years0;
  const x1 = 2049;
  const allY = [
    ...data.observed_anomaly.map((d) => d[1]),
    ...data.models.flatMap((m) => m.temp_anomaly.map((d) => d[1])),
  ];
  const lo = Math.floor(Math.min(-1, ...allY) * 2) / 2;
  const hi = Math.ceil(Math.max(1, ...allY) * 2) / 2;
  const sx = (y: number) => M.l + ((y - x0) / (x1 - x0)) * (W - M.l - M.r);
  const sy = (v: number) => M.t + ((hi - v) / (hi - lo)) * (H - M.t - M.b);

  // Per-year min / median / max across models, for the band and centre line.
  const byYear = new Map<number, number[]>();
  for (const m of data.models)
    for (const [y, v] of m.temp_anomaly) {
      if (y < 2015) continue;
      const arr = byYear.get(y) ?? [];
      arr.push(v);
      byYear.set(y, arr);
    }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  // 5-year running mean so the band shows the climate, not year-to-year noise.
  const smooth = (fn: (v: number[]) => number) =>
    years.map((y) => {
      const win = years.filter((z) => Math.abs(z - y) <= 2).map((z) => fn(byYear.get(z)!));
      return [y, win.reduce((a, b) => a + b, 0) / win.length] as const;
    });
  const med = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
  const bandLo = smooth((v) => Math.min(...v));
  const bandHi = smooth((v) => Math.max(...v));
  const bandMid = smooth(med);
  const path = (pts: readonly (readonly [number, number])[]) =>
    pts.map(([y, v], i) => `${i ? "L" : "M"}${sx(y).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  const band = `${path(bandHi)} L${[...bandLo].reverse().map(([y, v]) => `${sx(y).toFixed(1)},${sy(v).toFixed(1)}`).join(" L")} Z`;

  const future = data.observed_baseline_c !== null ? data.observed_baseline_c + t.median : null;
  const rainSplit = p !== null && p.min < 0 && p.max > 0;
  const ticks = [];
  for (let v = Math.ceil(lo); v <= hi; v += 1) ticks.push(v);

  return (
    <section id="future" className="card scroll-mt-32 p-6 sm:p-8">
      <p className="eyebrow">
        <L en="Looking ahead" id="Ke depan" />
      </p>
      <h3 className="mt-2 max-w-3xl font-display text-title font-semibold leading-snug">
        <L en={<>By the 2040s, {name}&rsquo;s afternoons are projected to be </>} id={<>Pada 2040-an, siang hari di {name} diproyeksikan </>} />
        <span className="num-display text-heat-light">
          <N value={t.median} signed unit=" °C" />
        </span>
        <L
          en={<> warmer than in {data.baseline.from}–{data.baseline.to}.</>}
          id={<> lebih panas daripada {data.baseline.from}–{data.baseline.to}.</>}
        />
      </h3>
      <p className="mt-3 max-w-prose leading-relaxed text-text-secondary">
        <L en="The five models range from" id="Kelima model berkisar antara" />{" "}
        <strong className="font-semibold text-text-primary">
          <N value={t.min} signed /> <L en="to" id="hingga" /> <N value={t.max} signed unit=" °C" />
        </strong>
        .{" "}
        {future !== null && (
          <>
            <L en="A typical day would peak around" id="Hari biasa akan mencapai puncak sekitar" />{" "}
            <strong className="font-semibold text-text-primary">
              <N value={future} unit=" °C" />
            </strong>
            .{" "}
          </>
        )}
        {p && (
          <>
            <L en="Rainfall:" id="Curah hujan:" />{" "}
            <N value={p.min} signed unit="%" /> <L en="to" id="hingga" /> <N value={p.max} signed unit="%" />
            {rainSplit ? (
              <L en=", the models don't agree on the direction." id=", model tidak sepakat arahnya." />
            ) : (
              "."
            )}
          </>
        )}
      </p>

      <figure className="mt-6">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Observed and projected change in ${name}'s average daily high, ${x0}–${x1}`}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke={v === 0 ? "var(--axis-line)" : "var(--grid-line)"} />
              <text x={M.l - 10} y={sy(v) + 6} textAnchor="end" fontSize={18} className="font-numeric" fill="var(--text-muted)">
                {v > 0 ? `+${v}` : v}°
              </text>
            </g>
          ))}
          {[1950, 1980, 2000, 2025, 2049].map((y) => (
            <text key={y} x={sx(y)} y={H - 10} textAnchor="middle" fontSize={18} className="font-numeric" fill="var(--text-muted)">
              {y}
            </text>
          ))}
          <rect
            x={sx(data.window.from)}
            y={M.t}
            width={sx(data.window.to) - sx(data.window.from)}
            height={H - M.t - M.b}
            fill="var(--heat-orange)"
            opacity={0.07}
          />
          <path d={band} fill="var(--heat-orange)" opacity={0.22} />
          <path d={path(bandMid)} fill="none" stroke="var(--heat-light)" strokeWidth={3} strokeDasharray="8 6" />
          <path d={path(data.observed_anomaly)} fill="none" stroke="var(--text-primary)" strokeWidth={2} />
        </svg>
        <figcaption className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-2xs text-text-muted">
          <span className="flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-5 bg-text-primary" />
            <L en="Observed (ERA5)" id="Pengamatan (ERA5)" />
          </span>
          <span className="flex items-center gap-2">
            <svg width="20" height="4" aria-hidden><line x1="0" y1="2" x2="20" y2="2" stroke="var(--heat-light)" strokeWidth="3" strokeDasharray="5 4" /></svg>
            <L en="Model median (5-yr mean)" id="Median model (rata-rata 5 thn)" />
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="h-3 w-5 rounded-sm bg-heat-orange/25" />
            <L en="Range across 5 models" id="Kisaran 5 model" />
          </span>
          <span>
            <L
              en={`Change vs ${data.baseline.from}–${data.baseline.to}, °C`}
              id={`Perubahan vs ${data.baseline.from}–${data.baseline.to}, °C`}
            />
          </span>
        </figcaption>
      </figure>

      <p className="mt-5 max-w-prose border-t border-border pt-3 text-2xs leading-relaxed text-text-muted">
        <L
          en={`Five CMIP6 HighResMIP models (${data.models.map((m) => m.model.replace(/_/g, "-")).join(", ")}) at 20–50 km, following a high-emissions pathway, via the Open-Meteo Climate API. Each model's change is measured against its own ${data.baseline.from}–${data.baseline.to} average, then added to the observed ERA5 average, because raw model temperatures can be off by a degree or more at city scale. This is a projection of the climate, not a forecast of any particular year.`}
          id={`Lima model CMIP6 HighResMIP (${data.models.map((m) => m.model.replace(/_/g, "-")).join(", ")}) beresolusi 20–50 km, dengan jalur emisi tinggi, melalui Open-Meteo Climate API. Perubahan tiap model diukur terhadap rata-rata ${data.baseline.from}–${data.baseline.to} model itu sendiri, lalu ditambahkan ke rata-rata pengamatan ERA5, karena suhu mentah model bisa meleset satu derajat atau lebih pada skala kota. Ini proyeksi iklim, bukan prakiraan untuk tahun tertentu.`}
        />
      </p>
    </section>
  );
}
