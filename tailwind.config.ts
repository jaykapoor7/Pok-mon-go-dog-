import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1440px' },
    },
    extend: {
      colors: {
        /* ── StrayPaw: Signal / Street / System ────────────────────────
           Infrastructure and intelligence, not charity software. */
        ink: '#0b1020',        // midnight, primary dark ground
        slate: '#10182b',      // console surface
        steel: '#17243b',      // raised panel
        line: '#30496e',       // structural border on dark
        paper: '#f4f5f7',      // light ground
        bone: '#dce2e8',       // light secondary surface
        electric: '#8fb7ff',   // primary accent, signal blue
        vermilion: '#ff6a4f',  // urgency / gap / attention
        cyan: '#66c5d5',       // field / in-progress
        violet: '#a68cff',     // study / research

        /* legacy tokens, remapped onto the new palette so every page that
           still references them picks up the redesign without edits */
        night: '#10182b',
        saffron: '#8fb7ff',
        mint: '#66c5d5',
        danger: '#ff6a4f',
        /* paw = the electric family. 300 is the accent itself; 500/600 run
           dark enough to carry white text (btn-primary is bg-paw-500). */
        paw: {
          50: '#f0f5ff', 100: '#dfeaff', 200: '#c4d8ff', 300: '#8fb7ff',
          400: '#5f8ff5', 500: '#3a6fe0', 600: '#2b56b8', 700: '#244696',
          800: '#223f78', 900: '#1e3560',
        },
        bark: {
          50: '#f6f8fb', 100: '#eef1f6', 200: '#e1e6ef', 300: '#c6cddb',
          /* 400 is the app's muted-text step (~270 usages). At its old
             #97a0b2 it scored 2.63:1 on white, unreadable. Darkened to clear
             4.5:1 on white, bark-50 and bark-100; dark mode gets the original
             light value back via a .dark override in globals.css. */
          400: '#656e7b', 500: '#616a79', 600: '#4d5564', 700: '#39404e',
          800: '#1b2436', 900: '#0f1626', 950: '#0a0f1a',
        },
        cream: '#eaf1fb',
        paper2: '#fbfdff',
        'ink-surface': '#1b2436',
        status: {
          seen: '#9a9c88', hungry: '#d9a441', injured: '#c0492e',
          sterilised: '#3e8473', vaccinated: '#4e8a5f', friendly: '#8b5ea8',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Instrument Serif', 'ui-serif', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'DM Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.012em',
        display: '-0.06em',
        signal: '0.14em',
        micro: '0.2em',
      },
      borderRadius: {
        signal: '4px',
        hud: '2px',
      },
      boxShadow: {
        console: '0 30px 55px rgba(11,16,32,.15)',
        panel: '0 22px 45px rgba(11,16,32,.16)',
        lift: '0 14px 30px rgba(11,16,32,.14)',
        modal: '0 30px 80px rgba(0,0,0,.3)',
        'electric-glow': '0 0 28px rgba(143,183,255,.42)',
        'vermilion-glow': '0 0 24px rgba(255,106,79,.32)',
        /* legacy */
        warm: '0 1px 2px rgba(59,125,230,.18), 0 8px 24px -12px rgba(59,125,230,.22)',
        card: '0 1px 2px rgba(17,17,19,.04), 0 14px 34px -18px rgba(17,17,19,.18)',
        sheet: '0 -8px 40px -16px rgba(17,17,19,.28)',
        pop: '0 12px 36px -14px rgba(17,17,19,.30)',
      },
      backgroundImage: {
        'grid-fine':
          'linear-gradient(rgba(143,183,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(143,183,255,.08) 1px, transparent 1px)',
        'grid-faint':
          'linear-gradient(rgba(143,183,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(143,183,255,.035) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-18': '18px 18px',
        'grid-32': '32px 32px',
        'grid-44': '44px 44px',
        'grid-64': '64px 64px',
      },
      transitionTimingFunction: {
        /* causal motion, under 300ms, decisive */
        signal: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'signal-morph': 'cubic-bezier(0.77, 0, 0.175, 1)',
        'signal-spring': 'cubic-bezier(0.16, 1.36, 0.3, 1)',
      },
      keyframes: {
        'signal-pulse': {
          '0%': { transform: 'scale(.92)', opacity: '.8' },
          '70%, 100%': { transform: 'scale(1.35)', opacity: '0' },
        },
        'orbit-spin': {
          from: { transform: 'rotateX(67deg) rotateZ(0deg)' },
          to: { transform: 'rotateX(67deg) rotateZ(360deg)' },
        },
        'core-float': {
          '0%, 100%': { transform: 'translate3d(0,0,60px)' },
          '50%': { transform: 'translate3d(0,-12px,88px)' },
        },
        'rail-pulse': {
          '0%, 100%': { opacity: '.22' },
          '50%': { opacity: '.82' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'signal-pulse': 'signal-pulse 2.8s ease-out infinite',
        'orbit-spin': 'orbit-spin 20s linear infinite',
        'core-float': 'core-float 6s ease-in-out infinite',
        'rail-pulse': 'rail-pulse 3.4s ease-in-out infinite',
        'rise-in': 'rise-in .7s cubic-bezier(.23,1,.32,1) both',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
}

export default config
