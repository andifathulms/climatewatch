import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Musim Nokturnal — mapped to CSS variables in tokens.css
        canvas: "var(--canvas)",
        "canvas-deep": "var(--canvas-deep)",
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        "surface-muted": "var(--surface-muted)",
        "surface-inset": "var(--surface-inset)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",

        "rain-blue": "var(--rain-blue)",
        "rain-light": "var(--rain-light)",
        "heat-orange": "var(--heat-orange)",
        "heat-light": "var(--heat-light)",
        "drought-amber": "var(--drought-amber)",
        "enso-nino": "var(--enso-nino)",
        "enso-nina": "var(--enso-nina)",
        "null-cell": "var(--null-cell)",

        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Fraunces", "Georgia", "serif"],
        serif: ["var(--font-display)", "Fraunces", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
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
        rim: "var(--rim)",
        card: "var(--shadow)",
        float: "var(--shadow-lg)",
      },
      maxWidth: {
        prose: "68ch",
        shell: "76rem",
      },
      transitionTimingFunction: {
        ease: "var(--ease)",
      },
    },
  },
  plugins: [],
};

export default config;
