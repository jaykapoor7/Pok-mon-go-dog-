/* ════════════════════════════════════════════════════════════════════
   The three scales the record is read at, drawn in the map's own cells.

   Street: one cell, the animals recorded in it and a new report (flame).
   Locality: the cells a field team covers, with the route through them.
   City: every cell, darker where more is recorded, the unmapped edge
   dashed. Shading is illustrative of the encoding, not a count: no figure
   is read off these.
   ════════════════════════════════════════════════════════════════════ */

const SQ3 = Math.sqrt(3);

/** A pointy-top hexagon's points around (cx, cy). */
function hexPts(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k - 90);
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

/** Axial (q, r) to the centre of its cell, around (32, 32). */
const at = (q: number, rr: number, r: number): [number, number] => [32 + r * SQ3 * (q + rr / 2), 32 + r * 1.5 * rr];

const RING1: [number, number][] = [[0, 0], [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const FIELD_SHADE = [4, 2, 3, 1, 2, 3, 1];

/* Every cell within two steps of the centre, shaded more toward the middle;
   five on the rim are not mapped yet. */
const CITY: { q: number; r: number; lvl: number; dash: boolean }[] = [];
for (let q = -2; q <= 2; q++) {
  for (let r = Math.max(-2, -q - 2); r <= Math.min(2, -q + 2); r++) {
    const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
    const k = (q * 7 + r * 13 + 40) % 5;
    CITY.push({ q, r, lvl: d === 0 ? 5 : d === 1 ? 3 + (k % 2) : 1 + (k % 3), dash: d === 2 && k < 2 });
  }
}

export function ScaleGlyph({ level }: { level: "street" | "field" | "city" }) {
  return (
    <svg className={`sg is-${level}`} viewBox="0 0 64 64" aria-hidden="true">
      {level === "street" && (
        <>
          <polygon points={hexPts(32, 32, 26)} className="sg-2" />
          <circle cx="23" cy="27" r="2.6" className="sg-dot" />
          <circle cx="37" cy="23" r="2.6" className="sg-dot" />
          <circle cx="28" cy="41" r="2.6" className="sg-dot" />
          <circle cx="41" cy="38" r="6.5" className="sg-ring" />
          <circle cx="41" cy="38" r="3.2" className="sg-flame" />
        </>
      )}
      {level === "field" && (
        <>
          {RING1.map(([q, r], i) => { const [x, y] = at(q, r, 11); return <polygon key={i} points={hexPts(x, y, 10.6)} className={`sg-${FIELD_SHADE[i]}`} />; })}
          <polyline points={[at(-1, 1, 11), at(0, 0, 11), at(1, -1, 11)].map((p) => p.join(",")).join(" ")} className="sg-route" />
          {[at(-1, 1, 11), at(0, 0, 11), at(1, -1, 11)].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.4" className="sg-node" />)}
        </>
      )}
      {level === "city" && CITY.map((c, i) => {
        const [x, y] = at(c.q, c.r, 7);
        return <polygon key={i} points={hexPts(x, y, 6.7)} className={c.dash ? "sg-dash" : `sg-${c.lvl}`} />;
      })}
    </svg>
  );
}
