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
        // StrayPaw brand (Figma source of truth). `paw` = warm terracotta/rust —
        // the whole app re-skins from here. Values are lifted 1:1 from the Figma
        // Make design system (@theme tokens).
        paw: {
          50: "#fbf4ef",
          100: "#f5e3d7",
          200: "#eac6b2",
          300: "#dba184",
          400: "#cb7a56",
          500: "#b4552d", // primary
          600: "#97431f", // hover/active
          700: "#78371b",
          800: "#5e2c17",
          900: "#4c2513",
        },
        bark: {
          // Structural — warm gray/brown neutrals.
          50: "#f7f6f2",
          100: "#eeece5",
          200: "#ddd9cf",
          300: "#c4bfb3",
          400: "#a8a396",
          500: "#726c60",
          600: "#57524a",
          700: "#413d37",
          800: "#211f1a", // --ink-surface
          900: "#17150f", // --ink
          950: "#100e0a",
        },
        // Brand surfaces.
        cream: "#f1ece0",
        paper: "#f8f6f1",
        ink: "#17150f",
        "ink-surface": "#211f1a",
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
        warm: "0 1px 2px rgba(180, 85, 45, 0.2), 0 8px 24px -12px rgba(180, 85, 45, 0.22)",
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
