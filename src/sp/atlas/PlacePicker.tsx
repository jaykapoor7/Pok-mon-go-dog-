"use client";

/* ════════════════════════════════════════════════════════════════════
   Choose a place on the printed map: drag the map under a fixed pin,
   search a place in India, or use where you are. The exact point stays
   private to reviewers and organisations; the public record only ever
   shows the area (≈0.74 km²) it falls in.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import "./picker.css";
import { Crosshair, MapPin, Search } from "lucide-react";
import { supportsWebGL2 } from "@/components/map/basemap";
import { GLYPHS, collapseAttribution, drawGround, groundStyle } from "../map/ground";
import { reverseGeocode, nearestCity } from "@/lib/delhi";
import { looksIndian } from "@/lib/exif";

export type Picked = { lat: number; lng: number; zone: string };
type Hit = { lat: number; lng: number; label: string };

export function PlacePicker({ value, onChange }: { value: { lat: number; lng: number } | null; onChange: (p: Picked) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const cb = useRef(onChange); cb.current = onChange;
  const [label, setLabel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [locating, setLocating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const start = useRef(value);

  useEffect(() => {
    if (!el.current) return;
    if (!supportsWebGL2()) { setErr("This browser cannot draw the map. Search for the place instead."); return; }
    let dead = false, map: MLMap | null = null, t: number | undefined;
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const s = start.current;
      map = new ml.Map({ container: el.current, style: { ...groundStyle(), glyphs: GLYPHS }, center: s ? [s.lng, s.lat] : [78.9, 22.6], zoom: s ? 16 : 4.2, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false });
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.on("load", () => { drawGround(map!).catch(() => {}); collapseAttribution(map!); });
      map.on("moveend", () => {
        const c = map!.getCenter();
        if (map!.getZoom() < 12) { setLabel(null); return; }
        window.clearTimeout(t);
        t = window.setTimeout(() => {
          if (!looksIndian(c.lat, c.lng)) { setLabel("Outside India"); return; }
          const near = nearestCity(c.lat, c.lng);
          setLabel(near); cb.current({ lat: c.lat, lng: c.lng, zone: near });
          reverseGeocode(c.lat, c.lng).then((z) => { setLabel(z); cb.current({ lat: c.lat, lng: c.lng, zone: z }); }).catch(() => {});
        }, 250);
      });
    }).catch(() => setErr("The map could not start. Search for the place instead."));
    return () => { dead = true; window.clearTimeout(t); map?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 3) { setHits([]); return; }
    const id = window.setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&limit=5&q=${encodeURIComponent(t)}`, { headers: { Accept: "application/json" } })
        .then((r) => r.json()).then((d: { lat: string; lon: string; display_name: string }[]) => setHits(d.map((x) => ({ lat: +x.lat, lng: +x.lon, label: x.display_name }))))
        .catch(() => setHits([]));
    }, 350);
    return () => window.clearTimeout(id);
  }, [q]);

  const fly = (lat: number, lng: number) => mapRef.current?.flyTo({ center: [lng, lat], zoom: 17, duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900 });
  const here = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => { setLocating(false); fly(coords.latitude, coords.longitude); }, () => setLocating(false), { enableHighAccuracy: true, timeout: 10000 });
  };

  return (
    <div className="picker">
      <div className="picker-tools">
        <label className="search"><Search size={15} aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a street, landmark or area" aria-label="Search a place" /></label>
        <button type="button" className="btn is-s" onClick={here} disabled={locating}><Crosshair size={15} aria-hidden /> {locating ? "Finding you…" : "Where I am"}</button>
      </div>
      {hits.length > 0 && <ul className="picker-hits float">{hits.map((h) => <li key={`${h.lat},${h.lng}`}><button type="button" onClick={() => { setQ(h.label.split(",").slice(0, 2).join(",")); setHits([]); fly(h.lat, h.lng); }}>{h.label}</button></li>)}</ul>}
      <div className="picker-map">
        <div ref={el} className="picker-canvas" />
        <span className="picker-pin" aria-hidden><MapPin size={34} /></span>
        {err && <p className="picker-err">{err}</p>}
      </div>
      <p className="picker-label" role="status">{label ? <><b>{label}</b> · drag the map to move the pin</> : "Zoom in and drag the map until the pin is where the animal is."}</p>
    </div>
  );
}
