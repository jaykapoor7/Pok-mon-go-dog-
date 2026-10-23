/* The finale: the plaster gives way to the bricks under it, and the bricks
   that lie inside India light up, pulsing outwards in slow ripples. The
   bricks where StrayPaw has recorded areas burn brightest. The same idea
   as the landing's map, built from the wall itself. */

import { INDIA_PATH, INDIA_VIEW, indiaXY } from "@/sp/atlas/india-path";

export type Cell = [number, number, number];
type Brick = { x: number; y: number; w: number; h: number; india: boolean; hot: number; d: number; seed: number };

export type Area = { x: number; y: number; w: number; h: number };

export function buildBricks(w: number, h: number, cells: Cell[], origin: { x: number; y: number }, area: Area) {
  const bw = Math.max(12, Math.min(26, Math.min(w, h) / 30)), bh = bw * 0.44, gap = Math.max(1.2, bw * 0.08);
  /* India, fitted into its part of the wall. */
  const sc = Math.min(area.w / INDIA_VIEW.w, area.h / INDIA_VIEW.h);
  const ox = area.x + (area.w - INDIA_VIEW.w * sc) / 2, oy = area.y + (area.h - INDIA_VIEW.h * sc) / 2;
  const probe = document.createElement("canvas").getContext("2d")!;
  const path = new Path2D(INDIA_PATH);
  const bricks: Brick[] = [];
  const index = new Map<string, Brick>();
  for (let row = 0, y = 0; y < h + bh; row++, y += bh) {
    const shift = row % 2 ? bw / 2 : 0;
    for (let x = -shift; x < w + bw; x += bw) {
      const cx = x + bw / 2, cy = y + bh / 2;
      const india = probe.isPointInPath(path, (cx - ox) / sc, (cy - oy) / sc);
      const b: Brick = { x: x + gap / 2, y: y + gap / 2, w: bw - gap, h: bh - gap, india, hot: 0, d: Math.hypot(cx - origin.x, cy - origin.y), seed: Math.random() };
      bricks.push(b); index.set(`${row}:${Math.round(x + shift)}`, b);
    }
  }
  /* Recorded areas: each lights the brick it falls on. */
  const top = Math.max(1, ...cells.map((c) => c[2]));
  for (const [lng, lat, n] of cells) {
    const [ix, iy] = indiaXY(lng, lat), px = ox + ix * sc, py = oy + iy * sc;
    const row = Math.floor(py / bh), shift = row % 2 ? bw / 2 : 0;
    const col = Math.floor((px + shift) / bw) * bw - shift;
    const b = index.get(`${row}:${Math.round(col + shift)}`);
    if (b) b.hot = Math.max(b.hot, 0.45 + 0.55 * Math.sqrt(n / top));
  }
  const maxD = Math.max(...bricks.map((b) => b.d));
  return { bricks, maxD, bw };
}

/* A soft glow, drawn once and stamped on hot bricks. */
function glowSprite(r: number) {
  const c = document.createElement("canvas"); c.width = c.height = Math.ceil(r * 2);
  const g = c.getContext("2d")!, gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, "rgba(255,214,120,.95)"); gr.addColorStop(0.35, "rgba(255,140,60,.45)"); gr.addColorStop(1, "rgba(255,90,60,0)");
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  return c;
}

export function brickPainter(ctx: CanvasRenderingContext2D, w: number, h: number, cells: Cell[], origin: { x: number; y: number }, area: Area) {
  const { bricks, maxD, bw } = buildBricks(w, h, cells, origin, area);
  const glow = glowSprite(bw * 1.4);
  const anyHot = bricks.some((b) => b.hot > 0);
  /* t: seconds since the finale began. reveal: 0→1 over the first seconds. */
  return (t: number, still = false) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0c0a10"; ctx.fillRect(0, 0, w, h);
    const front = still ? Infinity : (t / 2.4) * maxD;
    for (const b of bricks) {
      const since = still ? 9 : (front - b.d) / (maxD * 0.18);
      if (since <= 0) continue;
      const fade = Math.min(1, since);
      if (!b.india) {
        ctx.globalAlpha = fade;
        ctx.fillStyle = b.seed > 0.5 ? "#2a1d24" : "#241820";
        ctx.fillRect(b.x, b.y, b.w, b.h);
        continue;
      }
      /* Ripples out from where the paw was tagged, like a heartbeat across India. */
      const wave = still ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.1 - b.d * 0.022);
      const base = anyHot ? 0.28 : 0.4;
      const lit = Math.min(1, base + 0.38 * wave * wave + b.hot * (0.5 + 0.5 * Math.sin(t * 3.2 + b.seed * 6)));
      const r = Math.round(90 + 165 * lit), g = Math.round(28 + 150 * lit * lit), bl = Math.round(30 + 60 * lit * lit * lit);
      ctx.globalAlpha = fade;
      ctx.fillStyle = `rgb(${r},${g},${bl})`;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = `rgba(255,240,200,${0.12 * lit})`;
      ctx.fillRect(b.x, b.y, b.w, Math.max(1, b.h * 0.22));
    }
    /* Hot bricks glow into the mortar around them. */
    ctx.globalCompositeOperation = "lighter";
    for (const b of bricks) {
      if (!b.hot) continue;
      const since = still ? 9 : (front - b.d) / (maxD * 0.18);
      if (since <= 0) continue;
      ctx.globalAlpha = Math.min(1, since) * b.hot * (still ? 0.6 : 0.45 + 0.35 * Math.sin(t * 3.2 + b.seed * 6));
      ctx.drawImage(glow, b.x + b.w / 2 - glow.width / 2, b.y + b.h / 2 - glow.height / 2);
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  };
}
