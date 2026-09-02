"use client";

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { AppConsole } from './AppConsole'

const CinematicScroll = dynamic(
  () => import('./CinematicScroll').then(m => m.CinematicScroll),
  { ssr: false }
)

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
          STRAYPAW / FIELD CONSOLE
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
          Every sighting becomes<br />a coordinated response.
        </h2>
        <p style={{
          fontSize: 16,
          lineHeight: 1.65,
          color: 'rgba(168,221,208,.65)',
          maxWidth: 520,
          marginBottom: 52,
        }}>
          One observation enters the map. The network surfaces the nearest vet,
          shelter, and volunteer. A route forms. Help arrives.
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

export function LandingShell() {
  return (
    <div style={{ background: '#070b11' }}>
      <CinematicScroll />
      <PlatformSection />
    </div>
  )
}

export default LandingShell
