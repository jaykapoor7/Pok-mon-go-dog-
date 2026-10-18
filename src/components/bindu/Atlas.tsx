"use client";

/* ════════════════════════════════════════════════════════════════════
   The living map, at night: India as the Map draws it, every recorded
   area a point of light, real animals strung to their cities. Choose a
   city and its record reads beside the map: totals from the same rollup
   the Map uses, its localities from the same endpoint, its animals.
   Every path continues into the real Map.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { placeName } from "@/lib/livingmap/reading";
import type { MapCell } from "@/lib/livingmap/types";
import { IndiaStrings, type HomeCity, type HomeFace } from "./IndiaStrings";

export type CityFacts = { city: string; state: string | null; animals: number; cells: number; sterilised: number; ster_unknown: number; cases: number; hollow: boolean };
const f = (n: number) => n.toLocaleString("en-IN");

export function Atlas({ cities, faces, facts, sample, sky }: { cities: HomeCity[]; faces: HomeFace[]; facts: CityFacts[]; sample: string | null; sky: [number, number, number][] }) {
  const [sel, setSel] = useState<string>(sample ?? facts[0]?.city ?? "");
  const c = facts.find((x) => x.city === sel) ?? null;
  const theirs = faces.filter((x) => x.city === sel).slice(0, 3);
  const [locs, setLocs] = useState<{ name: string; animals: number; h3: string }[] | "loading" | "none">("loading");
  useEffect(() => {
    if (!c || c.hollow) { setLocs("none"); return; }
    let live = true; setLocs("loading");
    fetch(`/api/livingmap?city=${encodeURIComponent(c.city)}`).then((r) => (r.ok ? r.json() : null)).then((d: { cells: MapCell[] } | null) => {
      if (!live) return;
      if (!d?.cells?.length) { setLocs("none"); return; }
      const by = new Map<string, { name: string; animals: number; h3: string; top: number }>();
      for (const x of d.cells) { const n = placeName(x.zone); if (!n) continue; const g = by.get(n) ?? { name: n, animals: 0, h3: x.h3, top: 0 }; g.animals += x.animals; if (x.animals > g.top) { g.top = x.animals; g.h3 = x.h3; } by.set(n, g); }
      setLocs([...by.values()].sort((a, b) => b.animals - a.animals).slice(0, 5));
    }).catch(() => { if (live) setLocs("none"); });
    return () => { live = false; };
  }, [c]);

  return (
    <div className="at">
      <div className="at-map">
        <IndiaStrings cities={cities} faces={faces} tone="night" max={6} onCity={setSel} selected={sel} sky={sky} />
      </div>
      <aside className="at-panel" aria-live="polite">
        <label className="at-pick"><span>City</span>
          <select value={sel} onChange={(e) => setSel(e.target.value)}>{facts.map((x) => <option key={x.city} value={x.city}>{x.city}</option>)}</select>
        </label>
        {c ? (
          <>
            <h3>{c.city}</h3>
            <p className="at-k">{c.state ? `${c.state} · ` : ""}{c.hollow ? "A city-level register: one location for the whole city, never a street" : `${f(c.cells)} mapped areas`}</p>
            <dl className="at-figs">
              <div><dt>Animal records</dt><dd>{f(c.animals)}</dd></div>
              <div><dt>Requests for help</dt><dd>{f(c.cases)}</dd></div>
              <div><dt>Recorded sterilised</dt><dd>{f(c.sterilised)}</dd></div>
            </dl>
            {Array.isArray(locs) && (
              <ol className="at-locs" aria-label={`Localities in ${c.city}`}>
                {locs.map((l) => (
                  <li key={l.name}><Link href={`/community?city=${encodeURIComponent(c.city)}&area=${l.h3}`}><b>{l.name}</b><span>{f(l.animals)}</span><i style={{ width: `${Math.max(6, (l.animals / (locs[0].animals || 1)) * 100)}%` }} aria-hidden /></Link></li>
                ))}
              </ol>
            )}
            {locs === "loading" && !c.hollow && <p className="at-note" role="status">Reading {c.city}&rsquo;s localities…</p>}
            {theirs.length > 0 && (
              <ul className="at-faces">{theirs.map((x) => (
                <li key={x.id}><Link href={`/animal/${x.id}`}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={x.photo} alt="" loading="lazy" referrerPolicy="no-referrer" /><span><b>{x.title}</b><small>{x.describe ?? "On the record"}</small></span></Link></li>
              ))}</ul>
            )}
            <p className="at-note">{c.ster_unknown > 0 ? `Sterilisation is not recorded for ${f(c.ster_unknown)} animals; unknown is never counted as no. ` : ""}Records, not a census: an area with nothing recorded is not an area with no animals.</p>
            <Link className="b-btn is-flame" href={`/community?city=${encodeURIComponent(c.city)}`}>Open {c.city} in the live map <ArrowUpRight size={16} aria-hidden /></Link>
          </>
        ) : <p className="at-note">The national index could not be read. That is not the same as no records.</p>}
      </aside>
    </div>
  );
}
