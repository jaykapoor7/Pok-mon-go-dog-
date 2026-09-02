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
        // StrayPaw cinematic brand tokens
        ink: '#070b11',
        night: '#0d1721',
        paper: '#f4f1ea',
        saffron: '#e9ac42',
        saffronBright: '#f6c263',
        mint: '#a8ddd0',
        danger: '#e06455',
        steel: '#91a0a4',
        // legacy tokens kept for existing components
        paw: {
          50: '#f0f6ff', 100: '#dbe9ff', 200: '#bdd7ff', 300: '#90bcff',
          400: '#5f9af5', 500: '#3b7de6', 600: '#2f63c2', 700: '#274f9c',
          800: '#223f78', 900: '#1e3560',
        },
        bark: {
          50: '#f6f8fb', 100: '#eef1f6', 200: '#e1e6ef', 300: '#c6cddb',
          400: '#97a0b2', 500: '#6b7484', 600: '#4d5564', 700: '#39404e',
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
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'ui-sans-serif', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.012em',
        signal: '0.15em',
        micro: '0.2em',
      },
      borderRadius: {
        signal: '4px',
        hud: '2px',
      },
      boxShadow: {
        'saffron-glow': '0 0 28px rgba(233, 172, 66, 0.42)',
        'mint-glow': '0 0 24px rgba(168, 221, 208, 0.32)',
        'danger-glow': '0 0 24px rgba(224, 100, 85, 0.3)',
        crt: '0 24px 44px rgba(0,0,0,.34), inset 0 0 0 2px rgba(255,255,255,.08)',
        'hud-inset': 'inset 0 0 0 1px rgba(232,239,232,.16), inset 0 0 28px rgba(0,0,0,.28)',
        warm: '0 1px 2px rgba(59,125,230,.18), 0 8px 24px -12px rgba(59,125,230,.22)',
        card: '0 1px 2px rgba(17,17,19,.04), 0 14px 34px -18px rgba(17,17,19,.18)',
        sheet: '0 -8px 40px -16px rgba(17,17,19,.28)',
        pop: '0 12px 36px -14px rgba(17,17,19,.30)',
      },
      backgroundImage: {
        scanlines: 'repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,.12) 4px, transparent 5px)',
        'grid-fine': 'linear-gradient(rgba(168,221,208,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(168,221,208,.08) 1px, transparent 1px)',
        'cinematic-vignette': 'radial-gradient(ellipse at center, transparent 42%, rgba(2,5,8,.75) 100%)',
      },
      backgroundSize: {
        'grid-32': '32px 32px',
        'grid-64': '64px 64px',
      },
      transitionTimingFunction: {
        'signal-out': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'signal-morph': 'cubic-bezier(0.77, 0, 0.175, 1)',
        'signal-spring': 'cubic-bezier(0.16, 1.36, 0.3, 1)',
        'signal-inertia': 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      keyframes: {
        'grain-steps': {
          from: { backgroundPosition: '0 0' },
          to: { backgroundPosition: '0 -1152px' },
        },
        'rain-drift': { to: { backgroundPosition: '0 180px' } },
        'signal-pulse': {
          '0%, 100%': { transform: 'scale(0.88)', opacity: '0.5' },
          '50%': { transform: 'scale(1.12)', opacity: '1' },
        },
        'hud-flicker': {
          '0%, 100%': { opacity: '1' },
          '48%': { opacity: '0.82' },
          '50%': { opacity: '0.42' },
          '52%': { opacity: '0.94' },
        },
        'route-flow': {
          from: { strokeDashoffset: '1000' },
          to: { strokeDashoffset: '0' },
        },
        'paw-pop': {
          '0%': { transform: 'scale(0) rotate(-20deg)', opacity: '0' },
          '60%': { transform: 'scale(1.2) rotate(5deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      animation: {
        'grain-steps': 'grain-steps .75s steps(12) infinite',
        'rain-drift': 'rain-drift 1.2s linear infinite',
        'signal-pulse': 'signal-pulse 1.8s ease-in-out infinite',
        'hud-flicker': 'hud-flicker 4.5s steps(1) infinite',
        'route-flow': 'route-flow 2.4s linear infinite',
        'paw-pop': 'paw-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
        shimmer: 'shimmer 1.5s infinite',
        bob: 'bob 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
