"use client";

import { CSSProperties, useEffect, useRef, useState } from 'react'
import './tvportal.css'

type PortalStyle = CSSProperties & {
  '--portal-progress'?: number
  '--tv-scale'?: number
  '--tv-rotate'?: string
  '--tv-blur'?: string
  '--tv-contrast'?: number
  '--tv-opacity'?: number
  '--screen-breach'?: number
  '--grain-opacity'?: number
  '--scanline-stretch'?: number
  '--chromatic-offset'?: string
  '--world-opacity'?: number
  '--white-fade'?: number
}

export type TvPortalProps = {
  screenSrc?: string
  screenIsImage?: boolean
  screenAlt?: string
  onWorldEntered?: () => void
  locationLabel?: string
  className?: string
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const smootherstep = (v: number) => {
  const t = clamp01(v)
  return t * t * t * (t * (t * 6 - 15) + 10)
}
const range = (p: number, a: number, b: number) =>
  smootherstep((p - a) / (b - a))

export function TvPortal({
  screenSrc = '/hero/street-branded.jpg',
  screenIsImage = true,
  screenAlt = 'Grainy footage of a Delhi street with a stray dog',
  onWorldEntered,
  locationLabel = 'DELHI / LIVE',
  className = '',
}: TvPortalProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const enteredRef = useRef(false)
  const [progress, setProgress] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    let frame = 0
    const update = () => {
      const section = sectionRef.current
      if (!section) return
      const rect = section.getBoundingClientRect()
      const scrollDistance = Math.max(1, rect.height - window.innerHeight)
      const next = clamp01(-rect.top / scrollDistance)
      setProgress(next)
      if (next > 0.82 && !enteredRef.current) {
        enteredRef.current = true
        onWorldEntered?.()
      }
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [onWorldEntered])

  const p = reducedMotion ? clamp01(progress > 0.12 ? 1 : 0) : progress

  const lock = range(p, 0.035, 0.075)
  const breach = range(p, 0.075, 0.18)
  const world = range(p, 0.145, 0.30)

  const style: PortalStyle = {
    '--portal-progress': p,
    '--tv-scale': 1 + breach * 8.5,
    '--tv-rotate': `${-3 + breach * 1.5}deg`,
    '--tv-blur': `${breach * 4}px`,
    '--tv-contrast': 1 + breach * 0.35,
    '--tv-opacity': 1 - world * 0.88,
    '--screen-breach': breach,
    '--grain-opacity': 0.16 + lock * 0.24 + breach * 0.12,
    '--scanline-stretch': 1 + breach * 9,
    '--chromatic-offset': `${breach * 12}px`,
    '--world-opacity': world,
    '--white-fade': breach,
  }

  return (
    <section
      ref={sectionRef}
      className={`tv-portal-section ${className}`}
      style={style}
      aria-label="StrayPaw cinematic entrance"
    >
      <div className="tv-portal-sticky">
        <div className="tv-gallery" aria-hidden="true" />

        <div className="portal-world" aria-hidden="true">
          <div className="delhi-street-layer" />
          <div className="rain-layer" />
          <div className="puddle-pulse" />
          <div className="world-coordinate">28.7041° N / 77.1025° E</div>
        </div>

        <div className="tv-portal-object">
          <div className="tv-shadow" />
          <div className="tv-set">
            <div className="tv-handle" />
            <div className="tv-bezel">
              <div className="tv-screen" role="img" aria-label={screenAlt}>
                {screenIsImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={screenSrc} alt="" draggable={false} />
                ) : (
                  <video
                    src={screenSrc}
                    autoPlay
                    muted
                    loop
                    playsInline
                    aria-hidden="true"
                  />
                )}
                <div className="screen-vignette" />
                <div className="screen-scanlines" />
                <div className="screen-grain" />
                <div className="screen-amber-lock" />
              </div>
              <div className="tv-controls">
                <span className="tv-knob tv-knob-large" />
                <span className="tv-knob tv-knob-small" />
                <span className="tv-led" />
              </div>
            </div>
            <div className="tv-foot tv-foot-left" />
            <div className="tv-foot tv-foot-right" />
          </div>
        </div>

        <div className="portal-hud" aria-hidden="true">
          <span className="hud-reticle" />
          <span className="hud-label">{locationLabel}</span>
          <span className="hud-label hud-signal">SIGNAL ACQUIRED</span>
        </div>

        <div className="portal-scroll-cue" aria-hidden="true">
          <span>SCROLL TO ENTER</span>
          <i />
        </div>

        <div className="portal-sr-copy">
          <h1>StrayPaw</h1>
          <p>Digital infrastructure for street animals.</p>
          <p>Scroll to enter the story.</p>
        </div>
      </div>
    </section>
  )
}

export default TvPortal
