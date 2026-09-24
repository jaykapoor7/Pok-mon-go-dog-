/* A series in a line, its last value marked. For trends that sit inside a
   sentence or a table row; never the main chart of a section. */
export function Spark({ values, w = 96, h = 26, color = "var(--sp-blue)", fill, mark = true, label }: {
  values: number[]; w?: number; h?: number; color?: string; fill?: string; mark?: boolean; label?: string;
}) {
  if (!values.length) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * (w - 4) + 2, h - 2 - (v / max) * (h - 4)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className="sys-spark">
      {fill && <path d={`${d}L${last[0]} ${h}L2 ${h}Z`} style={{ fill }} />}
      <path d={d} fill="none" style={{ stroke: color }} strokeWidth="1.5" strokeLinejoin="round" />
      {mark && <circle cx={last[0]} cy={last[1]} r="2.4" style={{ fill: color }} />}
    </svg>
  );
}

/* Small vertical bars, one per period: a rhythm, not a measurement. */
export function MiniBars({ values, w = 120, h = 28, color = "var(--sp-seq-3)", highlight, label }: {
  values: number[]; w?: number; h?: number; color?: string; highlight?: number[]; label?: string;
}) {
  const max = Math.max(1, ...values);
  const bw = w / Math.max(1, values.length);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className="sys-minibars">
      {values.map((v, i) => {
        const bh = v > 0 ? Math.max(1.5, (v / max) * (h - 1)) : 0;
        return <rect key={i} x={i * bw + 0.5} y={h - bh} width={Math.max(1, bw - 1.5)} height={bh} style={{ fill: highlight?.includes(i) ? "var(--sp-flame)" : color }} />;
      })}
    </svg>
  );
}
