"use client";

/* ════════════════════════════════════════════════════════════════════
   Two small maps for the public record pages, on the Map's illustrated
   ground (src/sp/map/ground, shared with the Living Atlas).

   PinPicker  choose a place: drag the map under a fixed pin, search a
              street or landmark in India, or use where you are. The
              search and "Where I am" work without the map, so a phone
              that cannot draw it (or a keyboard user) can still place a
              report. The exact point is private to reviewers and
              organisations; public pages show its area only.
   AreaBlooms areas of about 0.74 km² sized by a count, never a spot.
              Choosing an area narrows the list beside it.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MLMap } from "maplibre-gl";
import { cellToLatLng, isValidCell } from "h3-js";
import { Crosshair, MapPin, Search } from "lucide-react";
import { supportsWebGL2 } from "@/components/map/basemap";
import { GLYPHS, collapseAttribution, drawGround, groundStyle } from "@/sp/map/ground";
import { BLOOM_PX, bloom } from "@/sp/map/marks";
import { locateMe } from "@/sp/atlas/locate";
import { describeSpot, nearestCity } from "@/lib/delhi";
import { looksIndian } from "@/lib/exif";
import "./map.css";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ATTR = "© OpenStreetMap contributors · OpenFreeMap · Natural Earth";

export type Picked = { lat: number; lng: number; zone: string };
type Hit = { lat: number; lng: number; label: string };

export function PinPicker({ value, onPick, label, onLabel, statusClass = "" }: { value: { lat: number; lng: number } | null; onPick: (p: Picked) => void; label: string | null; onLabel: (s: string | null) => void; statusClass?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const cb = useRef({ onPick, onLabel }); cb.current = { onPick, onLabel };
  const start = useRef(value);
  const lookup = useRef(0);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  /* What the last search found: nothing, or the search itself failed (it used to say neither). */
  const [found, setFound] = useState<"ok" | "none" | "error">("ok");
  /* The words a chosen place put in the box: they are not searched again (the list used to reopen under the box). */
  const picked = useRef<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [where, setWhere] = useState<string | null>(null);

  /* A place chosen by search or location is picked at once, even when the map cannot be drawn. */
  const choose = (lat: number, lng: number) => {
    const version = ++lookup.current;
    if (!looksIndian(lat, lng)) { cb.current.onLabel("Choose a place in India."); return; }
    const near = nearestCity(lat, lng);
    cb.current.onPick({ lat, lng, zone: near }); cb.current.onLabel(near);
    describeSpot(lat, lng).then(({ zone, street }) => {
      if (version === lookup.current) { cb.current.onPick({ lat, lng, zone }); cb.current.onLabel(street ? `${street}, ${zone}` : zone); }
    }).catch(() => {});
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 17, duration: reduced() ? 0 : 900 });
  };

  useEffect(() => {
    if (!el.current) return;
    if (!supportsWebGL2()) { setFailed(true); return; }
    let dead = false, map: MLMap | null = null, t: number | undefined;
    const lookups = lookup;
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const s = start.current;
      map = new ml.Map({ container: el.current, style: { ...groundStyle(), glyphs: GLYPHS }, center: s ? [s.lng, s.lat] : [80.2, 22.4], zoom: s ? 16 : 4, attributionControl: { compact: true, customAttribution: ATTR }, dragRotate: false, pitchWithRotate: false, maxZoom: 18 });
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.on("load", () => { drawGround(map!).catch(() => {}); collapseAttribution(map!); });
      map.on("movestart", () => { lookups.current++; window.clearTimeout(t); });
      map.on("moveend", () => {
        const m = map!; const c = m.getCenter();
        const version = ++lookups.current;
        if (m.getZoom() < 12) return;
        window.clearTimeout(t);
        t = window.setTimeout(() => {
          if (dead || version !== lookups.current) return;
          if (!looksIndian(c.lat, c.lng)) { cb.current.onLabel("Outside India"); return; }
          const near = nearestCity(c.lat, c.lng);
          cb.current.onPick({ lat: c.lat, lng: c.lng, zone: near }); cb.current.onLabel(near);
          describeSpot(c.lat, c.lng).then(({ zone, street }) => {
            if (!dead && version === lookups.current) { cb.current.onPick({ lat: c.lat, lng: c.lng, zone }); cb.current.onLabel(street ? `${street}, ${zone}` : zone); }
          }).catch(() => {});
        }, 250);
      });
    }).catch(() => setFailed(true));
    return () => { dead = true; lookups.current++; window.clearTimeout(t); map?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 3 || t === picked.current) { setHits([]); setSearching(false); setFound("ok"); return; }
    setSearching(true);
    const id = window.setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&limit=5&q=${encodeURIComponent(t)}`, { headers: { Accept: "application/json" } })
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then((d: { lat: string; lon: string; display_name: string }[]) => { setHits(d.map((x) => ({ lat: +x.lat, lng: +x.lon, label: x.display_name }))); setFound(d.length ? "ok" : "none"); })
        .catch(() => { setHits([]); setFound("error"); }).finally(() => setSearching(false));
    }, 350);
    return () => window.clearTimeout(id);
  }, [q]);
  const pick = (h: Hit) => { const words = h.label.split(",").slice(0, 2).join(","); picked.current = words.trim(); setQ(words); setHits([]); setFound("ok"); choose(h.lat, h.lng); };

  const here = () => {
    setLocating(true); setWhere(null);
    locateMe((lat, lng) => { setLocating(false); choose(lat, lng); }, (m) => { setLocating(false); setWhere(m); });
  };

  return (
    <div className="pbm-pick">
      <div className="pbm-tools">
        <label className="pbm-q"><Search size={16} aria-hidden /><span className="pb-sr">Search a street, landmark or area</span>
          <input type="search" value={q} onChange={(e) => { picked.current = null; setQ(e.target.value); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const h = hits[0]; if (h) pick(h); } }} placeholder="Search a street, landmark or area" autoComplete="off" aria-controls="pbm-hits" />
        </label>
        <button type="button" className="pb-btn is-line" onClick={here} disabled={locating}><Crosshair size={16} aria-hidden />{locating ? "Finding you…" : "Where I am"}</button>
      </div>
      {where && <p className="pbm-warn" role="alert">{where}</p>}
      <div id="pbm-hits" aria-live="polite">
        {searching && q.trim().length >= 3 && !hits.length ? <p className="pbm-hint">Searching…</p> : null}
        {!searching && found === "none" ? <p className="pbm-hint">No places found. Try a nearby landmark, or move the map to the spot.</p> : null}
        {!searching && found === "error" ? <p className="pbm-hint">Place search is not available just now. Move the map to put the pin on the spot.</p> : null}
        {hits.length > 0 && (
          <ul className="pbm-hits" aria-label="Places found">
            {hits.map((h) => <li key={`${h.lat},${h.lng}`}><button type="button" onClick={() => pick(h)}>{h.label}</button></li>)}
          </ul>
        )}
      </div>
      <div className="pbm-map">
        <div ref={el} className="pbm-canvas" aria-hidden />
        <span className="pbm-pin" aria-hidden><MapPin size={36} /></span>
        {failed && <p className="pbm-err">This browser cannot draw the map. Search for the place instead.</p>}
      </div>
      <p className={`pbm-label ${statusClass}`.trim()} role="status">{label ? <>Pinned: <b>{label}</b>{failed ? null : " · drag the map to move the pin"}</> : failed ? "Not pinned yet. Search for the place or use where you are." : "Not pinned yet. Zoom in to the street, then drag the map under the pin, or search."}</p>
    </div>
  );
}

export type Area = { h3: string; value: number };
const ZS: [number, number][] = [[6, 9], [9, 16], [11, 26], [12, 38], [13, 56], [15, 150]];

export function AreaBlooms({ cells, selected, onPick, label, ink = "#1f6f80", empty }: { cells: Area[]; selected?: string | null; onPick?: (h3: string | null) => void; label: string; ink?: string; empty: string }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pick = useRef(onPick); pick.current = onPick;

  useEffect(() => {
    if (!el.current) return;
    if (!supportsWebGL2()) { setErr("This browser cannot draw the map; the list holds every item."); return; }
    let dead = false, map: MLMap | null = null;
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new ml.Map({ container: el.current, style: { ...groundStyle(), glyphs: GLYPHS }, center: [78.9, 22.5], zoom: 4, attributionControl: { compact: true, customAttribution: ATTR }, dragRotate: false, pitchWithRotate: false, maxZoom: 16 });
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.on("load", () => {
        const m = map!;
        m.setMissingStyleImageResolver((id: string) => { if (!m.hasImage(id) && id.startsWith("bl|")) m.addImage(id, bloom(id.slice(3)), { pixelRatio: 2 }); });
        m.addSource("a", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addSource("sel", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        const size = ["interpolate", ["exponential", 2], ["zoom"], ...ZS.flatMap(([z, px]) => [z, ["*", ["get", "k"], px / (BLOOM_PX / 2)]])];
        m.addLayer({ id: "a", type: "symbol", source: "a", layout: { "icon-image": ["get", "img"], "icon-size": size as never, "icon-allow-overlap": true, "icon-ignore-placement": true, "symbol-sort-key": ["get", "sort"] } });
        m.addLayer({ id: "sel", type: "circle", source: "sel", paint: { "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], ...ZS.flatMap(([z, px]) => [z, ["*", ["get", "k"], px * 0.62 + 5]])] as never, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#2457ce", "circle-stroke-width": 2.5 } });
        m.addLayer({ id: "a-n", type: "symbol", source: "a", minzoom: 10.5, layout: { "text-field": ["get", "t"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-allow-overlap": true }, paint: { "text-color": "#0b1e3d", "text-halo-color": "#fffdf9", "text-halo-width": 2 } });
        if (pick.current) {
          m.on("click", "a", (e) => { const h = e.features?.[0]?.properties?.h3; if (h) pick.current?.(String(h)); });
          m.on("click", (e) => { if (!m.queryRenderedFeatures(e.point, { layers: ["a"] }).length) pick.current?.(null); });
          m.on("mouseenter", "a", () => { m.getCanvas().style.cursor = "pointer"; });
          m.on("mouseleave", "a", () => { m.getCanvas().style.cursor = ""; });
        }
        drawGround(m, "a").catch(() => {});
        collapseAttribution(m);
        setReady(true);
      });
    }).catch(() => setErr("The map could not start; the list holds every item."));
    return () => { dead = true; map?.remove(); mapRef.current = null; };
  }, []);

  const fitted = useRef("");
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const valid = cells.filter((c) => c.h3 && isValidCell(c.h3) && c.value > 0);
    const max = Math.sqrt(Math.max(1, ...valid.map((c) => c.value)));
    const k = (v: number) => 0.6 + (Math.sqrt(v) / max) * 0.8;
    (m.getSource("a") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: valid.map((c) => {
      const [lat, lng] = cellToLatLng(c.h3);
      return { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: { h3: c.h3, k: k(c.value), img: `bl|${ink}`, sort: -c.value, t: c.value > 1 ? String(c.value) : "" } };
    }) });
    const ring = selected && isValidCell(selected) ? [selected] : [];
    (m.getSource("sel") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: ring.map((h) => { const [lat, lng] = cellToLatLng(h); const v = valid.find((c) => c.h3 === h)?.value ?? 1; return { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: { k: k(v) } }; }) });
    const key = valid.map((c) => c.h3).sort().join();
    if (valid.length && key !== fitted.current) {
      fitted.current = key;
      const pts = valid.map((c) => cellToLatLng(c.h3));
      const lats = pts.map((p) => p[0]), lngs = pts.map((p) => p[1]);
      const d = 0.012;
      m.fitBounds([[Math.min(...lngs) - d, Math.min(...lats) - d], [Math.max(...lngs) + d, Math.max(...lats) + d]], { padding: 40, maxZoom: 13.5, duration: reduced() ? 0 : 900 });
    }
  }, [cells, selected, ready, ink]);

  const has = cells.some((c) => c.value > 0);
  return (
    <div className="pbm-areas" role="region" aria-label={label}>
      <div ref={el} className="pbm-canvas" />
      {(err || (!has && ready)) && <p className="pbm-err">{err ?? empty}</p>}
    </div>
  );
}
