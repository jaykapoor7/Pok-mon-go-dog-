"use client";

/* ════════════════════════════════════════════════════════════════════
   The resolve. The page ends where it began: painted India, every
   recorded area a point. The one message from the chain comes home as a flame path
   that lands on the sample city; it rings, and the ring travels out
   until every point on the record is lit. Plays once, when it is
   reached; under reduced motion it is simply drawn lit.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { INDIA_PATH, INDIA_VIEW, indiaXY } from "@/sp/atlas/india-path";
import type { Cell } from "@/components/bindu/mapkit";

export function Resolve({ cells, home }: { cells: Cell[]; home: [number, number] | null }) {
  const el = useRef<SVGSVGElement>(null);
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const n = el.current; if (!n) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setLit(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setLit(true); io.disconnect(); } }, { threshold: 0.45 });
    io.observe(n);
    return () => io.disconnect();
  }, []);
  const top = Math.sqrt(Math.max(1, ...cells.map((c) => c[2])));
  const [hx, hy] = home ? indiaXY(home[0], home[1]) : [40, 95];
  return (
    <svg ref={el} className={`rs${lit ? " is-lit" : ""}`} viewBox={`-30 -6 ${INDIA_VIEW.w + 36} ${INDIA_VIEW.h + 12}`} role="img" aria-label="India: every recorded area on StrayPaw, with the reported animal's city lit">
      <path d={INDIA_PATH} className="rs-echo" transform="translate(0.9 0.7)" />
      <path d={INDIA_PATH} className="rs-land" />
      {cells.map(([lng, lat, v], i) => {
        const [x, y] = indiaXY(lng, lat), d = Math.hypot(x - hx, y - hy);
        return <circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} r={(0.4 + (Math.sqrt(v) / top) * 1.2).toFixed(2)} className="rs-pt" style={{ ["--d" as string]: (1.4 + d * 0.022).toFixed(2) }} />;
      })}
      <path d={`M-26,${hy - 40} C${hx - 30},${hy - 60} ${hx - 26},${hy - 4} ${hx},${hy}`} className="rs-path" pathLength={1} />
      <circle cx={hx} cy={hy} r="2.2" className="rs-home" />
      <circle cx={hx} cy={hy} r="2.2" className="rs-ring" />
    </svg>
  );
}
