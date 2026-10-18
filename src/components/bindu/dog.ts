/* ════════════════════════════════════════════════════════════════════
   The dog. An original drawing made for StrayPaw: an Indian street dog,
   sitting, ears up, tail curled over its back, in the manner of Gond
   painting, where a figure is a line filled with bands of dots and
   dashes that follow its edge. It is not a copy of any artist's work.

   Everything here is pure geometry in a 0–100 box, shared by the canvas
   particles (hero and finale) and the SVG drawings (the identity cards).
   ════════════════════════════════════════════════════════════════════ */

type P = [number, number];

/* The silhouette, standing, facing left, clockwise from the nose: ears up, four legs, the tail
   curled over the back the way India's street dogs carry it. A Catmull-Rom curve draws it. */
const OUTLINE: P[] = [
  [6, 45], [10, 42], [15, 40], [19, 37], [21, 33], [22.5, 28], [25, 19], [28.5, 26], [31, 30], [35, 36],
  [42, 41], [55, 42.5], [68, 42.5], [77, 43], [81, 41], [86, 36], [89.5, 29], [88.5, 23], [84, 21], [80.5, 24],
  [82.5, 27.5], [84.5, 30.5], [82, 36], [79, 45], [82, 52], [83.5, 61], [84.5, 69], [86, 77], [86.5, 83],
  [80.5, 84], [79, 76], [76.5, 68], [75, 72], [74.5, 79], [74.5, 84], [69, 84], [69.5, 76], [70, 66], [66, 61],
  [56, 62], [46, 61], [44, 66], [44.5, 75], [45, 84], [39.5, 84], [39, 76], [38, 69], [36.5, 75], [36.5, 84],
  [31, 84], [31.5, 75], [31.5, 65], [30, 57], [27, 52], [22, 49], [16, 48.5], [10, 48], [6.5, 47.5],
];
export const DOG_EYE: P = [18.5, 41];

/* Closed Catmull-Rom spline through the outline, as SVG path data and as a dense polygon. */
function spline(pts: P[], perSeg = 8) {
  const n = pts.length, poly: P[] = [];
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0]},${p2[1]}`;
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg, u = 1 - t;
      poly.push([u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0], u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]]);
    }
  }
  return { d: `${d} Z`, poly };
}
const SHAPE = spline(OUTLINE);
export const DOG_PATH = SHAPE.d;
const POLY = SHAPE.poly;

function inside([x, y]: P, poly: P[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
/* Distance to the outline, and the outline's direction there (so dashes lie along the edge, as a Gond painter lays them). */
function edge([x, y]: P, poly: P[]) {
  let best = Infinity, ang = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    const ex = ax + t * dx - x, ey = ay + t * dy - y, d = ex * ex + ey * ey;
    if (d < best) { best = d; ang = Math.atan2(dy, dx); }
  }
  return { d: Math.sqrt(best), ang };
}

/* A dot of the painting: where it sits, which band of colour it belongs to, and whether it is a dash. */
export type Mark = { x: number; y: number; band: number; dash: boolean; ang: number; rim: boolean; eye: boolean };

/** The painting as marks. `gap` is the spacing in box units: smaller is denser. Deterministic. */
export function paintDog(gap = 1.6): Mark[] {
  const out: Mark[] = [];
  /* The rim: the outline itself, in evenly spaced dots. */
  let acc = 0;
  for (let i = 0; i < POLY.length; i++) {
    const a = POLY[i], b = POLY[(i + 1) % POLY.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    acc += l;
    if (acc >= gap * 0.85) { acc = 0; out.push({ x: a[0], y: a[1], band: 0, dash: false, ang: 0, rim: true, eye: false }); }
  }
  /* The fill: staggered rows, banded by distance from the edge; every other band is laid in dashes. */
  const rowH = gap * 0.88;
  for (let r = 0, y = 2; y < 98; r++, y += rowH) {
    for (let x = 6 + (r % 2 ? gap / 2 : 0); x < 92; x += gap) {
      const pt: P = [x, y];
      if (!inside(pt, POLY)) continue;
      const { d, ang } = edge(pt, POLY);
      if (d < gap * 0.7) continue;
      const eye = Math.hypot(x - DOG_EYE[0], y - DOG_EYE[1]) < 1.5;
      const band = 1 + Math.floor((d - gap * 0.7) / 2.1);
      out.push({ x, y, band, dash: band % 2 === 0 && !eye, ang, rim: false, eye });
    }
  }
  return out;
}

/* The painting's palette, warm earth and festival colours. Band 0 is the rim. */
export const FOLK = ["#fff3dc", "#f05b40", "#f2b632", "#e7739a", "#3fa37a", "#f28c38", "#7fb3ff", "#ffd27a"];
