"use client";

/* Where the animals that need someone are: flame points on the night
   streets, fitted to them. Static — the list below is where you act. */

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { NIGHT, groundStyle, underlay } from "@/components/map/basemap";

export function HelpMap({ points, me }: { points: { id: string; lng: number; lat: number }[]; me: { lat: number; lng: number } | null }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dead = false;
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current || !points.length) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      /* Fit to where most of them are: one record in another city should not
         shrink the rest to a smudge. */
      const q = (a: number[], f: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(f * (s.length - 1))))]; };
      const xs = points.map((p) => p.lng), ys = points.map((p) => p.lat);
      const map = new ml.Map({
        container: el.current, style: groundStyle(NIGHT), interactive: false, attributionControl: false,
        bounds: [[q(xs, 0.08) - 0.01, q(ys, 0.08) - 0.01], [q(xs, 0.92) + 0.01, q(ys, 0.92) + 0.01]], fitBoundsOptions: { padding: 30 },
      });
      mapRef.current = map;
      map.on("load", async () => {
        map.addSource("help", { type: "geojson", data: { type: "FeatureCollection", features: points.map((p) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })) } });
        map.addSource("me", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: "help-glow", type: "circle", source: "help", paint: { "circle-radius": 10, "circle-color": "#f05b40", "circle-opacity": 0.25, "circle-blur": 1 } });
        map.addLayer({ id: "help", type: "circle", source: "help", paint: { "circle-radius": 3.6, "circle-color": "#ff8a6e", "circle-stroke-color": "#07142b", "circle-stroke-width": 1 } });
        map.addLayer({ id: "me", type: "circle", source: "me", paint: { "circle-radius": 7, "circle-color": "#8fb7ff", "circle-stroke-color": "#efe7da", "circle-stroke-width": 2 } });
        await underlay(map, NIGHT, "help-glow").catch(() => false);
        if (!dead) setReady(true);
      });
    });
    return () => { dead = true; mapRef.current?.remove(); mapRef.current = null; };
    // Built once for the list it was given.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !me) return;
    const src = map.getSource("me") as { setData?: (d: unknown) => void } | undefined;
    src?.setData?.({ type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [me.lng, me.lat] } }] });
    map.easeTo({ center: [me.lng, me.lat], zoom: Math.max(map.getZoom(), 12.5), duration: 900 });
  }, [me, ready]);

  return (
    <div className={`hp-map ${ready ? "is-ready" : ""}`}>
      <div className="hp-map-canvas" ref={el} role="img" aria-label="A map of where the animals needing help are recorded" />
      <p className="hp-map-credit">Map © OpenStreetMap contributors · OpenFreeMap</p>
    </div>
  );
}
