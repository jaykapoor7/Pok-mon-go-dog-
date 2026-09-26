"use client";

/* ════════════════════════════════════════════════════════════════════
   An organisation's footprint: every place its public record reaches, as a
   point of light on the night streets, brighter where more is recorded.
   When the map comes into view the places light up one after another, the
   way the record grew; under reduced motion they are simply there. Places
   are the public cell centres, never finer.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import type { Map as MLMap, ExpressionSpecification } from "maplibre-gl";
import { NIGHT, groundStyle, underlay } from "@/components/map/basemap";

export type FootCell = { lat: number; lng: number; records: number };

/** The box around where most of the work is: the cells within 25 km of the
    record-weighted centre, so a handful of records in another city does not
    shrink the one the organisation works in. The rest stay drawn, off-frame. */
function coreBox(cells: FootCell[]): [number, number, number, number] {
  const wmed = (key: "lat" | "lng") => {
    const v = [...cells].sort((a, b) => a[key] - b[key]); const half = v.reduce((t, c) => t + c.records, 0) / 2;
    let acc = 0; for (const c of v) { acc += c.records; if (acc >= half) return c[key]; } return v[v.length - 1][key];
  };
  const lat0 = wmed("lat"), lng0 = wmed("lng"), k = Math.cos((lat0 * Math.PI) / 180);
  const near = cells.filter((c) => Math.hypot((c.lat - lat0) * 111, (c.lng - lng0) * 111 * k) <= 25);
  const use = near.length ? near : cells;
  const xs = use.map((c) => c.lng), ys = use.map((c) => c.lat);
  return [Math.min(...xs) - 0.008, Math.min(...ys) - 0.008, Math.max(...xs) + 0.008, Math.max(...ys) + 0.008];
}

export function FootprintMap({ cells, label }: { cells: FootCell[]; label: string }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cells.length) return;
    let map: MLMap | null = null, dead = false, timer = 0;
    // A fixed, scattered order for the lights to come on in.
    const order = cells.map((_, i) => i).sort((a, b) => ((a * 7919) % 997) - ((b * 7919) % 997));
    const rank = new Array(cells.length); order.forEach((i, k) => { rank[i] = k; });
    const data = {
      type: "FeatureCollection" as const,
      features: cells.map((c, i) => ({ type: "Feature" as const, properties: { r: c.records, k: rank[i] }, geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] } })),
    };
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new ml.Map({
        container: el.current, style: groundStyle(NIGHT), bounds: coreBox(cells), fitBoundsOptions: { padding: 24 },
        interactive: false, attributionControl: { compact: true, customAttribution: "© OpenStreetMap contributors · OpenFreeMap" },
      });
      map.on("load", () => {
        const m = map!;
        m.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        m.addSource("fp", { type: "geojson", data });
        m.addLayer({ id: "fp-glow", type: "heatmap", source: "fp", paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["sqrt", ["get", "r"]], 1, 0.25, 6, 1] as ExpressionSpecification,
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 18, 14, 40] as ExpressionSpecification,
          "heatmap-intensity": 0.9,
          "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(36,87,206,0)", 0.2, "rgba(36,87,206,0.35)", 0.5, "rgba(79,127,224,0.6)", 0.8, "rgba(143,183,255,0.75)", 1, "rgba(219,231,255,0.9)"] as ExpressionSpecification,
          "heatmap-opacity": 0.85,
        } });
        m.addLayer({ id: "fp-pt", type: "circle", source: "fp", paint: {
          "circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "r"]], 1, 1.8, 4, 3.6, 10, 6] as ExpressionSpecification,
          "circle-color": "#efe7da", "circle-opacity": 0.9, "circle-blur": 0.3,
        } });
        underlay(m, NIGHT, "fp-glow").catch(() => {});
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const upTo = (k: number) => { m.setFilter("fp-glow", ["<=", ["get", "k"], k]); m.setFilter("fp-pt", ["<=", ["get", "k"], k]); };
        upTo(-1);
        const io = new IntersectionObserver(([en]) => {
          if (!en.isIntersecting) return;
          io.disconnect();
          const t0 = performance.now(), D = 1800;
          const step = (t: number) => {
            if (dead) return;
            const p = Math.min(1, (t - t0) / D);
            upTo(Math.round((1 - Math.pow(1 - p, 2)) * cells.length));
            if (p < 1) timer = requestAnimationFrame(step);
            else { m.setFilter("fp-glow", null); m.setFilter("fp-pt", null); }
          };
          timer = requestAnimationFrame(step);
        }, { threshold: 0.35 });
        io.observe(m.getContainer());
      });
    });
    return () => { dead = true; cancelAnimationFrame(timer); map?.remove(); };
    // Drawn once per organisation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="pp-map" ref={el} role="img" aria-label={label} />;
}
