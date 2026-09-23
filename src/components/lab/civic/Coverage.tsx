"use client";

/* Coverage, the way a city measures service: a regular grid of hexagons,
   each with a number in it. Choose what the hexagons count; the ranked
   list of localities re-sorts to match. */

import { useCallback, useMemo, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource, ExpressionSpecification } from "maplibre-gl";
import { LabMap, CIVIC } from "../LabMap";

export type CHex = { key: string; ring: [number, number][]; center: [number, number]; animals: number; help: number; sterilised: number; events: number };
export type CLoc = { name: string; animals: number; help: number; sterilised: number; cases: number };
type Metric = "animals" | "events" | "sterilised";

const LABEL: Record<Metric, string> = { animals: "Animals", events: "Field work", sterilised: "Sterilised" };
const COLORS = ["#d6e1f6", "#a9c0ee", "#6f95e2", "#2457ce", "#1a3f99"];

export function Coverage({ hexes, locs, box }: { hexes: CHex[]; locs: CLoc[]; box: [number, number, number, number] }) {
  const [metric, setMetric] = useState<Metric>("animals");
  const [hover, setHover] = useState<CHex | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const max = useMemo(() => Object.fromEntries((["animals", "events", "sterilised"] as Metric[]).map((m) => [m, Math.max(1, ...hexes.map((h) => h[m]))])) as Record<Metric, number>, [hexes]);

  const paint = useCallback((m: Metric) => {
    const map = mapRef.current;
    if (!map) return;
    const mx = max[m];
    const t = [0.08, 0.2, 0.4, 0.65].map((f) => Math.max(1, Math.round(mx * f)));
    const expr = ["step", ["get", m], "rgba(0,0,0,0)", 1, COLORS[0], t[0] + 1, COLORS[1], t[1] + 1, COLORS[2], t[2] + 1, COLORS[3], t[3] + 1, COLORS[4]] as ExpressionSpecification;
    map.setPaintProperty("hex", "fill-color", expr);
    map.setLayoutProperty("hex-n", "text-field", ["case", [">", ["get", m], 0], ["to-string", ["get", m]], ""] as ExpressionSpecification);
    map.setPaintProperty("hex-n", "text-color", ["case", [">", ["get", m], t[2]], "#ffffff", "#0b1e3d"] as ExpressionSpecification);
  }, [max]);

  const onLoad = useCallback((map: MLMap) => {
    mapRef.current = map;
    map.addSource("hex", { type: "geojson", data: { type: "FeatureCollection", features: hexes.map((h) => ({ type: "Feature", properties: { key: h.key, animals: h.animals, events: h.events, sterilised: h.sterilised, help: h.help }, geometry: { type: "Polygon", coordinates: [h.ring] } })) } });
    map.addLayer({ id: "hex", type: "fill", source: "hex", paint: { "fill-color": "#d6e1f6", "fill-opacity": 0.86 } });
    map.addLayer({ id: "hex-l", type: "line", source: "hex", paint: { "line-color": "#0b1e3d", "line-width": 0.6, "line-opacity": 0.4 } });
    map.addLayer({ id: "hex-h", type: "line", source: "hex", filter: ["==", ["get", "key"], ""], paint: { "line-color": "#0b1e3d", "line-width": 3 } });
    map.addLayer({ id: "hex-n", type: "symbol", source: "hex", minzoom: 11.2, layout: { "text-field": "", "text-font": ["Noto Sans Bold"], "text-size": 11 }, paint: { "text-color": "#0b1e3d" } });
    // Need is marked at the centre of its hexagon, one mark per hexagon.
    map.addSource("help", { type: "geojson", data: { type: "FeatureCollection", features: hexes.filter((h) => h.help > 0).map((h) => ({ type: "Feature", properties: { help: h.help }, geometry: { type: "Point", coordinates: h.center } })) } });
    map.addLayer({ id: "help", type: "circle", source: "help", paint: { "circle-radius": ["interpolate", ["linear"], ["get", "help"], 1, 3.5, 6, 8], "circle-color": "#f05b40", "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5, "circle-translate": [0, -11] } });
    map.on("mousemove", "hex", (e) => {
      const key = e.features?.[0]?.properties?.key as string | undefined;
      map.setFilter("hex-h", ["==", ["get", "key"], key ?? ""]);
      setHover(hexes.find((h) => h.key === key) ?? null);
    });
    map.on("mouseleave", "hex", () => { map.setFilter("hex-h", ["==", ["get", "key"], ""]); setHover(null); });
    paint("animals");
    void (map.getSource("hex") as GeoJSONSource);
  }, [hexes, paint]);

  const choose = (m: Metric) => { setMetric(m); paint(m); };
  const key: keyof CLoc = metric === "events" ? "cases" : metric;
  const ranked = [...locs].sort((a, b) => (b[key] as number) - (a[key] as number)).slice(0, 20);
  const top = Math.max(1, ranked[0]?.[key] as number);

  return (
    <div className="ci-cov">
      <div className="ci-cov-map">
        <LabMap palette={CIVIC} bounds={box} padding={{ top: 30, bottom: 90, left: 30, right: 30 }} onLoad={onLoad} />
        {hover && (
          <div className="ci-hexinfo">
            <b>Hexagon {hover.key}</b>
            <div><span>Animals</span><span>{hover.animals}</span></div>
            <div><span>Field records</span><span>{hover.events}</span></div>
            <div><span>Sterilised · ABC</span><span>{hover.sterilised}</span></div>
            <div><span>Needing help</span><span>{hover.help}</span></div>
          </div>
        )}
        <div className="ci-legend">
          <span className="lbl">{LABEL[metric]} per 1 km hexagon · flame: needing help</span>
          <div className="ci-ramp">{COLORS.map((c, i) => <span key={c} style={{ background: c, color: i > 2 ? "#fff" : "#0b1e3d" }}>{["low", "", "", "", "high"][i]}</span>)}</div>
        </div>
      </div>
      <aside className="ci-cov-side">
        <header>
          <span className="lbl" style={{ color: "#6b7485" }}>Coverage · sample city: Coimbatore · 2024–2026</span>
          <h1>Where the register reaches</h1>
          <p>Every hexagon is about a square kilometre. An empty hexagon means nothing has been recorded there — not that nothing is there.</p>
        </header>
        <div className="ci-metric" role="group" aria-label="Measure">
          {(["animals", "events", "sterilised"] as Metric[]).map((m) => <button key={m} type="button" aria-pressed={metric === m} onClick={() => choose(m)}>{LABEL[m]}</button>)}
        </div>
        <ol className="ci-rank">
          {ranked.map((l, i) => (
            <li key={l.name}><span className="no">{String(i + 1).padStart(2, "0")}</span><span>{l.name}</span><i style={{ width: `${((l[key] as number) / top) * 100}%` }} /><b>{l[key] as number}</b></li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
