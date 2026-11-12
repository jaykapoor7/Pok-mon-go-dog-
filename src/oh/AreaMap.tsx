"use client";

/* ════════════════════════════════════════════════════════════════════
   Where to act: one map of a programme's areas carrying the three things
   a One Health programme looks at together.
     · human bite exposures recorded in the area (circle size; counts under
       the programme's threshold stay hidden, drawn as a small hollow ring),
     · laboratory-confirmed cases (a flame ring),
     · dog vaccination against the area's population estimate (the area's
       fill; no estimate, no colour).
   Beside it, the areas ranked by those same three facts, each with the
   reasons it is on the list, so the ranking can be checked, never trusted
   blindly. Areas are drawn from their outline (oh_areas.geometry); where a
   programme has none loaded, the list stands alone and says so.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { call, showCount, useRead, type Network, type Overview } from "./data";
import "./areamap.css";

type Area = {
  id: string; name: string; centre: [number, number] | null; ring: [number, number][] | null;
  bites: number | "<5" | null; positive: boolean; coverage: number | null; registered: number; vaccinated: number;
  score: number; reasons: { tone: "flame" | "amber" | "blue"; text: string }[];
};

function ringOf(g: unknown): [number, number][] | null {
  const geo = g as { type?: string; coordinates?: unknown } | null;
  if (!geo?.coordinates) return null;
  const c = geo.type === "MultiPolygon" ? (geo.coordinates as number[][][][])[0]?.[0] : (geo.coordinates as number[][][])[0];
  return Array.isArray(c) && c.length > 2 ? (c as [number, number][]) : null;
}
const centreOf = (r: [number, number][]): [number, number] => [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];
const pct = (x: number) => `${Math.round(x * 100)}%`;

export function useAreas(programmeId: string, d: Overview): { areas: Area[]; mapped: number; loading: boolean } {
  const net = useRead<Network>(() => call("oh_programme_network", { p_programme: programmeId }), `net:${programmeId}`);
  return useMemo(() => {
    const target = d.programme.target || 0.7;
    const byArea = new Map((d.exposures?.by_area ?? []).map((w) => [w.area, w.n]));
    const positives = new Set(d.samples.positive_areas);
    const vacc = new Map(d.vaccination.map((v) => [v.area_id, v]));
    const counted = [...byArea.values()].filter((n): n is number => typeof n === "number").sort((a, b) => b - a);
    /* "among the most": the top quarter of areas with a shown count */
    const high = counted.length ? counted[Math.max(0, Math.ceil(counted.length / 4) - 1)] : Infinity;
    const known = new Map((net.data?.areas ?? []).filter((a) => a.level === "locality" || a.level === "ward" || a.level === "zone").map((a) => [a.name, a]));
    const names = new Set([...known.keys(), ...byArea.keys(), ...positives]);
    const areas: Area[] = [...names].map((name) => {
      const a = known.get(name);
      const ring = a ? ringOf(a.geometry) : null;
      const bites = byArea.has(name) ? (byArea.get(name) as number | "<5") : null;
      const v = a ? vacc.get(a.id) : undefined;
      const coverage = v?.estimate?.dogs ? v.vaccinated / v.estimate.dogs : null;
      const reasons: Area["reasons"] = [];
      let score = 0;
      if (positives.has(name)) { reasons.push({ tone: "flame", text: "Rabies confirmed" }); score += 100; }
      if (typeof bites === "number" && bites >= high) { reasons.push({ tone: "amber", text: `${bites} bites, among the most` }); score += 30 + bites; }
      else if (typeof bites === "number") score += bites;
      if (coverage !== null && coverage < target) { reasons.push({ tone: "blue", text: `Dogs vaccinated ${pct(coverage)} of a ${pct(target)} target` }); score += 20 * (1 - coverage / target); }
      return { id: a?.id ?? name, name, ring, centre: ring ? centreOf(ring) : null, bites, positive: positives.has(name), coverage, registered: v?.registered ?? 0, vaccinated: v?.vaccinated ?? 0, score, reasons };
    }).sort((x, y) => y.score - x.score);
    return { areas, mapped: areas.filter((a) => a.ring).length, loading: net.loading && !net.data };
  }, [net.data, net.loading, d]);
}

export function AreaIntel({ programme, slug, d }: { programme: string; slug: string; d: Overview }) {
  const { areas, mapped, loading } = useAreas(programme, d);
  const [focus, setFocus] = useState<string | null>(null);
  const act = areas.filter((a) => a.reasons.length).slice(0, 5);
  if (loading) return <div className="oh-map ar-map" aria-busy="true" />;
  return (
    <div className="ar">
      {mapped ? <AreaMap areas={areas} focus={focus} onFocus={setFocus} target={d.programme.target || 0.7} /> : (
        <div className="ar-nomap"><b>Area outlines are not loaded</b><span>Bites, confirmed cases and coverage are listed by area. Load ward or locality boundaries in programme setup to see them on a map.</span></div>
      )}
      <div className="ar-side">
        <h3>Areas to act on</h3>
        {act.length ? (
          <ol>
            {act.map((a, i) => (
              <li key={a.id} className={focus === a.id ? "is-on" : undefined} style={{ ["--i" as string]: i }}>
                <button type="button" onClick={() => setFocus(a.id)} aria-pressed={focus === a.id} disabled={!a.ring}>
                  <span className="ar-n">{i + 1}</span>
                  <span className="ar-t"><b>{a.name}</b><span className="ar-why">{a.reasons.map((r) => <em key={r.text} data-tone={r.tone}>{r.text}</em>)}</span></span>
                </button>
              </li>
            ))}
          </ol>
        ) : <p className="ar-none">No area has a confirmed case, an unusual number of bites or coverage below target.</p>}
        <p className="ar-how">Ranked by confirmed cases, then the number of bites, then the gap to the vaccination target. Counts under the programme&apos;s threshold are not shown.</p>
        <Link className="ar-go" href={`/programme/${slug}/coverage`}>Coverage by area<ArrowRight size={14} aria-hidden /></Link>
      </div>
    </div>
  );
}

function AreaMap({ areas, focus, onFocus, target }: { areas: Area[]; focus: string | null; onFocus: (id: string) => void; target: number }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const drawn = useMemo(() => areas.filter((a) => a.ring && a.centre), [areas]);
  useEffect(() => {
    if (!el.current || !drawn.length) return;
    let gone = false;
    void Promise.all([import("maplibre-gl"), import("@/sp/map/ground")]).then(([ml, g]) => {
      if (gone || !el.current) return;
      const xs = drawn.flatMap((a) => a.ring!.map((p) => p[0])), ys = drawn.flatMap((a) => a.ring!.map((p) => p[1]));
      const map = new ml.Map({ container: el.current, style: { ...g.groundStyle(), glyphs: g.GLYPHS }, bounds: [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], fitBoundsOptions: { padding: 48 }, attributionControl: { compact: true }, cooperativeGestures: true });
      mapRef.current = map;
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      /* Data layers go on as soon as the style is ready, not after the base map's tiles:
         on a slow connection the areas and counts still show while the streets load. */
      const draw = () => {
        if (map.getSource("areas")) return;
        const feature = (a: Area) => ({ type: "Feature" as const, properties: { id: a.id, name: a.name, cov: a.coverage === null ? -1 : Math.min(1, a.coverage / target), n: typeof a.bites === "number" ? a.bites : a.bites === "<5" ? 2 : 0, hidden: a.bites === "<5" ? 1 : 0, pos: a.positive ? 1 : 0 }, geometry: { type: "Polygon" as const, coordinates: [a.ring!] } });
        map.addSource("areas", { type: "geojson", data: { type: "FeatureCollection", features: drawn.map(feature) } });
        map.addSource("dots", { type: "geojson", data: { type: "FeatureCollection", features: drawn.map((a) => ({ ...feature(a), geometry: { type: "Point" as const, coordinates: a.centre! } })) } });
        /* coverage: no estimate is grey; below target runs from pale amber to green at the target */
        map.addLayer({ id: "fill", type: "fill", source: "areas", paint: { "fill-color": ["case", ["<", ["get", "cov"], 0], "#e7eaf0", ["interpolate", ["linear"], ["get", "cov"], 0, "#f6d7a7", 0.6, "#cfe3b4", 1, "#7cc38f"]], "fill-opacity": 0.62 } });
        map.addLayer({ id: "edge", type: "line", source: "areas", paint: { "line-color": "#0b1e3d", "line-opacity": 0.22, "line-width": 1 } });
        map.addLayer({ id: "bites", type: "circle", source: "dots", paint: { "circle-radius": ["interpolate", ["linear"], ["get", "n"], 0, 4, 5, 8, 20, 18], "circle-color": ["case", ["==", ["get", "hidden"], 1], "rgba(0,0,0,0)", "#2457ce"], "circle-opacity": 0.82, "circle-stroke-width": ["case", ["==", ["get", "hidden"], 1], 1.5, 2], "circle-stroke-color": ["case", ["==", ["get", "hidden"], 1], "#2457ce", "#ffffff"] } });
        map.addLayer({ id: "pos", type: "circle", source: "dots", filter: ["==", ["get", "pos"], 1], paint: { "circle-radius": ["interpolate", ["linear"], ["get", "n"], 0, 9, 5, 13, 20, 24], "circle-color": "rgba(0,0,0,0)", "circle-stroke-width": 3, "circle-stroke-color": "#d9481c" } });
        map.addLayer({ id: "label", type: "symbol", source: "dots", layout: { "text-field": ["get", "name"], "text-size": 11, "text-offset": [0, 1.7], "text-font": ["Noto Sans Regular"] }, paint: { "text-color": "#23304a", "text-halo-color": "#ffffff", "text-halo-width": 1.4 } });
        map.on("click", "fill", (e) => { const id = e.features?.[0]?.properties?.id; if (id) onFocus(String(id)); });
        map.on("mouseenter", "fill", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "fill", () => { map.getCanvas().style.cursor = ""; });
      };
      if (map.isStyleLoaded()) draw(); else { map.once("style.load", draw); map.once("load", draw); }
    });
    return () => { gone = true; mapRef.current?.remove(); mapRef.current = null; };
  }, [drawn, target, onFocus]);
  useEffect(() => {
    const a = drawn.find((x) => x.id === focus);
    if (!a || !mapRef.current) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    mapRef.current.easeTo({ center: a.centre!, zoom: Math.max(mapRef.current.getZoom(), 12.4), duration: calm ? 0 : 700 });
  }, [focus, drawn]);
  const sel = drawn.find((a) => a.id === focus);
  return (
    <div className="oh-map ar-map" role="region" aria-label="Map of bites, confirmed cases and dog vaccination by area">
      <div ref={el} style={{ position: "absolute", inset: 0 }} />
      <div className="oh-map-legend" aria-hidden>
        <span><i style={{ background: "#2457ce" }} />Bites recorded (size)</span>
        <span><i style={{ background: "transparent", boxShadow: "0 0 0 2px #d9481c" }} />Rabies confirmed</span>
        <span><i style={{ background: "#7cc38f", borderRadius: 3 }} />Dogs vaccinated, at target</span>
        <span><i style={{ background: "#f6d7a7", borderRadius: 3 }} />Below target</span>
        <span><i style={{ background: "#e7eaf0", borderRadius: 3 }} />No population estimate</span>
      </div>
      {sel ? (
        <div className="ar-card" role="status">
          <b>{sel.name}</b>
          <dl>
            <div><dt>Bites</dt><dd>{sel.bites === null ? "None recorded" : showCount(sel.bites)}</dd></div>
            <div><dt>Confirmed</dt><dd>{sel.positive ? "Yes, by the laboratory" : "No"}</dd></div>
            <div><dt>Dogs vaccinated</dt><dd>{sel.coverage === null ? `${sel.vaccinated} recorded, no estimate` : `${pct(sel.coverage)} of the estimate`}</dd></div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
