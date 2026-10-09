/* ════════════════════════════════════════════════════════════════════
   The living ground behind every page of the app.

   A quiet folk landscape: clouds that drift, a sun whose rays turn
   slowly, birds crossing now and then, petals falling, and low hills
   along the bottom. On the hills stand real paintings, cut out of their
   paper: Gond animals by Bhaiyaji Smile 123 (CC BY-SA 4.0), different in
   each space, swaying a little and drifting with the scroll; a Company-
   school hoopoe perched by the sun; and a black dog from an 1890s study
   walking the hill like a paper puppet (both Cleveland Museum of Art,
   CC0). See lib/art/sources and /art-credits. All of it is decoration,
   aria-hidden, and it stands still for anyone who prefers reduced motion.
   ════════════════════════════════════════════════════════════════════ */

import "./backdrop.css";
import { FOLK_CUTOUTS, type CutoutKey } from "@/lib/art/sources";

const INK = "#0b1e3d", BLUE = "#2457ce", SKY = "#8fb7ff", MIST = "#d6e2f7", CORAL = "#f05b40", PEACH = "#f8b9a3", CREAM = "#fbf7f0";

function Cloud({ className }: { className: string }) {
  return (
    <svg className={`fb-cloud ${className}`} viewBox="0 0 220 80" aria-hidden focusable="false">
      <path d="M20 66 C 4 66, 2 46, 20 42 C 22 24, 46 16, 62 28 C 72 8, 108 4, 120 26 C 136 14, 168 20, 168 42 C 190 38, 210 52, 198 66 Z" fill="#ffffff" />
      <path d="M36 56 q 20 -8 40 0 M 96 50 q 22 -9 44 0" fill="none" stroke={MIST} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Far({ space }: { space: string }) {
  if (space === "ngo") return (
    <g transform="translate(1110 58)">
      <path d="M0 40 L 34 2 L 68 40 Z" fill={CORAL} opacity="0.85" />
      <path d="M34 2 L 22 40 L 46 40 Z" fill={INK} opacity="0.75" />
      <path d="M34 2 V -10" stroke={INK} strokeWidth="2" /><path d="M34 -10 l 12 4 -12 4 Z" fill={BLUE} />
    </g>
  );
  if (space === "city") return (
    <g transform="translate(1060 22)" opacity="0.8">
      {[[0, 34, 22, BLUE], [26, 14, 20, INK], [50, 28, 18, SKY], [72, 6, 22, BLUE], [98, 26, 20, INK]].map(([x, y, w, c], i) => <rect key={i} x={x as number} y={y as number} width={w as number} height={80 - (y as number)} fill={c as string} />)}
    </g>
  );
  return (
    <g transform="translate(1080 42)" opacity="0.85">
      {[[0, CORAL], [34, BLUE], [68, INK]].map(([x, roof], i) => (
        <g key={i} transform={`translate(${x} ${i === 1 ? -6 : 0})`}>
          <rect x="2" y="16" width="26" height="26" fill={CREAM} stroke={INK} strokeWidth="1.4" />
          <path d="M-3 18 L 15 0 L 33 18 Z" fill={roof as string} />
          <rect x="11" y="28" width="8" height="14" fill={INK} />
        </g>
      ))}
    </g>
  );
}

/* Which painted animals stand on the hills in each space. */
const GROVE: Record<string, [CutoutKey, CutoutKey]> = {
  community: ["cowCalf", "peacocks"],
  ngo: ["elephantTree", "hen"],
  city: ["elephant", "bird"],
};

function Cut({ k, className }: { k: CutoutKey; className: string }) {
  const c = FOLK_CUTOUTS[k];
  return <img className={`fb-cut ${className}`} src={c.src} alt="" loading="lazy" decoding="async" draggable={false} style={{ aspectRatio: String(c.ratio) }} />;
}

export function FolkBackdrop({ space = "community" }: { space?: string }) {
  const [left, right] = GROVE[space] ?? GROVE.community;
  return (
    <div className="fb" aria-hidden>
      <div className="fb-scatter" />
      <svg className="fb-sun" viewBox="0 0 120 120" focusable="false">
        <g className="fb-rays">
          {Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return <line key={i} x1={60 + Math.cos(a) * 38} y1={60 + Math.sin(a) * 38} x2={60 + Math.cos(a) * (i % 2 ? 48 : 54)} y2={60 + Math.sin(a) * (i % 2 ? 48 : 54)} stroke={CORAL} strokeWidth="3.4" strokeLinecap="round" />; })}
        </g>
        <circle cx="60" cy="60" r="30" fill={CORAL} />
        <circle cx="60" cy="60" r="20" fill={PEACH} opacity="0.6" />
      </svg>
      <Cloud className="c1" />
      <Cloud className="c2" />
      <Cloud className="c3" />
      <svg className="fb-birds" viewBox="0 0 80 30" focusable="false">
        <path className="fb-wing" d="M2 14 q 7 -8 14 0 q 7 -8 14 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        <path className="fb-wing b2" d="M40 24 q 5 -6 10 0 q 5 -6 10 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="fb-petals">{Array.from({ length: 9 }, (_, i) => <i key={i} className={`p${i}`} />)}</div>
      <Cut k="hoopoe" className="fb-hoopoe" />
      <div className="fb-grove">
        <Cut k={left} className="fb-left" />
        <Cut k={right} className="fb-right" />
      </div>
      <svg className="fb-hills" viewBox="0 0 1440 120" preserveAspectRatio="none" focusable="false">
        <defs>
          <pattern id="fb-dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.4" fill={CREAM} opacity="0.4" /></pattern>
        </defs>
        <path d="M0 120 L 0 70 C 180 30, 360 40, 520 64 S 860 30, 1040 50 S 1300 30, 1440 52 L 1440 120 Z" fill={MIST} />
        <Far space={space} />
        <path d="M0 120 L 0 92 C 220 70, 420 76, 640 90 S 1060 70, 1260 84 S 1400 80, 1440 86 L 1440 120 Z" fill={BLUE} opacity="0.9" />
        <path d="M0 120 L 0 92 C 220 70, 420 76, 640 90 S 1060 70, 1260 84 S 1400 80, 1440 86 L 1440 120 Z" fill="url(#fb-dots)" />
        <path d="M0 120 L 0 108 C 300 98, 640 100, 900 108 S 1300 102, 1440 106 L 1440 120 Z" fill="#1c3a80" opacity="0.75" />
      </svg>
      <div className="fb-walker"><Cut k="dogStanding" className="fb-puppet" /></div>
    </div>
  );
}
