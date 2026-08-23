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
        // StrayPaw v2 brand — premium light: soft azure `paw` accent over cool
        // near-white neutrals. Keeps the Figma layout; recolours the whole app
        // from these tokens.
        paw: {
          50: "#f0f6ff",
          100: "#dbe9ff",
          200: "#bdd7ff",
          300: "#90bcff",
          400: "#5f9af5",
          500: "#3b7de6", // primary (AA: white text)
          600: "#2f63c2", // hover/active
          700: "#274f9c",
          800: "#223f78",
          900: "#1e3560",
        },
        bark: {
          // Structural — cool near-white greys.
          50: "#f6f8fb",
          100: "#eef1f6",
          200: "#e1e6ef",
          300: "#c6cddb",
          400: "#97a0b2",
          500: "#6b7484",
          600: "#4d5564",
          700: "#39404e",
          800: "#1b2436", // --ink-surface
          900: "#0f1626", // --ink (deep navy-slate)
          950: "#0a0f1a",
        },
        // Brand surfaces.
        cream: "#eaf1fb",
        paper: "#fbfdff",
        ink: "#0f1626",
        "ink-surface": "#1b2436",
        // Status system. Markers + badges read from here.
        status: {
          seen: "#9a9c88",
          hungry: "#d9a441", // fed/amber
          injured: "#c0492e", // needs-help
          sterilised: "#3e8473",
          vaccinated: "#4e8a5f",
          friendly: "#8b5ea8", // adoptable
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
        warm: "0 1px 2px rgba(59, 125, 230, 0.18), 0 8px 24px -12px rgba(59, 125, 230, 0.22)",
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
