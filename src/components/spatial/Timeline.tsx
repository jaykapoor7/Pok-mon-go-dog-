"use client";

/* ════════════════════════════════════════════════════════════════════
   The timeline: the map's clock, drawn as the record's own rhythm.

   The track is a histogram of field records per month, so the handle
   moves over the shape of the work itself — the October–November peaks
   are visible before anyone presses play. Dragging, tapping or the arrow
   keys set "as of"; play walks the city forward a month at a time.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useRef } from "react";
import { Pause, Play } from "lucide-react";
import { monthLabel, yearOfMonth } from "@/lib/spatial/engine";

export function Timeline({ series, m0, m, onChange, playing, onPlay, night }: {
  /** Records per month, from month index m0. */
  series: number[];
  m0: number;
  m: number;
  onChange: (m: number) => void;
  playing: boolean;
  onPlay: () => void;
  night: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const n = series.length;
  const max = Math.max(1, ...series);
  const W = 600, H = 34;
  const bw = W / Math.max(1, n);
  const at = useCallback((clientX: number) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return m;
    const f = Math.min(0.9999, Math.max(0, (clientX - r.left) / r.width));
    return m0 + Math.floor(f * n);
  }, [m, m0, n]);
  const down = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    onChange(at(e.clientX));
  };
  const move = (e: React.PointerEvent) => { if (e.buttons & 1) onChange(at(e.clientX)); };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); onChange(Math.max(m0, m - 1)); }
    if (e.key === "ArrowRight") { e.preventDefault(); onChange(Math.min(m0 + n - 1, m + 1)); }
    if (e.key === "Home") { e.preventDefault(); onChange(m0); }
    if (e.key === "End") { e.preventDefault(); onChange(m0 + n - 1); }
  };
  const idx = m - m0;
  const years: { i: number; y: number }[] = [];
  for (let i = 0; i < n; i++) if ((m0 + i) % 12 === 0) years.push({ i, y: yearOfMonth(m0 + i) });

  return (
    <div className={`sm-time ${night ? "is-night" : ""}`}>
      <button type="button" className="sm-time-play" onClick={onPlay} aria-label={playing ? "Pause" : "Play the record forward"}>
        {playing ? <Pause size={15} /> : <Play size={15} />}
      </button>
      <div className="sm-time-body">
        <p className="sm-time-label"><span>As of</span> <b className="sys-mono">{monthLabel(m)}</b></p>
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="sm-time-track"
          role="slider"
          tabIndex={0}
          aria-label="Month shown on the map"
          aria-valuemin={m0}
          aria-valuemax={m0 + n - 1}
          aria-valuenow={m}
          aria-valuetext={monthLabel(m, true)}
          onPointerDown={down}
          onPointerMove={move}
          onKeyDown={key}
        >
          {series.map((v, i) => {
            const h = v > 0 ? Math.max(2, (v / max) * (H - 6)) : 1;
            return <rect key={i} x={i * bw + 0.6} y={H - h} width={Math.max(1, bw - 1.2)} height={h} className={i <= idx ? "is-past" : ""} />;
          })}
          <line x1={(idx + 0.5) * bw} x2={(idx + 0.5) * bw} y1={0} y2={H} className="sm-time-hand" />
        </svg>
        <div className="sm-time-years" aria-hidden>
          {years.map((y) => <span key={y.y} style={{ left: `${(y.i / n) * 100}%` }}>{y.y}</span>)}
        </div>
      </div>
    </div>
  );
}
