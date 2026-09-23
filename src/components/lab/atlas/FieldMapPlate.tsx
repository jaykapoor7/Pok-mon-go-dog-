"use client";

/* The full plate. Layers are the atlas key: switch them on and off, pick a
   year and the terrain is recomputed from that year's records alone, so
   you can watch the work move across the city. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource } from "maplibre-gl";
import { LabMap, NIGHT } from "../LabMap";
import { contours, type Box } from "../geo";

type Ev = [number, number, number, number];
type Pt = [number, number, number, number, number];
type Loc = { name: string; lng: number; lat: number; animals: number; help: number; sterilised: number; vaccinated: number; cases: number; open: number };

const YEARS: { id: string; label: string; from: number; to: number }[] = [
  { id: "2024", label: "2024", from: 0, to: 365 },
  { id: "2025", label: "2025", from: 366, to: 730 },
  { id: "2026", label: "2026", from: 731, to: 1100 },
  { id: "all", label: "All", from: 0, to: 1100 },
];

export function FieldMapPlate({ events, animals, localities, box }: { events: Ev[]; animals: Pt[]; localities: Loc[]; box: Box }) {
  const mapRef = useRef<MLMap | null>(null);
  const [year, setYear] = useState("all");
  const [layers, setLayers] = useState({ ct: true, pts: true, help: true, loc: true });
  const [hover, setHover] = useState<{ x: number; y: number; l: Loc } | null>(null);
  const [pos, setPos] = useState<string>("");

  const counts = { ct: events.length, pts: animals.length, help: animals.filter((a) => a[2]).length, loc: localities.length };

  const redraw = useCallback((y: string) => {
    const map = mapRef.current;
    const Y = YEARS.find((v) => v.id === y)!;
    const pts = events.filter((e) => e[2] >= Y.from && e[2] <= Y.to).map((e) => [e[0], e[1]] as [number, number]);
    (map?.getSource("ct") as GeoJSONSource | undefined)?.setData(contours(pts, box, { res: 0.0035, sigma: 2.4, levels: 11 }));
  }, [events, box]);

  const onLoad = useCallback((map: MLMap) => {
    mapRef.current = map;
    map.addSource("ct", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "ct", type: "line", source: "ct", layout: { "line-join": "round" }, paint: { "line-color": "#efe7da", "line-width": ["case", ["get", "index"], 1.2, 0.6], "line-opacity": ["interpolate", ["linear"], ["/", ["get", "l"], ["get", "of"]], 0, 0.14, 1, 0.66] } });
    map.addSource("pts", { type: "geojson", data: { type: "FeatureCollection", features: animals.map((a) => ({ type: "Feature", properties: { h: a[2] }, geometry: { type: "Point", coordinates: [a[0], a[1]] } })) } });
    map.addLayer({ id: "pts", type: "circle", source: "pts", filter: ["==", ["get", "h"], 0], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 1, 14, 3], "circle-color": "#efe7da", "circle-opacity": 0.42 } });
    map.addLayer({ id: "help", type: "circle", source: "pts", filter: ["==", ["get", "h"], 1], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.6, 14, 6], "circle-color": "#f05b40", "circle-stroke-color": "#07142b", "circle-stroke-width": 1 } });
    map.addSource("loc", { type: "geojson", data: { type: "FeatureCollection", features: localities.slice(0, 44).map((l) => ({ type: "Feature", properties: { name: l.name, n: l.animals }, geometry: { type: "Point", coordinates: [l.lng, l.lat] } })) } });
    map.addLayer({ id: "loc", type: "symbol", source: "loc", layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Italic"], "text-size": ["interpolate", ["linear"], ["get", "n"], 6, 11, 80, 15], "text-letter-spacing": 0.02, "symbol-sort-key": ["-", 0, ["get", "n"]] }, paint: { "text-color": "#efe7da", "text-halo-color": "#07142b", "text-halo-width": 1.6, "text-opacity": 0.86 } });
    map.on("mousemove", (e) => setPos(`${e.lngLat.lat.toFixed(4)}°N  ${e.lngLat.lng.toFixed(4)}°E`));
    map.on("mousemove", "loc", (e) => {
      const name = e.features?.[0]?.properties?.name;
      const l = localities.find((x) => x.name === name);
      if (l) setHover({ x: e.point.x, y: e.point.y, l });
      map.getCanvas().style.cursor = "default";
    });
    map.on("mouseleave", "loc", () => setHover(null));
    redraw("all");
  }, [animals, localities, redraw]);

  useEffect(() => { redraw(year); }, [year, redraw]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const [id, on] of Object.entries(layers)) { try { map.setLayoutProperty(id, "visibility", on ? "visible" : "none"); } catch { /* not yet */ } }
  }, [layers]);

  const toggle = (k: keyof typeof layers) => setLayers((s) => ({ ...s, [k]: !s[k] }));
  const KEY: { k: keyof typeof layers; label: string; sample: React.ReactNode }[] = [
    { k: "ct", label: "Terrain of care", sample: <path d="M0 8 Q7 1 14 6 T28 4" fill="none" stroke="#efe7da" strokeOpacity=".7" /> },
    { k: "pts", label: "Animals on the record", sample: <circle cx="6" cy="6" r="2" fill="#efe7da" opacity=".6" /> },
    { k: "help", label: "Needing help now", sample: <circle cx="6" cy="6" r="4" fill="#f05b40" /> },
    { k: "loc", label: "Localities", sample: <text x="0" y="10" fontSize="11" fontStyle="italic" fill="#efe7da">Aa</text> },
  ];

  return (
    <>
      <div className="la-fmap-map"><LabMap palette={NIGHT} bounds={box} padding={{ top: 80, bottom: 80, left: 40, right: 360 }} onLoad={onLoad} /></div>
      <aside className="la-fkey" aria-label="Atlas key">
        <span className="la-fkey-cap">Sample city · our densest register</span>
        <h1>Coimbatore<span className="it">field plate, 2024 – 2026</span></h1>
        <ul>
          {KEY.map((x) => (
            <li key={x.k}>
              <button type="button" aria-pressed={layers[x.k]} onClick={() => toggle(x.k)}>
                <svg width="28" height="12" style={{ overflow: "visible" }}>{x.sample}</svg>
                <span>{x.label}</span>
                <b>{counts[x.k].toLocaleString("en-IN")}</b>
              </button>
            </li>
          ))}
        </ul>
        <p>Terrain recomputed from the selected year&apos;s field records. Positions published to ~1 km. Public record, 23 Sep 2026.</p>
      </aside>
      <div className="la-years" role="group" aria-label="Year">
        {YEARS.map((y) => <button key={y.id} type="button" aria-pressed={year === y.id} onClick={() => setYear(y.id)}>{y.label}</button>)}
      </div>
      <div className="la-readout" aria-hidden>{pos || "Move across the plate"}</div>
      {hover && (
        <div className="la-card" style={{ left: hover.x, top: hover.y }}>
          <b>{hover.l.name}</b>
          <dl>
            <dt>Animals recorded</dt><dd>{hover.l.animals}</dd>
            <dt>Cases on record</dt><dd>{hover.l.cases}</dd>
            <dt>Open now</dt><dd>{hover.l.open}</dd>
            <dt>Sterilised · ABC</dt><dd>{hover.l.sterilised}</dd>
          </dl>
        </div>
      )}
    </>
  );
}
