"use client";

/* The operations board: the open work, as a queue and as a map, linked.
   The queue is ordered the way a field team triages — critical first,
   then oldest — and every row is also a pin. Pointing at either finds the
   other. On a phone the queue is the screen and the map is one tap away. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MLMap, ExpressionSpecification } from "maplibre-gl";
import { LabMap, PAPER } from "../LabMap";
import type { Box } from "../geo";

export type OpsItem = { id: string; code: string; cat: string; zone: string; days: number; cls: string; rank: number; unverified: boolean; lng: number | null; lat: number | null; recent: boolean };
export type OpsCell = { ring: [number, number][]; work30: number; gap: boolean };

export function OpsBoard({ items, cells, box }: { items: OpsItem[]; cells: OpsCell[]; box: Box }) {
  const [sel, setSel] = useState<string | null>(null);
  const [view, setView] = useState<"queue" | "map">("queue");
  const mapRef = useRef<MLMap | null>(null);
  const placed = items.filter((i) => i.lng != null);

  const onLoad = useCallback((map: MLMap) => {
    mapRef.current = map;
    const xs = placed.map((p) => p.lng!), ys = placed.map((p) => p.lat!);
    const fit = () => map.fitBounds([Math.min(...xs) - 0.02, Math.min(...ys) - 0.02, Math.max(...xs) + 0.02, Math.max(...ys) + 0.02], { padding: 30, animate: false });
    fit(); map.on("resize", fit);
    map.addSource("c", { type: "geojson", data: { type: "FeatureCollection", features: cells.map((c) => ({ type: "Feature", properties: { w: c.work30, g: c.gap ? 1 : 0 }, geometry: { type: "Polygon", coordinates: [c.ring] } })) } });
    map.addLayer({ id: "c", type: "fill", source: "c", paint: {
      "fill-color": ["case", ["==", ["get", "g"], 1], "#f3d3c9", ["interpolate", ["linear"], ["get", "w"], 0, "#e3dbcd", 1, "#c8d4f0", 3, "#93aee9", 6, "#5b82dc"]] as ExpressionSpecification,
      "fill-opacity": 0.9,
    } });
    map.addLayer({ id: "c-edge", type: "line", source: "c", paint: { "line-color": ["case", ["==", ["get", "g"], 1], "rgba(240,91,64,.55)", "#faf7f1"] as ExpressionSpecification, "line-width": 1 } });
    map.addSource("q", { type: "geojson", data: { type: "FeatureCollection", features: placed.map((p) => ({ type: "Feature", properties: { id: p.id, r: p.rank, d: p.days, u: p.unverified ? 1 : 0 }, geometry: { type: "Point", coordinates: [p.lng!, p.lat!] } })) } });
    map.addLayer({ id: "q", type: "circle", source: "q", paint: {
      "circle-radius": ["interpolate", ["linear"], ["get", "d"], 0, 7, 45, 14] as ExpressionSpecification,
      "circle-color": ["match", ["get", "r"], 0, "#f05b40", 1, "#0b1e3d", "#faf7f1"] as ExpressionSpecification,
      "circle-stroke-color": ["match", ["get", "r"], 2, "#0b1e3d", 3, "#5d6b7c", "#faf7f1"] as ExpressionSpecification,
      "circle-stroke-width": 2,
    } });
    map.addLayer({ id: "q-sel", type: "circle", source: "q", filter: ["==", ["get", "id"], ""], paint: { "circle-radius": 22, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#2457ce", "circle-stroke-width": 3 } });
    map.on("click", "q", (e) => { const id = e.features?.[0]?.properties?.id; if (id) setSel(String(id)); });
    map.on("mouseenter", "q", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "q", () => (map.getCanvas().style.cursor = ""));
  }, [placed, cells]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !map.getLayer("q-sel")) return;
    map.setFilter("q-sel", ["==", ["get", "id"], sel ?? ""]);
    const p = placed.find((x) => x.id === sel);
    if (p) map.easeTo({ center: [p.lng!, p.lat!], zoom: Math.max(map.getZoom(), 12.4), duration: 500 });
  }, [sel, placed]);

  const maxDays = Math.max(...items.map((i) => i.days));
  return (
    <div className={`sx-ops view-${view}`}>
      <div className="sx-ops-toggle sx-seg" role="group" aria-label="View">
        <button type="button" aria-pressed={view === "queue"} onClick={() => setView("queue")}>Queue · {items.length}</button>
        <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>Map</button>
      </div>
      <div className="sx-ops-map sx-mapbox paper">
        <LabMap palette={PAPER} bounds={box} onLoad={onLoad} />
        <div className="sx-ops-key">
          <span><i className="p crit" />critical</span><span><i className="p prio" />priority</span><span><i className="p rout" />routine</span><span><i className="p uncl" />unclassified</span>
          <span><i className="h work" />work, last 30 days</span><span><i className="h gap" />gap: animals, no work in 12 months</span>
        </div>
      </div>
      <div className="sx-ops-queue">
        <div className="sx-ops-qh"><span className="lbl">Open work · critical first, then oldest</span><span className="m dim">{items.length} of the most recent open cases</span></div>
        <ol>
          {items.map((i) => (
            <li key={i.id} className={`c${i.rank}${sel === i.id ? " on" : ""}`}>
              <button type="button" onClick={() => { setSel(i.id); }} onMouseEnter={() => setSel(i.id)}>
                <span className="tri" aria-hidden />
                <span className="what"><b>{i.cat}</b><span className="it">{i.zone}</span></span>
                <span className="age"><span className="m">{i.days} d</span><i style={{ width: `${(i.days / maxDays) * 100}%` }} /></span>
                <span className="st">{i.unverified ? <em className="verify">verify</em> : <span className="m dim">{i.code}</span>}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
