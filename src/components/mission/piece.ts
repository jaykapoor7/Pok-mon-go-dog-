/* The graffiti piece, and how it is painted.

   The finished piece is drawn first, out of sight, in the four layers a
   writer builds it in: the 3D shadow, the fill (marigold to orange to
   pink, with a light wave through it), the outline, and the shine. The
   animation then reveals each layer only where the nozzle passes: every
   dab copies a soft disc of that layer onto the wall. So the paint lands
   exactly as finished, with a sprayed edge, and nothing is redrawn whole
   per frame. The nozzle follows its route on a spring, so it moves in
   curves, the way an arm does. */

export type Pt = { x: number; y: number };
export type Glyph = { x0: number; x1: number; y0: number; y1: number; line: number };
export type Layout = {
  fs: number; lines: { text: string; x: number; lw: number; base: number; cx: number; cy: number; rot: number }[]; glyphs: Glyph[];
  tag: Pt;
};

export const INK = "#1d1250";
const FILL = ["#ffd84a", "#ff9a1f", "#ff5a3c", "#ef3f7a"];

export function layoutPiece(w: number, h: number, family: string, ctx: CanvasRenderingContext2D): Layout {
  const wide = h < w * 0.9;
  const text = wide ? ["EVERY STRAY", "ANIMAL", "ON RECORD"] : ["EVERY", "STRAY", "ANIMAL", "ON", "RECORD"];
  const rots = [-0.06, 0.035, -0.045, 0.04, -0.03];
  const boxW = w * (wide ? 0.7 : 0.8), boxH = h * (wide ? 0.62 : 0.56);
  ctx.font = `200px ${family}`;
  const widest = Math.max(...text.map((l) => ctx.measureText(l).width));
  const lh = 1.04;
  const fs = Math.min((200 * boxW) / widest, boxH / (text.length * lh));
  ctx.font = `${fs}px ${family}`;
  const total = fs * lh * text.length, top = h * (wide ? 0.54 : 0.5) - total / 2;
  const glyphs: Glyph[] = [];
  const lines = text.map((t, i) => {
    const lw = ctx.measureText(t).width;
    const nudge = (i % 2 ? 1 : -1) * fs * 0.08;
    const x = w / 2 - lw / 2 + nudge, base = top + fs * lh * (i + 0.84);
    let cx = x;
    for (const ch of t) {
      const cw = ctx.measureText(ch).width;
      if (ch !== " ") glyphs.push({ x0: cx, x1: cx + cw, y0: base - fs * 0.76, y1: base + fs * 0.02, line: i });
      cx += cw;
    }
    return { text: t, x, lw, base, cx: x + lw / 2, cy: base - fs * 0.37, rot: rots[i % rots.length] };
  });
  const last = lines[lines.length - 1];
  const tag = { x: Math.min(w - fs * 0.6, last.x + ctx.measureText(last.text).width + fs * 0.5), y: last.base - fs * 0.1 };
  return { fs, lines, glyphs, tag };
}

/* A point in a line's own (unrotated) space, placed on the wall. */
export function onWall(L: Layout, line: number, x: number, y: number): Pt {
  const l = L.lines[line], dx = x - l.cx, dy = y - l.cy, c = Math.cos(l.rot), s = Math.sin(l.rot);
  return { x: l.cx + dx * c - dy * s, y: l.cy + dx * s + dy * c };
}

function canvas(w: number, h: number, dpr: number) {
  const c = document.createElement("canvas"); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  const x = c.getContext("2d")!; x.scale(dpr, dpr); return { c, x };
}

function eachLine(L: Layout, x: CanvasRenderingContext2D, family: string, draw: (l: Layout["lines"][number]) => void) {
  for (const l of L.lines) {
    x.save(); x.translate(l.cx, l.cy); x.rotate(l.rot); x.translate(-l.cx, -l.cy);
    x.font = `${L.fs}px ${family}`; draw(l); x.restore();
  }
}

/* The finished piece, layer by layer. */
export function renderLayers(L: Layout, w: number, h: number, dpr: number, family: string) {
  const fs = L.fs, depth = fs * 0.05, line = fs * 0.055;
  const shadow = canvas(w, h, dpr), fill = canvas(w, h, dpr), outline = canvas(w, h, dpr), shine = canvas(w, h, dpr);

  /* 3D: the letters pushed back down-right, outlined, in indigo. */
  eachLine(L, shadow.x, family, (l) => {
    shadow.x.fillStyle = "#2a1a6a"; shadow.x.lineJoin = "round";
    for (let d = depth; d > 0; d -= 1) { shadow.x.fillText(l.text, l.x + d, l.base + d); }
    shadow.x.strokeStyle = INK; shadow.x.lineWidth = line; shadow.x.strokeText(l.text, l.x + depth, l.base + depth);
      });

  /* Fill: a sunset through each line, a light wave, a few bubbles. */
  eachLine(L, fill.x, family, (l) => {
    const g = fill.x.createLinearGradient(0, l.base - fs * 0.78, 0, l.base);
    FILL.forEach((c, i) => g.addColorStop(i / (FILL.length - 1), c));
    fill.x.fillStyle = g; fill.x.fillText(l.text, l.x, l.base);
    fill.x.globalCompositeOperation = "source-atop";
    const width = fill.x.measureText(l.text).width;
    fill.x.fillStyle = "rgba(255,246,200,.38)";
    fill.x.beginPath();
    for (let x = l.x - fs; x <= l.x + width + fs; x += fs * 0.05) { const y = l.base - fs * 0.52 + Math.sin((x - l.x) / (fs * 0.55)) * fs * 0.06; if (x === l.x - fs) fill.x.moveTo(x, y); else fill.x.lineTo(x, y); }
    for (let x = l.x + width + fs; x >= l.x - fs; x -= fs * 0.05) { const y = l.base - fs * 0.41 + Math.sin((x - l.x) / (fs * 0.55) + 0.8) * fs * 0.05; fill.x.lineTo(x, y); }
    fill.x.closePath(); fill.x.fill();
    fill.x.fillStyle = "rgba(255,255,255,.28)";
    for (let i = 0; i < l.text.length; i++) { const bx = l.x + (i + 0.3) * (width / l.text.length), by = l.base - fs * (0.18 + (i % 3) * 0.05); fill.x.beginPath(); fill.x.arc(bx, by, fs * (0.03 + (i % 2) * 0.02), 0, Math.PI * 2); fill.x.fill(); }
    fill.x.globalCompositeOperation = "source-over";
  });

  /* Outline. */
  eachLine(L, outline.x, family, (l) => {
    outline.x.strokeStyle = INK; outline.x.lineWidth = line; outline.x.lineJoin = "round"; outline.x.strokeText(l.text, l.x, l.base);
  });

  /* Shine: a streak on each letter, kept inside it, and a few sparkles. */
  const streaks = canvas(w, h, dpr);
  eachLine(L, streaks.x, family, (l) => {
    const width = streaks.x.measureText(l.text).width;
    streaks.x.strokeStyle = "rgba(255,255,255,.92)"; streaks.x.lineCap = "round";
    for (let i = 0; i < l.text.length; i++) {
      if (l.text[i] === " ") continue;
      const sx = l.x + (i + 0.22) * (width / l.text.length), sy = l.base - fs * 0.62;
      streaks.x.lineWidth = fs * 0.035; streaks.x.beginPath(); streaks.x.moveTo(sx, sy + fs * 0.12); streaks.x.lineTo(sx + fs * 0.02, sy); streaks.x.stroke();
      streaks.x.lineWidth = fs * 0.02; streaks.x.beginPath(); streaks.x.moveTo(sx + fs * 0.05, sy + fs * 0.06); streaks.x.lineTo(sx + fs * 0.06, sy); streaks.x.stroke();
    }
    streaks.x.globalCompositeOperation = "destination-in"; streaks.x.fillStyle = "#000"; streaks.x.fillText(l.text, l.x, l.base); streaks.x.globalCompositeOperation = "source-over";
  });
  shine.x.drawImage(streaks.c, 0, 0, w, h);
  /* Sparkles at the corners a writer would catch with white. */
  const sparkles: Pt[] = [];
  L.lines.forEach((l, i) => {
    const gs = L.glyphs.filter((g) => g.line === i);
    if (!gs.length) return;
    const a = gs[0], b = gs[gs.length - 1];
    if (i % 2 === 0) sparkles.push(onWall(L, i, a.x0 + fs * 0.04, a.y0 + fs * 0.02));
    else sparkles.push(onWall(L, i, b.x1 - fs * 0.04, b.y0 + fs * 0.04));
  });
  for (const p of sparkles) star(shine.x, p.x, p.y, fs * 0.16);

  return { shadow, fill, outline, shine, sparkles };
}

export function star(x: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  x.save(); x.fillStyle = "#fff"; x.shadowColor = "rgba(255,255,255,.9)"; x.shadowBlur = r * 0.6;
  x.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.16 : r; x.lineTo(cx + Math.cos(a - Math.PI / 2) * rr, cy + Math.sin(a - Math.PI / 2) * rr); }
  x.closePath(); x.fill(); x.restore();
}

/* Low-resolution alpha of a layer, to keep the nozzle where its paint is. */
export function alphaMap(src: HTMLCanvasElement, w: number, h: number, q = 4) {
  const mw = Math.ceil(w / q), mh = Math.ceil(h / q);
  const c = document.createElement("canvas"); c.width = mw; c.height = mh;
  const x = c.getContext("2d")!; x.drawImage(src, 0, 0, mw, mh);
  const d = x.getImageData(0, 0, mw, mh).data;
  return (px: number, py: number) => { const i = (Math.floor(py / q) * mw + Math.floor(px / q)) * 4 + 3; return i >= 0 && i < d.length ? d[i] : 0; };
}

/* A nozzle's route through a line: broad arm sweeps, back and forth,
   from the top of the letters to the bottom, each with a slight swing. */
export function sweeps(L: Layout, R: number, grow: number, below = 0): { pts: Pt[]; line: number; glyphs: number[] }[] {
  return L.lines.map((l, li) => {
    const y0 = l.base - L.fs * 0.78 - grow, y1 = l.base + L.fs * 0.02 + grow + below;
    const x0 = l.x - grow - R * 0.3, x1 = l.x + l.lw + grow + R * 0.3;
    const n = Math.max(2, Math.ceil((y1 - y0 - R * 0.9) / (R * 0.95)) + 1);
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const y = y0 + R * 0.45 + ((y1 - y0 - R * 0.9) * i) / (n - 1);
      const ltr = i % 2 === 0, steps = Math.max(4, Math.round((x1 - x0) / (L.fs * 0.35)));
      for (let k = 0; k <= steps; k++) {
        const f = k / steps, x = ltr ? x0 + (x1 - x0) * f : x1 - (x1 - x0) * f;
        pts.push(onWall(L, li, x, y + Math.sin(f * Math.PI * 2 + i) * R * 0.18));
      }
    }
    const glyphs = L.glyphs.map((g, gi) => (g.line === li ? gi : -1)).filter((gi) => gi >= 0);
    return { pts, line: li, glyphs };
  });
}
