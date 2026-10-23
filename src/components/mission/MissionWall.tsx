"use client";

/* ════════════════════════════════════════════════════════════════════
   Mission. One wall in an Indian street, and someone spray-painting the
   whole of StrayPaw's mission across it: EVERY STRAY ANIMAL ON RECORD.

   The wall is drawn, not photographed, so it fits any screen: limewashed
   plaster with grain and rising damp, a hand-painted rust band at the
   foot, a patch fallen away to brick, a meter box and its sagging wires,
   paan stains, torn layered posters and the stencilled "STICK NO BILLS"
   under them. Nothing on it is a real person, number or business.

   The paint behaves like spray: a nozzle fills each letter in passes,
   leaving a soft edge, a haze of overspray and speckle, and drips that
   run after the letter is done. An arm in a shirt sleeve holds the can
   and follows the nozzle; the painter's shadow falls on the wall. It
   plays once, on its own. Under reduced motion the finished wall shows.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import "./mission.css";

const PAINT = "#101b33";
const TAG = "#f05b40";

type Size = { w: number; h: number };

/* A small seeded random, so the wall is the same wall every visit. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ── the wall ─────────────────────────────────────────────────────── */
function Wall({ w, h }: Size) {
  const k = Math.max(0.55, Math.min(1.25, Math.min(w, h) / 820));
  const portrait = h > w * 1.1;
  const dado = h * (portrait ? 0.86 : 0.83);
  const r = rng(7);
  const streaks = Array.from({ length: 9 }, (_, i) => ({ x: (i + 0.3 + r() * 0.5) * (w / 9), wd: 10 + r() * 40, len: h * (0.12 + r() * 0.35), o: 0.05 + r() * 0.08 }));
  const cracks = [
    `M${w * 0.62} ${h * 0.08} l${8 * k} ${22 * k} l${-6 * k} ${18 * k} l${12 * k} ${26 * k} l${-4 * k} ${20 * k}`,
    `M${w * 0.33} ${dado} l${6 * k} ${-24 * k} l${-9 * k} ${-16 * k} l${5 * k} ${-28 * k}`,
    `M${w * 0.9} ${h * 0.42} l${-14 * k} ${10 * k} l${-6 * k} ${22 * k} l${-16 * k} ${8 * k}`,
  ];
  /* Posters: anchored to edges so they frame the words on any screen. */
  const P = (x: number, y: number, pw: number, ph: number, rot: number) => ({ x, y, pw: pw * k, ph: ph * k, rot });
  const tuition = portrait ? P(w * 0.04, h * 0.6, 170, 230, -3) : P(w * 0.035, h * 0.5, 200, 270, -3);
  const admit = portrait ? P(w * 0.42, h * 0.63, 160, 200, 2.5) : P(w * 0.15, h * 0.58, 190, 240, 3);
  const film = portrait ? P(w * 0.6, h * 0.1, 150, 200, 2) : P(w * 0.76, h * 0.08, 210, 290, 2);
  const meter = { x: portrait ? w * 0.06 : w * 0.05, y: h * 0.11, s: k };
  const brick = { x: portrait ? w * 0.7 : w * 0.82, y: portrait ? h * 0.66 : h * 0.6 };
  const stencil = { x: portrait ? w * 0.06 : w * 0.66, y: portrait ? h * 0.27 : h * 0.68 };

  return (
    <svg className="mw-wall" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      <defs>
        <filter id="mw-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="3" /><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .2  0 0 0 0 .1  0 0 0 -1.6 1.05" /></filter>
        <filter id="mw-relief" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="5" seed="11" result="n" /><feDiffuseLighting in="n" lightingColor="#fff6e3" surfaceScale="2.2" diffuseConstant="1.05"><feDistantLight azimuth="235" elevation="58" /></feDiffuseLighting></filter>
        <filter id="mw-blotch" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".004 .009" numOctaves="4" seed="5" /><feColorMatrix values="0 0 0 0 .42  0 0 0 0 .3  0 0 0 0 .14  0 0 0 2.4 -1.25" /></filter>
        <filter id="mw-torn" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="9" result="t" /><feDisplacementMap in="SourceGraphic" in2="t" scale={7 * k} xChannelSelector="R" yChannelSelector="G" /></filter>
        <filter id="mw-soft"><feGaussianBlur stdDeviation={6 * k} /></filter>
        <linearGradient id="mw-light" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff2cf" stopOpacity=".38" /><stop offset=".55" stopColor="#fff2cf" stopOpacity="0" /><stop offset="1" stopColor="#3b2410" stopOpacity=".28" /></linearGradient>
        <linearGradient id="mw-damp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5a3d18" stopOpacity="0" /><stop offset="1" stopColor="#5a3d18" stopOpacity=".32" /></linearGradient>
        <linearGradient id="mw-streak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4b3214" stopOpacity="1" /><stop offset="1" stopColor="#4b3214" stopOpacity="0" /></linearGradient>
        <pattern id="mw-bricks" width={44 * k} height={22 * k} patternUnits="userSpaceOnUse">
          <rect width={44 * k} height={22 * k} fill="#cfae8b" />
          <rect x={1.5 * k} y={1.5 * k} width={40 * k} height={8.5 * k} rx={1.5} fill="#a5543a" />
          <rect x={-20 * k} y={12 * k} width={40 * k} height={8.5 * k} rx={1.5} fill="#9a4b33" />
          <rect x={23.5 * k} y={12 * k} width={40 * k} height={8.5 * k} rx={1.5} fill="#ad5d40" />
        </pattern>
        <radialGradient id="mw-vig" cx=".5" cy=".45" r=".75"><stop offset=".6" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#1b0f05" stopOpacity=".45" /></radialGradient>
      </defs>

      {/* plaster, its relief, its stains */}
      <rect width={w} height={h} fill="#dfb766" />
      <rect width={w} height={h} filter="url(#mw-relief)" style={{ mixBlendMode: "multiply" }} opacity=".55" />
      <rect width={w} height={h} filter="url(#mw-blotch)" opacity=".55" />
      {streaks.map((s, i) => <rect key={i} x={s.x} y={0} width={s.wd * k} height={s.len} fill="url(#mw-streak)" opacity={s.o} filter="url(#mw-soft)" />)}
      <rect y={dado - h * 0.2} width={w} height={h * 0.2} fill="url(#mw-damp)" />

      {/* fallen plaster, showing brick */}
      <g transform={`translate(${brick.x} ${brick.y})`}>
        <path d={`M0 ${20 * k} C${30 * k} ${-6 * k} ${90 * k} ${4 * k} ${120 * k} ${-8 * k} C${150 * k} ${10 * k} ${160 * k} ${60 * k} ${140 * k} ${90 * k} C${100 * k} ${110 * k} ${50 * k} ${96 * k} ${20 * k} ${104 * k} C${-10 * k} ${80 * k} ${-12 * k} ${50 * k} 0 ${20 * k}Z`} fill="url(#mw-bricks)" stroke="#8a6a44" strokeWidth={2.5 * k} />
        <path d={`M0 ${20 * k} C${30 * k} ${-6 * k} ${90 * k} ${4 * k} ${120 * k} ${-8 * k}`} fill="none" stroke="#fff3d6" strokeOpacity=".5" strokeWidth={2 * k} />
      </g>
      {cracks.map((d, i) => <path key={i} d={d} fill="none" stroke="#5b3b17" strokeOpacity=".5" strokeWidth={1.4 * k} strokeLinejoin="round" />)}

      {/* the painted band at the foot of the wall */}
      <path d={`M0 ${dado} Q${w * 0.25} ${dado - 3 * k} ${w * 0.5} ${dado + 2 * k} T${w} ${dado - 2 * k} V${h} H0Z`} fill="#93382a" />
      <rect y={dado} width={w} height={h - dado} filter="url(#mw-relief)" style={{ mixBlendMode: "multiply" }} opacity=".45" />
      <path d={`M0 ${dado - 1} Q${w * 0.25} ${dado - 4 * k} ${w * 0.5} ${dado + 1 * k} T${w} ${dado - 3 * k}`} fill="none" stroke="#6e241a" strokeWidth={2.5 * k} />
      {/* paan stains */}
      <g transform={`translate(${w * (portrait ? 0.82 : 0.38)} ${dado + (h - dado) * 0.35})`} fill="#5e1610" opacity=".6">
        <ellipse rx={22 * k} ry={9 * k} /><ellipse cx={26 * k} cy={6 * k} rx={7 * k} ry={4 * k} /><circle cx={-24 * k} cy={-6 * k} r={4 * k} /><circle cx={34 * k} cy={-10 * k} r={2.5 * k} /><path d={`M${4 * k} ${6 * k} q${2 * k} ${14 * k} ${-1 * k} ${26 * k}`} stroke="#5e1610" strokeWidth={3 * k} fill="none" />
      </g>

      {/* the meter box and its wires */}
      <g transform={`translate(${meter.x} ${meter.y}) scale(${meter.s})`}>
        <path d={`M38 0 C ${w * 0.18 / meter.s} -30 ${w * 0.32 / meter.s} 40 ${w * 0.55 / meter.s} -10 S ${w * 0.9 / meter.s} -30 ${w * 1.1 / meter.s} -20`} fill="none" stroke="#161616" strokeWidth="3.2" />
        <path d={`M48 0 C ${w * 0.2 / meter.s} 24 ${w * 0.4 / meter.s} 70 ${w * 0.62 / meter.s} 20 S ${w * 0.95 / meter.s} 10 ${w * 1.1 / meter.s} 30`} fill="none" stroke="#222" strokeWidth="2.4" />
        <path d="M44 96 C 40 150 52 200 46 260" fill="none" stroke="#1b1b1b" strokeWidth="3" />
        <rect x="6" y="4" width="76" height="96" rx="4" fill="#8e938f" stroke="#4b4f4c" strokeWidth="2" />
        <rect x="16" y="16" width="56" height="34" rx="2" fill="#2c3533" /><rect x="22" y="24" width="30" height="10" fill="#9fb7a4" opacity=".6" />
        <circle cx="16" cy="88" r="2.4" fill="#4b4f4c" /><circle cx="72" cy="88" r="2.4" fill="#4b4f4c" />
        <rect x="6" y="4" width="76" height="96" rx="4" fill="url(#mw-light)" />
      </g>

      {/* stencilled on the wall long ago, under the posters */}
      <g transform={`translate(${stencil.x} ${stencil.y}) rotate(-1.5) scale(${k})`} className="mw-stencil">
        <text y="0" fill="#1a1712" opacity=".72" fontSize="34" letterSpacing="3">STICK NO BILLS</text>
        <text y="40" fill="#8a2318" opacity=".7" fontSize="25">यहाँ पोस्टर लगाना मना है</text>
      </g>

      {/* torn remnants of older posters */}
      <g filter="url(#mw-torn)" opacity=".85">
        <rect x={tuition.x + 150 * k} y={tuition.y - 40 * k} width={70 * k} height={50 * k} fill="#e9e2cf" transform={`rotate(4 ${tuition.x} ${tuition.y})`} />
        <rect x={film.x - 50 * k} y={film.y + 210 * k} width={60 * k} height={70 * k} fill="#d7c48d" />
        <rect x={w * 0.5} y={h * 0.86} width={90 * k} height={30 * k} fill="#e4dccb" opacity=".7" />
      </g>

      {/* posters */}
      <g transform={`translate(${tuition.x} ${tuition.y}) rotate(${tuition.rot})`} filter="url(#mw-torn)">
        <rect width={tuition.pw} height={tuition.ph} fill="#f3ecd8" />
        <rect width={tuition.pw} height={tuition.ph * 0.24} fill="#c8321f" />
        <text x={tuition.pw / 2} y={tuition.ph * 0.16} textAnchor="middle" fill="#fff8e7" fontSize={24 * k} fontWeight="800" className="mw-poster-t">TUITION</text>
        <text x={tuition.pw / 2} y={tuition.ph * 0.36} textAnchor="middle" fill="#1d2b5c" fontSize={15 * k} fontWeight="800">CLASS 6 TO 12</text>
        <text x={tuition.pw / 2} y={tuition.ph * 0.47} textAnchor="middle" fill="#1d2b5c" fontSize={12 * k}>Maths · Science · English</text>
        <text x={tuition.pw / 2} y={tuition.ph * 0.6} textAnchor="middle" fill="#c8321f" fontSize={17 * k} fontWeight="700">हर विषय की कोचिंग</text>
        <rect x={tuition.pw * 0.12} y={tuition.ph * 0.72} width={tuition.pw * 0.76} height={tuition.ph * 0.13} fill="#1d2b5c" />
        <text x={tuition.pw / 2} y={tuition.ph * 0.81} textAnchor="middle" fill="#ffd34d" fontSize={13 * k} fontWeight="700">ADMISSIONS NOW</text>
        <rect width={tuition.pw} height={tuition.ph} fill="url(#mw-light)" />
      </g>
      <g transform={`translate(${admit.x} ${admit.y}) rotate(${admit.rot})`} filter="url(#mw-torn)">
        <rect width={admit.pw} height={admit.ph} fill="#1f3f8f" />
        <rect y={admit.ph * 0.62} width={admit.pw} height={admit.ph * 0.38} fill="#ffcc2e" />
        <text x={admit.pw / 2} y={admit.ph * 0.22} textAnchor="middle" fill="#ffcc2e" fontSize={22 * k} fontWeight="800" className="mw-poster-t">ADMISSION</text>
        <text x={admit.pw / 2} y={admit.ph * 0.38} textAnchor="middle" fill="#fff" fontSize={22 * k} fontWeight="800" className="mw-poster-t">OPEN</text>
        <text x={admit.pw / 2} y={admit.ph * 0.52} textAnchor="middle" fill="#fff" fontSize={14 * k}>2026–27</text>
        <text x={admit.pw / 2} y={admit.ph * 0.8} textAnchor="middle" fill="#a2140a" fontSize={20 * k} fontWeight="800">प्रवेश प्रारंभ</text>
        <rect width={admit.pw} height={admit.ph} fill="url(#mw-light)" />
        {/* a corner torn away */}
        <path d={`M${admit.pw} ${admit.ph * 0.7} L${admit.pw} ${admit.ph} L${admit.pw * 0.62} ${admit.ph} Z`} fill="#dfb766" />
      </g>
      <g transform={`translate(${film.x} ${film.y}) rotate(${film.rot})`} filter="url(#mw-torn)" opacity=".92">
        <rect width={film.pw} height={film.ph} fill="#5d1747" />
        <circle cx={film.pw * 0.5} cy={film.ph * 0.36} r={film.pw * 0.3} fill="#f08a24" opacity=".9" />
        <path d={`M0 ${film.ph * 0.56} L${film.pw * 0.25} ${film.ph * 0.4} L${film.pw * 0.45} ${film.ph * 0.52} L${film.pw * 0.7} ${film.ph * 0.34} L${film.pw} ${film.ph * 0.5} V${film.ph * 0.66} H0Z`} fill="#2a0b22" />
        <text x={film.pw / 2} y={film.ph * 0.8} textAnchor="middle" fill="#ffe9a8" fontSize={26 * k} fontWeight="800" className="mw-poster-t">MERA SHEHAR</text>
        <text x={film.pw / 2} y={film.ph * 0.9} textAnchor="middle" fill="#ffe9a8" fontSize={12 * k} letterSpacing="2">NOW SHOWING</text>
        <rect width={film.pw} height={film.ph} fill="url(#mw-light)" />
        {/* the lower part peeled off */}
        <path d={`M0 ${film.ph * 0.86} L${film.pw * 0.2} ${film.ph * 0.93} L${film.pw * 0.34} ${film.ph * 0.88} L${film.pw * 0.5} ${film.ph * 0.97} L0 ${film.ph}Z`} fill="#dfb766" />
      </g>

      {/* grain, light and vignette over everything */}
      <rect width={w} height={h} filter="url(#mw-grain)" opacity=".5" />
      <rect width={w} height={h} fill="url(#mw-light)" />
      <rect width={w} height={h} fill="url(#mw-vig)" />
    </svg>
  );
}

/* ── the spray ────────────────────────────────────────────────────── */
type Glyph = { x0: number; x1: number; y0: number; y1: number };
type Drip = { x: number; y: number; len: number; w: number; start: number; dur: number; drawn: number };

function layout(w: number, h: number, family: string, ctx: CanvasRenderingContext2D) {
  const lines = w / h > 1.25 ? ["EVERY STRAY ANIMAL", "ON RECORD"] : ["EVERY STRAY", "ANIMAL", "ON RECORD"];
  const boxW = w * 0.86, boxH = h * (w / h > 1.25 ? 0.5 : 0.46);
  let fs = 200;
  ctx.font = `${fs}px ${family}`;
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  fs = Math.min(fs * (boxW / widest), boxH / (lines.length * 1.02));
  ctx.font = `${fs}px ${family}`;
  const lh = fs * 1.02, total = lh * lines.length;
  const cy = h * 0.47, top = cy - total / 2;
  const glyphs: Glyph[] = [];
  const placed = lines.map((l, i) => {
    const lw = ctx.measureText(l).width, x = w / 2 - lw / 2, base = top + lh * (i + 0.86);
    let cx = x;
    for (const ch of l) {
      const cw = ctx.measureText(ch).width;
      if (ch !== " ") glyphs.push({ x0: cx - fs * 0.02, x1: cx + cw + fs * 0.02, y0: base - fs * 0.78, y1: base + fs * 0.04 });
      cx += cw;
    }
    return { text: l, x, base };
  });
  return { fs, placed, glyphs, center: { x: w / 2, y: cy } };
}

export function MissionWall({ family }: { family: string }) {
  const [size, setSize] = useState<Size | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hand = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const mist = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    on();
    let t = 0;
    const later = () => { window.clearTimeout(t); t = window.setTimeout(on, 200); };
    window.addEventListener("resize", later);
    return () => { window.removeEventListener("resize", later); window.clearTimeout(t); };
  }, []);

  const wall = useMemo(() => (size ? <Wall w={size.w} h={size.h} /> : null), [size]);

  useEffect(() => {
    if (!size || !canvas.current) return;
    const { w, h } = size;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = canvas.current;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const out = cv.getContext("2d")!;
    const mk = () => { const c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height; const x = c.getContext("2d")!; x.scale(dpr, dpr); return { c, x }; };
    const mask = mk(), paint = mk(), speck = mk(), drips = mk(), comp = mk();
    let raf = 0, alive = true;

    const go = async () => {
      await document.fonts?.load(`200px ${family}`).catch(() => undefined);
      if (!alive) return;
      const L = layout(w, h, family, mask.x);
      const tilt = -0.045;
      const rot = (x: number, y: number) => { const dx = x - L.center.x, dy = y - L.center.y; return { x: L.center.x + dx * Math.cos(tilt) - dy * Math.sin(tilt), y: L.center.y + dx * Math.sin(tilt) + dy * Math.cos(tilt) }; };

      /* The letters, softened a touch: spray never has a hard edge. */
      mask.x.save();
      mask.x.translate(L.center.x, L.center.y); mask.x.rotate(tilt); mask.x.translate(-L.center.x, -L.center.y);
      mask.x.filter = `blur(${Math.max(0.8, L.fs * 0.008)}px)`;
      mask.x.fillStyle = "#000"; mask.x.font = `${L.fs}px ${family}`;
      for (const p of L.placed) mask.x.fillText(p.text, p.x, p.base);
      mask.x.restore();
      const maskData = mask.x.getImageData(0, 0, mask.c.width, mask.c.height).data;
      const inside = (x: number, y: number) => { const i = (Math.round(y * dpr) * mask.c.width + Math.round(x * dpr)) * 4 + 3; return i >= 0 && i < maskData.length && maskData[i] > 60; };

      /* The nozzle's route: each letter filled in up-and-down passes. */
      const r = L.fs * 0.075, step = r * 0.95;
      type Seg = { pts: { x: number; y: number }[]; letter: number };
      const route: Seg[] = L.glyphs.map((g, letter) => {
        const pts: { x: number; y: number }[] = [];
        let down = true;
        for (let x = g.x0 + step * 0.5; x <= g.x1; x += step) {
          pts.push(rot(x, down ? g.y0 : g.y1), rot(x, down ? g.y1 : g.y0));
          down = !down;
        }
        return { pts, letter };
      });

      /* The soft stamp the nozzle leaves. */
      const stamp = document.createElement("canvas"), S = Math.ceil(r * 3.2 * dpr);
      stamp.width = stamp.height = S;
      const sx = stamp.getContext("2d")!, gr = sx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      gr.addColorStop(0, "rgba(16,27,51,.9)"); gr.addColorStop(0.5, "rgba(16,27,51,.6)"); gr.addColorStop(1, "rgba(16,27,51,0)");
      sx.fillStyle = gr; sx.fillRect(0, 0, S, S);
      const R = rng(42);
      const gauss = () => (R() + R() + R() - 1.5) / 1.5;
      const dripList: Drip[] = [];

      /* Paint only lands near the letters; a real painter does not fill the box. */
      const near = (x: number, y: number) => inside(x, y) || inside(x + r, y) || inside(x - r, y) || inside(x, y + r) || inside(x, y - r);
      const dab = (x: number, y: number) => {
        if (!near(x, y)) return;
        paint.x.drawImage(stamp, x - S / dpr / 2 + gauss() * r * 0.12, y - S / dpr / 2 + gauss() * r * 0.12, S / dpr, S / dpr);
        if (R() < 0.35) {
          speck.x.fillStyle = PAINT;
          for (let i = 0; i < 3; i++) {
            const px = x + gauss() * r * 2.4, py = y + gauss() * r * 2.4;
            if (inside(px, py)) continue;
            speck.x.globalAlpha = 0.15 + R() * 0.35;
            speck.x.beginPath(); speck.x.arc(px, py, 0.4 + R() * 1, 0, Math.PI * 2); speck.x.fill();
          }
          speck.x.globalAlpha = 1;
        }
      };
      /* Stamp along the whole stretch the nozzle moved, so a fast frame leaves no gaps. */
      const spray = (x0: number, y0: number, x1: number, y1: number) => {
        const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (r * 0.22)));
        for (let i = 1; i <= n; i++) dab(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
      };
      const addDrips = (g: Glyph, now: number) => {
        const count = R() < 0.55 ? 1 + (R() < 0.3 ? 1 : 0) : 0;
        for (let i = 0; i < count; i++) {
          const gx = g.x0 + (g.x1 - g.x0) * (0.2 + R() * 0.6);
          for (let y = g.y1 + L.fs * 0.06; y > g.y0; y -= 2) {
            const p = rot(gx, y);
            if (inside(p.x, p.y)) { dripList.push({ x: p.x, y: p.y - 2, len: L.fs * (0.12 + R() * 0.45), w: r * (0.18 + R() * 0.16), start: now, dur: 1400 + R() * 1800, drawn: 0 }); break; }
          }
        }
      };
      const growDrips = (now: number) => {
        drips.x.strokeStyle = PAINT; drips.x.fillStyle = PAINT; drips.x.lineCap = "round";
        for (const d of dripList) {
          const t = Math.min(1, (now - d.start) / d.dur), e = 1 - Math.pow(1 - t, 3), to = d.len * e;
          if (to <= d.drawn + 0.3) continue;
          drips.x.lineWidth = d.w * (1 - 0.35 * e);
          drips.x.beginPath(); drips.x.moveTo(d.x, d.y + d.drawn); drips.x.lineTo(d.x, d.y + to); drips.x.stroke();
          d.drawn = to;
          if (t >= 1) { drips.x.beginPath(); drips.x.arc(d.x, d.y + to, d.w * 0.75, 0, Math.PI * 2); drips.x.fill(); }
        }
      };
      const compose = () => {
        out.setTransform(1, 0, 0, 1, 0, 0);
        out.clearRect(0, 0, cv.width, cv.height);
        out.globalAlpha = 0.07; out.drawImage(paint.c, 0, 0); out.globalAlpha = 1;
        comp.x.setTransform(1, 0, 0, 1, 0, 0); comp.x.clearRect(0, 0, cv.width, cv.height);
        comp.x.globalCompositeOperation = "source-over"; comp.x.drawImage(paint.c, 0, 0);
        comp.x.globalCompositeOperation = "destination-in"; comp.x.drawImage(mask.c, 0, 0);
        comp.x.globalCompositeOperation = "source-over";
        out.drawImage(comp.c, 0, 0);
        out.drawImage(speck.c, 0, 0);
        out.drawImage(drips.c, 0, 0);
      };

      /* The tag at the end: a small paw, sprayed in flame. */
      const last = L.glyphs[L.glyphs.length - 1];
      const tagAt = rot(last.x1 + L.fs * 0.32, last.y1 - L.fs * 0.12);
      const paw = (alpha: number) => {
        const c = speck.x; const s = L.fs * 0.11;
        c.save(); c.globalAlpha = alpha; c.fillStyle = TAG; c.filter = "blur(1px)";
        c.beginPath(); c.ellipse(tagAt.x, tagAt.y + s * 0.5, s * 0.9, s * 0.72, 0, 0, Math.PI * 2); c.fill();
        for (const [dx, dy] of [[-1.1, -0.6], [-0.38, -1.25], [0.38, -1.25], [1.1, -0.6]]) { c.beginPath(); c.ellipse(tagAt.x + dx * s, tagAt.y + dy * s, s * 0.32, s * 0.4, 0, 0, Math.PI * 2); c.fill(); }
        c.restore();
      };

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        for (const seg of route) { let prev = seg.pts[0]; for (const pt of seg.pts.slice(1)) { spray(prev.x, prev.y, pt.x, pt.y); prev = pt; } addDrips(L.glyphs[seg.letter], -1e9); }
        growDrips(0); paw(0.95); compose();
        return;
      }

      /* Play: the hand comes in, sprays letter by letter, tags, leaves. */
      const speed = L.fs * 30, travel = L.fs * 18;
      type Move = { from: { x: number; y: number }; to: { x: number; y: number }; on: boolean; letterEnd?: number };
      const moves: Move[] = [];
      const offstage = { x: w * 1.05, y: h * 1.1 };
      let at = offstage;
      for (const seg of route) {
        moves.push({ from: at, to: seg.pts[0], on: false });
        for (let i = 1; i < seg.pts.length; i++) moves.push({ from: seg.pts[i - 1], to: seg.pts[i], on: true, letterEnd: i === seg.pts.length - 1 ? seg.letter : undefined });
        at = seg.pts[seg.pts.length - 1];
      }
      moves.push({ from: at, to: tagAt, on: false });
      moves.push({ from: tagAt, to: tagAt, on: false, letterEnd: -1 });
      moves.push({ from: tagAt, to: offstage, on: false });
      const dur = (m: Move) => (m.letterEnd === -1 ? 700 : Math.max(12, (Math.hypot(m.to.x - m.from.x, m.to.y - m.from.y) / (m.on ? speed : travel)) * 1000));

      const tip = { dx: L.fs * 0.16, dy: L.fs * 0.2 };
      hand.current?.style.setProperty("--can", `${Math.max(70, L.fs * 0.62)}px`);
      mist.current?.style.setProperty("--mist", `${r * 3}px`);
      const shoulder = { x: w * 1.08, y: h * 1.25 };
      const place = (x: number, y: number, spraying: boolean) => {
        const hx = x + tip.dx, hy = y + tip.dy;
        const ang = Math.atan2(shoulder.y - hy, shoulder.x - hx);
        const len = Math.hypot(shoulder.x - hx, shoulder.y - hy);
        if (hand.current) { hand.current.style.transform = `translate(${hx}px, ${hy}px)`; hand.current.style.setProperty("--arm", `${len}px`); hand.current.style.setProperty("--ang", `${ang}rad`); }
        if (shadow.current) shadow.current.style.transform = `translate(${hx + w * 0.12}px, ${hy + h * 0.12}px)`;
        if (mist.current) { mist.current.style.transform = `translate(${x}px, ${y}px)`; mist.current.style.opacity = spraying ? String(0.55 + Math.random() * 0.25) : "0"; }
      };

      let mi = 0, t0 = performance.now() + 500, lastMove = -1;
      let last2 = { ...offstage };
      place(offstage.x, offstage.y, false);
      const tick = (now: number) => {
        if (!alive) return;
        growDrips(now);
        while (mi < moves.length) {
          const m = moves[mi], d = dur(m), t = (now - t0) / d;
          if (t < 0) break;
          const e = m.on ? Math.min(1, t) : (t >= 1 ? 1 : t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
          const x = m.from.x + (m.to.x - m.from.x) * e, y = m.from.y + (m.to.y - m.from.y) * e;
          if (m.on) spray(mi === lastMove ? last2.x : m.from.x, mi === lastMove ? last2.y : m.from.y, x, y);
          lastMove = mi;
          if (m.letterEnd === -1) paw(Math.min(1, t) * 0.95);
          last2 = { x, y };
          place(x, y, m.on || (m.letterEnd === -1 && t < 1));
          if (t < 1) break;
          if (m.letterEnd !== undefined && m.letterEnd >= 0) addDrips(L.glyphs[m.letterEnd], now);
          t0 += d; mi++;
        }
        compose();
        if (mi < moves.length || dripList.some((dd) => now - dd.start < dd.dur)) raf = requestAnimationFrame(tick);
        else if (hand.current) hand.current.style.opacity = "0";
      };
      raf = requestAnimationFrame(tick);
    };
    void go();
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [size, family]);

  return (
    <section className="mw" role="img" aria-label="Every stray animal on record. Spray-painted on a wall in an Indian street.">
      {wall}
      <div ref={shadow} className="mw-shadow" aria-hidden />
      <canvas ref={canvas} className="mw-paint" aria-hidden />
      <div ref={mist} className="mw-mist" aria-hidden />
      <div ref={hand} className="mw-hand" aria-hidden>
        <span className="mw-arm" />
        <svg className="mw-can" viewBox="0 0 120 150">
          <defs>
            <linearGradient id="mw-metal" x1="0" x2="1"><stop offset="0" stopColor="#5d6670" /><stop offset=".35" stopColor="#d9dee3" /><stop offset=".6" stopColor="#9aa3ac" /><stop offset="1" stopColor="#3d444b" /></linearGradient>
            <linearGradient id="mw-skin" x1="0" x2="1"><stop offset="0" stopColor="#8c5a38" /><stop offset=".5" stopColor="#b97b4f" /><stop offset="1" stopColor="#7a4b2d" /></linearGradient>
          </defs>
          <g transform="rotate(-32 60 75)">
            <rect x="40" y="10" width="40" height="112" rx="9" fill="url(#mw-metal)" />
            <rect x="40" y="48" width="40" height="40" fill="#f05b40" /><rect x="40" y="48" width="40" height="40" fill="url(#mw-metal)" opacity=".25" />
            <rect x="46" y="0" width="28" height="14" rx="5" fill="#2a2f35" /><rect x="56" y="-6" width="8" height="8" rx="2" fill="#111" />
            <path d="M40 60 q-14 4 -12 22 q2 18 14 22 z" fill="url(#mw-skin)" />
            {[0, 1, 2, 3].map((i) => <rect key={i} x="36" y={62 + i * 13} width="50" height="12" rx="6" fill="url(#mw-skin)" stroke="#6b3f24" strokeWidth=".8" />)}
            <path d="M58 -4 q10 -2 14 8 l-4 6 q-6 -6 -12 -4z" fill="url(#mw-skin)" />
          </g>
        </svg>
      </div>
    </section>
  );
}
