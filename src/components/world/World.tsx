"use client";

/* ════════════════════════════════════════════════════════════════════
   The Living World.

   It opens on a real painting: a tree-of-life palampore, painted and
   dyed on the Coromandel Coast in the early 1700s (The Met, CC0). Scroll,
   and the camera pushes into the cloth while an organic opening spreads
   from its centre, revealing what lies beneath it: the live map of
   Ganapathy, Coimbatore, its real streets. Dogs from an 18th-century
   Rajasthani painting and a 19th-century dog portrait (Cleveland Museum
   of Art, CC0) step onto the map exactly where areas are on StrayPaw's
   public record, then settle into those areas' record marks, and the
   camera rises from the street to the city to India.

   The paintings are shown as works and credited; the dogs stand for
   areas on the record and are never likenesses. Reduced motion: the
   painting, still.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { GLYPHS, supportsWebGL2 } from "@/components/map/basemap";
import { groundStyle, drawGround, collapseAttribution } from "@/sp/map/ground";
import { useStage, span, ease } from "@/components/bindu/stage";
import { areasGeo, camBetween, fromCentres, type Cam, type Cell } from "@/components/bindu/mapkit";
import { addFolkRecord, folkVis, areasAt, washAt } from "./folk";
import { WORK_IMAGES, FOLK_CUTOUTS } from "@/lib/art/sources";

type Pt = [number, number];
/** An area on the record near the place: its centre, name, open requests, and n (its animals, normalised as the map draws it). */
export type WorldArea = { name: string; c: Pt; open: number; crit: number; n: number };

const DOGS = [FOLK_CUTOUTS.dogStanding, FOLK_CUTOUTS.dogSitting];
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

export function World({ areas, cells, centre, sampleAt }: { areas: WorldArea[]; cells: Cell[]; centre: Pt; sampleAt: Pt | null }) {
  const { p, listen, still } = useStage();
  const wrap = useRef<HTMLDivElement>(null), mapEl = useRef<HTMLDivElement>(null), art = useRef<HTMLDivElement>(null), dogsEl = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  /* the dogs: one per area on the record within reach of the place, nearest first */
  const k = Math.cos((centre[1] * Math.PI) / 180);
  const near = areas
    .map((a) => ({ ...a, d: Math.hypot((a.c[0] - centre[0]) * k, a.c[1] - centre[1]) }))
    .filter((a) => a.d < 0.03).sort((a, b) => a.d - b.d).slice(0, 14);

  useEffect(() => {
    const w = wrap.current, me = mapEl.current, a = art.current, dg = dogsEl.current; if (!w || !me || !a || !dg) return;
    let alive = true, raf = 0, map: MLMap | null = null, lastView = "", lastClip = "";
    const memo: Record<string, string> = {}, css: Record<string, string> = {};
    const setVar = (k: string, v: string) => { if (css[k] !== v) { css[k] = v; a.style.setProperty(k, v); } };
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
    const phone = () => w.clientWidth < 760;
    const dogs = Array.from(dg.querySelectorAll<HTMLElement>(".wd-dog"));

    const K = (): [number, Cam][] => {
      const z0 = phone() ? 14.6 : 15.3, cityC: Pt = sampleAt ?? centre;
      return [
        [0, { c: centre, z: z0, pitch: 0, bearing: 0 }],
        [0.5, { c: centre, z: z0 - 0.4, pitch: 0, bearing: 0 }],
        [0.72, { c: cityC, z: phone() ? 11.2 : 11.8, pitch: 0, bearing: 0 }],
        [0.95, { c: [80.6, 22.2], z: phone() ? 3.4 : 4.25, pitch: 0, bearing: 0 }],
        [1, { c: [80.6, 22.2], z: phone() ? 3.4 : 4.25, pitch: 0, bearing: 0 }],
      ];
    };

    const frame = (now: number) => {
      raf = 0; if (!alive) return;
      const P = still ? 0 : p.current, W = w.clientWidth, H = w.clientHeight;
      /* the camera pushes into the cloth; the opening spreads from its centre */
      const push = ease.inOut(span(P, 0.02, 0.36)), open = ease.inOut(span(P, 0.06, 0.34));
      ptr.x += (ptr.tx - ptr.x) * 0.08; ptr.y += (ptr.ty - ptr.y) * 0.08;
      setVar("--push", (1 + push * 0.55).toFixed(4));
      setVar("--lx", `${(ptr.x * 14 * (1 - open)).toFixed(1)}px`); setVar("--ly", `${(ptr.y * 10 * (1 - open)).toFixed(1)}px`);
      const cx = W * (phone() ? 0.5 : 0.62), cy = H * (phone() ? 0.66 : 0.52), R = open * Math.hypot(W, H) * 0.8, t = now / 1000;
      let clip = "none";
      if (open >= 0.999) clip = "polygon(0 0, 0 0, 0 0)";
      else if (open > 0.001) {
        const pts: string[] = [];
        for (let j = 0; j < 48; j++) {
          const th = (j / 48) * Math.PI * 2, rr = R * (1 + 0.08 * Math.sin(3 * th + t * 0.8) + 0.05 * Math.sin(5 * th - t * 1.1) + 0.03 * Math.sin(9 * th + t * 1.7));
          pts.push(`${(cx + Math.cos(th) * rr).toFixed(1)}px ${(cy + Math.sin(th) * rr).toFixed(1)}px`);
        }
        clip = `polygon(evenodd, 0 0, ${W}px 0, ${W}px ${H}px, 0 ${H}px, 0 0, ${pts.join(", ")}, ${pts[0]})`;
      }
      if (clip !== lastClip) { lastClip = clip; a.style.clipPath = clip; }
      /* the map, beneath the cloth the whole time */
      if (map) {
        const ks = K(); let i = 0; while (i < ks.length - 2 && P > ks[i + 1][0]) i++;
        const cam = camBetween(ks[i][1], ks[i + 1][1], ease.inOut(span(P, ks[i][0], ks[i + 1][0])));
        const key = `${cam.c[0].toFixed(6)},${cam.c[1].toFixed(6)},${cam.z.toFixed(4)},${W},${H}`;
        if (key !== lastView) { lastView = key; map.jumpTo({ center: cam.c, zoom: cam.z, pitch: 0, bearing: 0 }); }
        const settle = span(P, 0.34, 0.46);
        folkVis(map, "world", areasAt(cam.z) * settle, settle, 1, memo, washAt(cam.z));
        /* the dogs step onto their areas as the opening reaches them, then settle into the marks */
        const leave = ease.in(span(P, 0.34, 0.44));
        dogs.forEach((el, j) => {
          const ar = near[j]; if (!ar) return;
          const q = map!.project(ar.c), dd = Math.hypot(q.x - cx, q.y - cy);
          const kk = Math.max(0, Math.min(1, (R - dd) / 90)) * (1 - leave);
          el.style.transform = `translate(${q.x.toFixed(1)}px, ${q.y.toFixed(1)}px) translate(-50%, -88%) scale(${(0.2 + 0.8 * ease.out(kk)).toFixed(3)})`;
          el.style.opacity = Math.min(1, kk * 1.6).toFixed(3);
        });
      }
      const moving = Math.abs(ptr.tx - ptr.x) + Math.abs(ptr.ty - ptr.y) > 0.002 || (open > 0.001 && open < 0.999);
      if (alive && moving && !still) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && alive) raf = requestAnimationFrame(frame); };

    (async () => {
      if (!supportsWebGL2()) return;
      const ml = await import("maplibre-gl");
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      if (!alive) return;
      const mm = new ml.Map({ container: me, style: { ...groundStyle(), glyphs: GLYPHS }, center: centre, zoom: 15, interactive: false, attributionControl: { compact: true }, fadeDuration: 0, pixelRatio: Math.min(phone() ? 1.5 : 2, window.devicePixelRatio || 1) });
      map = mm;
      mm.on("load", () => {
        addFolkRecord(mm, areasGeo(fromCentres(cells)), "world");
        drawGround(mm, "world-area").catch(() => false).then(() => { collapseAttribution(mm); lastView = ""; setReady(true); kick(); });
        kick();
      });
    })();
    kick();
    const ro = new ResizeObserver(() => { map?.resize(); lastView = ""; kick(); }); ro.observe(w);
    const off = listen(kick);
    const move = (ev: PointerEvent) => { ptr.tx = ev.clientX / innerWidth - 0.5; ptr.ty = ev.clientY / innerHeight - 0.5; kick(); };
    if (!still && window.matchMedia("(pointer: fine)").matches) window.addEventListener("pointermove", move, { passive: true });
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); off(); window.removeEventListener("pointermove", move); map?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas, cells, p, listen, still, sampleAt, centre[0], centre[1]]);

  const tree = WORK_IMAGES.palamporeTree;
  return (
    <div className={`wd${ready ? " is-ready" : ""}`} ref={wrap} aria-hidden>
      <div className="wd-map" ref={mapEl} />
      <div className="wd-dogs" ref={dogsEl}>
        {near.map((ar) => { const d = DOGS[hash(ar.name + ar.c[0]) % DOGS.length]; return <img key={`${ar.c[0]},${ar.c[1]}`} src={d.src} alt="" className="wd-dog" draggable={false} />; })}
      </div>
      <div className="wd-art" ref={art}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={tree.src} width={tree.w} height={tree.h} alt="" fetchPriority="high" decoding="async" />
      </div>
    </div>
  );
}
