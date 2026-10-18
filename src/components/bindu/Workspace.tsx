"use client";

/* ════════════════════════════════════════════════════════════════════
   The workspace. It arrives lying back on the table, far away, and
   rises to face you as the page scrolls (one variable, --u, drives the
   tilt, the scale and the rows arriving in turn). Then it is the working
   product, live: four views of the sample city's real record to click
   through.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useStage, span } from "./stage";

export type QueueRow = { condition: string; locality: string; days: number; critical: boolean };
export type AnimalRow = { id: string; name: string; place: string; photo: string; ster: string | null; seen: string | null };
export type AreaCell = { ring: number[]; open: number; crit: number; name: string };
export type CityFig = { city: string; animals: number; cases: number; sterilised: number; ster_unknown: number; cells: number } | null;

export function Workspace({ city, live, critical, queue, animals, cells, box, facts }: {
  city: string; live: number; critical: number; queue: QueueRow[]; animals: AnimalRow[]; cells: AreaCell[]; box: [number, number, number, number] | null; facts: CityFig;
}) {
  const { p, listen, still } = useStage();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"work" | "animals" | "map" | "city">("work");
  useEffect(() => { if (still) { setReady(true); return; } const f = () => setReady(span(p.current, 0.3, 0.55) >= 1); f(); return listen(f); }, [p, listen, still]);
  const rows = queue.slice(0, 5);
  const f = (n: number) => n.toLocaleString("en-IN");
  /* the area plate: rings in the box's own lng/lat, squeezed by latitude */
  const plate = box && cells.length ? (() => {
    const [w, s, e, n] = box, k = Math.cos(((s + n) / 2) * Math.PI / 180), W = (e - w) * k, H = n - s, sc = 300 / Math.max(W, H);
    const pt = (lng: number, lat: number) => `${((lng - w) * k * sc).toFixed(1)},${((n - lat) * sc).toFixed(1)}`;
    /* areas are drawn round, centred on their ring, never as hexagons */
    return { vb: `0 0 ${(W * sc).toFixed(0)} ${(H * sc).toFixed(0)}`, dots: cells.map((c) => {
      const xs: number[] = [], ys: number[] = [];
      for (let i = 0; i + 1 < c.ring.length; i += 2) { const [x, y] = pt(c.ring[i], c.ring[i + 1]).split(",").map(Number); xs.push(x); ys.push(y); }
      const cx = xs.reduce((a, b) => a + b, 0) / xs.length, cy = ys.reduce((a, b) => a + b, 0) / ys.length;
      return { cx, cy, r: Math.max(...xs.map((x, i) => Math.hypot(x - cx, ys[i] - cy))) * 0.86, c };
    }) };
  })() : null;
  const maxOpen = Math.max(1, ...cells.map((c) => c.open));

  return (
    <div className={`wl${ready ? " is-ready" : ""} is-${tab}`}>

      <section className="ws" aria-label={`The StrayPaw NGO workspace, live for ${city}`} inert={!ready || undefined}>
        <div className="ws-bar">
          <b>StrayPaw</b><span className="ws-org">NGO</span>
          <nav role="tablist" aria-label="Workspace views">
            {(["work", "animals", "map", "city"] as const).map((t) => (
              <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}>{t === "work" ? "Work" : t === "animals" ? "Animals" : t === "map" ? "Map" : "City"}</button>
            ))}
          </nav>
                  </div>
        <div className="ws-body" role="tabpanel">
          {tab === "work" && (
            <>
              <div className="ws-day"><b>Today&rsquo;s work</b><span>{f(live)} open · {f(critical)} critical</span><em className="ws-live">Live record · {city}</em></div>
              <ol className="ws-rows">{rows.map((q, i) => (
                <li key={i} className={q.critical ? "is-crit" : ""} style={{ ["--i" as string]: i }}><i className="ws-seat" aria-hidden /><b>{q.condition}</b><span>{q.locality}</span><em>{q.days === 0 ? "today" : `${q.days}d waiting`}</em></li>
              ))}</ol>
              <p className="ws-note">Live open requests in {city}. No organisation is named.</p>
            </>
          )}
          {tab === "animals" && (
            <table className="ws-table">
              <thead><tr><th>Animal</th><th>Place</th><th>Sterilisation</th><th>Last seen</th></tr></thead>
              <tbody>{animals.slice(0, 6).map((a) => (
                <tr key={a.id}><td>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={a.photo} alt="" loading="lazy" referrerPolicy="no-referrer" /><Link href={`/animal/${a.id}`}>{a.name}</Link></td><td>{a.place}</td><td>{a.ster ?? "Not recorded"}</td><td>{a.seen ?? "Unknown"}</td></tr>
              ))}</tbody>
            </table>
          )}
          {tab === "map" && plate && (
            <div className="ws-map">
              <svg viewBox={plate.vb} role="img" aria-label={`Open requests by area in ${city}`}>
                {plate.dots.map(({ cx, cy, r, c }, i) => <circle key={i} cx={cx.toFixed(1)} cy={cy.toFixed(1)} r={r.toFixed(1)} className={c.crit ? "is-crit" : c.open ? "is-open" : ""} style={{ ["--k" as string]: (c.open / maxOpen).toFixed(2) }}><title>{`${c.name || "Area"}: ${c.open} open`}</title></circle>)}
              </svg>
              <p className="ws-note">Areas of about 0.7 km², shaded by open requests. Flame where one is critical.</p>
            </div>
          )}
          {tab === "city" && facts && (
            <div className="ws-city">
              <dl>
                <div><dt>Animal records</dt><dd>{f(facts.animals)}</dd></div>
                <div><dt>Requests for help</dt><dd>{f(facts.cases)}</dd></div>
                <div><dt>Recorded sterilised</dt><dd>{f(facts.sterilised)}</dd></div>
                <div><dt>Mapped areas</dt><dd>{f(facts.cells)}</dd></div>
              </dl>
              <p className="ws-note">Records, not a census. Unknown sterilisation is never counted as no.</p>
              <Link className="b-link" href={`/community?city=${encodeURIComponent(facts.city)}`}>Open {facts.city} in the map <ArrowUpRight size={14} aria-hidden /></Link>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
