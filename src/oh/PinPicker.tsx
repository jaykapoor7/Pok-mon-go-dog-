"use client";

/* Drop a pin: the map moves under a fixed pin, the way ride apps do it, and "Use this spot" takes the centre. The
   programme's anti-rabies centres are drawn as small blue dots so the person can find their way. The streets come
   from OpenStreetMap through OpenFreeMap; without WebGL the person is asked to type the place instead. The spot
   stays in the browser: it only chooses the nearest centre when the report is sent. */

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { LocateFixed, MapPin } from "lucide-react";
import { supportsWebGL2, type Palette } from "@/components/map/basemap";

const BLUE = "#2457ce", INK = "#0b1e3d";
const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";
const GROUND: Palette = {
  name: "paper", bg: "#f1f4f9", water: "#d6e2f5", land: "#f1f4f9", park: "#e9eef4", building: "#e6eaf1",
  road: "#ffffff", roadMajor: "#ffffff", roadCasing: "#dde3ec", rail: "rgba(11,30,61,0.10)", boundary: "rgba(11,30,61,0.18)",
  label: "#6b7486", labelHalo: "#ffffff", labelOpacity: 0.95, labels: true, showRoadNames: true, minorRoads: true, buildings: true,
  cellEdge: "#ffffff", ink: INK, dim: "rgba(11,30,61,0.55)", seq: [], att: [], arv: BLUE, hatch: "rgba(11,30,61,0.3)", feed: BLUE,
};
export type Spot = { lat: number; lng: number };

export function PinPicker({ centres, start, onPick, onCancel }: { centres: (Spot & { name: string })[]; start: Spot | null; onPick: (p: Spot) => void; onCancel: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "nogl">("loading");
  const [moving, setMoving] = useState(false);
  const [finding, setFinding] = useState(false);
  useEffect(() => {
    if (!el.current) return;
    if (!supportsWebGL2()) { setState("nogl"); return; }
    let gone = false;
    const mid = start ?? (centres.length ? { lat: centres.reduce((s, c) => s + c.lat, 0) / centres.length, lng: centres.reduce((s, c) => s + c.lng, 0) / centres.length } : { lat: 12.9716, lng: 77.5946 });
    void Promise.all([import("maplibre-gl"), import("@/components/map/basemap")]).then(([ml, base]) => {
      if (gone || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const m = new ml.Map({
        container: el.current, center: [mid.lng, mid.lat], zoom: start ? 15.5 : 12.5, maxZoom: 18, minZoom: 9, dragRotate: false, pitchWithRotate: false,
        style: { version: 8, glyphs: GLYPHS, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": GROUND.bg } }] },
        attributionControl: { compact: true, customAttribution: "© OpenStreetMap contributors · OpenFreeMap" },
      });
      map.current = m;
      m.touchZoomRotate.disableRotation(); m.keyboard.disableRotation();
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      const draw = () => {
        if (m.getSource("centres")) return;
        m.addSource("centres", { type: "geojson", data: { type: "FeatureCollection", features: centres.map((c) => ({ type: "Feature", properties: { name: c.name }, geometry: { type: "Point", coordinates: [c.lng, c.lat] } })) } });
        m.addLayer({ id: "pp-centres", type: "circle", source: "centres", paint: { "circle-color": BLUE, "circle-radius": 6, "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
        void base.underlay(m, GROUND).catch(() => false);
      };
      const tryDraw = () => { try { draw(); } catch { /* the style is not ready yet */ } };
      m.on("styledata", tryDraw); m.once("load", () => { tryDraw(); if (!gone) setState("ready"); }); tryDraw();
      m.on("movestart", () => setMoving(true)); m.on("moveend", () => setMoving(false));
      m.on("error", () => { /* a tile that fails leaves the ground plain */ });
    }).catch(() => { if (!gone) setState("nogl"); });
    return () => { gone = true; map.current?.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const here = () => {
    if (!navigator.geolocation) return;
    setFinding(true);
    navigator.geolocation.getCurrentPosition((p) => { setFinding(false); map.current?.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 16, duration: calm() ? 0 : 900 }); }, () => setFinding(false), { timeout: 8000, maximumAge: 300000 });
  };
  const use = () => { const c = map.current?.getCenter(); if (c) onPick({ lat: c.lat, lng: c.lng }); };
  return (
    <div className="kp" role="dialog" aria-label="Drop a pin where it happened">
      <div className="kp-head"><b>Where did it happen?</b><span>Move the map to put the pin on the spot.</span></div>
      <div className="kp-map">
        <div ref={el} className="kp-canvas" />
        {state === "nogl" ? <p className="kp-nogl">The map can&apos;t open on this device. Type the place in the chat instead: a landmark or street is enough.</p> : <>
          <span className={`kp-pin${moving ? " is-up" : ""}`} aria-hidden><MapPin size={34} strokeWidth={2.2} /></span>
          <span className="kp-shadow" aria-hidden />
          <button type="button" className="kp-me" onClick={here} disabled={finding} aria-label="Go to my location"><LocateFixed size={18} aria-hidden /></button>
        </>}
      </div>
      <div className="kp-foot">
        <button type="button" className="kp-cancel" onClick={onCancel}>Cancel</button>
        <button type="button" className="kp-use" onClick={use} disabled={state !== "ready"} data-tour="bite-pin-use">Use this spot</button>
      </div>
    </div>
  );
}
