import type { Metadata } from "next";

/**
 * Build a route's canonical + share cards from one title/description pair.
 *
 * Exists because Next replaces an inherited `openGraph` object wholesale when
 * a child route defines its own — it does not deep-merge — so every route that
 * set an og:title silently dropped the root's og:image and fell back to a
 * text-only card. Repeating the image and card type by hand in five places is
 * exactly how a share card drifts from the page it points at, so it is
 * assembled here instead, once.
 */
const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "ClimateWatch — Indonesian climate, one picture per city",
};

export function routeMetadata({
  title,
  description,
  path,
  cardTitle,
  image,
  type = "website",
}: {
  /** The <title>. */
  title: string;
  /** Used for the meta description, the og description and the tweet. */
  description: string;
  /** Route path, leading slash, no trailing slash. Resolved against metadataBase. */
  path: string;
  /** Optional longer title for the share card, where there is more room. */
  cardTitle?: string;
  /** Per-page card. City pages pass their own, generated at build time from
   *  that city's real fingerprint; everything else falls back to the site card. */
  image?: string;
  type?: "website" | "article";
}): Metadata {
  const social = cardTitle ?? title;
  const card = image ? { ...OG_IMAGE, url: image, alt: social } : OG_IMAGE;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: "ClimateWatch",
      locale: "en",
      url: path,
      title: social,
      description,
      images: [card],
    },
    twitter: {
      card: "summary_large_image",
      title: social,
      description,
      images: [card.url],
    },
  };
}
