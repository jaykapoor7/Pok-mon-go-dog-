/* Hexagonal cells drawn to SVG, in the same H3 geometry the live map uses,
   for places where a map library would be too heavy: the landing plates,
   a profile's place plate, the mini maps beside a chart.

   Projection is equirectangular with the longitude scaled by the cosine of
   the plate's middle latitude — at city scale indistinguishable from the
   map's Web Mercator, and it keeps the SVG free of any library. */

export type Box = [number, number, number, number];

export function projector(box: Box, width: number, height: number, pad = 8) {
  const [w, s, e, n] = box;
  const k = Math.cos((((s + n) / 2) * Math.PI) / 180);
  const sx = (width - pad * 2) / Math.max(1e-9, (e - w) * k);
  const sy = (height - pad * 2) / Math.max(1e-9, n - s);
  const scale = Math.min(sx, sy);
  const ox = (width - (e - w) * k * scale) / 2;
  const oy = (height - (n - s) * scale) / 2;
  return {
    scale,
    p: (lng: number, lat: number): [number, number] => [ox + (lng - w) * k * scale, oy + (n - lat) * scale],
    /** Kilometres to pixels at this plate's scale. */
    km: (d: number) => (d / 111.32) * scale,
  };
}

export type PlateCell = { key: string; ring: number[]; fill: string; stroke?: string; opacity?: number; dashed?: boolean; hatch?: boolean; title?: string };

const pathOf = (ring: number[], p: (x: number, y: number) => [number, number]) => {
  let d = "";
  for (let i = 0; i < ring.length; i += 2) {
    const [x, y] = p(ring[i], ring[i + 1]);
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d + "Z";
};

export function HexPlate({
  cells, box, width, height, pad = 8, hatchId, marks, label, className = "", scaleBarKm, night = false, children,
}: {
  cells: PlateCell[]; box: Box; width: number; height: number; pad?: number; hatchId?: string;
  marks?: { lng: number; lat: number; r?: number; color?: string; ring?: boolean }[];
  label: string; className?: string; scaleBarKm?: number; night?: boolean;
  children?: (p: (lng: number, lat: number) => [number, number]) => React.ReactNode;
}) {
  const { p, km } = projector(box, width, height, pad);
  const bar = scaleBarKm ? km(scaleBarKm) : 0;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`sys-plate ${className}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      {cells.map((c) => (
        <path
          key={c.key}
          d={pathOf(c.ring, p)}
          style={{ fill: c.hatch && hatchId ? `url(#${hatchId})` : c.fill, stroke: c.stroke ?? (night ? "rgba(7,20,43,0.9)" : "rgba(11,30,61,0.16)"), opacity: c.opacity ?? 1 }}
          strokeWidth={c.dashed ? 0.9 : 0.7}
          strokeDasharray={c.dashed ? "2.5 2.5" : undefined}
        >
          {c.title && <title>{c.title}</title>}
        </path>
      ))}
      {marks?.map((m, i) => {
        const [x, y] = p(m.lng, m.lat);
        return m.ring
          ? <circle key={i} cx={x} cy={y} r={m.r ?? 6} fill="none" style={{ stroke: m.color ?? "var(--sp-flame)" }} strokeWidth="2" />
          : <circle key={i} cx={x} cy={y} r={m.r ?? 2.4} style={{ fill: m.color ?? "var(--sp-flame)" }} />;
      })}
      {children?.(p)}
      {bar > 0 && (
        <g className="sys-plate-bar" transform={`translate(${pad + 2} ${height - pad - 4})`}>
          <path d={`M0 0H${bar.toFixed(1)}M0 -4V0M${bar.toFixed(1)} -4V0`} />
          <text x={bar + 6} y={3}>{scaleBarKm! < 1 ? `${Math.round(scaleBarKm! * 1000)} m` : `${scaleBarKm} km`}</text>
        </g>
      )}
    </svg>
  );
}

/** A single cell glyph: the mark of place, filled by what it holds. */
export function CellGlyph({ size = 18, fill = "var(--sp-seq-3)", share, hatch = false, stroke = "var(--sp-ink)", title }: {
  size?: number; fill?: string; share?: number; hatch?: boolean; stroke?: string; title?: string;
}) {
  const r = size / 2 - 1.2;
  const pts = (k: number) => Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(size / 2 + Math.cos(a) * r * k).toFixed(2)},${(size / 2 + Math.sin(a) * r * k).toFixed(2)}`;
  }).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="sys-cell" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <polygon points={pts(1)} className={hatch ? "is-hatch" : ""} style={{ fill: hatch ? "transparent" : share != null ? "transparent" : fill, stroke }} strokeWidth="1.2" />
      {hatch && <polygon points={pts(1)} style={{ fill: "var(--sp-hatch-line)", opacity: 0.35 }} />}
      {share != null && share > 0 && <polygon points={pts(Math.sqrt(Math.min(1, share)))} style={{ fill }} />}
    </svg>
  );
}
