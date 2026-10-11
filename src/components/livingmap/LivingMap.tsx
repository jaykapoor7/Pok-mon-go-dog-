"use client";

/* ════════════════════════════════════════════════════════════════════
   The Living Map.

   One map, four scales, five questions.

   INDIA      one mark per city register, coloured by the kind of record
              it holds (a clinical register is drawn hollow: it is not a
              count of street animals).
   CITY       every recorded area (H3 r8, ≈0.74 km²) as a round disc,
              classed by the question being asked; areas bordering the
              record with nothing in it are drawn as hatched rings, so
              the edge of reporting is visible, not mistaken for empty.
   AREA       the disc opens into a seed head: one dot per recorded
              animal, at schematic positions inside the area — a count
              you can see, never a location.
   ANIMAL     the panel shows the animal, its photograph (veiled when it
              may show an injury) and the way to its full history.

   Everything the map draws is classified once (lib/livingmap/questions)
   and the panel's words, legend, counts and place lists read the same
   classification.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { GeoJSONSource, Map as MLMap, MapGeoJSONFeature } from "maplibre-gl";
import { groundStyle, supportsWebGL2, underlay } from "@/components/map/basemap";
import { ATLAS_PAPER } from "@/components/spatial/atlas-palette";
import { INDIA_BOX } from "@/components/spatial/data";
import { KIND_META, kindOf } from "@/components/spatial/AtlasRegister";
import { cameraDuration, travel } from "@/lib/motion";
import { C, QUESTIONS, defaultFacet, foldMonths, orgPalette, question, type Ctx, type QuestionId, type Range } from "@/lib/livingmap/questions";
import { headline, localities, placeName, tally } from "@/lib/livingmap/reading";
import type { MapArea, MapCity, NationalCity } from "@/lib/livingmap/types";
import { DISC_PX, coreBounds, hatchDisc, haversineKm, seedHead } from "./geo";
import { Panel } from "./Panel";
import "./livingmap.css";

/* Paper, with the street map's own names kept quiet: the localities on the record are the names that matter here. */
const PAL = { ...ATLAS_PAPER, labelOpacity: 0.42 };
const CITY_ZOOM = 7.6;   // below this, the national view
const ENTER_ZOOM = 8.6;  // zooming past this near a city opens it
const AREA_ZOOM = 13.2;  // seed heads appear
const MAX_DOTS = 140;

/* An area's mark grows with the map: never smaller than a legible dot when
   zoomed out, and from z12 on exactly its ground size (≈0.42 km radius,
   doubling per zoom level), so the seed head of animals fits inside it. */
const R_STOPS: [number, number][] = [[6, 2.6], [8, 3.4], [10, 5], [12, 11.5], [13, 23], [16, 184]];
const radius = (k = 1, add = 0) => ["interpolate", ["exponential", 2], ["zoom"], ...R_STOPS.flatMap(([z, r]) => [z, r * k + add])] as unknown as number;
const iconSize = (k = 1) => ["interpolate", ["exponential", 2], ["zoom"], ...R_STOPS.flatMap(([z, r]) => [z, (r * 2 * k) / DISC_PX])] as unknown as number;

export type Level = "india" | "city" | "area" | "animal";

/* Old links into /map keep working: ?mode= maps onto a question. */
const MODE_MAP: Record<string, [QuestionId, string?]> = {
  animals: ["animals"], density: ["animals"], coverage: ["gaps"], cases: ["needs", "open"], activity: ["needs", "open"],
  abc: ["care", "ster"], arv: ["care", "vacc"], medical: ["care", "treat"], needs: ["needs"], care: ["care"], gaps: ["gaps"], orgs: ["orgs"],
};

export function LivingMap() {
  const params = useSearchParams();
  const init = useRef({
    city: params.get("city"),
    q: (params.get("q") ?? MODE_MAP[params.get("mode") ?? ""]?.[0] ?? "animals") as QuestionId,
    f: params.get("f") ?? MODE_MAP[params.get("mode") ?? ""]?.[1] ?? null,
    area: params.get("area") ?? params.get("cell"),
    animal: params.get("animal"),
    t: params.get("t"),
    lat: Number(params.get("lat")), lng: Number(params.get("lng")),
  }).current;

  const [cities, setCities] = useState<NationalCity[]>([]);
  const [city, setCity] = useState<string | null>(init.city);
  const [data, setData] = useState<MapCity | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error" | "missing">("idle");
  const [qid, setQid] = useState<QuestionId>(question(init.q).id);
  const [facet, setFacet] = useState<string>(init.f ?? defaultFacet(question(init.q)));
  const [isolate, setIsolate] = useState<string | null>(null);
  const [range, setRange] = useState<Range>(() => { const m = init.t?.match(/^(\d+)-(\d+)$/); return m ? { from: +m[1], to: +m[2] } : null; });
  const [areaH3, setAreaH3] = useState<string | null>(init.area);
  const [area, setArea] = useState<MapArea | null | "loading" | "error">(null);
  const [animalId, setAnimalId] = useState<string | null>(init.animal);
  const [pin, setPin] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"peek" | "half" | "full">("half");
  const [hover, setHover] = useState<{ x: number; y: number; title: string; line: string } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(4);

  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const userMove = useRef(false);
  const pendingPoint = useRef<[number, number] | null>(null);
  const lastCamera = useRef<string>("");

  const q = question(qid);
  const level: Level = !city ? "india" : animalId ? "animal" : areaH3 ? "area" : "city";

  /* ── data ───────────────────────────────────────────────────────── */
  useEffect(() => {
    /* A cold aggregate can time out once; the second read is served warm. */
    let live = true;
    const read = (left: number): void => {
      fetch("/api/livingmap?kind=cities").then((r) => (r.ok ? r.json() : Promise.reject())).then((j) => { if (live) setCities((j.cities ?? []) as NationalCity[]); })
        .catch(() => { if (live && left > 0) window.setTimeout(() => read(left - 1), 1200); });
    };
    read(2);
    return () => { live = false; };
  }, []);

  /* A shared location (?lat&lng) opens the nearest city and its area. */
  useEffect(() => {
    if (!cities.length || city || !Number.isFinite(init.lat) || !Number.isFinite(init.lng) || !init.lat) return;
    const near = cities.filter((c) => typeof c.lng === "number").map((c) => ({ c, d: haversineKm([init.lng, init.lat], [c.lng!, c.lat!]) })).sort((a, b) => a.d - b.d)[0];
    if (near && near.d < 80) { pendingPoint.current = [init.lng, init.lat]; setCity(near.c.city); }
  }, [cities, city, init]);
  /* …and, once that city is read, the recorded area nearest the point (within about a kilometre). */
  useEffect(() => {
    const pt = pendingPoint.current;
    if (!pt || !data) return;
    pendingPoint.current = null;
    const best = data.cells.map((c) => ({ c, d: haversineKm(pt, c.c) })).sort((a, b) => a.d - b.d)[0];
    if (best && best.d < 1.2) setAreaH3(best.c.h3);
  }, [data]);

  useEffect(() => {
    if (!city) { setData(null); setLoadState("idle"); return; }
    let live = true;
    setLoadState("loading");
    fetch(`/api/livingmap?city=${encodeURIComponent(city)}`).then(async (r) => {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("unavailable");
      return r.json() as Promise<MapCity>;
    }).then((d) => { if (live) { setData(d); setLoadState(d ? "idle" : "missing"); } }).catch(() => { if (live) { setData(null); setLoadState("error"); } });
    return () => { live = false; };
  }, [city]);

  useEffect(() => {
    if (!city || !areaH3) { setArea(null); return; }
    let live = true;
    setArea("loading");
    fetch(`/api/livingmap?kind=area&city=${encodeURIComponent(city)}&h3=${areaH3}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((a: MapArea) => { if (live) setArea(a); }).catch(() => { if (live) setArea("error"); });
    return () => { live = false; };
  }, [city, areaH3]);

  /* ── the reading ────────────────────────────────────────────────── */
  const cells = useMemo(() => data?.cells ?? [], [data]);
  const centers = useMemo(() => cells.map((c) => c.c), [cells]);
  const orgColor = useMemo(() => orgPalette(cells), [cells]);
  const timed = q.timed(facet) && !!range;
  const ctx: Ctx = useMemo(() => ({
    range: timed ? range : null,
    inRange: timed && data ? foldMonths(data.months, cells.length, range) : null,
    orgColor, today: Date.now(),
  }), [timed, range, data, cells.length, orgColor]);
  const classes = useMemo(() => q.classes(facet, ctx), [q, facet, ctx]);
  const { tally: counts, classOf } = useMemo(() => tally(cells, q, facet, ctx), [cells, q, facet, ctx]);
  const reading = useMemo(() => (cells.length ? headline(q, facet, ctx, cells, counts) : null), [q, facet, ctx, cells, counts]);
  const places = useMemo(() => localities(cells, centers, q, facet, ctx), [cells, centers, q, facet, ctx]);
  const areaIndex = useMemo(() => (areaH3 ? cells.findIndex((c) => c.h3 === areaH3) : -1), [cells, areaH3]);
  const edge = useMemo(() => data?.edge ?? [], [data]);

  /* ── the map ────────────────────────────────────────────────────── */
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    if (!supportsWebGL2()) { setMapError("This browser cannot draw the interactive map. The panel still lists every place and figure."); return; }
    let dead = false;
    let map: MLMap | null = null;
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new ml.Map({
        container: el.current, style: groundStyle(PAL), bounds: INDIA_BOX, fitBoundsOptions: { padding: 30 },
        attributionControl: { compact: true, customAttribution: "© OpenStreetMap contributors · OpenFreeMap · H3" },
        dragRotate: false, pitchWithRotate: false, maxZoom: 16.5, minZoom: 3,
      });
      mapRef.current = map;
      if (process.env.NODE_ENV !== "production") (window as unknown as { __lm?: MLMap }).__lm = map;
      map.touchZoomRotate.disableRotation();
      map.on("error", (e) => {
        if (process.env.NODE_ENV !== "production") console.error("map:", e.error?.message); if (/webgl|context/i.test(e.error?.message ?? "")) setMapError("This browser cannot draw the interactive map. The panel still lists every place and figure."); });
      map.on("load", () => {
        const m = map!;
        m.addImage("h-quiet", hatchDisc("rgba(11,30,61,0.4)", "rgba(244,239,230,0.92)", "rgba(11,30,61,0.45)"));
        m.addImage("h-amber", hatchDisc("rgba(168,116,15,0.8)", "rgba(250,240,220,0.95)", "rgba(168,116,15,0.9)"));
        m.addImage("h-stale", hatchDisc("rgba(138,106,59,0.85)", "rgba(244,236,222,0.95)", "rgba(138,106,59,0.95)"));
        m.addImage("h-edge", hatchDisc("rgba(11,30,61,0.16)", "rgba(244,239,230,0.35)", "rgba(11,30,61,0.3)", true));
        const empty = { type: "FeatureCollection" as const, features: [] };
        for (const s of ["edge", "areas", "dots", "zones", "nums", "sel", "cities"]) m.addSource(s, { type: "geojson", data: empty });
        /* Bordering areas with no record: faint hatched rings, the edge of reporting. */
        m.addLayer({ id: "edge", type: "symbol", source: "edge", layout: { "icon-image": "h-edge", "icon-size": iconSize(0.92), "icon-allow-overlap": true, "icon-ignore-placement": true },
          paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], 12, 1, 14.5, 0.4] } });
        m.addLayer({ id: "areas-fill", type: "circle", source: "areas", filter: ["!=", ["get", "kind"], "unknown"], paint: {
          "circle-radius": radius(),
          "circle-color": ["get", "color"],
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 12.4, ["case", ["==", ["get", "dim"], 1], 0.1, 0.92], 14, ["case", ["==", ["get", "dim"], 1], 0.06, 0.22]],
          "circle-stroke-color": ["case", ["==", ["get", "kind"], "zero"], "rgba(11,30,61,0.45)", ["get", "color"]],
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 12, 1, 15, 1.6],
          "circle-stroke-opacity": ["case", ["==", ["get", "dim"], 1], 0.2, 1],
        } });
        m.addLayer({ id: "areas-unknown", type: "symbol", source: "areas", filter: ["==", ["get", "kind"], "unknown"], layout: {
          "icon-image": ["get", "pattern"], "icon-size": iconSize(), "icon-allow-overlap": true, "icon-ignore-placement": true,
        }, paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], 12.4, ["case", ["==", ["get", "dim"], 1], 0.18, 1], 14, ["case", ["==", ["get", "dim"], 1], 0.12, 0.55]] } });
        m.addLayer({ id: "areas-multi", type: "circle", source: "areas", filter: ["==", ["get", "multi"], 1], paint: {
          "circle-radius": radius(1, 3), "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": C.ink, "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 8, 1, 14, 2.2],
        } });
        m.addLayer({ id: "dots", type: "circle", source: "dots", minzoom: AREA_ZOOM - 0.4, paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 1.6, 15, 3.6, 16.5, 5.2],
          "circle-color": ["get", "color"], "circle-opacity": ["interpolate", ["linear"], ["zoom"], AREA_ZOOM - 0.4, 0, AREA_ZOOM + 0.2, 1],
          "circle-stroke-color": "#f7f3ec", "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 13, 0, 15, 0.8],
        } });
        m.addLayer({ id: "sel", type: "circle", source: "sel", paint: { "circle-radius": radius(1.12, 4), "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": C.ink, "circle-stroke-width": 2.4 } });
        m.addLayer({ id: "nums", type: "symbol", source: "nums", minzoom: 11.6, layout: {
          "text-field": ["get", "t"], "text-font": ["Noto Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 11.6, 10, 14, 13], "text-allow-overlap": false, "text-padding": 1,
          "visibility": "visible",
        }, paint: { "text-color": ["get", "ink"], "text-opacity": ["interpolate", ["linear"], ["zoom"], AREA_ZOOM - 0.4, 1, AREA_ZOOM + 0.2, 0] } });
        m.addLayer({ id: "zones", type: "symbol", source: "zones", maxzoom: 15.5, layout: {
          "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 9, 11, 14, 14],
          "text-letter-spacing": 0.02, "symbol-sort-key": ["get", "rank"], "text-padding": 6, "text-max-width": 9,
          "text-variable-anchor": ["center", "top", "bottom"], "text-radial-offset": 0.9,
        }, paint: { "text-color": C.ink, "text-halo-color": "#f7f3ec", "text-halo-width": 1.6, "text-opacity": ["interpolate", ["linear"], ["zoom"], 8.5, 0, 9.5, 0.95] } });
        m.addLayer({ id: "cities", type: "circle", source: "cities", paint: {
          "circle-radius": ["get", "r"], "circle-color": ["get", "color"], "circle-opacity": ["get", "op"],
          "circle-stroke-color": ["get", "stroke"], "circle-stroke-width": ["get", "sw"],
        } });
        m.addLayer({ id: "cities-l", type: "symbol", source: "cities", layout: {
          "text-field": ["format", ["get", "name"], { "font-scale": 1 }, "\n", {}, ["get", "fig"], { "font-scale": 0.86 }],
          "text-font": ["Noto Sans Bold"], "text-size": 12, "text-variable-anchor": ["top", "bottom", "right", "left"], "text-radial-offset": ["get", "off"],
          "symbol-sort-key": ["get", "rank"], "text-optional": true, "text-justify": "auto",
        }, filter: ["==", ["get", "label"], 1], paint: { "text-color": C.ink, "text-halo-color": "#f7f3ec", "text-halo-width": 1.6 } });

        m.on("mousemove", "areas-fill", (e) => hoverArea(e.features?.[0], e.point));
        m.on("mousemove", "areas-unknown", (e) => hoverArea(e.features?.[0], e.point));
        m.on("mousemove", "cities", (e) => hoverCity(e.features?.[0], e.point));
        for (const id of ["areas-fill", "areas-unknown", "cities"]) {
          m.on("mouseleave", id, () => { setHover(null); m.getCanvas().style.cursor = ""; });
          m.on("mouseenter", id, () => { m.getCanvas().style.cursor = "pointer"; });
        }
        m.on("click", (e) => clickMap(m, e.point));
        m.on("movestart", (e) => { userMove.current = !!(e as { originalEvent?: unknown }).originalEvent; });
        m.on("moveend", () => { setZoom(m.getZoom()); });
        underlay(m, PAL, "edge").catch(() => {});
        setZoom(m.getZoom());
        setReady(true);
      });
    }).catch(() => setMapError("The map could not start. The panel still lists every place and figure."));
    return () => { dead = true; map?.remove(); mapRef.current = null; setReady(false); };
    // Built once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Event handlers read the latest state through refs. */
  const live = useRef({ cities, cells, classOf, classes, q, facet, ctx, city, areaH3 });
  live.current = { cities, cells, classOf, classes, q, facet, ctx, city, areaH3 };

  const hoverArea = (f: MapGeoJSONFeature | undefined, p: { x: number; y: number }) => {
    if (!f || window.matchMedia("(hover: none)").matches) return;
    const L = live.current, i = f.properties?.i as number, c = L.cells[i];
    if (!c) return;
    const k = L.classes.find((x) => x.id === L.classOf[i]);
    const v = L.q.measure(c, L.facet, L.ctx, i);
    setHover({ x: p.x, y: p.y, title: placeName(c.zone), line: `${k?.label || "—"}${v ? ` · ${v.toLocaleString("en-IN")} ${L.q.unit(L.facet)}` : ""}` });
  };
  const hoverCity = (f: MapGeoJSONFeature | undefined, p: { x: number; y: number }) => {
    if (!f || window.matchMedia("(hover: none)").matches) return;
    setHover({ x: p.x, y: p.y, title: String(f.properties?.name), line: String(f.properties?.tip ?? "") });
  };
  const clickMap = (m: MLMap, p: { x: number; y: number }) => {
    const hit = m.queryRenderedFeatures([[p.x - 4, p.y - 4], [p.x + 4, p.y + 4]], { layers: ["cities", "areas-fill", "areas-unknown", "dots"].filter((l) => m.getLayer(l)) });
    /* Neighbouring city marks overlap at the national scale: the one whose
       centre is nearest the tap is the one meant. */
    const dist = (h: MapGeoJSONFeature) => { const q = m.project((h.geometry as GeoJSON.Point).coordinates as [number, number]); return (q.x - p.x) ** 2 + (q.y - p.y) ** 2; };
    const cityHit = hit.filter((h) => h.layer.id === "cities").sort((a, b) => dist(a) - dist(b))[0];
    const areaHit = hit.find((h) => h.layer.id !== "cities");
    if (areaHit && live.current.city) { const i = areaHit.properties?.i as number; const c = live.current.cells[i]; if (c) { setAreaH3(c.h3); setAnimalId(null); setSheet("half"); } return; }
    if (cityHit) { openCity(String(cityHit.properties?.name)); return; }
    if (live.current.areaH3) { setAreaH3(null); setAnimalId(null); }
  };

  const openCity = useCallback((name: string) => {
    setCity(name); setAreaH3(null); setAnimalId(null); setIsolate(null); setRange(null); setPin(null); setSheet("half");
  }, []);
  const goIndia = useCallback(() => { setCity(null); setAreaH3(null); setAnimalId(null); setIsolate(null); setRange(null); setPin(null); }, []);

  /* Zooming is navigation too: out past the city scale returns to India; in
     past the entry scale near a city opens it. Only for the visitor's own moves. */
  useEffect(() => {
    if (!ready || !userMove.current) return;
    const m = mapRef.current; if (!m) return;
    if (city && zoom < CITY_ZOOM - 1) { goIndia(); return; }
    if (!city && zoom >= ENTER_ZOOM && cities.length) {
      const c = m.getCenter();
      const near = cities.filter((x) => typeof x.lng === "number").map((x) => ({ x, d: haversineKm([c.lng, c.lat], [x.lng!, x.lat!]) })).sort((a, b) => a.d - b.d)[0];
      if (near && near.d < 60) { userMove.current = false; openCity(near.x.city); }
    }
  }, [zoom, ready, city, cities, goIndia, openCity]);

  /* ── paint: national ────────────────────────────────────────────── */
  const nationalMeasure = useCallback((c: NationalCity) => {
    if (qid === "needs") return facet === "followups" ? 0 : c.open_cases;
    if (qid === "care") return facet === "vacc" ? c.vaccinated : facet === "treat" ? c.treatments : c.sterilised;
    return c.animals;
  }, [qid, facet]);

  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const src = m.getSource("cities") as GeoJSONSource | undefined; if (!src) return;
    const show = level === "india";
    const vals = cities.map(nationalMeasure);
    const max = Math.sqrt(Math.max(1, ...cities.filter((c) => kindOf(c.city, c.cells) !== "clinical").map(nationalMeasure)));
    const ranked = [...cities].sort((a, b) => nationalMeasure(b) - nationalMeasure(a));
    src.setData({ type: "FeatureCollection", features: show ? cities.flatMap((c, i) => {
      if (typeof c.lng !== "number" || typeof c.lat !== "number") return [];
      const k = kindOf(c.city, c.cells), clinical = k === "clinical", v = vals[i];
      const r = clinical ? 16 : v ? 4 + (Math.sqrt(v) / max) * 30 : 3.5;
      const color = KIND_META[k].color;
      const fig = v ? `${v.toLocaleString("en-IN")}${clinical ? " · register" : ""}` : "";
      return [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] }, properties: {
        name: c.city, r, color, op: clinical ? 0 : v ? 0.82 : 0.25, stroke: clinical ? KIND_META.clinical.color : "#f7f3ec", sw: clinical ? 2.2 : 1,
        fig, rank: ranked.indexOf(c) + (v ? 0 : 1000), off: r / 12 + 0.5, label: v || clinical ? 1 : 0,
        tip: `${KIND_META[k].label} · ${c.animals.toLocaleString("en-IN")} records${clinical ? ", one city-level register" : ""}`,
      } }];
    }) : [] });
  }, [cities, ready, level, nationalMeasure, qid]);

  /* ── paint: city ────────────────────────────────────────────────── */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const set = (id: string, features: GeoJSON.Feature[]) => (m.getSource(id) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
    if (!city || !cells.length) { for (const s of ["areas", "edge", "dots", "zones", "nums", "sel"]) set(s, []); return; }
    const byId = new Map(classes.map((k) => [k.id, k]));
    const pattern = (id: string) => (id === "stale" ? "h-stale" : id === "status" ? "h-amber" : "h-quiet");
    set("areas", cells.map((c, i) => {
      const k = byId.get(classOf[i]);
      return { type: "Feature", geometry: { type: "Point", coordinates: centers[i] }, properties: {
        i, kind: k?.kind ?? "zero", color: k?.color ?? C.zeroFill, pattern: pattern(classOf[i]),
        dim: isolate && isolate !== classOf[i] ? 1 : 0, multi: qid === "orgs" && c.orgs.length > 1 ? 1 : 0,
      } };
    }));
    set("edge", qid === "gaps" || zoom > 11 ? edge.map((pt) => ({ type: "Feature", geometry: { type: "Point", coordinates: pt }, properties: {} })) : []);
    /* Numbers on the discs, from the city scale up to the seed heads. */
    set("nums", cells.flatMap((c, i) => {
      const v = q.measure(c, facet, ctx, i);
      if (!v || (isolate && isolate !== classOf[i])) return [];
      const k = byId.get(classOf[i]);
      const dark = k?.kind === "value" && /^(#16398f|#2457ce|#1f6f80|#3c98a8|#a8230f|#e0472b|#0b1e3d)$/i.test(k.color);
      return [{ type: "Feature", geometry: { type: "Point", coordinates: centers[i] }, properties: { t: v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v), ink: dark && zoom < 12.5 ? "#ffffff" : C.ink } }];
    }));
    /* Locality names: the busiest locality labels first. */
    set("zones", places.slice(0, 60).map((p, r) => ({ type: "Feature", geometry: { type: "Point", coordinates: p.center }, properties: { name: p.name, rank: r } })));
    /* Seed heads: one dot per recorded animal, coloured by what the question
       says about it, the flagged ones at the centre. Positions are schematic. */
    const dots: GeoJSON.Feature[] = [];
    cells.forEach((c, i) => {
      if (isolate && isolate !== classOf[i]) return;
      const n = Math.min(c.animals, MAX_DOTS);
      if (!n) return;
      const parts = dotParts(c, qid, facet, orgColor);
      const colors: string[] = [];
      for (const [count, col] of parts) for (let j = 0; j < count && colors.length < n; j++) colors.push(col);
      while (colors.length < n) colors.push("rgba(11,30,61,0.32)");
      seedHead(centers[i], n).forEach((pt, j) => dots.push({ type: "Feature", geometry: { type: "Point", coordinates: pt }, properties: { i, color: colors[j] } }));
    });
    set("dots", dots);
  }, [ready, city, cells, centers, classOf, classes, isolate, qid, facet, q, ctx, edge, places, zoom, orgColor]);

  /* Selection outline. */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const src = m.getSource("sel") as GeoJSONSource | undefined;
    const rings = [areaIndex >= 0 ? centers[areaIndex] : null, pin && pin !== areaH3 ? (() => { const j = cells.findIndex((c) => c.h3 === pin); return j >= 0 ? centers[j] : null; })() : null].filter(Boolean) as [number, number][];
    src?.setData({ type: "FeatureCollection", features: rings.map((c) => ({ type: "Feature", geometry: { type: "Point", coordinates: c }, properties: {} })) });
  }, [ready, areaIndex, centers, pin, areaH3, cells]);

  /* ── camera ─────────────────────────────────────────────────────── */
  const pad = useCallback(() => {
    const w = el.current?.clientWidth ?? 1200, h = el.current?.clientHeight ?? 800;
    return w > 900 ? { top: 70, bottom: 120, left: 440, right: 60 } : { top: 110, bottom: Math.round(h * 0.42), left: 16, right: 16 };
  }, []);
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const key = `${level}:${city}:${areaH3}:${cells.length}`;
    if (key === lastCamera.current) return;
    lastCamera.current = key;
    userMove.current = false;
    if (level === "india") { m.fitBounds(INDIA_BOX, { padding: pad(), duration: cameraDuration(m.getZoom(), 4.2), easing: travel }); return; }
    if (!cells.length) return;
    if ((level === "area" || level === "animal") && areaIndex >= 0) {
      const z = Math.max(14.4, Math.min(m.getZoom(), 15.4));
      m.flyTo({ center: centers[areaIndex], zoom: z, offset: offsetFor(pad()), duration: cameraDuration(m.getZoom(), z), easing: travel });
      return;
    }
    if (level === "city") {
      const b = coreBounds(centers);
      const z = m.cameraForBounds(b, { padding: pad(), maxZoom: 12.8 })?.zoom ?? 11;
      m.fitBounds(b, { padding: pad(), maxZoom: 12.8, duration: cameraDuration(m.getZoom(), z), easing: travel });
    }
  }, [ready, level, city, areaH3, areaIndex, cells.length, centers, pad]);

  /* ── URL: shareable state, without a navigation per change ──────── */
  useEffect(() => {
    const p = new URLSearchParams();
    if (city) p.set("city", city);
    if (qid !== "animals") p.set("q", qid);
    if (q.facets && facet !== defaultFacet(q)) p.set("f", facet);
    if (areaH3) p.set("area", areaH3);
    if (animalId) p.set("animal", animalId);
    if (range) p.set("t", `${range.from}-${range.to}`);
    const s = p.toString();
    window.history.replaceState(window.history.state, "", s ? `/map?${s}` : "/map");
  }, [city, qid, facet, areaH3, animalId, range, q]);

  /* Escape goes up one scale. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || (e.target as HTMLElement)?.closest("input, textarea, [role=dialog]")) return;
      if (animalId) setAnimalId(null); else if (areaH3) setAreaH3(null); else if (city) goIndia();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [animalId, areaH3, city, goIndia]);

  const chooseQuestion = (id: QuestionId) => { const nq = question(id); setQid(id); setFacet(defaultFacet(nq)); setIsolate(null); };
  const chooseFacet = (f: string) => { setFacet(f); setIsolate(null); };
  const flyToPlace = (center: [number, number]) => {
    const m = mapRef.current; if (!m) return;
    m.flyTo({ center, zoom: Math.max(m.getZoom(), 13), offset: offsetFor(pad()), duration: cameraDuration(m.getZoom(), 13), easing: travel });
  };

  return (
    <div className={`lm lm-${level}${loadState === "loading" ? " is-loading" : ""}`} data-sheet={sheet}>
      <div className="lm-map" ref={el} role="application" aria-label={`Map of ${city ?? "India"}: ${q.ask} The panel lists the same places and figures.`} />
      {mapError && <p className="lm-maperr" role="status">{mapError}</p>}
      {hover && <div className="lm-tip" style={{ left: hover.x + 14, top: hover.y + 14 }} aria-hidden><b>{hover.title}</b><span>{hover.line}</span></div>}
      {city && zoom >= AREA_ZOOM && <p className="lm-scale-note" aria-hidden>One dot, one recorded animal · positions inside an area are schematic</p>}
      <Panel
        level={level} cities={cities} city={city} data={data} loadState={loadState}
        q={q} questions={QUESTIONS} facet={facet} classes={classes} counts={counts} reading={reading} isolate={isolate}
        places={places} cells={cells} classOf={classOf} ctx={ctx} range={range} timedActive={q.timed(facet)}
        area={area} areaIndex={areaIndex} animalId={animalId} pin={pin} sheet={sheet} nationalMeasure={nationalMeasure}
        onQuestion={chooseQuestion} onFacet={chooseFacet} onIsolate={(k) => setIsolate((x) => (x === k ? null : k))} onRange={setRange}
        onCity={openCity} onIndia={goIndia} onArea={(h3) => { setAreaH3(h3); setAnimalId(null); setSheet("half"); }} onCloseArea={() => { setAreaH3(null); setAnimalId(null); }}
        onAnimal={(id) => { setAnimalId(id); setSheet("full"); }} onCloseAnimal={() => setAnimalId(null)}
        onPin={(h3) => setPin(h3)} onPlace={(c) => flyToPlace(c)} onSheet={setSheet}
        onFound={(a) => { if (a.city) { setCity(a.city); setAreaH3(a.h3); setAnimalId(a.id); setSheet("full"); } }}
      />
    </div>
  );
}

/* Centre a point in the part of the map the panel leaves visible. An offset,
   not padding: padding given to flyTo stays on the map and would be added
   again to every later fitBounds, framing each city looser than the last. */
const offsetFor = (p: { top: number; bottom: number; left: number; right: number }): [number, number] => [(p.left - p.right) / 2, (p.top - p.bottom) / 2];

/** How an area's dots divide, for the question being asked: [count, colour] in centre-out order. */
function dotParts(c: MapCity["cells"][number], qid: QuestionId, facet: string, orgColor: Map<string, string>): [number, string][] {
  const faint = "rgba(11,30,61,0.3)";
  switch (qid) {
    case "needs": return [[c.needs_help, C.flame], [Math.max(0, c.open_cases - c.needs_help), C.flameSoft]];
    case "care":
      if (facet === "ster") return [[c.ster_yes, C.care[3]], [c.ster_no, C.ink], [c.ster_unknown, "rgba(11,30,61,0.18)"]];
      if (facet === "vacc") return [[c.vacc_yes, C.care[3]], [c.vacc_unknown, "rgba(11,30,61,0.18)"]];
      return [[Math.min(c.animals, c.care - (c.care_kinds.sterilisation ?? 0) - (c.care_kinds.vaccination ?? 0)), C.care[2]]];
    case "orgs": return c.orgs.map((o) => [o.a, (o.name && orgColor.get(o.name)) || faint] as [number, string]);
    case "gaps": return [[c.exact_loc, C.seq[3]], [c.animals - c.exact_loc, "rgba(11,30,61,0.22)"]];
    default: return facet === "photos" ? [[c.photos, C.seq[4]]] : facet === "residents" ? [[c.residents, C.seq[4]]] : [[c.animals, C.seq[3]]];
  }
}
