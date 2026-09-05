/* ════════════════════════════════════════════════════════════════════
   Figures for the explainer pages.

   Diagrams, not decoration: each one draws the actual mechanism the page
   is describing. Inline SVG so they stay crisp, theme with the section
   they sit in, and cost nothing to load.
   ════════════════════════════════════════════════════════════════════ */

/** The loop the whole product runs on. */
export function LoopFigure({ className = "" }: { className?: string }) {
  const steps = ["SEE", "IDENTIFY", "UNDERSTAND", "ACT", "TRACK", "MEASURE"];
  const cx = 210;
  const cy = 130;
  const r = 96;
  return (
    <svg viewBox="0 0 420 262" className={className} fill="none" role="img"
      aria-label="A six-stage loop: see, identify, understand, act, track, measure.">
      <defs>
        <linearGradient id="loop-arc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8fb7ff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#66c5d5" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} stroke="url(#loop-arc)" strokeWidth="1.2" strokeDasharray="3 5" />
      {steps.map((s, i) => {
        const a = (i / steps.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        const anchor = Math.abs(Math.cos(a)) < 0.3 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
        const lx = cx + Math.cos(a) * (r + 16);
        const ly = cy + Math.sin(a) * (r + 16) + 3;
        return (
          <g key={s}>
            <circle cx={x} cy={y} r="6" fill="#0b1020" stroke="#8fb7ff" strokeWidth="1.4" />
            <circle cx={x} cy={y} r="2.2" fill="#8fb7ff" />
            <text x={lx} y={ly} textAnchor={anchor} fontSize="9.5" fontFamily="monospace"
              letterSpacing="1" fill="currentColor" opacity="0.85">{s}</text>
          </g>
        );
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontFamily="monospace"
        letterSpacing="1.4" fill="currentColor" opacity="0.55">ONE ANIMAL</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fontFamily="monospace"
        letterSpacing="1.4" fill="currentColor" opacity="0.55">ONE RECORD</text>
    </svg>
  );
}

/** Scattered observations resolving into one identified record. */
export function ResolveFigure({ className = "" }: { className?: string }) {
  const dots = [
    [30, 40], [72, 22], [54, 78], [18, 96], [96, 58], [40, 118],
    [88, 104], [66, 140], [22, 148],
  ];
  return (
    <svg viewBox="0 0 420 180" className={className} fill="none" role="img"
      aria-label="Scattered sightings on the left resolving into a single record on the right.">
      <g>
        {dots.map(([x, y], i) => (
          <circle key={i} cx={x + 14} cy={y} r="3.4" fill="currentColor" opacity="0.32" />
        ))}
        <text x="20" y="172" fontSize="9" fontFamily="monospace" letterSpacing="1"
          fill="currentColor" opacity="0.55">UNLINKED SIGHTINGS</text>
      </g>
      {dots.map(([x, y], i) => (
        <path key={i} d={`M ${x + 18} ${y} C 170 ${y}, 190 90, 230 90`}
          stroke="#8fb7ff" strokeOpacity="0.22" strokeWidth="0.9" />
      ))}
      {/* Box widened and the second line set smaller: at 9px/0.6 tracking,
          "IDENTITY · HISTORY · OUTCOME" measured 168px inside a 160px box and
          ran past the right edge of the viewBox itself. */}
      <rect x="232" y="56" width="176" height="68" rx="3"
        fill="#8fb7ff" fillOpacity="0.08" stroke="#8fb7ff" strokeOpacity="0.6" />
      <text x="244" y="78" fontSize="9.5" fontFamily="monospace" letterSpacing="1"
        fill="#8fb7ff">ONE ANIMAL RECORD</text>
      <line x1="244" y1="88" x2="396" y2="88" stroke="#8fb7ff" strokeOpacity="0.25" />
      <text x="244" y="104" fontSize="8" fontFamily="monospace" letterSpacing="0.4"
        fill="currentColor" opacity="0.7">IDENTITY · HISTORY · OUTCOME</text>
      <text x="232" y="172" fontSize="9" fontFamily="monospace" letterSpacing="1"
        fill="currentColor" opacity="0.55">RESOLVED</text>
    </svg>
  );
}

/** Money in, evidence out, the funder's round trip. */
export function FundingFigure({ className = "" }: { className?: string }) {
  const nodes = [
    { x: 44, label: "FUND" },
    { x: 148, label: "STUDY" },
    { x: 252, label: "ACT" },
    { x: 356, label: "MEASURE" },
  ];
  return (
    <svg viewBox="0 0 420 150" className={className} fill="none" role="img"
      aria-label="Funding flows into a study, into action, into measurement, and back again.">
      <line x1="44" y1="60" x2="356" y2="60" stroke="currentColor" strokeOpacity="0.2" />
      {nodes.map((n, i) => (
        <g key={n.label}>
          <rect x={n.x - 30} y={46} width="60" height="28" rx="2"
            fill="#0b1020" stroke={i === 0 ? "#f05b40" : "#8fb7ff"} strokeOpacity="0.75" />
          <text x={n.x} y={64} textAnchor="middle" fontSize="9" fontFamily="monospace"
            letterSpacing="1" fill={i === 0 ? "#f05b40" : "#8fb7ff"}>{n.label}</text>
        </g>
      ))}
      {/* return path: what was measured informs the next thing funded */}
      <path d="M 356 78 C 356 122, 44 122, 44 78" stroke="#66c5d5" strokeOpacity="0.55"
        strokeWidth="1.1" strokeDasharray="4 4" />
      <text x="200" y="136" textAnchor="middle" fontSize="9" fontFamily="monospace"
        letterSpacing="1" fill="#66c5d5" opacity="0.9">EVIDENCE RETURNS TO THE NEXT DECISION</text>
    </svg>
  );
}

/** Coverage bar: what is known versus what is not, for one metric. */
export function CoverageBar({
  known,
  total,
  label,
  className = "",
}: {
  known: number;
  total: number;
  label: string;
  className?: string;
}) {
  const cells = Array.from({ length: total }, (_, i) => i < known);
  return (
    <div className={`cov ${className}`}>
      <div className="cov-cells" aria-hidden="true">
        {cells.map((on, i) => (
          <i key={i} className={on ? "on" : ""} />
        ))}
      </div>
      <span className="cov-label">
        <b>{known}</b> of {total}, {label}
      </span>
    </div>
  );
}
