"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type {
  AnnualRow,
  ENSOEvent,
  EnsoImpactResponse,
  ExtremesResponse,
  FingerprintResponse,
  FingerprintVariable,
  Region,
  SeasonResponse,
} from "@/lib/types";
import ClimateFingerprint, {
  FingerprintLegend,
  AnomalyLegend,
  ZOOM_WINDOW,
  fingerprintYears,
  UNIT,
  type FingerprintZoom,
} from "./ClimateFingerprint";
import {
  MAX_LAYERS,
  parseLayersParam,
  serializeLayersParam,
  toggleLayer,
  type FingerprintLayer,
} from "./layers";
import {
  BASELINE_FROM,
  BASELINE_TO,
  monthlyClimatology,
  anomalyDomain,
} from "./baseline";
import { ANOMALY_RAMP } from "./color-scale";
import SegmentedControl from "@/components/ui/SegmentedControl";
import LiveAnnouncement from "@/components/ui/LiveAnnouncement";
import SeasonRuleNote from "@/components/charts/SeasonRuleNote";
import ENSOBadge from "@/components/ui/ENSOBadge";
import { L, formatNumber } from "@/lib/i18n";
import { useLang } from "@/lib/use-lang";
import { ensoCaption } from "./enso";
import { EXTREME_METRICS, extremeMetricValue } from "./extremes";

type Bi = { en: string; id: string };

const VARIABLES: ({ key: FingerprintVariable } & Bi)[] = [
  { key: "precipitation", en: "Rainfall", id: "Hujan" },
  { key: "temp_max", en: "Max temp", id: "Suhu maks" },
  { key: "feels_like", en: "Feels like", id: "Terasa" },
  { key: "hot_days_local", en: "Hot days", id: "Hari panas" },
  { key: "dry_days", en: "Dry days", id: "Hari kering" },
];

const ZOOMS: ({ key: FingerprintZoom } & Bi)[] = [
  { key: "record", en: "Whole record", id: "Semua tahun" },
  { key: "decade", en: "Decade", id: "Dekade" },
  { key: "year", en: "Year", id: "Tahun" },
];

const BLURB: Record<FingerprintVariable, Bi> = {
  precipitation: { en: "Total monthly rainfall", id: "Total curah hujan bulanan" },
  temp_max: {
    en: "Average daily high, per month",
    id: "Rata-rata suhu tertinggi harian, per bulan",
  },
  feels_like: {
    en: "Average feels-like daily high: air temperature adjusted for humidity and wind",
    id: "Rata-rata suhu terasa tertinggi harian: suhu udara disesuaikan dengan kelembapan dan angin",
  },
  hot_days: { en: "Days above 35°C per month", id: "Hari di atas 35°C per bulan" },
  hot_days_local: {
    en: "Days hotter than 95% of this city's 1951–1980 days",
    id: "Hari yang lebih panas dari 95% hari di kota ini pada 1951–1980",
  },
  dry_days: {
    en: "Days below 1 mm of rain per month",
    id: "Hari dengan hujan di bawah 1 mm per bulan",
  },
};

/**
 * How a year's 12 cells roll up. Rainfall and day-counts are additive; a
 * temperature is not — summing 12 monthly means yields a meaningless ~340°C,
 * so temperatures average instead.
 */
const ROLLUP: Record<
  FingerprintVariable,
  { kind: "sum" | "mean"; unit: string } & Bi
> = {
  precipitation: { kind: "sum", unit: " mm", en: "Annual total", id: "Total setahun" },
  temp_max: { kind: "mean", unit: "°C", en: "Annual average", id: "Rata-rata setahun" },
  feels_like: { kind: "mean", unit: "°C", en: "Annual average", id: "Rata-rata setahun" },
  hot_days: { kind: "sum", unit: "", en: "Hot days this year", id: "Hari panas tahun ini" },
  hot_days_local: { kind: "sum", unit: "", en: "Hot days this year", id: "Hari panas tahun ini" },
  dry_days: { kind: "sum", unit: "", en: "Dry days this year", id: "Hari kering tahun ini" },
};

/** Each layer chip carries a small picture of what the layer draws. */
const LAYER_CHIPS: ({ key: FingerprintLayer; icon: ReactNode } & Bi)[] = [
  {
    key: "baseline",
    en: "vs 1951–1980",
    id: "vs 1951–1980",
    icon: (
      <span
        aria-hidden
        className="h-4 w-4 rounded-[4px]"
        style={{ background: `linear-gradient(90deg, ${ANOMALY_RAMP.join(",")})` }}
      />
    ),
  },
  {
    key: "season",
    en: "Wet season",
    id: "Musim hujan",
    icon: (
      <svg aria-hidden width="16" height="16" viewBox="0 0 16 16">
        <path d="M2 13 C6 11 9 7 14 3" stroke="var(--drought-amber)" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "enso",
    en: "El Niño / La Niña",
    id: "El Niño / La Niña",
    icon: (
      <svg aria-hidden width="16" height="16" viewBox="0 0 16 16">
        <rect x="3" y="2" width="3.5" height="12" rx="1" fill="var(--enso-nino)" />
        <line x1="11.25" y1="2.5" x2="11.25" y2="13.5" stroke="var(--enso-nina)" strokeWidth="3.5" strokeDasharray="2.5 2" />
      </svg>
    ),
  },
  {
    key: "extremes",
    en: "Extreme years",
    id: "Tahun ekstrem",
    icon: (
      <svg aria-hidden width="16" height="16" viewBox="0 0 16 16">
        <rect x="2" y="4" width="12" height="8" rx="2" fill="none" stroke="var(--heat-orange)" strokeWidth="1.8" />
      </svg>
    ),
  },
];

export default function FingerprintPanel({
  region,
  initial,
  ensoEvents,
  season = null,
  ensoImpact = null,
  extremes = null,
  baselineFrom = BASELINE_FROM,
  baselineTo = BASELINE_TO,
}: {
  region: Pick<Region, "id" | "slug">;
  initial: FingerprintResponse;
  ensoEvents: ENSOEvent[];
  /** Powers the Season layer (DESIGN.md §5.2). */
  season?: SeasonResponse | null;
  /** Powers the ENSO layer's caption (DESIGN.md §5.3). */
  ensoImpact?: EnsoImpactResponse | null;
  /** Powers the Extremes layer (DESIGN.md §5.5). */
  extremes?: ExtremesResponse | null;
  /** The Baseline layer's climatology window; PersonalBaseline can move it. */
  baselineFrom?: number;
  baselineTo?: number;
}) {
  const lang = useLang();
  const tr = (b: Bi) => (lang === "en" ? b.en : b.id);

  const [variable, setVariable] = useState<FingerprintVariable>("precipitation");
  const [data, setData] = useState<FingerprintResponse>(initial);
  const [failed, setFailed] = useState(false);
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState<FingerprintZoom>("record");
  // Index into the newest-first year list where the "decade"/"year" window
  // starts. Meaningless at "record" zoom, where every year renders.
  const [windowStart, setWindowStart] = useState(0);
  // Silent until the reader picks a different variable.
  const [touched, setTouched] = useState(false);
  // Shown briefly when a fourth layer is refused (DESIGN.md §5.6: "the
  // fourth toggle should visibly refuse rather than silently degrade").
  const [refused, setRefused] = useState(false);

  // DESIGN.md §5.6: layer state lives in the URL so a finding is shareable.
  // Server HTML always renders zero layers active; the URL is read after
  // hydration, the same deferred shape `?since=` uses.
  const [layers, setLayers] = useState<Set<FingerprintLayer>>(new Set());

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("layers");
    const parsed = parseLayersParam(raw);
    if (parsed.size > 0) setLayers(parsed);
  }, []);

  function handleToggleLayer(key: FingerprintLayer) {
    const next = toggleLayer(layers, key);
    if (next === layers) {
      setRefused(true);
      window.setTimeout(() => setRefused(false), 2600);
      return;
    }
    setRefused(false);
    setLayers(next);
    const url = new URL(window.location.href);
    const encoded = serializeLayersParam(next);
    if (encoded) url.searchParams.set("layers", encoded);
    else url.searchParams.delete("layers");
    window.history.replaceState(null, "", url);
  }

  const baselineActive = layers.has("baseline");
  const climatology = useMemo(
    () =>
      baselineActive
        ? monthlyClimatology(data.data, baselineFrom, baselineTo)
        : null,
    [data, baselineActive, baselineFrom, baselineTo],
  );
  const anomalyMax = useMemo(
    () => (climatology ? anomalyDomain(data.data, climatology) : null),
    [data, climatology],
  );
  const seasonActive = layers.has("season");
  const ensoActive = layers.has("enso");
  const ensoNote = useMemo(
    () => (ensoActive && ensoImpact ? ensoCaption(ensoImpact, lang) : null),
    [ensoActive, ensoImpact, lang],
  );
  const extremesActive = layers.has("extremes");
  const [extremeMetric, setExtremeMetric] = useState<keyof AnnualRow>(
    "hot_days_local",
  );
  const extremeMetricInfo =
    EXTREME_METRICS.find((m) => m.key === extremeMetric) ?? EXTREME_METRICS[0];

  useEffect(() => {
    if (variable === initial.variable && data.variable === variable) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    api
      .fingerprint(region, variable)
      .then((d) => !cancelled && setData(d))
      // A variable whose file is missing keeps the previous grid and says
      // so, instead of an unhandled rejection and a silently stale picture.
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variable, region.id, region.slug]);

  const years = useMemo(() => fingerprintYears(data), [data]);
  const windowSize = ZOOM_WINDOW[zoom];
  const maxWindowStart = Math.max(0, years.length - (windowSize ?? years.length));
  const clampedWindowStart = Math.min(windowStart, maxWindowStart);
  const windowLabel =
    windowSize === null
      ? null
      : windowSize === 1
        ? `${years[clampedWindowStart]}`
        : `${years[Math.min(clampedWindowStart + windowSize - 1, years.length - 1)]}–${years[clampedWindowStart]}`;

  function stepWindow(direction: -1 | 1) {
    if (windowSize === null) return;
    setWindowStart((s) =>
      Math.max(0, Math.min(maxWindowStart, s + direction * windowSize)),
    );
  }

  const rollup = ROLLUP[data.variable];
  const yearCells =
    hoverYear !== null
      ? data.data.filter((d) => d.year === hoverYear && d.value !== null)
      : [];
  const yearValue =
    yearCells.length > 0
      ? rollup.kind === "sum"
        ? yearCells.reduce((s, d) => s + (d.value ?? 0), 0)
        : yearCells.reduce((s, d) => s + (d.value ?? 0), 0) / yearCells.length
      : null;

  const threshold = data.hot_day_threshold_c;

  return (
    <section className="card overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-5 pb-4 pt-6 sm:px-6">
        <p className="eyebrow">
          <L en="The signature view" id="Tampilan utama" />
        </p>
        <h3 className="mt-2 font-display text-2xl font-semibold">
          <L en="Climate Fingerprint" id="Sidik Iklim" />
        </h3>
        <p className="mt-1.5 max-w-prose text-sm text-text-secondary">
          <L en={BLURB[data.variable].en} id={BLURB[data.variable].id} />
          {data.variable === "hot_days_local" && threshold !== null && (
            <>
              {" "}
              <L en="— above" id="— di atas" />{" "}
              <span className="font-numeric text-text-primary">
                {formatNumber(threshold, lang)}°C
              </span>
            </>
          )}{" "}
          · <span className="font-numeric">{data.year_from}–{data.year_to}</span>
        </p>
        <p className="mt-2 max-w-prose text-2xs leading-relaxed text-text-muted">
          <L
            en="One square is one month: an average (or a count) over its 28–31 days. Newest year at the top."
            id="Satu kotak adalah satu bulan: rata-rata (atau jumlah) dari 28–31 harinya. Tahun terbaru di atas."
          />
          {data.variable === "hot_days_local" && threshold !== null && (
            <>
              {" "}
              <L
                en={`“Hotter than 95%”: line up every daily high from 1951–1980 from coolest to hottest; the value 95% of the way along is ${formatNumber(threshold, "en")}°C. Days above it were roughly the hottest 1 in 20 back then.`}
                id={`“Lebih panas dari 95%”: urutkan semua suhu tertinggi harian 1951–1980 dari yang terdingin ke terpanas; nilai di posisi 95% adalah ${formatNumber(threshold, "id")}°C. Hari di atasnya dulu kira-kira 1 dari 20 hari terpanas.`}
              />
            </>
          )}
        </p>
      </div>

      {/* ── Toolbar: variable + zoom on the left, layers on the right ───── */}
      <div className="flex flex-col gap-3 border-y border-border bg-canvas/40 px-5 py-3 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {/* Five options outgrow a phone row; let the track scroll rather
              than clip the last option out of reach. */}
          <div className="-mx-1 max-w-full overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SegmentedControl
            name="fingerprint-variable"
            label={lang === "en" ? "Climate variable" : "Variabel iklim"}
            options={VARIABLES.map((v) => ({ value: v.key, label: tr(v) }))}
            value={variable}
            onChange={(next) => {
              setTouched(true);
              setVariable(next);
            }}
          />
          </div>
          <div className="flex items-center gap-2">
            <SegmentedControl
              name="fingerprint-zoom"
              label="Zoom"
              variant="ghost"
              options={ZOOMS.map((z) => ({ value: z.key, label: tr(z) }))}
              value={zoom}
              onChange={(next) => {
                setZoom(next);
                setWindowStart(0);
              }}
            />
            {windowSize !== null && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => stepWindow(1)}
                  disabled={clampedWindowStart >= maxWindowStart}
                  aria-label={lang === "en" ? "Earlier" : "Lebih awal"}
                  className="rounded-full border border-border p-1 text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30"
                >
                  ←
                </button>
                <span className="font-numeric min-w-[5.5rem] text-center text-xs text-text-secondary">
                  {windowLabel}
                </span>
                <button
                  type="button"
                  onClick={() => stepWindow(-1)}
                  disabled={clampedWindowStart <= 0}
                  aria-label={lang === "en" ? "Later" : "Lebih baru"}
                  className="rounded-full border border-border p-1 text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 xl:items-end">
          <div
            role="group"
            aria-label={lang === "en" ? "Layers" : "Lapisan"}
            className="flex flex-wrap gap-2"
          >
            {LAYER_CHIPS.map((c) => {
              const on = layers.has(c.key);
              const atCap = !on && layers.size >= MAX_LAYERS;
              return (
                <button
                  key={c.key}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  aria-disabled={atCap || undefined}
                  onClick={() => handleToggleLayer(c.key)}
                >
                  {c.icon}
                  <L en={c.en} id={c.id} />
                </button>
              );
            })}
          </div>
          {refused && (
            <p role="status" className="text-2xs text-drought-amber">
              <L
                en={`Up to ${MAX_LAYERS} layers at once. Turn one off first.`}
                id={`Maksimal ${MAX_LAYERS} lapisan sekaligus. Matikan satu dulu.`}
              />
            </p>
          )}
          {baselineActive && (
            <span className="font-numeric text-2xs text-text-muted">
              <L
                en={`Colour = departure from the ${baselineFrom}–${baselineTo} average`}
                id={`Warna = selisih dari rata-rata ${baselineFrom}–${baselineTo}`}
              />
            </span>
          )}
          {extremesActive && (
            <label className="flex items-center gap-2 text-2xs text-text-muted">
              <L en="Outline years with the most" id="Tandai tahun dengan" />
              <select
                value={extremeMetric}
                onChange={(e) => setExtremeMetric(e.target.value as keyof AnnualRow)}
                className="field px-2.5 py-1 text-2xs"
              >
                {EXTREME_METRICS.map((m) => (
                  <option key={m.key as string} value={m.key as string}>
                    {lang === "en" ? m.label : m.label_id}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <LiveAnnouncement
        message={
          touched && !loading
            ? `${lang === "en" ? "Showing" : "Menampilkan"}: ${tr(BLURB[data.variable])}.`
            : ""
        }
      />

      {failed && (
        <p className="mx-5 mt-4 rounded-lg border border-drought-amber/40 bg-drought-amber/[0.08] px-4 py-2.5 text-xs text-text-secondary sm:mx-6">
          <L
            en="This variable isn't available for this city yet. Still showing the previous one."
            id="Variabel ini belum tersedia untuk kota ini. Masih menampilkan yang sebelumnya."
          />
        </p>
      )}

      {/* ── Grid + sidebar ────────────────────────────────────────────── */}
      {/* Grid first in the DOM, sidebar second, matching the reading order. */}
      <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-start">
        <div
          className="min-w-0 flex-1 transition-opacity duration-200"
          style={{ opacity: loading ? 0.4 : 1 }}
          aria-busy={loading}
        >
          <ClimateFingerprint
            data={data}
            ensoEvents={ensoEvents}
            zoom={zoom}
            windowStart={clampedWindowStart}
            layers={layers}
            baselineFrom={baselineFrom}
            baselineTo={baselineTo}
            season={season}
            extremes={extremes}
            extremeMetric={extremeMetric}
            onHoverYear={setHoverYear}
          />
        </div>

        <aside className="flex w-full min-w-0 flex-col gap-5 lg:sticky lg:top-32 lg:w-[15rem] lg:shrink-0">
          {/* Hovered-year readout. Reserves its height so nothing reflows. */}
          <div className="min-h-[7.5rem] rounded-lg border border-border bg-surface-inset p-4">
            {hoverYear !== null ? (
              <>
                <div className="num-display text-3xl font-semibold leading-none text-text-primary">
                  {hoverYear}
                </div>
                <div className="mt-3 text-xs text-text-muted">
                  <L en={rollup.en} id={rollup.id} />
                </div>
                <div className="font-numeric mt-0.5 text-lg text-text-primary">
                  {yearValue !== null
                    ? `${formatNumber(yearValue, lang, rollup.kind === "sum" && !rollup.unit ? 0 : 1)}${rollup.unit}`
                    : "—"}
                </div>
                {extremesActive && extremes && (
                  <>
                    <div className="mt-2 text-xs text-text-muted">
                      {lang === "en" ? extremeMetricInfo.short : extremeMetricInfo.short_id}
                    </div>
                    <div className="font-numeric mt-0.5 text-lg text-heat-light">
                      {(() => {
                        const row = extremes.results.find((r) => r.year === hoverYear);
                        const v = row ? extremeMetricValue(row, extremeMetric) : null;
                        return v !== null ? v : "—";
                      })()}
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-xs leading-relaxed text-text-muted">
                <L
                  en="Hover a square for its month, or a row for the whole year. Read down a column to watch one month change across the decades."
                  id="Arahkan kursor ke kotak untuk melihat bulannya, atau ke baris untuk setahun penuh. Baca satu kolom ke bawah untuk melihat satu bulan berubah dari dekade ke dekade."
                />
              </p>
            )}
          </div>

          {/* DESIGN.md §5.4: two ramps are never on screen at once. */}
          {baselineActive ? (
            <AnomalyLegend
              domainMax={anomalyMax}
              unit={UNIT[data.variable]}
              from={baselineFrom}
              to={baselineTo}
            />
          ) : (
            <FingerprintLegend variable={data.variable} stats={data.stats} />
          )}

          {seasonActive && season && (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="eyebrow">
                <L en="Wet season" id="Musim hujan" />
              </p>
              {!season.onset_saturated && (
                <>
                  <LegendLine en="Onset, year by year" id="Awal musim, per tahun" />
                  <LegendLine dash="1 2.5" en="End, year by year" id="Akhir musim, per tahun" />
                  <LegendLine dash="5 4" faded en="Onset trend" id="Tren awal musim" />
                </>
              )}
              <SeasonRuleNote
                bordered={false}
                saturatedShare={season.onset_saturated ? season.onset_saturated_share : undefined}
              />
            </div>
          )}

          {ensoActive && (
            <div className="space-y-2.5 border-t border-border pt-4">
              <p className="eyebrow">ENSO</p>
              <div className="flex items-center gap-2.5 text-xs text-text-secondary">
                <svg width="14" height="3" aria-hidden className="shrink-0">
                  <line x1="0" y1="1.5" x2="14" y2="1.5" stroke="var(--enso-nino)" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <ENSOBadge phase="EL_NINO" />
                <span>
                  <L en="tends drier" id="cenderung kering" />
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-text-secondary">
                <svg width="14" height="3" aria-hidden className="shrink-0">
                  <line x1="0" y1="1.5" x2="14" y2="1.5" stroke="var(--enso-nina)" strokeWidth="3" strokeDasharray="3 2.5" strokeLinecap="round" />
                </svg>
                <ENSOBadge phase="LA_NINA" />
                <span>
                  <L en="tends wetter" id="cenderung basah" />
                </span>
              </div>
            </div>
          )}
        </aside>
      </div>

      {ensoNote && (
        <p className="border-t border-border px-6 py-4 text-sm leading-relaxed text-text-secondary">
          <span className="eyebrow mb-1.5 block">
            <L en="El Niño & La Niña here" id="El Niño & La Niña di sini" />
          </span>
          {ensoNote}
        </p>
      )}
    </section>
  );
}

function LegendLine({
  dash,
  faded,
  en,
  id,
}: {
  dash?: string;
  faded?: boolean;
  en: string;
  id: string;
}) {
  return (
    <div className="flex items-center gap-2.5 text-xs text-text-secondary">
      <svg width="16" height="2" aria-hidden className="shrink-0">
        <line
          x1="0"
          y1="1"
          x2="16"
          y2="1"
          stroke="var(--drought-amber)"
          strokeWidth="2"
          strokeDasharray={dash}
          opacity={faded ? 0.7 : 1}
        />
      </svg>
      <L en={en} id={id} />
    </div>
  );
}
