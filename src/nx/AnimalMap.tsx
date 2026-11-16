"use client";

/* The register on a map: where the organisation's own animals were last placed, drawn on the app's white-and-blue
   ground and framed to those animals (never India or the world). One dot per animal, blue, or flame when it needs
   help; dots close together gather into a numbered circle that opens when tapped. A tap on a dot shows the animal
   (a card on the map, a sheet on a phone) with a way into its record.

   It reads org_animals with the list's own filters, using the member's session: the database scopes the answer to
   the member's organisation, so nothing another organisation holds can reach it. The streets underneath come from
   OpenStreetMap through OpenFreeMap and arrive after the dots; without them the dots still draw. */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MLMap, MapGeoJSONFeature } from "maplibre-gl";
import { ArrowRight, X } from "lucide-react";
import { supportsWebGL2, type Palette } from "@/components/map/basemap";
import { Chip } from "./ui";
import { day, errText, n } from "./kit";
import { AnimalPhoto, AnimalCell, AnimalTitle } from "./AnimalPhoto";
import { animalLabel } from "./animalLabel";
import { placed, readMapAnimals, useAnimalPhotos, type MapAnimal, type MapQuery } from "./data/animals";
import "./animals.css";

const BLUE = "#2457ce", FLAME = "#f05b40", INK = "#0b1e3d";
const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";
const ATTRIBUTION = "© OpenStreetMap contributors · OpenFreeMap";
/* The app's ground: white roads on a quiet blue-grey, soft blue water, grey type. No paper, no sepia, no ornament. */
const GROUND: Palette = {
  name: "paper", bg: "#f1f4f9", water: "#d6e2f5", land: "#f1f4f9", park: "#e9eef4", building: "#e6eaf1",
  road: "#ffffff", roadMajor: "#ffffff", roadCasing: "#dde3ec", rail: "rgba(11,30,61,0.10)", boundary: "rgba(11,30,61,0.18)",
  label: "#6b7486", labelHalo: "#ffffff", labelOpacity: 0.95, labels: true, showRoadNames: true, minorRoads: true, buildings: true,
  cellEdge: "#ffffff", ink: INK, dim: "rgba(11,30,61,0.55)", seq: [], att: [], arv: BLUE, hatch: "rgba(11,30,61,0.3)", feed: BLUE,
};
const calm = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const phone = () => typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches;
const factTone = (v: string | null) => (v === "sterilised" || v === "vaccinated" ? "ok" : v === "not_sterilised" || v === "not_vaccinated" ? "warn" : "plain") as "ok" | "warn" | "plain";
const fact = (v: string | null, yes: string, no: string, none: string) => (v === "sterilised" || v === "vaccinated" ? yes : v === "not_sterilised" || v === "not_vaccinated" ? no : none);

type Pt = MapAnimal & { lat: number; lng: number };
/** The box the team works in: every animal within 60 km of the middle of the register, so one stray point
    (a typo, a transfer) does not pull the map out to the whole country. Every point is still drawn. */
function frame(points: Pt[]): [[number, number], [number, number]] | null {
  if (!points.length) return null;
  const mid = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const cy = mid(points.map((p) => p.lat)), cx = mid(points.map((p) => p.lng));
  const near = points.filter((p) => Math.abs(p.lat - cy) < 0.55 && Math.abs(p.lng - cx) < 0.6);
  const use = near.length ? near : points;
  const ys = use.map((p) => p.lat), xs = use.map((p) => p.lng);
  let [w, s, e, nn] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  /* A single animal, or a few on one street: open on the street, not on a building. */
  const min = 0.004;
  if (e - w < min) { w -= min; e += min; }
  if (nn - s < min) { s -= min; nn += min; }
  return [[w, s], [e, nn]];
}
const toGeo = (pts: Pt[]): GeoJSON.FeatureCollection<GeoJSON.Point> => ({ type: "FeatureCollection", features: pts.map((p) => ({ type: "Feature", properties: { id: p.id, help: p.needs_help ? 1 : 0 }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })) });

export function AnimalMap({ ngoId, query }: { ngoId: string; query: MapQuery }) {
  const [data, setData] = useState<{ rows: MapAnimal[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [inView, setInView] = useState<string[]>([]);
  const [noGl, setNoGl] = useState(false);
  const [busy, setBusy] = useState(false);
  const qKey = JSON.stringify(query);
  const asked = useRef(0);
  /* A new search keeps the dots on screen until its answer arrives; only the newest answer is drawn. */
  const load = useCallback(async () => {
    const mine = ++asked.current;
    setBusy(true); setError(null);
    const r = await readMapAnimals(JSON.parse(qKey) as MapQuery);
    if (mine !== asked.current) return;
    setBusy(false);
    if (r.error) { setError(errText(r.error)); setData(null); } else setData(r.data!);
  }, [qKey]);
  useEffect(() => { setSel(null); void load(); }, [load]);

  const pts = useMemo(() => (data?.rows ?? []).filter(placed) as Pt[], [data]);
  const byId = useMemo(() => new Map(pts.map((p) => [p.id, p])), [pts]);
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const framedFor = useRef<string | null>(null);
  const ptsRef = useRef(pts); ptsRef.current = pts;

  /* Which animals the map is showing, for the list beside it: most in need first, then the most recently seen. */
  const sync = useCallback(() => {
    const m = mapRef.current; if (!m) return;
    const b = m.getBounds();
    setInView(ptsRef.current.filter((p) => b.contains([p.lng, p.lat])).sort((a, b2) => Number(b2.needs_help) - Number(a.needs_help) || (b2.last_seen ?? "").localeCompare(a.last_seen ?? "")).map((p) => p.id));
  }, []);

  /* The map is made once there is something to frame, so it opens on the animals rather than travelling to them. */
  useEffect(() => {
    if (!data || mapRef.current || !el.current) return;
    const box = frame(pts);
    if (!box) return;
    if (!supportsWebGL2()) { setNoGl(true); return; }
    let gone = false;
    void Promise.all([import("maplibre-gl"), import("@/components/map/basemap")]).then(([ml, base]) => {
      if (gone || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const map = new ml.Map({
        container: el.current, style: { version: 8, glyphs: GLYPHS, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": GROUND.bg } }] },
        bounds: box, fitBoundsOptions: { padding: phone() ? 32 : 64, maxZoom: 16 }, maxZoom: 18, dragRotate: false, pitchWithRotate: false,
        attributionControl: { compact: true, customAttribution: ATTRIBUTION },
      });
      mapRef.current = map;
      framedFor.current = qKey;
      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      /* The credit stays one tap away (the "i"), so it never covers the legend or the dots. */
      const fold = () => map.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      map.once("load", fold); map.once("idle", fold);
      const draw = () => {
        if (map.getSource("animals")) return;
        /* A group that holds an animal needing help keeps a flame ring, so none is hidden by being close to others. */
        map.addSource("animals", { type: "geojson", data: toGeo(ptsRef.current), cluster: true, clusterRadius: 36, clusterMaxZoom: 14, clusterProperties: { help: ["+", ["get", "help"]] } });
        map.addLayer({ id: "am-clusters", type: "circle", source: "animals", filter: ["has", "point_count"], paint: { "circle-color": BLUE, "circle-opacity": 0.92, "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 22], "circle-stroke-color": ["case", [">", ["get", "help"], 0], FLAME, "#ffffff"], "circle-stroke-width": 3 } });
        map.addLayer({ id: "am-count", type: "symbol", source: "animals", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-allow-overlap": true }, paint: { "text-color": "#ffffff" } });
        map.addLayer({ id: "am-halo", type: "circle", source: "animals", filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "help"], 1]], paint: { "circle-color": FLAME, "circle-opacity": 0.18, "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 12, 16, 16] } });
        map.addLayer({ id: "am-dots", type: "circle", source: "animals", filter: ["!", ["has", "point_count"]], paint: { "circle-color": ["case", ["==", ["get", "help"], 1], FLAME, BLUE], "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 6, 16, 9], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
        map.addLayer({ id: "am-sel", type: "circle", source: "animals", filter: ["==", ["get", "id"], ""], paint: { "circle-color": "rgba(0,0,0,0)", "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 11, 16, 14], "circle-stroke-color": INK, "circle-stroke-width": 3 } });
        void base.underlay(map, GROUND).catch(() => false);
        sync();
      };
      const tryDraw = () => { try { draw(); } catch { /* the style is not parsed yet: the next styledata tries again */ } };
      map.on("styledata", tryDraw); map.once("load", tryDraw); tryDraw();
      map.on("moveend", sync);
      map.on("error", () => { /* a tile that fails leaves the ground plain; the animals stay */ });
      const hit = (pt: { x: number; y: number }) => {
        const r = phone() ? 22 : 14;
        const fs = map.queryRenderedFeatures([[pt.x - r, pt.y - r], [pt.x + r, pt.y + r]], { layers: ["am-dots", "am-clusters"].filter((l) => map.getLayer(l)) });
        const d = (f: MapGeoJSONFeature) => { const c = map.project((f.geometry as GeoJSON.Point).coordinates as [number, number]); return (c.x - pt.x) ** 2 + (c.y - pt.y) ** 2; };
        return fs.sort((a, b) => d(a) - d(b))[0] ?? null;
      };
      map.on("click", (e) => {
        const f = hit(e.point);
        if (!f) { setSel(null); return; }
        if (f.layer.id === "am-clusters") {
          const src = map.getSource("animals") as GeoJSONSource;
          void src.getClusterExpansionZoom(Number(f.properties?.cluster_id)).then((z) => map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: Math.min(17, z + 0.5), duration: calm() ? 0 : 450 }));
        } else {
          setSel(String(f.properties?.id ?? ""));
          /* On a phone the card covers the lower part of the map: move the chosen dot up, clear of it. */
          if (phone()) map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], offset: [0, -Math.round(map.getContainer().clientHeight * 0.25)], duration: calm() ? 0 : 350 });
        }
      });
      map.on("mousemove", (e) => { map.getCanvas().style.cursor = hit(e.point) ? "pointer" : ""; });
    });
    return () => { gone = true; };
  }, [data, pts, qKey, sync]);
  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  /* New results: new dots, and a new frame when the filters changed. */
  useEffect(() => {
    const map = mapRef.current; if (!map || !data) return;
    const src = map.getSource("animals") as GeoJSONSource | undefined;
    src?.setData(toGeo(pts));
    if (framedFor.current !== qKey) {
      framedFor.current = qKey;
      const box = frame(pts);
      if (box) map.fitBounds(box, { padding: phone() ? 32 : 64, maxZoom: 16, duration: calm() ? 0 : 500 });
    }
    sync();
  }, [data, pts, qKey, sync]);

  useEffect(() => { const map = mapRef.current; if (map?.getLayer("am-sel")) map.setFilter("am-sel", ["==", ["get", "id"], sel ?? ""]); }, [sel]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") setSel(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

  /** From the list beside the map: bring the animal into view, out of any group, and show it. */
  const focus = (id: string) => {
    const p = byId.get(id), map = mapRef.current; if (!p || !map) return;
    setSel(id);
    map.easeTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 15.2), duration: calm() ? 0 : 500 });
  };

  const side = inView.slice(0, 40).map((id) => byId.get(id)!).filter(Boolean);
  const chosen = sel ? byId.get(sel) ?? null : null;
  const photos = useAnimalPhotos(ngoId, useMemo(() => [...side, ...(chosen ? [chosen] : [])].map((a) => ({ id: a.id, cover_photo: a.cover_photo })), [side.map((a) => a.id).join(","), chosen?.id])); // eslint-disable-line react-hooks/exhaustive-deps
  const unplaced = data ? data.rows.length - pts.length : 0;

  const say = error ? <div className="am-say" role="alert"><div><b>The map could not be read</b><span>{error} Nothing is shown as missing.</span><button type="button" className="nx-btn is-quiet is-sm" onClick={() => void load()}>Read again</button></div></div>
    : !data ? <div className="am-say is-wait" role="status"><div><span>Reading where your animals are…</span></div></div>
    : !pts.length ? <div className="am-say"><div><b>{data.rows.length ? "None of these animals has a place on record" : "No animal matches"}</b><span>{data.rows.length ? "A place is saved when an animal is recorded in field mode with the phone's location. Find these animals in the list." : "Change the search, the view or the place."}</span></div></div>
    : noGl ? <div className="am-say"><div><b>This browser cannot draw the map</b><span>Every animal is in the list, with its place.</span></div></div>
    : null;

  return (
    <>
      <div className={`am-wrap ${pts.length && !noGl ? "" : "is-solo"}`}>
        <div className="am-map" role="region" aria-label="Map of your animals" aria-describedby="am-note">
          <div ref={el} className="am-canvas" />
          {say}
          {busy && data ? <p className="am-busy" role="status">Reading…</p> : null}
          {pts.length && !noGl ? <div className="am-legend" aria-hidden><span><i />Animal</span><span><i className="is-help" />Needs help</span><span><i className="is-many" />Several, tap to open</span></div> : null}
          {chosen ? <Peek a={chosen} photo={photos.get(chosen.id)} onClose={() => setSel(null)} /> : null}
        </div>
        {pts.length && !noGl ? (
          <aside className="am-side" aria-label="Animals in view">
            <h2>In view <small>{inView.length === pts.length ? `all ${n(pts.length)}` : `${n(inView.length)} of ${n(pts.length)}`}</small></h2>
            {side.length ? <ul>{side.map((a) => <li key={a.id}><button type="button" aria-pressed={sel === a.id} onClick={() => focus(a.id)}><AnimalCell a={a} photo={photos.get(a.id)} sub={[animalLabel(a).place ?? "Place not recorded", a.needs_help ? "needs help" : null].filter(Boolean).join(" · ")} /></button></li>)}</ul>
              : <p>No animal in this part of the map. Zoom out or drag the map.</p>}
            {inView.length > side.length ? <p>Zoom in to see the other {n(inView.length - side.length)}.</p> : null}
          </aside>
        ) : null}
      </div>
      <p className="am-note" id="am-note">
        {!data ? " " : <>{pts.length === data.rows.length ? <><b className="num">{n(pts.length)}</b> {pts.length === 1 ? "animal" : "animals"} on the map, at the place each was last recorded.</> : <><b className="num">{n(pts.length)}</b> of {n(data.rows.length)} on the map; {n(unplaced)} {unplaced === 1 ? "has" : "have"} no place on record and {unplaced === 1 ? "is" : "are"} in the list only.</>}
          {data.total > data.rows.length ? <> The newest {n(data.rows.length)} of {n(data.total)} are drawn; choose a place to see the rest.</> : null} Only your organisation&apos;s animals are on it.</>}
      </p>
    </>
  );
}

function Peek({ a, photo, onClose }: { a: MapAnimal; photo: string | null | undefined; onClose: () => void }) {
  const l = animalLabel(a);
  const box = useRef<HTMLElement>(null);
  /* On a phone the card is a sheet along the map's bottom edge: bring it into view if the page is scrolled above it. */
  useEffect(() => { box.current?.scrollIntoView({ block: "nearest", behavior: calm() ? "auto" : "smooth" }); }, [a.id]);
  return (
    <section ref={box} className="am-peek" aria-label={l.line}>
      <div className="am-peek-h">
        <AnimalPhoto src={photo} size="card" alt={`Photo of ${l.line}`} />
        <div><b><AnimalTitle a={a} /></b><small>{l.place ?? "Place not recorded"} · last seen {day(a.last_seen)}</small></div>
        <button type="button" className="am-peek-x" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </div>
      <div className="am-peek-chips">
        {a.needs_help ? <Chip tone="bad">Needs help</Chip> : null}
        <Chip tone={factTone(a.sterilisation_status)}>{fact(a.sterilisation_status, "Sterilised", "Not sterilised", "Sterilisation not recorded")}</Chip>
        <Chip tone={factTone(a.vaccination_status)}>{fact(a.vaccination_status, "Vaccinated", "Not vaccinated", "Vaccination not recorded")}</Chip>
      </div>
      <div className="am-peek-acts"><Link href={`/ngo/animals/${a.id}`} className="nx-btn is-sm">Open the record<ArrowRight size={13} /></Link></div>
    </section>
  );
}
