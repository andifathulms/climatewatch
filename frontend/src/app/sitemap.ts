import type { MetadataRoute } from "next";
import { api } from "@/lib/api";

/**
 * Built from the same api.allRegions() call that generateStaticParams uses to
 * decide which city pages exist — so the sitemap cannot list a page that was
 * not built, or miss one that was. A hand-maintained list would drift the
 * first time a city was added.
 *
 * Without this, 90 city pages were reachable only by crawling links from the
 * home page, which links 8 featured cities plus the map markers.
 */
export const dynamic = "force-static";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://andifathulms.github.io/climatewatch";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const regions = await api.allRegions().catch(() => []);

  const staticRoutes = ["", "/rankings", "/compare", "/about"].map((path) => ({
    url: `${SITE}${path}/`,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const cityRoutes = regions
    .filter((r) => r.has_data)
    .map((r) => ({
      url: `${SITE}/city/${r.slug}/`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  return [...staticRoutes, ...cityRoutes];
}
