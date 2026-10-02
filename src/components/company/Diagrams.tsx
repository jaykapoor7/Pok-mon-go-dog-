/* ════════════════════════════════════════════════════════════════════
   Small drawn arguments for the public pages, in the map's own language:
   cells, sequential blue for what is recorded, hatching for what is not,
   a dashed edge for what is not mapped, flame for the one thing that
   needs someone. Each replaces a paragraph with something seen at once.
   ════════════════════════════════════════════════════════════════════ */

const hex = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");

/** A report in a chat fades within days; a report on the record stays, with what was done. */
export function ChatVsRecord() {
  return (
    <svg viewBox="0 0 240 150" className="dg" role="img" aria-label="Chat messages fading away beside a record that stays">
      {[0, 1, 2].map((i) => (
        <g key={i} className="dg-chat" style={{ opacity: 0.85 - i * 0.3 }}>
          <rect x={14 + i * 10} y={22 + i * 38} width="78" height="26" rx="13" className={i === 2 ? "is-gone" : ""} />
          <rect x={26 + i * 10} y={32 + i * 38} width={46 - i * 8} height="5" rx="2.5" className="dg-line" />
        </g>
      ))}
      <path d="M112 75h18" className="dg-arrow" />
      <path d="M126 70l6 5-6 5" className="dg-arrow" />
      <g className="dg-card">
        <rect x="142" y="22" width="86" height="106" rx="9" />
        <rect x="152" y="33" width="48" height="6" rx="3" className="dg-id" />
        <polygon points={hex(163, 66, 11)} className="dg-cell" />
        <rect x="180" y="60" width="38" height="5" rx="2.5" className="dg-line is-ink" />
        <rect x="180" y="70" width="28" height="5" rx="2.5" className="dg-line is-ink" />
        {[0, 1, 2].map((i) => <circle key={i} cx="157" cy={92 + i * 12} r="3.2" className={i === 2 ? "dg-dot is-flame" : "dg-dot"} />)}
        {[0, 1, 2].map((i) => <rect key={i} x="166" y={90 + i * 12} width={44 - i * 6} height="4.5" rx="2.2" className="dg-line is-ink" />)}
      </g>
    </svg>
  );
}

/** Rescue, care and sterilisation from three registers land on one animal's ID. */
export function ThreeSheetsOneId() {
  const ys = [26, 66, 106];
  return (
    <svg viewBox="0 0 240 150" className="dg" role="img" aria-label="Three registers converging on one animal ID">
      {ys.map((y, i) => (
        <g key={i} className="dg-sheet">
          <rect x="14" y={y - 14} width="62" height="30" rx="5" />
          {[0, 1].map((k) => <rect key={k} x="22" y={y - 6 + k * 9} width={44 - k * 12} height="4" rx="2" className="dg-line is-ink" />)}
          <path d={`M80 ${y}C130 ${y} 130 75 168 75`} className="dg-flow" />
        </g>
      ))}
      <polygon points={hex(190, 75, 30)} className="dg-cell is-big" />
      <text x="190" y="79" textAnchor="middle" className="dg-idtext">ONE ID</text>
    </svg>
  );
}

/** Recorded cells, cells inside the area nobody has recorded (hatched), and the unmapped edge (dashed). */
export function CoveredAndNot() {
  const r = 13, w = Math.sqrt(3) * r;
  const cells: { x: number; y: number; k: "rec1" | "rec2" | "rec3" | "hatch" | "edge" }[] = [];
  const pattern = [
    ["edge", "edge", "edge", "edge", "edge", "edge", "edge"],
    ["edge", "rec2", "rec3", "hatch", "rec1", "edge", "edge"],
    ["edge", "rec1", "rec3", "rec2", "hatch", "hatch", "edge"],
    ["edge", "hatch", "rec2", "rec1", "rec2", "edge", "edge"],
    ["edge", "edge", "edge", "edge", "edge", "edge", "edge"],
  ] as const;
  pattern.forEach((row, ri) => row.forEach((k, ci) => cells.push({ x: 30 + ci * w + (ri % 2 ? w / 2 : 0), y: 18 + ri * r * 1.5, k })));
  return (
    <svg viewBox="0 0 240 150" className="dg" role="img" aria-label="Recorded cells in blue, unrecorded cells hatched, the unmapped edge dashed">
      <defs>
        <pattern id="dg-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" className="dg-hatchline" />
        </pattern>
      </defs>
      {cells.map((c, i) => (
        <polygon key={i} points={hex(c.x, c.y, r - 0.6)} className={`dg-cov is-${c.k}`} style={c.k === "hatch" ? { fill: "url(#dg-hatch)" } : undefined} />
      ))}
    </svg>
  );
}
