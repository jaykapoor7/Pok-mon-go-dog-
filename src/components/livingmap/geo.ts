/* Geometry for the Living Map: round areas, the bordering "no record yet"
 * ring, schematic animal positions and the hatch used for "unknown". */


/** Area disc radius: an H3 r8 area is ≈0.74 km², edge ≈0.46 km. A 0.42 km disc
 *  keeps neighbouring areas just apart, so each reads as one place. */
export const AREA_KM = 0.42;


export function disc([lng, lat]: [number, number], km = AREA_KM, steps = 40): [number, number][] {
  const dy = km / 110.574, dx = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) { const t = (i / steps) * Math.PI * 2; ring.push([lng + dx * Math.cos(t), lat + dy * Math.sin(t)]); }
  return ring;
}

/** Schematic positions for n animals inside an area: a sunflower (phyllotaxis)
 *  spiral, so a count reads at a glance and no dot pretends to be a location. */
export function seedHead([lng, lat]: [number, number], n: number, km = AREA_KM * 0.86): [number, number][] {
  const dy = km / 110.574, dx = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const golden = Math.PI * (3 - Math.sqrt(5));
  /* A few animals sit together near the middle; only a full area fills the disc. */
  const spread = n <= 1 ? 0 : Math.min(1, 0.22 + Math.sqrt(n) / 8);
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const r = spread * Math.sqrt((i + 0.5) / n), t = i * golden;
    pts.push([lng + dx * r * Math.cos(t), lat + dy * r * Math.sin(t)]);
  }
  return pts;
}

export function bounds(points: [number, number][], pad = 0.02): [[number, number], [number, number]] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [x, y] of points) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }
  return [[w - pad, s - pad], [e + pad, n + pad]];
}

/** A diagonal hatch, as an image MapLibre can use for fill-pattern. */
export function hatch(color: string, bg = "rgba(0,0,0,0)", size = 8, width = 1.4) {
  const c = document.createElement("canvas");
  c.width = c.height = size * 2;
  const x = c.getContext("2d")!;
  x.scale(2, 2);
  x.fillStyle = bg; x.fillRect(0, 0, size, size);
  x.strokeStyle = color; x.lineWidth = width; x.lineCap = "square";
  x.beginPath();
  x.moveTo(0, size); x.lineTo(size, 0);
  x.moveTo(-size / 2, size / 2); x.lineTo(size / 2, -size / 2);
  x.moveTo(size / 2, size * 1.5); x.lineTo(size * 1.5, size / 2);
  x.stroke();
  const d = x.getImageData(0, 0, size * 2, size * 2);
  return { width: size * 2, height: size * 2, data: new Uint8Array(d.data.buffer) };
}

export const haversineKm = ([a, b]: [number, number], [c, d]: [number, number]) => {
  const R = 6371, r = Math.PI / 180;
  const x = Math.sin(((d - b) * r) / 2) ** 2 + Math.cos(b * r) * Math.cos(d * r) * Math.sin(((c - a) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

/** A hatched disc as an icon (for "unknown" areas at every scale), 96px across. */
export const DISC_PX = 96;
export function hatchDisc(line: string, bg: string, rim: string, dashed = false) {
  const s = DISC_PX, c = document.createElement("canvas");
  c.width = c.height = s;
  const x = c.getContext("2d")!;
  x.save(); x.beginPath(); x.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2); x.clip();
  x.fillStyle = bg; x.fillRect(0, 0, s, s);
  x.strokeStyle = line; x.lineWidth = 3;
  for (let i = -s; i < s * 2; i += 11) { x.beginPath(); x.moveTo(i, s); x.lineTo(i + s, 0); x.stroke(); }
  x.restore();
  x.strokeStyle = rim; x.lineWidth = 2.5; if (dashed) x.setLineDash([7, 6]);
  x.beginPath(); x.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2); x.stroke();
  const d = x.getImageData(0, 0, s, s);
  return { width: s, height: s, data: new Uint8Array(d.data.buffer) };
}

/** Bounds of the core of a set of points: the outer few percent are left out, so
 *  one far-flung area does not shrink a whole city to a speck. */
export function coreBounds(points: [number, number][], trim = 0.04, pad = 0.015): [[number, number], [number, number]] {
  if (points.length < 12) return bounds(points, pad);
  const xs = points.map((p) => p[0]).sort((a, b) => a - b), ys = points.map((p) => p[1]).sort((a, b) => a - b);
  const lo = Math.floor(points.length * trim), hi = Math.ceil(points.length * (1 - trim)) - 1;
  return [[xs[lo] - pad, ys[lo] - pad], [xs[hi] + pad, ys[hi] + pad]];
}
