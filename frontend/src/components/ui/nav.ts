/** One source for the site's sections, shared by header, tab bar and footer. */
export const NAV = [
  { href: "/", en: "Explore", id: "Jelajah" },
  { href: "/rankings", en: "Rankings", id: "Peringkat" },
  { href: "/compare", en: "Compare", id: "Bandingkan" },
  { href: "/stories", en: "Stories", id: "Cerita" },
  { href: "/about", en: "About the data", id: "Tentang data" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/city");
  return pathname.startsWith(href);
}
