/* ════════════════════════════════════════════════════════════════════
   StrayPaw vector library

   One drawing language across the site: thin strokes on a 1.25–1.5 weight,
   open geometry, and a schematic/survey feel — contour lines, radar sweeps,
   constellation nodes. Everything inherits `currentColor` so a vector picks
   up whatever context it is dropped into, and every animation sits behind
   `prefers-reduced-motion`.
   ════════════════════════════════════════════════════════════════════ */

type V = { className?: string; size?: number };

/* ── 1. Topographic contours ─────────────────────────────────────────
   Survey-map contours. Used as a section ground — it reads as terrain
   without ever being a literal map. */
export function TopoLines({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 600 400"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <g stroke="currentColor" strokeWidth="1" opacity="0.5">
        <path d="M-20 300 C 90 268, 150 322, 250 292 S 430 236, 520 268 S 610 300, 640 286" />
        <path d="M-20 268 C 100 232, 168 292, 262 258 S 436 198, 526 232 S 612 266, 640 250" />
        <path d="M-20 236 C 110 196, 186 262, 274 224 S 442 160, 532 196 S 614 232, 640 214" />
        <path d="M-20 204 C 120 160, 204 232, 286 190 S 448 122, 538 160 S 616 198, 640 178" />
        <path d="M-20 172 C 130 124, 222 202, 298 156 S 454 84, 544 124 S 618 164, 640 142" />
        <path d="M-20 140 C 140 88, 240 172, 310 122 S 460 46, 550 88 S 620 130, 640 106" />
        <path d="M-20 108 C 150 52, 258 142, 322 88 S 466 8, 556 52 S 622 96, 640 70" />
      </g>
      {/* summit markers — the "peaks" of density */}
      <g fill="currentColor" opacity="0.85">
        <circle cx="238" cy="150" r="2.5" />
        <circle cx="466" cy="86" r="2.5" />
      </g>
    </svg>
  );
}

/* ── 2. Radar sweep ──────────────────────────────────────────────────
   One observation entering the system. Concentric rings + a sweep arm. */
export function RadarPulse({ className, size = 120 }: V) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" fill="none">
        <circle cx="60" cy="60" r="54" strokeWidth="1" opacity="0.25" />
        <circle cx="60" cy="60" r="38" strokeWidth="1" opacity="0.4" />
        <circle cx="60" cy="60" r="22" strokeWidth="1" opacity="0.55" />
        {/* crosshair */}
        <path d="M60 2 V22 M60 98 V118 M2 60 H22 M98 60 H118" strokeWidth="1" opacity="0.3" />
      </g>
      {/* expanding ping */}
      <circle
        cx="60"
        cy="60"
        r="22"
        stroke="currentColor"
        strokeWidth="1.25"
        fill="none"
        className="sp-ping"
      />
      {/* sweep arm */}
      <g className="sp-sweep" style={{ transformOrigin: "60px 60px" }}>
        <path d="M60 60 L60 6" stroke="currentColor" strokeWidth="1.25" opacity="0.9" />
        <path d="M60 60 L60 6 A 54 54 0 0 1 98 22 Z" fill="currentColor" opacity="0.07" />
      </g>
      <circle cx="60" cy="60" r="3" fill="currentColor" />
    </svg>
  );
}

/* ── 3. Constellation ────────────────────────────────────────────────
   Scattered observations resolving into a connected shape. */
export function Constellation({ className, size = 120 }: V) {
  const nodes: [number, number, number][] = [
    [22, 34, 3], [58, 18, 2], [92, 42, 3.5], [40, 66, 2.5],
    [78, 82, 3], [16, 92, 2], [104, 96, 2.5],
  ];
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1" opacity="0.42">
        <path d="M22 34 L58 18 L92 42 L78 82 L40 66 Z" />
        <path d="M40 66 L16 92 M78 82 L104 96 M22 34 L40 66" />
      </g>
      <g fill="currentColor">
        {nodes.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} opacity={i === 2 ? 1 : 0.75} />
        ))}
      </g>
      {/* the one that matters */}
      <circle cx="92" cy="42" r="9" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
    </svg>
  );
}

/* ── 4. Street dog glyph ─────────────────────────────────────────────
   The protagonist, drawn as a single-weight geometric contour — sitting,
   in profile, alert. Deliberately not cute; it is a field mark. */
export function DogGlyph({ className, size = 120 }: V) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* ears — upright, the alert set of a street dog */}
        <path d="M48 34 L44 12 L62 26" />
        <path d="M74 27 L82 8 L86 30" />
        {/* skull, brow, muzzle */}
        <path d="M62 26 C 74 23, 83 25, 86 30 C 89 40, 88 47, 83 52" />
        <path d="M83 52 L98 57 L84 62" />
        {/* jaw returning to chest */}
        <path d="M84 62 C 77 66, 70 66, 65 62" />
        {/* spine: nape, dip, croup */}
        <path d="M48 34 C 40 44, 34 58, 34 74" />
        {/* chest and foreleg planted */}
        <path d="M65 62 C 67 76, 68 90, 68 104" />
        {/* seated haunch */}
        <path d="M34 74 C 24 82, 22 96, 32 103 C 44 108, 58 106, 68 104" />
        {/* tail curling off the haunch */}
        <path d="M32 103 C 20 102, 12 92, 16 82" />
        {/* ground line */}
        <path d="M18 106 H 100" opacity="0.3" />
      </g>
      {/* eye */}
      <circle cx="76" cy="36" r="1.9" fill="currentColor" />
    </svg>
  );
}

/* ── 5. Schematic document ───────────────────────────────────────────
   A study: framed, ruled, with a data plot inside. */
export function StudySchematic({ className, size = 120 }: V) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <g stroke="currentColor" fill="none" strokeLinecap="round">
        <path d="M28 16 H74 L92 34 V104 H28 Z" strokeWidth="1.4" />
        <path d="M74 16 V34 H92" strokeWidth="1.4" />
        {/* ruled lines */}
        <path d="M40 48 H80 M40 58 H72" strokeWidth="1" opacity="0.45" />
        {/* plot frame */}
        <path d="M40 70 H80 M40 70 V94 M40 94 H80" strokeWidth="1" opacity="0.5" />
        {/* the finding */}
        <path d="M44 90 L54 80 L62 85 L76 72" strokeWidth="1.4" />
      </g>
      <circle cx="76" cy="72" r="2.6" fill="currentColor" />
    </svg>
  );
}

/* ── 6. Verified outcome seal ────────────────────────────────────────
   A survey benchmark: notched ring, centre mark, check. */
export function OutcomeSeal({ className, size = 120 }: V) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <g stroke="currentColor" fill="none">
        <circle cx="60" cy="60" r="42" strokeWidth="1.4" />
        <circle cx="60" cy="60" r="32" strokeWidth="1" opacity="0.4" />
        {/* notches */}
        <g strokeWidth="1.2" opacity="0.75">
          <path d="M60 18 V26 M60 94 V102 M18 60 H26 M94 60 H102" />
          <path d="M30 30 L36 36 M90 90 L84 84 M90 30 L84 36 M30 90 L36 84" opacity="0.5" />
        </g>
        {/* check */}
        <path d="M46 60 L56 70 L76 50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/* ── 7. Flow arc ─────────────────────────────────────────────────────
   Connective tissue between stages. The dash animates along the path. */
export function FlowArc({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 60"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
      style={flip ? { transform: "scaleY(-1)" } : undefined}
    >
      <path
        d="M0 46 C 50 46, 60 14, 100 14 S 150 46, 200 46"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.35"
      />
      <path
        d="M0 46 C 50 46, 60 14, 100 14 S 150 46, 200 46"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="6 210"
        className="sp-trace"
      />
    </svg>
  );
}

/* ── 8. Isometric grid plane ─────────────────────────────────────────
   The "system" ground — a receding survey grid. */
export function GridPlane({ className }: { className?: string }) {
  /* One vanishing point above the frame. Verticals converge on it; horizontals
     compress toward the horizon, so the plane reads as ground receding away. */
  const VP_X = 300;
  const VP_Y = -70;
  const BOTTOM = 240;
  const atY = (x0: number, y: number) =>
    VP_X + (x0 - VP_X) * ((y - VP_Y) / (BOTTOM - VP_Y));

  const lines: React.ReactElement[] = [];

  // verticals, fanned wide so the plane fills the width at the near edge
  for (let i = -6; i <= 18; i++) {
    const x0 = i * 50;
    lines.push(<path key={`v${i}`} d={`M${x0} ${BOTTOM} L${atY(x0, 0).toFixed(1)} 0`} />);
  }

  // horizontals: near the bottom they are wide, near the horizon they pinch in
  for (let i = 1; i <= 9; i++) {
    const t = i / 9;
    const y = BOTTOM * (1 - (1 - t) ** 2); // dense near the horizon
    const left = atY(-300, y);
    const right = atY(900, y);
    lines.push(
      <path key={`h${i}`} d={`M${left.toFixed(1)} ${y.toFixed(1)} H${right.toFixed(1)}`} />
    );
  }

  return (
    <svg className={className} viewBox="0 0 600 240" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1" opacity="0.3">
        {lines}
      </g>
    </svg>
  );
}

/* ── 9. Coverage gap ─────────────────────────────────────────────────
   What is missing, drawn as an absence: a dashed void inside a dense field. */
export function CoverageGap({ className, size = 120 }: V) {
  const dots: [number, number][] = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const x = 14 + c * 15.5;
      const y = 14 + r * 15.5;
      const dx = x - 60;
      const dy = y - 62;
      if (Math.hypot(dx, dy) > 26) dots.push([x, y]);
    }
  }
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <g fill="currentColor" opacity="0.5">
        {dots.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.8" />
        ))}
      </g>
      <circle
        cx="60"
        cy="62"
        r="24"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="4 5"
        fill="none"
      />
      <path d="M60 54 V70 M52 62 H68" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

/* ── 10. Route thread ────────────────────────────────────────────────
   A field route: waypoints joined by a surveyed line. Used as a divider. */
export function RouteThread({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 800 40" fill="none" aria-hidden="true" preserveAspectRatio="none">
      <path
        d="M0 30 L120 30 L160 12 L300 12 L340 30 L520 30 L560 14 L680 14 L720 28 L800 28"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.45"
      />
      <g fill="currentColor">
        {[
          [160, 12], [340, 30], [560, 14], [720, 28],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" />
        ))}
      </g>
    </svg>
  );
}
