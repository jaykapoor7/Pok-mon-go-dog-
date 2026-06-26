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
        // Olive brand palette (from the StrayPaw logo). `paw` stays the token
        // name so the whole app re-skins from here without per-component edits.
        paw: {
          50: "#f3f5ec",
          100: "#E9ECD9", // --olive-tint
          200: "#d7ddbd",
          300: "#b9c391",
          400: "#8f9c5f",
          500: "#6E7A45", // --olive (primary)
          600: "#515C30", // --olive-deep (active/hover)
          700: "#3D4522", // --olive-ink
          800: "#2f351a",
          900: "#232711",
        },
        bark: {
          50: "#f6f5f0",
          100: "#e7e6dd",
          200: "#d6d4c7",
          400: "#a3a292",
          600: "#54564a",
          700: "#3f4138",
          800: "#26271E", // --ink-surface
          900: "#1C1D17", // --ink (warm dark bg)
          950: "#121309",
        },
        // Brand surfaces.
        cream: "#F4F0E1",
        paper: "#FBF8EE",
        ink: "#1C1D17",
        "ink-surface": "#26271E",
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
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.03em",
      },
      boxShadow: {
        // Soft, minimal elevation — premium, never noisy.
        warm: "0 8px 24px -10px rgba(81, 92, 48, 0.34)",
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
