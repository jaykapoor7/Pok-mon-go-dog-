"use client";

import { useRef, useState, useEffect, type CSSProperties } from "react";
import { motion, useScroll, useMotionValueEvent, useTransform, useMotionValue, useSpring, type MotionValue } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GlobeScene } from "./Globe";

/* ------------------------------------------------------------------ */
/*  Scroll-driven hero — illustrated dog journey through Indian streets */
/* ------------------------------------------------------------------ */

interface Stage {
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
}

const STAGES: Stage[] = [
  {
    id: "hero",
    eyebrow: "Street-animal infrastructure for India",
    headline: "See the street.\nChange the system.",
    body: "StrayPaw collects, connects, and presents the fragmented ecosystem around India's street animals, so the right people can act.",
  },
  {
    id: "problem",
    eyebrow: "The scale",
    headline: "India carries more of this\nthan any country on Earth.",
    body: "Nearly 59,000 people die of rabies every year, almost all of it from dog bites. India's toll is the highest of any single nation, and it's why StrayPaw starts here.",
  },
  {
    id: "notice",
    eyebrow: "01 / Notice",
    headline: "It starts with\nsomeone noticing.",
    body: "A street dog on a corner. A limp. A litter under a parked car. Every act of care begins here, with one person paying attention.",
  },
  {
    id: "report",
    eyebrow: "02 / Report",
    headline: "One tap turns a\nprivate moment into data.",
    body: "A photo, a location, a condition. StrayPaw captures the sighting as a shared record in the time it takes to send a text.",
  },
  {
    id: "understand",
    eyebrow: "03 / Understand",
    headline: "The dog becomes\na real animal on record.",
    body: "Sightings from strangers, feeders, and rescuers add up. Same dog. Different eyes. One living profile that grows over time.",
  },
  {
    id: "connect",
    eyebrow: "04 / Connect",
    headline: "The right people find\neach other.",
    body: "The person who reported. An NGO working the area. A vet who can treat. A volunteer who can transport. One connected thread instead of a WhatsApp forward chain.",
  },
  {
    id: "act",
    eyebrow: "05 / Act",
    headline: "Treatment. Vaccination.\nFollow-up. One thread.",
    body: "Every intervention attaches to the same record. Nothing is lost, nothing is repeated. Anyone helping later starts where the last person stopped.",
  },
  {
    id: "scale",
    eyebrow: "06 / Scale",
    headline: "One dog is one node\nin a living network.",
    body: "Multiply this by every street in India. StrayPaw is the shared surface that makes each animal visible and adds up to a picture worth acting on.",
  },
];

const N = STAGES.length;

/** Per-stage accent color, shared between the eyebrow line-draw accent and
 *  the right-edge stage-dot indicator so both read as one system. */
const ACCENT = ["#4EBDDB","#64748b","#F59E0B","#06b6d4","#a78bfa","#34d399","#f97316","#4EBDDB"];

/** Relative scroll distance given to each stage. The globe (converge+burst)
 *  and connect (node network) stages get real hero-length dwell time
 *  instead of flashing past in a fraction of a second like the rest. */
const STAGE_WEIGHTS = [1, 1.9, 1.3, 1.1, 1.3, 1.8, 1.1, 1.3];
const TOTAL_WEIGHT = STAGE_WEIGHTS.reduce((a, b) => a + b, 0);
/** Cumulative scroll-fraction boundary where each stage begins; BOUNDS[N] = 1. */
const BOUNDS = STAGE_WEIGHTS.reduce<number[]>((acc, w) => {
  acc.push((acc[acc.length - 1] ?? 0) + w / TOTAL_WEIGHT);
  return acc;
}, [0]);

function stageAt(v: number): number {
  for (let i = N - 1; i >= 0; i--) {
    if (v >= BOUNDS[i]) return i;
  }
  return 0;
}

/* Hand-drawn vector accents, ported from the supplied Framer "Line 01" and
   "Shape 1" reference components (their literal path geometry, redrawn as
   plain SVG driven by our own scroll state instead of Framer's runtime). */
const LINE01_PATH = "M 0 20.908 C 101.53 2.648 205.2 -3.692 308.2 2.048 C 220.5 0.828 132.67 9.358 46.85 27.438 C 130.54 21.648 214.24 15.868 297.93 10.078 C 217.82 11.168 137.84 21.218 0 20.908 Z";
const SHAPE1_PATH = "M 34.756 1.244 C 31.976 -1.536 25.189 0.502 18 5.778 C 10.811 0.502 4.024 -1.536 1.244 1.244 C -1.536 4.024 0.502 10.811 5.778 18 C 0.502 25.189 -1.536 31.976 1.244 34.756 C 4.024 37.536 10.811 35.498 18 30.222 C 25.189 35.498 31.976 37.536 34.756 34.756 C 37.536 31.976 35.498 25.189 30.222 18 C 35.498 10.811 37.536 4.024 34.756 1.244 Z";

/* ───────────────────────────────────────────────────────────────────
   Illustrated dog — brush-stroke style inspired by loose ink drawing.
   Key features: angular bracket ears, big round body, minimal face,
   paws as simple strokes. Colored for warmth. All poses share these
   design principles: few shapes, bold lines, expressive simplicity.
─────────────────────────────────────────────────────────────────── */
/** Lighten/darken a #rrggbb hex color by a fraction (-1..1). */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt))));
  r = f(r); g = f(g); b = f(b);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function Dog({
  x = 0,
  y = 0,
  sc = 1,
  pose = "sit",
  col = "#F5A623",
  id = "dog",
}: {
  x?: number;
  y?: number;
  sc?: number;
  pose?: "sit" | "lie" | "stand" | "lookup";
  col?: string;
  id?: string;
}) {
  const dk = "#C17D11";
  const ink = "#1a0e00";
  const light = shade(col, 0.32);
  const shadow = shade(col, -0.38);

  /* Shared minimal face */
  function Face(ex1: number, ey1: number, ex2: number, ey2: number, nx: number, ny: number) {
    return (
      <>
        <circle cx={ex1} cy={ey1} r="3" fill={ink} />
        <circle cx={ex2} cy={ey2} r="3" fill={ink} />
        <circle cx={ex1 + 1.2} cy={ey1 - 1.2} r="1.3" fill="white" opacity="0.9" />
        <circle cx={ex2 + 1.2} cy={ey2 - 1.2} r="1.3" fill="white" opacity="0.9" />
        <ellipse cx={nx} cy={ny} rx="3.8" ry="2.2" fill={dk} />
        <path d={`M${nx - 5},${ny + 5} Q${nx},${ny + 9} ${nx + 5},${ny + 5}`}
          stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    );
  }

  if (pose === "sit") {
    /* Naturalistic pariah-dog silhouette: rounded continuous torso/head
       silhouette, upright triangular ears (pointed, not rounded — a
       rounded tip reads as a rabbit/bunny ear rather than a dog's),
       gentle almond eyes. Gradient-shaded (top-lit, warm ambient-
       occlusion shadow) for a semi-realistic painterly read rather
       than flat cartoon color fields. */
    return (
      <g transform={`translate(${x},${y}) scale(${sc})`}>
        <defs>
          <linearGradient id={`${id}fur`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor={light} />
            <stop offset="55%" stopColor={col} />
            <stop offset="100%" stopColor={shadow} />
          </linearGradient>
          <radialGradient id={`${id}head`} cx="35%" cy="25%" r="80%">
            <stop offset="0%" stopColor={light} />
            <stop offset="70%" stopColor={col} />
            <stop offset="100%" stopColor={shadow} />
          </radialGradient>
          <radialGradient id={`${id}grnd`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Contact shadow — grounds the dog in the scene */}
        <ellipse cx="26" cy="90" rx="27" ry="6" fill={`url(#${id}grnd)`} />
        {/* Tail — resting curve, not raised/alert */}
        <path d="M50,60 Q65,55 68,40 Q70,27 80,22"
          stroke={shade(col, -0.1)} strokeWidth="6.5" fill="none" strokeLinecap="round" />
        {/* Haunch shadow (sitting hindquarters, sits low/wide) */}
        <path d="M12,82 Q3,68 8,50 Q13,36 28,35 Q40,35 42,50 Q44,66 34,78 Q24,86 12,82Z"
          fill={shadow} opacity="0.6" />
        {/* Torso — single continuous rounded silhouette, chest forward */}
        <path d="M8,76 Q0,58 6,40 Q11,22 28,15 Q40,10 50,20 Q58,29 55,44 Q52,60 42,73 Q28,82 8,76Z"
          fill={`url(#${id}fur)`} />
        {/* Chest highlight */}
        <path d="M12,50 Q10,34 20,25 Q28,19 35,26 Q40,34 33,45 Q26,54 16,55 Q12,53 12,50Z"
          fill={light} opacity="0.4" />
        {/* Head — rounder, realistic proportion, gentle muzzle */}
        <path d="M8,36 Q6,20 22,13 Q37,8 47,19 Q53,28 46,38 Q39,46 24,45 Q12,44 8,36Z"
          fill={`url(#${id}head)`} />
        {/* Muzzle */}
        <path d="M43,25 Q54,24 56,31 Q56,37 48,37 Q43,34 43,25Z" fill={shade(col, 0.1)} />
        {/* Left ear — upright, pointed (pariah-dog signature), moderate
            length rather than the earlier blade-like extreme */}
        <path d="M14,19 L6,4 Q4,1 7,1 Q13,3 18,13 Q19,17 14,19Z" fill={dk} />
        <path d="M12,16 L7,5 Q11,7 14,13Z" fill={shade(dk, -0.25)} opacity="0.55" />
        {/* Right ear — upright, pointed */}
        <path d="M30,13 L39,-1 Q41,-4 43,-1 Q44,5 36,15 Q32,17 30,13Z" fill={dk} />
        <path d="M33,10 L40,0 Q40,5 34,13Z" fill={shade(dk, -0.25)} opacity="0.55" />
        {/* Almond eyes, calm gaze */}
        <path d="M19,27 Q22,24 26,27 Q22,30 19,27Z" fill={ink} />
        <path d="M31,24 Q34,21 38,24 Q34,27 31,24Z" fill={ink} />
        <ellipse cx="50" cy="30" rx="3" ry="2" fill={dk} />
        <path d="M50,32 L50,35" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />
        {/* Legs — slimmer, more defined than a stroke */}
        <path d="M12,74 Q8,82 7,90 L13,90 Q14,82 17,75Z" fill={dk} />
        <path d="M25,78 Q23,86 22,92 L28,92 Q29,85 31,79Z" fill={dk} />
        <path d="M40,74 Q44,82 46,90 L40,91 Q38,83 35,76Z" fill={dk} />
      </g>
    );
  }

  if (pose === "lie") {
    return (
      <g transform={`translate(${x},${y}) scale(${sc})`}>
        {/* Tail */}
        <path d="M94,42 Q108,28 104,12 Q102,4 114,0"
          stroke={col} strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* Hindquarters — back body mass */}
        <path d="M64,30 Q72,18 88,22 Q106,28 108,48 Q108,64 92,68 Q74,72 64,60 Q56,50 64,30Z"
          fill={col} />
        {/* Main front body + head — the dominant big blob */}
        <path d="M4,28 Q6,10 28,6 Q50,2 62,14 Q74,26 70,46 Q66,64 46,70 Q24,74 10,64 Q0,56 2,42 Q2,36 4,28Z"
          fill={col} />
        {/* Left ear — angular bracket */}
        <path d="M8,26 L-4,18 L-4,40 Q-2,54 10,52 Q18,50 16,38 Z"
          fill={dk} />
        {/* Right ear — angular bracket */}
        <path d="M44,8 L58,4 L60,26 Q58,40 46,40 Q38,38 40,26 Z"
          fill={dk} />
        {Face(24, 28, 42, 26, 34, 36)}
        {/* Front paws — minimal strokes */}
        <path d="M8,64 Q4,72 2,80" stroke={dk} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M24,68 Q20,76 18,84" stroke={dk} strokeWidth="6" fill="none" strokeLinecap="round" />
        {/* Back paw suggestion */}
        <path d="M96,66 Q100,72 102,78" stroke={dk} strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
    );
  }

  if (pose === "stand") {
    return (
      <g transform={`translate(${x},${y}) scale(${sc})`}>
        {/* Tail */}
        <path d="M54,24 Q66,12 62,-2"
          stroke={col} strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* Body */}
        <path d="M8,42 Q8,26 22,16 Q36,8 52,14 Q66,22 64,40 Q62,56 46,62 Q28,66 14,56 Q6,50 8,42Z"
          fill={col} />
        {/* Head */}
        <path d="M8,40 Q10,20 30,14 Q50,12 58,28 Q62,44 34,48 Q10,50 8,40Z"
          fill={col} />
        {/* Left ear */}
        <path d="M10,38 L-4,28 L-4,52 Q-2,64 10,62 Q18,60 16,48 Z"
          fill={dk} />
        {/* Right ear */}
        <path d="M52,24 L66,16 L66,40 Q64,52 52,50 Q44,48 46,36 Z"
          fill={dk} />
        {Face(20, 30, 38, 28, 30, 36)}
        {/* Legs */}
        <path d="M12,60 Q10,70 10,80" stroke={dk} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M26,62 Q24,72 24,82" stroke={dk} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M42,62 Q42,72 42,82" stroke={dk} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M56,60 Q58,70 58,80" stroke={dk} strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
    );
  }

  // lookup pose — head tilted up, hopeful eyes
  return (
    <g transform={`translate(${x},${y}) scale(${sc})`}>
      {/* Tail */}
      <path d="M54,52 Q70,36 66,18 Q64,8 76,4"
        stroke={col} strokeWidth="7" fill="none" strokeLinecap="round" />
      {/* Body */}
      <path d="M8,74 Q2,58 6,44 Q10,30 26,22 Q42,16 56,24 Q68,34 64,52 Q60,68 44,78 Q26,82 12,76 Q6,74 8,74Z"
        fill={col} />
      {/* Head — tilted up, eyes high */}
      <path d="M8,36 Q10,16 30,12 Q50,10 58,26 Q62,42 36,48 Q12,50 8,36Z"
        fill={col} />
      {/* Left ear */}
      <path d="M10,34 L-4,24 L-4,50 Q-2,62 10,60 Q18,58 16,46 Z"
        fill={dk} />
      {/* Right ear */}
      <path d="M52,24 L66,16 L66,42 Q64,54 52,52 Q44,50 46,38 Z"
        fill={dk} />
      {/* Eyes looking up — placed higher, slightly taller ellipses */}
      <ellipse cx="22" cy="26" rx="3.5" ry="4.2" fill={ink} />
      <ellipse cx="40" cy="24" rx="3.5" ry="4.2" fill={ink} />
      <circle cx="23.8" cy="23.6" r="1.6" fill="white" opacity="0.9" />
      <circle cx="41.8" cy="21.6" r="1.6" fill="white" opacity="0.9" />
      <ellipse cx="32" cy="34" rx="3.8" ry="2.2" fill={dk} />
      <path d="M27,39 Q32,44 37,39"
        stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Paws */}
      <path d="M12,74 Q8,82 6,88" stroke={dk} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M28,78 Q24,86 22,92" stroke={dk} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M48,76 Q52,84 54,90" stroke={dk} strokeWidth="6" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** AnimatedPath — a hand-drawn connective line that draws itself in via
 *  pathLength as the scene becomes active, ported from the AnimatedPath
 *  reference: scroll-driven narrative paths that visually link one story
 *  beat to the next, rather than a static decoration. Used as the actual
 *  connective visual inside a scene (person→dog gaze, sighting→profile),
 *  not just the small StagePanel eyebrow accent. */
function AnimatedPath({ d, active, color = "#f5c040", width = 2.2, delay = 0, glow = true }:
  { d: string; active: boolean; color?: string; width?: number; delay?: number; glow?: boolean }) {
  return (
    <>
      {glow && (
        <motion.path d={d} stroke={color} strokeWidth={width * 3.2} fill="none"
          strokeLinecap="round" opacity="0.16"
          initial={false}
          animate={active ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 1.5, delay, ease: "easeInOut" }} />
      )}
      <motion.path d={d} stroke={color} strokeWidth={width} fill="none"
        strokeLinecap="round"
        initial={false}
        animate={active ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={{ duration: 1.5, delay, ease: "easeInOut" }} />
    </>
  );
}

/* ───────────────────────────────────────────────────────────────────
   Scene helper shapes — Indian street elements
─────────────────────────────────────────────────────────────────── */

/** Auto-rickshaw silhouette (simplified 3-wheeler) */
function AutoRickshaw({ x, y, sc = 1, flip = false }: { x: number; y: number; sc?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -sc : sc},${sc})`}>
      {/* Body */}
      <path d="M0,30 Q0,16 8,12 L50,12 Q58,12 58,20 L58,30 Z" fill="#1e3a5f" stroke="#2a5080" strokeWidth="0.8" />
      {/* Hood */}
      <path d="M8,12 Q12,4 24,2 L44,2 Q52,4 50,12Z" fill="#152840" />
      {/* Windscreen */}
      <rect x="10" y="6" width="32" height="8" rx="2" fill="#0e4a6e" opacity="0.8" />
      {/* Driver silhouette */}
      <ellipse cx="22" cy="18" rx="5" ry="6" fill="#0e1c2e" />
      {/* Passenger area */}
      <rect x="32" y="14" width="24" height="16" rx="2" fill="#0a1e35" stroke="#1a3a5a" strokeWidth="0.5" />
      {/* Stripe */}
      <line x1="0" y1="24" x2="58" y2="24" stroke="#e8a020" strokeWidth="1.5" opacity="0.7" />
      {/* Wheels */}
      <circle cx="12" cy="30" r="7" fill="#111" stroke="#333" strokeWidth="1.5" />
      <circle cx="12" cy="30" r="3" fill="#222" />
      <circle cx="50" cy="30" r="7" fill="#111" stroke="#333" strokeWidth="1.5" />
      <circle cx="50" cy="30" r="3" fill="#222" />
    </g>
  );
}

/** Street lamp post */
function Lamp({ x, y, glowing = true }: { x: number; y: number; glowing?: boolean }) {
  return (
    <g>
      {/* Post */}
      <line x1={x} y1={y} x2={x} y2={y + 80} stroke="#2a3448" strokeWidth="3" strokeLinecap="round" />
      {/* Arm */}
      <path d={`M${x},${y} Q${x + 18},${y} ${x + 18},${y + 14}`} stroke="#2a3448" strokeWidth="2.5" fill="none" />
      {/* Lamp head */}
      <rect x={x + 10} y={y + 14} width="16" height="8" rx="4" fill="#2a3448" />
      {/* Light */}
      {glowing && (
        <>
          <ellipse cx={x + 18} cy={y + 22} rx="30" ry="18" fill="#F59E0B" opacity="0.08" />
          <ellipse cx={x + 18} cy={y + 22} rx="16" ry="10" fill="#F59E0B" opacity="0.12" />
          <circle cx={x + 18} cy={y + 18} r="4" fill="#FFD060" opacity="0.9" />
        </>
      )}
    </g>
  );
}

/** Person silhouette (walking / standing) */
function Person({ x, y, sc = 1, walking = false, col = "#1e2d45" }: { x: number; y: number; sc?: number; walking?: boolean; col?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${sc})`}>
      {/* Head */}
      <circle cx="8" cy="4" r="6" fill={col} />
      {/* Body */}
      <path d="M3,10 Q8,22 13,10" fill={col} />
      <rect x="4" y="10" width="8" height="14" rx="3" fill={col} />
      {/* Arms */}
      {walking ? (
        <>
          <line x1="4" y1="14" x2="-3" y2="24" stroke={col} strokeWidth="3" strokeLinecap="round" />
          <line x1="12" y1="14" x2="18" y2="22" stroke={col} strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <line x1="4" y1="14" x2="0" y2="22" stroke={col} strokeWidth="3" strokeLinecap="round" />
          <line x1="12" y1="14" x2="16" y2="22" stroke={col} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {/* Legs */}
      {walking ? (
        <>
          <line x1="6" y1="24" x2="2" y2="38" stroke={col} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="10" y1="24" x2="15" y2="36" stroke={col} strokeWidth="3.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <line x1="6" y1="24" x2="4" y2="38" stroke={col} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="10" y1="24" x2="12" y2="38" stroke={col} strokeWidth="3.5" strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

/** Indian flat-roofed building silhouette */
function Building({
  x, y, w, h, windows = true, tank = false, col = "#111827",
}: { x: number; y: number; w: number; h: number; windows?: boolean; tank?: boolean; col?: string }) {
  const colW = Math.max(10, w / 3);
  const rowH = Math.max(10, h / 4);
  const winW = Math.max(6, w / 5);
  const winH = Math.max(6, h / 5);
  const cols = [0, 1, 2].filter((c) => x + 8 + c * colW + winW < x + w - 4);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={col} />
      {/* Parapet wall at top */}
      <rect x={x - 2} y={y - 5} width={w + 4} height="5" fill={col} />
      {tank && <rect x={x + w / 2 - 8} y={y - 18} width="16" height="13" rx="2" fill="#0e1a2e" />}
      {windows && [0, 1, 2].flatMap((row) =>
        cols.map((c, ci) => (
          <rect
            key={`${row}-${ci}`}
            x={x + 8 + c * colW}
            y={y + 8 + row * rowH}
            width={winW}
            height={winH}
            rx="1"
            fill="#0e4a6e"
            opacity={(row + ci) % 3 === 0 ? 0.15 : 0.55}
          />
        ))
      )}
    </g>
  );
}

/* ───────────────────────────────────────────────────────────────────
   Shared street-base helper — cinematic Indian street at golden hour.
   Perspective: horizon y=175, road trapezoid 0,300→400,300→255,175→145,175.
   Each scene passes its gradient-ID prefix to avoid conflicts.
─────────────────────────────────────────────────────────────────── */
function StreetBg({
  id,
  warm = true,
}: {
  id: string;
  warm?: boolean;
}) {
  /* Real Delhi street photo — the same photograph used in the hero,
     reused as the background across every scene instead of hand-drawn
     buildings, so the real street carries the whole journey rather than
     just the opening frame. `warm` shifts the color grade to distinguish
     a scene's mood (amber for the street beats, cooler blue for
     Understand's data moment) instead of swapping illustrated art. */
  return (
    <>
      <defs>
        <linearGradient id={`${id}grade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={warm ? "#1a0a02" : "#050a16"} stopOpacity="0.4" />
          <stop offset="55%"  stopColor={warm ? "#1a0a02" : "#050a16"} stopOpacity="0.12" />
          <stop offset="100%" stopColor={warm ? "#100602" : "#03060e"} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <image href="/hero/street-real.jpg" x="0" y="0" width="400" height="300"
        preserveAspectRatio="xMidYMid slice" />
      <rect width="400" height="300" fill={warm ? "#7a3a10" : "#0a1830"} opacity={warm ? 0.16 : 0.34} />
      <rect width="400" height="300" fill={`url(#${id}grade)`} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SCENE POSITIONING NOTES
   ViewBox 400×300. Horizon y=175. Road trapezoid: far(145,175→255,175)
   near(0,300→400,300). Road left edge = 145*(300-y)/125, right = 255+145*(y-175)/125.
   Dog sit pose: local x[-4,76] y[2,90]. At sc=0.64: 51px wide, 57px tall.
   Standard mid-ground dog: x=183, y=196 → paws at y=254, within road ✓
   All elements kept in x=160–260 for mobile portrait visibility.
═══════════════════════════════════════════════════════════════════ */

/* ─── SCENE 0: Hero — real Delhi street photo, dogs already in frame ───
   Opens on real life, not illustration: a real street photograph, the
   film grain (mounted globally in ScrollExperience) reading against it
   from the first frame, and a sparse, scroll-drawn sighting overlay —
   the same pin/connection language that carries through the rest of
   the journey — introduced here at its quietest, over dogs already
   visible in the photo rather than a fabricated cartoon dog. */
const HERO_SIGHTINGS: [number, number][] = [[118, 196], [214, 178], [286, 158], [64, 214]];
const HERO_LINKS: [number, number][] = [[0, 1], [1, 2], [0, 3]];

function SceneHero({ active }: { active: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-ink">
      <motion.div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/hero/street-real.jpg)" }}
        initial={false}
        animate={active ? { scale: 1.05 } : { scale: 1 }}
        transition={{ duration: 16, ease: "linear" }}
      />
      {/* Depth vignette — keeps stage copy and the sighting overlay legible
          against a busy real photo without hiding the street itself. */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/72 via-transparent to-ink/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/25 to-transparent" />

      <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        {HERO_LINKS.map(([a, b], i) => (
          <AnimatedPath key={`l${i}`}
            d={`M${HERO_SIGHTINGS[a][0]},${HERO_SIGHTINGS[a][1]} L${HERO_SIGHTINGS[b][0]},${HERO_SIGHTINGS[b][1]}`}
            active={active} color="#F5A623" width={1} delay={0.9 + i * 0.22} glow={false} />
        ))}
        {HERO_SIGHTINGS.map(([sx, sy], i) => (
          <motion.g key={`p${i}`}
            initial={false}
            animate={active ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.5 + i * 0.3 }}>
            <motion.circle cx={sx} cy={sy} r="10" fill="#F5A623"
              animate={active ? { opacity: [0.05, 0.22, 0.05], r: [8, 15, 8] } : { opacity: 0 }}
              transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.4 }} />
            <circle cx={sx} cy={sy} r="3" fill="#F5A623" />
          </motion.g>
        ))}
      </svg>
    </div>
  );
}

/* ─── SCENE 1: Problem — cold street, disconnected ─── */
/* SCENE 1 (globe) lives in ./Globe.tsx — GlobeScene, wired directly into
   SCENES below. It replaces the old abstract "disconnected nodes" SVG:
   same narrative job (the scale of the problem), done with real, sourced
   data instead of decorative dots. */

/* ─── SCENE 2: Notice — person stops, dog looks up ─── */
function SceneNotice({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <StreetBg id="h2" warm />

      {/* Auto-rickshaw — mid-distance left */}
      <g opacity="0.5">
        <AutoRickshaw x={82} y={200} sc={0.5} />
      </g>

      {/* Far background pedestrian */}
      <rect x="294" y="200" width="6" height="16" rx="3" fill="#2a1208" opacity="0.55" />
      <circle cx="297" cy="197" r="4" fill="#2a1208" opacity="0.55" />

      {/* Person who stopped — right of dog, facing left */}
      <motion.g animate={active ? {y:[0,-1.5,0]} : {y:0}} transition={{duration:3.2, repeat:Infinity}}>
        <rect x="252" y="202" width="13" height="32" rx="5" fill="#4a2a10" />
        <circle cx="258" cy="197" r="9" fill="#c48257" />
        <path d="M252,215 Q236,224 220,234"
          stroke="#4a2a10" strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="253" y="232" width="5" height="20" rx="2.5" fill="#2a1808" />
        <rect x="260" y="232" width="5" height="20" rx="2.5" fill="#2a1808" />
      </motion.g>

      {/* Warm gaze glow between them */}
      <motion.ellipse cx="224" cy="248" rx="30" ry="10"
        fill="#f5c040"
        animate={active ? {opacity:[0.06,0.18,0.06], ry:[10,15,10]} : {opacity:0.05}}
        transition={{duration:2.4, repeat:Infinity}} />

      {/* Dog now handled by the persistent instance. */}
      <ellipse cx="191" cy="254" rx="19" ry="4" fill="#8a4410" opacity="0.15" />

      {/* Gaze becomes a connection — the scroll-drawn narrative path
          (AnimatedPath reference), not a decorative dashed hint. */}
      <AnimatedPath d="M252,204 Q232,208 214,220 Q200,228 192,238"
        active={active} color="#f5c040" width={2.4} delay={0.15} />
    </svg>
  );
}

/* ─── SCENE 3: Report — phone foreground, dog in background ─── */
function SceneReport({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <StreetBg id="h3" warm />

      {/* Dog now handled by the persistent instance (small, left of phone). */}

      {/* Green pin over the dog's position */}
      <motion.g animate={active ? {y:[0,-5,0]} : {y:0}} transition={{duration:1.8, repeat:Infinity}}>
        <motion.circle cx="170" cy="209" r="12" fill="#22c55e"
          animate={active ? {opacity:[0,0.15,0], r:[10,18,10]} : {opacity:0}}
          transition={{duration:2.4, repeat:Infinity}} />
        <path d="M170,224 Q170,215 165,208 Q158,198 170,193 Q182,198 175,208 Q170,215 170,224Z"
          fill="#22c55e" />
        <circle cx="170" cy="200" r="4" fill="#0a1818" />
      </motion.g>

      {/* Phone body — right of centre */}
      <rect x="232" y="60" width="80" height="140" rx="11" fill="#111827" stroke="#22c55e" strokeWidth="1.4" />
      <rect x="238" y="71" width="68" height="106" rx="5"  fill="#0a0e16" />
      <rect x="256" y="64" width="24" height="5"   rx="2.5" fill="#0a0e16" />

      {/* Photo on phone screen — a real crop of the street photo (a dog
          already in frame), not an illustration: this is meant to read
          as an actual reported photo, not decorative art. */}
      <rect x="240" y="73" width="64" height="54" rx="4" fill="#0e1620" />
      <defs>
        <clipPath id="reportPhoneShot">
          <rect x="240" y="73" width="64" height="54" rx="4" />
        </clipPath>
      </defs>
      <image href="/hero/street-real.jpg" clipPath="url(#reportPhoneShot)"
        x="0" y="0" width="400" height="300" preserveAspectRatio="xMidYMid slice" />

      {/* Pin on phone screen */}
      <motion.g animate={active ? {y:[0,-3,0]} : {y:0}} transition={{duration:1.6, repeat:Infinity}}>
        <path d="M271,134 Q271,127 267,121 Q262,112 271,108 Q280,112 275,121 Q271,127 271,134Z"
          fill="#22c55e" />
        <circle cx="271" cy="115" r="3.5" fill="#0a0e16" />
      </motion.g>

      {/* Screen info bars — no text */}
      <rect x="241" y="142" width="62" height="4"  rx="2"   fill="#22c55e" opacity="0.35" />
      <rect x="241" y="150" width="44" height="3.5" rx="1.8" fill="#22c55e" opacity="0.22" />
      <rect x="241" y="157" width="50" height="3.5" rx="1.8" fill="#22c55e" opacity="0.18" />
      {/* Action button shape */}
      <rect x="243" y="168" width="52" height="10" rx="5" fill="#22c55e" opacity="0.7" />

      {/* Hand holding phone */}
      <path d="M238,210 Q228,192 230,176 Q232,160 238,158 Q244,156 244,164 Q246,159 250,160 Q254,162 252,168 Q256,164 259,168 Q262,173 258,178 Q262,176 264,181 Q266,188 261,192 L256,210Z"
        fill="#c48257" />
    </svg>
  );
}

/* ─── SCENE 4: Understand — sightings converge into one profile ─── */
function SceneUnderstand({ active }: { active: boolean }) {
  /* orbit centre ≈ dog visual centre */
  const ocx = 204, ocy = 225;
  const RX = 84, RY = 50;
  const orbitD = `M${ocx + RX},${ocy} A${RX},${RY} 0 1 1 ${ocx - RX},${ocy} A${RX},${RY} 0 1 1 ${ocx + RX},${ocy}`;
  const dotAngles = [0, 52, 104, 156, 208, 260, 312];
  const dotCols   = ["#a78bfa","#818cf8","#c4b5fd","#7c3aed","#a78bfa","#6d28d9","#8b5cf6"];
  return (
    <div className="relative h-full w-full">
      {/* Sightings from strangers, feeders, rescuers — a forming
          community layer behind the profile, same particle-cube
          language as Connect, tighter and dimmer since this is one
          dog's record still coming together, not the full network. */}
      <NodeLattice active={active} color="#a78bfa" />
      <svg viewBox="0 0 400 300" className="relative h-full w-full" preserveAspectRatio="xMidYMid slice">
      <StreetBg id="h4" warm />
      <rect width="400" height="300" fill="#0a0e1a" opacity="0.5" />

      {/* Orbit — scroll-drawn, not a static dashed hint */}
      <AnimatedPath d={orbitD} active={active} color="#7c3aed" width={1.4} delay={0.1} glow={false} />

      {/* Dog now handled by the persistent instance, at centre. */}

      {/* Orbiting data dots — no text, just coloured circles */}
      {dotAngles.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const tx = ocx + Math.cos(rad) * RX;
        const ty = ocy + Math.sin(rad) * RY;
        return (
          <motion.g key={i}
            animate={active ? {opacity:[0.28,1,0.28]} : {opacity:0.35}}
            transition={{duration:2.6, repeat:Infinity, delay:i*0.36}}>
            <line x1={ocx} y1={ocy} x2={tx} y2={ty}
              stroke="#7c3aed" strokeWidth="1" opacity="0.15" />
            <circle cx={tx} cy={ty} r="9"   fill="#14083a" stroke={dotCols[i]} strokeWidth="1.4" />
            <circle cx={tx} cy={ty} r="3.5" fill={dotCols[i]} opacity="0.7" />
          </motion.g>
        );
      })}

      {/* Observer pulses from 3 directions */}
      {([30, 150, 270] as number[]).map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const ox = ocx + Math.cos(rad) * 126;
        const oy = ocy + Math.sin(rad) * 84;
        const x2 = ocx + Math.cos(rad) * 96;
        const y2 = ocy + Math.sin(rad) * 62;
        return (
          <motion.g key={i}>
            <motion.circle cx={ox} cy={oy} r="7" fill="#7c3aed"
              animate={active ? {opacity:[0,0.65,0]} : {opacity:0}}
              transition={{duration:2.2, repeat:Infinity, delay:i*0.72}} />
            <motion.line x1={ox} y1={oy} x2={x2} y2={y2}
              stroke="#7c3aed" strokeWidth="2.4" strokeLinecap="round"
              animate={active ? {opacity:[0,0.7,0]} : {opacity:0}}
              transition={{duration:2.2, repeat:Infinity, delay:i*0.72}} />
          </motion.g>
        );
      })}
      </svg>
    </div>
  );
}

/* ─── SCENE 5: Connect — data layer, pins on street ─── */
function SceneConnect({ active }: { active: boolean }) {
  /* Pins verified within road trapezoid at their y values */
  const pins: [number, number][] = [
    [190, 212], [218, 206], [244, 222], [174, 230],
    [258, 240], [202, 248], [228, 258],
  ];
  const orgNodes: [number, number][] = [
    [82, 74], [318, 70], [68, 242], [332, 238],
  ];
  return (
    <div className="relative h-full w-full">
      <NodeLattice active={active} color="#4ade80" />
      <svg viewBox="0 0 400 300" className="relative h-full w-full" preserveAspectRatio="xMidYMid slice">
      <StreetBg id="h5" warm />
      <rect width="400" height="300" fill="#030e08" opacity="0.46" />

      {/* Network lines between pins */}
      {pins.map(([px, py], i) => {
        const [nx, ny] = pins[(i + 2) % pins.length];
        return (
          <motion.line key={i} x1={px} y1={py} x2={nx} y2={ny}
            stroke="#22c55e" strokeWidth="1.5"
            animate={active ? {opacity:[0.06,0.5,0.06]} : {opacity:0.07}}
            transition={{duration:2.4, repeat:Infinity, delay:i*0.3}} />
        );
      })}

      {/* Lines from corner orgs to nearest pin */}
      {orgNodes.map(([ox, oy], i) => {
        const [px, py] = pins[i * 2] ?? [200, 228];
        return (
          <motion.line key={i} x1={ox} y1={oy} x2={px} y2={py}
            stroke="#22c55e" strokeWidth="1.2"
            animate={active ? {opacity:[0.06,0.42,0.06]} : {opacity:0.06}}
            transition={{duration:2.6, repeat:Infinity, delay:i*0.48}} />
        );
      })}

      {/* Dog now handled by the persistent instance. */}

      {/* Location pins */}
      {pins.map(([px, py], i) => (
        <motion.g key={i}
          animate={active ? {opacity:[0,1]} : {opacity:0}}
          transition={{duration:0.5, delay:i*0.2}}>
          <motion.circle cx={px} cy={py} r="11" fill="#22c55e"
            animate={active ? {opacity:[0.07,0.2,0.07], r:[9,17,9]} : {opacity:0.07}}
            transition={{duration:2.8, repeat:Infinity, delay:i*0.38}} />
          <path d={`M${px},${py+8} Q${px},${py+2} ${px-4},${py-4} Q${px-9},${py-13} ${px},${py-17} Q${px+9},${py-13} ${px+4},${py-4} Q${px},${py+2} ${px},${py+8}Z`}
            fill="#22c55e" />
          <circle cx={px} cy={py-9} r="2.5" fill="#030e08" />
        </motion.g>
      ))}

      {/* Organisation circles — corners, no labels */}
      {orgNodes.map(([ox, oy], i) => (
        <motion.g key={i}
          animate={active ? {opacity:[0.32,0.82,0.32]} : {opacity:0.38}}
          transition={{duration:2.2, repeat:Infinity, delay:i*0.5}}>
          <circle cx={ox} cy={oy} r="24" fill="#081a10" stroke="#22c55e" strokeWidth="1.6" />
          <circle cx={ox} cy={oy} r="8"  fill="#22c55e" opacity="0.45" />
        </motion.g>
      ))}
      </svg>
    </div>
  );
}

/* ─── SCENE 6: Act — clinic interior, caring hands ─── */
function SceneAct({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="h6wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0e1018" />
          <stop offset="100%" stopColor="#1a1008" />
        </linearGradient>
        <radialGradient id="h6glow" cx="50%" cy="58%" r="44%">
          <stop offset="0%"   stopColor="#ea580c" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0"   />
        </radialGradient>
      </defs>

      {/* Clinic wall */}
      <rect width="400" height="220" fill="url(#h6wall)" />
      <rect x="0" y="0" width="400" height="5" fill="#1c2a38" />
      <rect width="400" height="300" fill="url(#h6glow)" />

      {/* Tile floor */}
      <rect x="0" y="220" width="400" height="80" fill="#131c26" />
      {([0,80,160,240,320] as number[]).map(x => (
        <line key={x} x1={x} y1="220" x2={x} y2="300" stroke="#192530" strokeWidth="0.7" />
      ))}
      {([240,260,280] as number[]).map(y => (
        <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#192530" strokeWidth="0.6" />
      ))}

      {/* Medical cross */}
      <motion.g animate={active ? {opacity:[0.7,1,0.7]} : {opacity:0.7}}
        transition={{duration:2.2, repeat:Infinity}}>
        <rect x="191" y="16" width="28" height="9"  rx="4.5" fill="#ef4444" opacity="0.9" />
        <rect x="199" y="10" width="9"  height="24" rx="4.5" fill="#ef4444" opacity="0.9" />
      </motion.g>

      {/* Treatment mat */}
      <rect x="84" y="211" width="232" height="8" rx="4" fill="#1e3040" />

      {/* Dog lying — lie pose: local x[0,114] y[0,84], at sc=0.78 → 89×65 px */}
      <motion.g animate={active ? {y:[0,-2,0]} : {y:0}} transition={{duration:4.5, repeat:Infinity}}>
        <Dog x={106} y={165} sc={0.78} pose="lie" col="#F5A623" />
        {/* Bandage on front leg */}
        <rect x="142" y="215" width="34" height="10" rx="5"   fill="white"   opacity="0.9"  />
        <rect x="155" y="211" width="9"  height="18" rx="4.5" fill="#ef4444" opacity="0.88" />
      </motion.g>

      {/* Left caring hand */}
      <motion.g animate={active ? {x:[-10,0,-10]} : {x:-10}} transition={{duration:3.2, repeat:Infinity}}>
        <path d="M34,190 Q68,174 92,184 Q108,190 106,204 Q98,216 78,214 Q54,218 36,208Z"
          fill="#c48257" />
        <path d="M60,176 Q64,168 68,176" stroke="#b07048" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M72,174 Q76,166 80,174" stroke="#b07048" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M84,176 Q88,169 92,176" stroke="#b07048" strokeWidth="3" fill="none" strokeLinecap="round" />
      </motion.g>

      {/* Right caring hand */}
      <motion.g animate={active ? {x:[10,0,10]} : {x:10}} transition={{duration:3.2, repeat:Infinity}}>
        <path d="M366,190 Q332,174 308,184 Q292,190 294,204 Q302,216 322,214 Q346,218 364,208Z"
          fill="#c48257" />
        <path d="M340,176 Q336,168 332,176" stroke="#b07048" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M328,174 Q324,166 320,174" stroke="#b07048" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M316,176 Q312,169 308,176" stroke="#b07048" strokeWidth="3" fill="none" strokeLinecap="round" />
      </motion.g>

      {/* Floating hearts — SVG heart paths, no text */}
      {([0,1,2] as number[]).map(i => {
        const hx = 154 + i * 46;
        return (
          <motion.g key={i}
            animate={active ? {y:[0,-72], opacity:[0,0.9,0]} : {y:0, opacity:0}}
            style={{originY:"168px"}}
            transition={{duration:2.8, repeat:Infinity, delay:i*0.88}}>
            <path transform={`translate(${hx},168)`}
              d="M0,5 C0,0 -8,-4 -8,3 C-8,9 0,16 0,16 C0,16 8,9 8,3 C8,-4 0,0 0,5Z"
              fill="#f97316" />
          </motion.g>
        );
      })}

      {/* Bloom — hand-drawn positive-outcome moment once the treatment
          lands: a stem draws in, then petals open one by one, ported from
          HoverBloom's growth spirit (Shape 1 as the petal). Sparing —
          once per scene, not a recurring effect. */}
      <g transform="translate(220,196)">
        <motion.path
          d="M0,0 Q-2,-10 0,-20"
          stroke="#6b9b5e" strokeWidth="2" fill="none" strokeLinecap="round"
          initial={false}
          animate={active ? {pathLength:1, opacity:0.85} : {pathLength:0, opacity:0}}
          transition={{duration:0.5, delay:0.4}}
        />
        {[0, 1, 2].map((i) => (
          <motion.g key={i}
            initial={false}
            animate={active
              ? {scale:1, opacity:0.92, rotate:i*120}
              : {scale:0, opacity:0, rotate:i*120 - 30}}
            transition={{duration:0.55, delay:0.75 + i*0.12, ease:[0.34,1.56,0.64,1]}}
            style={{originX:"0px", originY:"-20px"}}>
            <path transform="translate(-17,-38) scale(0.75)" d={SHAPE1_PATH}
              fill={i % 2 === 0 ? "#f9a8d4" : "#fde68a"} opacity="0.9" />
          </motion.g>
        ))}
      </g>
    </svg>
  );
}

/* ───────────────────────────────────────────────────────────────────
   SCENE 7: Scale — city map from above, dog nodes, India scale
─────────────────────────────────────────────────────────────────── */
function SceneScale({ active }: { active: boolean }) {
  const nodes: [number, number][] = [
    [58,54],[104,44],[160,62],[216,44],[268,60],[320,48],[372,60],
    [40,96],[86,108],[136,92],[184,104],[236,90],[284,108],[336,96],[380,104],
    [54,138],[104,130],[156,144],[200,132],[248,140],[298,128],[348,142],
    [68,178],[118,170],[166,184],[200,172],[252,182],[302,172],[354,184],
    [42,220],[92,210],[140,224],[192,214],[244,226],[296,214],[352,226],[388,218],
    [78,258],[136,250],[188,260],[240,252],[302,260],[360,252],
  ];
  const HERO = 22;
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="300" fill="#060c16" />

      {/* City grid */}
      {([44,88,132,176,220,264] as number[]).map(y => (
        <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#121e32" strokeWidth="1" />
      ))}
      {([44,100,156,212,268,324,380] as number[]).map(x => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="300" stroke="#121e32" strokeWidth="1" />
      ))}
      {/* Main arteries */}
      <line x1="0" y1="154" x2="400" y2="154" stroke="#162034" strokeWidth="3.5" />
      <line x1="200" y1="0" x2="200" y2="300" stroke="#162034" strokeWidth="3.5" />
      <line x1="0" y1="88" x2="400" y2="88" stroke="#121e32" strokeWidth="2.2" />
      <line x1="0" y1="220" x2="400" y2="220" stroke="#121e32" strokeWidth="2.2" />
      <line x1="120" y1="0" x2="120" y2="300" stroke="#121e32" strokeWidth="2.2" />
      <line x1="300" y1="0" x2="300" y2="300" stroke="#121e32" strokeWidth="2.2" />

      {/* City blocks */}
      {([[46,2,72,84],[122,2,76,84],[202,2,96,84],[302,2,96,84],
         [2,90,116,62],[124,90,74,62],[204,90,94,62],[302,90,96,62],
         [2,156,116,62],[124,156,74,62],[204,156,94,62],[302,156,96,62],
         [2,222,116,76],[124,222,74,76],[204,222,94,76],[302,222,96,76],
      ] as [number,number,number,number][]).map(([bx,by,bw,bh],i) => (
        <rect key={i} x={bx} y={by} width={bw} height={bh} fill="#0b1522" opacity="0.7" />
      ))}

      {/* Network connection lines between pins */}
      {nodes.slice(0,12).map(([nx,ny],i) => {
        const [mx,my] = nodes[(i+5) % nodes.length];
        return (
          <motion.line key={i} x1={nx} y1={ny} x2={mx} y2={my}
            stroke="#22c55e" strokeWidth="1" opacity="0.18"
            animate={active ? {opacity:[0.04,0.25,0.04]} : {opacity:0.04}}
            transition={{duration:3.2, repeat:Infinity, delay:i*0.22}} />
        );
      })}

      {/* Dog nodes blinking in */}
      {nodes.map(([nx,ny],i) => (
        <motion.g key={i}
          animate={active ? {opacity:[0,1]} : {opacity:0}}
          transition={{duration:0.32, delay:i*0.062}}>
          {i === HERO ? (
            <>
              <motion.circle cx={nx} cy={ny} r="10" fill="#22c55e" opacity="0.15"
                animate={active ? {r:[10,22,10]} : {}}
                transition={{duration:2.8, repeat:Infinity}} />
              <path d={`M${nx},${ny+8} Q${nx},${ny+2} ${nx-4},${ny-4} Q${nx-9},${ny-12} ${nx},${ny-16} Q${nx+9},${ny-12} ${nx+4},${ny-4} Q${nx},${ny+2} ${nx},${ny+8}Z`}
                fill="#22c55e" />
              <circle cx={nx} cy={ny-9} r="2.5" fill="#060c16" />
            </>
          ) : (
            <circle cx={nx} cy={ny} r={i%5===0?3.5:2.5} fill="#22c55e" opacity={0.18+(i%6)*0.1} />
          )}
        </motion.g>
      ))}

    </svg>
  );
}

const SCENES = [
  SceneHero, GlobeScene, SceneNotice, SceneReport,
  SceneUnderstand, SceneConnect, SceneAct, SceneScale,
];

/* ───────────────────────────────────────────────────────────────────
   Stage text panel — scale + fade animation on scroll
─────────────────────────────────────────────────────────────────── */
/* ───────────────────────────────────────────────────────────────────
   NodeLattice — rotating community/network node cloud, ported from the
   ParticulerCube reference: a 3D point grid projected with manual
   rotation + perspective math on a plain 2D canvas (no WebGL). Used as
   a depth texture behind the Connect stage's pin network.
─────────────────────────────────────────────────────────────────── */
function NodeLattice({ active, color = "#4ade80" }: { active: boolean; color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const gridSize = 5;
    const spacing = 34;
    const half = (gridSize - 1) / 2;
    const points: { x: number; y: number; z: number }[] = [];
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        for (let gz = 0; gz < gridSize; gz++) {
          if (Math.random() > 0.42) continue; // sparse cloud, not a solid cube
          points.push({ x: (gx - half) * spacing, y: (gy - half) * spacing, z: (gz - half) * spacing });
        }
      }
    }

    let start = performance.now();

    const render = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 300;
      const height = rect.height || 300;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const elapsed = reduced ? 0.3 : (now - start) * 0.00035;
      const angleY = elapsed;
      const angleX = elapsed * 0.6;
      const cx = width / 2, cy = height / 2, fov = 340;
      ctx.fillStyle = color;

      const projected = points.map((p) => {
        let rx = p.x * Math.cos(angleY) + p.z * Math.sin(angleY);
        let rz = -p.x * Math.sin(angleY) + p.z * Math.cos(angleY);
        let ry = p.y;
        const ryFinal = ry * Math.cos(angleX) - rz * Math.sin(angleX);
        rz = ry * Math.sin(angleX) + rz * Math.cos(angleX);
        ry = ryFinal;
        const scale = fov / (fov + rz + 140);
        return { px: cx + rx * scale, py: cy + ry * scale, pz: rz, scale };
      });
      projected.sort((a, b) => b.pz - a.pz);
      for (const p of projected) {
        const alpha = Math.max(0.08, Math.min(0.55, (p.pz + 150) / 300));
        const radius = Math.max(0.6, 1.6 * p.scale);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.px, p.py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (!reduced) rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, color]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

/* ───────────────────────────────────────────────────────────────────
   PersistentDog — the same dog instance, continuously repositioned by
   scroll instead of being swapped between disconnected per-scene
   copies. This is the core fix for "no sense of continuity": the
   camera/story moves, the dog itself does not get replaced. Present
   for the core notice→report→understand→connect arc (and the hero);
   fades out for the globe, clinic (lie pose takes over locally) and
   the aerial scale map, where a street-level dog wouldn't make sense.
   Ported interaction language from Interactive3DViewer: pointer input
   drives a subtle depth-parallax offset, standing in for camera
   response since there's no literal 3D scene to orbit.
─────────────────────────────────────────────────────────────────── */
function PersistentDog({ scrollYProgress, pointer }: { scrollYProgress: MotionValue<number>; pointer: { x: MotionValue<number>; y: MotionValue<number> } }) {
  // Stage starts, for reference: hero=B0..B1, globe=B1..B2, notice=B2..B3,
  // report=B3..B4, understand=B4..B5, connect=B5..B6, act=B6..B7, scale=B7..1
  const [B0, B1, B2, B3, B4, B5, B6] = BOUNDS;

  const x = useTransform(scrollYProgress,
    [B0, B1, B2, B3, B4, B5, B6],
    [183, 183, 170, 152, 183, 183, 183]);
  const yPos = useTransform(scrollYProgress,
    [B0, B1, B2, B3, B4, B5, B6],
    [196, 196, 196, 186, 196, 196, 196]);
  // Smaller than earlier passes — the real photo backgrounds now carry
  // real dogs; this illustrated instance reads as a connective marker
  // across the story rather than a hero visual competing with them.
  const scale = useTransform(scrollYProgress,
    [B0, B1, B2, B3, B4, B5, B6],
    [0.42, 0.42, 0.42, 0.28, 0.42, 0.42, 0.42]);
  const color = useTransform(scrollYProgress,
    [B0, B1, B2, B3, B4, B5, B6],
    ["#F5A623", "#F5A623", "#F5A623", "#F5A623", "#a78bfa", "#4ade80", "#4ade80"]);
  // Hidden through hero + globe — the hero now opens on a real photo
  // (SceneHero) whose own real dogs carry that moment; the illustrated
  // dog only takes over once the hand-drawn street journey begins,
  // fading in during the last stretch of the globe's burst.
  const opacity = useTransform(scrollYProgress,
    [B0, B2 - (B2 - B1) * 0.2, B2, B6 - (B6 - B5) * 0.15, B6],
    [0, 0, 1, 1, 0]);

  // Subtle pointer-parallax — the "camera response" language borrowed
  // from Interactive3DViewer, without a literal 3D orbit.
  const px = useTransform(pointer.x, (v) => v * 4);
  const py = useTransform(pointer.y, (v) => v * 2.5);

  return (
    <motion.svg viewBox="0 0 400 300" className="pointer-events-none absolute inset-0 z-[3] h-full w-full"
      preserveAspectRatio="xMidYMid slice" style={{ opacity }}>
      <motion.g style={{ x: px, y: py }}>
        <ForeignDogAt x={x} y={yPos} scale={scale} color={color} />
      </motion.g>
    </motion.svg>
  );
}

/** Wraps Dog so its x/y/sc/col can be driven by MotionValues. Deliberately
 *  NOT using framer-motion's `style.transform` on an SVG <g> — CSS
 *  transforms on SVG elements scale around the element's own bounding-box
 *  centre, not the SVG user-space origin, which produced a wildly
 *  mis-scaled, mis-positioned dog. Using the real SVG `transform`
 *  ATTRIBUTE (translate/scale around 0,0, matching every other Dog call
 *  in this file) fixes it — computed via a subscribed motion value. */
function ForeignDogAt({ x, y, scale, color }: { x: MotionValue<number>; y: MotionValue<number>; scale: MotionValue<number>; color: MotionValue<string> }) {
  const transformMV = useTransform([x, y, scale], ([xv, yv, sv]: number[]) => `translate(${xv},${yv}) scale(${sv})`);
  const [transform, setTransform] = useState(transformMV.get());
  useMotionValueEvent(transformMV, "change", (v) => setTransform(v));
  return (
    <g transform={transform}>
      <motion.g animate={{ y: [0, -1.5, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}>
        <DogByColor color={color} />
      </motion.g>
    </g>
  );
}

/** Dog's fill needs a live color MotionValue, but Dog itself takes a plain
 *  string prop — this small subscriber re-renders only this leaf when the
 *  interpolated color changes, keeping the rest of the tree static. */
function DogByColor({ color }: { color: MotionValue<string> }) {
  const [c, setC] = useState(color.get());
  useMotionValueEvent(color, "change", (v) => setC(v));
  return <SightingMarker color={c} />;
}

/** A tracked sighting marker — the same pin language already used in the
 *  hero's opening overlay and the Connect stage's location pins, now
 *  standing in for the dog's thread through the whole story. Real dogs
 *  are visible in the real photo backgrounds at every stage now; this
 *  reads as the data/attention layer following one of them, rather than
 *  a full illustrated body competing with real photography. */
function SightingMarker({ color }: { color: string }) {
  return (
    <g>
      <ellipse cx="0" cy="28" rx="15" ry="4" fill="#000" opacity="0.26" />
      <motion.circle cx="0" cy="-4" r="12" fill={color}
        animate={{ opacity: [0.08, 0.24, 0.08], r: [11, 19, 11] }}
        transition={{ duration: 2.6, repeat: Infinity }} />
      <path d="M0,24 Q0,13 -8,4 Q-18,-9 0,-22 Q18,-9 8,4 Q0,13 0,24Z" fill={color} />
      <circle cx="0" cy="-8" r="5.5" fill="#0a0e16" />
      <circle cx="0" cy="-8" r="2.2" fill={color} opacity="0.9" />
    </g>
  );
}

function StagePanel({ stage, index, isActive, progress }: { stage: Stage; index: number; isActive: boolean; progress: number }) {
  const isHero = index === 0;
  const span = BOUNDS[index + 1] - BOUNDS[index];
  const stageProgress = Math.max(0, Math.min(1, (progress - BOUNDS[index]) / span));
  const accent = ACCENT[index];
  return (
    <div
      className={`scroll-stage flex items-center ${isHero ? "pt-16" : ""}`}
      style={{ "--stage-weight": STAGE_WEIGHTS[index] } as CSSProperties}
    >
      <motion.div
        initial={false}
        animate={isActive ? {opacity:1,y:0,scale:1} : {opacity:0.18,y:8,scale:0.96}}
        transition={{duration:0.55, ease:[0.25,0.1,0.25,1]}}
        className="relative max-w-lg"
      >
        <motion.div
          aria-hidden="true"
          className="absolute -left-4 top-1.5 w-px origin-top"
          style={{ backgroundColor: accent, height: "calc(100% - 0.5rem)", scaleY: stageProgress, opacity: 0.4 }}
        />
        {/* Flowing trail — the actual AnimatedPath technique (a bright
            segment marching continuously along the line), not just a
            scroll-reveal, so the connective energy reads as alive. */}
        {stageProgress > 0.25 && (
          <motion.div
            aria-hidden="true"
            className="absolute -left-4 h-4 w-px"
            style={{ background: `linear-gradient(to bottom, transparent, ${accent}, transparent)`, boxShadow: `0 0 6px ${accent}` }}
            initial={{ top: "0%", opacity: 0 }}
            animate={{ top: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
        )}
        <div className="flex items-center gap-2.5">
          <svg width="34" height="3.3" viewBox="0 0 311 30" className="shrink-0" aria-hidden="true">
            <path d={LINE01_PATH} fill="rgba(255,255,255,0.15)" />
            <motion.path
              d={LINE01_PATH}
              fill={accent}
              style={{ opacity: stageProgress > 0.05 ? 1 : 0 }}
              initial={false}
              animate={{ clipPath: `inset(0 ${100 - stageProgress * 100}% 0 0)` }}
              transition={{ duration: 0.1 }}
            />
          </svg>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-paw-400">
            {stage.eyebrow}
          </p>
        </div>
        <h2
          className={`mt-4 font-display font-extrabold leading-[1.05] tracking-tight text-white ${
            isHero ? "text-5xl sm:text-6xl lg:text-[4rem]" : "text-4xl sm:text-5xl lg:text-[3rem]"
          }`}
          style={{whiteSpace:"pre-line"}}
        >
          {stage.headline}
        </h2>
        <p className="mt-5 text-base leading-relaxed text-white/80 sm:text-[17px]">
          {stage.body}
        </p>
        {isHero && (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/map" className="inline-flex items-center gap-2 rounded-full bg-paw-500 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-paw-600">
              Open the community app <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/explore" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-base font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white">
              Explore the data
            </Link>
          </div>
        )}
        {stage.id === "scale" && (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/map" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-bark-900 transition-colors hover:bg-bark-100">
              Open the community app <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────
   Main export
─────────────────────────────────────────────────────────────────── */
export function ScrollExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [progress, setProgress] = useState(0);
  const [activeStage, setActiveStage] = useState(0);

  // Pointer parallax — Interactive3DViewer's interaction language (pointer
  // drives subtle depth response) without a literal 3D scene.
  const pointerXRaw = useMotionValue(0);
  const pointerYRaw = useMotionValue(0);
  const pointerX = useSpring(pointerXRaw, { stiffness: 60, damping: 16 });
  const pointerY = useSpring(pointerYRaw, { stiffness: 60, damping: 16 });
  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerXRaw.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    pointerYRaw.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  };

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setProgress(v);
    setActiveStage(stageAt(v));
  });

  return (
    <>
      <style>{`
        .scroll-exp   { height: calc(50vh * ${TOTAL_WEIGHT}); }
        .scroll-stage { min-height: calc(50vh * var(--stage-weight, 1)); }
        @media (min-width: 1024px) {
          .scroll-exp   { height: calc(68vh * ${TOTAL_WEIGHT}); }
          .scroll-stage { min-height: calc(68vh * var(--stage-weight, 1)); }
        }
      `}</style>

      <div ref={containerRef} className="scroll-exp relative bg-ink">
        {/* Sticky canvas */}
        <div className="sticky top-0 h-screen w-full overflow-hidden" onPointerMove={handlePointerMove}>
          {SCENES.map((SceneComp, i) => (
            <motion.div key={i} className="absolute inset-0"
              animate={{opacity: i===activeStage ? 1 : 0}}
              transition={{duration:0.9, ease:"easeInOut"}}>
              <SceneComp active={i===activeStage} />
            </motion.div>
          ))}

          {/* The one continuous dog — see PersistentDog for why this replaced
              the separate per-scene copies. */}
          <PersistentDog scrollYProgress={scrollYProgress} pointer={{ x: pointerX, y: pointerY }} />

          {/* Film grain — restrained documentary texture, ported from the
              Better Grain reference (static, not animated: kept subtle
              rather than noisy per the brief). */}
          <svg className="pointer-events-none absolute inset-0 z-[6] h-full w-full mix-blend-screen" aria-hidden="true">
            <filter id="heroGrain">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="2.2" />
              </feComponentTransfer>
            </filter>
            <rect width="100%" height="100%" filter="url(#heroGrain)" opacity="0.16" />
          </svg>

          {/* Text-side gradient */}
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-ink/88 via-ink/55 to-transparent lg:via-ink/35" />

          {/* Stage indicator dots */}
          <div className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2.5 sm:right-6">
            {STAGES.map((s, i) => (
              <motion.div key={s.id} className="rounded-full"
                animate={{
                  width: 6,
                  height: i===activeStage ? 16 : 6,
                  backgroundColor: i===activeStage ? ACCENT[i] : i<activeStage ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)",
                }}
                transition={{duration:0.3}} />
            ))}
          </div>
        </div>

        {/* Text panels */}
        <div className="absolute inset-0 z-20">
          <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
            {STAGES.map((stage, i) => (
              <StagePanel key={stage.id} stage={stage} index={i} isActive={i===activeStage} progress={progress} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
