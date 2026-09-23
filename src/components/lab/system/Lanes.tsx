"use client";

/* One animal's care, in lanes along a day axis. Each lane is a kind of
   work; each mark is an entry on the record, placed on the day it was
   made. The case is a bar that runs flame while it is open and turns
   blue on the day it closes. Marks are drawn in the order they were
   recorded when the record scrolls into view. Due items the record
   implies but does not hold are drawn open and dashed. */

import { useEffect, useRef, useState } from "react";

export type LaneEntry = { day: number; label: string; kind: "case" | "abc" | "vacc" | "treat" | "close" | "due"; date: string; note?: string };

const LANES: { k: LaneEntry["kind"][]; name: string }[] = [
  { k: ["case", "close"], name: "Case" },
  { k: ["abc"], name: "Sterilisation · ABC" },
  { k: ["vacc", "due"], name: "Vaccination · ARV" },
  { k: ["treat"], name: "Treatment" },
];

export function Lanes({ entries, span, ticks, dark, compact }: { entries: LaneEntry[]; span: number; ticks: { day: number; label: string }[]; dark?: boolean; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const W = 1000, lh = compact ? 46 : 64, top = 26, H = top + LANES.length * lh + 34;
  const x = (d: number) => 150 + (d / span) * (W - 190);
  const close = entries.find((e) => e.kind === "close");
  const order = [...entries].sort((a, b) => a.day - b.day);
  const delay = (e: LaneEntry) => `${0.25 + order.indexOf(e) * 0.22}s`;
  const ink = dark ? "#f3ede4" : "#0b1e3d";
  return (
    <div ref={ref} className={`sx-lanes${on ? " on" : ""}${dark ? " dark" : ""}`}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={entries.map((e) => `Day ${e.day}: ${e.label}`).join("; ")}>
        {ticks.map((t) => (
          <g key={t.day}>
            <line x1={x(t.day)} x2={x(t.day)} y1={top - 8} y2={H - 30} stroke={ink} strokeOpacity=".12" />
            <text x={x(t.day)} y={H - 10} textAnchor="middle" className="tk">{t.label}</text>
          </g>
        ))}
        {LANES.map((l, i) => {
          const y = top + i * lh + lh / 2;
          return (
            <g key={l.name}>
              <line x1={150} x2={W - 40} y1={y} y2={y} stroke={ink} strokeOpacity=".22" strokeDasharray="2 4" />
              <text x={0} y={y + 4} className="ln">{l.name}</text>
            </g>
          );
        })}
        {close && (() => {
          const y = top + lh / 2;
          return (
            <g>
              <line className="bar open" x1={x(0)} x2={x(close.day)} y1={y} y2={y} stroke="#f05b40" strokeWidth="8" />
              <line className="bar shut" x1={x(0)} x2={x(close.day)} y1={y} y2={y} stroke="#2457ce" strokeWidth="8" style={{ transitionDelay: delay(close) }} />
            </g>
          );
        })()}
        {order.map((e, i) => {
          const lane = LANES.findIndex((l) => l.k.includes(e.kind));
          const y = top + lane * lh + lh / 2, cx = x(e.day);
          const st = { transitionDelay: delay(e) };
          const same = order.slice(0, i).filter((o) => o.kind === e.kind && o.day === e.day).length;
          const dy = same * 12;
          return (
            <g key={i} className="mk" style={st}>
              {e.kind === "case" && <rect x={cx - 7} y={y - 7} width="14" height="14" fill="#f05b40" />}
              {e.kind === "close" && <rect x={cx - 3} y={y - 13} width="6" height="26" fill="#2457ce" />}
              {e.kind === "abc" && <circle cx={cx} cy={y} r="8" fill="none" stroke="#2457ce" strokeWidth="4" />}
              {e.kind === "vacc" && <circle cx={cx} cy={y + dy} r="7" fill="#2457ce" />}
              {e.kind === "due" && <circle cx={cx} cy={y} r="7" fill="none" stroke={ink} strokeWidth="1.6" strokeDasharray="3 3" />}
              {e.kind === "treat" && <path d={`M${cx} ${y - 8}L${cx + 8} ${y}L${cx} ${y + 8}L${cx - 8} ${y}Z`} fill={ink} />}
              {(e.kind === "vacc" || e.kind === "due") && <text x={cx} y={y - 14} textAnchor="middle" className="dl">{e.note ?? `D${e.day}`}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
