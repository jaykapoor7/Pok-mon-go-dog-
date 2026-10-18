"use client";

/* ════════════════════════════════════════════════════════════════════
   Bindu: the dot. One particle system, two directions.

   Hero: the dots assemble into a Gond street dog that breathes and gives
   way under the pointer (each dot is a damped spring). Scrolling sends
   every dot along its own Bézier arc into India, where each one is a
   real recorded area, sized by the animals on it; the rest trace the
   coastline and borders. The camera then falls into one area of the
   sample city, and that dot opens, as a circle, into the next scene.

   Finale: the same map gathers back into the dog.

   Canvas 2D, drawn in colour batches (one path per colour per frame),
   sleeping off screen, capped at 2× pixels, sparser on phones and small
   machines. Under reduced motion it draws one still frame.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import { INDIA_PATH, INDIA_VIEW, indiaXY } from "@/sp/atlas/india-path";
import { useStage, span, ease } from "./stage";
import { paintDog, FOLK } from "./dog";

export type Cell = [number, number, number];
export type CityPin = { city: string; lng: number; lat: number; animals: number };

type Part = {
  dx: number; dy: number; tx: number; ty: number; rd: number; rt: number; cd: string; ct: string; dash: boolean; ang: number;
  delay: number; arc: number; ph: number; ox: number; oy: number; vx: number; vy: number; sx: number; sy: number; focus: boolean; cell: boolean;
};

/* The coastline and borders as evenly spaced points, in map units. */
function outlinePoints(count: number): [number, number][] {
  const nums = INDIA_PATH.match(/-?\d+(\.\d+)?/g)!.map(Number), pts: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  const seg = pts.map((p, i) => Math.hypot(pts[(i + 1) % pts.length][0] - p[0], pts[(i + 1) % pts.length][1] - p[1]));
  const total = seg.reduce((a, b) => a + b, 0), out: [number, number][] = [];
  for (let k = 0, i = 0, acc = 0; k < count; k++) {
    const want = (k / count) * total;
    while (i < seg.length - 1 && acc + seg[i] < want) acc += seg[i++];
    const t = seg[i] ? (want - acc) / seg[i] : 0, a = pts[i], b = pts[(i + 1) % pts.length];
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export function Bindu({ cells, cities, focusAt, mode }: { cells: Cell[]; cities: CityPin[]; focusAt: [number, number] | null; mode: "hero" | "finale" }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const { p, listen } = useStage();

  useEffect(() => {
    const canvas = cv.current, host = canvas?.parentElement; if (!canvas || !host) return;
    const g = canvas.getContext("2d"); if (!g) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    let W = 0, H = 0, dpr = 1, parts: Part[] = [], font = "sans-serif";
    let dogBox = { cx: 0, cy: 0, s: 1 }, map = { ox: 0, oy: 0, k: 1 };
    const mouse = { x: -9999, y: -9999 };
    const t0 = performance.now();
    /* scroll velocity, smoothed: a fast scroll shakes the painting a little, as a breeze would */
    let lastY = window.scrollY, vel = 0;

    const build = () => {
      const r = host.getBoundingClientRect(); W = r.width; H = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      font = getComputedStyle(canvas).fontFamily || "sans-serif";
      const phone = W < 760, weak = (navigator.hardwareConcurrency || 8) <= 4;
      /* Where the dog sits and where India sits, for this screen. */
      if (mode === "hero") dogBox = phone ? { cx: W * 0.5, cy: H * 0.72, s: Math.min(W * 0.98, H * 0.5) } : { cx: W * 0.69, cy: H * 0.5, s: Math.min(H * 1.02, W * 0.5) };
      else dogBox = phone ? { cx: W * 0.5, cy: H * 0.26, s: Math.min(W * 0.8, H * 0.38) } : { cx: W * 0.7, cy: H * 0.5, s: Math.min(H * 0.98, W * 0.48) };
      const mh = phone ? Math.min(H * 0.6, W * 0.98 * (INDIA_VIEW.h / INDIA_VIEW.w)) : H * 0.84, mw = mh * (INDIA_VIEW.w / INDIA_VIEW.h);
      const mcx = phone ? W * 0.5 : W * 0.62, mcy = phone ? H * 0.54 : H * 0.53;
      map = { ox: mcx - mw / 2, oy: mcy - mh / 2, k: mw / INDIA_VIEW.w };

      const marks = paintDog(phone ? 1.9 : weak ? 1.6 : 1.3);
      const N = marks.length, C = Math.min(cells.length, Math.floor(N * 0.6));
      /* If a screen ever has fewer dots than areas, the areas with the most animals are drawn first. */
      const kept = [...cells].sort((a, b) => b[2] - a[2]).slice(0, C);
      const top = Math.sqrt(Math.max(1, ...kept.map((c) => c[2])));
      /* The area we fall into: the fullest one near the sample city's centre. */
      let focus = -1;
      if (focusAt) kept.forEach((c, i) => { if (Math.hypot(c[0] - focusAt[0], c[1] - focusAt[1]) < 0.3 && (focus < 0 || c[2] > kept[focus][2])) focus = i; });
      type T = { x: number; y: number; r: number; c: string; cell: boolean; focus: boolean };
      const targets: T[] = kept.map(([lng, lat, n], i) => {
        const [x, y] = indiaXY(lng, lat);
        return { x, y, r: (phone ? 1.5 : 1.9) + (Math.sqrt(n) / top) * (phone ? 3.4 : 5), c: i === focus ? "#ff6b4f" : "#ffb199", cell: true, focus: i === focus };
      });
      for (const [x, y] of outlinePoints(N - C)) targets.push({ x, y, r: phone ? 0.8 : 0.95, c: "rgba(243,237,228,0.55)", cell: false, focus: false });
      /* Order both sets the same way, so the head goes north and the paws go south: the flow keeps its shape. */
      const key = (x: number, y: number) => y + x * 0.18;
      const ms = [...marks].sort((a, b) => key(a.x, a.y) - key(b.x, b.y));
      const ts = [...targets].sort((a, b) => key(a.x, a.y * (100 / INDIA_VIEW.h)) - key(b.x, b.y * (100 / INDIA_VIEW.h)));
      const dotR = phone ? 1.25 : 1.45;
      parts = ms.map((m, i) => {
        const t = ts[i];
        return {
          dx: m.x, dy: m.y, tx: t.x, ty: t.y, rd: m.rim ? dotR * 0.9 : m.eye ? dotR * 1.7 : dotR, rt: t.r, cd: FOLK[m.eye ? 0 : m.band % FOLK.length], ct: t.c,
          dash: m.dash, ang: m.ang, delay: (i / N) * 0.28 + hash(i) * 0.07, arc: (hash(i + 7) - 0.5) * 0.9, ph: hash(i + 3) * Math.PI * 2,
          ox: 0, oy: 0, vx: 0, vy: 0, sx: hash(i + 11) * W, sy: hash(i + 13) * H, focus: t.focus, cell: t.cell,
        };
      });
    };

    const top6 = [...cities].sort((a, b) => b.animals - a.animals).slice(0, 6);
    let lastDoor = "";
    const draw = (now: number) => {
      const P = p.current, t = now - t0;
      const y = window.scrollY; vel = vel * 0.86 + Math.min(80, Math.abs(y - lastY)) * 0.14; lastY = y;
      const shake = still ? 0 : Math.min(5, vel * 0.09);
      const intro = still ? 1 : ease.out(Math.min(1, t / 1900));
      const m = mode === "hero" ? ease.inOut(span(P, 0.1, 0.44)) : 1 - ease.inOut(span(P, 0.12, 0.62));
      const z = mode === "hero" ? ease.inOut(span(P, 0.6, 0.86)) : 0;
      const door = mode === "hero" ? ease.in(span(P, 0.84, 1)) : 0;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);

      const ds = dogBox.s / 100, dx0 = dogBox.cx - dogBox.s / 2, dy0 = dogBox.cy - dogBox.s / 2;
      const fpart = parts.find((q) => q.focus);
      const fx0 = fpart ? map.ox + fpart.tx * map.k : W / 2, fy0 = fpart ? map.oy + fpart.ty * map.k : H / 2;
      const Z = 1 + z * 13, ax = fx0 + (W / 2 - fx0) * z, ay = fy0 + (H * 0.5 - fy0) * z;
      const buckets = new Map<string, number[]>(), lines = new Map<string, number[]>(), glow: number[] = [];

      for (let i = 0; i < parts.length; i++) {
        const q = parts[i];
        const e = ease.inOut(Math.max(0, Math.min(1, (m - q.delay) / 0.65)));
        /* dog position, breathing */
        const br = still ? 0 : Math.sin(t * 0.0015 + q.dx * 0.07) * 0.32;
        let x1 = dx0 + q.dx * ds + Math.sin(t * 0.02 + q.ph) * shake, y1 = dy0 + (q.dy + br) * ds + Math.cos(t * 0.017 + q.ph) * shake;
        if (intro < 1) { const k = ease.out(Math.max(0, Math.min(1, intro * 1.25 - hash(i + 5) * 0.25))); x1 = q.sx + (x1 - q.sx) * k; y1 = q.sy + (y1 - q.sy) * k; }
        /* map position, through the camera */
        let x2 = map.ox + q.tx * map.k, y2 = map.oy + q.ty * map.k;
        if (z > 0) { x2 = (x2 - fx0) * Z + ax; y2 = (y2 - fy0) * Z + ay; }
        /* the arc between: a quadratic Bézier bent sideways by this dot's own amount */
        const mx = (x1 + x2) / 2 - (y2 - y1) * q.arc, my = (y1 + y2) / 2 + (x2 - x1) * q.arc, u = 1 - e;
        let x = u * u * x1 + 2 * u * e * mx + e * e * x2, y = u * u * y1 + 2 * u * e * my + e * e * y2;
        /* the pointer: a damped spring per dot */
        if (fine && !still) {
          const ddx = x - mouse.x, ddy = y - mouse.y, d2 = ddx * ddx + ddy * ddy, R = 110;
          if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (1 - d / R) ** 2 * 2.6; q.vx += (ddx / d) * f; q.vy += (ddy / d) * f; }
          q.vx += -q.ox * 0.06; q.vy += -q.oy * 0.06; q.vx *= 0.86; q.vy *= 0.86; q.ox += q.vx; q.oy += q.vy;
          x += q.ox; y += q.oy;
        }
        if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
        let r = q.rd + (q.rt - q.rd) * e;
        if (q.focus) r *= 1 + z * 4;
        const col = e < 0.5 ? q.cd : q.ct;
        if (q.dash && e < 0.4) {
          const L = (1 - e / 0.4) * ds * 0.62 + r * 0.4, c = Math.cos(q.ang) * L, s = Math.sin(q.ang) * L;
          let a = lines.get(col); if (!a) lines.set(col, (a = [])); a.push(x - c, y - s, x + c, y + s);
        } else {
          let a = buckets.get(col); if (!a) buckets.set(col, (a = [])); a.push(x, y, r);
        }
        if (q.cell && e > 0.6) glow.push(x, y, r * (q.focus ? 3.2 : 2.6));
      }

      g.globalCompositeOperation = "lighter";
      if (glow.length) {
        g.fillStyle = `rgba(240,91,64,${0.16 * (mode === "hero" ? 1 - door : 1)})`; g.beginPath();
        for (let i = 0; i < glow.length; i += 3) { g.moveTo(glow[i] + glow[i + 2], glow[i + 1]); g.arc(glow[i], glow[i + 1], glow[i + 2], 0, Math.PI * 2); }
        g.fill();
      }
      g.globalCompositeOperation = "source-over";
      for (const [col, a] of buckets) {
        g.fillStyle = col; g.beginPath();
        for (let i = 0; i < a.length; i += 3) { g.moveTo(a[i] + a[i + 2], a[i + 1]); g.arc(a[i], a[i + 1], a[i + 2], 0, Math.PI * 2); }
        g.fill();
      }
      g.lineCap = "round"; g.lineWidth = Math.max(1.4, ds * 0.5);
      for (const [col, a] of lines) {
        g.strokeStyle = col; g.beginPath();
        for (let i = 0; i < a.length; i += 4) { g.moveTo(a[i], a[i + 1]); g.lineTo(a[i + 2], a[i + 3]); }
        g.stroke();
      }
      /* the six largest registers name themselves once India has formed */
      const la = span(m, 0.85, 1) * (1 - z * 2.2);
      if (la > 0) {
        g.font = `600 ${W < 760 ? 11 : 12.5}px ${font}`; g.fillStyle = `rgba(243,237,228,${0.82 * la})`; g.textBaseline = "middle";
        /* a name is left out when it would sit on one already written */
        const placed: [number, number][] = [];
        for (const c of top6) {
          const [x, y] = indiaXY(c.lng, c.lat), px = map.ox + x * map.k + 10, py = map.oy + y * map.k;
          if (placed.some(([a, b]) => Math.abs(a - px) < 90 && Math.abs(b - py) < 18)) continue;
          placed.push([px, py]); g.fillText(c.city, px, py);
        }
      }
      /* the door: the focused dot, opening into the next scene */
      if (mode === "hero") {
        const fx = fpart ? ((map.ox + fpart.tx * map.k) - fx0) * Z + ax : W / 2, fy = fpart ? ((map.oy + fpart.ty * map.k) - fy0) * Z + ay : H / 2;
        const v = `${fx.toFixed(1)}|${fy.toFixed(1)}|${(door * Math.hypot(W, H) * 1.05).toFixed(1)}`;
        if (v !== lastDoor) { lastDoor = v; const [a, b, c] = v.split("|"); host.style.setProperty("--fx", `${a}px`); host.style.setProperty("--fy", `${b}px`); host.style.setProperty("--rr", `${c}px`); }
      }
    };

    build();
    /* Still: one frame, drawn after the stage has set its resting progress (the parent's effect runs after this one). */
    if (still) { const f = requestAnimationFrame(() => draw(performance.now())); const re = () => { build(); draw(performance.now()); }; window.addEventListener("resize", re); return () => { cancelAnimationFrame(f); window.removeEventListener("resize", re); }; }

    let raf = 0, on = true;
    const loop = (now: number) => { raf = 0; if (on) { draw(now); raf = requestAnimationFrame(loop); } };
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(loop); });
    io.observe(canvas);
    const move = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const leave = () => { mouse.x = mouse.y = -9999; };
    let rt = 0;
    const resize = () => { clearTimeout(rt); rt = window.setTimeout(build, 120); };
    if (fine) { window.addEventListener("pointermove", move, { passive: true }); document.addEventListener("pointerleave", leave); }
    window.addEventListener("resize", resize);
    const off = listen(() => { if (on && !raf) raf = requestAnimationFrame(loop); });
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); io.disconnect(); off(); clearTimeout(rt); window.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); window.removeEventListener("resize", resize); };
  }, [cells, cities, focusAt, mode, p, listen]);

  return <canvas ref={cv} className="bd-canvas" aria-hidden />;
}
