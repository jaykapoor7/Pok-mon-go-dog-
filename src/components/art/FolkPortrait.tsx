"use client";

/* ════════════════════════════════════════════════════════════════════
   A folk portrait for an animal with no photograph.

   Fewer than one record in two hundred carries a photo. Rather than a
   grid of identical placeholders, each animal gets its own small folk
   illustration, drawn in the brand colours and varied deterministically
   from its record id: pose, ears, markings, collar, ground and sky.

   It is an illustration, not a likeness: coat colours are the palette's,
   not the animal's, and every surface that shows it says so. A real
   photograph always replaces it.
   ════════════════════════════════════════════════════════════════════ */

import { useId } from "react";

const INK = "#0b1e3d", BLUE = "#2457ce", SKY = "#8fb7ff", CORAL = "#f05b40", PEACH = "#f8b9a3", CREAM = "#fbf7f0";

/* Ground and coat pairs that always read clearly against each other. */
const SCHEMES = [
  { bg: "#f6eee2", hill: "#ead9c2", coat: INK, mark: "#fbf7f0", sky: CORAL },
  { bg: "#e4ecfa", hill: "#c9d8f3", coat: INK, mark: "#fbf7f0", sky: CORAL },
  { bg: "#fbe6dd", hill: "#f6cdbd", coat: BLUE, mark: "#fbf7f0", sky: CORAL },
  { bg: "#f1ebdf", hill: "#dfd2bd", coat: CORAL, mark: "#fbf7f0", sky: BLUE },
  { bg: "#e7efe2", hill: "#cfdec6", coat: INK, mark: PEACH, sky: CORAL },
  { bg: "#eef2fb", hill: "#d6e1f6", coat: BLUE, mark: "#fbf7f0", sky: CORAL },
  { bg: "#f8efe6", hill: "#efdcca", coat: "#1e3763", mark: SKY, sky: CORAL },
  { bg: "#fdf1ea", hill: "#f4d6c8", coat: INK, mark: CORAL, sky: BLUE },
];

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}

export function FolkPortrait({ seed, className = "", label, size }: { seed: string; className?: string; label?: string; size?: string | null }) {
  const uid = useId().replace(/:/g, "");
  const r = rng(seed || "straypaw");
  const S = SCHEMES[Math.floor(r() * SCHEMES.length)];
  const pose = r() < 0.62 ? "sit" : "lie";
  const flip = r() < 0.5;
  const ears = ["up", "up", "flop", "one"][Math.floor(r() * 4)] as "up" | "flop" | "one";
  const marking = ["none", "blaze", "patch", "socks", "spots", "saddle"][Math.floor(r() * 6)];
  const collar = r() < 0.7;
  const sky = ["sun", "moon", "stars", "birds"][Math.floor(r() * 4)];
  const flowers = Math.floor(r() * 3) + 1;
  const clip = `fp-${uid}`;

  /* Body geometry, in a 200 × 200 box. */
  const sit = (
    <>
      <path d="M62 188 C 54 150, 66 116, 98 106 L 116 104 C 140 114, 150 150, 146 188 Z" />
      <path d="M80 112 C 80 92, 88 78, 100 74 L 118 82 C 118 96, 114 108, 108 114 Z" />
      <ellipse cx="102" cy="70" rx="25" ry="22" />
      <path d="M114 58 C 132 60, 150 70, 156 78 C 156 84, 150 88, 144 88 L 114 86 Z" />
    </>
  );
  const lie = (
    <>
      <ellipse cx="112" cy="160" rx="62" ry="22" />
      <ellipse cx="62" cy="134" rx="24" ry="21" />
      <path d="M48 128 C 36 130, 22 138, 18 144 C 18 150, 24 154, 30 154 L 50 150 Z" />
      <ellipse cx="44" cy="176" rx="18" ry="6" />
      <ellipse cx="74" cy="180" rx="18" ry="6" />
    </>
  );
  const bodyShapes = pose === "sit" ? sit : lie;

  const earsSit = ears === "up"
    ? <><path d="M86 56 L 84 26 L 104 48 Z" /><path d="M104 48 L 120 20 L 122 52 Z" /></>
    : ears === "flop"
      ? <><path d="M84 54 C 72 56, 68 76, 74 88 C 82 84, 88 70, 92 58 Z" /><path d="M112 50 C 124 46, 134 60, 132 74 C 124 72, 116 62, 110 54 Z" /></>
      : <><path d="M86 56 L 84 26 L 104 48 Z" /><path d="M112 50 C 124 46, 134 60, 132 74 C 124 72, 116 62, 110 54 Z" /></>;
  const earsLie = ears === "up"
    ? <><path d="M58 118 L 54 92 L 72 112 Z" /><path d="M70 114 L 84 92 L 84 120 Z" /></>
    : ears === "flop"
      ? <><path d="M54 120 C 44 122, 42 140, 48 150 C 56 146, 60 134, 62 124 Z" /><path d="M74 116 C 86 114, 92 128, 90 140 C 82 138, 76 128, 72 120 Z" /></>
      : <><path d="M58 118 L 54 92 L 72 112 Z" /><path d="M74 116 C 86 114, 92 128, 90 140 C 82 138, 76 128, 72 120 Z" /></>;

  const tail = pose === "sit"
    ? <path d="M62 170 C 34 166, 30 136, 48 128 C 60 124, 64 138, 54 142" fill="none" stroke={S.coat} strokeWidth="11" strokeLinecap="round" />
    : <path d="M170 156 C 192 150, 194 128, 180 122 C 170 120, 168 132, 176 136" fill="none" stroke={S.coat} strokeWidth="10" strokeLinecap="round" />;

  const marks = (() => {
    if (pose === "sit") switch (marking) {
      case "blaze": return <path d="M100 112 C 94 130, 96 160, 104 188 L 118 188 C 124 160, 122 130, 114 110 Z" fill={S.mark} />;
      case "patch": return <ellipse cx="110" cy="66" rx="13" ry="12" fill={S.mark} />;
      case "socks": return <><rect x="86" y="174" width="18" height="16" rx="5" fill={S.mark} /><rect x="112" y="174" width="18" height="16" rx="5" fill={S.mark} /></>;
      case "spots": return <><circle cx="80" cy="150" r="9" fill={S.mark} /><circle cx="128" cy="140" r="7" fill={S.mark} /><circle cx="118" cy="168" r="6" fill={S.mark} /></>;
      case "saddle": return <path d="M60 140 C 80 126, 120 124, 150 136 L 150 160 C 120 150, 84 152, 60 162 Z" fill={S.mark} opacity="0.9" />;
      default: return null;
    }
    switch (marking) {
      case "blaze": return <ellipse cx="44" cy="146" rx="10" ry="6" fill={S.mark} />;
      case "patch": return <ellipse cx="58" cy="128" rx="11" ry="10" fill={S.mark} />;
      case "socks": return <><ellipse cx="34" cy="176" rx="9" ry="6" fill={S.mark} /><ellipse cx="64" cy="180" rx="9" ry="6" fill={S.mark} /></>;
      case "spots": return <><circle cx="110" cy="152" r="9" fill={S.mark} /><circle cx="140" cy="160" r="7" fill={S.mark} /><circle cx="126" cy="146" r="5" fill={S.mark} /></>;
      case "saddle": return <path d="M90 140 C 110 132, 140 132, 166 144 L 168 158 C 140 150, 110 150, 88 156 Z" fill={S.mark} opacity="0.9" />;
      default: return null;
    }
  })();

  const eye = pose === "sit" ? <circle cx="112" cy="64" r="3.2" fill={marking === "patch" ? S.coat : CREAM} /> : <circle cx="54" cy="128" r="3" fill={marking === "patch" ? S.coat : CREAM} />;
  const nose = pose === "sit" ? <circle cx="154" cy="80" r="4" fill={INK} opacity={S.coat === INK ? 0.6 : 1} /> : <circle cx="20" cy="146" r="3.6" fill={INK} opacity={S.coat === INK ? 0.6 : 1} />;
  const collarEl = !collar ? null : pose === "sit"
    ? <path d="M84 104 Q 100 114 118 100" fill="none" stroke={S.coat === CORAL ? BLUE : CORAL} strokeWidth="6" strokeLinecap="round" />
    : <path d="M72 146 Q 80 152 86 140" fill="none" stroke={S.coat === CORAL ? BLUE : CORAL} strokeWidth="5" strokeLinecap="round" />;

  const skyEl = sky === "sun"
    ? <g><circle cx="160" cy="40" r="16" fill={S.sky} />{Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return <line key={i} x1={160 + Math.cos(a) * 22} y1={40 + Math.sin(a) * 22} x2={160 + Math.cos(a) * 28} y2={40 + Math.sin(a) * 28} stroke={S.sky} strokeWidth="2.6" strokeLinecap="round" />; })}</g>
    : sky === "moon"
      ? <path d="M166 24 a 18 18 0 1 0 10 32 a 14 14 0 1 1 -10 -32 Z" fill={S.sky} />
      : sky === "stars"
        ? <g fill={S.sky}>{[[150, 30, 1], [176, 52, 0.7], [134, 52, 0.55]].map(([x, y, k], i) => <path key={i} transform={`translate(${x} ${y}) scale(${k})`} d="M0 -10 L 2.5 -2.5 L 10 0 L 2.5 2.5 L 0 10 L -2.5 2.5 L -10 0 L -2.5 -2.5 Z" />)}</g>
        : <g fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" opacity="0.7"><path d="M140 34 q 6 -6 12 0 q 6 -6 12 0" /><path d="M164 52 q 4 -4 8 0 q 4 -4 8 0" /></g>;

  const flowerEls = Array.from({ length: flowers }, (_, i) => {
    const x = flip ? 30 + i * 18 : 170 - i * 18, c = [CORAL, SKY, PEACH][i % 3];
    return <g key={i} transform={`translate(${x} 194)`}><path d="M0 0 V -16" stroke={S.coat === INK ? "#3c5f9a" : INK} strokeWidth="1.6" opacity="0.6" /><circle cy="-19" r="4.4" fill={c} /><circle cy="-19" r="1.5" fill={CREAM} /></g>;
  });

  return (
    <svg className={className} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label ?? "Illustration, no photograph on record"}>
      <defs>
        <clipPath id={clip}>{bodyShapes}</clipPath>
        <pattern id={`${clip}-d`} width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill={INK} opacity="0.06" /></pattern>
      </defs>
      <rect width="200" height="200" fill={S.bg} />
      <rect width="200" height="200" fill={`url(#${clip}-d)`} />
      {skyEl}
      <path d="M-10 200 C 30 168, 90 160, 210 176 L 210 200 Z" fill={S.hill} />
      <g transform={`${flip ? "translate(200 0) scale(-1 1) " : ""}${size === "puppy" ? "translate(26 40) scale(0.74)" : size === "small" ? "translate(12 18) scale(0.88)" : ""}`.trim() || undefined}>
        {tail}
        <g fill={S.coat}>{bodyShapes}{pose === "sit" ? earsSit : earsLie}</g>
        <g clipPath={`url(#${clip})`}>{marks}</g>
        {collarEl}
        {eye}
        {nose}
      </g>
      {flowerEls}
    </svg>
  );
}
