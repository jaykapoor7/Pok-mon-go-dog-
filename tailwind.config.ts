import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm terracotta accent on stone. `paw` stays the token name so the
        // whole app re-skins from here — a restrained, earthy clay used sparingly
        // for primary actions/selected states, over near-monochrome warm stone.
        paw: {
          50: "#fbf4ef",
          100: "#f5e3d7", // --clay-tint
          200: "#eac6b2",
          300: "#dba184",
          400: "#cb7a56",
          500: "#b4552d", // --clay (primary, AA on white)
          600: "#97431f", // --clay-deep (active/hover)
          700: "#78371b", // --clay-ink
          800: "#5e2c17",
          900: "#4c2513",
        },
        bark: {
          // Warm stone neutrals — near-monochrome base; hue is reserved for the
          // accent and semantic status, per the operational design bar.
          50: "#f7f6f2",
          100: "#eeece5",
          200: "#ddd9cf",
          300: "#a8a396",
          400: "#726c60", // darkened for AA contrast on stone; dark mode re-lightens it (globals.css)
          600: "#57524a",
          700: "#413d37",
          800: "#211f1a", // --ink-surface
          900: "#17150f", // --ink (warm charcoal bg)
          950: "#100e0a",
        },
        // Brand surfaces.
        cream: "#F1ECE0",
        paper: "#F8F6F1",
        ink: "#17150f",
        "ink-surface": "#211f1a",
        // Status system (olive-compatible). Markers + badges read from here.
        status: {
          seen: "#9A9C88",
          hungry: "#D9A441", // fed/amber
          injured: "#C0492E", // needs-help
          sterilised: "#3E8473",
          vaccinated: "#4E8A5F",
          friendly: "#C06A86", // adoptable
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      letterSpacing: {
        tightest: "-0.012em",
      },
      boxShadow: {
        // Soft, minimal elevation — premium, never noisy.
        warm: "0 8px 24px -10px rgba(180, 85, 45, 0.26)",
        card: "0 1px 2px rgba(17, 17, 19, 0.04), 0 14px 34px -18px rgba(17, 17, 19, 0.18)",
        sheet: "0 -8px 40px -16px rgba(17, 17, 19, 0.28)",
        pop: "0 12px 36px -14px rgba(17, 17, 19, 0.30)",
      },
      keyframes: {
        "paw-pop": {
          "0%": { transform: "scale(0) rotate(-20deg)", opacity: "0" },
          "60%": { transform: "scale(1.2) rotate(5deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        "float-up": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0.9" },
          "100%": { transform: "translateY(-120px) scale(0.4)", opacity: "0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.7" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        // Pokémon-Go-style floating markers.
        bob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "marker-pop": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "70%": { transform: "scale(1.18)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "ground-shadow": {
          "0%, 100%": { transform: "scaleX(1)", opacity: "0.32" },
          "50%": { transform: "scaleX(0.68)", opacity: "0.18" },
        },
      },
      animation: {
        "paw-pop": "paw-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "float-up": "float-up 1.6s ease-out forwards",
        "pulse-ring": "pulse-ring 1.8s ease-out infinite",
        shimmer: "shimmer 1.5s infinite",
        bob: "bob 2.6s ease-in-out infinite",
        "marker-pop": "marker-pop 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "ground-shadow": "ground-shadow 2.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
