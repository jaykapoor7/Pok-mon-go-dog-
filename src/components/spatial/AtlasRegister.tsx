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
