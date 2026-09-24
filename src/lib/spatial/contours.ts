/* ════════════════════════════════════════════════════════════════════
   Density as terrain.

   Recorded animals, smoothed into a surface (a Gaussian kernel of a few
   hundred metres) and cut into contour bands, the way a survey map draws
   height. A ridge is where many animals are recorded close together; the
   lowest band is the edge of the record, not the edge of the population.

   Computed per city on a local metre grid, so a city on the far side of
   the country never shares a grid with this one.
   ════════════════════════════════════════════════════════════════════ */

import { contours } from "d3-contour";

export type WeightedPoint = { lng: number; lat: number; w: number; city: number };

/** Animals per km² at which a band starts. */
export const LEVELS = [3, 6, 10, 16, 25, 40, 60];

const M_PER_DEG = 111_320;

export function densityContours(points: WeightedPoint[], sigmaM = 620, stepM = 120): GeoJSON.FeatureCollection {
  const byCity = new Map<number, WeightedPoint[]>();
  for (const p of points) if (p.w > 0) byCity.set(p.city, [...(byCity.get(p.city) ?? []), p]);
  const features: GeoJSON.Feature[] = [];

  for (const pts of byCity.values()) {
    const lat0 = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const kx = M_PER_DEG * Math.cos((lat0 * Math.PI) / 180), ky = M_PER_DEG;
    const pad = sigmaM * 3.5;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { const x = p.lng * kx, y = p.lat * ky; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
    const step = Math.max(stepM, Math.max(x1 - x0, y1 - y0) / 260);
    const nx = Math.ceil((x1 - x0) / step) + 1, ny = Math.ceil((y1 - y0) / step) + 1;
    const grid = new Float64Array(nx * ny);
    const r = Math.ceil((sigmaM * 3) / step);
    const norm = 1e6 / (2 * Math.PI * sigmaM * sigmaM); // per km²
    const kern: number[] = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) kern.push(Math.exp(-((dx * step) ** 2 + (dy * step) ** 2) / (2 * sigmaM * sigmaM)) * norm);
    for (const p of pts) {
      const gx = Math.round((p.lng * kx - x0) / step), gy = Math.round((p.lat * ky - y0) / step);
      let k = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yy = gy + dy;
        for (let dx = -r; dx <= r; dx++, k++) {
          const xx = gx + dx;
          if (xx < 0 || yy < 0 || xx >= nx || yy >= ny) continue;
          grid[yy * nx + xx] += kern[k] * p.w;
        }
      }
    }
    const peak = grid.reduce((m, v) => Math.max(m, v), 0);
    const levels = LEVELS.filter((l) => l <= peak);
    if (!levels.length) continue;
    const bands = contours().size([nx, ny]).thresholds(levels)(Array.from(grid));
    for (const b of bands) {
      if (!b.coordinates.length) continue;
      const coordinates = b.coordinates.map((poly) => poly.map((ring) => ring.map(([gx, gy]) => [
        Math.round(((x0 + gx * step) / kx) * 1e5) / 1e5,
        Math.round(((y0 + gy * step) / ky) * 1e5) / 1e5,
      ])));
      features.push({ type: "Feature", properties: { v: b.value, rank: LEVELS.indexOf(b.value) }, geometry: { type: "MultiPolygon", coordinates } });
    }
  }
  return { type: "FeatureCollection", features };
}
