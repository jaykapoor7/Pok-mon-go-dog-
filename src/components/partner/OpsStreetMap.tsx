"use client";

import { useEffect, useRef } from "react";
import type { Map as MLMap, GeoJSONSource, ExpressionSpecification } from "maplibre-gl";
import { PAPER, groundStyle, underlay } from "@/components/map/basemap";

/* The dashboard's open work on real streets. Nearby cells gather into one
   circle carrying the sum of their open cases; zooming in splits them back
   to single cells. Stale-only work is a quiet ring. Tapping a gathered
   circle zooms into it; tapping a single cell narrows the queue, as a cell
   on the plate does. */

export type OpenSpot = { key: string; lng: number; lat: number; live: number; stale: number };

const FLAME = "#d4421f";
const INK = "#0b1e3d";

function toGeo(spots: OpenSpot[], selected: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: spots.map((s) => ({
      type: "Feature" as const,
      properties: { key: s.key, live: s.live, stale: s.stale, sel: s.key === selected ? 1 : 0 },
      geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
    })),
  };
}

export function OpsStreetMap({ spots, box, selected, onSpot, label }: {
  spots: OpenSpot[];
  box: [number, number, number, number];
  selected: string | null;
  onSpot: (key: string) => void;
  label: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const latest = useRef({ spots, selected, onSpot });
  latest.current = { spots, selected, onSpot };

  useEffect(() => {
    let map: MLMap | null = null, dead = false;
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new ml.Map({
        container: el.current, style: groundStyle(PAPER), bounds: box, fitBoundsOptions: { padding: 24 },
        attributionControl: { compact: true, customAttribution: "© OpenStreetMap contributors · OpenFreeMap" },
        dragRotate: false, pitchWithRotate: false, cooperativeGestures: true,
      });
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.on("load", () => {
        const m = map!;
        const { spots: s, selected: sel } = latest.current;
        m.addSource("open", {
          type: "geojson", data: toGeo(s, sel), cluster: true, clusterRadius: 44, clusterMaxZoom: 15,
          clusterProperties: { live: ["+", ["get", "live"]], stale: ["+", ["get", "stale"]], sel: ["max", ["get", "sel"]] },
        });
        m.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        const n = ["case", [">", ["get", "live"], 0], ["get", "live"], ["get", "stale"]] as ExpressionSpecification;
        const r = ["interpolate", ["linear"], ["sqrt", n], 1, 11, 4, 17, 8, 24] as ExpressionSpecification;
        m.addLayer({ id: "open-c", type: "circle", source: "open", paint: {
          "circle-radius": r,
          "circle-color": ["case", [">", ["get", "live"], 0], FLAME, "rgba(0,0,0,0)"] as ExpressionSpecification,
          "circle-opacity": ["case", [">", ["get", "live"], 0], 0.82, 1] as ExpressionSpecification,
          "circle-stroke-color": ["case", ["==", ["get", "sel"], 1], INK, [">", ["get", "live"], 0], "#fffdf9", INK] as ExpressionSpecification,
          "circle-stroke-width": ["case", ["==", ["get", "sel"], 1], 3, 1.5] as ExpressionSpecification,
          "circle-stroke-opacity": ["case", [">", ["get", "live"], 0], 1, 0.55] as ExpressionSpecification,
        } });
        m.addLayer({ id: "open-n", type: "symbol", source: "open", layout: {
          "text-field": ["to-string", n], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-allow-overlap": true,
        }, paint: { "text-color": ["case", [">", ["get", "live"], 0], "#fffdf9", INK] as ExpressionSpecification } });
        m.on("click", "open-c", (e) => {
          const f = e.features?.[0]; if (!f) return;
          const cid = f.properties?.cluster_id;
          if (cid !== undefined) {
            (m.getSource("open") as GeoJSONSource).getClusterExpansionZoom(cid).then((z) => {
              m.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: z + 0.2 });
            }).catch(() => {});
            return;
          }
          const k = f.properties?.key; if (k) latest.current.onSpot(String(k));
        });
        m.on("mouseenter", "open-c", () => { m.getCanvas().style.cursor = "pointer"; });
        m.on("mouseleave", "open-c", () => { m.getCanvas().style.cursor = ""; });
        underlay(m, PAPER, "open-c").catch(() => {});
      });
    });
    return () => { dead = true; map?.remove(); mapRef.current = null; };
    // The map is built once per city; spots and selection update in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box[0], box[1], box[2], box[3]]);

  useEffect(() => {
    (mapRef.current?.getSource("open") as GeoJSONSource | undefined)?.setData(toGeo(spots, selected));
  }, [spots, selected]);

  return <div className="ops-street" ref={el} role="img" aria-label={label} />;
}
