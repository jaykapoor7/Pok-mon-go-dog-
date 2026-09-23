"use client";

/* Survey sheets. Each sheet is one real day of field work in Coimbatore,
   drawn on squared paper over the pencilled terrain of everything the
   register holds for the city. The day's entries are joined in pen, in
   the order a walker would visit them — the record keeps the date of each
   entry, not the time, so the route is the shortest reasonable path and
   says so. Turning the page redraws the route. */

import { useState } from "react";

export type SDay = { day: number; date: string; weekday: string; stops: { x: number; y: number; kind: string; place: string }[]; length: number };

export function Survey({ days, W, H, terrain, stipple, kmPx, total }: { days: SDay[]; W: number; H: number; terrain: { d: string; w: number; o: number }[]; stipple: string; kmPx: number; total: number }) {
  const [i, setI] = useState(0);
  const d = days[i];
  const route = d.stops.map((s, k) => `${k ? "L" : "M"}${s.x.toFixed(1)} ${s.y.toFixed(1)}`).join("");
  const counts = d.stops.reduce<Record<string, number>>((a, s) => ((a[s.kind] = (a[s.kind] ?? 0) + 1), a), {});
  return (
    <div className="fj-spread fj-survey">
      <section className="fj-page fj-ruled" aria-label="Field log">
        <div className="fj-pagehead"><span>Sample city: Coimbatore · field log</span><span>sheet {i + 1} of {days.length}</span></div>
        <h1 className="t" style={{ fontSize: "clamp(26px, 3vw, 40px)", lineHeight: "60px", marginTop: 30 }}>{d.weekday} {d.date}</h1>
        <p className="t" style={{ fontSize: 15, lineHeight: "30px" }}>{d.stops.length} entries at {new Set(d.stops.map((s) => s.place)).size} places · route ≈ {d.length.toFixed(0)} km</p>
        <p className="t" style={{ fontSize: 15, lineHeight: "30px", color: "var(--fj-grey)" }}>{Object.entries(counts).map(([k, n]) => `${n} × ${k.toLowerCase()}`).join(" · ")}</p>
        <ol className="fj-log" style={{ marginTop: 30 }}>
          {d.stops.map((s, k) => (
            <li key={`${i}-${k}`} style={{ animationDelay: `${k * 0.05}s` }}><span>{String(k + 1).padStart(2, "0")}</span><span>{s.kind} — near {s.place}</span></li>
          ))}
        </ol>
        <div className="fj-turn" role="group" aria-label="Turn the page">
          <button type="button" onClick={() => setI((i - 1 + days.length) % days.length)} aria-label="Previous sheet">← previous day</button>
          <button type="button" onClick={() => setI((i + 1) % days.length)} aria-label="Next sheet">next day →</button>
        </div>
      </section>
      <section className="fj-page fj-ruled" aria-label="Survey sheet">
        <div className="fj-pagehead"><span>Survey sheet · the day&apos;s route in pen</span><span>pencil: all {total.toLocaleString("en-IN")} entries</span></div>
        <div className="fj-sheet fj-squared" style={{ ["--fj-sq" as string]: "18px" }}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Route of ${d.stops.length} field entries on ${d.date}`}>
            <g fill="none" stroke="var(--fj-ink)" strokeLinejoin="round" strokeLinecap="round">
              {terrain.map((t, k) => <path key={k} d={t.d} strokeWidth={t.w} strokeOpacity={t.o} />)}
            </g>
            <path d={stipple} stroke="var(--fj-ink)" strokeOpacity=".22" strokeWidth="2.2" strokeLinecap="round" />
            <path key={`r${i}`} className="fj-route" d={route} fill="none" stroke="var(--fj-pen)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
            {d.stops.map((s, k) => (
              <g key={`${i}-${k}`}>
                <circle cx={s.x} cy={s.y} r={k === 0 ? 8 : 5.5} fill={s.kind === "Case opened" ? "var(--fj-stamp)" : "var(--fj-card)"} stroke={s.kind === "Case opened" ? "var(--fj-stamp)" : "var(--fj-pen)"} strokeWidth="2.2" />
                {k === 0 && <text x={s.x + 12} y={s.y - 10} style={{ fontFamily: "var(--fj-hand)", fontSize: 24, fill: "var(--fj-pen)" }}>start</text>}
              </g>
            ))}
            <g transform={`translate(24 ${H - 26})`}>
              <path d={`M0 0 H${kmPx * 2} M0 -5 V5 M${kmPx} -3 V3 M${kmPx * 2} -5 V5`} stroke="var(--fj-ink)" strokeWidth="1.5" />
              <text x={kmPx * 2 + 8} y="4" style={{ fontFamily: "var(--fj-type)", fontSize: 12, fill: "var(--fj-grey)" }}>2 km</text>
            </g>
          </svg>
        </div>
        <div className="fj-titleblock">
          <div>Sheet<b>{d.date}</b></div>
          <div>Pen<b>that day</b></div>
          <div>Pencil<b>2024–2026</b></div>
          <div>Flame<b>case opened</b></div>
        </div>
        <p className="t" style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.5, color: "var(--fj-grey)" }}>The record keeps the date of each entry, not the hour, so the pen joins them by the shortest reasonable route. Positions are published to about a kilometre; entries beyond the edge of this sheet are left off it.</p>
      </section>
    </div>
  );
}
