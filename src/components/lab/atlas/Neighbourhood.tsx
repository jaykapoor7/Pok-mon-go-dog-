"use client";

/* Your area as an atlas page: range rings around you, each real
   observation numbered on the plate and captioned in the margin. The two
   are one object — choosing a figure moves the plate to it, touching a
   point on the plate brings its figure forward. */

import { useCallback, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource } from "maplibre-gl";
import { LabMap, PAPER } from "../LabMap";

export type NFig = { id: string; n: number; lng: number; lat: number; zone: string; km: number; when: string; ago: string; status: string; help: boolean; img: string; coord: string };

function ring(lng: number, lat: number, km: number): [number, number][] {
  const k = Math.cos((lat * Math.PI) / 180);
  return Array.from({ length: 97 }, (_, i) => { const a = (i / 96) * Math.PI * 2; return [lng + (Math.cos(a) * km) / (111 * k), lat + (Math.sin(a) * km) / 111]; });
}

export function Neighbourhood({ figs, home, places }: { figs: NFig[]; home: { lng: number; lat: number; name: string }; places: { name: string; lng: number; lat: number; n: number }[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const choose = useCallback((n: number, from: "map" | "list") => {
    setSel(n);
    const f = figs.find((x) => x.n === n);
    const map = mapRef.current;
    if (map && f) {
      map.setFilter("sel", ["==", ["get", "n"], n]);
      if (from === "list") map.easeTo({ center: [f.lng, f.lat], zoom: Math.max(map.getZoom(), 13), duration: 700 });
    }
    if (from === "map") listRef.current?.querySelector(`[data-n="${n}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [figs]);

  const onLoad = useCallback((map: MLMap) => {
    mapRef.current = map;
    const rings = [1, 3, 6].map((km) => ({ type: "Feature" as const, properties: { km }, geometry: { type: "LineString" as const, coordinates: ring(home.lng, home.lat, km) } }));
    const tags = [1, 3, 6].map((km) => ({ type: "Feature" as const, properties: { t: `${km} km` }, geometry: { type: "Point" as const, coordinates: [home.lng, home.lat + km / 111] } }));
    map.addSource("rings", { type: "geojson", data: { type: "FeatureCollection", features: [...rings, ...tags] } });
    map.addLayer({ id: "rings", type: "line", source: "rings", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": "#0b1e3d", "line-opacity": 0.45, "line-width": 0.8, "line-dasharray": [3, 3] } });
    map.addLayer({ id: "ring-t", type: "symbol", source: "rings", filter: ["==", ["geometry-type"], "Point"], layout: { "text-field": ["get", "t"], "text-font": ["Noto Sans Regular"], "text-size": 10, "text-offset": [0, -0.7] }, paint: { "text-color": "#5c6a7f", "text-halo-color": "#efe7da", "text-halo-width": 2 } });
    // Place names come from the observations, lettered as an atlas letters them.
    map.addSource("places", { type: "geojson", data: { type: "FeatureCollection", features: places.map((p) => ({ type: "Feature", properties: { name: p.name, n: p.n }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })) } });
    map.addLayer({ id: "places", type: "symbol", source: "places", layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Italic"], "text-size": ["interpolate", ["linear"], ["get", "n"], 1, 13, 8, 18], "text-offset": [0, 1.8], "text-letter-spacing": 0.02 }, paint: { "text-color": "#0b1e3d", "text-opacity": 0.72, "text-halo-color": "#efe7da", "text-halo-width": 2 } });
    map.addSource("you", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [home.lng, home.lat] } } });
    map.addLayer({ id: "you", type: "circle", source: "you", paint: { "circle-radius": 5, "circle-color": "#efe7da", "circle-stroke-color": "#0b1e3d", "circle-stroke-width": 2 } });
    map.addSource("figs", { type: "geojson", data: { type: "FeatureCollection", features: figs.map((f) => ({ type: "Feature", properties: { n: f.n, help: f.help }, geometry: { type: "Point", coordinates: [f.lng, f.lat] } })) } });
    map.addLayer({ id: "sel", type: "circle", source: "figs", filter: ["==", ["get", "n"], -1], paint: { "circle-radius": 16, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#0b1e3d", "circle-stroke-width": 1.2 } });
    map.addLayer({ id: "figs", type: "circle", source: "figs", paint: { "circle-radius": 5.5, "circle-color": ["case", ["get", "help"], "#f05b40", "#0b1e3d"], "circle-stroke-color": "#efe7da", "circle-stroke-width": 1.5 } });
    map.addLayer({ id: "figs-n", type: "symbol", source: "figs", layout: { "text-field": ["to-string", ["get", "n"]], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-offset": [0.9, -0.8], "text-anchor": "left", "text-allow-overlap": false }, paint: { "text-color": "#0b1e3d", "text-halo-color": "#efe7da", "text-halo-width": 2 } });
    map.on("click", "figs", (e) => { const n = e.features?.[0]?.properties?.n; if (typeof n === "number") choose(n, "map"); });
    map.on("mouseenter", "figs", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "figs", () => { map.getCanvas().style.cursor = ""; });
    void (map.getSource("figs") as GeoJSONSource);
  }, [figs, home, places, choose]);

  return (
    <div className="la-home">
      <div className="la-home-map">
        <LabMap palette={PAPER} center={[home.lng, home.lat]} zoom={11.9} onLoad={onLoad} />
        <span className="la-map-note">Positions to ~1 km · you: {home.name}</span>
      </div>
      <div className="la-home-figs" ref={listRef}>
        <span className="cap">Observations near you · newest first</span>
        {figs.map((f) => (
          <button key={f.id} type="button" className="la-hfig" data-n={f.n} aria-pressed={sel === f.n} onClick={() => choose(f.n, "list")}>
            <img src={f.img} alt={`Street dog in ${f.zone}`} loading="lazy" />
            <span>
              <b>Fig. {f.n}{f.help ? " · needs help" : ""}</b>
              <span className="place">{f.zone}</span>
              <span className="meta">{f.km.toFixed(1)} km from you · {f.ago}<br />{f.coord}<br /><span className={f.help ? "need" : ""}>{f.help ? "Reported injured" : "Seen, no concern recorded"}</span></span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
