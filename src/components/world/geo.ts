/* ════════════════════════════════════════════════════════════════════
   The world's geometry: one real neighbourhood (baked by
   scripts/bake-mural.mjs) in z16 Web Mercator pixels around its centre,
   and the arithmetic that keeps the painting, the canvas and the live
   map in one coordinate system.
   ════════════════════════════════════════════════════════════════════ */

export type Pt = [number, number];
export type Road = { k: number; p: Pt[] };
export type Mural = {
  name: string; city: string; centre: Pt; zoom: number; half: number; source: string;
  roads: Road[]; rail: Pt[][]; water: Pt[][]; rivers: Road[]; parks: Pt[][];
  buildings: [number, number, number][];
  pois: { k: string; p: Pt; n: string }[];
  places: { n: string; p: Pt; k: string }[];
};

const W0 = 256;
export const merc = ([lng, lat]: Pt, z: number): Pt => {
  const s = Math.sin((lat * Math.PI) / 180), w = W0 * 2 ** z;
  return [((lng + 180) / 360) * w, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * w];
};
export const unmerc = ([x, y]: Pt, z: number): Pt => {
  const w = W0 * 2 ** z, lng = (x / w) * 360 - 180, n = Math.PI - (2 * Math.PI * y) / w;
  return [lng, (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))];
};
/** lng/lat → mural units (z16 px from the centre) and back. */
export const toLocal = (m: Mural, ll: Pt): Pt => { const [cx, cy] = merc(m.centre, m.zoom), [x, y] = merc(ll, m.zoom); return [x - cx, y - cy]; };
export const toLngLat = (m: Mural, p: Pt): Pt => { const [cx, cy] = merc(m.centre, m.zoom); return unmerc([cx + p[0], cy + p[1]], m.zoom); };

/* ── deterministic noise: the hand's wobble is the same on every render ── */
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export const rnd = (i: number, k = 0) => hash(i * 1.37 + k * 9.1, k * 3.7 - i * 0.61);
export function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Resample a polyline so no segment is longer than `step` (the wobble needs points to bend). */
export function resample(p: Pt[], step: number): Pt[] {
  const out: Pt[] = [p[0]];
  for (let i = 1; i < p.length; i++) {
    const [ax, ay] = p[i - 1], [bx, by] = p[i], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return out;
}

/** The painted line: each point pushed along its normal by a slow noise, so streets wander like a brush. */
export function wobble(p: Pt[], amp: number, seed: number): Pt[] {
  return p.map(([x, y], i) => {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
    const o = (noise(x * 0.012 + seed, y * 0.012) - 0.5) * 2 * amp;
    return [x + nx * o, y + ny * o];
  });
}

/** Squared distance from a point to a segment. */
export function segDist2(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
  const x = ax + dx * t - px, y = ay + dy * t - py; return x * x + y * y;
}

/** MapLibre's exponential zoom interpolation, to match the live map's line widths exactly. */
export function zx(z: number, base: number, stops: number[]) {
  if (z <= stops[0]) return stops[1];
  for (let i = 2; i < stops.length; i += 2) {
    if (z <= stops[i]) {
      const z0 = stops[i - 2], z1 = stops[i], v0 = stops[i - 1], v1 = stops[i + 1];
      const t = base === 1 ? (z - z0) / (z1 - z0) : (base ** (z - z0) - 1) / (base ** (z1 - z0) - 1);
      return v0 + (v1 - v0) * t;
    }
  }
  return stops[stops.length - 1];
}

/** The live folk ground's roads at a zoom, in screen px: [casing, fill] widths and colours (src/sp/map/ground.ts). */
export function mapRoad(k: number, z: number) {
  if (k >= 2) return { cw: zx(z, 1.4, [7, 0.5, 10, 1.4, 12, 3, 14, 6.5, 18, 26]), fw: zx(z, 1.4, [9.5, 0.3, 12, 1.6, 14, 4, 18, 22]), cc: [211, 196, 171], fc: [255, 253, 249] };
  return { cw: zx(z, 1.4, [12.5, 1.6, 16, 7, 18, 16]), fw: zx(z, 1.4, [12.5, 0.8, 16, 5, 18, 13]), cc: [220, 207, 186], fc: [255, 253, 249] };
}
