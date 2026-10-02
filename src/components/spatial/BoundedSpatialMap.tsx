"use client";

/* A deliberately small map data client. Cell rollups are fetched per city;
 * individual animals are fetched only after a close-zoom move and only for
 * the visible bbox. No browser state can contain the public register. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { GeoJSONSource, Map as MLMap } from "maplibre-gl";
import { cellToBoundary, cellToLatLng } from "h3-js";
import { ChevronDown, RotateCw } from "lucide-react";
import { NIGHT, groundStyle, supportsWebGL2, underlay } from "@/components/map/basemap";
import { HexPlate, type Box } from "@/components/system/HexPlate";
import { getSupabase } from "@/lib/supabase";
import "./spatial.css";

type City = { city: string; state: string | null; animals: number; cases: number; open_cases: number; cells: number };
type Cell = { city: string; state: string | null; zone: string | null; h3_r8: string; animals: number; needs_help: number; sterilised: number; vaccinated: number; open_cases: number; cases: number; care_events: number };
type Animal = { id: string; lat: number | null; lng: number | null; needs_help: boolean | null; status: string | null };
const EMPTY = { type: "FeatureCollection" as const, features: [] as GeoJSON.Feature[] };
const fmt = (n: number) => n.toLocaleString("en-IN");

export function BoundedSpatialMap({ scope = "public" }: { scope?: "public" | "org" }) {
  const params = useSearchParams();
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cityRef = useRef("");
  const [cities, setCities] = useState<City[]>([]);
  const [city, setCity] = useState("");
  const [cells, setCells] = useState<Cell[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const chosen = useMemo(() => cities.find((item) => item.city === city) ?? null, [cities, city]);
  const plate = useMemo(() => {
    let west=180,south=90,east=-180,north=-90;
    const max = Math.max(1,...cells.map(c => c.animals));
    const shapes = cells.flatMap(c => {
      try {
        const ring = cellToBoundary(c.h3_r8,true).flat();
        for (let i=0;i<ring.length;i+=2) { west=Math.min(west,ring[i]);east=Math.max(east,ring[i]);south=Math.min(south,ring[i+1]);north=Math.max(north,ring[i+1]); }
        return [{ key:c.h3_r8,ring,fill:`rgba(147,177,240,${.15+.65*Math.sqrt(c.animals/max)})`,stroke:c.open_cases ? "#ff8a6e" : "rgba(219,231,255,.45)" }];
      } catch { return []; }
    });
    const box: Box = [west-.005,south-.005,east+.005,north+.005];
    return { shapes,box };
  }, [cells]);
  const auth = useCallback(async () => {
    if (scope !== "org") return {};
    const { data } = (await getSupabase()?.auth.getSession()) ?? { data: { session: null } };
    if (!data.session?.access_token) throw new Error("Sign in to view your organisation map.");
    return { headers: { Authorization: `Bearer ${data.session.access_token}` } };
  }, [scope]);

  useEffect(() => { cityRef.current = city; }, [city]);

  useEffect(() => {
    let live = true;
    auth().then((init) => fetch(`/api/spatial?kind=cities${scope === "org" ? "&scope=org" : ""}`, init)).then(async (r) => r.ok ? r.json() : Promise.reject(new Error("Could not load map cities.")))
      .then((body) => { if (!live) return; const rows = (body.cities ?? []) as City[]; setCities(rows); const requested = params.get("city"); setCity((current) => rows.some((r) => r.city === requested) ? requested! : rows.some((r) => r.city === current) ? current : rows[0]?.city || ""); })
      .catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [auth, params, scope, retry]);

  useEffect(() => {
    if (!city) return;
    let live = true;
    setLoading(true); setError(null); setCells([]);
    (mapRef.current?.getSource("animals") as GeoJSONSource | undefined)?.setData(EMPTY);
    auth().then((init) => fetch(`/api/spatial?kind=cells&city=${encodeURIComponent(city)}${scope === "org" ? "&scope=org" : ""}`, init)).then(async (r) => r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => null))?.error ?? "Could not load this city.")))
      .then((body) => { if (live) setCells(body.cells ?? []); })
      .catch((e: Error) => { if (live) { setCells([]); setError(e.message); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [auth, city, scope, retry]);

  useEffect(() => {
    let dead = false;
    if (!supportsWebGL2()) return;
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      let map: MLMap;
      try { map = new ml.Map({ container: el.current, style: groundStyle(NIGHT), center: [78.9629, 20.5937], zoom: 4.1, attributionControl: false });
      } catch { return; /* The recorded-area plate remains available. */ }
      mapRef.current = map;
      map.on("load", async () => {
        map.addSource("cells", { type: "geojson", data: EMPTY });
        map.addSource("animals", { type: "geojson", data: EMPTY });
        map.addLayer({ id: "cells-fill", type: "fill", source: "cells", paint: { "fill-color": ["interpolate", ["linear"], ["get", "animals"], 0, "#1b3f80", 10, "#4f7fe0", 100, "#dbe7ff"], "fill-opacity": 0.52 } });
        map.addLayer({ id: "cells-open", type: "line", source: "cells", filter: [">", ["get", "open"], 0], paint: { "line-color": "#ff8a6e", "line-width": 1.4, "line-opacity": 0.9 } });
        map.addLayer({ id: "cells-edge", type: "line", source: "cells", paint: { "line-color": "rgba(219,231,255,0.45)", "line-width": 0.55 } });
        map.addLayer({ id: "animal-glow", type: "heatmap", source: "animals", maxzoom: 15, paint: { "heatmap-radius": 18, "heatmap-intensity": 0.3, "heatmap-opacity": 0.7, "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(19,43,85,0)", 0.5, "rgba(79,127,224,0.55)", 1, "#dbe7ff"] } });
        map.addLayer({ id: "animals", type: "circle", source: "animals", minzoom: 11.5, paint: { "circle-radius": 4, "circle-color": ["case", ["==", ["get", "help"], 1], "#ff8a6e", "#dbe7ff"], "circle-stroke-color": "#0b1e3d", "circle-stroke-width": 1 } });
        await underlay(map, NIGHT, "cells-fill").catch(() => false);
        if (!dead) setMapReady(true);
        const loadViewport = () => {
          const activeCity = cityRef.current;
          if (map.getZoom() < 11.5 || !activeCity) { (map.getSource("animals") as GeoJSONSource | undefined)?.setData(EMPTY); return; }
          const b = map.getBounds();
          auth().then((init) => fetch(`/api/spatial?kind=animals&city=${encodeURIComponent(activeCity)}&west=${b.getWest()}&south=${b.getSouth()}&east=${b.getEast()}&north=${b.getNorth()}${scope === "org" ? "&scope=org" : ""}`, init))
            .then((r) => r.ok ? r.json() : null).then((body) => {
              if (dead || !body || activeCity !== cityRef.current) return;
              const features = ((body.animals ?? []) as Animal[]).filter((a) => Number.isFinite(a.lat) && Number.isFinite(a.lng)).map((a) => ({ type: "Feature" as const, properties: { help: a.needs_help ? 1 : 0, id: a.id }, geometry: { type: "Point" as const, coordinates: [a.lng!, a.lat!] } }));
              (map.getSource("animals") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
            }).catch(() => undefined);
        };
        map.on("moveend", () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(loadViewport, 180); });
      });
    }).catch(() => setError("The map could not load. Please retry."));
    return () => { dead = true; setMapReady(false); if (timer.current) clearTimeout(timer.current); mapRef.current?.remove(); mapRef.current = null; };
  }, [auth, scope]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.isStyleLoaded()) return;
    if (!cells.length) {
      (map.getSource("cells") as GeoJSONSource | undefined)?.setData(EMPTY);
      return;
    }
    const features = cells.map((cell) => ({
      type: "Feature" as const, properties: { animals: cell.animals, open: cell.open_cases, help: cell.needs_help, zone: cell.zone ?? "" },
      geometry: { type: "Polygon" as const, coordinates: [cellToBoundary(cell.h3_r8, true)] },
    }));
    (map.getSource("cells") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
    const points = cells.map((cell) => cellToLatLng(cell.h3_r8));
    if (points.length) {
      const lngs = points.map(([, lng]) => lng), lats = points.map(([lat]) => lat);
      map.fitBounds([[Math.min(...lngs) - 0.015, Math.min(...lats) - 0.015], [Math.max(...lngs) + 0.015, Math.max(...lats) + 0.015]], { padding: 36, maxZoom: 12, duration: 500 });
    }
  }, [cells, mapReady]);

  return <div className="sm sm-bounded">
    <div className="sm-canvas" ref={el} />
    {!mapReady && plate.shapes.length > 0 && <HexPlate className="sm-fallback-map" cells={plate.shapes} box={plate.box} width={900} height={540} pad={84} night label={`Recorded areas in ${city}. Cell shading shows animal totals; orange boundaries have open cases.`} />}
    <div className="sm-topbar">
      <label className="sm-select"> <span>City</span><select value={city} onChange={(e) => setCity(e.target.value)} disabled={!cities.length}>{cities.map((item) => <option key={item.city} value={item.city}>{item.city}{item.state ? `, ${item.state}` : ""}</option>)}</select><ChevronDown size={15} /></label>
      {chosen && <p className="sm-q">{fmt(chosen.animals)} recorded animals · {fmt(chosen.open_cases)} open cases</p>}
    </div>
    <div className="sm-hud"><p>{mapReady ? "City areas and totals cover the full register. At close zoom, the visible area loads at most 500 animals." : "Recorded city areas and totals cover the full register. Orange boundaries have open cases."}</p>{loading && <p><RotateCw size={14} /> Loading city areas…</p>}{!loading && !cells.length && !error && <p>No mapped area is recorded in this city yet.</p>}{error && <p className="sm-err">{error} <button onClick={() => setRetry((v) => v + 1)}>Retry</button></p>}</div>
  </div>;
}
