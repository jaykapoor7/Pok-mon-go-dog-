import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { HexPlate, type Box, type PlateCell } from "@/components/system/HexPlate";

/* ════════════════════════════════════════════════════════════════════
   Street → locality → city.

   The same place at three scales, drawn in the cells the map uses. The
   street plate puts one dot in the cell for every animal recorded there —
   placed inside the cell, not at a false address, because an imported
   record is known to its locality and no finer. The locality plate
   outlines the cells that carry its name. The city plate is the whole
   recorded footprint. Each one opens the live map at that scale.
   ════════════════════════════════════════════════════════════════════ */

type Cell = { key: string; ring: number[]; animals: number; open: number };

const RAMP = ["var(--sp-seq-1)", "var(--sp-seq-2)", "var(--sp-seq-3)", "var(--sp-seq-4)", "var(--sp-seq-5)"];
function rampFor(cells: Cell[]) {
  const v = cells.map((c) => c.animals).filter((x) => x > 0).sort((a, b) => a - b);
  const q = [0.3, 0.55, 0.78, 0.92].map((f) => v[Math.floor(f * (v.length - 1))] ?? 1);
  return (n: number) => (n <= 0 ? "transparent" : RAMP[q.findIndex((b) => n <= b) === -1 ? 4 : q.findIndex((b) => n <= b)]);
}
const boxOf = (cells: Cell[], pad = 0.002): Box => {
  let w = 180, s = 90, e = -180, n = -90;
  for (const c of cells) for (let i = 0; i < c.ring.length; i += 2) { w = Math.min(w, c.ring[i]); e = Math.max(e, c.ring[i]); s = Math.min(s, c.ring[i + 1]); n = Math.max(n, c.ring[i + 1]); }
  return [w - pad, s - pad, e + pad, n + pad];
};

/* Deterministic points inside a polygon, so the dots do not move between renders. */
function dotsIn(poly: [number, number][], count: number, seed0 = 7) {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const inside = (x: number, y: number) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  const out: [number, number][] = [];
  let seed = seed0;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  let guard = 0;
  while (out.length < count && guard++ < count * 40) {
    const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
    if (inside(x, y)) out.push([x, y]);
  }
  return out;
}

export function ScaleTriptych({ city, ladder }: {
  city: string;
  ladder: {
    street: { cell: string; center: [number, number]; animals: number; open: number; cells: Cell[] };
    locality: { name: string; animals: number; recordedCells: number; cellCount: number; cells: Cell[]; own: string[] };
    city: { name: string; animals: number; cellCount: number; cells: Cell[]; box: Box };
  };
}) {
  const { street, locality } = ladder;
  const own = new Set(locality.own);
  const fillCity = rampFor(ladder.city.cells);
  const fillLocal = rampFor(locality.cells);

  const streetCells: PlateCell[] = street.cells.map((c) => ({
    key: c.key, ring: c.ring,
    fill: c.animals ? "var(--sp-seq-0)" : "transparent",
    stroke: c.key === street.cell ? "var(--sp-flame-deep)" : undefined,
    dashed: c.animals === 0,
  }));
  const localCells: PlateCell[] = locality.cells.map((c) => ({
    key: c.key, ring: c.ring, fill: c.animals ? fillLocal(c.animals) : "transparent",
    stroke: own.has(c.key) ? "var(--sp-ink)" : undefined, dashed: c.animals === 0,
    opacity: own.has(c.key) ? 1 : 0.5,
  }));
  const cityCells: PlateCell[] = ladder.city.cells.map((c) => ({
    key: c.key, ring: c.ring, fill: c.animals ? fillCity(c.animals) : "var(--sp-seq-0)",
    stroke: c.key === street.cell ? "var(--sp-flame-deep)" : own.has(c.key) ? "var(--sp-ink)" : undefined,
  }));

  // One dot per animal, inside its own cell, for every recorded cell of the patch.
  const dots = street.cells.flatMap((c, ci) => {
    if (!c.animals) return [];
    const poly: [number, number][] = [];
    for (let i = 0; i < c.ring.length; i += 2) poly.push([c.ring[i], c.ring[i + 1]]);
    return dotsIn(poly, Math.min(c.animals, 90), 7 + ci * 131).map((d) => ({ d, focus: c.key === street.cell }));
  });

  const q = (k: string, v: string) => `/map?${k}=${encodeURIComponent(v)}`;

  return (
    <div className="ld-scales">
      <figure className="ld-scale">
        <div className="ld-scale-plate">
          <HexPlate cells={streetCells} box={boxOf(street.cells)} width={320} height={320} label={`One cell in ${locality.name}, with ${street.animals} animals recorded`} scaleBarKm={0.5}>
            {(p) => dots.map(({ d: [x, y], focus }, i) => { const [px, py] = p(x, y); return <circle key={i} cx={px} cy={py} r={2.1} className={`ld-scale-dot ${focus ? "is-focus" : ""}`} />; })}
          </HexPlate>
        </div>
        <figcaption>
          <span className="sys-eyebrow">Street · one cell, 0.74 km²</span>
          <b className="ld-scale-n">{street.animals.toLocaleString("en-IN")}</b>
          <span>animals recorded in one cell of {locality.name}, outlined, and its six neighbours. Each dot is one record, placed inside its cell rather than at an address the register does not hold.</span>
          <Link href={q("cell", street.cell)} className="sys-link">See this cell <ArrowUpRight size={14} /></Link>
        </figcaption>
      </figure>
      <figure className="ld-scale">
        <div className="ld-scale-plate">
          <HexPlate cells={localCells} box={boxOf(locality.cells)} width={320} height={320} label={`Around ${locality.name}: ${locality.animals} animals in ${locality.recordedCells} of ${locality.cellCount} cells`} scaleBarKm={1} />
        </div>
        <figcaption>
          <span className="sys-eyebrow">Neighbourhood · around {locality.name}</span>
          <b className="ld-scale-n">{locality.animals.toLocaleString("en-IN")}</b>
          <span>animals in {locality.recordedCells} of the {locality.cellCount} cells within about three kilometres. The dashed cells have nothing recorded yet — which is not the same as no dogs.</span>
          <Link href={q("q", locality.name)} className="sys-link">Open {locality.name} <ArrowUpRight size={14} /></Link>
        </figcaption>
      </figure>
      <figure className="ld-scale">
        <div className="ld-scale-plate">
          <HexPlate cells={cityCells} box={ladder.city.box} width={320} height={320} label={`${city}: ${ladder.city.animals} animals across ${ladder.city.cellCount} cells`} scaleBarKm={5} />
        </div>
        <figcaption>
          <span className="sys-eyebrow">City · {city}, the sample</span>
          <b className="ld-scale-n">{ladder.city.animals.toLocaleString("en-IN")}</b>
          <span>animals across {ladder.city.cellCount} cells: the recorded footprint of one partner&apos;s rescue register, not a census of the city&apos;s dogs.</span>
          <Link href={q("city", city)} className="sys-link">Open the city <ArrowUpRight size={14} /></Link>
        </figcaption>
      </figure>
    </div>
  );
}
