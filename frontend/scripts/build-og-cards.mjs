/**
 * Render one share card per city, at build time, to public/og/<slug>.png.
 *
 * Why a script and not app/city/[slug]/opengraph-image.tsx: that file
 * convention works under output:"export" and renders fine, but it emits the
 * image at a URL with NO file extension, which GitHub Pages serves as
 * application/octet-stream — and every crawler rejects a card that is not
 * typed as an image. Writing real .png files sidesteps that entirely.
 *
 * Runs as `prebuild`, so `npm run build` picks it up locally and in CI without
 * anyone remembering to. It reads the same public/data the pages read, and the
 * same colour ramp the fingerprint uses, so a card cannot show a different
 * picture from the page it links to.
 *
 * Two images per city: the 1200×630 link card (og:image) and a 1080×1350
 * story card under og/story/ offered by the city page's Share menu. Both lead
 * with the city's warming stripes and its first-vs-last-decade change, in
 * Indonesian, the site's default language.
 *
 * Cost, measured: ~70ms per card, so ~7s for 90 cities. The PNGs are only ever
 * fetched by crawlers and social unfurlers, never by a visitor, so they add
 * nothing to what a reader downloads.
 */
import { ImageResponse } from "next/og.js";
import fs from "node:fs/promises";
import path from "node:path";

const DATA = path.join(process.cwd(), "public", "data");
const OUT = path.join(process.cwd(), "public", "og");

const RAMPS = JSON.parse(
  await fs.readFile(
    path.join(process.cwd(), "src", "components", "fingerprint", "ramps.json"),
    "utf8",
  ),
);

/** Years shown on the card. Enough to read as a fingerprint, few enough that
 *  each row is still a visible band at thumbnail size. */
const CARD_YEARS = 24;

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/**
 * Piecewise-linear walk through the ramp stops.
 *
 * d3.interpolateRgbBasis (what the app uses) is a B-spline through the same
 * stops, so this is very slightly different in the middle of each segment —
 * imperceptible at 34px-wide cells, and worth not pulling d3 into a build
 * script for.
 */
function ramp(stops, t) {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(Math.floor(x), stops.length - 2);
  const f = x - i;
  const a = hex(stops[i]);
  const b = hex(stops[i + 1]);
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`;
}

const readJson = async (p) =>
  JSON.parse(await fs.readFile(path.join(DATA, p), "utf8"));

const STRIPES = await readJson("stripes.json").catch(() => null);
const stripeBySlug = new Map((STRIPES?.results ?? []).map((s) => [s.slug, s]));

/** Same ±2 °C fixed domain as components/fingerprint/color-scale.ts. */
const STRIPE_DOMAIN = 2;
const stripeColor = (a) =>
  a === null ? "#2a251e" : ramp(RAMPS.anomaly_diverging, (a + STRIPE_DOMAIN) / (2 * STRIPE_DOMAIN));

/** First vs last ten years of the stripes, as components/city/stripe-stats. */
function decadeChange(s) {
  const mean = (xs) => {
    const v = xs.filter((x) => x !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const early = mean(s.anomalies.slice(0, 10));
  const recent = mean(s.anomalies.slice(-10));
  if (early === null || recent === null) return null;
  return recent - early;
}

/** "2,1" — Indonesian decimal comma. The sign is rendered separately in the
 *  sans face: Fraunces' "+" draws incorrectly in satori and read as a minus. */
const idAbs = (v) => Math.abs(v).toFixed(1).replace(".", ",");
const sign = (v) => (v < 0 ? "−" : "+");
const signedFigure = (v, fontSize, color) =>
  el("div", { display: "flex", alignItems: "baseline", color, lineHeight: 1 }, [
    el("div", { fontSize: fontSize * 0.8, fontFamily: "Plus Jakarta Sans" }, sign(v)),
    el("div", { fontSize, fontFamily: DISPLAY }, `${idAbs(v)} °C`),
  ]);

/** Fraunces for the display text, fetched once as TTF (satori cannot read
 *  woff2). Falls back to the renderer's default sans if unavailable, so a
 *  build never fails on a font download. */
async function loadFont(family, weight) {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; og-builder)" },
      })
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url)).arrayBuffer();
  } catch {
    return null;
  }
}
const frauncesBold = await loadFont("Fraunces", 600);
const jakartaSans = await loadFont("Plus+Jakarta+Sans", 500);
// Order matters: satori uses the first font for any text without an explicit
// fontFamily, so the UI sans goes first and Fraunces is opted into.
const FONTS = [
  ...(jakartaSans ? [{ name: "Plus Jakarta Sans", data: jakartaSans, weight: 500, style: "normal" }] : []),
  ...(frauncesBold ? [{ name: "Fraunces", data: frauncesBold, weight: 600, style: "normal" }] : []),
];
const DISPLAY = frauncesBold ? "Fraunces" : "serif";

const el = (type, style, children) => ({ type, props: { style, children } });

function stripeRow(s, height) {
  return el(
    "div",
    { display: "flex", width: "100%", height },
    s.anomalies.map((a) => el("div", { flex: 1, height: "100%", background: stripeColor(a) })),
  );
}

async function card(region) {
  const fp = await readJson(`fingerprint/${region.slug}/precipitation.json`);
  const hi = fp.stats.p90 ?? fp.stats.max ?? 1;
  const s = stripeBySlug.get(region.slug);
  const delta = s ? decadeChange(s) : null;

  const years = [...new Set(fp.data.map((d) => d.year))]
    .filter((y) => fp.data.some((d) => d.year === y && d.value !== null))
    .sort((a, b) => b - a)
    .slice(0, CARD_YEARS);

  const cell = (y, m) => {
    const v = fp.data.find((d) => d.year === y && d.month === m)?.value ?? null;
    return v === null ? "#2a251e" : ramp(RAMPS.precipitation, v / hi);
  };

  const grid = el(
    "div",
    { display: "flex", flexDirection: "column", gap: 3 },
    years.map((y) =>
      el(
        "div",
        { display: "flex", gap: 3 },
        Array.from({ length: 12 }, (_, i) =>
          el("div", { width: 30, height: 12, borderRadius: 2, background: cell(y, i + 1) }),
        ),
      ),
    ),
  );

  const text = el(
    "div",
    { display: "flex", flexDirection: "column", gap: 14, flex: 1 },
    [
      el("div", { color: "#9a8f7c", fontSize: 22, letterSpacing: 4, textTransform: "uppercase" }, region.province),
      el("div", { color: "#f7f3ea", fontSize: 76, lineHeight: 1.02, fontFamily: DISPLAY }, region.name),
      delta !== null
        ? el("div", { display: "flex", alignItems: "baseline", gap: 14, marginTop: 6 }, [
            signedFigure(delta, 64, "#f5a868"),
            el("div", { color: "#b5aa97", fontSize: 24, maxWidth: 300, lineHeight: 1.3 }, "suhu siang hari dibanding tahun 1950-an"),
          ])
        : el("div", { color: "#b5aa97", fontSize: 26 }, "Sidik iklim sejak 1950"),
      el("div", { color: "#9a8f7c", fontSize: 21, marginTop: 6 }, "ClimateWatch · reanalisis ERA5"),
    ],
  );

  return new ImageResponse(
    el("div", { width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#12100c" }, [
      el("div", { display: "flex", flex: 1, padding: "48px 56px", gap: 48, alignItems: "center" }, [text, grid]),
      s ? stripeRow(s, 70) : el("div", { display: "flex" }, []),
    ]),
    { width: 1200, height: 630, fonts: FONTS },
  );
}

/** 4:5 story card (1080×1350) for Instagram, TikTok and WhatsApp status:
 *  the city's stripes as the hero, the headline number, the source on it. */
async function storyCard(region) {
  const s = stripeBySlug.get(region.slug);
  if (!s) return null;
  const delta = decadeChange(s);
  const lastYear = s.year_from + s.anomalies.length - 1;
  return new ImageResponse(
    el("div", { width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0c0a07" }, [
      el("div", { display: "flex", flexDirection: "column", padding: "72px 72px 0", gap: 10 }, [
        el("div", { color: "#9a8f7c", fontSize: 26, letterSpacing: 5, textTransform: "uppercase" }, `ClimateWatch · ${s.year_from}–${lastYear}`),
        el("div", { color: "#f7f3ea", fontSize: 120, lineHeight: 1, fontFamily: DISPLAY, marginTop: 14 }, region.name),
        el("div", { color: "#b5aa97", fontSize: 32 }, region.province),
      ]),
      el("div", { display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", padding: "0 72px", gap: 18 }, [
        delta !== null
          ? signedFigure(delta, 190, "#f5a868")
          : el("div", {}, ""),
        el(
          "div",
          { color: "#f7f3ea", fontSize: 40, lineHeight: 1.3, maxWidth: 860 },
          delta !== null
            ? `Suhu siang hari di ${region.name} kini ${delta >= 0 ? "lebih panas" : "lebih sejuk"} daripada tahun 1950-an.`
            : `Catatan iklim ${region.name} sejak 1950.`,
        ),
      ]),
      stripeRow(s, 330),
      el("div", { display: "flex", justifyContent: "space-between", padding: "22px 72px 30px", color: "#9a8f7c", fontSize: 22 }, [
        el("div", {}, "Tiap garis = satu tahun · biru lebih sejuk, oranye lebih panas dari 1951–1980"),
      ]),
      el("div", { display: "flex", justifyContent: "space-between", padding: "0 72px 48px", color: "#9a8f7c", fontSize: 22 }, [
        el("div", {}, "Data: Open-Meteo ERA5 · CC BY 4.0"),
        el("div", {}, "andifathulms.github.io/climatewatch"),
      ]),
    ]),
    { width: 1080, height: 1350, fonts: FONTS },
  );
}

const regions = await readJson("regions.json");
const loaded = regions.filter((r) => r.has_data);
await fs.mkdir(OUT, { recursive: true });

const t0 = Date.now();
let bytes = 0;
await fs.mkdir(path.join(OUT, "story"), { recursive: true });
for (const region of loaded) {
  const buf = Buffer.from(await (await card(region)).arrayBuffer());
  await fs.writeFile(path.join(OUT, `${region.slug}.png`), buf);
  bytes += buf.length;
  const story = await storyCard(region);
  if (story) {
    const sb = Buffer.from(await story.arrayBuffer());
    await fs.writeFile(path.join(OUT, "story", `${region.slug}.png`), sb);
    bytes += sb.length;
  }
}
console.log(
  `og-cards: ${loaded.length} rendered in ${((Date.now() - t0) / 1000).toFixed(1)}s, ` +
    `${(bytes / 1024 / 1024).toFixed(1)} MB total`,
);
