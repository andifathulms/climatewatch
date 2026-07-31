const isStaticExport = process.env.NEXT_PUBLIC_DATA_MODE === "static";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isStaticExport && {
    // GitHub Pages serves plain files — no Node server to run `next start`,
    // so this mode pre-renders every page to static HTML at build time.
    // NEXT_PUBLIC_BASE_PATH must match the value api.ts's static-mode
    // fetcher uses to reach /data/*.json under a GitHub Pages project path
    // (e.g. "/climatewatch" for a project site, "" for a user/org site).
    output: "export",
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
    images: { unoptimized: true },
    // Emit city/balikpapan/index.html instead of city/balikpapan.html —
    // GitHub Pages (and most static hosts) serve clean URLs reliably this
    // way, without depending on implicit .html extension resolution.
    trailingSlash: true,
  }),
};

export default nextConfig;
