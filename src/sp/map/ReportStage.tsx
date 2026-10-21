"use client";

/* ════════════════════════════════════════════════════════════════════
   The Map under a report. The same illustrated ground as the Map, with
   a vermilion pin where the animal is. While choosing the place the map
   is the picker: drag it under the fixed pin, search a street, or use
   where you are. Otherwise it is the scene the report belongs to.

   The exact point is seen only by reviewers and organisations; the
   public record only ever shows its area (≈0.74 km²).
   ════════════════════════════════════════════════════════════════════ */

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { supportsWebGL2 } from "@/components/map/basemap";
import { reverseGeocode, nearestCity } from "@/lib/delhi";
import { looksIndian } from "@/lib/exif";
import { GLYPHS, collapseAttribution, drawGround, groundStyle } from "./ground";

export type Picked = { lat: number; lng: number; zone: string };
export type StageHandle = { fly: (lat: number, lng: number, z?: number) => void };

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const ReportStage = forwardRef<StageHandle, { coords: { lat: number; lng: number } | null; zone?: string | null; picking: boolean; onPick: (p: Picked) => void; onLabel?: (s: string | null) => void }>(
  function ReportStage({ coords, zone, picking, onPick, onLabel }, ref) {
    const el = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MLMap | null>(null);
    const pin = useRef<Marker | null>(null);
    const cb = useRef({ onPick, onLabel, picking }); cb.current = { onPick, onLabel, picking };
    const start = useRef(coords);
    const lookup = useRef(0);
    const latestCoords = useRef(coords); latestCoords.current = coords;
    const [failed, setFailed] = useState(false);
    const [ready, setReady] = useState(false);

    useImperativeHandle(ref, () => ({ fly: (lat, lng, z = 17) => {
      lookup.current++;
      if (!looksIndian(lat, lng)) { cb.current.onLabel?.("Choose a place in India."); return; }
      const zone = nearestCity(lat, lng);
      // Selection must work even when WebGL or the map is unavailable.
      cb.current.onPick({ lat, lng, zone }); cb.current.onLabel?.(zone);
      const version = lookup.current;
      reverseGeocode(lat, lng).then(zone => {
        if (version === lookup.current && cb.current.picking) cb.current.onPick({ lat, lng, zone });
      }).catch(() => {});
      mapRef.current?.flyTo({ center: [lng, lat], zoom: z, duration: reduced() ? 0 : 1100 });
    } }), []);

    useEffect(() => {
      if (!el.current) return;
      if (!supportsWebGL2()) { setFailed(true); return; }
      const lookups = lookup;
      let dead = false, map: MLMap | null = null, t: number | undefined;
      import("maplibre-gl").then((ml) => {
        if (dead || !el.current) return;
        ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        const s = start.current;
        map = new ml.Map({ container: el.current, style: { ...groundStyle(), glyphs: GLYPHS }, center: s ? [s.lng, s.lat] : [80.2, 22.4], zoom: s ? 15.5 : 4,
          attributionControl: { compact: true, customAttribution: "© OpenStreetMap contributors · OpenFreeMap · Natural Earth" }, dragRotate: false, pitchWithRotate: false, maxZoom: 18 });
        mapRef.current = map;
        map.touchZoomRotate.disableRotation();
        map.on("load", () => { drawGround(map!).catch(() => {}); collapseAttribution(map!); map!.resize(); const c = latestCoords.current; if(c) { pin.current?.setLngLat([c.lng,c.lat]).addTo(map!); map!.jumpTo({center:[c.lng,c.lat],zoom:15.5}); } setReady(true); });
        const e = document.createElement("div"); e.className = "rs-pin"; e.innerHTML = "<i></i>";
        pin.current = new ml.Marker({ element: e, anchor: "bottom" }).setLngLat(s ? [s.lng, s.lat] : [80.2, 22.4]);
        if (s) pin.current.addTo(map);
        map.on("movestart", () => { lookup.current++; window.clearTimeout(t); });
        map.on("moveend", () => {
          if (!cb.current.picking) return;
          const c = map!.getCenter();
          const version = ++lookup.current;
          if (map!.getZoom() < 12) { cb.current.onLabel?.(null); return; }
          window.clearTimeout(t);
          t = window.setTimeout(() => {
            if (dead || version !== lookup.current || !cb.current.picking) return;
            if (!looksIndian(c.lat, c.lng)) { cb.current.onLabel?.("Outside India"); return; }
            const near = nearestCity(c.lat, c.lng);
            cb.current.onPick({ lat: c.lat, lng: c.lng, zone: near });
            reverseGeocode(c.lat, c.lng).then((z) => {
              if (!dead && cb.current.picking && version === lookup.current) cb.current.onPick({ lat: c.lat, lng: c.lng, zone: z });
            }).catch(() => {});
          }, 250);
        });
      }).catch(() => setFailed(true));
      return () => { dead = true; lookups.current++; window.clearTimeout(t); map?.remove(); mapRef.current = null; };
    }, []);

    /* Outside the picker the map follows the report's place; inside it, the place follows the map. */
    useEffect(() => {
      const m = mapRef.current; if (!m) return;
      if (picking) { pin.current?.remove(); m.dragPan.enable(); m.scrollZoom.enable(); if (!coords) m.flyTo({ center: m.getCenter(), zoom: Math.max(m.getZoom(), 4.4), duration: 0 }); return; }
      if (coords) { pin.current?.setLngLat([coords.lng, coords.lat]).addTo(m); m.flyTo({ center: [coords.lng, coords.lat], zoom: Math.max(15.5, Math.min(m.getZoom(), 17)), duration: reduced() ? 0 : 1000 }); }
    }, [coords, picking, ready]);

    return (
      <div className={`rs${picking ? " is-picking" : ""}`}>
        <div ref={el} className="rs-map" aria-hidden={!picking} />
        {picking && <span className="rs-fixed" aria-hidden><i /></span>}
        {coords && <p className="rs-location" role="status"><b>{zone || "Selected location, Coimbatore"}</b><span>{coords.lat.toFixed(4)}° N · {coords.lng.toFixed(4)}° E · Selected report location</span></p>}
        {failed && <p className="rs-err">Interactive map unavailable in this browser. The selected location is saved above.</p>}
      </div>
    );
  });
