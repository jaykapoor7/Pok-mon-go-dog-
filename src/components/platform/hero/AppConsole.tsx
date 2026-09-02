"use client";

import { useEffect, useRef, useState } from 'react'

type CaseStatus = 'active' | 'resolved' | 'pending'

const CASES = [
  { id: 'SP-2847', zone: 'Lajpat Nagar', type: 'Injury', status: 'active' as CaseStatus, time: '2m ago', priority: true },
  { id: 'SP-2846', zone: 'Karol Bagh', type: 'Hunger', status: 'resolved' as CaseStatus, time: '18m ago', priority: false },
  { id: 'SP-2845', zone: 'Dwarka Sec 6', type: 'Rescue', status: 'pending' as CaseStatus, time: '34m ago', priority: true },
  { id: 'SP-2844', zone: 'Rohini', type: 'Vaccination', status: 'resolved' as CaseStatus, time: '1h ago', priority: false },
  { id: 'SP-2843', zone: 'Saket', type: 'Sterilisation', status: 'active' as CaseStatus, time: '2h ago', priority: false },
]

const STATUS_COLOR: Record<CaseStatus, string> = {
  active: '#e9ac42',
  resolved: '#a8ddd0',
  pending: '#e06455',
}

const STATUS_LABEL: Record<CaseStatus, string> = {
  active: 'ACTIVE',
  resolved: 'RESOLVED',
  pending: 'PENDING',
}

const KPI_ROWS = [
  { label: 'Reports today', value: '247', delta: '+18' },
  { label: 'Rescues closed', value: '31', delta: '+4' },
  { label: 'Active NGOs', value: '12', delta: '' },
  { label: 'Avg response', value: '22m', delta: '-3m' },
]

const MAP_NODES = [
  { x: 38, y: 24, color: '#e9ac42', pulse: true },
  { x: 62, y: 18, color: '#a8ddd0', pulse: false },
  { x: 55, y: 42, color: '#e06455', pulse: true },
  { x: 28, y: 58, color: '#e9ac42', pulse: false },
  { x: 74, y: 61, color: '#a8ddd0', pulse: false },
  { x: 45, y: 72, color: '#e9ac42', pulse: true },
  { x: 18, y: 38, color: '#a8ddd0', pulse: false },
  { x: 82, y: 34, color: '#e9ac42', pulse: false },
]

const FEED_ITEMS = [
  { time: '09:41', msg: 'New sighting — Lajpat Nagar, injured dog', type: 'alert' },
  { time: '09:39', msg: 'NGO PFA Delhi dispatched — SP-2847', type: 'dispatch' },
  { time: '09:27', msg: 'Rescue confirmed — Karol Bagh case closed', type: 'resolved' },
  { time: '09:18', msg: 'Vet scheduled — Dwarka Sector 6', type: 'dispatch' },
]

function PulsingNode({ pulse }: { pulse: boolean }) {
  return pulse ? (
    <span
      className="absolute inset-0 rounded-full opacity-50 animate-ping"
      style={{ backgroundColor: 'currentColor' }}
    />
  ) : null
}

export type AppConsoleProps = {
  className?: string
  visible?: boolean
}

export function AppConsole({ className = '', visible = true }: AppConsoleProps) {
  const [feedIndex, setFeedIndex] = useState(0)
  const [tick, setTick] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    if (!visible) return
    intervalRef.current = setInterval(() => {
      setTick(t => t + 1)
      setFeedIndex(i => (i + 1) % FEED_ITEMS.length)
    }, 3200)
    return () => clearInterval(intervalRef.current)
  }, [visible])

  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <div
      className={`app-console ${className}`}
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        background: '#070b11',
        color: '#a8ddd0',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid rgba(168,221,208,.12)',
        display: 'grid',
        gridTemplateRows: '44px 1fr 54px',
        gridTemplateColumns: '52px 1fr 220px',
        width: '100%',
        maxWidth: 900,
        height: 560,
        boxShadow: '0 32px 80px rgba(0,0,0,.72)',
      }}
    >
      {/* Top bar — spans full width */}
      <div
        style={{
          gridColumn: '1 / -1',
          gridRow: '1',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 20px',
          background: '#0a0f18',
          borderBottom: '1px solid rgba(168,221,208,.08)',
          fontSize: 10,
          letterSpacing: '0.16em',
        }}
      >
        <span style={{ color: '#e9ac42', fontWeight: 700 }}>STRAYPAW</span>
        <span style={{ color: 'rgba(168,221,208,.4)' }}>|</span>
        <span style={{ color: 'rgba(168,221,208,.6)' }}>OPS DASHBOARD</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: 'rgba(168,221,208,.35)' }}>28.7041° N / 77.1025° E</span>
        <span style={{ color: 'rgba(168,221,208,.4)' }}>|</span>
        <span style={{ color: '#e9ac42' }}>{timeStr} IST</span>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#a8ddd0',
            boxShadow: '0 0 8px #a8ddd0',
          }}
        />
        <span style={{ color: 'rgba(168,221,208,.5)' }}>LIVE</span>
      </div>

      {/* Left rail — status icons */}
      <div
        style={{
          gridColumn: '1',
          gridRow: '2 / 4',
          background: '#080c14',
          borderRight: '1px solid rgba(168,221,208,.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          padding: '16px 0',
        }}
      >
        {CASES.map((c) => (
          <div
            key={c.id}
            title={c.zone}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: `${STATUS_COLOR[c.status]}22`,
              border: `1px solid ${STATUS_COLOR[c.status]}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'default',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: STATUS_COLOR[c.status],
                boxShadow: `0 0 6px ${STATUS_COLOR[c.status]}`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Centre — angled Delhi map */}
      <div
        style={{
          gridColumn: '2',
          gridRow: '2',
          position: 'relative',
          overflow: 'hidden',
          background: '#0a0e17',
        }}
      >
        {/* Faint grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(168,221,208,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(168,221,208,.05) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            transform: 'rotateX(22deg) rotateZ(-4deg) scale(1.18)',
            transformOrigin: '50% 70%',
          }}
        />

        {/* Street photo layer */}
        <div
          style={{
            position: 'absolute',
            inset: '-12%',
            backgroundImage: "url('/hero/street-branded.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'saturate(.3) brightness(.22) contrast(1.2)',
            transform: 'perspective(600px) rotateX(18deg) rotateZ(-4deg) scale(1.22)',
            transformOrigin: '50% 70%',
          }}
        />

        {/* Map nodes */}
        {MAP_NODES.map((node, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${node.x}%`,
              top: `${node.y}%`,
              color: node.color,
            }}
          >
            <div style={{ position: 'relative', width: 8, height: 8 }}>
              <PulsingNode pulse={node.pulse} />
              <span
                style={{
                  display: 'block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: node.color,
                  boxShadow: `0 0 8px ${node.color}`,
                  position: 'relative',
                  zIndex: 1,
                }}
              />
            </div>
          </div>
        ))}

        {/* Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 50% 80%, transparent 30%, rgba(7,11,17,.88) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Centre label */}
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            left: 16,
            fontSize: 9,
            letterSpacing: '0.18em',
            color: 'rgba(168,221,208,.45)',
          }}
        >
          DELHI NCR — SIGHTING MAP
        </div>
      </div>

      {/* Right drawer — case list */}
      <div
        style={{
          gridColumn: '3',
          gridRow: '2',
          background: '#080c14',
          borderLeft: '1px solid rgba(168,221,208,.08)',
          overflowY: 'auto',
          padding: '12px 0',
        }}
      >
        <div
          style={{
            padding: '0 14px 10px',
            fontSize: 9,
            letterSpacing: '0.18em',
            color: 'rgba(168,221,208,.35)',
            borderBottom: '1px solid rgba(168,221,208,.06)',
            marginBottom: 8,
          }}
        >
          ACTIVE CASES
        </div>
        {CASES.map((c) => (
          <div
            key={c.id}
            style={{
              padding: '8px 14px',
              borderBottom: '1px solid rgba(168,221,208,.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#e9ac42', letterSpacing: '0.1em' }}>
                {c.id}
                {c.priority && (
                  <span
                    style={{
                      marginLeft: 5,
                      background: '#e0645522',
                      border: '1px solid #e0645544',
                      borderRadius: 2,
                      padding: '1px 4px',
                      fontSize: 8,
                      color: '#e06455',
                      letterSpacing: '0.1em',
                    }}
                  >
                    PRIORITY
                  </span>
                )}
              </span>
              <span
                style={{
                  fontSize: 8,
                  letterSpacing: '0.14em',
                  color: STATUS_COLOR[c.status],
                }}
              >
                {STATUS_LABEL[c.status]}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, color: 'rgba(168,221,208,.6)' }}>{c.zone}</span>
              <span style={{ fontSize: 9, color: 'rgba(168,221,208,.3)' }}>{c.time}</span>
            </div>
            <span
              style={{
                fontSize: 9,
                color: 'rgba(168,221,208,.4)',
                letterSpacing: '0.1em',
              }}
            >
              {c.type}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom bar — live feed + KPIs */}
      <div
        style={{
          gridColumn: '2 / -1',
          gridRow: '3',
          background: '#060a12',
          borderTop: '1px solid rgba(168,221,208,.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          overflow: 'hidden',
        }}
      >
        {/* KPIs */}
        {KPI_ROWS.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              padding: '0 20px',
              borderRight: '1px solid rgba(168,221,208,.07)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              minWidth: 100,
            }}
          >
            <span style={{ fontSize: 8, color: 'rgba(168,221,208,.35)', letterSpacing: '0.14em' }}>
              {kpi.label.toUpperCase()}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#e9ac42', letterSpacing: '-0.02em' }}>
                {kpi.value}
              </span>
              {kpi.delta && (
                <span
                  style={{
                    fontSize: 9,
                    color: kpi.delta.startsWith('-') ? '#a8ddd0' : '#a8ddd0',
                    letterSpacing: '0.1em',
                  }}
                >
                  {kpi.delta}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Live feed */}
        <div
          style={{
            flex: 1,
            padding: '0 16px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 0,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#e06455',
              boxShadow: '0 0 6px #e06455',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 9,
              color: 'rgba(168,221,208,.55)',
              letterSpacing: '0.12em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {FEED_ITEMS[feedIndex].time} — {FEED_ITEMS[feedIndex].msg}
          </span>
        </div>
      </div>
    </div>
  )
}

export default AppConsole
