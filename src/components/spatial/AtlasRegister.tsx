"use client";

import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { SpatialCity } from "./data";

const number = (value: number) => value.toLocaleString("en-IN");

/** Qualitative source notes verified in the Phase 1 audit. Counts always come
 * from the live city index; these notes never supply measurements. */
export function cityEvidence(city: string, cells: number) {
  if (city === "Jamshedpur") return { label: "Clinical register", precision: "City-level location", note: "Historical clinical records share a city location. They cannot describe individual streets or neighbourhoods." };
  if (city === "Ranchi") return { label: "Vaccination campaign", precision: "Source GPS · public cells", note: "Campaign records include source GPS. Public positions are grouped into cells; this is the campaign footprint, not a population survey." };
  if (city === "Coimbatore") return { label: "Rescue & care", precision: "Approximate localities", note: "Rescue requests and care histories are located mainly by recorded locality. Individual dots are schematic positions within a cell." };
  if (city === "Lucknow") return { label: "Rescue register", precision: "Approximate localities", note: "Rescue encounters include provisional animal identities. Multiple encounters do not necessarily represent different animals." };
  if (city === "Hyderabad") return { label: "Photo observations", precision: "Public observation cells", note: "A small set of photographed observations. The record is not representative of all animals in the city." };
  return { label: cells <= 1 ? "Place register" : "Animal records", precision: cells <= 1 ? "Single recorded cell" : "Public location cells", note: "This is the footprint of recorded evidence. Empty areas indicate missing reporting, not an absence of animals or care." };
}

export function AtlasRegister({ cities, open, onToggle, onCity, municipal = false }: {
  cities: SpatialCity[]; open: boolean; onToggle: () => void; onCity: (city: string) => void; municipal?: boolean;
}) {
  const ordered = [...cities].sort((a, b) => b.animals - a.animals);
  const total = cities.reduce((sum, city) => sum + city.animals, 0);
  return <section className={`atlas-register ${open ? "is-expanded" : ""}`} aria-label="India Atlas register">
    <header className="atlas-intro">
      <p className="atlas-eyebrow">StrayPaw / {municipal ? "Geographic intelligence" : "Living India Atlas"}</p>
      <h2>INDIA</h2>
      <p className="atlas-deck">The recorded street-animal index</p>
      <div className="atlas-total"><strong>{cities.length ? number(total) : "—"}</strong><span>recorded profiles · {cities.length || "—"} city registers</span></div>
      <p className="atlas-caveat">Recorded profiles, not a population estimate.</p>
    </header>
    <button className="atlas-mobile-toggle" type="button" aria-expanded={open} onClick={onToggle}><span>Explore {cities.length} city registers</span><ArrowDown size={16} /></button>
    <div className="atlas-directory" role="region" aria-label="City and source comparison" tabIndex={0}>
      <div className="atlas-directory-head"><span>City / source register</span><span>Profiles · open cases</span></div>
      <ol>{ordered.map((city, i) => {
        const source = cityEvidence(city.city, city.cells);
        return <li key={city.city}><button type="button" onClick={() => onCity(city.city)}>
          <span className="atlas-index">{String(i + 1).padStart(2, "0")}</span>
          <span className="atlas-city-name"><b>{city.city}</b><small>{source.label}</small></span>
          <span className="atlas-city-count">{number(city.animals)}<small>{typeof city.open_cases === "number" ? `${number(city.open_cases)} open` : "Case total not recorded"}</small></span>
        </button></li>;
      })}</ol>
    </div>
    <footer className="atlas-directory-foot"><span>Index scope / recorded profiles, not comparable populations</span><Link href="/app" aria-label="Open your local patch">Community <ArrowUpRight size={17} /></Link></footer>
  </section>;
}

export function CityEvidence({ city, cells, municipal }: { city: string; cells: number; municipal: boolean }) {
  const source = cityEvidence(city, cells);
  return <div className="atlas-evidence-note">
    <span className="atlas-evidence-mark" aria-hidden />
    <div><b>{source.precision}</b><p>{source.note}</p>{municipal && <p>Cells are analysis areas, not ward boundaries. Programme coverage needs a compatible population denominator.</p>}</div>
  </div>;
}

/* ── source-aware India ──────────────────────────────────────────────
   The thirty-odd city registers are not one kind of evidence. A clinical
   programme's archive, a GPS vaccination campaign, a rescue line's
   requests and a handful of photographed observations answer different
   questions, so at national scale the Atlas colours each city by the KIND
   of record it holds, and sizes it by the measure the Lens asks about. */
export type EvidenceKind = "clinical" | "campaign" | "rescue" | "photo" | "register";
export const KIND_META: Record<EvidenceKind, { label: string; color: string; reads: string }> = {
  rescue: { label: "Rescue & care", color: "#f26c52", reads: "Requests for help, treatment and outcomes" },
  campaign: { label: "Vaccination campaign", color: "#66c5d5", reads: "Where a campaign worked, with source GPS" },
  clinical: { label: "Clinical register", color: "#93b1f0", reads: "A programme archive at city level only" },
  photo: { label: "Photo observations", color: "#e3b35b", reads: "Individual animals, photographed" },
  register: { label: "Place registers", color: "#c9cfdb", reads: "Smaller lists of recorded animals" },
};
export function kindOf(city: string, cells: number): EvidenceKind {
  const label = cityEvidence(city, cells).label;
  if (label === "Clinical register") return "clinical";
  if (label === "Vaccination campaign") return "campaign";
  if (label === "Rescue & care" || label === "Rescue register") return "rescue";
  if (label === "Photo observations" || city === "Delhi") return "photo";
  return "register";
}

export function AtlasIndex({ cities, onCity, measure, measureLabel }: {
  cities: SpatialCity[]; onCity: (city: string) => void;
  measure: (c: SpatialCity) => number; measureLabel: string;
}) {
  const total = cities.reduce((sum, c) => sum + c.animals, 0);
  const ordered = [...cities].sort((a, b) => measure(b) - measure(a) || b.animals - a.animals);
  const max = Math.max(1, ...ordered.map(measure));
  const kinds = (Object.keys(KIND_META) as EvidenceKind[]).map((k) => ({ k, n: cities.filter((c) => kindOf(c.city, c.cells) === k).length })).filter((x) => x.n > 0);
  return (
    <div className="ax-index">
      <div className="ax-total">
        <b className="x-num">{cities.length ? number(total) : "—"}</b>
        <span>animal profiles recorded across <b>{cities.length || "—"}</b> city registers. Records, not a population — and not one kind of record.</span>
      </div>
      <ul className="ax-kinds" aria-label="Kinds of evidence">
        {kinds.map(({ k, n }) => <li key={k}><i style={{ background: KIND_META[k].color }} aria-hidden /><span><b>{KIND_META[k].label}</b><small>{KIND_META[k].reads} · {n} {n === 1 ? "city" : "cities"}</small></span></li>)}
      </ul>
      <div className="ax-index-head"><span>City register</span><span>{measureLabel}</span></div>
      <ol className="ax-cities">
        {ordered.map((c) => {
          const k = kindOf(c.city, c.cells);
          const v = measure(c);
          return (
            <li key={c.city}>
              <button type="button" onClick={() => onCity(c.city)}>
                <i className={`ax-kind-dot${c.cells <= 1 ? " is-one" : ""}`} style={{ ["--k" as string]: KIND_META[k].color }} aria-hidden />
                <span className="ax-city-t"><b>{c.city}</b><small>{KIND_META[k].label}{c.cells <= 1 ? " · one location" : ` · ${number(c.cells)} cells`}</small></span>
                <span className="ax-city-v"><b className="x-num">{number(v)}</b><span className="ax-bar" aria-hidden><span style={{ width: `${Math.max(2, Math.sqrt(v / max) * 100)}%`, background: KIND_META[k].color }} /></span></span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="ax-fine">Bars use a square-root scale so small registers stay visible. Hollow marks hold every record at one shared city location.</p>
    </div>
  );
}
