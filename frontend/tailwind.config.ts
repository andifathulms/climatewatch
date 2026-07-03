import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Musim design system — mapped to CSS variables in tokens.css
        "earth-cream": "var(--earth-cream)",
        surface: "var(--surface)",
        "surface-muted": "var(--surface-muted)",
        border: "var(--border)",
        "rain-blue": "var(--rain-blue)",
        "rain-light": "var(--rain-light)",
        "heat-orange": "var(--heat-orange)",
        "heat-light": "var(--heat-light)",
        "drought-amber": "var(--drought-amber)",
        "enso-nino": "var(--enso-nino)",
        "enso-nina": "var(--enso-nina)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
      },
      fontFamily: {
        mono: ["var(--font-mono)", "DM Mono", "monospace"],
        serif: ["var(--font-serif)", "Lora", "serif"],
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
