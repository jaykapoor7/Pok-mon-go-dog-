"use client";

/* ════════════════════════════════════════════════════════════════════
   The map, yours to fly. The same night ground and columns of records,
   now in your hands: drag to move, right-drag or two fingers to tilt and
   turn. Choose a city and the camera flies there; its record reads in
   the panel, its localities from the same endpoint the Map uses. Touch
   a column to read its area. Scroll still scrolls the page: zooming the
   map takes Ctrl or two fingers.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Map as MLMap, GeoJSONSource } from "maplibre-gl";
import { groundStyle, underlay, supportsWebGL2, PLATE, GLYPHS } from "@/components/map/basemap";
import { placeName } from "@/lib/livingmap/reading";
import type { MapCell } from "@/lib/livingmap/types";
import { addRecord, areasGeo, edgeGlow, fromCentres, setNight, type Cell } from "./mapkit";

export type CityFacts = { city: string; c: [number, number] | null; animals: number; cells: number; sterilised: number; cases: number };
const f = (n: number) => n.toLocaleString("en-IN");
type Hit = { name: string; animals: number; h3: string; x: number; y: number };

export function Explore({ cells, facts, sample }: { cells: Cell[]; facts: CityFacts[]; sample: string | null }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  /* the chosen city's named areas, kept until the map is ready to take them */
  const named = useRef<ReturnType<typeof areasGeo>["polys"] | null>(null);
  const [sel, setSel] = useState<string>(sample ?? facts[0]?.city ?? "");
  const [locs, setLocs] = useState<{ name: string; animals: number }[] | null>(null);
  const [hit, setHit] = useState<Hit | null>(null);
  const [flat, setFlat] = useState(false);
  const c = facts.find((x) => x.city === sel) ?? null;
  const chips = facts.filter((x) => x.c).slice(0, 8);

  useEffect(() => {
    const box = el.current; if (!box) return;
    if (!supportsWebGL2()) { setFlat(true); return; }
    let alive = true, map: MLMap | null = null;
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting || map) return;
      io.disconnect();
      const ml = await import("maplibre-gl");
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      if (!alive) return;
      const phone = box.clientWidth < 760;
      const m = new ml.Map({ container: box, style: { ...groundStyle(PLATE), glyphs: GLYPHS }, center: [80.5, 21.5], zoom: phone ? 3.2 : 4, pitch: 45, bearing: -12, maxPitch: 75,
        cooperativeGestures: true, attributionControl: { compact: true }, pixelRatio: Math.min(2, window.devicePixelRatio || 1) });
      map = m; mapRef.current = m;
      m.addControl(new ml.NavigationControl({ visualizePitch: true }), "top-right");
      m.on("load", () => {
        const map = m;
        setNight(map);
        addRecord(map, areasGeo(fromCentres(cells)), 1, "ex");
        map.addSource("ex-named", { type: "geojson", data: named.current ?? { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: "ex-named", type: "fill", source: "ex-named", paint: { "fill-color": "#ffffff", "fill-opacity": 0 } });
        underlay(map, PLATE, "ex-glow").then(() => edgeGlow(map));
        map.on("click", "ex-named", (ev) => {
          const ft = ev.features?.[0]; if (!ft) return;
          const pr = ft.properties as { name: string; animals: number; h3: string };
          setHit({ name: pr.name, animals: Number(pr.animals), h3: pr.h3, x: ev.point.x, y: ev.point.y });
        });
        map.on("movestart", () => setHit(null));
        map.on("mouseenter", "ex-named", () => { if (map) map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "ex-named", () => { if (map) map.getCanvas().style.cursor = ""; });
        fly(sample ?? null, map);
      });
    }, { rootMargin: "200px" });
    io.observe(box);
    return () => { alive = false; io.disconnect(); map?.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells]);

  /* Fly to a city and read its named areas for touch. */
  const fly = (city: string | null, m: MLMap | null = mapRef.current) => {
    const x = facts.find((q) => q.city === city); if (!m || !x?.c) return;
    m.flyTo({ center: x.c, zoom: m.getContainer().clientWidth < 760 ? 10 : 10.8, pitch: 60, bearing: -20 + Math.random() * 40, duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 3200, curve: 1.6, essential: true });
  };
  useEffect(() => {
    if (!c) return;
    let live = true; setLocs(null); setHit(null);
    fly(c.city);
    fetch(`/api/livingmap?city=${encodeURIComponent(c.city)}`).then((r) => (r.ok ? r.json() : null)).then((d: { cells: MapCell[] } | null) => {
      if (!live || !d?.cells) { if (live) setLocs([]); return; }
      const by = new Map<string, number>();
      for (const q of d.cells) { const n = placeName(q.zone); by.set(n, (by.get(n) ?? 0) + q.animals); }
      setLocs([...by.entries()].map(([name, animals]) => ({ name, animals })).sort((a, b) => b.animals - a.animals).slice(0, 5));
      named.current = areasGeo(d.cells.map((q) => ({ h3: q.h3, c: q.c, animals: q.animals, name: placeName(q.zone) }))).polys;
      (mapRef.current?.getSource("ex-named") as GeoJSONSource | undefined)?.setData(named.current);
    }).catch(() => { if (live) setLocs([]); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  return (
    <div className="ex">
      <div ref={el} className={`ex-map${flat ? " is-flat" : ""}`} role="region" aria-label="The live map of recorded areas in India, in 3D" />
      <div className="ex-chips" role="group" aria-label="Choose a city">
        {chips.map((x) => <button key={x.city} type="button" aria-pressed={x.city === sel} onClick={() => setSel(x.city)}>{x.city}</button>)}
      </div>
      {c && (
        <aside className="ex-panel" aria-live="polite">
          <h3>{c.city}</h3>
          <dl>
            <div><dt>Animals</dt><dd>{f(c.animals)}</dd></div>
            <div><dt>Areas</dt><dd>{f(c.cells)}</dd></div>
            <div><dt>Requests</dt><dd>{f(c.cases)}</dd></div>
          </dl>
          {locs && locs.length > 0 && <ol>{locs.map((l) => <li key={l.name}><span>{l.name}</span><b>{f(l.animals)}</b></li>)}</ol>}
          <Link className="b-btn is-flame" href={`/community?city=${encodeURIComponent(c.city)}`}>Open {c.city} <ArrowUpRight size={16} aria-hidden /></Link>
        </aside>
      )}
      {hit && (
        <Link className="ex-hit" style={{ left: hit.x, top: hit.y }} href={`/community?city=${encodeURIComponent(sel)}&area=${hit.h3}`}>
          <b>{hit.name}</b><span>{f(hit.animals)} animals</span>
        </Link>
      )}
      <p className="ex-note">Each column is an area of about 0.7 km², as tall as its animals on the record. Records, not a census.</p>
    </div>
  );
}
