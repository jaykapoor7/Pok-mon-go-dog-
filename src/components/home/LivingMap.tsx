"use client";

/* ════════════════════════════════════════════════════════════════════
   The Living Map, on the landing: India first, then a city.

   The national plate is the Map's own outline and cities, with real
   animals strung to them. Choosing a city reads its record beside the map
   (from the same national rollup the Map uses) and, for the sample city,
   plays its register filling in: every record landing where and when it
   was made (HeroPlate). Every path continues into the real Map.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { placeName } from "@/lib/livingmap/reading";
import type { MapCell } from "@/lib/livingmap/types";
import { ArrowUpRight } from "lucide-react";
import { IndiaStrings, type HomeCity, type HomeFace } from "./IndiaStrings";

export type CityFacts = { city: string; state: string | null; animals: number; cells: number; sterilised: number; ster_unknown: number; cases: number; care: number; hollow: boolean };
const f = (n: number) => n.toLocaleString("en-IN");

export function LivingMap({ cities, faces, facts, sample, plate }: { cities: HomeCity[]; faces: HomeFace[]; facts: CityFacts[]; sample: string | null; plate: ReactNode }) {
  const [sel, setSel] = useState<string>(sample ?? facts[0]?.city ?? "");
  const c = facts.find((x) => x.city === sel) ?? null;
  const theirs = faces.filter((x) => x.city === sel).slice(0, 3);
  /* The locality scale: the chosen city's areas, read from the same endpoint the Map uses,
     grouped by recorded locality. A city-level register has no localities to show. */
  const [locs, setLocs] = useState<{ name: string; animals: number; h3: string }[] | "loading" | "none">("loading");
  const [loc, setLoc] = useState<string | null>(null);
  useEffect(() => {
    if (!c || c.hollow) { setLocs("none"); return; }
    let live = true; setLocs("loading"); setLoc(null);
    fetch(`/api/livingmap?city=${encodeURIComponent(c.city)}`).then((r) => (r.ok ? r.json() : null)).then((d: { cells: MapCell[] } | null) => {
      if (!live) return;
      if (!d?.cells?.length) { setLocs("none"); return; }
      const by = new Map<string, { name: string; animals: number; h3: string; top: number }>();
      for (const x of d.cells) { const n = placeName(x.zone); if (!n) continue; const g = by.get(n) ?? { name: n, animals: 0, h3: x.h3, top: 0 }; g.animals += x.animals; if (x.animals > g.top) { g.top = x.animals; g.h3 = x.h3; } by.set(n, g); }
      setLocs([...by.values()].sort((a, b) => b.animals - a.animals).slice(0, 6));
    }).catch(() => { if (live) setLocs("none"); });
    return () => { live = false; };
  }, [c]);
  return (
    <div className="lm">
      <div className="lm-map">
        <IndiaStrings cities={cities} faces={faces} tone="paper" max={6} onCity={setSel} selected={sel} />
        <p className="lm-hint">Choose a city. Marks are sized by animals on the record; a hollow mark is a city-level register, never a street.</p>
      </div>
      <aside className="lm-panel" aria-live="polite">
        {c ? (
          <>
            <p className="h-k">{c.state ? `${c.state} · ` : ""}{c.hollow ? "City-level register" : `${f(c.cells)} mapped areas`}</p>
            <h3>{c.city}</h3>
            <dl className="lm-figs">
              <div><dt>Animals on the record</dt><dd>{f(c.animals)}</dd></div>
              <div><dt>Requests for help</dt><dd>{f(c.cases)}</dd></div>
              <div><dt>Recorded sterilised</dt><dd>{f(c.sterilised)}</dd></div>
            </dl>
            <p className="lm-note">{c.ster_unknown > 0 ? `Sterilisation is not recorded for ${f(c.ster_unknown)} animals; unknown is never counted as no. ` : ""}Records, not a census: an area with nothing recorded is not an area with no animals.</p>
            {c.city === sample && plate && <div className="lm-plate">{plate}</div>}
            {Array.isArray(locs) && (
              <ol className="lm-locs" aria-label={`Localities in ${c.city}`}>
                {locs.map((l) => {
                  const max = locs[0].animals || 1;
                  return (
                    <li key={l.name}><Link href={`/community?city=${encodeURIComponent(c.city)}&area=${l.h3}`} onMouseEnter={() => setLoc(l.name)} onFocus={() => setLoc(l.name)} aria-current={loc === l.name ? "true" : undefined}>
                      <b>{l.name}</b><span>{f(l.animals)}</span><i style={{ width: `${Math.max(6, (l.animals / max) * 100)}%` }} aria-hidden />
                    </Link></li>
                  );
                })}
              </ol>
            )}
            {locs === "loading" && !c.hollow && <p className="lm-note" role="status">Reading {c.city}&rsquo;s localities…</p>}
            {theirs.length > 0 && (
              <ul className="lm-faces">{theirs.map((x) => (
                <li key={x.id}><Link href={`/animal/${x.id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={x.photo} alt="" loading="lazy" referrerPolicy="no-referrer" /><b>{x.title}</b><small>{x.describe ?? "On the record"}</small>
                </Link></li>
              ))}</ul>
            )}
            <Link className="h-btn" href={`/community?city=${encodeURIComponent(c.city)}`}>Open {c.city} in the Map <ArrowUpRight size={16} aria-hidden /></Link>
          </>
        ) : <p className="lm-note">The national index could not be read. That is not the same as no records.</p>}
      </aside>
    </div>
  );
}
