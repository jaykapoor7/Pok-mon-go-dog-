/* ════════════════════════════════════════════════════════════════════
   Painted India, drawn without WebGL: the outline inked twice and every
   recorded area as a vermilion point. Server-rendered, so it needs
   nothing to load (the company pages' closing band, the homepage's
   proof of coverage).
   ════════════════════════════════════════════════════════════════════ */

import { INDIA_PATH, INDIA_VIEW, indiaXY } from "@/sp/atlas/india-path";
import type { Cell } from "@/components/bindu/mapkit";

/* The vector first frame: India's outline and every recorded area, drawn without WebGL. */
export function VectorIndia({ cells, className = "vi" }: { cells: Cell[]; className?: string }) {
  const top = Math.sqrt(Math.max(1, ...cells.map((c) => c[2])));
  return (
    <svg className={className} viewBox={`-4 -4 ${INDIA_VIEW.w + 8} ${INDIA_VIEW.h + 8}`} aria-hidden>
      <path d={INDIA_PATH} className="vi-echo" transform="translate(0.9 0.7)" />
      <path d={INDIA_PATH} className="vi-land" />
      {cells.map(([lng, lat, n], i) => { const [x, y] = indiaXY(lng, lat); return <circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} r={(0.35 + (Math.sqrt(n) / top) * 1.1).toFixed(2)} className="vi-pt" style={{ ["--i" as string]: i % 40 }} />; })}
    </svg>
  );
}
