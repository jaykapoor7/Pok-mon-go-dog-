/* ════════════════════════════════════════════════════════════════════
   Folk illustrations, drawn for StrayPaw.

   Flat, hand-cut shapes in the brand colours only: ink navy, StrayPaw
   blue, sky, coral and warm cream. Purely decorative, so every piece is
   aria-hidden and never carries information the page does not also say.
   ════════════════════════════════════════════════════════════════════ */

const INK = "#0b1e3d";
const BLUE = "#2457ce";
const SKY = "#8fb7ff";
const MIST = "#cfdcf6";
const CORAL = "#f05b40";
const PEACH = "#f8b9a3";
const CREAM = "#f7f2ea";

/** A sitting Indian pariah dog: wedge head, tall ears, tail curled over
 *  the back, coral collar. Faces right. */
function Dog({ x, y, s = 1, fill = INK, eye = CREAM }: { x: number; y: number; s?: number; fill?: string; eye?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M20 58 C 4 56, 2 36, 14 32 C 22 30, 25 40, 17 44" fill="none" stroke={fill} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M16 88 C 12 70, 18 52, 34 46 L 44 44 C 56 50, 60 68, 58 88 Z" fill={fill} />
      <path d="M30 46 C 30 36, 34 28, 40 26 L 50 30 C 50 38, 48 44, 44 48 Z" fill={fill} />
      <path d="M31 22 L 31 1 L 43 17 Z" fill={fill} />
      <path d="M40 16 L 49 -2 L 51 20 Z" fill={fill} />
      <ellipse cx="41" cy="25" rx="13" ry="11.5" fill={fill} />
      <path d="M48 19 C 58 21, 68 26, 72 30 C 72 33, 69 35, 66 35 L 48 34 Z" fill={fill} />
      <circle cx="70.5" cy="30" r="2.6" fill={eye} opacity="0.35" />
      <circle cx="47" cy="22" r="2" fill={eye} />
      <path d="M31 44 Q 40 50 50 42" fill="none" stroke={CORAL} strokeWidth="4" strokeLinecap="round" />
      <circle cx="41" cy="49.5" r="2.6" fill={PEACH} />
      <path d="M44 64 L 44 88 M 52 66 L 52 88" stroke={eye} strokeWidth="1.4" opacity="0.3" />
      <path d="M40 88 h 10 M 50 88 h 9" stroke={fill} strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

/** A small sitting cat with its tail wrapped round. */
function Cat({ x, y, s = 1, fill = BLUE }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M6 50 C 2 34, 8 22, 20 20 C 32 22, 38 34, 34 50 Z" fill={fill} />
      <path d="M34 48 C 46 48, 50 38, 44 30" fill="none" stroke={fill} strokeWidth="4" strokeLinecap="round" />
      <path d="M10 10 L 11 -2 L 18 6 Z M 30 10 L 29 -2 L 22 6 Z" fill={fill} />
      <circle cx="20" cy="12" r="10.5" fill={fill} />
      <circle cx="16" cy="11" r="1.5" fill={CREAM} />
      <circle cx="24" cy="11" r="1.5" fill={CREAM} />
    </g>
  );
}

function Tree({ x, y, kind, s = 1 }: { x: number; y: number; kind: "round" | "pine" | "coral"; s?: number }) {
  if (kind === "pine") return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M20 70 L 20 84" stroke={INK} strokeWidth="3" />
      <path d="M20 0 L 38 34 L 28 34 L 42 60 L 30 60 L 40 74 L 0 74 L 10 60 L -2 60 L 12 34 L 2 34 Z" fill={INK} />
      <path d="M12 26 L 20 20 L 28 26 M 8 50 L 20 42 L 32 50 M 6 68 L 20 60 L 34 68" fill="none" stroke={CREAM} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </g>
  );
  const c = kind === "coral" ? CORAL : BLUE;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M24 40 L 24 86" stroke={INK} strokeWidth="3.2" />
      <circle cx="24" cy="26" r="25" fill={c} />
      <path d="M24 8 L 24 46 M 24 18 L 14 12 M 24 18 L 34 12 M 24 28 L 12 21 M 24 28 L 36 21 M 24 38 L 13 31 M 24 38 L 35 31" stroke={CREAM} strokeWidth="1.6" strokeLinecap="round" opacity="0.75" fill="none" />
    </g>
  );
}

function Sun({ x, y, r = 44 }: { x: number; y: number; r?: number }) {
  const rays = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const r1 = r + 10, r2 = r + (i % 2 ? 18 : 26);
    return <line key={i} x1={x + Math.cos(a) * r1} y1={y + Math.sin(a) * r1} x2={x + Math.cos(a) * r2} y2={y + Math.sin(a) * r2} stroke={CORAL} strokeWidth="3" strokeLinecap="round" />;
  });
  return (
    <g>
      {rays}
      <circle cx={x} cy={y} r={r} fill={CORAL} />
      <circle cx={x} cy={y} r={r - 12} fill="none" stroke={CREAM} strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" />
      <circle cx={x} cy={y} r={r - 24} fill={PEACH} opacity="0.55" />
    </g>
  );
}

function Birds({ x, y }: { x: number; y: number }) {
  return (
    <g fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${x} ${y} q 7 -7 13 0 q 6 -7 13 0`} />
      <path d={`M${x + 38} ${y - 16} q 5 -5 10 0 q 5 -5 10 0`} />
      <path d={`M${x + 20} ${y - 30} q 4 -4 8 0 q 4 -4 8 0`} opacity="0.6" />
    </g>
  );
}

function Spark({ x, y, s = 1, c = BLUE }: { x: number; y: number; s?: number; c?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -8 L 2 -2 L 8 0 L 2 2 L 0 8 L -2 2 L -8 0 L -2 -2 Z" fill={c} />;
}

function Flower({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 L 0 -18 M 0 -8 Q -6 -12 -8 -6 M 0 -11 Q 6 -15 8 -9" stroke={CREAM} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cy="-22" r="4.5" fill={c} />
      <circle cy="-22" r="1.6" fill={CREAM} />
    </g>
  );
}

/* What sits on the far hill changes with the role: homes for the
   neighbourhood, a care tent for an organisation, a skyline for a city. */
function Settlement({ variant }: { variant: "home" | "care" | "city" }) {
  if (variant === "care") return (
    <g transform="translate(640 132)">
      <path d="M0 52 L 46 2 L 92 52 Z" fill={CORAL} />
      <path d="M46 2 L 30 52 L 62 52 Z" fill={INK} opacity="0.85" />
      <path d="M46 2 L 46 -14" stroke={INK} strokeWidth="2.4" />
      <path d="M46 -14 L 62 -9 L 46 -4 Z" fill={BLUE} />
      <path d="M41 26 h 10 M 46 21 v 10" stroke={CREAM} strokeWidth="3.4" strokeLinecap="round" />
      <g transform="translate(110 22)">
        <rect width="38" height="30" rx="3" fill={BLUE} />
        <path d="M-4 2 L 19 -14 L 42 2 Z" fill={INK} />
        <rect x="14" y="14" width="10" height="16" fill={CREAM} />
      </g>
    </g>
  );
  if (variant === "city") return (
    <g transform="translate(610 92)">
      {[[0, 50, 34, BLUE], [38, 20, 30, INK], [72, 40, 26, SKY], [102, 6, 32, BLUE], [138, 36, 28, INK], [170, 56, 30, CORAL]].map(([bx, by, w, c], i) => (
        <g key={i}>
          <rect x={bx as number} y={by as number} width={w as number} height={110 - (by as number)} fill={c as string} />
          {Array.from({ length: Math.floor((96 - (by as number)) / 16) }, (_, r) => (
            <g key={r}>
              <rect x={(bx as number) + 6} y={(by as number) + 10 + r * 16} width="5" height="7" fill={CREAM} opacity={c === SKY ? 0.9 : 0.55} />
              <rect x={(bx as number) + (w as number) - 11} y={(by as number) + 10 + r * 16} width="5" height="7" fill={CREAM} opacity={c === SKY ? 0.9 : 0.55} />
            </g>
          ))}
        </g>
      ))}
      <path d="M117 6 L 118 -12" stroke={INK} strokeWidth="2" />
    </g>
  );
  return (
    <g transform="translate(626 128)">
      {[[0, CREAM, CORAL], [42, SKY, INK], [88, CREAM, BLUE]].map(([hx, wall, roof], i) => (
        <g key={i} transform={`translate(${hx} ${i === 1 ? -10 : 0})`}>
          <rect x="2" y="20" width="36" height="36" fill={wall as string} stroke={INK} strokeWidth="1.6" />
          <path d="M-4 22 L 20 0 L 44 22 Z" fill={roof as string} />
          <rect x="15" y="36" width="10" height="20" fill={INK} />
          <circle cx="20" cy="12" r="2.6" fill={CREAM} />
        </g>
      ))}
    </g>
  );
}

/** The wide banner behind a dashboard heading. Anchored right, so narrow
 *  screens keep the dog and the sun and lose the empty sky. */
export function FolkScene({ variant = "home", className = "" }: { variant?: "home" | "care" | "city"; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 260" preserveAspectRatio="xMaxYMax slice" aria-hidden focusable="false">
      <defs>
        <pattern id="folk-dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.4" fill={CREAM} opacity="0.35" /></pattern>
        <pattern id="folk-lines" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><line x1="0" y1="0" x2="0" y2="10" stroke={BLUE} strokeWidth="1.4" opacity="0.18" /></pattern>
        <linearGradient id="folk-fade" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.28" stopColor="#fff" stopOpacity="1" /></linearGradient>
        <mask id="folk-mask"><rect width="1200" height="260" fill="url(#folk-fade)" /></mask>
      </defs>
      <g mask="url(#folk-mask)">
        <Sun x={1010} y={86} />
        <Birds x={820} y={70} />
        <Spark x={720} y={48} s={1.1} />
        <Spark x={900} y={30} s={0.7} c={CORAL} />
        <Spark x={1150} y={160} s={0.8} />
        <path d="M540 260 C 650 160, 780 140, 900 172 S 1090 118, 1200 146 L 1200 260 Z" fill={MIST} />
        <path d="M540 260 C 650 160, 780 140, 900 172 S 1090 118, 1200 146 L 1200 260 Z" fill="url(#folk-lines)" />
        <Settlement variant={variant} />
        <Tree x={790} y={108} kind="pine" s={0.9} />
        <Tree x={1110} y={92} kind="round" s={0.95} />
        <path d="M480 260 C 610 196, 760 192, 870 212 S 1060 178, 1200 206 L 1200 260 Z" fill={BLUE} />
        <path d="M480 260 C 610 196, 760 192, 870 212 S 1060 178, 1200 206 L 1200 260 Z" fill="url(#folk-dots)" />
        <Tree x={1146} y={150} kind="coral" s={0.72} />
        <Dog x={924} y={118} s={1} />
        <path d="M660 260 C 780 226, 900 222, 1010 234 S 1150 224, 1200 230 L 1200 260 Z" fill={INK} />
        <Cat x={1060} y={180} s={0.9} fill={SKY} />
        {[[720, 254, PEACH], [760, 246, SKY], [812, 242, CORAL], [1000, 244, PEACH], [1170, 240, SKY]].map(([fx, fy, c], i) => <Flower key={i} x={fx as number} y={fy as number} c={c as string} />)}
        <g fill={CREAM} opacity="0.5">{[0, 1, 2, 3, 4].map((i) => <ellipse key={i} cx={850 + i * 30} cy={250 - (i % 2) * 4} rx="3.2" ry="2.4" />)}</g>
      </g>
    </svg>
  );
}

/** A small vignette for quiet, empty moments. */
export function FolkVignette({ className = "", tone = "day" }: { className?: string; tone?: "day" | "rest" }) {
  return (
    <svg className={className} viewBox="0 0 200 130" aria-hidden focusable="false">
      {tone === "day" ? <circle cx="150" cy="40" r="20" fill={CORAL} /> : <path d="M160 26 a 18 18 0 1 0 8 30 a 14 14 0 1 1 -8 -30 Z" fill={SKY} />}
      <Spark x={40} y={30} s={0.8} />
      <Spark x={118} y={18} s={0.6} c={CORAL} />
      <path d="M0 130 C 40 96, 100 90, 200 104 L 200 130 Z" fill={MIST} />
      <path d="M0 130 C 60 112, 140 108, 200 118 L 200 130 Z" fill={BLUE} />
      <Dog x={70} y={34} s={0.82} />
      <Flower x={30} y={128} c={PEACH} />
      <Flower x={170} y={126} c={CORAL} />
    </svg>
  );
}

/** A leafy sprig, used as a quiet rule ornament. */
export function FolkSprig({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 24" aria-hidden focusable="false">
      <path d="M4 12 H 116" stroke={INK} strokeWidth="1.4" opacity="0.4" />
      {[20, 44, 68, 92].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 12 q 6 -10 14 -8 q -4 8 -14 8 Z`} fill={i % 2 ? BLUE : CORAL} />
          <path d={`M${x + 4} 12 q 6 10 14 8 q -4 -8 -14 -8 Z`} fill={i % 2 ? SKY : PEACH} />
        </g>
      ))}
      <circle cx="60" cy="12" r="3" fill={CORAL} />
    </svg>
  );
}
