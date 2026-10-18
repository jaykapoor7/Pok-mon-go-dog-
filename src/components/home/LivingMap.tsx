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
import { useState, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { IndiaStrings, type HomeCity, type HomeFace } from "./IndiaStrings";

export type CityFacts = { city: string; state: string | null; animals: number; cells: number; sterilised: number; ster_unknown: number; cases: number; care: number; hollow: boolean };
const f = (n: number) => n.toLocaleString("en-IN");

export function LivingMap({ cities, faces, facts, sample, plate }: { cities: HomeCity[]; faces: HomeFace[]; facts: CityFacts[]; sample: string | null; plate: ReactNode }) {
  const [sel, setSel] = useState<string>(sample ?? facts[0]?.city ?? "");
  const c = facts.find((x) => x.city === sel) ?? null;
  const theirs = faces.filter((x) => x.city === sel).slice(0, 3);
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
