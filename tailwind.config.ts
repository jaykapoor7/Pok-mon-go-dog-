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
        // Blue-on-white brand (v2). `paw` stays the token name so the whole app
        // re-skins from here — a clean, modern indigo-blue used sparingly for
        // primary actions/selected states, over a light, neutral cool-grey base.
        paw: {
          50: "#eef3ff",
          100: "#dce7ff", // --blue-tint
          200: "#bcd0ff",
          300: "#8fb0fb",
          400: "#5b86f0",
          500: "#3b63e0", // --blue (primary, AA on white)
          600: "#2f4fc0", // --blue-deep (active/hover)
          700: "#2842a0", // --blue-ink
          800: "#233a82",
          900: "#1f3168",
        },
        bark: {
          // Cool neutral greys — near-monochrome light base; hue is reserved for
          // the blue accent and semantic status.
          50: "#f7f8fa",
          100: "#eef0f4",
          200: "#e0e3ea",
          300: "#a8adba",
          400: "#6b7180", // AA muted on white; dark mode re-lightens it (globals.css)
          600: "#4b5160",
          700: "#363b47",
          800: "#1f232c", // --ink-surface
          900: "#141821", // --ink (deep slate bg)
          950: "#0d1017",
        },
        // Brand surfaces.
        cream: "#EEF2F8",
        paper: "#FBFCFE",
        ink: "#141821",
        "ink-surface": "#1f232c",
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
        warm: "0 8px 24px -10px rgba(59, 99, 224, 0.24)",
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
