"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search as SearchIcon, MapPin, PawPrint, Building2 } from "lucide-react";
import type { Locality } from "@/lib/livingmap/reading";
import type { NationalCity } from "@/lib/livingmap/types";
import type { FoundAnimal } from "@/lib/livingmap/server";

type Hit = { key: string; kind: "city" | "place" | "animal"; label: string; sub: string; go: () => void };

/* One search for the whole map: cities, the open city's localities, and
 * animals by StrayPaw tag or given name. Arrow keys move, Enter opens. */
export function MapSearch({ cities, places, city, onCity, onPlace, onFound }: {
  cities: NationalCity[]; places: Locality[]; city: string | null;
  onCity: (c: string) => void; onPlace: (p: Locality) => void; onFound: (a: FoundAnimal) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState<FoundAnimal[]>([]);
  const [at, setAt] = useState(0);
  const list = useId();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 3) { setFound([]); return; }
    const id = window.setTimeout(() => {
      fetch(`/api/livingmap?kind=find&q=${encodeURIComponent(t)}`).then((r) => r.json()).then((j) => setFound(j.animals ?? [])).catch(() => setFound([]));
    }, 220);
    return () => window.clearTimeout(id);
  }, [q]);

  const hits: Hit[] = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const out: Hit[] = [];
    for (const c of cities) if (c.city.toLowerCase().includes(t)) out.push({ key: `c:${c.city}`, kind: "city", label: c.city, sub: `${c.animals.toLocaleString("en-IN")} records${c.state ? ` · ${c.state}` : ""}`, go: () => onCity(c.city) });
    for (const p of places) if (p.name.toLowerCase().includes(t)) out.push({ key: `p:${p.name}`, kind: "place", label: p.name, sub: `${city} · ${p.animals.toLocaleString("en-IN")} animals`, go: () => onPlace(p) });
    for (const a of found) out.push({ key: `a:${a.id}`, kind: "animal", label: a.title, sub: [a.zone?.split(",")[0], a.city].filter(Boolean).join(" · "), go: () => onFound(a) });
    return out.slice(0, 12);
  }, [q, cities, places, found, city, onCity, onPlace, onFound]);

  useEffect(() => setAt(0), [q]);
  useEffect(() => {
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const pick = (h: Hit) => { h.go(); setQ(""); setOpen(false); };
  const Icon = { city: Building2, place: MapPin, animal: PawPrint };

  return (
    <div className="lm-search" ref={box}>
      <SearchIcon size={16} aria-hidden />
      <input
        type="search" value={q} placeholder={city ? `Search ${city}, cities or an animal tag` : "Search a city or an animal tag"}
        role="combobox" aria-expanded={open && hits.length > 0} aria-controls={list} aria-autocomplete="list" aria-label="Search the map"
        aria-activedescendant={open && hits[at] ? `${list}-${at}` : undefined}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setAt((i) => Math.min(hits.length - 1, i + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setAt((i) => Math.max(0, i - 1)); }
          else if (e.key === "Enter" && hits[at]) { e.preventDefault(); pick(hits[at]); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
      />
      {open && q.trim() && (
        <ul id={list} role="listbox" className="lm-search-list">
          {hits.length === 0 && <li className="lm-search-none" role="option" aria-selected={false}>{q.trim().length < 3 ? "Keep typing…" : "Nothing on the record matches."}</li>}
          {hits.map((h, i) => {
            const I = Icon[h.kind];
            return (
              <li key={h.key} id={`${list}-${i}`} role="option" aria-selected={i === at} className={i === at ? "is-at" : ""} onPointerDown={(e) => { e.preventDefault(); pick(h); }} onPointerEnter={() => setAt(i)}>
                <I size={15} aria-hidden /><span><b>{h.label}</b><small>{h.sub}</small></span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
