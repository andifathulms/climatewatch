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
        // Editorial display scale — tight leading, negative tracking.
        display: [
          "clamp(2.75rem, 7vw, 5.25rem)",
          { lineHeight: "0.95", letterSpacing: "-0.035em" },
        ],
        hero: [
          "clamp(2rem, 4.5vw, 3.25rem)",
          { lineHeight: "1.03", letterSpacing: "-0.03em" },
        ],
        title: [
          "clamp(1.5rem, 2.4vw, 2rem)",
          { lineHeight: "1.12", letterSpacing: "-0.02em" },
        ],
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
