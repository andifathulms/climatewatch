import type {
  RankingsResponse,
  RecordsResponse,
  StripeSeries,
  StripesResponse,
} from "./types";
import { formatNumber, MONTHS_LONG_EN, MONTHS_LONG_ID } from "./i18n";

/**
 * Short, shareable findings built from the export — a way in for readers
 * who arrive without a city in mind.
 *
 * Every story is a template around numbers read straight from the data;
 * nothing is hand-written per city, so re-exporting the data re-writes the
 * stories. Each names the rule it ranks by, and a story whose inputs are
 * missing is left out rather than filled with a placeholder.
 */
export interface Story {
  key: string;
  /** The city whose stripes illustrate the story (null → national stripes). */
  slug: string | null;
  href: string;
  kicker: { en: string; id: string };
  title: { en: string; id: string };
  body: { en: string; id: string };
}

const f = (v: number, lang: "en" | "id", d = 1, signed = false) =>
  formatNumber(v, lang, d, signed);

export function buildStories({
  stripes,
  rankings,
  records,
}: {
  stripes: StripesResponse | null;
  rankings: RankingsResponse | null;
  records: RecordsResponse | null;
}): Story[] {
  const out: Story[] = [];
  const bySlug = new Map<string, StripeSeries>(
    (stripes?.results ?? []).map((s) => [s.slug, s]),
  );
  const ranked = (rankings?.results ?? []).filter(
    (r) => r.warming_c_per_decade !== null && bySlug.has(r.region.slug),
  );

  // 1 — fastest warming.
  if (ranked.length) {
    const top = [...ranked].sort(
      (a, b) => (b.warming_c_per_decade ?? 0) - (a.warming_c_per_decade ?? 0),
    )[0];
    const w = top.warming_c_per_decade!;
    out.push({
      key: "fastest",
      slug: top.region.slug,
      href: `/city/${top.region.slug}`,
      kicker: { en: "Fastest warming", id: "Memanas paling cepat" },
      title: {
        en: `${top.region.name} is warming fastest`,
        id: `${top.region.name} memanas paling cepat`,
      },
      body: {
        en: `Its average daily high is rising ${f(w, "en", 2, true)} °C per decade, the steepest trend of ${ranked.length} cities.`,
        id: `Rata-rata suhu tertinggi hariannya naik ${f(w, "id", 2, true)} °C per dekade, tren paling curam dari ${ranked.length} kota.`,
      },
    });

    // 2 — least change.
    const calm = [...ranked].sort(
      (a, b) =>
        Math.abs(a.warming_c_per_decade ?? 0) - Math.abs(b.warming_c_per_decade ?? 0),
    )[0];
    const cw = calm.warming_c_per_decade!;
    out.push({
      key: "calmest",
      slug: calm.region.slug,
      href: `/city/${calm.region.slug}`,
      kicker: { en: "Least change", id: "Paling sedikit berubah" },
      title: {
        en: `${calm.region.name} has barely moved`,
        id: `${calm.region.name} nyaris tidak berubah`,
      },
      body: {
        en: `A trend of ${f(cw, "en", 2, true)} °C per decade, the smallest of any city. Coast, altitude and wind all shape how fast a place warms.`,
        id: `Tren ${f(cw, "id", 2, true)} °C per dekade, terkecil dari semua kota. Pesisir, ketinggian dan angin ikut menentukan seberapa cepat suatu tempat memanas.`,
      },
    });
  }

  // 3 — hottest single month on record.
  const hot = records?.month.hottest[0];
  if (hot && hot.month) {
    out.push({
      key: "hottest-month",
      slug: bySlug.has(hot.region.slug) ? hot.region.slug : null,
      href: `/city/${hot.region.slug}`,
      kicker: { en: "Record month", id: "Bulan rekor" },
      title: {
        en: `${MONTHS_LONG_EN[hot.month - 1]} ${hot.year} in ${hot.region.name}`,
        id: `${MONTHS_LONG_ID[hot.month - 1]} ${hot.year} di ${hot.region.name}`,
      },
      body: {
        en: `Days averaged a high of ${f(hot.value, "en")} °C for the whole month, the hottest month in any city since 1950.`,
        id: `Suhu tertinggi harian rata-rata ${f(hot.value, "id")} °C sebulan penuh, bulan terpanas di kota mana pun sejak 1950.`,
      },
    });
  }

  // 4 — the national picture.
  if (stripes && stripes.national.anomalies.length > 20) {
    const nat = stripes.national.anomalies;
    const y0 = stripes.national.year_from;
    let best = 0;
    nat.forEach((v, i) => {
      if (v > nat[best]) best = i;
    });
    const warmedCount = stripes.results.filter((s) => {
      const a = s.anomalies.filter((x): x is number => x !== null);
      const tail = a.slice(-10);
      return tail.length && tail.reduce((p, q) => p + q, 0) / tail.length > 0;
    }).length;
    out.push({
      key: "national",
      slug: null,
      href: "/rankings",
      kicker: { en: "Across Indonesia", id: "Seluruh Indonesia" },
      title: {
        en: `${warmedCount} of ${stripes.results.length} cities are running hotter`,
        id: `${warmedCount} dari ${stripes.results.length} kota kini lebih panas`,
      },
      body: {
        en: `Their last ten years average above their own 1951–1980 normal. The warmest year for the typical city was ${y0 + best}, at ${f(nat[best], "en", 1, true)} °C.`,
        id: `Rata-rata sepuluh tahun terakhirnya di atas normal 1951–1980 masing-masing. Tahun terhangat bagi kota pada umumnya adalah ${y0 + best}, ${f(nat[best], "id", 1, true)} °C.`,
      },
    });
  }

  // 5 — wettest.
  const wet = [...(rankings?.results ?? [])]
    .filter((r) => r.avg_annual_precipitation !== null)
    .sort((a, b) => (b.avg_annual_precipitation ?? 0) - (a.avg_annual_precipitation ?? 0))[0];
  if (wet) {
    const mm = wet.avg_annual_precipitation!;
    out.push({
      key: "wettest",
      slug: bySlug.has(wet.region.slug) ? wet.region.slug : null,
      href: `/city/${wet.region.slug}`,
      kicker: { en: "Wettest", id: "Terbasah" },
      title: {
        en: `${wet.region.name} gets the most rain`,
        id: `${wet.region.name} paling banyak hujan`,
      },
      body: {
        en: `${Math.round(mm).toLocaleString("en-US")} mm in an average year, about ${f(mm / 365, "en")} mm every day.`,
        id: `${Math.round(mm).toLocaleString("id-ID")} mm dalam setahun rata-rata, sekitar ${f(mm / 365, "id")} mm setiap hari.`,
      },
    });
  }

  // 6 — feels-like gap (only once the backfill has landed in the export).
  const feels = (rankings?.results ?? []).filter(
    (r) => r.avg_apparent_temp_max != null && r.avg_temp_max != null,
  );
  if (feels.length > 10) {
    const gap = [...feels].sort(
      (a, b) =>
        (b.avg_apparent_temp_max! - b.avg_temp_max!) -
        (a.avg_apparent_temp_max! - a.avg_temp_max!),
    )[0];
    const g = gap.avg_apparent_temp_max! - gap.avg_temp_max!;
    out.push({
      key: "feels",
      slug: bySlug.has(gap.region.slug) ? gap.region.slug : null,
      href: `/city/${gap.region.slug}`,
      kicker: { en: "Feels hotter", id: "Terasa lebih panas" },
      title: {
        en: `In ${gap.region.name}, humidity adds ${f(g, "en")} °C`,
        id: `Di ${gap.region.name}, kelembapan menambah ${f(g, "id")} °C`,
      },
      body: {
        en: `A typical afternoon reads ${f(gap.avg_temp_max!, "en")} °C on the thermometer but feels like ${f(gap.avg_apparent_temp_max!, "en")} °C, the widest gap of any city.`,
        id: `Siang hari biasa tercatat ${f(gap.avg_temp_max!, "id")} °C di termometer tetapi terasa ${f(gap.avg_apparent_temp_max!, "id")} °C, selisih terbesar di antara semua kota.`,
      },
    });
  }

  return out;
}
