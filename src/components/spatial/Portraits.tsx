"use client";

/* ════════════════════════════════════════════════════════════════════
   Street level: the animals by name.

   Past zoom 15 the points of light give way to the animals themselves —
   a round portrait where there is a photograph, the animal's seal where
   there is not, ringed flame when the animal needs help and blue when it is
   sterilised on record. They are read a few cells at a time from the
   public view and placed inside their cell (the register does not publish
   a street address), and tapping one opens its card.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { SpatialDataset } from "@/lib/spatial/types";
import { ringOf, pointInCell } from "./data";
import { AnimalSeal, sealMarkup } from "@/components/system/AnimalSeal";

type Animal = {
  id: string; name: string | null; code: string | null; straypaw_id: string | null; cover_photo: string | null;
  status: string | null; needs_help: boolean | null; sterilisation_status: string | null; vaccination_status: string | null;
  ear_notch: boolean | null; first_seen: string | null; last_seen: string | null; zone: string | null; h3_r8: string | null;
};

const MIN_ZOOM = 15;
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h) || 1; };
/* Imported records carry a generated label ("Dog · Ganapathi · 12"), not a name anyone gave the animal. */
export const nameOf = (a: { name: string | null }) => {
  const n = a.name?.trim();
  return n && !/^(unknown|unnamed|dog|cat|animal|puppy)\b/i.test(n) && !n.includes(" · ") ? n : null;
};
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string | null) => { if (!iso) return null; const d = new Date(iso); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const yes = (v: string | null) => !!v && /^(yes|done|sterilised|sterilized|vaccinated|complete|recorded)/i.test(v);

/** A dot tapped on the map: its cell and what the dot itself says about the animal. */
export type DotPick = { cell: string; help: boolean; ster: number; vacc: number; at: number };

export function Portraits({ map, ds, on, pick }: { map: MLMap | null; ds: SpatialDataset | null; on: boolean; pick?: DotPick | null }) {
  const cache = useRef(new Map<string, Animal[]>());
  const markers = useRef(new Map<string, Marker>());
  /* The card shows one animal of those recorded in a cell, and steps through the rest. */
  const [card, setCard] = useState<{ list: Animal[]; i: number } | null>(null);
  const openOne = (a: Animal) => { const list = (a.h3_r8 && cache.current.get(a.h3_r8)) || [a]; const i = Math.max(0, list.findIndex((x) => x.id === a.id)); setCard({ list: list.length ? list : [a], i }); };

  useEffect(() => {
    if (!map || !ds) return;
    let dead = false;
    let ml: typeof import("maplibre-gl") | null = null;
    const clear = () => { markers.current.forEach((m) => m.remove()); markers.current.clear(); };

    const draw = async () => {
      if (dead) return;
      if (!on || map.getZoom() < MIN_ZOOM) { clear(); return; }
      ml = ml ?? (await import("maplibre-gl"));
      const b = map.getBounds();
      const visible: number[] = [];
      for (let i = 0; i < ds.cells.length && visible.length < 80; i++) {
        const x = ds.centers[i * 2], y = ds.centers[i * 2 + 1];
        if (x > b.getWest() - 0.01 && x < b.getEast() + 0.01 && y > b.getSouth() - 0.01 && y < b.getNorth() + 0.01) visible.push(i);
      }
      const need = visible.map((i) => ds.cells[i]).filter((k) => !cache.current.has(k));
      if (need.length) {
        try {
          const r = await fetch(`/api/spatial/patch?cells=${need.join(",")}`);
          const j = r.ok ? await r.json() : { animals: [] };
          for (const k of need) cache.current.set(k, []);
          for (const a of (j.animals ?? []) as Animal[]) if (a.h3_r8) cache.current.get(a.h3_r8)?.push(a);
        } catch { /* the lights stay on without portraits */ }
      }
      if (dead || map.getZoom() < MIN_ZOOM) return;
      /* Room for a portrait is earned: an animal that needs help first, then
         one with a photograph, then one with a name, then the most recently
         seen. The rest stay as points of light underneath. */
      const cand: { a: Animal; ll: [number, number]; rank: number }[] = [];
      for (const i of visible) {
        const ring = ringOf(ds, i);
        for (const a of cache.current.get(ds.cells[i]) ?? []) {
          const help = !!a.needs_help || a.status === "injured";
          cand.push({ a, ll: pointInCell(ring, hash(a.id)), rank: (help ? 0 : 4) + (a.cover_photo ? 0 : 2) + (nameOf(a) ? 0 : 1) });
        }
      }
      cand.sort((x, y) => x.rank - y.rank || (y.a.last_seen ?? "").localeCompare(x.a.last_seen ?? ""));
      const placed: { x: number; y: number }[] = [];
      const want = new Set<string>();
      const gap = map.getZoom() >= 17 ? 40 : 48;
      for (const c of cand) {
        const p = map.project(c.ll);
        if (placed.some((q) => (q.x - p.x) ** 2 + (q.y - p.y) ** 2 < gap * gap)) continue;
        placed.push(p);
        want.add(c.a.id);
        const a = c.a;
        if (markers.current.has(a.id)) continue;
        const el = document.createElement("button");
        el.type = "button";
        const help = !!a.needs_help || a.status === "injured";
        el.className = `sm-pin${help ? " is-help" : yes(a.sterilisation_status) ? " is-ster" : ""}${a.cover_photo ? "" : " is-mono"}`;
        el.setAttribute("aria-label", `${nameOf(a) ?? "An animal"}${help ? ", needs help" : ""}`);
        if (a.cover_photo) {
          const img = document.createElement("img");
          img.src = a.cover_photo; img.alt = ""; img.loading = "lazy";
          img.onerror = () => { img.remove(); el.classList.add("is-mono"); el.appendChild(mono(a)); };
          el.appendChild(img);
        } else el.appendChild(mono(a));
        const label = document.createElement("span");
        label.className = "sm-pin-name"; label.textContent = nameOf(a) ?? a.straypaw_id ?? "";
        el.appendChild(label);
        el.addEventListener("click", (e) => { e.stopPropagation(); openOne(a); });
        const m = new ml!.Marker({ element: el, anchor: "center" }).setLngLat(c.ll).addTo(map);
        markers.current.set(a.id, m);
      }
      markers.current.forEach((m, id) => { if (!want.has(id)) { m.remove(); markers.current.delete(id); } });
    };
    draw();
    map.on("moveend", draw);
    return () => { dead = true; map.off("moveend", draw); clear(); };
  }, [map, ds, on]);

  useEffect(() => { if (!on) setCard(null); }, [on]);

  /* A tapped dot: read its cell's public records (once, cached) and open on
     the animal that best matches what the dot says: needs help, then its
     sterilisation and vaccination as recorded. The dot is placed inside its
     cell, never at an address, so the card says "recorded in this cell". */
  useEffect(() => {
    if (!pick) return;
    let dead = false;
    (async () => {
      let list = cache.current.get(pick.cell);
      if (!list) {
        try {
          const r = await fetch(`/api/spatial/patch?cells=${pick.cell}`);
          const j = r.ok ? await r.json() : { animals: [] };
          list = ((j.animals ?? []) as Animal[]).filter((a) => a.h3_r8 === pick.cell);
          cache.current.set(pick.cell, list);
        } catch { list = []; }
      }
      if (dead || !list.length) return;
      const score = (a: Animal) => {
        const help = !!a.needs_help || a.status === "injured";
        return (help === pick.help ? 4 : 0) + (yes(a.sterilisation_status) === (pick.ster === 1) ? 2 : 0) + (yes(a.vaccination_status) === (pick.vacc === 1 || pick.vacc === 3) ? 1 : 0);
      };
      let best = 0;
      list.forEach((a, k) => { if (score(a) > score(list![best])) best = k; });
      setCard({ list, i: best });
    })();
    return () => { dead = true; };
  }, [pick]);

  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCard(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card]);

  if (!card) return null;
  const open = card.list[card.i];
  const many = card.list.length > 1;
  const step = (d: number) => setCard((c) => (c ? { ...c, i: (c.i + d + c.list.length) % c.list.length } : c));
  const name = nameOf(open);
  const help = !!open.needs_help || open.status === "injured";
  return (
    <div className="sm-card" key={open.id} role="dialog" aria-label={name ?? "An animal"}>
      <button type="button" className="sm-card-x" onClick={() => setCard(null)} aria-label="Close"><X size={15} /></button>
      <div className={`sm-card-ph ${open.cover_photo ? "" : "is-mono"}`}>
        {open.cover_photo ? <img src={open.cover_photo} alt="" /> : <AnimalSeal seed={open.id} name={name} />}
      </div>
      <div className="sm-card-b">
        <p className="sm-card-code">{open.straypaw_id ?? open.code ?? "On the register"}</p>
        <p className="sm-card-n">{name ?? "No name yet"}</p>
        <p className="sm-card-tags">
          {help && <span className="is-help">Needs help</span>}
          <span className={yes(open.sterilisation_status) ? "is-yes" : "is-unk"}>{yes(open.sterilisation_status) ? "Sterilised" : "Sterilisation not recorded"}</span>
          <span className={yes(open.vaccination_status) ? "is-yes" : "is-unk"}>{yes(open.vaccination_status) ? "Vaccinated" : "Vaccination not recorded"}</span>
        </p>
        <p className="sm-card-seen">{[open.zone, open.last_seen ? `last seen ${day(open.last_seen)}` : null].filter(Boolean).join(" · ")}</p>
        <Link href={`/dog/${open.id}`} className="sm-card-go">Open the record <ArrowUpRight size={14} /></Link>
        {many && (
          <p className="sm-card-many">
            <button type="button" onClick={() => step(-1)} aria-label="Previous animal in this cell"><ChevronLeft size={15} /></button>
            <span>{card.i + 1} of {card.list.length} recorded in this cell</span>
            <button type="button" onClick={() => step(1)} aria-label="Next animal in this cell"><ChevronRight size={15} /></button>
          </p>
        )}
      </div>
    </div>
  );
}

function mono(a: Animal) {
  const s = document.createElement("span");
  s.className = "sm-pin-mono";
  s.innerHTML = sealMarkup(a.id, nameOf(a));
  return s;
}
