"use client";

/* ════════════════════════════════════════════════════════════════════
   A painted street, as wide as the page: the banner every company page
   opens on. Composed from the same painter as the homepage (houses with
   painted parapets, coconut palms, Gond trees, a gopuram, street dogs,
   a cow, Warli people at their work) and laid out from a seed, so each
   page has its own street and keeps it. Tails wag and mynas wheel while
   it is on screen; under reduced motion it is a still painting.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import * as A from "./art";
import { rnd } from "./geo";

const VH = 300, GROUND = 228;
type Item = { x: number; draw: (c: CanvasRenderingContext2D, t: number) => void };

function compose(width: number, seed: number): Item[] {
  const items: Item[] = []; let x = 30, i = 0;
  while (x < width - 20) {
    const r = rnd(seed + i, 1), k = i++;
    if (r < 0.34) {
      const n = 2 + Math.floor(rnd(seed + k, 2) * 2);
      for (let j = 0; j < n; j++) { const hx = x + j * 34, s = 2.1 + rnd(seed + k, j + 3) * 0.8; items.push({ x: hx, draw: (c) => { c.save(); c.translate(hx, GROUND); A.house(c, seed * 31 + k * 7 + j, s); c.restore(); } }); }
      x += n * 34 + 20;
    } else if (r < 0.48) { const px = x; items.push({ x: px, draw: (c, t) => { c.save(); c.translate(px, GROUND); A.palm(c, seed + k, t, 2.1); c.restore(); } }); x += 40; }
    else if (r < 0.58) { const px = x + 10; items.push({ x: px, draw: (c, t) => { c.save(); c.translate(px, GROUND); A.tree(c, seed + k, t, 2); c.restore(); } }); x += 66; }
    else if (r < 0.64) { const px = x + 20; const kind = ["clinic", "school", "shop", "office"][Math.floor(rnd(seed + k, 5) * 4)]; items.push({ x: px, draw: (c) => { c.save(); c.translate(px, GROUND); A.landmark(c, kind, 2.4); c.restore(); } }); x += 80; }
    else if (r < 0.67) { const px = x + 30; items.push({ x: px, draw: (c) => { c.save(); c.translate(px, GROUND); A.temple(c, 1.6); c.restore(); } }); x += 70; }
    else if (r < 0.84) {
      const px = x + 30, pose = A.POSES[Math.floor(rnd(seed + k, 6) * 3)], coat = Math.floor(rnd(seed + k, 7) * A.COATS.length), flip = rnd(seed + k, 8) > 0.5, act = (["feed", "phone", "carry", "wave", "sit"] as A.Act[])[Math.floor(rnd(seed + k, 9) * 5)], withP = rnd(seed + k, 10) > 0.4;
      items.push({ x: px, draw: (c, t) => {
        if (withP) { c.save(); c.translate(px - 34, GROUND + 6); c.scale(2, 2); c.translate(-10, -34); A.person(c, act, t * 3 + k); c.restore(); }
        c.save(); c.translate(px + 8, GROUND + 10); c.scale(flip ? -1.15 : 1.15, 1.15); c.translate(-31, -39); A.dogTail(c, pose, t * (pose === "lie" ? 1.2 : 6) + k); A.dogBody(c, pose, A.COATS[coat], k); c.restore();
      } });
      x += withP ? 110 : 80;
    } else { const px = x + 40; items.push({ x: px, draw: (c, t) => { c.save(); c.translate(px, GROUND + 12); c.scale(1.2, 1.2); c.translate(-36, -49); A.cow(c, t, k); c.restore(); } }); x += 100; }
  }
  return items;
}

export function Band({ seed = 1, className = "" }: { seed?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    let raf = 0, alive = true, on = false, last = 0, items: Item[] = [], W = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches, t0 = performance.now();
    const paint = (t: number) => {
      const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
      const dpr = Math.min(w < 600 ? 1.75 : 2, window.devicePixelRatio || 1), s = h / VH, vw = w / s;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      if (Math.abs(vw - W) > 1) { W = vw; items = compose(vw, seed); }
      const x = c.getContext("2d")!; x.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
      A.paper(x, vw, VH, seed);
      /* the sky in Gond marks, and washes of pigment */
      x.save(); x.strokeStyle = ["#e8c98f", "#e9b8b8", "#bfd6b4", "#e7c3a0"][seed % 4]; x.globalAlpha = 0.5; x.lineWidth = 1; x.lineCap = "round";
      for (let y = 16, r = 0; y < GROUND - 30; y += 14, r++) for (let px = (r % 2) * 9; px < vw; px += 18) { x.beginPath(); x.moveTo(px - 2.5, y + 1.5); x.quadraticCurveTo(px, y - 2, px + 2.5, y + 1.5); x.stroke(); }
      x.restore();
      for (let i = 0; i < Math.ceil(vw / 140); i++) A.wash(x, i * 140 + rnd(seed, i) * 80, 60 + rnd(seed, i + 9) * 120, 90, [A.C.marigoldPale, A.C.rosePale, A.C.greenPale, A.C.saffronPale][(i + seed) % 4], 0.8);
      x.fillStyle = A.C.greenPale; x.strokeStyle = A.C.ink; x.lineWidth = 1.1;
      x.beginPath(); x.moveTo(0, GROUND); for (let px = 0; px <= vw + 60; px += 60) x.quadraticCurveTo(px + 30, GROUND - 46 - ((px / 60 + seed) % 3) * 14, px + 60, GROUND); x.lineTo(vw + 60, GROUND); x.closePath(); x.fill(); x.stroke();
      x.save(); x.translate(vw - 90 - (seed % 3) * 120, 62); A.sun(x, 24, t * 0.15); x.restore();
      A.ground(x, 0, vw, GROUND, VH - GROUND);
      x.fillStyle = A.C.marigold; x.fillRect(0, GROUND + 14, vw, 22);
      x.strokeStyle = A.C.ink; x.lineWidth = 1.3; for (const y of [GROUND + 14, GROUND + 17, GROUND + 33, GROUND + 36]) { x.beginPath(); x.moveTo(0, y); x.lineTo(vw, y); x.stroke(); }
      x.strokeStyle = A.C.coral; x.lineWidth = 1.5; x.setLineDash([6, 10]); x.beginPath(); x.moveTo(0, GROUND + 25); x.lineTo(vw, GROUND + 25); x.stroke(); x.setLineDash([]);
      for (const it of items) it.draw(x, t);
      for (let i = 0; i < 4; i++) { x.save(); x.translate((vw * (0.2 + i * 0.17) + t * 18 * (1 + i * 0.2)) % (vw + 40) - 20, 50 + i * 14 + Math.sin(t + i) * 6); x.scale(1.5, 1.5); A.bird(x, t * 8 + i); x.restore(); }
    };
    const loop = (now: number) => { raf = 0; if (!alive || !on) return; if (now - last > 55) { last = now; paint((now - t0) / 1000); } raf = requestAnimationFrame(loop); };
    paint(0);
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting && !reduce; if (on && !raf) raf = requestAnimationFrame(loop); });
    io.observe(c);
    const ro = new ResizeObserver(() => paint((performance.now() - t0) / 1000)); ro.observe(c);
    return () => { alive = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, [seed]);
  return <canvas ref={ref} className={className} aria-hidden />;
}
