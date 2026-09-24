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
        /* shadcn/ui's semantic names, pointed at the CSS variables defined
           at the foot of globals.css. Values are StrayPaw's palette, so the
           components inherit this app's identity rather than importing a
           second one. */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        chart: {
          1: 'hsl(var(--chart-1))', 2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))', 4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
        /* ── StrayPaw: Signal / Street / System ────────────────────────
           Infrastructure and intelligence, not charity software. */
        /* Remapped onto the StrayPaw tokens (src/app/tokens.css) so every
           page still written in these names wears the same palette as the
           redesigned ones: navy ink, warm paper and bone, one blue, one flame. */
        ink: '#0b1e3d',        // --sp-ink
        slate: '#0e2240',      // console surface, navy
        steel: '#163056',      // raised panel on navy
        line: '#2c4a78',       // structural border on dark
        paper: '#fffdf9',      // --sp-paper
        bone: '#eae0d2',       // --sp-shell
        electric: '#8fb7ff',   // --sp-sky, the blue on dark grounds
        vermilion: '#f05b40',  // --sp-flame
        cyan: '#66c5d5',       // field / in-progress
        violet: '#a68cff',     // study / research

        /* legacy tokens, remapped onto the new palette so every page that
           still references them picks up the redesign without edits */
        night: '#07142b',
        saffron: '#8fb7ff',
        mint: '#7fc9d6',
        danger: '#f05b40',
        /* paw = the electric family. 300 is the accent itself; 500/600 run
           dark enough to carry white text (btn-primary is bg-paw-500). */
        paw: {
          50: '#eef3fd', 100: '#dde7fb', 200: '#c8d4f0', 300: '#93aee9',
          400: '#5b82dc', 500: '#2457ce', 600: '#1b46b0', 700: '#16398f',
          800: '#132f73', 900: '#0f2659',
        },
        bark: {
          50: '#fbf8f3', 100: '#f4eee5', 200: '#e3d9ca', 300: '#cfc3b1',
          /* 400 is the app's muted-text step (~270 usages). At its old
             #97a0b2 it scored 2.63:1 on white, unreadable. Darkened once to
             clear 4.5:1 on white, bark-50 and bark-100 — but the marketing
             routes put it on the .sp scope's bone (#e4edf8), a darker ground
             than any of those, where #656e7b fell back to 4.37:1. It now
             clears 4.8:1 on bone as well, which is every surface it is
             actually used on. 500 moves with it so the ramp stays ordered.
             Dark mode gets the original light value back via a .dark
             override in globals.css. */
          400: '#5d6b7c', 500: '#4c5a6e', 600: '#42526b', 700: '#2c3d57',
          800: '#152a4a', 900: '#0b1e3d', 950: '#071630',
        },
        cream: '#f4eee5',
        paper2: '#fffdf9',
        'ink-surface': '#152a4a',
        status: {
          seen: '#9a9c88', hungry: '#d9a441', injured: '#b0432a',
          /* sterilised is also the share control's label colour, where it
             read 4.30:1 on the feed card. Only the feed shows that
             control, and the feed was empty in every audit run until it
             had sightings in it, so nothing had ever measured it. */
          sterilised: '#3a7b6b', vaccinated: '#4e8a5f', friendly: '#8b5ea8',
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
