"use client";

/* Plate II. One animal's record drawn along a scale bar, the way an atlas
   measures distance: here it measures days. Entries arrive in order when
   the plate comes into view — the record accumulating as it did. */

import { useEffect, useRef, useState } from "react";

export type ScaleEntry = { day: number; date: string; label: string; kind: "case" | "abc" | "vacc" | "treat" | "close" };

const X0 = 70, X1 = 1130, BAR = 262, SPAN = 30;
const x = (d: number) => X0 + ((X1 - X0) * d) / SPAN;

function Mark({ kind, cx, cy }: { kind: ScaleEntry["kind"]; cx: number; cy: number }) {
  if (kind === "case") return <circle cx={cx} cy={cy} r={6} fill="#f05b40" />;
  if (kind === "abc") return <circle cx={cx} cy={cy} r={5.5} fill="none" stroke="#0b1e3d" strokeWidth={1.6} />;
  if (kind === "vacc") return <rect x={cx - 4.5} y={cy - 4.5} width={9} height={9} transform={`rotate(45 ${cx} ${cy})`} fill="#0b1e3d" />;
  if (kind === "close") return <g><circle cx={cx} cy={cy} r={6} fill="none" stroke="#0b1e3d" strokeWidth={1.4} /><circle cx={cx} cy={cy} r={2.4} fill="#0b1e3d" /></g>;
  return <rect x={cx - 4} y={cy - 4} width={8} height={8} fill="#0b1e3d" />;
}

export function RecordScale({ entries, start }: { entries: ScaleEntry[]; start: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Stack same-day entries upward; lay the rest out on alternating rows.
  const rows: Record<number, number> = {};
  const placed = entries.map((e, i) => {
    const r = (rows[e.day] = (rows[e.day] ?? -1) + 1);
    const y = e.kind === "close" ? 44 : BAR - 58 - r * 44;
    return { ...e, y, i };
  });
  const vacc = entries.filter((e) => e.kind === "vacc");
  const startDate = new Date(start + "T00:00:00Z");
  const dateAt = (d: number) => { const t = new Date(startDate.getTime() + d * 86400000); return `${t.getUTCDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][t.getUTCMonth()]}`; };

  return (
    <div ref={ref} className={`la-rec${on ? " on" : ""}`}>
      <svg className="la-rec-h" viewBox="0 0 1200 330" role="img" aria-label="The record along a 30-day scale">
        {/* scale bar: filled and open segments every five days */}
        {Array.from({ length: 6 }, (_, s) => (
          <rect key={s} x={x(s * 5)} y={BAR} width={x(5) - x(0)} height={8} fill={s % 2 ? "none" : "#0b1e3d"} stroke="#0b1e3d" strokeWidth={1} />
        ))}
        {Array.from({ length: SPAN + 1 }, (_, d) => <line key={d} x1={x(d)} x2={x(d)} y1={BAR + 8} y2={BAR + (d % 5 ? 13 : 19)} stroke="#0b1e3d" strokeWidth={0.8} />)}
        {Array.from({ length: 7 }, (_, s) => (
          <g key={s}>
            <text className="num" x={x(s * 5)} y={BAR + 34} textAnchor="middle">day {s * 5}</text>
            <text className="num" x={x(s * 5)} y={BAR + 48} textAnchor="middle" opacity={0.7}>{dateAt(s * 5)}</text>
          </g>
        ))}
        {/* the vaccination course, bracketed */}
        {vacc.length > 1 && (
          <g className="entry" style={{ transitionDelay: `${entries.length * 140 + 200}ms` }}>
            <path d={`M${x(vacc[0].day)} ${BAR - 16} v-8 H${x(vacc[vacc.length - 1].day)} v8`} fill="none" stroke="#0b1e3d" strokeWidth={0.9} />
            <text className="lbl" x={(x(vacc[0].day) + x(vacc[vacc.length - 1].day)) / 2 + 60} y={BAR - 32} textAnchor="middle">
              Vaccination course · days {vacc.map((v) => v.day).join(", ")} — the spacing of an anti-rabies (ARV) schedule
            </text>
          </g>
        )}
        {placed.map((e) => (
          <g key={`${e.day}-${e.kind}-${e.i}`} className="entry" style={{ transitionDelay: `${e.i * 140}ms` }}>
            {e.kind !== "vacc" && <line x1={x(e.day)} x2={x(e.day)} y1={e.y + 8} y2={BAR - 2} stroke="#0b1e3d" strokeWidth={0.7} strokeDasharray={e.kind === "close" ? "0" : "2 3"} />}
            <Mark kind={e.kind} cx={x(e.day)} cy={e.kind === "vacc" ? BAR + 4 : e.y} />
            {e.kind !== "vacc" && (
              <text className="lbl-b" x={e.kind === "close" ? x(e.day) - 14 : x(e.day) + 14} y={e.y + 6} textAnchor={e.kind === "close" ? "end" : "start"}>{e.label}</text>
            )}
          </g>
        ))}
      </svg>

      <ol className="la-rec-v" aria-label="The record, day by day">
        {entries.map((e, i) => (
          <li key={i} className="entry" style={{ transitionDelay: `${i * 120}ms`, display: "grid", gridTemplateColumns: "74px 18px 1fr", gap: 10, alignItems: "baseline", padding: "12px 0", borderTop: "1px solid rgba(11,30,61,.14)" }}>
            <span className="mono" style={{ fontSize: 12 }}>day {e.day}<br /><span className="dim">{dateAt(e.day)}</span></span>
            <svg width="14" height="14" viewBox="-7 -7 14 14"><Mark kind={e.kind} cx={0} cy={0} /></svg>
            <span style={{ fontSize: 18 }}>{e.kind === "vacc" ? `Vaccination (${vacc.findIndex((v) => v.day === e.day) + 1} of ${vacc.length})` : e.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
