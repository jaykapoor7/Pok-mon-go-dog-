"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
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

/* ───────────────────────────────────────────────────────────────────
   Illustrated dog — brush-stroke style inspired by loose ink drawing.
   Key features: angular bracket ears, big round body, minimal face,
   paws as simple strokes. Colored for warmth. All poses share these
   design principles: few shapes, bold lines, expressive simplicity.
─────────────────────────────────────────────────────────────────── */
function Dog({
  x = 0,
  y = 0,
  sc = 1,
  pose = "sit",
  col = "#F5A623",
}: {
  x?: number;
  y?: number;
  sc?: number;
  pose?: "sit" | "lie" | "stand" | "lookup";
  col?: string;
}) {
  const dk = "#C17D11";
  const ink = "#1a0e00";

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
    return (
      <g transform={`translate(${x},${y}) scale(${sc})`}>
        {/* Tail — single confident curved stroke */}
        <path d="M54,50 Q70,34 66,16 Q64,6 76,2"
          stroke={col} strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* Body — one big round organic blob */}
        <path d="M8,72 Q2,56 6,42 Q10,28 26,20 Q42,14 56,22 Q68,32 64,50 Q60,66 44,76 Q26,80 12,74 Q6,72 8,72Z"
          fill={col} />
        {/* Head merging into body */}
        <path d="M8,38 Q10,18 30,14 Q50,12 58,28 Q62,44 36,50 Q12,52 8,38Z"
          fill={col} />
        {/* Left ear — angular bracket flap (the key visual) */}
        <path d="M10,36 L-4,26 L-4,52 Q-2,64 10,62 Q18,60 16,48 Z"
          fill={dk} />
        {/* Right ear — angular bracket flap */}
        <path d="M52,26 L66,18 L66,44 Q64,56 52,54 Q44,52 46,40 Z"
          fill={dk} />
        {Face(22, 32, 40, 30, 32, 38)}
        {/* Paws — just strokes, like the reference */}
        <path d="M12,72 Q8,80 6,86" stroke={dk} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M28,76 Q24,84 22,90" stroke={dk} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M48,74 Q52,82 54,88" stroke={dk} strokeWidth="6" fill="none" strokeLinecap="round" />
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
  const bldCol  = warm ? "#1c0c02" : "#0a1220";
  const bld2Col = warm ? "#220e04" : "#0e1a28";
  const winCol  = warm ? "#f0c060" : "#1e4a8a";
  const shopBg  = warm ? "#0e3010" : "#0a1e40";
  const awning  = warm ? "#7a3200" : "#0e1e48";

  return (
    <>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={warm ? "#0d0418" : "#070d18"} />
          <stop offset="22%"  stopColor={warm ? "#6e1800" : "#0a1428"} />
          <stop offset="48%"  stopColor={warm ? "#c25000" : "#0e1f38"} />
          <stop offset="65%"  stopColor={warm ? "#e6801a" : "#162840"} />
          <stop offset="82%"  stopColor={warm ? "#c46014" : "#0e1e30"} />
          <stop offset="100%" stopColor={warm ? "#7a3e10" : "#081018"} />
        </linearGradient>
        {warm && (
          <radialGradient id={`${id}sun`} cx="50%" cy="58%" r="38%">
            <stop offset="0%"   stopColor="#ffe890" stopOpacity="0.9" />
            <stop offset="28%"  stopColor="#f5be40" stopOpacity="0.5" />
            <stop offset="65%"  stopColor="#e6801a" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#e6801a" stopOpacity="0" />
          </radialGradient>
        )}
        <linearGradient id={`${id}road`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={warm ? "#7a4820" : "#3a4255"} />
          <stop offset="100%" stopColor={warm ? "#2c1508" : "#1a2035"} />
        </linearGradient>
        <linearGradient id={`${id}haze`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor={warm ? "#e6801a" : "#0e2040"} stopOpacity="0" />
          <stop offset="40%"  stopColor={warm ? "#e6801a" : "#0e2040"} stopOpacity="0.07" />
          <stop offset="78%"  stopColor={warm ? "#f5be40" : "#162840"} stopOpacity={warm ? 0.28 : 0.15} />
          <stop offset="100%" stopColor={warm ? "#ffe080" : "#0e1c30"} stopOpacity={warm ? 0.5  : 0.3} />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="400" height="300" fill={`url(#${id}sky)`} />
      {warm && <rect width="400" height="300" fill={`url(#${id}sun)`} />}

      {/* Far hazy skyline */}
      <path d="M0,173 L18,159 L28,165 L44,149 L56,157 L70,141 L82,151 L96,134 L109,142
               L119,135 L131,141 L143,129 L155,139 L167,129 L182,167 L200,167
               L218,167 L233,129 L246,139 L258,129 L270,135 L282,141 L294,134
               L309,142 L322,151 L330,141 L344,157 L356,149 L370,165 L380,159 L400,173
               L400,182 L0,182Z"
        fill={warm ? "#5a2f10" : "#101e34"} opacity="0.4" />

      {/* ── LEFT BUILDINGS ── */}
      {/* Corner building — 4 storeys */}
      <path d="M0,300 L0,118 L16,112 L16,96 L22,92 L22,78 L56,78 L56,300Z" fill={bldCol} />
      <rect x="24" y="82"  width="10" height="12" rx="1" fill={winCol} opacity="0.6" />
      <rect x="38" y="82"  width="10" height="12" rx="1" fill={winCol} opacity="0.8" />
      <rect x="24" y="100" width="10" height="12" rx="1" fill={winCol} opacity="0.45" />
      <rect x="38" y="100" width="10" height="12" rx="1" fill={winCol} opacity="0.65" />
      <rect x="24" y="118" width="10" height="12" rx="1" fill={winCol} opacity="0.35" />
      <rect x="38" y="118" width="10" height="12" rx="1" fill={winCol} opacity="0.55" />
      {/* Water tank on roof */}
      <rect x="30" y="60" width="18" height="18" rx="2" fill={warm ? "#100804" : "#090f1a"} />
      {/* Shop front */}
      <rect x="2"  y="248" width="54" height="52" fill={warm ? "#180a02" : "#0a1220"} />
      <rect x="4"  y="252" width="22" height="28" fill={shopBg} opacity="0.7" />
      <rect x="28" y="252" width="22" height="28" fill={shopBg} opacity="0.5" />
      <rect x="2"  y="244" width="54" height="8"  fill={warm ? "#e6801a" : "#1e3870"} opacity="0.55" />

      {/* Second left building */}
      <path d="M54,300 L54,108 L70,100 L70,88 L88,84 L88,300Z" fill={bld2Col} />
      <rect x="57" y="92"  width="12" height="13" rx="1" fill={winCol} opacity="0.5" />
      <rect x="71" y="92"  width="10" height="13" rx="1" fill={winCol} opacity="0.38" />
      <rect x="57" y="112" width="12" height="13" rx="1" fill={winCol} opacity="0.65" />
      <rect x="71" y="112" width="10" height="13" rx="1" fill={winCol} opacity="0.25" />

      {/* Market awning left */}
      <path d="M0,216 Q44,207 88,211 L88,223 Q44,227 0,236Z" fill={awning} />
      <path d="M0,218 Q44,209 88,213" stroke={warm ? "#a04400" : "#162060"} strokeWidth="1.2" fill="none" opacity="0.55" />

      {/* ── RIGHT BUILDINGS ── */}
      <path d="M400,300 L400,118 L384,112 L384,96 L378,92 L378,78 L344,78 L344,300Z" fill={bldCol} />
      <rect x="364" y="82"  width="10" height="12" rx="1" fill={winCol} opacity="0.7" />
      <rect x="350" y="82"  width="10" height="12" rx="1" fill={winCol} opacity="0.45" />
      <rect x="364" y="100" width="10" height="12" rx="1" fill={winCol} opacity="0.5" />
      <rect x="350" y="100" width="10" height="12" rx="1" fill={winCol} opacity="0.7" />
      <rect x="364" y="118" width="10" height="12" rx="1" fill={winCol} opacity="0.4" />
      <rect x="350" y="118" width="10" height="12" rx="1" fill={winCol} opacity="0.55" />
      <rect x="352" y="60" width="18" height="18" rx="2" fill={warm ? "#100804" : "#090f1a"} />
      <rect x="344" y="248" width="56" height="52" fill={warm ? "#180a02" : "#0a1220"} />
      <rect x="346" y="252" width="22" height="28" fill={warm ? "#0a1830" : shopBg} opacity="0.7" />
      <rect x="370" y="252" width="22" height="28" fill={warm ? "#0a1830" : shopBg} opacity="0.5" />
      <rect x="344" y="244" width="56" height="8"  fill={warm ? "#e6801a" : "#1e3870"} opacity="0.5" />

      <path d="M346,300 L346,108 L330,100 L330,88 L312,84 L312,300Z" fill={bld2Col} />
      <rect x="318" y="92"  width="10" height="13" rx="1" fill={winCol} opacity="0.6" />
      <rect x="332" y="92"  width="10" height="13" rx="1" fill={winCol} opacity="0.4" />
      <rect x="318" y="112" width="10" height="13" rx="1" fill={winCol} opacity="0.35" />
      <rect x="332" y="112" width="10" height="13" rx="1" fill={winCol} opacity="0.72" />

      <path d="M400,216 Q356,207 312,211 L312,223 Q356,227 400,236Z" fill={awning} />

      {/* ── ROAD ── */}
      {/* Perspective trapezoid */}
      <path d="M0,300 L400,300 L255,175 L145,175Z" fill={`url(#${id}road)`} />
      {/* Footpaths */}
      <path d="M0,300 L0,232 L72,175 L145,175 L0,300Z"   fill={warm ? "#261408" : "#12182c"} opacity="0.65" />
      <path d="M400,300 L400,232 L328,175 L255,175 L400,300Z" fill={warm ? "#261408" : "#12182c"} opacity="0.65" />
      {/* Lane markings */}
      <path d="M200,300 L200,248 M200,234 L200,218 M200,204 L200,190 M200,179 L200,177"
        stroke={warm ? "#c47818" : "#2a3860"} strokeWidth="2.5" strokeDasharray="14,10" strokeLinecap="round" />

      {/* ── UTILITY POLES ── */}
      <line x1="74"  y1="300" x2="108" y2="175" stroke="#0c0804" strokeWidth="4.5" />
      <line x1="62"  y1="252" x2="88"  y2="249" stroke="#0c0804" strokeWidth="3" />
      <line x1="62"  y1="246" x2="88"  y2="243" stroke="#0c0804" strokeWidth="2" />
      <line x1="150" y1="268" x2="158" y2="175" stroke="#0c0804" strokeWidth="3" />
      <line x1="142" y1="232" x2="164" y2="229" stroke="#0c0804" strokeWidth="2.2" />

      <line x1="326" y1="300" x2="292" y2="175" stroke="#0c0804" strokeWidth="4.5" />
      <line x1="312" y1="252" x2="338" y2="249" stroke="#0c0804" strokeWidth="3" />
      <line x1="312" y1="246" x2="338" y2="243" stroke="#0c0804" strokeWidth="2" />
      <line x1="250" y1="268" x2="242" y2="175" stroke="#0c0804" strokeWidth="3" />
      <line x1="236" y1="232" x2="258" y2="229" stroke="#0c0804" strokeWidth="2.2" />

      {/* ── WIRES (multiple strands with sag) ── */}
      <path d="M74,252 Q112,241 150,232"  stroke="#080502" strokeWidth="1.5" fill="none" />
      <path d="M74,248 Q112,237 150,228"  stroke="#080502" strokeWidth="1.3" fill="none" />
      <path d="M74,244 Q112,233 150,224"  stroke="#080502" strokeWidth="1.1" fill="none" />
      <path d="M74,240 Q112,229 150,220"  stroke="#080502" strokeWidth="0.9" fill="none" />
      <path d="M326,252 Q288,241 250,232" stroke="#080502" strokeWidth="1.5" fill="none" />
      <path d="M326,248 Q288,237 250,228" stroke="#080502" strokeWidth="1.3" fill="none" />
      <path d="M326,244 Q288,233 250,224" stroke="#080502" strokeWidth="1.1" fill="none" />
      {/* Cross-street wires */}
      <path d="M74,246 Q200,230 326,246"  stroke="#080502" strokeWidth="1.0" fill="none" />
      <path d="M74,240 Q200,224 326,240"  stroke="#080502" strokeWidth="0.8" fill="none" />

      {/* ── TRAFFIC LIGHT ── */}
      <path d="M74,232 Q200,216 326,232"  stroke="#080502" strokeWidth="1.4" fill="none" />
      <line x1="200" y1="216" x2="200" y2="233" stroke="#080502" strokeWidth="1.4" />
      <rect x="193" y="233" width="14" height="28" rx="3" fill="#080502" />
      <circle cx="200" cy="239" r="3.5" fill="#cc2200" opacity="0.9" />
      <circle cx="200" cy="247" r="3.5" fill="#444"   opacity="0.45" />
      <circle cx="200" cy="255" r="3.5" fill="#444"   opacity="0.35" />

      {/* ── HAZE DEPTH OVERLAY ── */}
      <rect width="400" height="300" fill={`url(#${id}haze)`} />
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

/* ─── SCENE 0: Hero — golden-hour street, dog alone ─── */
function SceneHero({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <StreetBg id="h0" warm />

      {/* Far pedestrians near horizon — tiny silhouettes */}
      <rect x="188" y="178" width="4"  height="10" rx="2"   fill="#3a1a08" opacity="0.48" />
      <circle cx="190" cy="175" r="2.5" fill="#3a1a08" opacity="0.48" />
      <rect x="208" y="179" width="3"  height="9"  rx="1.5" fill="#3a1a08" opacity="0.36" />
      <circle cx="209" cy="176" r="2"  fill="#3a1a08" opacity="0.36" />

      {/* Auto-rickshaw — right side, mid-distance */}
      <g opacity="0.56">
        <AutoRickshaw x={246} y={198} sc={0.54} />
      </g>

      {/* Dog — protagonist, center of road */}
      <motion.g
        animate={active ? {y:[0,-3,0]} : {y:0}}
        transition={{duration:3.5, repeat:Infinity, ease:"easeInOut"}}>
        <Dog x={183} y={196} sc={0.64} pose="sit" col="#F5A623" />
      </motion.g>
      <ellipse cx="204" cy="254" rx="21" ry="4" fill="#8a4410" opacity="0.18" />
      <ellipse cx="204" cy="238" rx="44" ry="18" fill="#f5c040" opacity="0.07" />
    </svg>
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

      {/* Dog looking up */}
      <motion.g animate={active ? {y:[0,-2,0]} : {y:0}} transition={{duration:2.8, repeat:Infinity}}>
        <Dog x={170} y={196} sc={0.64} pose="lookup" col="#F5A623" />
      </motion.g>
      <ellipse cx="191" cy="254" rx="19" ry="4" fill="#8a4410" opacity="0.15" />

      {/* Dashed gaze line */}
      <motion.line x1="252" y1="202" x2="196" y2="226"
        stroke="#f5c040" strokeWidth="1.8" strokeDasharray="6 9"
        animate={active ? {opacity:[0,0.5,0]} : {opacity:0}}
        transition={{duration:2.2, repeat:Infinity}} />
    </svg>
  );
}

/* ─── SCENE 3: Report — phone foreground, dog in background ─── */
function SceneReport({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <StreetBg id="h3" warm />

      {/* Dog — small, background, visible left of phone */}
      <g opacity="0.58">
        <Dog x={152} y={186} sc={0.42} pose="sit" col="#F5A623" />
      </g>

      {/* Green pin over background dog */}
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

      {/* Dog photo on phone screen */}
      <rect x="240" y="73" width="64" height="54" rx="4" fill="#0e1620" />
      <Dog x={245} y={78} sc={0.52} pose="sit" col="#F5A623" />

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

/* ─── SCENE 4: Understand — dog with data orbit ─── */
function SceneUnderstand({ active }: { active: boolean }) {
  /* orbit centre ≈ dog visual centre */
  const ocx = 204, ocy = 225;
  const RX = 84, RY = 50;
  const dotAngles = [0, 52, 104, 156, 208, 260, 312];
  const dotCols   = ["#a78bfa","#818cf8","#c4b5fd","#7c3aed","#a78bfa","#6d28d9","#8b5cf6"];
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <StreetBg id="h4" warm />
      <rect width="400" height="300" fill="#0a0e1a" opacity="0.52" />

      {/* Orbit ellipse */}
      <ellipse cx={ocx} cy={ocy} rx={RX} ry={RY}
        fill="none" stroke="#7c3aed" strokeWidth="1" strokeDasharray="3 8" opacity="0.35" />

      {/* Dog at centre */}
      <Dog x={183} y={196} sc={0.64} pose="sit" col="#a78bfa" />

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
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
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

      {/* Dog */}
      <Dog x={183} y={196} sc={0.64} pose="sit" col="#4ade80" />

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
function StagePanel({ stage, index, isActive }: { stage: Stage; index: number; isActive: boolean }) {
  const isHero = index === 0;
  return (
    <div className={`scroll-stage flex items-center ${isHero ? "pt-16" : ""}`}>
      <motion.div
        initial={false}
        animate={isActive ? {opacity:1,y:0,scale:1} : {opacity:0.18,y:8,scale:0.96}}
        transition={{duration:0.55, ease:[0.25,0.1,0.25,1]}}
        className="max-w-lg"
      >
        <div className="flex items-center gap-2">
          <span className="inline-block h-1 w-4 rounded-full bg-paw-400" />
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

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setProgress(v);
    setActiveStage(Math.min(N-1, Math.floor(v*N)));
  });

  void progress; // used for future canvas integration

  const ACCENT = ["#4EBDDB","#64748b","#F59E0B","#06b6d4","#a78bfa","#34d399","#f97316","#4EBDDB"];

  return (
    <>
      <style>{`
        .scroll-exp   { height: calc(50vh * ${N}); }
        .scroll-stage { min-height: 50vh; }
        @media (min-width: 1024px) {
          .scroll-exp   { height: calc(68vh * ${N}); }
          .scroll-stage { min-height: 68vh; }
        }
      `}</style>

      <div ref={containerRef} className="scroll-exp relative bg-ink">
        {/* Sticky canvas */}
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          {SCENES.map((SceneComp, i) => (
            <motion.div key={i} className="absolute inset-0"
              animate={{opacity: i===activeStage ? 1 : 0}}
              transition={{duration:0.55, ease:"easeInOut"}}>
              <SceneComp active={i===activeStage} />
            </motion.div>
          ))}

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
              <StagePanel key={stage.id} stage={stage} index={i} isActive={i===activeStage} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
