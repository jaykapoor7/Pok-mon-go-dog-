/* ════════════════════════════════════════════════════════════════════
   Round areas.

   The unit of place is still the H3 cell; only its drawing changes. Each
   cell is drawn as a circle inscribed in its hexagon and slightly inset,
   so neighbouring areas read as soft separate marks rather than a
   honeycomb. The circle never extends beyond its own cell, so nothing is
   drawn finer or wider than the record allows.
   ════════════════════════════════════════════════════════════════════ */

import { cellToBoundary } from "h3-js";

const STEPS = 36;

/** A closed circular ring inside a cell boundary ([lng, lat] pairs). */
export function roundRing(ring: [number, number][], inset = 0.9): [number, number][] {
  const pts = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring.slice(0, -1) : ring;
  if (pts.length < 3) return ring;
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x; cy += y; }
  cx /= pts.length; cy /= pts.length;
  const k = Math.cos((cy * Math.PI) / 180) || 1;
  let r = 0;
  for (const [x, y] of pts) r += Math.hypot((x - cx) * k, y - cy);
  r = (r / pts.length) * 0.866 * inset; // inradius of a hexagon, then inset
  const out: [number, number][] = [];
  for (let i = 0; i <= STEPS; i++) {
    const a = (i / STEPS) * Math.PI * 2;
    out.push([cx + (Math.cos(a) * r) / k, cy + Math.sin(a) * r]);
  }
  return out;
}

/** The round area of an H3 cell, GeoJSON order. */
export function roundCell(h3: string, inset = 0.9): [number, number][] {
  return roundRing(cellToBoundary(h3, true) as [number, number][], inset);
}
