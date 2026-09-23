"use client";

/* The operations plate. The queue is not a list beside a map: each open
   case is joined to its locality by a leader line, the way an atlas
   annotates a place. Hover a case and its line and place light up. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { LabMap, NIGHT } from "../LabMap";
import { contours, type Box } from "../geo";

export type OpsItem = { id: string; title: string; zone: string; days: number; status: string; lng: number | null; lat: number | null };

export function OpsPlate({ items, recent, box }: { items: OpsItem[]; recent: [number, number][]; box: Box }) {
  const mapRef = useRef<MLMap | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const [lines, setLines] = useState<{ id: string; d: string; x: number; y: number }[]>([]);
  const [on, setOn] = useState<string | null>(null);

  const measure = useCallback(() => {
    const map = mapRef.current, w = wrap.current, l = list.current;
    if (!map || !w || !l) return;
    const W = w.getBoundingClientRect();
    const out: { id: string; d: string; x: number; y: number }[] = [];
    l.querySelectorAll<HTMLLIElement>("li[data-id]").forEach((li) => {
      const it = items.find((i) => i.id === li.dataset.id);
      if (!it || it.lng == null || it.lat == null) return;
      const r = li.getBoundingClientRect();
      if (r.bottom < W.top + 60 || r.top > W.bottom - 10) return;
      const p = map.project([it.lng, it.lat]);
      const x0 = r.left - W.left - 22, y0 = r.top - W.top + r.height / 2;
      const elbow = x0 - 40;
      out.push({ id: it.id, x: p.x, y: p.y, d: `M${x0} ${y0} H${elbow} L${p.x + 8} ${p.y}` });
    });
    setLines(out);
  }, [items]);

  const onLoad = useCallback((map: MLMap) => {
    mapRef.current = map;
    const fit = () => {
      const w = map.getContainer().clientWidth;
      const pad = w > 1100 ? { top: 110, bottom: 50, left: 520, right: 470 } : w > 760 ? { top: 330, bottom: 40, left: 40, right: 340 } : { top: 24, bottom: 24, left: 18, right: 18 };
      map.fitBounds([76.87, 10.9, 77.06, 11.1], { padding: pad, animate: false });
    };
    fit();
    map.on("resize", fit);
    map.addSource("ct", { type: "geojson", data: contours(recent, box, { res: 0.0035, sigma: 2.6, levels: 9 }) });
    map.addLayer({ id: "ct", type: "line", source: "ct", paint: { "line-color": "#efe7da", "line-width": ["case", ["get", "index"], 1.1, 0.55], "line-opacity": ["interpolate", ["linear"], ["/", ["get", "l"], ["get", "of"]], 0, 0.1, 1, 0.5] } });
    map.addSource("q", { type: "geojson", data: { type: "FeatureCollection", features: items.filter((i) => i.lng != null).map((i) => ({ type: "Feature", properties: { id: i.id }, geometry: { type: "Point", coordinates: [i.lng!, i.lat!] } })) } });
    map.addLayer({ id: "q", type: "circle", source: "q", paint: { "circle-radius": 4.5, "circle-color": "#f05b40", "circle-stroke-color": "#07142b", "circle-stroke-width": 1.4 } });
    map.once("idle", measure);
    const tm = [300, 900, 2000].map((t) => window.setTimeout(measure, t));
    map.on("resize", measure);
    return () => tm.forEach(clearTimeout);
  }, [items, recent, box, measure]);

  useEffect(() => {
    const l = list.current;
    if (!l) return;
    l.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => { l.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); };
  }, [measure]);

  return (
    <div ref={wrap} className="la-ops-body">
      <div className="la-ops-map"><LabMap palette={NIGHT} bounds={box} interactive={false} padding={{ top: 110, bottom: 50, left: 520, right: 470 }} onLoad={onLoad} /></div>
      <svg className="la-leaders" aria-hidden>
        {lines.map((ln) => (
          <g key={ln.id} opacity={on ? (on === ln.id ? 1 : 0.12) : 0.34}>
            <path d={ln.d} fill="none" stroke="#efe7da" strokeWidth={on === ln.id ? 1.3 : 0.7} />
            <circle cx={ln.x} cy={ln.y} r={on === ln.id ? 11 : 0} fill="none" stroke="#f05b40" strokeWidth={1.2} />
          </g>
        ))}
      </svg>
      <div className="la-queue">
        <span className="cap"><span>Open now · newest first</span><span>days open</span></span>
        <ol ref={list} style={{ maxHeight: "100%", overflow: "visible" }}>
          {items.map((it) => (
            <li key={it.id} data-id={it.id} className={`${it.status === "unverified" ? "hot" : ""}${on === it.id ? " on" : ""}`} onMouseEnter={() => setOn(it.id)} onMouseLeave={() => setOn(null)}>
              <b>{it.title}</b>
              <span className="z">{it.zone || "Locality not recorded"}{it.lng == null ? " · not on the plate" : ""}</span>
              <small>{it.days}<br />{it.status === "unverified" ? "to verify" : "in progress"}</small>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
