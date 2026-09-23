"use client";

/* Today's page. The entries a resident's neighbourhood has written, and the
   sketch map they were made on: each entry is a numbered station on the
   sheet, and pointing at one finds the other. The map is drawn from the
   entries alone — rings at 1, 3 and 6 km from where the reader stands,
   and locality names lettered where their entries fall. */

import { useState } from "react";
import { projector, type Box } from "../geo";

export type TRow = { id: string; n: number; lng: number; lat: number; zone: string; when: string; km: number; img: string; record: string; status: string };

export function Today({ rows, home, box }: { rows: TRow[]; home: { name: string; lng: number; lat: number }; box: Box }) {
  const [hi, setHi] = useState<string | null>(null);
  const W = 640, H = 640;
  const { p, kmPx } = projector(box, W, H, 30);
  const [hx, hy] = p(home.lng, home.lat);
  const places = new Map<string, { x: number; y: number; n: number }>();
  for (const r of rows) {
    const [x, y] = p(r.lng, r.lat);
    const c = places.get(r.zone) ?? { x: 0, y: 0, n: 0 };
    places.set(r.zone, { x: c.x + x, y: c.y + y, n: c.n + 1 });
  }
  // Jittered positions stand in for published ~1 km cells; stations that land together are fanned out slightly.
  const pos = rows.map((r) => p(r.lng, r.lat));
  return (
    <div className="fj-spread fj-today">
      <section className="fj-page fj-ruled" aria-label="Entries">
        <div className="fj-pagehead"><span>Around {home.name} · within 7 km</span><span>{rows.length} entries</span></div>
        <button type="button" className="fj-tab">+ Add an entry<span className="fj-tab-more">&nbsp;— report an animal</span></button>
        <ol className="fj-entries">
          {rows.map((r, i) => (
            <li key={r.id} className={hi === r.id ? "on" : ""} onMouseEnter={() => setHi(r.id)} onMouseLeave={() => setHi(null)} onClick={() => setHi(r.id)}>
              <span className="no">{r.n}</span>
              <img src={r.img} alt={`Dog seen in ${r.zone}`} loading="lazy" style={{ ["--r" as string]: `${((i * 53) % 5) - 2.5}deg` }} />
              <span className="tx"><b>{r.zone}</b> — seen {r.when}<span>{r.km.toFixed(1)} km · record {r.record} · {r.status}</span></span>
            </li>
          ))}
        </ol>
      </section>
      <section className="fj-page fj-ruled" aria-label="Sketch map">
        <div className="fj-pagehead"><span>Sheet · {home.name}, South Delhi</span><span>drawn from the entries</span></div>
        <div className="fj-sheet fj-squared" style={{ ["--fj-sq" as string]: "22px" }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ overflow: "hidden" }} role="img" aria-label={`Sketch map of ${rows.length} entries around ${home.name}`}>
            {[1, 3, 6].map((k) => (
              <g key={k}>
                <circle cx={hx} cy={hy} r={k * kmPx} fill="none" stroke="var(--fj-ink)" strokeOpacity=".45" strokeWidth="1.2" strokeDasharray="2 6" strokeLinecap="round" />
                <text className="lbl" x={hx + k * kmPx * 0.72 + 4} y={hy - k * kmPx * 0.7}>{k} km</text>
              </g>
            ))}
            {[...places].map(([name, c]) => (
              <text key={name} className="place" x={c.x / c.n} y={c.y / c.n + 34} textAnchor="middle" opacity=".85">{name}</text>
            ))}
            <path d={`M${hx - 9} ${hy} H${hx + 9} M${hx} ${hy - 9} V${hy + 9}`} stroke="var(--fj-stamp)" strokeWidth="2.4" strokeLinecap="round" />
            <text className="lbl" x={hx + 12} y={hy + 18} style={{ fill: "var(--fj-stamp)", fontWeight: 700 }}>you are here</text>
            {rows.map((r, i) => {
              const [x, y] = pos[i];
              const on = hi === r.id;
              return (
                <g key={r.id} onMouseEnter={() => setHi(r.id)} onMouseLeave={() => setHi(null)} style={{ cursor: "pointer" }}>
                  <circle cx={x} cy={y} r={on ? 15 : 11} fill={on ? "var(--fj-stamp)" : "var(--fj-pen)"} stroke="var(--fj-card)" strokeWidth="2" style={{ transition: "r .2s" }} />
                  <text className="stn" x={x} y={y + 4} textAnchor="middle">{r.n}</text>
                </g>
              );
            })}
            <g transform={`translate(30 ${H - 34})`}>
              <path d={`M0 0 H${kmPx} M0 -5 V5 M${kmPx} -5 V5`} stroke="var(--fj-ink)" strokeWidth="1.5" />
              <text className="lbl" x={kmPx + 8} y="4">1 km</text>
            </g>
            <g transform={`translate(${W - 40} 48)`}>
              <path d="M0 18 L0 -18 M-6 -8 L0 -18 L6 -8" stroke="var(--fj-ink)" strokeWidth="1.5" fill="none" />
              <text className="lbl" x="0" y="34" textAnchor="middle">N</text>
            </g>
          </svg>
        </div>
        <div className="fj-titleblock">
          <div>Sheet<b>{home.name}</b></div>
          <div>Entries<b>{rows.length}</b></div>
          <div>Positions<b>to ~1 km</b></div>
          <div>Source<b>public record</b></div>
        </div>
        <p className="t" style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.5, color: "var(--fj-grey)" }}>Positions are published to about a kilometre and spread within that square, so a station marks a neighbourhood, never a doorstep.</p>
      </section>
    </div>
  );
}
