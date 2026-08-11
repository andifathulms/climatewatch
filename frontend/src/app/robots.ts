import type { MetadataRoute } from "next";

/**
 * There was no robots.txt at all. Everything here is public read-only climate
 * data, so nothing is disallowed — the file exists to point crawlers at the
 * sitemap, which is the only way the 90 city pages get discovered without
 * following links from the home page.
 */
export const dynamic = "force-static";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://andifathulms.github.io/climatewatch";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
