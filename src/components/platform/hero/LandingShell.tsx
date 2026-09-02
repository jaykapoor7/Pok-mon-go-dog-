"use client";

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { AppConsole } from './AppConsole'

// Lazy-load the heavyweight components to keep initial bundle light
const TvPortal = dynamic(() => import('./TvPortal').then(m => m.TvPortal), { ssr: false })
const DelhiCinematic = dynamic(() => import('./DelhiCinematic').then(m => m.DelhiCinematic), { ssr: false })

/* ─────────────────────────────────────────────────────────────────────────
   Platform section — shown after the cinematic world fades in.
   Displays the AppConsole dashboard + narrative copy.
───────────────────────────────────────────────────────────────────────── */
function PlatformSection() {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.08 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      style={{ background: '#070b11', padding: '100px 20px', minHeight: '100vh', display: 'flex', alignItems: 'center' }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <p style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 10,
          letterSpacing: '0.2em',
          color: '#e9ac42',
          marginBottom: 16,
        }}>
          STRAYPAW / DEMAND INTELLIGENCE
        </p>
        <h2 style={{
          fontFamily: 'Space Grotesk, Inter, ui-sans-serif, sans-serif',
          fontSize: 'clamp(2rem, 4vw, 3.25rem)',
          fontWeight: 800,
          lineHeight: 1.06,
          letterSpacing: '-0.02em',
          color: '#f4f1ea',
          marginBottom: 16,
        }}>
          Animal need mapped<br />to ₹ value and supply.
        </h2>
        <p style={{
          fontSize: 16,
          lineHeight: 1.65,
          color: 'rgba(168,221,208,.65)',
          maxWidth: 520,
          marginBottom: 52,
        }}>
          Every animal sighting becomes a measurable need. Needs aggregate
          into geographic demand. Demand gets matched to providers —
          NGOs, vets, rescuers — and tracked through to a funded outcome.
        </p>
        <AppConsole visible={visible} />
        <div style={{ display: 'flex', gap: 14, marginTop: 40, flexWrap: 'wrap' }}>
          <Link
            href="/map"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 9999,
              background: '#e9ac42',
              padding: '13px 28px',
              fontSize: 14,
              fontWeight: 600,
              color: '#070b11',
              textDecoration: 'none',
            }}
          >
            Open the app
          </Link>
          <Link
            href="/explore"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 9999,
              border: '1px solid rgba(168,221,208,.22)',
              padding: '13px 28px',
              fontSize: 14,
              fontWeight: 600,
              color: 'rgba(168,221,208,.75)',
              textDecoration: 'none',
            }}
          >
            See the data
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   LandingShell — root compositor
   TV Portal (320vh) → Delhi Cinematic (600vh) → Platform section
───────────────────────────────────────────────────────────────────────── */
export function LandingShell() {
  const [worldEntered, setWorldEntered] = useState(false)

  return (
    <div style={{ background: '#070b11' }}>
      <TvPortal
        screenSrc="/hero/street-branded.jpg"
        screenIsImage
        locationLabel="DELHI / LIVE"
        onWorldEntered={() => setWorldEntered(true)}
      />

      <DelhiCinematic
        dogTexture="/dog-anchor.webp"
        streetTexture="/delhi-street.webp"
        onConnection={() => {}}
      />

      <PlatformSection />
    </div>
  )
}

export default LandingShell
