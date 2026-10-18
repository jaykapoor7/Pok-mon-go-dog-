"use client";

/* ════════════════════════════════════════════════════════════════════
   The circle. Warli painters draw a community as a ring of figures,
   hand in hand, turning: white on a mud wall. Here the ring is everyone
   who helps a street animal, and it turns as the page scrolls. Then it
   unrolls: the wall opens into the NGO workspace, five figures each take
   a real open request as the one holding it, and the rest gather into
   the team at the top. What remains is the working product, live, with
   its four views to click through.

   Figures are original drawings made for StrayPaw in the Warli manner.
   Positions are CSS (sin/cos of each figure's angle, blended with its
   seat in the workspace by --u), so the whole unrolling is one variable.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useStage, span } from "./stage";

export type QueueRow = { condition: string; locality: string; days: number; critical: boolean };
export type AnimalRow = { id: string; name: string; place: string; photo: string; ster: string | null; seen: string | null };
export type AreaCell = { ring: number[]; open: number; crit: number; name: string };
export type CityFig = { city: string; animals: number; cases: number; sterilised: number; ster_unknown: number; cells: number } | null;

const K = 14;
const ROLES = ["Residents", "Feeders", "Rescuers", "Vets", "Coordinators", "City teams"];

/* A Warli figure: a circle head, two triangles meeting at the waist, stick limbs, arms out to the neighbours. */
function Figure() {
  return (
    <svg viewBox="-20 -26 40 52" aria-hidden>
      <circle cx="0" cy="-19" r="5" />
      <path d="M-8,-12 L8,-12 L0,0 Z M0,0 L-7,12 L7,12 Z" />
      <path d="M-8,-11 L-19,-4 M8,-11 L19,-4 M-4,12 L-8,24 M4,12 L9,24" className="wl-limb" />
    </svg>
  );
}

export function Circle({ city, live, critical, queue, animals, cells, box, facts }: {
  city: string; live: number; critical: number; queue: QueueRow[]; animals: AnimalRow[]; cells: AreaCell[]; box: [number, number, number, number] | null; facts: CityFig;
}) {
  const { p, listen, still } = useStage();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"work" | "animals" | "map" | "city">("work");
  useEffect(() => { if (still) { setReady(true); return; } const f = () => setReady(span(p.current, 0.6, 0.8) >= 1); f(); return listen(f); }, [p, listen, still]);
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
      <div className="wl-wall" aria-hidden />
      <p className="wl-say">Everyone who helps an animal <em>works on one record.</em></p>
      <ul className="wl-roles" aria-label="Who works on StrayPaw">{ROLES.map((r, i) => <li key={r} style={{ ["--a" as string]: `${(i / ROLES.length) * 360 + 30}deg` }}>{r}</li>)}</ul>
      <svg className="wl-hands" viewBox="-100 -100 200 200" aria-hidden><circle r="72" /></svg>

      <section className="ws" aria-label={`The StrayPaw NGO workspace, live for ${city}`} inert={!ready || undefined}>
        <div className="ws-bar">
          <b>StrayPaw</b><span className="ws-org">NGO</span>
          <nav role="tablist" aria-label="Workspace views">
            {(["work", "animals", "map", "city"] as const).map((t) => (
              <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}>{t === "work" ? "Work" : t === "animals" ? "Animals" : t === "map" ? "Map" : "City"}</button>
            ))}
          </nav>
          <span className="ws-team" aria-label="The team" />
        </div>
        <div className="ws-body" role="tabpanel">
          {tab === "work" && (
            <>
              <div className="ws-day"><b>Today&rsquo;s work</b><span>{f(live)} open · {f(critical)} critical</span><em className="ws-live">Live record · {city}</em></div>
              <ol className="ws-rows">{rows.map((q, i) => (
                <li key={i} className={q.critical ? "is-crit" : ""}><i className="ws-seat" aria-hidden /><b>{q.condition}</b><span>{q.locality}</span><em>{q.days === 0 ? "today" : `${q.days}d waiting`}</em></li>
              ))}</ol>
              <p className="ws-note">Real open requests on {city}&rsquo;s public record, oldest first among the urgent. No organisation is named.</p>
            </>
          )}
          {tab === "animals" && (
            <table className="ws-table">
              <thead><tr><th>Animal</th><th>Place</th><th>Sterilisation</th><th>Last seen</th></tr></thead>
              <tbody>{animals.slice(0, 6).map((a) => (
                <tr key={a.id}><td>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={a.photo} alt="" loading="lazy" referrerPolicy="no-referrer" /><Link href={`/animal/${a.id}`}>{a.name}</Link></td><td>{a.place}</td><td>{a.ster ?? "Not recorded"}</td><td>{a.seen ?? "—"}</td></tr>
              ))}</tbody>
            </table>
          )}
          {tab === "map" && plate && (
            <div className="ws-map">
              <svg viewBox={plate.vb} role="img" aria-label={`Open requests by area in ${city}`}>
                {plate.dots.map(({ cx, cy, r, c }, i) => <circle key={i} cx={cx.toFixed(1)} cy={cy.toFixed(1)} r={r.toFixed(1)} className={c.crit ? "is-crit" : c.open ? "is-open" : ""} style={{ ["--k" as string]: (c.open / maxOpen).toFixed(2) }}><title>{`${c.name || "Area"}: ${c.open} open`}</title></circle>)}
              </svg>
              <p className="ws-note">Each round area is about 0.7 km². Shaded by open requests; flame where one is critical. Areas, never addresses.</p>
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
              <p className="ws-note">{facts.ster_unknown > 0 ? `Sterilisation is not recorded for ${f(facts.ster_unknown)} animals; unknown is never counted as no. ` : ""}Records, not a census.</p>
              <Link className="b-link" href={`/community?city=${encodeURIComponent(facts.city)}`}>Open {facts.city} in the map <ArrowUpRight size={14} aria-hidden /></Link>
            </div>
          )}
        </div>
      </section>

      <div className="wl-ring" aria-hidden>
        {Array.from({ length: K }, (_, i) => (
          <span key={i} className={`wl-fig${i < rows.length ? " is-seat" : " is-team"}`} style={{ ["--a" as string]: `${(i / K) * 360}deg`, ["--s" as string]: i, ["--t" as string]: i - rows.length }}><Figure /></span>
        ))}
      </div>
    </div>
  );
}
