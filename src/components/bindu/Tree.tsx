/* ════════════════════════════════════════════════════════════════════
   The tree of life, the Gond painters' great subject, drawn here as what
   StrayPaw has built: one trunk, the shared record, and a branch for
   each working part of the product, each ending in a leaf that opens
   it. The trunk rises and the branches grow as the page scrolls (each
   a path drawn by --p); the leaves unfold in turn. An original drawing
   in the Gond manner: a patterned trunk, almond leaves filled with dots
   and a vein. Two compositions: a wide crown, and a tall one for phones.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";

export type Branch = { title: string; body: string; href: string };

type Geo = { w: number; h: number; trunk: string; branches: { d: string; x: number; y: number; ang: number; side: 1 | -1 }[]; roots: string[] };

function wide(n: number): Geo {
  const w = 1200, h = 780, tx = 600, branches: Geo["branches"] = [];
  for (let i = 0; i < n; i++) {
    const side = (i % 2 ? 1 : -1) as 1 | -1, row = Math.floor(i / 2), rows = Math.ceil(n / 2);
    const y = 120 + row * ((560 - 120) / Math.max(1, rows - 1)), x = tx + side * (330 - row * 18), by = y + 150 - row * 6;
    branches.push({ d: `M${tx},${by} C${tx + side * 90},${by - 10} ${x - side * 140},${y + 50} ${x},${y}`, x, y, ang: side > 0 ? -18 : 198, side });
  }
  return { w, h, branches, trunk: `M${tx - 34},${h} C${tx - 20},${h - 160} ${tx - 30},${h - 330} ${tx - 12},180 L${tx + 12},180 C${tx + 30},${h - 330} ${tx + 20},${h - 160} ${tx + 34},${h} Z`,
    roots: [`M${tx - 30},${h - 6} C${tx - 120},${h - 2} ${tx - 190},${h - 30} ${tx - 260},${h - 12}`, `M${tx + 30},${h - 6} C${tx + 120},${h - 2} ${tx + 200},${h - 34} ${tx + 270},${h - 10}`] };
}
function tall(n: number): Geo {
  const w = 400, h = 1120, tx = 200, branches: Geo["branches"] = [];
  for (let i = 0; i < n; i++) {
    const side = (i % 2 ? 1 : -1) as 1 | -1, y = 110 + i * 118, x = tx + side * 110, by = y + 70;
    branches.push({ d: `M${tx},${by} C${tx + side * 40},${by - 6} ${x - side * 50},${y + 30} ${x},${y}`, x, y, ang: side > 0 ? -20 : 200, side });
  }
  return { w, h, branches, trunk: `M${tx - 22},${h} C${tx - 14},${h - 300} ${tx - 20},${h - 700} ${tx - 8},70 L${tx + 8},70 C${tx + 20},${h - 700} ${tx + 14},${h - 300} ${tx + 22},${h} Z`, roots: [] };
}

const LEAF = "M0,0 C14,-16 46,-16 62,0 C46,16 14,16 0,0 Z";
const COLS = ["#f05b40", "#3f8f6a", "#f2b632", "#2457ce", "#d9738f", "#f28c38", "#1f6f80", "#a9512d"];

function Plate({ g, items, k }: { g: Geo; items: Branch[]; k: string }) {
  return (
    <div className={`tr-plate is-${k}`} style={{ aspectRatio: `${g.w} / ${g.h}` }}>
      <svg viewBox={`0 0 ${g.w} ${g.h}`} aria-hidden>
        <defs>
          <pattern id={`tr-bark-${k}`} width="14" height="9" patternUnits="userSpaceOnUse"><path d="M2,4.5 h8" className="tr-dash" /><circle cx="12" cy="1.5" r="1" className="tr-dot" /></pattern>
          <pattern id={`tr-leafdots-${k}`} width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1" fill="#fff8ec" /></pattern>
        </defs>
        {g.roots.map((d, i) => <path key={i} d={d} className="tr-root" pathLength={1} />)}
        <path d={g.trunk} className="tr-trunk" />
        <path d={g.trunk} fill={`url(#tr-bark-${k})`} className="tr-trunk-pat" />
        {g.branches.map((b, i) => (
          <g key={i} style={{ ["--i" as string]: i }}>
            <path d={b.d} className="tr-branch" pathLength={1} />
            <g transform={`translate(${b.x},${b.y}) rotate(${b.ang})`}>
              <g className="tr-leaf">
                <path d={LEAF} fill={COLS[i % COLS.length]} />
                <path d={LEAF} fill={`url(#tr-leafdots-${k})`} opacity="0.55" />
                <path d="M4,0 L58,0" className="tr-vein" />
              </g>
            </g>
          </g>
        ))}
      </svg>
      {g.branches.map((b, i) => items[i] && (
        <Link key={i} href={items[i].href} className={`tr-label is-${b.side > 0 ? "r" : "l"}`} style={{ left: `${(b.x / g.w) * 100}%`, top: `${(b.y / g.h) * 100}%`, ["--i" as string]: i }}>
          <b>{items[i].title}</b><span>{items[i].body}</span>
        </Link>
      ))}
    </div>
  );
}

export function Tree({ items }: { items: Branch[] }) {
  return (
    <div className="tr">
      <Plate g={wide(items.length)} items={items} k="wide" />
      <Plate g={tall(items.length)} items={items} k="tall" />
    </div>
  );
}
