import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/ui/SiteHeader";
import SiteFooter from "@/components/ui/SiteFooter";

/* Self-hosted via next/font — no render-blocking request to Google, no layout
   shift. Fraunces carries the editorial display voice; Inter the UI; JetBrains
   Mono every climate number (tabular by default). */
const display = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK"],
  display: "swap",
  variable: "--font-display",
});

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://iklim.id"),
  title: {
    default: "Iklim — Climate Intelligence for Indonesia",
    template: "%s — Iklim",
  },
  description:
    "75+ years of ERA5 climate data for any Indonesian city. See how rainfall, temperature, and extreme weather have actually changed.",
  openGraph: {
    type: "website",
    siteName: "Iklim",
    title: "Iklim — Climate Intelligence for Indonesia",
    description:
      "75+ years of ERA5 climate data for any Indonesian city, rendered as a Climate Fingerprint.",
  },
};

export const viewport: Viewport = {
  themeColor: "#12100c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="min-h-screen bg-canvas antialiased">
        {/* Skip link — the fingerprint is a long scroll target for keyboard users. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-text-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-canvas"
        >
          Skip to content
        </a>

        <SiteHeader />

        <main id="main" className="mx-auto max-w-shell px-5 pb-24 sm:px-8">
          {children}
        </main>

        <SiteFooter />
      </body>
    </html>
  );
}
