"use client";

/* ════════════════════════════════════════════════════════════════════
   An atlas of finished rescues.

   Every rescue is a numbered place on the city's streets. When the atlas
   comes into view the places light up in the order the rescues began, so
   the city fills in the way the record did. Choosing one, on the map, in
   the index or with the arrows, tells it as a route: reported, the care
   that followed, the day it ended, with the time between each written on
   the line. Places are cell centres; nothing is placed finer.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource, ExpressionSpecification } from "maplibre-gl";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { NIGHT, groundStyle, underlay } from "@/components/map/basemap";
import { Route, type RouteStop } from "@/components/system/Route";
import "./stories.css";

export type Story = {
  id: string; n: number; name: string; zone: string | null; cat: string | null;
  reported: string; end: string | null; outcome: string;
  care: { at: string; what: string }[];
  keeper: string | null; photo: string | null;
  pt: [number, number] | null;
};

const DAY = 86_400_000;
const span = (s: Story) => (s.end ? Math.max(1, Math.round((Date.parse(s.end) - Date.parse(s.reported)) / DAY)) : null);
const spanText = (d: number) => (d >= 60 ? `${Math.round(d / 30)} mo` : `${d} d`);
const FLAME = "#f05b40", CREAM = "#efe7da", NIGHT_BG = "#07142b";

/* Two rescues in the same cell would sit on one point: fan them a little
   around it, so both can be chosen. Still inside the cell's neighbourhood. */
function spread(stories: Story[]) {
  const seen = new Map<string, number>();
  return stories.map((s) => {
    if (!s.pt) return null;
    const k = s.pt.join(","), i = seen.get(k) ?? 0; seen.set(k, i + 1);
    if (!i) return s.pt;
    const a = i * 2.4, r = 0.0055 * Math.sqrt(i);
    return [s.pt[0] + Math.cos(a) * r, s.pt[1] + Math.sin(a) * r] as [number, number];
  });
}

function stopsOf(s: Story): RouteStop[] {
  const out: RouteStop[] = [{ key: "r", at: s.reported, label: "Reported", detail: [s.cat, s.zone].filter(Boolean).join(" · ") || undefined, kind: "start" }];
  s.care.forEach((c, i) => out.push({ key: `c${i}`, at: c.at, label: "Care recorded", detail: c.what.replace(/^./, (x) => x.toUpperCase()), kind: "step" }));
  if (s.end) out.push({ key: "e", at: s.end, label: "Rescue ended", detail: s.outcome && s.outcome.split(/\s+/).length <= 3 ? `Outcome: ${s.outcome.toLowerCase()}` : undefined, kind: "end" });
  else out.push({ key: "e", at: null, label: "Closed", detail: s.outcome ? `Outcome: ${s.outcome.toLowerCase()}` : "The day it ended was not recorded", kind: "end" });
  return out;
}

export function StoryAtlas({ stories }: { stories: Story[] }) {
  const [sel, setSel] = useState(() => {
    // Open on the most recent rescue whose record runs from report to end with care between.
    const i = stories.findIndex((s) => s.end && s.care.length > 0);
    return i >= 0 ? i : 0;
  });
  const s = stories[sel];
  const pts = useMemo(() => spread(stories), [stories]);
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const atlasRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ sel, pick: (i: number) => setSel(i) });
  latest.current.sel = sel;

  /* The order the places light up in: the order the rescues began. */
  const order = useMemo(() => {
    const idx = stories.map((_, i) => i).sort((a, b) => Date.parse(stories[a].reported) - Date.parse(stories[b].reported));
    const o = new Array(stories.length); idx.forEach((i, k) => { o[i] = k; }); return o as number[];
  }, [stories]);

  const geo = useCallback((selected: number) => ({
    type: "FeatureCollection" as const,
    features: stories.flatMap((st, i) => (pts[i] ? [{
      type: "Feature" as const,
      properties: { i, n: st.n, sel: i === selected ? 1 : 0, o: order[i] },
      geometry: { type: "Point" as const, coordinates: pts[i]! },
    }] : [])),
  }), [stories, pts, order]);

  useEffect(() => {
    let map: MLMap | null = null, dead = false, timer = 0;
    const withPts = pts.filter(Boolean) as [number, number][];
    if (!withPts.length) return;
    const xs = withPts.map((p) => p[0]), ys = withPts.map((p) => p[1]);
    const box: [number, number, number, number] = [Math.min(...xs) - 0.01, Math.min(...ys) - 0.01, Math.max(...xs) + 0.01, Math.max(...ys) + 0.01];
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new ml.Map({
        container: el.current, style: groundStyle(NIGHT), bounds: box, fitBoundsOptions: { padding: 40 },
        attributionControl: { compact: true, customAttribution: "© OpenStreetMap contributors · OpenFreeMap" },
        dragRotate: false, pitchWithRotate: false, cooperativeGestures: true,
      });
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.on("load", () => {
        const m = map!;
        m.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        m.addSource("st", { type: "geojson", data: geo(latest.current.sel) });
        const pinPaint = (on: boolean) => ({
          "circle-radius": on ? 15 : 12, "circle-color": on ? FLAME : NIGHT_BG, "circle-stroke-color": on ? FLAME : CREAM, "circle-stroke-width": 1.6,
        });
        const numLayout = () => ({ "text-field": ["to-string", ["get", "n"]] as ExpressionSpecification, "text-font": ["Noto Sans Bold"], "text-size": 11.5, "text-allow-overlap": true, "text-ignore-placement": true });
        // Every place, then the chosen one on its own layers above them all, so no neighbour's number covers it.
        m.addLayer({ id: "st-pin", type: "circle", source: "st", filter: ["==", ["get", "sel"], 0], paint: pinPaint(false) });
        m.addLayer({ id: "st-n", type: "symbol", source: "st", filter: ["==", ["get", "sel"], 0], layout: numLayout(), paint: { "text-color": CREAM } });
        m.addLayer({ id: "st-halo", type: "circle", source: "st", filter: ["==", ["get", "sel"], 1], paint: { "circle-radius": 26, "circle-color": FLAME, "circle-opacity": 0.22, "circle-blur": 0.4 } });
        m.addLayer({ id: "st-sel", type: "circle", source: "st", filter: ["==", ["get", "sel"], 1], paint: pinPaint(true) });
        m.addLayer({ id: "st-sel-n", type: "symbol", source: "st", filter: ["==", ["get", "sel"], 1], layout: numLayout(), paint: { "text-color": "#1a0d08" } });
        for (const id of ["st-pin", "st-sel"]) {
          m.on("click", id, (e) => { const i = e.features?.[0]?.properties?.i; if (i !== undefined) latest.current.pick(Number(i)); });
          m.on("mouseenter", id, () => { m.getCanvas().style.cursor = "pointer"; });
          m.on("mouseleave", id, () => { m.getCanvas().style.cursor = ""; });
        }
        underlay(m, NIGHT, "st-pin").catch(() => {});

        /* Light the places up in the order the rescues began, once, when the
           atlas is first on screen; all at once under reduced motion. */
        const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const LAYERS: [string, number][] = [["st-pin", 0], ["st-n", 0], ["st-halo", 1], ["st-sel", 1], ["st-sel-n", 1]];
        const setUpTo = (k: number | null) => { for (const [id, on] of LAYERS) m.setFilter(id, k === null ? ["==", ["get", "sel"], on] : ["all", ["==", ["get", "sel"], on], ["<=", ["get", "o"], k]]); };
        if (calm) return;
        setUpTo(-1);
        const io = new IntersectionObserver(([en]) => {
          if (!en.isIntersecting) return;
          io.disconnect();
          let k = -1;
          timer = window.setInterval(() => {
            k++; setUpTo(k);
            if (k >= stories.length - 1) { window.clearInterval(timer); setUpTo(null); }
          }, 90);
        }, { threshold: 0.4 });
        io.observe(m.getContainer());
      });
    });
    return () => { dead = true; window.clearInterval(timer); map?.remove(); mapRef.current = null; };
    // The map is built once; the chosen rescue updates it in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    (m?.getSource("st") as GeoJSONSource | undefined)?.setData(geo(sel));
    const p = pts[sel];
    if (m && p && !m.getBounds().contains(p)) m.easeTo({ center: p, duration: 600 });
  }, [sel, geo, pts]);

  const go = (i: number, scroll = false) => {
    setSel((i + stories.length) % stories.length);
    if (scroll) atlasRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };
  const d = span(s);
  const said = s.outcome.split(/\s+/).length > 3;

  return (
    <>
      <div className="sa" ref={atlasRef}>
        <div className="sa-map" ref={el} role="img" aria-label={`The ${stories.length} rescues on the map, numbered as in the index below`} />
        <article className="sa-file" aria-live="polite" aria-labelledby="sa-name">
          <header className="sa-file-head">
            <p className="sa-no sys-mono">№ {String(s.n).padStart(2, "0")}{s.cat ? <> · {s.cat}</> : null}</p>
            <div className="sa-step">
              <button type="button" onClick={() => go(sel - 1)} aria-label="Previous rescue"><ChevronLeft size={16} /></button>
              <button type="button" onClick={() => go(sel + 1)} aria-label="Next rescue"><ChevronRight size={16} /></button>
            </div>
          </header>
          <h2 id="sa-name">{s.name}</h2>
          <p className="sa-sum">
            {d ? <>Over in <b>{d === 1 ? "a day" : `${d} days`}</b>, with </> : <>With </>}
            <b>{s.care.length}</b> care {s.care.length === 1 ? "entry" : "entries"} between the report and the end.
          </p>
          {s.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="sa-photo" src={s.photo} alt={`${s.name}, photographed during the rescue`} />
          )}
          <Route key={s.id} stops={stopsOf(s)} label={`The record of ${s.name}, from report to end`} />
          {said && <blockquote className="sa-quote">&ldquo;{s.outcome}.&rdquo;</blockquote>}
          <footer className="sa-foot">
            {s.keeper && <span>Recorded by <b>{s.keeper}</b></span>}
            <Link href={`/dog/${s.id}`}>Open the full record <ArrowUpRight size={14} /></Link>
          </footer>
        </article>
      </div>

      <section className="sa-index" aria-labelledby="sa-index-title">
        <h2 id="sa-index-title" className="sa-index-h">Every rescue here</h2>
        <ol>
          {stories.map((st, i) => {
            const dd = span(st);
            return (
              <li key={st.id}>
                <button type="button" className={i === sel ? "is-on" : ""} aria-current={i === sel ? "true" : undefined} onClick={() => go(i, true)}>
                  <span className="sa-i-n sys-mono">{String(st.n).padStart(2, "0")}</span>
                  <span className="sa-i-what"><b>{st.name}</b><small>{[st.cat, st.zone].filter(Boolean).join(" · ")}</small></span>
                  <span className="sa-i-care sys-mono">{st.care.length} care</span>
                  <span className="sa-i-len sys-mono">{dd ? spanText(dd) : "—"}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
