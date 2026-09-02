"use client";

import { useEffect, useRef, useState } from 'react'

/* ─── Design tokens ──────────────────────────────────────────────────── */
const C = {
  saffron: '#e9ac42',
  mint: '#a8ddd0',
  danger: '#e06455',
  ink: '#070b11',
  night: '#0d1721',
  muted: 'rgba(168,221,208,.45)',
  border: 'rgba(168,221,208,.08)',
  borderStrong: 'rgba(168,221,208,.14)',
}

/* ─── Illustrative demand data ──────────────────────────────────────── */
const DEMAND_ITEMS = [
  { label: 'Sterilisation', animals: 260, value: 780000, color: C.mint },
  { label: 'Vaccination', animals: 320, value: 420000, color: C.saffron },
  { label: 'Medical care', animals: 180, value: 360000, color: C.danger },
  { label: 'Medicine/supplies', animals: 440, value: 180000, color: 'rgba(168,221,208,.6)' },
]
const TOTAL_DEMAND = 1840000
const TOTAL_ANIMALS = 1200

const PROVIDERS = [
  { name: 'PFA Delhi', type: 'NGO', services: ['Sterilisation', 'Rescue'], coverage: 92, active: true },
  { name: 'Friendicoes SECA', type: 'NGO', services: ['Medical', 'Shelter'], coverage: 78, active: true },
  { name: 'Delhi SPCA', type: 'NGO', services: ['All-service'], coverage: 85, active: true },
  { name: 'Care Animal Hospital', type: 'Vet', services: ['Medical'], coverage: 44, active: false },
  { name: 'Happy Paws Rescue', type: 'Community', services: ['Rescue'], coverage: 61, active: true },
]

const MAP_DEMAND_ZONES = [
  { x: 30, y: 28, r: 28, label: '₹4.2L', color: C.saffron },
  { x: 62, y: 22, r: 18, label: '₹2.8L', color: C.mint },
  { x: 52, y: 52, r: 22, label: '₹3.4L', color: C.danger },
  { x: 22, y: 62, r: 14, label: '₹1.6L', color: C.saffron },
  { x: 76, y: 58, r: 16, label: '₹2.1L', color: C.mint },
  { x: 44, y: 76, r: 12, label: '₹1.8L', color: C.saffron },
  { x: 72, y: 38, r: 10, label: '₹1.4L', color: C.mint },
]

const FEED = [
  { time: '09:41', msg: 'Match: PFA Delhi → SP-2847 (sterilisation, Lajpat Nagar)', type: 'match' },
  { time: '09:39', msg: 'Demand flagged: 18 unsterilised animals, Rohini Sec 3', type: 'demand' },
  { time: '09:27', msg: 'Outcome recorded — SP-2843 closed, vaccination confirmed', type: 'outcome' },
  { time: '09:18', msg: 'Provider joined: Care Animal Hospital, Dwarka (medical)', type: 'provider' },
]

const fmt = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(0)}K`

/* ─── Component ─────────────────────────────────────────────────────── */
export type AppConsoleProps = { className?: string; visible?: boolean }

export function AppConsole({ className = '', visible = true }: AppConsoleProps) {
  const [feedIndex, setFeedIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<'demand' | 'providers'>('demand')
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    if (!visible) return
    intervalRef.current = setInterval(() => setFeedIndex(i => (i + 1) % FEED.length), 3600)
    return () => clearInterval(intervalRef.current)
  }, [visible])

  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const maxDemand = Math.max(...DEMAND_ITEMS.map(d => d.value))

  return (
    <div
      className={className}
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        background: C.ink,
        color: C.mint,
        borderRadius: 12,
        overflow: 'hidden',
        border: `1px solid ${C.borderStrong}`,
        display: 'grid',
        gridTemplateRows: '44px 1fr 56px',
        gridTemplateColumns: '52px 1fr 230px',
        width: '100%',
        maxWidth: 960,
        height: 580,
        boxShadow: '0 32px 80px rgba(0,0,0,.72)',
      }}
    >
      {/* ── Top bar ── */}
      <div style={{
        gridColumn: '1 / -1', gridRow: '1',
        display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px',
        background: '#060a12', borderBottom: `1px solid ${C.border}`,
        fontSize: 10, letterSpacing: '0.16em',
      }}>
        <span style={{ color: C.saffron, fontWeight: 700 }}>STRAYPAW</span>
        <span style={{ color: C.muted }}>|</span>
        <span style={{ color: C.muted }}>DEMAND INTELLIGENCE</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: C.muted }}>DELHI NCR</span>
        <span style={{ color: C.muted }}>|</span>
        <span style={{ color: C.saffron }}>{timeStr} IST</span>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
        <span style={{ color: C.muted }}>NETWORK LIVE</span>
      </div>

      {/* ── Left rail — demand categories ── */}
      <div style={{
        gridColumn: '1', gridRow: '2 / 4',
        background: '#080c14', borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 8, padding: '16px 0',
      }}>
        {DEMAND_ITEMS.map((d) => (
          <div
            key={d.label}
            title={`${d.label}: ${fmt(d.value)}`}
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: `${d.color}18`,
              border: `1px solid ${d.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, boxShadow: `0 0 6px ${d.color}` }} />
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ width: 28, height: 1, background: C.border }} />
        <div title="Providers" style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'rgba(168,221,208,.06)', border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: C.muted,
        }}>
          {PROVIDERS.filter(p => p.active).length}
        </div>
      </div>

      {/* ── Centre — demand map ── */}
      <div style={{
        gridColumn: '2', gridRow: '2',
        position: 'relative', overflow: 'hidden', background: '#090d16',
      }}>
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(168,221,208,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(168,221,208,.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          transform: 'perspective(600px) rotateX(14deg) scale(1.12)',
          transformOrigin: '50% 80%',
        }} />
        {/* Street photo */}
        <div style={{
          position: 'absolute', inset: '-12%',
          backgroundImage: "url('/hero/street-branded.jpg')",
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'saturate(.18) brightness(.15) contrast(1.3)',
          transform: 'perspective(600px) rotateX(14deg) scale(1.15)',
          transformOrigin: '50% 80%',
        }} />
        {/* Demand zones */}
        {MAP_DEMAND_ZONES.map((z, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${z.x}%`, top: `${z.y}%`,
            transform: 'translate(-50%, -50%)',
          }}>
            <div style={{
              width: z.r * 2, height: z.r * 2,
              borderRadius: '50%',
              background: `${z.color}14`,
              border: `1px solid ${z.color}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <span style={{ fontSize: 7.5, color: z.color, letterSpacing: '0.04em', fontWeight: 700 }}>
                {z.label}
              </span>
            </div>
          </div>
        ))}
        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 80%, transparent 30%, rgba(7,11,17,.9) 100%)',
          pointerEvents: 'none',
        }} />
        {/* Label */}
        <div style={{
          position: 'absolute', bottom: 12, left: 14,
          fontSize: 8.5, letterSpacing: '0.16em', color: C.muted,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>DEMAND MAP — DELHI NCR</span>
          <span style={{ padding: '1px 6px', borderRadius: 2, background: 'rgba(233,172,66,.12)', border: '1px solid rgba(233,172,66,.22)', color: C.saffron, fontSize: 7.5 }}>
            ILLUSTRATIVE
          </span>
        </div>
      </div>

      {/* ── Right drawer — tabs ── */}
      <div style={{
        gridColumn: '3', gridRow: '2',
        background: '#080c14', borderLeft: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
          {(['demand', 'providers'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '9px 0', fontSize: 8.5, letterSpacing: '0.16em',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: activeTab === tab ? C.saffron : C.muted,
                borderBottom: activeTab === tab ? `1px solid ${C.saffron}` : '1px solid transparent',
                marginBottom: -1,
                textTransform: 'uppercase',
              }}
            >
              {tab === 'demand' ? 'Demand' : 'Providers'}
            </button>
          ))}
        </div>

        {/* Demand tab */}
        {activeTab === 'demand' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 8, color: C.muted, letterSpacing: '0.16em', marginBottom: 4 }}>
                TOTAL DEMAND / 12 MO
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.saffron, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {fmt(TOTAL_DEMAND)}
              </div>
              <div style={{ fontSize: 8.5, color: C.muted, marginTop: 3 }}>
                {TOTAL_ANIMALS.toLocaleString()} community animals
              </div>
            </div>
            {DEMAND_ITEMS.map(d => (
              <div key={d.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 8.5, color: C.muted }}>{d.label}</span>
                  <span style={{ fontSize: 8.5, color: d.color }}>{fmt(d.value)}</span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: `${d.color}18`, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${(d.value / maxDemand) * 100}%`,
                    background: d.color,
                  }} />
                </div>
                <div style={{ fontSize: 7.5, color: 'rgba(168,221,208,.28)', marginTop: 2 }}>
                  {d.animals} animals
                </div>
              </div>
            ))}
            <div style={{
              marginTop: 14, padding: '8px', borderRadius: 4,
              background: 'rgba(233,172,66,.06)', border: '1px solid rgba(233,172,66,.14)',
            }}>
              <div style={{ fontSize: 7.5, color: 'rgba(233,172,66,.6)', letterSpacing: '0.1em', marginBottom: 3 }}>
                MATCHED
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>87%</div>
                <div style={{ fontSize: 7.5, color: C.muted }}>
                  {fmt(Math.round(TOTAL_DEMAND * 0.87))} covered
                </div>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(74,222,128,.12)', marginTop: 4 }}>
                <div style={{ height: '100%', width: '87%', background: '#4ade80', borderRadius: 2 }} />
              </div>
            </div>
          </div>
        )}

        {/* Providers tab */}
        {activeTab === 'providers' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {PROVIDERS.map(p => (
              <div key={p.name} style={{
                padding: '9px 14px', borderBottom: `1px solid ${C.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                  <span style={{ fontSize: 9.5, color: '#f4f1ea', letterSpacing: '0.04em' }}>{p.name}</span>
                  <span style={{
                    fontSize: 7.5, letterSpacing: '0.1em',
                    color: p.active ? '#4ade80' : C.muted,
                    padding: '1px 5px', borderRadius: 2,
                    background: p.active ? 'rgba(74,222,128,.1)' : 'rgba(168,221,208,.06)',
                    border: `1px solid ${p.active ? 'rgba(74,222,128,.24)' : C.border}`,
                  }}>
                    {p.active ? 'ACTIVE' : 'PARTIAL'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 7.5, color: C.saffron, background: 'rgba(233,172,66,.08)', border: '1px solid rgba(233,172,66,.18)', borderRadius: 2, padding: '1px 5px' }}>
                    {p.type}
                  </span>
                  {p.services.map(s => (
                    <span key={s} style={{ fontSize: 7.5, color: C.muted, background: 'rgba(168,221,208,.05)', border: `1px solid ${C.border}`, borderRadius: 2, padding: '1px 5px' }}>
                      {s}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, height: 2, borderRadius: 1, background: 'rgba(168,221,208,.08)' }}>
                    <div style={{ height: '100%', width: `${p.coverage}%`, background: p.active ? '#4ade80' : C.muted, borderRadius: 1 }} />
                  </div>
                  <span style={{ fontSize: 7.5, color: C.muted }}>{p.coverage}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom strip — KPIs + feed ── */}
      <div style={{
        gridColumn: '2 / -1', gridRow: '3',
        background: '#060a12', borderTop: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center',
      }}>
        {[
          { label: 'Animals', value: '1,200' },
          { label: 'Demand', value: fmt(TOTAL_DEMAND) },
          { label: 'Providers', value: '34' },
          { label: 'Matched', value: '87%' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            padding: '0 18px',
            borderRight: `1px solid ${C.border}`,
            display: 'flex', flexDirection: 'column', gap: 2, minWidth: 88,
          }}>
            <span style={{ fontSize: 7.5, color: C.muted, letterSpacing: '0.14em' }}>
              {kpi.label.toUpperCase()}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.saffron, letterSpacing: '-0.02em' }}>
              {kpi.value}
            </span>
          </div>
        ))}
        <div style={{
          flex: 1, padding: '0 14px',
          display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: FEED[feedIndex].type === 'match' ? '#4ade80'
              : FEED[feedIndex].type === 'demand' ? C.saffron
              : FEED[feedIndex].type === 'outcome' ? C.mint
              : C.muted,
          }} />
          <span style={{
            fontSize: 8.5, color: C.muted, letterSpacing: '0.1em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {FEED[feedIndex].time} — {FEED[feedIndex].msg}
          </span>
        </div>
      </div>
    </div>
  )
}

export default AppConsole
