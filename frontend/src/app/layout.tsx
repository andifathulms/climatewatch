import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Iklim — Climate Intelligence for Indonesia",
    template: "%s — Iklim",
  },
  description:
    "75+ years of ERA5 climate data for any Indonesian city. See how rainfall, temperature, and extreme weather have actually changed.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600&family=Lora:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-serif text-2xl font-bold tracking-tight">
              Iklim
            </Link>
            <nav className="flex gap-6 text-sm text-text-secondary">
              <Link href="/" className="hover:text-text-primary">Home</Link>
              <Link href="/compare" className="hover:text-text-primary">Compare</Link>
              <Link href="/about" className="hover:text-text-primary">About</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
