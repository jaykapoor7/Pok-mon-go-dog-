import type { CSSProperties, ReactNode } from "react";

/* ════════════════════════════════════════════════════════════════════
   Grain: StrayPaw's own greyscale "street light" texture.

   The reference sets product fragments on grainy black-and-white
   photographs. We do not own photographs like that, so each tile is drawn:
   a few blurred shapes (wall edges, wires, a lamp post, foliage, light
   through a gap) under film grain. Deterministic per variant, so server
   and client render the same thing, and no image request is made.
   ════════════════════════════════════════════════════════════════════ */

type Shape =
  | { k: "poly"; d: string; f: string; o?: number; b?: number }
  | { k: "line"; x1: number; y1: number; x2: number; y2: number; w: number; f: string; o?: number; b?: number }
  | { k: "blob"; cx: number; cy: number; rx: number; ry: number; f: string; o?: number; b?: number };

const SCENES: Shape[][] = [
  /* 0 · wall edge and overhead wires */
  [
    { k: "poly", d: "M0 0 L330 0 L250 600 L0 600Z", f: "#7a7a76", o: 0.85, b: 18 },
    { k: "poly", d: "M560 0 L800 0 L800 600 L640 600Z", f: "#9b9b97", o: 0.7, b: 26 },
    { k: "line", x1: -20, y1: 120, x2: 820, y2: 40, w: 5, f: "#3e3e3b", o: 0.8, b: 2.5 },
    { k: "line", x1: -20, y1: 170, x2: 820, y2: 120, w: 3, f: "#4a4a47", o: 0.7, b: 2 },
    { k: "line", x1: -20, y1: 470, x2: 820, y2: 330, w: 7, f: "#55554f", o: 0.45, b: 6 },
    { k: "blob", cx: 470, cy: 300, rx: 210, ry: 160, f: "#f2f2ee", o: 0.75, b: 40 },
  ],
  /* 1 · lamp post and foliage */
  [
    { k: "blob", cx: 140, cy: 110, rx: 230, ry: 150, f: "#5f605b", o: 0.7, b: 30 },
    { k: "blob", cx: 690, cy: 520, rx: 260, ry: 170, f: "#6b6b66", o: 0.65, b: 34 },
    { k: "line", x1: 610, y1: -20, x2: 560, y2: 640, w: 16, f: "#3a3a37", o: 0.75, b: 5 },
    { k: "line", x1: 560, y1: 70, x2: 470, y2: 92, w: 6, f: "#3a3a37", o: 0.7, b: 3 },
    { k: "blob", cx: 330, cy: 330, rx: 240, ry: 170, f: "#f4f4f0", o: 0.8, b: 46 },
  ],
  /* 2 · diagonal light through a gap */
  [
    { k: "poly", d: "M0 0 L800 0 L800 110 L0 330Z", f: "#6c6c68", o: 0.6, b: 30 },
    { k: "poly", d: "M0 470 L800 300 L800 600 L0 600Z", f: "#77776f", o: 0.55, b: 30 },
    { k: "line", x1: 80, y1: 640, x2: 300, y2: -40, w: 3, f: "#3c3c39", o: 0.55, b: 2 },
    { k: "line", x1: 140, y1: 640, x2: 360, y2: -40, w: 2, f: "#3c3c39", o: 0.45, b: 2 },
    { k: "blob", cx: 520, cy: 290, rx: 260, ry: 90, f: "#f6f6f2", o: 0.7, b: 34 },
  ],
  /* 3 · gate bars and soft shadow */
  [
    ...[60, 150, 240, 330, 420, 510, 600, 690].map((x, i): Shape => ({ k: "line", x1: x, y1: -20, x2: x + 40, y2: 640, w: i % 2 ? 9 : 13, f: "#4b4b47", o: 0.42, b: 7 })),
    { k: "blob", cx: 400, cy: 640, rx: 520, ry: 160, f: "#5b5b57", o: 0.55, b: 36 },
    { k: "blob", cx: 420, cy: 220, rx: 260, ry: 150, f: "#f3f3ef", o: 0.6, b: 44 },
  ],
  /* 4 · building corner, high window */
  [
    { k: "poly", d: "M380 0 L800 0 L800 600 L470 600Z", f: "#6d6d69", o: 0.7, b: 14 },
    { k: "poly", d: "M560 90 L700 90 L700 190 L560 190Z", f: "#e8e8e4", o: 0.6, b: 6 },
    { k: "poly", d: "M560 260 L700 260 L700 360 L560 360Z", f: "#e8e8e4", o: 0.45, b: 6 },
    { k: "line", x1: -20, y1: 80, x2: 820, y2: 260, w: 4, f: "#3d3d3a", o: 0.6, b: 2.5 },
    { k: "blob", cx: 180, cy: 330, rx: 230, ry: 200, f: "#f4f4f0", o: 0.65, b: 44 },
  ],
  /* 5 · leaves at the edge */
  [
    ...[[70, 70], [190, 40], [40, 220], [720, 80], [760, 260], [640, 560], [90, 540], [250, 590]].map(([cx, cy], i): Shape => ({ k: "blob", cx, cy, rx: 90 + (i % 3) * 30, ry: 60 + (i % 2) * 30, f: "#575853", o: 0.55, b: 22 })),
    { k: "line", x1: -20, y1: 360, x2: 820, y2: 300, w: 4, f: "#454541", o: 0.45, b: 4 },
    { k: "blob", cx: 410, cy: 300, rx: 260, ry: 190, f: "#f5f5f1", o: 0.7, b: 46 },
  ],
];

export function Grain({ v = 0, id, dark = false, className = "", style, children }: { v?: number; id: string; dark?: boolean; className?: string; style?: CSSProperties; children?: ReactNode }) {
  const scene = SCENES[((v % SCENES.length) + SCENES.length) % SCENES.length];
  const blurs = Array.from(new Set(scene.map((s) => s.b ?? 0))).filter(Boolean);
  return (
    <div className={`s4-grain${dark ? " is-dark" : ""} ${className}`.trim()} style={style}>
      <svg className="s4-grain-art" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs>
          {blurs.map((b) => (
            <filter key={b} id={`${id}-b${String(b).replace(".", "_")}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation={b} /></filter>
          ))}
          <filter id={`${id}-n`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed={v + 3} stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.9 -0.9 -0.9 0 1.32" />
          </filter>
        </defs>
        <rect width="800" height="600" fill={dark ? "#33363c" : "#d3d3cf"} />
        {scene.map((s, i) => {
          const filter = s.b ? `url(#${id}-b${String(s.b).replace(".", "_")})` : undefined;
          const fill = dark ? shade(s.f) : s.f;
          const o = Math.min(1, (s.o ?? 1) * 1.18);
          if (s.k === "poly") return <path key={i} d={s.d} fill={fill} opacity={o} filter={filter} />;
          if (s.k === "line") return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={fill} strokeWidth={s.w} strokeLinecap="round" opacity={o} filter={filter} />;
          return <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={fill} opacity={o} filter={filter} />;
        })}
        <rect width="800" height="600" filter={`url(#${id}-n)`} opacity={dark ? 0.55 : 0.72} />
      </svg>
      {children}
    </div>
  );
}

/** Night version of a shape colour: the same composition, darker. */
function shade(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const k = (c: number) => Math.round(c * 0.42).toString(16).padStart(2, "0");
  return `#${k(n >> 16)}${k((n >> 8) & 255)}${k(n & 255)}`;
}
