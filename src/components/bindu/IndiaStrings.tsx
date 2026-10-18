"use client";

/* ════════════════════════════════════════════════════════════════════
   India, its cities, and real animals strung to them.

   The outline is the Map's own (atlas/india-path). Each city is a mark
   sized by the animals on its record; a few photographed animals hang off
   their cities on fine strings, each one a real public record that opens
   its profile. A city-level register is drawn hollow: it is a city, never
   a street. The strings draw in once; hover or focus lights one string and
   its city. Under reduced motion everything is simply drawn.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { INDIA_PATH, INDIA_VIEW, indiaXY } from "@/sp/atlas/india-path";

export type HomeCity = { city: string; lng: number; lat: number; animals: number; hollow: boolean };
export type HomeFace = { id: string; title: string; describe: string | null; photo: string; city: string; lng: number; lat: number };

type Placed = { f: HomeFace; x: number; y: number; cx: number; cy: number };

export function IndiaStrings({ cities, faces, tone, max = 6, onCity, selected, className = "", sky }: {
  cities: HomeCity[]; faces: HomeFace[]; tone: "night" | "paper"; max?: number;
  onCity?: (c: string) => void; selected?: string | null; className?: string;
  /** Every recorded area in India as [lng, lat, animals]: drawn as a sky of points, one per area, never finer. */
  sky?: [number, number, number][];
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* The sky: one glowing point per recorded area, sized by its animals, breathing slowly.
     It sleeps off screen and holds still under reduced motion. */
  useEffect(() => {
    const cv = canvas.current; if (!cv || !size || !sky?.length) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), { w, h } = size;
    cv.width = w * dpr; cv.height = h * dpr; cv.style.width = `${w}px`; cv.style.height = `${h}px`;
    const g = cv.getContext("2d"); if (!g) return;
    const mh = h * 0.92, mw = mh * (INDIA_VIEW.w / INDIA_VIEW.h), ox = (w - mw) / 2, oy = (h - mh) / 2;
    const top = Math.sqrt(Math.max(1, ...sky.map((d) => d[2])));
    const pts = sky.map(([lng, lat, n], i) => { const [x, y] = indiaXY(lng, lat); return { x: ox + (x / INDIA_VIEW.w) * mw, y: oy + (y / INDIA_VIEW.h) * mh, r: 1.4 + (Math.sqrt(n) / top) * 5, ph: (i * 2.399) % (Math.PI * 2) }; });
    const night = tone === "night";
    const draw = (t: number) => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      for (const p of pts) {
        const a = 0.55 + 0.45 * Math.sin(t / 1400 + p.ph);
        const glow = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        glow.addColorStop(0, night ? `rgba(255,170,130,${0.75 * a})` : `rgba(36,87,206,${0.35 * a})`); glow.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = glow; g.beginPath(); g.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); g.fill();
        g.fillStyle = night ? `rgba(255,236,220,${0.6 + 0.4 * a})` : `rgba(27,70,176,${0.6 + 0.4 * a})`; g.beginPath(); g.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2); g.fill();
      }
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { draw(0); return; }
    let raf = 0, on = true, last = 0;
    const loop = (t: number) => { if (on && t - last > 40) { last = t; draw(t); } raf = requestAnimationFrame(loop); };
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; }); io.observe(cv);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [size, sky, tone]);

  const maxA = Math.sqrt(Math.max(1, ...cities.map((c) => c.animals)));
  /* Only the largest registers are lettered; the rest name themselves on hover, so the south stays legible. */
  const named = useMemo(() => new Set([...cities].sort((a, b) => b.animals - a.animals).slice(0, 7).map((c) => c.city)), [cities]);
  /* The map sits in the middle of the box; cards hang in the margins either side, ordered by latitude so strings do not cross. */
  const placed = useMemo<Placed[]>(() => {
    if (!size) return [];
    const { w, h } = size;
    const mh = h * 0.92, mw = mh * (INDIA_VIEW.w / INDIA_VIEW.h), ox = (w - mw) / 2, oy = (h - mh) / 2;
    const toPx = (lng: number, lat: number) => { const [x, y] = indiaXY(lng, lat); return [ox + (x / INDIA_VIEW.w) * mw, oy + (y / INDIA_VIEW.h) * mh] as [number, number]; };
    const narrow = w < 640;
    const pick = faces.slice(0, narrow ? Math.min(3, max) : max);
    const withPx = pick.map((f) => ({ f, p: toPx(f.lng, f.lat) }));
    const left = withPx.filter((_, i) => !narrow && i % 2 === 0).sort((a, b) => a.p[1] - b.p[1]);
    const right = withPx.filter((_, i) => narrow || i % 2 === 1).sort((a, b) => a.p[1] - b.p[1]);
    const out: Placed[] = [];
    const col = (list: typeof withPx, x: number) => list.forEach((it, i) => out.push({ f: it.f, cx: it.p[0], cy: it.p[1], x, y: (h / (list.length + 1)) * (i + 1) }));
    if (narrow) right.forEach((it, i) => out.push({ f: it.f, cx: it.p[0], cy: it.p[1], x: (w / (right.length + 1)) * (i + 1), y: h - 8 }));
    else { col(left, Math.max(70, ox - 70)); col(right, Math.min(w - 70, ox + mw + 70)); }
    return out;
  }, [size, faces, max]);

  const geo = size ? (() => { const { w, h } = size; const mh = h * 0.92, mw = mh * (INDIA_VIEW.w / INDIA_VIEW.h); return { mw, mh, ox: (w - mw) / 2, oy: (h - mh) / 2 }; })() : null;

  return (
    <div ref={box} className={`ix is-${tone} ${className}`}>
      {geo && (
        <svg className="ix-map" width={size!.w} height={size!.h} aria-hidden>
          <defs>
            {/* A Gond-style weave of dots and dashes inside the land: texture, never data. */}
            <pattern id={`ix-weave-${tone}`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
              <circle cx="2" cy="2" r="0.9" className="ix-weave-dot" /><path d="M5 6.5h3" className="ix-weave-dash" />
            </pattern>
          </defs>
          <g transform={`translate(${geo.ox} ${geo.oy}) scale(${geo.mw / INDIA_VIEW.w} ${geo.mh / INDIA_VIEW.h})`}>
            <path d={INDIA_PATH} className="ix-land" vectorEffect="non-scaling-stroke" />
          </g>
          <path d={INDIA_PATH} transform={`translate(${geo.ox} ${geo.oy}) scale(${geo.mw / INDIA_VIEW.w} ${geo.mh / INDIA_VIEW.h})`} fill={`url(#ix-weave-${tone})`} className="ix-weave" />
          {placed.map((p, i) => {
            const d = `M${p.cx},${p.cy} C${(p.cx + p.x) / 2},${p.cy} ${(p.cx + p.x) / 2},${p.y} ${p.x},${p.y}`;
            return (
              <g key={p.f.id}>
                <path className={`ix-string${hot === p.f.id ? " is-hot" : ""}`} style={{ ["--i" as string]: i }} pathLength={1} d={d} />
                {/* A record travelling home: a point of light runs from the animal to its city. */}
                <circle r="2.6" className="ix-pulse"><animateMotion dur={`${2.8 + (i % 3) * 0.7}s`} begin={`${1.4 + i * 0.35}s`} repeatCount="indefinite" path={d} keyPoints="1;0" keyTimes="0;1" calcMode="linear" /></circle>
              </g>
            );
          })}
        </svg>
      )}
      {sky && <canvas ref={canvas} className="ix-sky" aria-hidden />}
      {geo && cities.map((c) => {
        const [x, y] = indiaXY(c.lng, c.lat);
        const px = geo.ox + (x / INDIA_VIEW.w) * geo.mw, py = geo.oy + (y / INDIA_VIEW.h) * geo.mh;
        const d = 8 + (Math.sqrt(c.animals) / maxA) * 26;
        const lit = selected === c.city || placed.some((p) => p.f.id === hot && p.f.city === c.city);
        const Tag = onCity ? "button" : "span";
        return (
          <Tag key={c.city} {...(onCity ? { type: "button" as const, onClick: () => onCity(c.city), "aria-pressed": selected === c.city } : { "aria-hidden": true })}
            className={`ix-city${c.hollow ? " is-hollow" : ""}${lit ? " is-lit" : ""}`} title={c.city} style={{ left: px, top: py, width: d, height: d }}
            aria-label={onCity ? `${c.city}: ${c.animals.toLocaleString("en-IN")} animals on the record${c.hollow ? ", a city-level register" : ""}` : undefined}>
            {(named.has(c.city) || lit) && <span className="ix-city-name">{c.city}</span>}
          </Tag>
        );
      })}
      {placed.map((p, i) => (
        <Link key={p.f.id} href={`/animal/${p.f.id}`} className="ix-card" style={{ left: p.x, top: p.y, ["--i" as string]: i }}
          onMouseEnter={() => setHot(p.f.id)} onMouseLeave={() => setHot(null)} onFocus={() => setHot(p.f.id)} onBlur={() => setHot(null)}
          aria-label={`${p.f.title}, ${p.f.describe ?? "an animal"} on the record in ${p.f.city}. Open the profile.`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.f.photo} alt="" loading="lazy" referrerPolicy="no-referrer" />
          <span><b>{p.f.title}</b><small>{p.f.city}</small></span>
        </Link>
      ))}
    </div>
  );
}
