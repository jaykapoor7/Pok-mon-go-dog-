/* Cartography from the records themselves.

   There is no city boundary in StrayPaw's data and no ward geometry for
   Coimbatore, so the lab does not borrow one. The shape of each city is
   drawn from where its animals were actually recorded: a density surface,
   smoothed, and cut into contour lines — the terrain of care — or into a
   hexagonal coverage grid. */

export type Box = [number, number, number, number]; // lng0, lat0, lng1, lat1

/** Density on a lng/lat grid, gaussian-smoothed. */
export function density(points: [number, number][], box: Box, res: number, sigma: number) {
  const [x0, y0, x1, y1] = box;
  const W = Math.ceil((x1 - x0) / res) + 1, H = Math.ceil((y1 - y0) / res) + 1;
  let g = new Float32Array(W * H);
  for (const [x, y] of points) {
    const i = Math.round((x - x0) / res), j = Math.round((y - y0) / res);
    if (i >= 0 && i < W && j >= 0 && j < H) g[j * W + i] += 1;
  }
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k: number[] = [];
  let ks = 0;
  for (let t = -r; t <= r; t++) { const v = Math.exp(-(t * t) / (2 * sigma * sigma)); k.push(v); ks += v; }
  for (let t = 0; t < k.length; t++) k[t] /= ks;
  const tmp = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    let s = 0;
    for (let t = -r; t <= r; t++) { const ii = i + t; if (ii >= 0 && ii < W) s += g[j * W + ii] * k[t + r]; }
    tmp[j * W + i] = s;
  }
  const out = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    let s = 0;
    for (let t = -r; t <= r; t++) { const jj = j + t; if (jj >= 0 && jj < H) s += tmp[jj * W + i] * k[t + r]; }
    out[j * W + i] = s;
  }
  g = out;
  let max = 0;
  for (let n = 0; n < g.length; n++) if (g[n] > max) max = g[n];
  return { g, W, H, x0, y0, res, max };
}

type Grid = ReturnType<typeof density>;

/** Marching squares: contour segments at `level`, in lng/lat. */
export function contour(d: Grid, level: number): [number, number][][] {
  const { g, W, H, x0, y0, res } = d;
  const segs: [number, number][][] = [];
  const at = (i: number, j: number) => g[j * W + i];
  const lerp = (i0: number, j0: number, v0: number, i1: number, j1: number, v1: number): [number, number] => {
    const t = v1 === v0 ? 0.5 : (level - v0) / (v1 - v0);
    return [x0 + (i0 + (i1 - i0) * t) * res, y0 + (j0 + (j1 - j0) * t) * res];
  };
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), e = at(i, j + 1);
    const idx = (a >= level ? 1 : 0) | (b >= level ? 2 : 0) | (c >= level ? 4 : 0) | (e >= level ? 8 : 0);
    if (idx === 0 || idx === 15) continue;
    const E0 = () => lerp(i, j, a, i + 1, j, b);
    const E1 = () => lerp(i + 1, j, b, i + 1, j + 1, c);
    const E2 = () => lerp(i, j + 1, e, i + 1, j + 1, c);
    const E3 = () => lerp(i, j, a, i, j + 1, e);
    switch (idx) {
      case 1: case 14: segs.push([E3(), E0()]); break;
      case 2: case 13: segs.push([E0(), E1()]); break;
      case 3: case 12: segs.push([E3(), E1()]); break;
      case 4: case 11: segs.push([E1(), E2()]); break;
      case 6: case 9: segs.push([E0(), E2()]); break;
      case 7: case 8: segs.push([E3(), E2()]); break;
      case 5: segs.push([E3(), E2()], [E0(), E1()]); break;
      case 10: segs.push([E0(), E3()], [E1(), E2()]); break;
    }
  }
  return join(segs);
}

/** Stitch segments end to end so a contour draws as one line, not dashes. */
function join(segs: [number, number][][]): [number, number][][] {
  const key = (p: [number, number]) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`;
  const byStart = new Map<string, number[]>();
  segs.forEach((s, n) => { const k = key(s[0]); (byStart.get(k) ?? byStart.set(k, []).get(k)!).push(n); });
  const used = new Uint8Array(segs.length);
  const lines: [number, number][][] = [];
  for (let n = 0; n < segs.length; n++) {
    if (used[n]) continue;
    used[n] = 1;
    const line = [...segs[n]];
    for (;;) {
      const next = (byStart.get(key(line[line.length - 1])) ?? []).find((m) => !used[m]);
      if (next === undefined) break;
      used[next] = 1;
      line.push(segs[next][1]);
    }
    lines.push(line);
  }
  return lines;
}

/** Contours at several levels as one GeoJSON collection. */
export function contours(points: [number, number][], box: Box, opts: { res?: number; sigma?: number; levels?: number } = {}) {
  const d = density(points, box, opts.res ?? 0.004, opts.sigma ?? 2.2);
  const n = opts.levels ?? 9;
  const features: GeoJSON.Feature[] = [];
  if (d.max <= 0) return { type: "FeatureCollection" as const, features, max: 0 };
  for (let l = 1; l <= n; l++) {
    // Levels are spaced on a square-root scale so the quiet edges of the
    // city get lines too, not only its busiest cores.
    const level = d.max * Math.pow(l / (n + 1), 1.7);
    const lines = contour(d, level);
    if (lines.length) features.push({ type: "Feature", properties: { l, of: n, index: l % 4 === 0 }, geometry: { type: "MultiLineString", coordinates: lines } });
  }
  return { type: "FeatureCollection" as const, features, max: d.max };
}

/** Hexagonal bins in a locally-flat lng/lat plane. */
export function hexbin<T>(items: T[], ll: (t: T) => [number, number], lat0: number, sizeKm: number) {
  const k = Math.cos((lat0 * Math.PI) / 180);
  const r = sizeKm / 111; // hex radius in degrees of latitude
  const w = Math.sqrt(3) * r, h = 1.5 * r;
  const bins = new Map<string, { q: number; row: number; items: T[] }>();
  for (const t of items) {
    const [lng, lat] = ll(t);
    const x = lng * k, y = lat;
    let row = Math.round(y / h);
    let q = Math.round(x / w - (row & 1 ? 0.5 : 0));
    // nearest of the candidate neighbours
    let best = Infinity, bq = q, br = row;
    for (let dr = -1; dr <= 1; dr++) for (let dq = -1; dq <= 1; dq++) {
      const rr = row + dr, qq = q + dq;
      const cx = (qq + (rr & 1 ? 0.5 : 0)) * w, cy = rr * h;
      const dd = (cx - x) ** 2 + (cy - y) ** 2;
      if (dd < best) { best = dd; bq = qq; br = rr; }
    }
    q = bq; row = br;
    const key = `${q}:${row}`;
    (bins.get(key) ?? bins.set(key, { q, row, items: [] }).get(key)!).items.push(t);
  }
  return [...bins.values()].map((b) => {
    const cx = (b.q + (b.row & 1 ? 0.5 : 0)) * w, cy = b.row * h;
    const ring: [number, number][] = [];
    for (let a = 0; a < 6; a++) {
      const ang = (Math.PI / 180) * (60 * a - 30);
      ring.push([(cx + r * 0.94 * Math.cos(ang)) / k, cy + r * 0.94 * Math.sin(ang)]);
    }
    ring.push(ring[0]);
    return { key: `${b.q}:${b.row}`, center: [cx / k, cy] as [number, number], ring, items: b.items };
  });
}

/** A flat projection for drawing a box into an SVG. */
export function projector(box: Box, width: number, height: number, pad = 0) {
  const [x0, y0, x1, y1] = box;
  const k = Math.cos((((y0 + y1) / 2) * Math.PI) / 180);
  const sx = (width - pad * 2) / ((x1 - x0) * k), sy = (height - pad * 2) / (y1 - y0);
  const s = Math.min(sx, sy);
  const ox = (width - (x1 - x0) * k * s) / 2, oy = (height - (y1 - y0) * s) / 2;
  const p = (lng: number, lat: number): [number, number] => [ox + (lng - x0) * k * s, height - (oy + (lat - y0) * s)];
  const kmPx = (s / 111);
  return { p, kmPx };
}

/** Kilometres between two points. */
export function km(a: [number, number], b: [number, number]) {
  const k = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot((a[0] - b[0]) * 111 * k, (a[1] - b[1]) * 111);
}

/** Line segments as an SVG path. */
export function pathOf(lines: [number, number][][], p: (lng: number, lat: number) => [number, number]) {
  let d = "";
  for (const line of lines) line.forEach(([x, y], i) => { const [px, py] = p(x, y); d += `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`; });
  return d;
}
