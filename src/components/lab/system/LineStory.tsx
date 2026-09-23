"use client";

/* The line, told with one real animal. Three residents reported the same
   injured dog in RS Puram on 15 Sep 2026. The three reports converge into
   one record, the record opens one case, and the case is still on its way
   to an outcome — so the last leg of the line is drawn dashed, and says
   so. Beneath each station: how many the whole register holds. */

import { useEffect, useRef, useState } from "react";

type Slip = { title: string; status: string; at: string };

export function LineStory({ slips, record, caseCode, day, totals }: {
  slips: Slip[]; record: string; caseCode: string; day: number;
  totals: { reports: number; rescue: number; records: number; cases: number; outcomes: number };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStep(4); return; }
    let timers: number[] = [];
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      timers = [1, 2, 3, 4].map((s, i) => window.setTimeout(() => setStep(s), 350 + i * 900));
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); timers.forEach(clearTimeout); };
  }, []);
  const fmt = (n: number) => n.toLocaleString("en-IN");
  const SX = [0, 390, 640, 900];
  const Y = 170;
  return (
    <div ref={ref} className="sx-story" data-step={step}>
      <svg viewBox="0 0 1000 300" width="100%" role="img" aria-label={`Three reports became record ${record}, which opened case ${caseCode}, in progress on day ${day}.`}>
        {slips.map((s, i) => {
          const y = 40 + i * 92;
          return (
            <g key={i} className="slip" style={{ transitionDelay: `${i * 0.08}s` }}>
              <path className="feed" d={`M270 ${y + 30} C 310 ${y + 30}, 320 ${Y}, ${SX[1] - 14} ${Y}`} fill="none" stroke="#2457ce" strokeWidth="3" />
              <rect x="0" y={y} width="270" height="66" rx="2" fill="#faf7f1" stroke="rgba(11,30,61,.22)" />
              <text x="14" y={y + 22} className="s1">Report {i + 1} · {s.at}</text>
              <text x="14" y={y + 42} className="s2">{s.title}</text>
              <text x="256" y={y + 22} textAnchor="end" className={`s3${s.status === "in_progress" ? " need" : ""}`}>{s.status === "in_progress" ? "case in progress" : "unverified"}</text>
            </g>
          );
        })}
        <line className="leg l1" x1={SX[1]} x2={SX[2]} y1={Y} y2={Y} stroke="#2457ce" strokeWidth="6" />
        <line className="leg l2" x1={SX[2]} x2={SX[3]} y1={Y} y2={Y} stroke="#0b1e3d" strokeOpacity=".35" strokeWidth="4" strokeDasharray="2 9" strokeLinecap="round" />
        <g className="stn s-rec"><circle cx={SX[1]} cy={Y} r="16" fill="#2457ce" /><text x={SX[1]} y={Y - 30} textAnchor="middle" className="tag">RECORD {record}</text></g>
        <g className="stn s-case"><circle cx={SX[2]} cy={Y} r="16" fill="#f05b40" /><circle className="pulse" cx={SX[2]} cy={Y} r="16" fill="none" stroke="#f05b40" strokeWidth="2" /><text x={SX[2]} y={Y - 30} textAnchor="middle" className="tag">CASE · DAY {day}</text></g>
        <g className="stn s-out"><circle cx={SX[3]} cy={Y} r="14" fill="#f3ede4" stroke="#0b1e3d" strokeOpacity=".45" strokeWidth="3" strokeDasharray="4 4" /><text x={SX[3]} y={Y - 30} textAnchor="middle" className="tag dim">OUTCOME · NOT YET</text></g>
      </svg>
      <ol className="sx-story-stations">
        <li><span className="lbl">Reports</span><b className="num">{fmt(totals.reports)}</b><p>resident reports with a photograph and a place — plus {fmt(totals.rescue)} rescue requests taken by field teams</p></li>
        <li><span className="lbl">Records</span><b className="num">{fmt(totals.records)}</b><p>animals, each with one identity every later report joins</p></li>
        <li><span className="lbl">Cases</span><b className="num">{fmt(totals.cases)}</b><p>cases opened when an animal needed something done</p></li>
        <li><span className="lbl">Outcomes</span><b className="num">{fmt(totals.outcomes)}</b><p>cases closed with the outcome written down</p></li>
      </ol>
    </div>
  );
}
