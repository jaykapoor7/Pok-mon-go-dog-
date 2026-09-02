"use client";

import { useEffect, useRef, useState } from 'react'
import './cinematic-scroll.css'

// Narrative: TV hook → problem (scale) → solution (one sighting + dog) → every stray has a story
const FRAMES = ['01', '05', '04', '11']
const TOTAL = FRAMES.length
const HOLD = 0.05 // nearly zero — crossfade starts almost immediately

const HUD: ({ coord: string; stage: string } | null)[] = [
  null,
  { coord: 'CITY PULSE ACTIVE', stage: 'THE PROBLEM' },
  { coord: '28.7041°N  77.1025°E', stage: 'ONE SIGHTING · ONE SOLUTION' },
  null,
]

const smootherstep = (n: number) => {
  const t = Math.max(0, Math.min(1, n))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

export function CinematicScroll({ onComplete }: { onComplete?: () => void }) {
  const ref = useRef<HTMLElement>(null)
  const done = useRef(false)
  const [op, setOp] = useState<number[]>(() =>
    Array.from({ length: TOTAL }, (_, i) => (i === 0 ? 1 : 0))
  )
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = ref.current
      if (el) {
        const rect = el.getBoundingClientRect()
        const scrollable = Math.max(1, rect.height - window.innerHeight)
        const p = Math.max(0, Math.min(1, -rect.top / scrollable))
        const n = TOTAL - 1
        const raw = p * n
        const i = Math.min(n - 1, Math.floor(raw))
        const j = Math.min(n, i + 1)
        const t = raw - i
        let ai: number, aj: number
        if (t < HOLD) {
          ai = 1; aj = 0
        } else {
          const s = smootherstep((t - HOLD) / (1 - HOLD))
          ai = 1 - s; aj = s
        }
        if (p >= 1) {
          const x = Array(TOTAL).fill(0); x[TOTAL - 1] = 1
          setOp(x); setFrame(TOTAL - 1)
        } else {
          const x = Array(TOTAL).fill(0); x[i] = ai; x[j] = aj
          setOp(x); setFrame(aj > 0.5 ? j : i)
        }
        if (p > 0.9 && !done.current) { done.current = true; onComplete?.() }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onComplete])

  const hud = HUD[frame]

  return (
    <section ref={ref} className="cscroll-section" aria-label="StrayPaw cinematic entrance">
      <div className="cscroll-sticky">
        {Array.from({ length: TOTAL }, (_, idx) => (
          <div
            key={idx}
            className="cscroll-frame"
            style={{ opacity: op[idx], zIndex: idx }}
          >
            <img
              src={`/cinematic/frame-${FRAMES[idx]}.jpg`}
              alt=""
              loading={idx <= 1 ? 'eager' : 'lazy'}
              decoding={idx <= 1 ? 'sync' : 'async'}
              draggable={false}
            />
          </div>
        ))}

        {frame > 0 && <div className="cscroll-vignette" aria-hidden="true" />}

        {hud && (
          <div className="cscroll-hud" aria-hidden="true">
            <div className="cscroll-hud-top">
              <span>STRAYPAW / DELHI</span>
              <span>{hud.coord}</span>
            </div>
            <div className="cscroll-hud-btm">
              <span>{String(frame + 1).padStart(2, '0')} / {TOTAL}</span>
              <span>{hud.stage}</span>
            </div>
          </div>
        )}

        <div className="cscroll-sr" role="img" aria-label="StrayPaw cinematic: from one sighting to a connected network">
          <h1>StrayPaw — every stray has a story.</h1>
          <p>Scroll to experience the journey from one animal to a connected infrastructure.</p>
        </div>
      </div>
    </section>
  )
}

export default CinematicScroll
