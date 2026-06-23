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
        // Warm, emotional palette — sunset & street-dog tones.
        paw: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        bark: {
          50: "#f6f5f4",
          100: "#e7e5e4",
          200: "#d6d3d1",
          400: "#a8a29e",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
          950: "#0f0d0c",
        },
        status: {
          seen: "#64748b",
          hungry: "#f59e0b",
          injured: "#ef4444",
          sterilised: "#8b5cf6",
          vaccinated: "#10b981",
          friendly: "#ec4899",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        warm: "0 10px 40px -12px rgba(234, 88, 12, 0.35)",
        card: "0 4px 24px -6px rgba(28, 25, 23, 0.12)",
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
      },
      animation: {
        "paw-pop": "paw-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "float-up": "float-up 1.6s ease-out forwards",
        "pulse-ring": "pulse-ring 1.8s ease-out infinite",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
