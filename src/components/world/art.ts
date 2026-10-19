/* ════════════════════════════════════════════════════════════════════
   The painter. Original folk-inspired drawing, made in code.

   A contemporary reading of three Indian painting languages, as
   principles rather than copied works:
     Gond (Madhya Pradesh)       bodies filled with rhythmic dashes and
                                 dots; the line itself carries pattern
     Madhubani (Mithila, Bihar)  double outlines, every field filled,
                                 borders of leaf and fish
     Warli (Maharashtra)         people as two triangles and a circle,
                                 drawn as a single gesture
   Coimbatore's own street furniture is drawn in that hand: flat-roofed
   houses with painted parapets, coconut palms, a gopuram, the canal.

   Everything is drawn in mural units (z16 map pixels) so it sits on the
   real streets. Nothing here depicts a real individual animal: an
   animal is drawn where an area is on the record, and stands for it.
   ════════════════════════════════════════════════════════════════════ */

import { rnd } from "./geo";

export const C = {
  ink: "#0b1e3d", cream: "#f3ede4", ivory: "#fff8ec", paper: "#fffdf9", coral: "#f05b40", coralInk: "#c1391c", blue: "#2457ce",
  saffron: "#f28c38", marigold: "#f2b632", clay: "#a9512d", green: "#3f8f6a", rose: "#d9738f",
  marigoldPale: "#f8e2a6", rosePale: "#f4d2d4", greenPale: "#d4e6cc", bluePale: "#d6e2f5", clayPale: "#ecc9b2", saffronPale: "#f9d2ad",
  water: "#a9c3ee", waterInk: "#5d82cc", leaf: "#5c9e6e", leafDark: "#2f6b4c",
};
type Ctx = CanvasRenderingContext2D;
/* Path2D exists only in the browser: shapes are built on first use */
const P = (d: string) => { let p: Path2D | null = null; return () => (p ??= new Path2D(d)); };

/* ── Gond infill: rows of short dashes clipped to a shape, and a dotted inner rim ── */
function gond(ctx: Ctx, shape: Path2D, box: [number, number, number, number], fill: string, mark: string, kind: "dash" | "dot" | "chevron", seed = 0, gap = 3.2) {
  ctx.fillStyle = fill; ctx.fill(shape);
  ctx.save(); ctx.clip(shape);
  ctx.strokeStyle = mark; ctx.fillStyle = mark; ctx.lineWidth = 0.75; ctx.lineCap = "round";
  const [x0, y0, x1, y1] = box;
  let row = 0;
  for (let y = y0 + 2; y < y1; y += gap, row++) {
    const off = (row % 2) * gap * 0.5 + rnd(seed, row) * 0.6;
    for (let x = x0 + off; x < x1; x += gap * 1.25) {
      if (kind === "dot") { ctx.beginPath(); ctx.arc(x, y, 0.55, 0, 6.283); ctx.fill(); }
      else if (kind === "dash") { ctx.beginPath(); ctx.moveTo(x - 0.9, y + 0.5); ctx.lineTo(x + 0.9, y - 0.5); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(x - 1, y + 0.6); ctx.lineTo(x, y - 0.4); ctx.lineTo(x + 1, y + 0.6); ctx.stroke(); }
    }
  }
  ctx.restore();
}
function outline(ctx: Ctx, shape: Path2D, w = 1.3) { ctx.strokeStyle = C.ink; ctx.lineWidth = w; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke(shape); }

/* ═════════════════ animals ═════════════════ */
export type Coat = { body: string; mark: string; kind: "dash" | "dot" | "chevron" };
export const COATS: Coat[] = [
  { body: C.saffron, mark: C.ivory, kind: "dash" },
  { body: C.clay, mark: C.marigoldPale, kind: "dot" },
  { body: C.ivory, mark: C.clay, kind: "chevron" },
  { body: C.marigold, mark: C.clay, kind: "dash" },
  { body: "#e8d4b4", mark: C.ink, kind: "dot" },
];

/* An Indian street dog (the pariah): lean, deep-chested, curled tail. Local box 60×40, feet on y=38, facing right. */
const DOG = {
  stand: { body: P("M44 15 C45 11 49 7.5 53 8.5 L58.5 12 C59 13.5 58.5 15 57 15.2 C54 15.6 51 16 48.5 17.5 L47.6 23 C46.5 26 45 27 44.6 29.5 L45.6 38 L42.4 38 L41.2 30 C35 30.6 24 30.6 18.6 29.8 L17.6 38 L14.4 38 L13.2 28.6 C9.4 26.2 9.2 19 13.2 15.6 C20 12.6 34 13.4 44 15 Z"), ear: P("M49.5 9.2 L47.8 2.6 L52.6 8.4 Z"), eye: [53.4, 11.2] as const, tail: [13.4, 16.4] as const, far: [[40, 29.5, 39.2, 37.6], [20, 29.5, 20.8, 37.6]] },
  sit: { body: P("M40 12 C41 8 45 5 49 6 L54.5 9.6 C55 11 54.4 12.6 53 12.8 C50.5 13.2 47.6 13.6 46 15 L45.4 22 C45 26 45.2 32 45.4 38 L42.2 38 L41.4 29 C38 32 34 36 30 38 L20 38 C16 38 15.4 34 18 32 C20 26 22 18 28 14 C32 11.6 36 11.6 40 12 Z"), ear: P("M45.6 6.8 L44 0.6 L48.6 6 Z"), eye: [49.6, 8.8] as const, tail: [19, 36.6] as const, far: [[38.6, 30, 38.4, 37.8]] },
  lie: { body: P("M10 33 C10 26 18 22.6 28 22.6 C36 22.6 41 24.4 44 27 C46 24.6 50 23.6 53 25 L58 28.6 C58.6 30 58 31.4 56.4 31.6 C53.6 32 50.6 32.6 49 34 C47 37 42 38.4 30 38.4 C18 38.4 10 37.4 10 33 Z"), ear: P("M49 25.4 L46.6 20.4 L51.4 24.6 Z"), eye: [52.6, 28] as const, tail: [11, 34] as const, far: [] as number[][] },
};
export type Pose = keyof typeof DOG;
export const POSES: Pose[] = ["stand", "sit", "lie"];

/** The dog's body, ears and eye (the sprite). The tail is drawn live, so it can wag. */
export function dogBody(ctx: Ctx, pose: Pose, coat: Coat, seed: number) {
  const d = DOG[pose];
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  for (const [a, b, c, e] of d.far) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, e); ctx.stroke(); }
  gond(ctx, d.body(), [6, 0, 60, 40], coat.body, coat.mark, coat.kind, seed);
  /* a Madhubani second line, a hair inside the first */
  ctx.save(); ctx.clip(d.body()); ctx.strokeStyle = C.ink; ctx.globalAlpha = 0.35; ctx.lineWidth = 2.6; ctx.stroke(d.body()); ctx.restore();
  outline(ctx, d.body(), 1.35);
  ctx.fillStyle = coat.body; ctx.fill(d.ear()); outline(ctx, d.ear(), 1.2);
  const [ex, ey] = d.eye;
  if (pose === "lie") { ctx.beginPath(); ctx.arc(ex, ey, 1.4, 0.2, Math.PI - 0.2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.9; ctx.stroke(); }
  else { ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(ex, ey, 1.7, 0, 6.283); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.8; ctx.stroke(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(ex + 0.4, ey, 0.8, 0, 6.283); ctx.fill(); }
}
/** The curled tail, wagging with phase w (radians). */
export function dogTail(ctx: Ctx, pose: Pose, w: number) {
  const [tx, ty] = DOG[pose].tail;
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(Math.sin(w) * (pose === "lie" ? 0.08 : 0.32));
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.beginPath();
  if (pose === "stand") { ctx.moveTo(0, 0); ctx.bezierCurveTo(-6.4, -3.4, -7.8, -9.8, -3.8, -13.2); ctx.bezierCurveTo(-2.2, -14.4, -0.4, -13, -1.8, -11.4); }
  else if (pose === "sit") { ctx.moveTo(0, 0); ctx.bezierCurveTo(-6, 0.6, -10, -1.6, -9, -5.6); }
  else { ctx.moveTo(0, 0); ctx.bezierCurveTo(3, 5, 15, 5.6, 23, 3.8); }
  ctx.stroke(); ctx.restore();
}

/* A cat, sitting. Local box 30×30, feet on y=28.6. */
const CAT = P("M14 6 L15.6 1.2 L18 5 C19 4.8 20 4.8 21 5 L23.4 1.2 L25 6 C26 8.4 25.4 11 23.4 12.4 C25.6 15 26.6 20 26 24 C25.6 27 23 28.6 19.6 28.6 L12.6 28.6 C9 28.6 8 26 9.6 24 C11.6 21 12.4 16.4 15.4 12.6 C13.6 11 13.2 8.4 14 6 Z");
export function cat(ctx: Ctx, coat: Coat, w: number, seed: number) {
  ctx.save(); ctx.translate(11, 27); ctx.rotate(Math.sin(w * 0.7) * 0.25);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-7, 1, -9, -3, -6, -6.4); ctx.stroke(); ctx.restore();
  gond(ctx, CAT(), [8, 0, 27, 29], coat.body, coat.mark, coat.kind, seed, 2.6); outline(ctx, CAT(), 1.2);
  ctx.fillStyle = C.ink; for (const x of [17.2, 21.8]) { ctx.beginPath(); ctx.ellipse(x, 8, 0.7, 1.1, 0, 0, 6.283); ctx.fill(); }
}

/* A cow, as Gond painters draw her: a hump, long horns, the body a field of pattern. Box 70×50, feet on y=48. */
const COW = P("M54 16 C56 12 60 10 63 11 L68 16 C68.6 18 67.6 19.6 66 19.8 L63 20.4 C61.6 22 60.4 24 60 27 L60 34 L61 48 L57.6 48 L56 36 L22 36 L20.6 48 L17.2 48 L16.4 34 C12.6 32 11 26 12.8 21 C14 17 18 15 24 15 C30 15 32 11.6 36 11.6 C40 11.6 42 15 54 16 Z");
export function cow(ctx: Ctx, w: number, seed: number) {
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; ctx.lineCap = "round";
  for (const [a, b, c, d] of [[52, 35, 52.6, 47.6], [26, 35, 25.4, 47.6]]) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
  ctx.save(); ctx.translate(13, 21); ctx.rotate(Math.sin(w * 0.6) * 0.18);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-5, 3, -5, 11, -3.4, 17); ctx.stroke(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(-3.4, 18.6, 1.2, 2.2, 0, 0, 6.283); ctx.fill(); ctx.restore();
  gond(ctx, COW(), [10, 8, 70, 50], C.ivory, C.coral, "chevron", seed, 3.6);
  /* a painted saddle-cloth, as cattle wear for Pongal */
  const cloth = new Path2D("M30 16.4 C36 14 46 15 52 17 L50 30 L32 30 Z");
  ctx.save(); ctx.clip(COW()); gond(ctx, cloth, [30, 14, 52, 31], C.coral, C.marigold, "dot", seed + 3, 2.4); ctx.restore();
  outline(ctx, COW(), 1.4);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(60, 11); ctx.bezierCurveTo(58.6, 7, 59, 4, 61.6, 2.6); ctx.moveTo(63.6, 11); ctx.bezierCurveTo(64.6, 7.4, 66.6, 5.6, 69, 5.4); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(63.2, 14.2, 0.9, 0, 6.283); ctx.fill();
}

/* A bird in flight (a myna), wings beating with phase w. Centred on 0,0. */
export function bird(ctx: Ctx, w: number, col = C.ink) {
  const a = Math.sin(w) * 0.7;
  ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(-8, -3 - a * 6); ctx.quadraticCurveTo(-4, -1 - a * 3, 0, 0.6); ctx.quadraticCurveTo(4, -1 - a * 3, 8, -3 - a * 6); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 1, 2.2, 1.4, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = C.marigold; ctx.beginPath(); ctx.moveTo(2, 0.6); ctx.lineTo(3.8, 1.2); ctx.lineTo(2, 1.8); ctx.fill();
}

/* A fish of the Madhubani canal: two arcs, a patterned body, a fan tail. */
export function fish(ctx: Ctx, w: number) {
  const s = Math.sin(w) * 0.12;
  const body = new Path2D("M-10 0 C-5 -5.4 4 -5.4 8 0 C4 5.4 -5 5.4 -10 0 Z");
  ctx.save(); ctx.rotate(s);
  gond(ctx, body, [-10, -6, 9, 6], C.marigold, C.coral, "chevron", 3, 2.2); outline(ctx, body, 1);
  ctx.fillStyle = C.coral; ctx.beginPath(); ctx.moveTo(-9.4, 0); ctx.lineTo(-14, -4); ctx.lineTo(-13, 0); ctx.lineTo(-14, 4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(4.6, -0.8, 0.8, 0, 6.283); ctx.fill();
  ctx.restore();
}

/* ═════════════════ people (Warli) ═════════════════
   Two triangles meeting at the waist, a circle for the head, limbs as
   single strokes. Box 20×34, feet on y=34. */
export type Act = "feed" | "phone" | "walk" | "carry" | "wave" | "sit";
export function person(ctx: Ctx, act: Act, w: number, col = C.ink) {
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const sw = Math.sin(w);
  const seated = act === "sit";
  const by = seated ? 6 : 0;
  ctx.beginPath(); ctx.arc(10, 5 + by, 3, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.moveTo(5.4, 9.4 + by); ctx.lineTo(14.6, 9.4 + by); ctx.lineTo(10, 18 + by); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(10, 18 + by); ctx.lineTo(5.2, 26.6 + by * 0.6); ctx.lineTo(14.8, 26.6 + by * 0.6); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  if (seated) { ctx.moveTo(7, 28); ctx.lineTo(2, 30); ctx.lineTo(2, 34); ctx.moveTo(13, 28); ctx.lineTo(18, 30); ctx.lineTo(18, 34); }
  else if (act === "walk") { ctx.moveTo(8, 26.6); ctx.lineTo(8 - sw * 3.4, 34); ctx.moveTo(12, 26.6); ctx.lineTo(12 + sw * 3.4, 34); }
  else { ctx.moveTo(8, 26.6); ctx.lineTo(7, 34); ctx.moveTo(12, 26.6); ctx.lineTo(13, 34); }
  ctx.stroke();
  ctx.beginPath();
  const sh: [number, number] = [5.8, 10 + by], sr: [number, number] = [14.2, 10 + by];
  switch (act) {
    case "feed": ctx.moveTo(...sh); ctx.lineTo(3, 18 + by); ctx.moveTo(...sr); ctx.lineTo(18, 16 + by + sw * 0.6); ctx.lineTo(21, 20 + by + sw * 0.6); break;
    case "phone": ctx.moveTo(...sh); ctx.lineTo(3.4, 18 + by); ctx.moveTo(...sr); ctx.lineTo(17.6, 14 + by); ctx.lineTo(15.6, 8.4 + by); break;
    case "carry": ctx.moveTo(...sh); ctx.lineTo(16, 14 + by); ctx.moveTo(...sr); ctx.lineTo(19.6, 14.6 + by); break;
    case "wave": ctx.moveTo(...sh); ctx.lineTo(3, 18); ctx.moveTo(...sr); ctx.lineTo(18, 6 + sw * 2); ctx.lineTo(19 + sw * 2, 0.6); break;
    case "sit": ctx.moveTo(...sh); ctx.lineTo(2.6, 18 + by); ctx.moveTo(...sr); ctx.lineTo(18.4, 17 + by); break;
    default: ctx.moveTo(...sh); ctx.lineTo(4 + sw * 2.6, 18); ctx.moveTo(...sr); ctx.lineTo(16 - sw * 2.6, 18);
  }
  ctx.stroke();
  if (act === "feed") { ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(22, 21 + by + sw * 0.6, 3, 0, Math.PI); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.8; ctx.stroke(); }
  if (act === "phone") { ctx.fillStyle = C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.roundRect(14.2, 3 + by, 3.6, 6.2, 0.8); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#25d366"; ctx.beginPath(); ctx.arc(16, 6 + by, 0.9, 0, 6.283); ctx.fill(); }
}

/* ═════════════════ the town ═════════════════ */
const ROOFS = [C.coral, C.saffron, C.clay, C.green, C.blue, C.rose];
const WALLS = [C.marigoldPale, C.rosePale, C.greenPale, C.bluePale, C.saffronPale, C.ivory, C.clayPale];

/** A house, centred on 0,0 at its base. Flat-roofed town houses with painted parapets mostly, a thatched hut now and then. */
export function house(ctx: Ctx, seed: number, s = 1) {
  const v = rnd(seed, 1), wall = WALLS[Math.floor(rnd(seed, 2) * WALLS.length)], roof = ROOFS[Math.floor(rnd(seed, 3) * ROOFS.length)];
  const w = (10 + rnd(seed, 4) * 6) * s, h = (8 + rnd(seed, 5) * 6) * s;
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  if (v < 0.16) {
    /* a hut: a hatched thatch over a clay wall */
    ctx.fillStyle = C.clayPale; ctx.fillRect(-w / 2, -h, w, h);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.9; ctx.strokeRect(-w / 2, -h, w, h);
    ctx.fillStyle = C.marigold; ctx.beginPath(); ctx.moveTo(-w / 2 - 2, -h); ctx.lineTo(0, -h - 8 * s); ctx.lineTo(w / 2 + 2, -h); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.55; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * w / 8, -h - 0.5); ctx.lineTo(i * w / 16, -h - 6.6 * s); ctx.stroke(); }
    ctx.fillStyle = C.ink; ctx.fillRect(-1.4 * s, -5 * s, 2.8 * s, 5 * s);
    return;
  }
  /* a painted town house: wall, a parapet band, a door and window */
  ctx.fillStyle = wall; ctx.fillRect(-w / 2, -h, w, h);
  ctx.fillStyle = roof; ctx.fillRect(-w / 2 - 0.8, -h - 2.4 * s, w + 1.6, 2.6 * s);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.9; ctx.strokeRect(-w / 2, -h, w, h); ctx.strokeRect(-w / 2 - 0.8, -h - 2.4 * s, w + 1.6, 2.6 * s);
  /* parapet scallops */
  ctx.fillStyle = C.paper; for (let x = -w / 2 + 1.6; x < w / 2 - 1; x += 2.6) { ctx.beginPath(); ctx.arc(x, -h - 1.1 * s, 0.55, 0, 6.283); ctx.fill(); }
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(-1.4 * s, 0); ctx.lineTo(-1.4 * s, -4.4 * s); ctx.arc(0, -4.4 * s, 1.4 * s, Math.PI, 0); ctx.lineTo(1.4 * s, 0); ctx.fill();
  if (w > 12) { ctx.fillStyle = roof; ctx.fillRect(w / 2 - 4.4 * s, -h + 2.2 * s, 2.6 * s, 2.6 * s); ctx.strokeRect(w / 2 - 4.4 * s, -h + 2.2 * s, 2.6 * s, 2.6 * s); }
  if (v > 0.82) { ctx.strokeStyle = C.coral; ctx.lineWidth = 0.7; ctx.beginPath(); for (let x = -w / 2 + 1; x < w / 2; x += 2) { ctx.moveTo(x, -1.2); ctx.lineTo(x + 1, -2.2); ctx.lineTo(x + 2, -1.2); } ctx.stroke(); }
}

/** A coconut palm: Coimbatore's tree. Base at 0,0. */
export function palm(ctx: Ctx, seed: number, sway: number, s = 1) {
  const lean = (rnd(seed, 1) - 0.5) * 8 * s, h = (22 + rnd(seed, 2) * 10) * s;
  ctx.strokeStyle = C.clay; ctx.lineWidth = 2.2 * s; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(lean * 0.2, -h * 0.5, lean, -h); ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.5; for (let i = 1; i < 7; i++) { const t = i / 7, x = lean * t * t, y = -h * t; ctx.beginPath(); ctx.moveTo(x - 1, y); ctx.lineTo(x + 1, y - 0.6); ctx.stroke(); }
  ctx.save(); ctx.translate(lean, -h); ctx.rotate(Math.sin(sway) * 0.05);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.48, L = (11 + rnd(seed, i + 4) * 4) * s;
    const ex = Math.cos(a) * L, ey = Math.sin(a) * L * 0.7 + L * 0.35;
    ctx.strokeStyle = i % 2 ? C.green : C.leafDark; ctx.lineWidth = 1.6 * s;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(ex * 0.5, ey * 0.2 - 4 * s, ex, ey); ctx.stroke();
    ctx.lineWidth = 0.7; for (let k = 2; k < 7; k++) { const t = k / 7, x = ex * t, y = (ey * 0.2 - 4 * s) * 2 * t * (1 - t) + ey * t * t; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1.4, y + 2.4); ctx.stroke(); }
  }
  ctx.fillStyle = C.clay; for (const [x, y] of [[-1.4, 1.4], [1.4, 1.6], [0, 2.6]]) { ctx.beginPath(); ctx.arc(x * s, y * s, 1.3 * s, 0, 6.283); ctx.fill(); }
  ctx.restore();
}

/** A Gond tree: a trunk splitting into branches, the crown a field of leaf-dashes. Base at 0,0. */
export function tree(ctx: Ctx, seed: number, sway: number, s = 1) {
  const r = (10 + rnd(seed, 1) * 6) * s, crown = rnd(seed, 2) > 0.5 ? C.green : C.leaf, mark = rnd(seed, 3) > 0.5 ? C.marigold : C.greenPale;
  ctx.strokeStyle = C.ink; ctx.fillStyle = C.clay; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-2 * s, 0); ctx.lineTo(-1.2 * s, -r * 0.9); ctx.lineTo(1.2 * s, -r * 0.9); ctx.lineTo(2 * s, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(0, -r * 1.3); ctx.rotate(Math.sin(sway) * 0.03);
  const lobes = new Path2D();
  for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283 + rnd(seed, 4); lobes.ellipse(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.35, r * 0.6, r * 0.5, a, 0, 6.283); }
  /* outline the union first, then fill over it: one silhouette, no inner seams */
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2; ctx.stroke(lobes);
  gond(ctx, lobes, [-r * 1.2, -r * 1.1, r * 1.2, r * 1.1], crown, mark, "chevron", seed, 2.6);
  ctx.restore();
}

/** A gopuram: a temple tower in painted tiers. Base at 0,0. */
export function temple(ctx: Ctx, s = 1) {
  const tiers = [C.coral, C.marigold, C.blue, C.green, C.rose];
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
  ctx.fillStyle = C.ivory; ctx.fillRect(-14 * s, -10 * s, 28 * s, 10 * s); ctx.strokeRect(-14 * s, -10 * s, 28 * s, 10 * s);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(-3 * s, 0); ctx.lineTo(-3 * s, -6 * s); ctx.arc(0, -6 * s, 3 * s, Math.PI, 0); ctx.lineTo(3 * s, 0); ctx.fill();
  for (let i = 0; i < 5; i++) {
    const y = -10 * s - i * 6 * s, w0 = (12 - i * 2) * s, w1 = (10.6 - i * 2) * s;
    ctx.fillStyle = tiers[i]; ctx.beginPath(); ctx.moveTo(-w0, y); ctx.lineTo(-w1, y - 6 * s); ctx.lineTo(w1, y - 6 * s); ctx.lineTo(w0, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.paper; for (let x = -w1 + 2 * s; x < w1 - 1; x += 3 * s) { ctx.beginPath(); ctx.arc(x, y - 3 * s, 0.7 * s, 0, 6.283); ctx.fill(); }
  }
  const ty = -40 * s;
  ctx.fillStyle = C.marigold; ctx.beginPath(); ctx.ellipse(0, ty - 2 * s, 3 * s, 2.4 * s, 0, 0, 6.283); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, ty - 4.4 * s); ctx.lineTo(0, ty - 8 * s); ctx.stroke();
}

/** Places of care and commerce, drawn as signs a child would recognise. Base at 0,0. */
export function landmark(ctx: Ctx, kind: string, s = 1) {
  if (kind === "temple") return temple(ctx, s * 0.8);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.lineJoin = "round";
  const w = 22 * s, h = 14 * s;
  const wall = kind === "clinic" || kind === "vet" ? C.paper : kind === "school" ? C.marigoldPale : kind === "worship" ? C.greenPale : kind === "office" ? C.bluePale : C.rosePale;
  ctx.fillStyle = wall; ctx.fillRect(-w / 2, -h, w, h); ctx.strokeRect(-w / 2, -h, w, h);
  if (kind === "shop") {
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? C.coral : C.paper; ctx.beginPath(); ctx.moveTo(-w / 2 + (i * w) / 6, -h); ctx.lineTo(-w / 2 + ((i + 1) * w) / 6, -h); ctx.lineTo(-w / 2 + ((i + 1) * w) / 6 + 1, -h + 5 * s); ctx.lineTo(-w / 2 + (i * w) / 6 + 1, -h + 5 * s); ctx.closePath(); ctx.fill(); }
    ctx.strokeRect(-w / 2, -h, w, 5 * s);
  } else {
    ctx.fillStyle = kind === "school" ? C.blue : kind === "worship" ? C.green : C.coral; ctx.beginPath(); ctx.moveTo(-w / 2 - 2, -h); ctx.lineTo(0, -h - 8 * s); ctx.lineTo(w / 2 + 2, -h); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (kind === "clinic" || kind === "vet") { ctx.fillStyle = C.coral; ctx.fillRect(-1.4 * s, -h + 2.2 * s, 2.8 * s, 7.6 * s); ctx.fillRect(-3.8 * s, -h + 4.6 * s, 7.6 * s, 2.8 * s); }
  if (kind === "school") { ctx.beginPath(); ctx.moveTo(w / 2 - 2, -h); ctx.lineTo(w / 2 - 2, -h - 14 * s); ctx.stroke(); ctx.fillStyle = C.saffron; ctx.fillRect(w / 2 - 2, -h - 14 * s, 7 * s, 4 * s); }
  ctx.fillStyle = C.ink; ctx.fillRect(-2 * s, -6 * s, 4 * s, 6 * s);
}

/* ═════════════════ the land ═════════════════ */
/** Handmade paper: a warm field and fibres, so nothing is a flat fill. */
export function paper(ctx: Ctx, w: number, h: number, seed = 1) {
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 0.6;
  for (let i = 0; i < (w * h) / 900; i++) {
    const x = rnd(i, seed) * w, y = rnd(i, seed + 1) * h, a = rnd(i, seed + 2) * 3.14, L = 3 + rnd(i, seed + 3) * 7;
    ctx.strokeStyle = i % 3 ? "rgba(214, 199, 176, 0.5)" : "rgba(255, 253, 249, 0.7)";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.stroke();
  }
}

/** A soft pigment wash, as if laid with a wet brush. */
export function wash(ctx: Ctx, x: number, y: number, r: number, col: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, "rgba(243, 237, 228, 0)");
  ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
}

/** A vine between two places: a living tendril (t = 0) that straightens into a stitched connection (t = 1). */
export function vine(ctx: Ctx, a: [number, number], b: [number, number], t: number, grow: number, seed: number) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const N = Math.max(12, Math.round(L / 6)), amp = (10 + rnd(seed, 1) * 8) * (1 - t), turns = 2 + Math.floor(rnd(seed, 2) * 3);
  const pts: [number, number][] = [];
  for (let i = 0; i <= N * grow; i++) {
    const u = i / N, w = Math.sin(u * Math.PI * turns + seed) * amp * Math.sin(u * Math.PI);
    pts.push([a[0] + dx * u + nx * w, a[1] + dy * u + ny * w]);
  }
  if (pts.length < 2) return;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = t < 0.5 ? C.green : C.coralInk; ctx.globalAlpha = 0.85;
  ctx.lineWidth = 1.6 - t * 0.4; ctx.setLineDash(t > 0.02 ? [3 + t * 1.5, 2.4 * t] : []);
  ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.stroke(); ctx.setLineDash([]);
  /* leaves along the tendril, shed as it straightens */
  if (t < 0.95) {
    ctx.fillStyle = C.leaf; ctx.globalAlpha = 0.85 * (1 - t);
    for (let i = 3; i < pts.length - 2; i += 4) {
      const [x, y] = pts[i], [x2, y2] = pts[i + 1], ang = Math.atan2(y2 - y, x2 - x) + (i % 8 ? 0.9 : -0.9);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.beginPath(); ctx.ellipse(3, 0, 3, 1.3, 0, 0, 6.283); ctx.fill(); ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

/** A Madhubani border of leaves between two lines, along a rectangle. */
export function border(ctx: Ctx, x: number, y: number, w: number, h: number, band = 14) {
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4;
  ctx.strokeRect(x, y, w, h); ctx.strokeRect(x + band, y + band, w - band * 2, h - band * 2);
  ctx.lineWidth = 0.9;
  const leaf = (cx: number, cy: number, a: number, i: number) => {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = i % 2 ? C.coral : C.marigold; ctx.beginPath(); ctx.ellipse(0, 0, band * 0.36, band * 0.18, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.restore();
  };
  const step = band * 1.1; let i = 0;
  for (let u = x + band; u < x + w - band; u += step, i++) { leaf(u, y + band / 2, i % 2 ? 0.5 : -0.5, i); leaf(u, y + h - band / 2, i % 2 ? -0.5 : 0.5, i); }
  for (let v = y + band; v < y + h - band; v += step, i++) { leaf(x + band / 2, v, Math.PI / 2 + (i % 2 ? 0.5 : -0.5), i); leaf(x + w - band / 2, v, Math.PI / 2 + (i % 2 ? -0.5 : 0.5), i); }
}

/* ═════════════════ the four places of the ecosystem ═════════════════ */

/** A Madhubani sun: a face of rays in alternating colours. Centred on 0,0. */
export function sun(ctx: Ctx, r: number, spin: number) {
  ctx.save(); ctx.rotate(spin);
  for (let i = 0; i < 16; i++) {
    ctx.save(); ctx.rotate((i / 16) * 6.283);
    ctx.fillStyle = i % 2 ? C.coral : C.marigold; ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-r * 0.16, -r * 0.92); ctx.quadraticCurveTo(0, -r * 1.6, r * 0.16, -r * 0.92); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  ctx.fillStyle = C.marigold; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, 6.283); ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = C.ink; for (const x of [-r * 0.32, r * 0.32]) { ctx.beginPath(); ctx.ellipse(x, -r * 0.12, r * 0.12, r * 0.07, 0, 0, 6.283); ctx.fill(); }
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, r * 0.12, r * 0.3, 0.3, Math.PI - 0.3); ctx.stroke();
}

/** Ground: a band of earth with Gond grass strokes and a painted edge. From x0 to x1 at baseline y. */
export function ground(ctx: Ctx, x0: number, x1: number, y: number, h: number) {
  ctx.fillStyle = "#e9dcc4"; ctx.fillRect(x0, y, x1 - x0, h);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  ctx.strokeStyle = C.leaf; ctx.lineWidth = 1; ctx.lineCap = "round";
  for (let x = x0 + 4, i = 0; x < x1; x += 9, i++) { const yy = y + 6 + (i % 3) * 7; ctx.beginPath(); ctx.moveTo(x, yy + 4); ctx.lineTo(x - 2, yy); ctx.moveTo(x, yy + 4); ctx.lineTo(x + 2, yy - 0.5); ctx.stroke(); }
}

/** A rescue van with a painted cross. Base at 0,0, facing right. */
export function van(ctx: Ctx, s = 1) {
  ctx.save(); ctx.scale(s, s);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3; ctx.lineJoin = "round";
  const body = new Path2D("M-34 -8 L-34 -30 L10 -30 L22 -18 L34 -16 L34 -8 Z");
  ctx.fillStyle = C.paper; ctx.fill(body); ctx.stroke(body);
  ctx.fillStyle = C.coral; ctx.fillRect(-34, -14, 68, 4); ctx.strokeRect(-34, -14, 68, 4);
  ctx.fillStyle = C.bluePale; ctx.beginPath(); ctx.moveTo(12, -28); ctx.lineTo(20, -19); ctx.lineTo(12, -19); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.coral; ctx.fillRect(-20, -27, 4, 11); ctx.fillRect(-23.5, -23.5, 11, 4);
  for (const x of [-20, 20]) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x, -6, 6, 0, 6.283); ctx.fill(); ctx.fillStyle = C.marigold; ctx.beginPath(); ctx.arc(x, -6, 2.2, 0, 6.283); ctx.fill(); }
  ctx.restore();
}

/** A ward notice board on two legs, painted with a little map: streets and marks. Base at 0,0. */
export function board(ctx: Ctx, s = 1) {
  ctx.save(); ctx.scale(s, s);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-20, -30); ctx.moveTo(22, 0); ctx.lineTo(20, -30); ctx.stroke();
  ctx.fillStyle = C.paper; ctx.fillRect(-34, -64, 68, 40); ctx.strokeRect(-34, -64, 68, 40); ctx.strokeRect(-31, -61, 62, 34);
  ctx.strokeStyle = C.marigold; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-30, -40); ctx.bezierCurveTo(-10, -52, 4, -36, 30, -50); ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-10, -61); ctx.lineTo(-6, -28); ctx.moveTo(14, -61); ctx.lineTo(10, -28); ctx.stroke();
  for (const [x, y, c] of [[-18, -48, C.coral], [6, -42, C.coral], [20, -56, C.marigold], [-2, -34, C.marigold]] as const) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.283); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.6; ctx.stroke(); }
  ctx.restore();
}

/** An unrolled report scroll, its lines and a seal. Centred on 0,0. */
export function scroll(ctx: Ctx, s = 1) {
  ctx.save(); ctx.scale(s, s);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
  ctx.fillStyle = C.ivory; ctx.fillRect(-16, -20, 32, 40); ctx.strokeRect(-16, -20, 32, 40);
  ctx.fillStyle = C.clayPale; for (const y of [-22, 18]) { ctx.beginPath(); ctx.roundRect(-19, y, 38, 5, 2.5); ctx.fill(); ctx.stroke(); }
  ctx.lineWidth = 0.8; for (let y = -13; y < 8; y += 4.4) { ctx.beginPath(); ctx.moveTo(-11, y); ctx.lineTo(y % 2 ? 6 : 10, y); ctx.stroke(); }
  ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(8, 11, 4, 0, 6.283); ctx.fill(); ctx.stroke();
  ctx.restore();
}

/** A ledger on a low table: the register an NGO keeps. Base at 0,0. */
export function ledger(ctx: Ctx, s = 1) {
  ctx.save(); ctx.scale(s, s);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
  ctx.fillStyle = C.clay; ctx.fillRect(-26, -14, 52, 4); ctx.strokeRect(-26, -14, 52, 4);
  ctx.beginPath(); ctx.moveTo(-22, -10); ctx.lineTo(-22, 0); ctx.moveTo(22, -10); ctx.lineTo(22, 0); ctx.stroke();
  ctx.fillStyle = C.paper; ctx.beginPath(); ctx.moveTo(-20, -15); ctx.quadraticCurveTo(-10, -22, 0, -16); ctx.quadraticCurveTo(10, -22, 20, -15); ctx.lineTo(20, -14); ctx.lineTo(-20, -14); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 0.6; for (const x of [-14, -8, 6, 12]) { ctx.beginPath(); ctx.moveTo(x, -17); ctx.lineTo(x + 3, -18); ctx.stroke(); }
  ctx.restore();
}

/** Bunting: triangles strung between two points. */
export function bunting(ctx: Ctx, a: [number, number], b: [number, number], sag: number) {
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.9;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + sag;
  ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(mx, my, ...b); ctx.stroke();
  const cols = [C.coral, C.marigold, C.green, C.blue, C.rose];
  for (let i = 1; i < 10; i++) {
    const t = i / 10, u = 1 - t, x = u * u * a[0] + 2 * u * t * mx + t * t * b[0], y = u * u * a[1] + 2 * u * t * my + t * t * b[1];
    ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}
