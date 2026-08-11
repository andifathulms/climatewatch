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
const CARD_YEARS = 22;

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

async function card(region) {
  const fp = await readJson(`fingerprint/${region.slug}/precipitation.json`);
  const hi = fp.stats.p90 ?? fp.stats.max ?? 1;

  const years = [...new Set(fp.data.map((d) => d.year))]
    .filter((y) => fp.data.some((d) => d.year === y && d.value !== null))
    .sort((a, b) => b - a)
    .slice(0, CARD_YEARS);

  const cell = (y, m) => {
    const v = fp.data.find((d) => d.year === y && d.month === m)?.value ?? null;
    return v === null ? "#2a251e" : ramp(RAMPS.precipitation, v / hi);
  };

  const grid = {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "column", gap: 3 },
      children: years.map((y) => ({
        type: "div",
        props: {
          style: { display: "flex", gap: 3 },
          children: Array.from({ length: 12 }, (_, i) => ({
            type: "div",
            props: {
              style: {
                width: 34,
                height: 15,
                borderRadius: 2,
                background: cell(y, i + 1),
              },
            },
          })),
        },
      })),
    },
  };

  return new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#12100c",
          padding: 56,
          gap: 48,
          fontFamily: "sans-serif",
          alignItems: "center",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 18,
                flex: 1,
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      color: "#9a8f7c",
                      fontSize: 24,
                      letterSpacing: 4,
                      textTransform: "uppercase",
                    },
                    children: region.province,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: { color: "#f7f3ea", fontSize: 76, lineHeight: 1.05 },
                    children: region.name,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: { color: "#b5aa97", fontSize: 27, lineHeight: 1.35 },
                    // The years actually drawn, not fp.year_from/year_to —
                    // the grid is sliced to CARD_YEARS, and captioning it with
                    // the full record would describe an image the card is not
                    // showing.
                    children: `Rainfall ${years[years.length - 1]}–${years[0]}, one square per month`,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: { color: "#9a8f7c", fontSize: 22, marginTop: 8 },
                    children: "ClimateWatch · ERA5 reanalysis",
                  },
                },
              ],
            },
          },
          grid,
        ],
      },
    },
    { width: 1200, height: 630 },
  );
}

const regions = await readJson("regions.json");
const loaded = regions.filter((r) => r.has_data);
await fs.mkdir(OUT, { recursive: true });

const t0 = Date.now();
let bytes = 0;
for (const region of loaded) {
  const buf = Buffer.from(await (await card(region)).arrayBuffer());
  await fs.writeFile(path.join(OUT, `${region.slug}.png`), buf);
  bytes += buf.length;
}
console.log(
  `og-cards: ${loaded.length} rendered in ${((Date.now() - t0) / 1000).toFixed(1)}s, ` +
    `${(bytes / 1024 / 1024).toFixed(1)} MB total`,
);
