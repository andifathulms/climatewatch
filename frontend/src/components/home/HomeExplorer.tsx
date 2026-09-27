"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MultiPolygon } from "geojson";
import * as d3 from "d3";
import type { Region, StripeSeries } from "@/lib/types";
import { L, N, formatNumber } from "@/lib/i18n";
import { useLang } from "@/lib/use-lang";
import Stripes from "@/components/ui/Stripes";
import IndonesiaMap, { type MapMetric } from "@/components/map/IndonesiaMap";
import { ANOMALY_RAMP } from "@/components/fingerprint/color-scale";
import { openSearch } from "@/components/ui/CommandSearch";
import { decadeChange } from "@/components/city/stripe-stats";

const TRY = ["bandung", "surabaya", "denpasar", "makassar", "medan", "jayapura", "balikpapan"];

/**
 * The homepage's question, answered for whichever city the reader picks.
 * The city name inside the headline *is* the picker; the map below picks
 * too. Stripes and the answer update together, and the button opens that
 * city's full record. All numbers come from the same stripes export the
 * city pages use, so the homepage can never disagree with them.
 */
export default function HomeExplorer({
  initial,
  stripes,
  warming,
  regions,
  geometry,
}: {
  initial: string;
  stripes: StripeSeries[];
  /** slug → fitted °C per decade, from rankings. */
  warming: Record<string, number | null>;
  regions: Region[];
  geometry: MultiPolygon;
}) {
  const lang = useLang();
  const [slug, setSlug] = useState(initial);
  const bySlug = useMemo(() => new Map(stripes.map((s) => [s.slug, s])), [stripes]);
  const s = bySlug.get(slug) ?? stripes[0];
  const change = s ? decadeChange(s) : null;
  const trend = warming[s?.slug ?? ""] ?? null;

  const sorted = useMemo(
    () => [...stripes].sort((a, b) => a.name.localeCompare(b.name)),
    [stripes],
  );

  const mapMetric: MapMetric = useMemo(() => {
    const vals = Object.values(warming).filter((v): v is number => v !== null);
    const maxAbs = vals.length ? Math.max(...vals.map(Math.abs)) : 0.3;
    const scale = d3
      .scaleSequential(d3.interpolateRgbBasis(ANOMALY_RAMP))
      .domain([-maxAbs, maxAbs]);
    const byId = new Map(regions.map((r) => [r.id, warming[r.slug] ?? null]));
    return {
      label: lang === "en" ? "Warming rate" : "Laju pemanasan",
      getValue: (r) => byId.get(r.id) ?? null,
      color: (v) => scale(v) as string,
      format: (v) => `${formatNumber(v, lang, 2, true)} °C/${lang === "en" ? "decade" : "dekade"}`,
      domain: [-maxAbs, maxAbs],
      diverging: true,
    };
  }, [warming, regions, lang]);

  if (!s) return null;
  const verdict =
    change === null
      ? null
      : change.delta > 0.25
        ? { en: "Yes.", id: "Ya." }
        : change.delta < -0.25
          ? { en: "No, it's cooler.", id: "Tidak, justru lebih sejuk." }
          : { en: "Barely.", id: "Hampir tidak." };
  const lastYear = s.year_from + s.anomalies.length - 1;

  return (
    <>
      <section className="pb-10 pt-12 sm:pt-20">
        <p className="eyebrow">
          <L
            en={`${s.year_from}–${lastYear} · ${stripes.length} cities · ERA5 reanalysis`}
            id={`${s.year_from}–${lastYear} · ${stripes.length} kota · reanalisis ERA5`}
          />
        </p>
        <h1 className="mt-5 max-w-5xl font-display text-display font-semibold">
          <L en="Is" id="Apakah" />{" "}
          {/* A native select is as wide as its longest option; the invisible
              twin sizes the box to the chosen name, and the select fills it. */}
          <span className="relative inline-block">
            <span aria-hidden className="invisible whitespace-nowrap pr-2 italic" style={{ fontWeight: 500 }}>
              {s.name}
            </span>
            <label htmlFor="hero-city" className="sr-only">
              {lang === "en" ? "Choose a city" : "Pilih kota"}
            </label>
            <select
              id="hero-city"
              value={s.slug}
              onChange={(e) => setSlug(e.target.value)}
              className="absolute inset-0 h-full w-full min-w-0 cursor-pointer appearance-none border-b-[3px] border-dashed border-heat-light/60 bg-transparent font-display italic text-heat-light outline-none transition-colors hover:border-heat-light focus-visible:border-heat-light"
              style={{ fontSize: "inherit", fontWeight: 500, lineHeight: "inherit" }}
            >
              {sorted.map((c) => (
                <option key={c.slug} value={c.slug} className="bg-surface-raised font-sans text-base not-italic text-text-primary">
                  {c.name}
                </option>
              ))}
            </select>
          </span>{" "}
          <br className="hidden md:block" />
          <L en="getting hotter?" id="makin panas?" />
        </h1>

        {change && verdict && (
          <p className="mt-6 max-w-3xl text-xl leading-relaxed text-text-secondary sm:text-2xl">
            <strong className="font-semibold text-text-primary">
              <L en={verdict.en} id={verdict.id} />
            </strong>{" "}
            <L en={`A typical day in ${s.name} now peaks`} id={`Siang hari biasa di ${s.name} kini`} />{" "}
            <span className="num-display font-semibold text-heat-light">
              <N value={change.delta} signed unit=" °C" />
            </span>{" "}
            <L
              en={`${change.delta >= 0 ? "hotter" : "cooler"} than in the ${s.year_from}s`}
              id={`${change.delta >= 0 ? "lebih panas" : "lebih sejuk"} daripada tahun ${s.year_from}-an`}
            />
            {trend !== null && (
              <>
                {" "}
                <L en="— a trend of" id="— tren" />{" "}
                <span className="font-semibold text-text-primary">
                  <N value={trend} digits={2} signed />
                </span>{" "}
                <L en="°C per decade." id="°C per dekade." />
              </>
            )}
          </p>
        )}

        <div className="mt-8">
          <Stripes
            anomalies={s.anomalies}
            className="h-24 w-full sm:h-32"
            label={`Warming stripes for ${s.name}`}
          />
          <div className="font-numeric mt-2 flex justify-between gap-4 text-2xs text-text-muted">
            <span>{s.year_from}</span>
            <span className="text-center">
              <L
                en="one stripe per year · blue cooler, orange hotter than 1951–1980"
                id="satu garis per tahun · biru lebih sejuk, oranye lebih panas dari 1951–1980"
              />
            </span>
            <span>{lastYear}</span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={`/city/${s.slug}`} className="btn-primary px-6 py-3 text-base">
            <L en={`Open ${s.name}'s full record →`} id={`Buka catatan lengkap ${s.name} →`} />
          </Link>
          <button type="button" onClick={openSearch} className="btn-ghost px-5 py-3 text-base">
            <L en="Search another city" id="Cari kota lain" />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-text-muted">
          <L en="or try:" id="atau coba:" />
          {TRY.filter((t) => t !== s.slug && bySlug.has(t))
            .slice(0, 5)
            .map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSlug(t)}
                className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
              >
                {bySlug.get(t)!.name}
              </button>
            ))}
        </div>
      </section>

      <IndonesiaMap
        regions={regions}
        geometry={geometry}
        metric={mapMetric}
        selected={s.slug}
        onSelect={(next) => {
          if (bySlug.has(next)) {
            setSlug(next);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
        header={
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">
                <L en="Warming rate, °C per decade" id="Laju pemanasan, °C per dekade" />
              </p>
              <h2 className="mt-1.5 font-display text-2xl font-semibold">
                <L en="Where is it warming fastest?" id="Di mana pemanasan paling cepat?" />
              </h2>
            </div>
            <p className="text-sm text-text-muted">
              <L en="Click a city to see its answer above." id="Klik kota untuk melihat jawabannya di atas." />
            </p>
          </div>
        }
      />
    </>
  );
}
