import type { Config } from "tailwindcss";

/**
 * A token colour that also honours Tailwind's opacity modifier.
 *
 * Every colour here is a CSS variable, and Tailwind cannot split a var() into
 * channels, so `bg-canvas/80` or `border-heat-light/60` used to generate
 * nothing at all: the header lost its translucency and several accents fell
 * back to the preflight grey. With a function, Tailwind passes the modifier
 * in and color-mix() applies it to the token itself.
 */
// Tailwind accepts colour functions at runtime; its published types only
// admit strings, hence the cast.
const token = (name: string) =>
  (({ opacityValue }: { opacityValue?: string }) =>
    opacityValue === undefined || opacityValue === "1"
      ? `var(--${name})`
      : `color-mix(in srgb, var(--${name}) calc(${opacityValue} * 100%), transparent)`) as unknown as string;

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Musim Nokturnal — mapped to CSS variables in tokens.css
        canvas: token("canvas"),
        "canvas-deep": token("canvas-deep"),
        surface: token("surface"),
        "surface-raised": token("surface-raised"),
        "surface-muted": token("surface-muted"),
        "surface-inset": token("surface-inset"),
        border: token("border"),
        "border-strong": token("border-strong"),

        "rain-blue": token("rain-blue"),
        "rain-light": token("rain-light"),
        "heat-orange": token("heat-orange"),
        "heat-light": token("heat-light"),
        "drought-amber": token("drought-amber"),
        "enso-nino": token("enso-nino"),
        "enso-nina": token("enso-nina"),
        "null-cell": token("null-cell"),

        "text-primary": token("text-primary"),
        "text-secondary": token("text-secondary"),
        "text-muted": token("text-muted"),
      },
      fontFamily: {
        display: ["var(--font-display)", "Fraunces", "Georgia", "serif"],
        serif: ["var(--font-display)", "Fraunces", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      fontSize: {
        // One type scale, defined once in tokens.css. These keys *override*
        // Tailwind's defaults rather than extending them, so `text-sm` can
        // never resolve to a value that isn't on the scale. Note xs is 14px
        // and 2xs (13px) is the floor — Tailwind's own 12px xs is gone.
        "2xs": ["var(--text-2xs)", { lineHeight: "var(--leading-snug)" }],
        xs: ["var(--text-xs)", { lineHeight: "var(--leading-snug)" }],
        sm: ["var(--text-sm)", { lineHeight: "var(--leading-normal)" }],
        base: ["var(--text-base)", { lineHeight: "var(--leading-normal)" }],
        lg: ["var(--text-lg)", { lineHeight: "var(--leading-relaxed)" }],
        xl: ["var(--text-xl)", { lineHeight: "var(--leading-tight)" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "var(--leading-tight)" }],
        "3xl": ["var(--text-3xl)", { lineHeight: "var(--leading-tight)" }],

        // Editorial display steps — tight leading, negative tracking.
        title: [
          "var(--text-title)",
          {
            lineHeight: "var(--leading-tight)",
            letterSpacing: "var(--tracking-tight)",
          },
        ],
        hero: [
          "var(--text-hero)",
          {
            lineHeight: "var(--leading-tight)",
            letterSpacing: "var(--tracking-tight)",
          },
        ],
        display: [
          "var(--text-display)",
          {
            lineHeight: "var(--leading-display)",
            letterSpacing: "var(--tracking-display)",
          },
        ],
      },
      spacing: {
        // Named rungs on the same 4px ramp Tailwind's numeric utilities walk.
        // For CSS-authored components that need the token by name.
        section: "var(--space-16)",
        gutter: "var(--space-5)",
      },
      boxShadow: {
        rim: token("rim"),
        card: token("shadow"),
        float: token("shadow-lg"),
      },
      maxWidth: {
        prose: "68ch",
        shell: "76rem",
      },
      transitionTimingFunction: {
        ease: token("ease"),
      },
    },
  },
  plugins: [],
};

export default config;
