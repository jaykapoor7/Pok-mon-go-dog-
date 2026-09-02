"use client";

import { useEffect, useRef, useState } from 'react'

const C = {
  saffron: '#e9ac42',
  mint: '#a8ddd0',
  danger: '#e06455',
  ink: '#070b11',
  border: 'rgba(168,221,208,.08)',
  borderStrong: 'rgba(168,221,208,.14)',
  muted: 'rgba(168,221,208,.45)',
}

const CASES = [
  { id: 'SP-1042', status: 'NEEDS FOLLOW-UP', zone: 'Lajpat Nagar IV', color: C.saffron, pulse: true },
  { id: 'SP-1039', status: 'VET MATCHED', zone: 'Sarai Kale Khan', color: C.mint, pulse: false },
  { id: 'SP-1035', status: 'MONITORING', zone: 'CR Park', color: C.muted, pulse: false },
  { id: 'SP-1031', status: 'HELP REQUESTED', zone: 'Rohini Sec 3', color: C.danger, pulse: false },
]

const MAP_NODES = [
  { x: 30, y: 28, r: 28, label: '₹4.2L', color: C.saffron, selected: false },
  { x: 62, y: 22, r: 18, label: '₹2.8L', color: C.mint, selected: false },
  { x: 52, y: 52, r: 22, label: '₹3.4L', color: C.danger, selected: false },
  { x: 22, y: 62, r: 14, label: '₹1.6L', color: C.saffron, selected: false },
  { x: 76, y: 58, r: 16, label: '₹2.1L', color: C.mint, selected: false },
  { x: 44, y: 76, r: 12, label: '₹1.8L', color: C.saffron, selected: false },
]

const LIVE_FEED = [
  { time: '09:45', msg: 'Match: PFA Delhi → SP-1042', color: C.saffron },
  { time: '09:43', msg: 'Injured dog near Masjid Moth', color: C.danger },
  { time: '09:41', msg: 'SP-1039 — vet confirmed', color: C.mint },
  { time: '09:38', msg: '18 unsterilised animals, Rohini', color: C.muted },
]

const KPI = [
  { value: '65', label: 'SIGHTINGS', color: C.mint },
  { value: '12', label: 'ACTIVE CASES', color: C.saffron },
  { value: '38', label: 'RESOURCES', color: '#a8ddd0' },
  { value: '7', label: 'GAPS', color: C.danger },
]

export type AppConsoleProps = { className?: string; visible?: boolean }

export function AppConsole({ className = '', visible = true }: AppConsoleProps) {
  const [tick, setTick] = useState(0)
  const interval = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    if (!visible) return
    interval.current = setInterval(() => setTick(n => n + 1), 3800)
    return () => clearInterval(interval.current)
  }, [visible])

  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <div
      className={className}
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        background: C.ink,
        color: C.mint,
        borderRadius: 10,
        overflow: 'hidden',
        border: `1px solid ${C.borderStrong}`,
        display: 'grid',
        gridTemplateRows: '40px 1fr 100px',
        gridTemplateColumns: '1fr 220px',
        width: '100%',
        maxWidth: 960,
        height: 520,
        boxShadow: '0 32px 80px rgba(0,0,0,.72)',
      }}
    >
      {/* ── Top bar ── */}
      <div style={{
        gridColumn: '1 / -1',
        display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px',
        background: '#060a12', borderBottom: `1px solid ${C.border}`,
        fontSize: 9.5, letterSpacing: '0.16em',
      }}>
        <span style={{ color: C.saffron, fontWeight: 700 }}>STRAYPAW</span>
        <span style={{ color: C.muted }}>·</span>
        <span style={{ color: C.muted }}>LIVE DELHI</span>
        <span style={{ flex: 1 }} />
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
        <span style={{ color: C.muted }}>NETWORK LIVE</span>
        <span style={{ color: 'rgba(168,221,208,.25)' }}>|</span>
        <span style={{ color: C.saffron }}>{timeStr} IST</span>
        <span style={{ padding: '2px 6px', fontSize: 7.5, borderRadius: 2, background: 'rgba(233,172,66,.1)', border: '1px solid rgba(233,172,66,.2)', color: C.saffron }}>
          DEMO DATA
        </span>
      </div>

      {/* ── Centre — map canvas ── */}
      <div style={{ gridColumn: '1', gridRow: '2', position: 'relative', overflow: 'hidden', background: '#090d16' }}>
        {/* grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(168,221,208,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(168,221,208,.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          transform: 'perspective(600px) rotateX(12deg) scale(1.1)',
          transformOrigin: '50% 80%',
        }} />
        {/* street photo */}
        <div style={{
          position: 'absolute', inset: '-10%',
          backgroundImage: "url('/hero/street-branded.jpg')",
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'saturate(.2) brightness(.14) contrast(1.3)',
          transform: 'perspective(600px) rotateX(12deg) scale(1.12)',
          transformOrigin: '50% 80%',
        }} />
        {/* demand zones */}
        {MAP_NODES.map((z, i) => (
          <div key={i} style={{ position: 'absolute', left: `${z.x}%`, top: `${z.y}%`, transform: 'translate(-50%,-50%)' }}>
            <div style={{
              width: z.r * 2, height: z.r * 2, borderRadius: '50%',
              background: `${z.color}12`,
              border: `1px solid ${z.color}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 7, color: z.color, fontWeight: 700 }}>{z.label}</span>
            </div>
          </div>
        ))}
        {/* vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 80%, transparent 25%, rgba(7,11,17,.9) 100%)', pointerEvents: 'none' }} />
        {/* label */}
        <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 8, letterSpacing: '0.14em', color: C.muted }}>
          DEMAND MAP — DELHI NCR
        </div>
      </div>

      {/* ── Right panel — unified (no tabs) ── */}
      <div style={{
        gridColumn: '2', gridRow: '2',
        background: '#080c14', borderLeft: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          {KPI.map((k, i) => (
            <div key={k.label} style={{
              padding: '10px 12px',
              borderRight: i % 2 === 0 ? `1px solid ${C.border}` : 'none',
              borderBottom: i < 2 ? `1px solid ${C.border}` : 'none',
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: k.color, lineHeight: 1, letterSpacing: '-0.02em' }}>{k.value}</div>
              <div style={{ fontSize: 7, letterSpacing: '0.14em', color: 'rgba(168,221,208,.35)', marginTop: 3 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Active cases */}
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 7.5, letterSpacing: '0.16em', color: 'rgba(168,221,208,.3)', marginBottom: 7 }}>ACTIVE CASES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {CASES.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%', background: c.color, flexShrink: 0,
                  boxShadow: c.pulse ? `0 0 6px ${c.color}` : 'none',
                }} />
                <span style={{ fontSize: 8.5, color: c.color, flexShrink: 0, letterSpacing: '0.06em' }}>{c.id}</span>
                <span style={{ fontSize: 7.5, color: 'rgba(168,221,208,.45)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live feed */}
        <div style={{ flex: 1, padding: '10px 12px', overflow: 'hidden' }}>
          <div style={{ fontSize: 7.5, letterSpacing: '0.16em', color: 'rgba(168,221,208,.3)', marginBottom: 7 }}>LIVE FEED</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {LIVE_FEED.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 7, opacity: i === (tick % LIVE_FEED.length) ? 1 : 0.5, transition: 'opacity 0.6s ease' }}>
                <span style={{ fontSize: 7.5, color: 'rgba(168,221,208,.28)', flexShrink: 0 }}>{f.time}</span>
                <span style={{ fontSize: 8, color: f.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>{f.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom strip — live reports ── */}
      <div style={{
        gridColumn: '1 / -1', gridRow: '3',
        background: '#060a12', borderTop: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 0, overflow: 'hidden',
      }}>
        <div style={{ padding: '0 16px', flexShrink: 0 }}>
          <div style={{ fontSize: 7.5, letterSpacing: '0.14em', color: 'rgba(168,221,208,.3)' }}>COMMUNITY REPORTS</div>
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 20, padding: '0 8px', overflow: 'hidden' }}>
          {[
            { id: 'SP-1050', text: 'Dog sighted near Moolchand', color: C.mint },
            { id: 'SP-1049', text: 'Injured dog near Masjid Moth', color: C.danger },
            { id: 'SP-1048', text: 'Pack of 4, Sarai Kale Khan', color: C.mint },
            { id: 'SP-1047', text: 'Food request, CR Park', color: C.muted },
          ].map(r => (
            <div key={r.id} style={{ display: 'flex', gap: 7, flexShrink: 0, alignItems: 'center' }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
              <span style={{ fontSize: 8, color: r.color, letterSpacing: '0.08em' }}>{r.id}</span>
              <span style={{ fontSize: 8, color: 'rgba(168,221,208,.55)', letterSpacing: '0.06em' }}>{r.text}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '0 16px', flexShrink: 0, display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.mint, lineHeight: 1 }}>65</div>
            <div style={{ fontSize: 7, letterSpacing: '0.12em', color: 'rgba(168,221,208,.3)', marginTop: 2 }}>SIGHTINGS</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.saffron, lineHeight: 1 }}>12</div>
            <div style={{ fontSize: 7, letterSpacing: '0.12em', color: 'rgba(168,221,208,.3)', marginTop: 2 }}>CASES</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AppConsole
