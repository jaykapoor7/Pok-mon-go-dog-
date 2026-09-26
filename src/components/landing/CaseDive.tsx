"use client";

/* ════════════════════════════════════════════════════════════════════
   One request, followed to the end: a dive from the city into one street.

   The section holds still while it scrolls. It opens on the city as the
   hero draws it, every record a point of light on the night streets; then
   the camera flies down into the street a real request came from, and the
   request is told by its own dates: a day counter runs from the report to
   the close, each step is written in on its day, and the request's light
   changes with it (flame when reported and while a team is on it, blue
   with care, cream when closed).

   The condition, the locality, the days are the record's own, and the
   light sits in the request's cell, the finest place the public record
   gives. Under reduced motion the section does not hold: it opens on the
   street with every step written in.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MLMap, Marker, ExpressionSpecification } from "maplibre-gl";
import { NIGHT, groundStyle, underlay } from "@/components/map/basemap";
import { pointInCell } from "@/components/spatial/data";

type Journey = {
  condition: string; locality: string; ring: number[];
  reported: string; acted: string; actedAfter: number; closed: string; days: number;
  closure: string;
  care: { count: number; kinds: string[]; first: string | null };
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const when = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const DAY = 86_400_000;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const Z_STREET = 15.6;

export function CaseDive({ j, city, box, rings, events, note }: {
  j: Journey; city: string; box: [number, number, number, number]; rings: number[][];
  /** Flat [cellIndex, day, kind], as the hero plate takes them. */
  events: number[]; note?: string;
}) {
  const steps = useMemo(() => {
    const start = Date.parse(j.reported);
    const day = (iso: string) => Math.max(0, Math.round((Date.parse(iso) - start) / DAY));
    return [
      { key: "r", day: 0, at: j.reported, what: "Reported", detail: `${j.condition}, ${j.locality}` },
      { key: "a", day: day(j.acted), at: j.acted, what: "Field team on site", detail: j.actedAfter === 0 ? "The same day as the report" : `${plural(j.actedAfter, "day")} after the report` },
      ...(j.care.count && j.care.first ? [{ key: "c", day: day(j.care.first), at: j.care.first, what: "Care recorded", detail: `${j.care.kinds.map((k) => k.replace(/_/g, " ")).join(", ").replace(/^./, (c) => c.toUpperCase())} · ${j.care.count === 1 ? "1 entry" : `${j.care.count} entries`}` }] : []),
      { key: "e", day: j.days, at: j.closed, what: j.closure === "recovered" ? "Recovered, case closed" : "Closed after field work", detail: `${plural(j.days, "day")} from the first report` },
    ];
  }, [j]);
  const spans = useMemo(() => {
    const edge = [0];
    for (let k = 1; k < steps.length; k++) edge.push(edge[k - 1] + 1 + (3 * (steps[k].day - steps[k - 1].day)) / Math.max(1, j.days));
    return { edge, total: edge[edge.length - 1] };
  }, [steps, j.days]);

  /* The request's light: the centre of its cell. */
  const target = useMemo<[number, number]>(() => {
    let x = 0, y = 0; const n = j.ring.length / 2;
    for (let i = 0; i < j.ring.length; i += 2) { x += j.ring[i]; y += j.ring[i + 1]; }
    return [x / n, y / n];
  }, [j.ring]);

  const sec = useRef<HTMLElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const markEl = useRef<HTMLDivElement>(null);
  const [calm, setCalm] = useState(false);
  const [t, setT] = useState({ step: 0, day: 0, arrived: false });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setCalm(true); setT({ step: steps.length - 1, day: j.days, arrived: true }); }
    let map: MLMap | null = null, marker: Marker | null = null, dead = false, raf = 0;
    let from: { center: [number, number]; zoom: number } | null = null;
    const padOf = () => {
      const w = mapEl.current?.clientWidth ?? 1000, h = mapEl.current?.clientHeight ?? 800;
      return w < 760 ? { top: 20, bottom: Math.round(h * 0.46), left: 12, right: 12 } : { top: 40, bottom: 40, left: Math.min(560, w * 0.42), right: 40 };
    };

    const frame = () => {
      raf = 0;
      const s = sec.current; if (!s) return;
      const r = s.getBoundingClientRect(), vh = window.innerHeight;
      const prog = reduce ? 1 : clamp(-r.top / Math.max(1, r.height - vh));
      const z = reduce ? 1 : ease(clamp(prog / 0.34));
      if (map && from) {
        const zoom = from.zoom + (Z_STREET - from.zoom) * z;
        const center: [number, number] = [from.center[0] + (target[0] - from.center[0]) * z, from.center[1] + (target[1] - from.center[1]) * z];
        map.jumpTo({ center, zoom, padding: padOf() });
      }
      const tl = reduce ? 1 : clamp((prog - 0.38) / 0.54);
      const pos = tl * spans.total;
      let i = 0;
      while (i < steps.length - 2 && pos > spans.edge[i + 1]) i++;
      const f = clamp((pos - spans.edge[i]) / Math.max(1e-6, spans.edge[i + 1] - spans.edge[i]));
      const day = tl >= 1 ? steps[steps.length - 1].day : Math.round(steps[i].day + (steps[i + 1].day - steps[i].day) * f);
      const step = tl >= 1 ? steps.length - 1 : f > 0.98 ? i + 1 : i;
      const arrived = z > 0.92;
      setT((o) => (o.step === step && o.day === day && o.arrived === arrived ? o : { step, day, arrived }));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(frame); };

    import("maplibre-gl").then((ml) => {
      if (dead || !mapEl.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new ml.Map({
        container: mapEl.current, style: groundStyle(NIGHT), bounds: box, interactive: false, fadeDuration: 0,
        attributionControl: { compact: true, customAttribution: "© OpenStreetMap contributors · OpenFreeMap" },
      });
      map.on("load", () => {
        const m = map!;
        m.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        const cam = m.cameraForBounds(box, { padding: padOf() });
        const c = cam?.center ? (Array.isArray(cam.center) ? cam.center : [(cam.center as { lng: number }).lng, (cam.center as { lat: number }).lat]) : [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
        from = { center: c as [number, number], zoom: cam?.zoom ?? 11 };
        // Every record in the city, a point of light in its cell, as the hero draws them.
        const ringPts = rings.map((rr) => { const ring: [number, number][] = []; for (let k = 0; k < rr.length; k += 2) ring.push([rr[k], rr[k + 1]]); return ring; });
        const n = events.length / 3;
        const lights = Array.from({ length: n }, (_, i) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: pointInCell(ringPts[events[i * 3]], i + 7) } }));
        m.addSource("lights", { type: "geojson", data: { type: "FeatureCollection", features: lights } });
        const Z = (a: number, b: number) => ["interpolate", ["linear"], ["zoom"], 11, a, 16, b] as ExpressionSpecification;
        m.addLayer({ id: "halo", type: "circle", source: "lights", paint: { "circle-radius": Z(4.5, 12), "circle-blur": 1, "circle-color": "#4f7fe0", "circle-opacity": 0.2 } });
        m.addLayer({ id: "lights", type: "circle", source: "lights", paint: { "circle-radius": Z(1.3, 3.2), "circle-color": "#dbe6ff", "circle-opacity": 0.8 } });
        underlay(m, NIGHT, "halo").catch(() => {});
        if (markEl.current) marker = new ml.Marker({ element: markEl.current, anchor: "center" }).setLngLat(target).addTo(m);
        frame();
      });
    });
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { dead = true; window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); marker?.remove(); map?.remove(); };
  }, [box, rings, events, target, steps, spans, j.days]);

  const state = steps[t.step]?.key ?? "r";

  return (
    <section ref={sec} className={`ld-dive ${calm ? "is-calm" : ""}`} aria-labelledby="ld-dive-title">
      <div className="ld-dive-stage">
        <div ref={mapEl} className="ld-dive-map" role="img" aria-label={`${city} at night, closing in on ${j.locality}, where the request came from`} />
        <div ref={markEl} className={`ld-dive-mark is-${state} ${t.arrived ? "is-here" : ""}`} aria-hidden="true"><i /><i /><b /></div>

        <div className="ld-dive-panel">
          <p className="ld-dive-kicker sys-mono">A real request · {j.locality}, {city}</p>
          <h2 id="ld-dive-title">One request, <em>followed to the&nbsp;end.</em></h2>
          <p className="ld-dive-day" aria-hidden="true"><span>Day</span> <b>{t.day}</b></p>
          <ol className="ld-dive-steps" aria-label={`The request, from report to close, over ${plural(j.days, "day")}`}>
            {steps.map((s, i) => (
              <li key={s.key} className={i < t.step ? "is-past" : i === t.step ? "is-now" : ""}>
                <i aria-hidden />
                <span className="ld-dive-what"><b>{s.what}</b><time className="sys-mono" dateTime={s.at}>{when(s.at)} · day {s.day}</time></span>
                <span className="ld-dive-detail">{s.detail}</span>
              </li>
            ))}
          </ol>
          {note && <p className="ld-dive-note">{note}</p>}
        </div>
      </div>
    </section>
  );
}
