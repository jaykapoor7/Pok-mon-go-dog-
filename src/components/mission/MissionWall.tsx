"use client";

/* ════════════════════════════════════════════════════════════════════
   Mission. A blue limewashed wall in an Indian street, at dusk, in StrayPaw colours.

   One button: CLICK TO SPRAY. The street lamp flickers on, a hand rattles
   a can, and a graffiti piece goes up the way a writer paints one: the
   fill first (light flame to flame), a can swap, the ink
   outline and 3D, then the white shine and sparkles. The camera leans
   in and follows the can, with real spray sounds, a jet of paint, mist
   and drips. Then the can leaves and the camera pulls back to the
   finished wall.

   Everything is drawn in code and sounds are synthesised; nothing on the
   wall is a real person, number or business. Under reduced motion the
   finished wall is shown, still.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Wall, type Size } from "./wall";
import { Sfx } from "./sound";
import { INK, alphaMap, layoutPiece, renderLayers, sweeps, type Pt } from "./piece";
import "./mission.css";

type Phase = "idle" | "play" | "done";
type Can = { color: string; label: string };
const CANS: Record<"fill" | "line" | "shine", Can> = {
  fill: { color: "#f05b40", label: "#fffdf9" },
  line: { color: "#0b1e3d", label: "#2457ce" },
  shine: { color: "#fffdf9", label: "#8fb7ff" },
};

type PassK = keyof typeof CANS;

export function MissionWall({ family }: { family: string }) {
  const [size, setSize] = useState<Size | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [muted, setMuted] = useState(false);
  const [still, setStill] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const wallWrap = useRef<HTMLDivElement>(null);
  const night = useRef<HTMLDivElement>(null);
  const hand = useRef<HTMLDivElement>(null);
  const cv = { paint: useRef<HTMLCanvasElement>(null), fx: useRef<HTMLCanvasElement>(null) };
  const engine = useRef<{ play: () => void; stop: () => void } | null>(null);
  const sfx = useRef<Sfx | null>(null);

  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    on();
    let t = 0;
    const later = () => { window.clearTimeout(t); t = window.setTimeout(on, 250); };
    window.addEventListener("resize", later);
    return () => { window.removeEventListener("resize", later); window.clearTimeout(t); sfx.current?.stop(); };
  }, []);

  const wall = useMemo(() => (size ? <Wall w={size.w} h={size.h} /> : null), [size]);

  /* Bake the wall into one image once it has rendered: its filters are
     costly, and as a flat picture the camera can move it freely. */
  useEffect(() => {
    const host = wallWrap.current, svg = host?.querySelector("svg.mw-wall");
    if (!host || !svg || !size) return;
    host.querySelectorAll("img.mw-wall").forEach((n) => n.remove());
    (svg as SVGElement).style.display = "";
    const copy = svg.cloneNode(true) as SVGElement;
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.querySelectorAll(".mw-stencil text, .mw-poster-t").forEach((t) => { t.setAttribute("font-family", "Arial Black, Impact, sans-serif"); t.setAttribute("font-weight", "900"); });
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" }));
    const img = new Image(); img.className = "mw-wall"; img.alt = ""; img.decoding = "async"; img.width = size.w; img.height = size.h;
    let live = true;
    img.onload = () => { if (!live) return; host.appendChild(img); (svg as SVGElement).style.display = "none"; };
    img.src = url;
    return () => { live = false; URL.revokeObjectURL(url); };
  }, [wall, size]);

  useEffect(() => {
    if (!size) return;
    const { w, h } = size;
    const dpr = Math.min(1.25, window.devicePixelRatio || 1), fxs = 0.5;
    const els = Object.fromEntries(Object.entries(cv).map(([k, r]) => [k, r.current])) as Record<keyof typeof cv, HTMLCanvasElement | null>;
    if (Object.values(els).some((e) => !e)) return;
    const ctx: Record<string, CanvasRenderingContext2D> = {};
    for (const [k, el] of Object.entries(els)) { const q = k === "fx" ? fxs : dpr; el!.width = Math.round(w * q); el!.height = Math.round(h * q); ctx[k] = el!.getContext("2d")!; }
    let alive = true, raf = 0;
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => { timers.push(window.setTimeout(() => alive && fn(), ms)); };

    const build = async () => {
      await document.fonts?.load(`200px ${family}`).catch(() => undefined);
      if (!alive) return null;
      const probe = document.createElement("canvas").getContext("2d")!;
      const L = layoutPiece(w, h, family, probe);
      const layers = renderLayers(L, w, h, dpr, family);
      const aFill = alphaMap(layers.fill.c, w, h), aLine = alphaMap(layers.outline.c, w, h), aShadow = alphaMap(layers.shadow.c, w, h), aShine = alphaMap(layers.shine.c, w, h);
      return { L, layers, aFill, aLine, aShadow, aShine };
    };

    /* A soft disc of a finished layer, copied onto the wall. */
    const dabber = (R: number) => {
      const D = Math.max(4, Math.ceil(R * 2 * dpr));
      const tile = document.createElement("canvas"); tile.width = tile.height = D;
      const t = tile.getContext("2d")!;
      const stamp = document.createElement("canvas"); stamp.width = stamp.height = D;
      const sx = stamp.getContext("2d")!, g = sx.createRadialGradient(D / 2, D / 2, 0, D / 2, D / 2, D / 2);
      g.addColorStop(0, "rgba(0,0,0,.9)"); g.addColorStop(0.6, "rgba(0,0,0,.7)"); g.addColorStop(1, "rgba(0,0,0,0)");
      sx.fillStyle = g; sx.fillRect(0, 0, D, D);
      return (src: HTMLCanvasElement, dst: CanvasRenderingContext2D, x: number, y: number, under = false) => {
        const px = Math.round(x * dpr - D / 2), py = Math.round(y * dpr - D / 2);
        t.globalCompositeOperation = "source-over"; t.clearRect(0, 0, D, D);
        t.drawImage(src, px, py, D, D, 0, 0, D, D);
        t.globalCompositeOperation = "destination-in"; t.drawImage(stamp, 0, 0);
        if (under) { dst.globalCompositeOperation = "destination-over"; dst.drawImage(tile, px, py); dst.globalCompositeOperation = "source-over"; }
        else dst.drawImage(tile, px, py);
      };
    };

    const run = async (still: boolean) => {
      const B = await build();
      if (!B) return;
      const { L, layers, aFill, aLine, aShadow, aShine } = B;
      if (still) {
        for (const l of [layers.shadow, layers.fill, layers.outline, layers.shine]) ctx.paint.drawImage(l.c, 0, 0);
        night.current?.classList.add("is-lit");
        setPhase("done");
        return;
      }

      /* ── the script ── */
      type Step = { kind: "move"; to: Pt; spray: boolean; pass?: PassK; drips?: number[] } | { kind: "swap"; can: PassK } | { kind: "wait"; ms: number };
      const steps: Step[] = [];
      const off = { x: w * 1.08, y: h * 1.15 };
      const add = (pass: PassK, routes: { pts: Pt[]; glyphs?: number[] }[]) => {
        for (const r of routes) {
          steps.push({ kind: "move", to: r.pts[0], spray: false });
          r.pts.slice(1).forEach((p, i) => steps.push({ kind: "move", to: p, spray: true, pass, drips: i === r.pts.length - 2 ? r.glyphs : undefined }));
        }
      };
      const fs = L.fs;
      /* Big soft dabs: each one only uncovers the finished layer, so a wide
         nozzle paints clean letters in a few broad sweeps. */
      const R = { fill: fs * 0.24, line: fs * 0.22, shine: fs * 0.07 };
      steps.push({ kind: "swap", can: "fill" });
      add("fill", sweeps(L, R.fill, fs * 0.01));
      steps.push({ kind: "swap", can: "line" });
      add("line", sweeps(L, R.line, fs * 0.05, fs * 0.05));
      steps.push({ kind: "swap", can: "shine" });
      add("shine", L.glyphs.map((g, gi) => {
        const pts: Pt[] = [];
        const top = g.y0 + fs * 0.05, mid = g.y0 + fs * 0.3;
        pts.push({ x: g.x0 + fs * 0.05, y: top }, { x: g.x0 + fs * 0.2, y: mid }, { x: g.x0 + fs * 0.32, y: top });
        const l = L.lines[g.line], c = Math.cos(l.rot), s = Math.sin(l.rot);
        void gi;
        return { pts: pts.map((p) => ({ x: l.cx + (p.x - l.cx) * c - (p.y - l.cy) * s, y: l.cy + (p.x - l.cx) * s + (p.y - l.cy) * c })) };
      }));
      add("shine", layers.sparkles.map((p) => ({ pts: [{ x: p.x - fs * 0.12, y: p.y }, { x: p.x + fs * 0.12, y: p.y }, { x: p.x, y: p.y - fs * 0.12 }, { x: p.x, y: p.y + fs * 0.12 }] })));
      steps.push({ kind: "wait", ms: 350 });
      steps.push({ kind: "move", to: off, spray: false });

      const dab = { fill: dabber(R.fill), line: dabber(R.line), shine: dabber(R.shine) };
      const near = {
        fill: (x: number, y: number) => aFill(x, y) > 10 || aFill(x + R.fill, y) > 10 || aFill(x - R.fill, y) > 10 || aFill(x, y + R.fill) > 10 || aFill(x, y - R.fill) > 10,
        line: (x: number, y: number) => [[0, 0], [R.line, 0], [-R.line, 0], [0, R.line], [0, -R.line]].some(([dx, dy]) => aLine(x + dx, y + dy) > 10 || aShadow(x + dx, y + dy) > 10),
        shine: (x: number, y: number) => [[0, 0], [R.shine, 0], [-R.shine, 0], [0, R.shine], [0, -R.shine]].some(([dx, dy]) => aShine(x + dx, y + dy) > 10),
      };
      const overspray = (color: string, x: number, y: number, r: number) => {
        const o = ctx.paint; o.fillStyle = color; o.globalCompositeOperation = "destination-over";
        o.globalAlpha = 0.012; o.beginPath(); o.arc(x * dpr, y * dpr, r * 1.35 * dpr, 0, Math.PI * 2); o.fill();
        if (Math.random() < 0.18) for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2, d = r * (1.4 + Math.random() * 1.8);
          o.globalAlpha = 0.25 + Math.random() * 0.4; o.beginPath(); o.arc((x + Math.cos(a) * d) * dpr, (y + Math.sin(a) * d) * dpr, (0.4 + Math.random()) * dpr, 0, Math.PI * 2); o.fill();
        }
        o.globalAlpha = 1; o.globalCompositeOperation = "source-over";
      };
      let canNow: PassK = "fill";
      const sprayAt = (pass: PassK, x: number, y: number) => {
        if (pass === "fill") { if (!near.fill(x, y)) return false; dab.fill(layers.fill.c, ctx.paint, x, y); overspray(CANS.fill.color, x, y, R.fill * 0.6); }
        else if (pass === "line") { if (!near.line(x, y)) return false; dab.line(layers.shadow.c, ctx.paint, x, y, true); dab.line(layers.outline.c, ctx.paint, x, y); overspray(INK, x, y, R.line * 0.45); }
        else { if (!near.shine(x, y)) return false; dab.shine(layers.shine.c, ctx.paint, x, y); }
        return true;
      };

      /* Drips: paint that ran after a letter. */
      type Drip = { x: number; y: number; len: number; w: number; t0: number; dur: number; at: number; color: string; dst: CanvasRenderingContext2D };
      const drips: Drip[] = [];
      const addDrips = (gi: number, pass: "fill" | "line", now: number) => {
        const g = L.glyphs[gi]; if (!g || Math.random() > (pass === "fill" ? 0.4 : 0.2)) return;
        const l = L.lines[g.line], c = Math.cos(l.rot), s = Math.sin(l.rot);
        const gx = g.x0 + (g.x1 - g.x0) * (0.2 + Math.random() * 0.6);
        const map = pass === "fill" ? aFill : aLine;
        for (let y = g.y1 + fs * 0.06; y > g.y0; y -= 2) {
          const x = l.cx + (gx - l.cx) * c - (y - l.cy) * s, yy = l.cy + (gx - l.cx) * s + (y - l.cy) * c;
          if (map(x, yy) > 120) { drips.push({ x, y: yy - 1, len: fs * (0.08 + Math.random() * 0.3), w: fs * (0.018 + Math.random() * 0.016), t0: now, dur: 1500 + Math.random() * 2000, at: 0, color: pass === "fill" ? "#d63f2a" : INK, dst: ctx.paint }); break; }
        }
      };
      const growDrips = (now: number) => {
        for (const d of drips) {
          const k = Math.min(1, (now - d.t0) / d.dur), e = 1 - Math.pow(1 - k, 3), to = d.len * e;
          if (to <= d.at + 0.2) continue;
          const c = d.dst; c.strokeStyle = d.color; c.fillStyle = d.color; c.lineCap = "round"; c.lineWidth = d.w * (1 - 0.3 * e) * dpr;
          c.beginPath(); c.moveTo(d.x * dpr, (d.y + d.at) * dpr); c.lineTo(d.x * dpr, (d.y + to) * dpr); c.stroke();
          d.at = to;
          if (k >= 1) { c.beginPath(); c.arc(d.x * dpr, (d.y + to) * dpr, d.w * 0.8 * dpr, 0, Math.PI * 2); c.fill(); }
        }
      };

      /* Mist: a puff at the nozzle while spraying, drawn fresh each frame. */
      type Puff = { x: number; y: number; vx: number; vy: number; life: number; r: number; color: string };
      const puffs: Puff[] = [];
      const drawFx = (dt: number) => {
        const f = ctx.fx; f.clearRect(0, 0, w * fxs, h * fxs);
        for (let i = puffs.length - 1; i >= 0; i--) {
          const p = puffs[i]; p.life -= dt; if (p.life <= 0) { puffs.splice(i, 1); continue; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.r += 40 * dt;
          f.globalAlpha = Math.max(0, p.life) * 0.22; f.fillStyle = p.color;
          f.beginPath(); f.arc(p.x * fxs, p.y * fxs, p.r * fxs, 0, Math.PI * 2); f.fill();
        }
        f.globalAlpha = 1;
      };

      /* ── the run ── */
      const S = sfx.current!;
      const handEl = hand.current!, stageEl = stage.current!;
      /* The can hangs below and right of where its paint lands, leaning
         into the wall, and swings a little with its own speed. */
      const ox = fs * 0.42, oy = fs * 0.56;
      handEl.style.setProperty("--ox", `${ox}px`); handEl.style.setProperty("--oy", `${oy}px`);
      handEl.style.setProperty("--jet-len", `${Math.hypot(ox, oy)}px`); handEl.style.setProperty("--jet-ang", `${Math.atan2(oy, ox)}rad`);
      handEl.style.setProperty("--size", `${Math.max(84, fs * 0.78)}px`);
      const placeHand = (x: number, y: number) => {
        handEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        const lean = Math.max(-14, Math.min(14, (vel.x / (fs * 30)) * 12));
        handEl.style.setProperty("--tilt", `${-34 + lean}deg`);
      };
      const setCan = (k: keyof typeof CANS) => {
        canNow = k; handEl.style.setProperty("--can", CANS[k].color); handEl.style.setProperty("--can-label", CANS[k].label);
        handEl.style.setProperty("--jet", `${R[k] * 1.5}px`);
      };
      setCan("fill");

      let nozzle = { ...off }, vel = { x: 0, y: 0 }, target = { ...off };
      let cam = { x: w / 2, y: h / 2, s: 1 }, camGoal = 1.14;
      let si = 0, segFrom = { ...off }, segT = 0, pauseUntil = 0, last = performance.now();
      const speed: Record<PassK | "travel", number> = { fill: fs * 28, line: fs * 40, shine: fs * 22, travel: fs * 30 };
      let spraying = false, done = false;
      placeHand(nozzle.x, nozzle.y);

      const frame = (now: number) => {
        if (!alive) return;
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        /* Advance the script. */
        let budget = dt;
        const segs: { a: Pt; b: Pt; pass: PassK }[] = [];
        while (si < steps.length && budget > 0 && now >= pauseUntil) {
          const st = steps[si];
          if (st.kind === "swap") {
            S.hiss(false); spraying = false;
            handEl.classList.remove("is-swap"); void handEl.offsetWidth; handEl.classList.add("is-swap");
            later(260, () => setCan(st.can));
            S.rattle(6, 0.1);
            pauseUntil = now + 760; si++; segFrom = { ...target }; segT = 0;
            break;
          }
          if (st.kind === "wait") { pauseUntil = now + st.ms; si++; segFrom = { ...target }; segT = 0; break; }
          const len = Math.hypot(st.to.x - segFrom.x, st.to.y - segFrom.y);
          const v = st.spray && st.pass ? speed[st.pass] : speed.travel;
          const need = len > 0 ? (len - segT) / v : 0;
          const from = { ...target };
          if (budget >= need) {
            budget -= need; target = { ...st.to };
            if (st.drips && (st.pass === "fill" || st.pass === "line")) for (const gi of st.drips) addDrips(gi, st.pass, now);
            segFrom = { ...st.to }; segT = 0; si++;
          } else {
            segT += budget * v; const k = segT / len;
            target = { x: segFrom.x + (st.to.x - segFrom.x) * k, y: segFrom.y + (st.to.y - segFrom.y) * k };
            budget = 0;
          }
          if (st.spray && st.pass) segs.push({ a: from, b: { ...target }, pass: st.pass });
        }
        /* Paint lands along the exact route; the arm only follows it. */
        let dabs = 0;
        for (const sg of segs) {
          const n = Math.max(1, Math.ceil(Math.hypot(sg.b.x - sg.a.x, sg.b.y - sg.a.y) / (R[sg.pass] * 0.32)));
          for (let i = 1; i <= n && dabs < 240; i++, dabs++) sprayAt(sg.pass, sg.a.x + ((sg.b.x - sg.a.x) * i) / n, sg.a.y + ((sg.b.y - sg.a.y) * i) / n);
        }
        const cur = steps[si];
        const wantSpray = !!cur && cur.kind === "move" && cur.spray && now >= pauseUntil;
        /* The arm follows on a spring: curves at every turn. */
        for (let i = 0; i < 4; i++) {
          const h4 = dt / 4, k = 2600, c = 2 * Math.sqrt(k) * 0.92;
          vel.x += (k * (target.x - nozzle.x) - c * vel.x) * h4; vel.y += (k * (target.y - nozzle.y) - c * vel.y) * h4;
          nozzle.x += vel.x * h4; nozzle.y += vel.y * h4;
        }
        if (wantSpray && cur.kind === "move" && cur.pass && Math.random() < 0.9) {
          puffs.push({ x: nozzle.x, y: nozzle.y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.7) * 50, life: 0.5 + Math.random() * 0.4, r: R[cur.pass] * 0.4, color: CANS[canNow].color });
        }
        if (wantSpray !== spraying) { spraying = wantSpray; S.hiss(spraying, canNow === "fill" ? 0.22 : 0.17); handEl.classList.toggle("is-spraying", spraying); }
        placeHand(nozzle.x, nozzle.y);
        growDrips(now);
        drawFx(dt);
        /* The camera leans in and follows; it lets go at the end. */
        const finished = si >= steps.length;
        camGoal = finished ? 1 : 1.14;
        cam.s += (camGoal - cam.s) * Math.min(1, dt * (finished ? 1.6 : 1.2));
        const fx = finished ? w / 2 : nozzle.x, fy = finished ? h / 2 : nozzle.y;
        cam.x += (fx - cam.x) * Math.min(1, dt * 2.2); cam.y += (fy - cam.y) * Math.min(1, dt * 2.2);
        const hx = w / (2 * cam.s), hy = h / (2 * cam.s);
        const cx = Math.min(w - hx, Math.max(hx, cam.x)), cy = Math.min(h - hy, Math.max(hy, cam.y));
        stageEl.style.transform = `translate3d(${w / 2 - cx * cam.s}px, ${h / 2 - cy * cam.s}px, 0) scale(${cam.s})`;
        if (finished && !done && Math.abs(cam.s - 1) < 0.01 && drips.every((d) => now - d.t0 > d.dur)) {
          done = true; S.hiss(false); handEl.classList.remove("is-spraying");
          finale();
          return;
        }
        raf = requestAnimationFrame(frame);
      };

      const finale = () => {
        stageEl.style.transform = "none";
        ctx.fx.clearRect(0, 0, w * fxs, h * fxs);
        S.swell();
        later(600, () => setPhase("done"));
      };

      S.lamp(true);
      night.current?.classList.add("is-on");
      later(700, () => { handEl.style.opacity = "1"; S.rattle(8, 0.1); raf = requestAnimationFrame((t) => { last = t; frame(t); }); });
    };

    const reset = () => {
      cancelAnimationFrame(raf);
      for (const t of timers.splice(0)) window.clearTimeout(t);
      for (const k of Object.keys(ctx)) { const c = ctx[k]; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, c.canvas.width, c.canvas.height); c.restore(); }
      night.current?.classList.remove("is-on", "is-lit");
      if (hand.current) { hand.current.style.opacity = "0"; hand.current.classList.remove("is-spraying", "is-swap"); }
      if (stage.current) stage.current.style.transform = "none";
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setStill(true); void run(true); }
    engine.current = {
      play: () => { reset(); if (!sfx.current) sfx.current = new Sfx(); sfx.current.start(); void run(false); },
      stop: reset,
    };
    /* Pressed before the wall was ready: start as soon as it is. */
    if (pending.current && !reduced) { pending.current = false; engine.current.play(); }
    return () => { alive = false; reset(); engine.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, family]);

  const pending = useRef(false);
  const start = useCallback(() => {
    setPhase("play");
    if (engine.current) engine.current.play(); else pending.current = true;
  }, []);
  const toggleSound = () => { setMuted((m) => { const n = !m; if (!sfx.current) sfx.current = new Sfx(); sfx.current.setMuted(n); return n; }); };

  return (
    <section className={`mw is-${phase}`} aria-label="Every stray animal on record: sprayed on a wall in an Indian street.">
      <div ref={stage} className="mw-stage">
        <div ref={wallWrap} className="mw-wallwrap">{wall}</div>
        <div ref={night} className="mw-night" aria-hidden />
        <canvas ref={cv.paint} className="mw-layer" aria-hidden />
        <canvas ref={cv.fx} className="mw-layer" aria-hidden />
        <div ref={hand} className="mw-hand" aria-hidden>
          <span className="mw-spot" />
          <span className="mw-jet" />
          <span className="mw-canwrap">
            <svg className="mw-can" viewBox="0 0 120 260">
              <defs>
                <linearGradient id="mw-metal" x1="0" x2="1">
                  <stop offset="0" stopColor="#000" stopOpacity=".55" /><stop offset=".22" stopColor="#fff" stopOpacity=".5" /><stop offset=".34" stopColor="#fff" stopOpacity=".08" />
                  <stop offset=".72" stopColor="#000" stopOpacity=".12" /><stop offset="1" stopColor="#000" stopOpacity=".62" />
                </linearGradient>
                <linearGradient id="mw-chrome" x1="0" x2="1">
                  <stop offset="0" stopColor="#4a5057" /><stop offset=".25" stopColor="#f3f5f7" /><stop offset=".5" stopColor="#a3aab1" /><stop offset=".8" stopColor="#6b7178" /><stop offset="1" stopColor="#3a3f45" />
                </linearGradient>
                <linearGradient id="mw-cap" x1="0" x2="1">
                  <stop offset="0" stopColor="#15151c" /><stop offset=".3" stopColor="#5a5a70" /><stop offset=".55" stopColor="#2a2a36" /><stop offset="1" stopColor="#0e0e14" />
                </linearGradient>
              </defs>
              <rect x="18" y="62" width="84" height="178" rx="10" className="mw-can-body" />
              <path d="M18 80 Q18 48 60 44 Q102 48 102 80 Z" className="mw-can-body" />
              <rect x="18" y="108" width="84" height="92" className="mw-can-label" />
              <path d="M18 108 H102 V122 q-6 0 -7 10 q-1 14 -5 14 q-4 0 -5 -14 q-1 -9 -8 -9 q-6 0 -7 18 q-1 9 -5 9 q-4 0 -5 -9 q0 -14 -8 -14 q-7 0 -8 7 q-1 6 -5 6 q-4 0 -5 -6 q0 -8 -6 -9 Z" className="mw-can-body" />
              <g fill="#0b1e3d" opacity=".88">
                <ellipse cx="60" cy="178" rx="15" ry="12" />
                <ellipse cx="41" cy="161" rx="5.5" ry="7" transform="rotate(-24 41 161)" /><ellipse cx="53" cy="152" rx="5.5" ry="7.5" />
                <ellipse cx="67" cy="152" rx="5.5" ry="7.5" /><ellipse cx="79" cy="161" rx="5.5" ry="7" transform="rotate(24 79 161)" />
              </g>
              <rect x="18" y="62" width="84" height="178" rx="10" fill="url(#mw-metal)" />
              <path d="M18 80 Q18 48 60 44 Q102 48 102 80 Z" fill="url(#mw-metal)" />
              <rect x="30" y="58" width="7" height="170" rx="3.5" fill="#fff" opacity=".42" />
              <rect x="15" y="232" width="90" height="14" rx="6" fill="url(#mw-chrome)" />
              <rect x="34" y="34" width="52" height="14" rx="5" fill="url(#mw-chrome)" />
              <rect x="43" y="4" width="34" height="34" rx="9" fill="url(#mw-cap)" />
              <rect x="47" y="8" width="5" height="24" rx="2.5" fill="#fff" opacity=".22" />
              <circle cx="60" cy="14" r="5" fill="#0a0a0f" stroke="#7a7a90" strokeWidth="1.5" />
            </svg>
          </span>
        </div>
      </div>

      {phase === "idle" && (
        <button type="button" className="mw-go" onClick={start} aria-label="Click to spray">
          <span className="mw-go-mist" aria-hidden />
          <svg className="mw-go-ring" viewBox="0 0 200 200" aria-hidden>
            <defs><path id="mw-ring" d="M100 100 m-80 0 a80 80 0 1 1 160 0 a80 80 0 1 1 -160 0" /></defs>
            <text><textPath href="#mw-ring" textLength="500" lengthAdjust="spacing">CLICK TO SPRAY ✶ CLICK TO SPRAY ✶</textPath></text>
          </svg>
          <span className="mw-go-cap" aria-hidden><span className="mw-go-nozzle" /></span>
        </button>
      )}
      {phase === "done" && !still && <button type="button" className="mw-again" onClick={start}>Spray again</button>}
      {phase !== "idle" && !still && (
        <button type="button" className="mw-sound" onClick={toggleSound} aria-label={muted ? "Sound on" : "Mute"} aria-pressed={muted}>
          {muted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
        </button>
      )}
    </section>
  );
}
