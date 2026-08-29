"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
    eyebrow: "The problem",
    headline: "The help exists.\nIt's just disconnected.",
    body: "Citizens notice. NGOs work. Vets treat. Volunteers show up. But none of them share the same picture. Every observation stays in someone's phone. Every effort starts from zero.",
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
   SCENE 0: Hero — dog alone on an Indian street at dusk
─────────────────────────────────────────────────────────────────── */
function SceneHero({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="s0-sky" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="#1a1040" />
          <stop offset="100%" stopColor="#0a0e1a" />
        </radialGradient>
        <radialGradient id="s0-lamp" cx="72%" cy="52%" r="28%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="s0-dog-glow" cx="50%" cy="78%" r="20%">
          <stop offset="0%" stopColor="#F5A623" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky */}
      <rect width="400" height="300" fill="url(#s0-sky)" />

      {/* Stars */}
      {([[22,18],[60,32],[110,14],[170,28],[230,10],[290,36],[350,20],[130,48],[310,52]] as [number,number][]).map(([cx,cy],i)=>(
        <motion.circle key={i} cx={cx} cy={cy} r={i%3===0?2:1.4} fill="white"
          animate={active ? {opacity:[0.25,0.9,0.25]} : {opacity:0.3}}
          transition={{duration:2.4+i*0.3, repeat:Infinity, delay:i*0.28}} />
      ))}

      {/* City skyline — Indian flat-roof buildings */}
      <Building x={0} y={140} w={45} h={100} col="#0d1520" windows tank />
      <Building x={42} y={160} w={30} h={80} col="#0a1220" windows />
      <Building x={68} y={130} w={55} h={110} col="#0d1520" windows tank />
      <Building x={290} y={145} w={50} h={95} col="#0d1520" windows />
      <Building x={336} y={155} w={35} h={85} col="#0a1220" windows tank />
      <Building x={368} y={135} w={32} h={105} col="#0d1520" windows />

      {/* Lamp post glow */}
      <rect width="400" height="300" fill="url(#s0-lamp)" />
      <Lamp x={260} y={148} glowing />

      {/* Street */}
      <path d="M0,252 Q200,248 400,252 L400,300 L0,300Z" fill="#141e30" />
      {/* Road lane marks */}
      <line x1="168" y1="300" x2="184" y2="254" stroke="#2a3a55" strokeWidth="2" strokeDasharray="10 8" />
      <line x1="210" y1="300" x2="216" y2="254" stroke="#2a3a55" strokeWidth="2" strokeDasharray="10 8" />

      {/* Auto-rickshaw parked in background */}
      <g opacity="0.6">
        <AutoRickshaw x={290} y={222} sc={0.75} />
      </g>

      {/* Background people walking */}
      <Person x={310} y={210} sc={0.85} walking col="#1a2840" />
      <Person x={330} y={212} sc={0.72} walking col="#14203a" />

      {/* Dog glow on ground */}
      <rect width="400" height="300" fill="url(#s0-dog-glow)" />

      {/* Dog sitting alone under lamp */}
      <motion.g animate={active ? {y:[0,-4,0]} : {y:0}} transition={{duration:3.5, repeat:Infinity, ease:"easeInOut"}}>
        <Dog x={150} y={188} sc={1.0} pose="sit" col="#F5A623" />
      </motion.g>

      {/* Dog shadow on ground */}
      <ellipse cx="196" cy="262" rx="26" ry="5" fill="#F5A623" opacity="0.1" />

      {/* Warm lamplight wash over dog area */}
      <ellipse cx="280" cy="230" rx="90" ry="50" fill="#F59E0B" opacity="0.05" />
    </svg>
  );
}

/* ───────────────────────────────────────────────────────────────────
   SCENE 1: Problem — dog alone on street, bubbles showing disconnected help
─────────────────────────────────────────────────────────────────── */
function SceneProblem({ active }: { active: boolean }) {
  const nodes = [
    { x: 76,  y: 72,  label: "NGO",       glyph: "⌂", col: "#3b5998" },
    { x: 328, y: 68,  label: "Vet",        glyph: "+", col: "#27ae60" },
    { x: 64,  y: 218, label: "Volunteer",  glyph: "♥", col: "#e74c3c" },
    { x: 338, y: 224, label: "Rescue",     glyph: "⚑", col: "#f39c12" },
    { x: 200, y: 38,  label: "Citizen",    glyph: "◎", col: "#8e44ad" },
  ];
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="300" fill="#0c1520" />
      {/* Faint street behind */}
      <path d="M0,254 Q200,250 400,254 L400,300 L0,300Z" fill="#141e30" />
      <Building x={10} y={160} w={40} h={90} col="#0a1220" windows />
      <Building x={350} y={154} w={40} h={96} col="#0a1220" windows />

      {/* Broken dashed lines to centre dog */}
      {nodes.map((n,i)=>(
        <motion.line key={i} x1={n.x} y1={n.y} x2="200" y2="165"
          stroke="#475569" strokeWidth="1.6" strokeDasharray="5 9"
          animate={active ? {opacity:[0.1,0.35,0.1]} : {opacity:0.18}}
          transition={{duration:2.8, repeat:Infinity, delay:i*0.48}} />
      ))}

      {/* X marks — no signal */}
      {([[136,110],[248,98],[136,210],[252,204]] as [number,number][]).map(([cx,cy],i)=>(
        <text key={i} x={cx} y={cy} fontSize="16" fill="#ef4444" opacity="0.55" textAnchor="middle">✕</text>
      ))}

      {/* Dog — desaturated, confused */}
      <Dog x={148} y={116} sc={0.88} pose="sit" col="#7c8fa8" />
      <circle cx="200" cy="170" r="34" fill="none" stroke="#334155" strokeWidth="1.2" strokeDasharray="4 6" opacity="0.4" />

      {/* Helper nodes */}
      {nodes.map((n,i)=>(
        <motion.g key={i}
          animate={active ? {opacity:[0.45,1,0.45]} : {opacity:0.55}}
          transition={{duration:2.4, repeat:Infinity, delay:i*0.42}}>
          <circle cx={n.x} cy={n.y} r="26" fill="#131e2e" stroke="#334155" strokeWidth="1.6" strokeDasharray="3 4" />
          <text x={n.x} y={n.y+1} textAnchor="middle" dominantBaseline="middle" fontSize="15" fill={n.col} opacity="0.7">{n.glyph}</text>
          <text x={n.x} y={n.y+20} textAnchor="middle" fontSize="7.5" fill="#475569">{n.label}</text>
        </motion.g>
      ))}
    </svg>
  );
}

/* ───────────────────────────────────────────────────────────────────
   SCENE 2: Notice — person stops walking, looks at dog on street
─────────────────────────────────────────────────────────────────── */
function SceneNotice({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="s2-glow" cx="52%" cy="62%" r="32%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0a0e1a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="#0a1020" />
      <rect width="400" height="300" fill="url(#s2-glow)" />

      {/* Street */}
      <path d="M0,248 Q200,244 400,248 L400,300 L0,300Z" fill="#141e30" />
      {/* Street cracks / texture */}
      <line x1="0" y1="258" x2="400" y2="258" stroke="#1a2535" strokeWidth="0.6" />
      <line x1="60" y1="248" x2="80" y2="300" stroke="#1a2535" strokeWidth="0.4" />
      <line x1="200" y1="248" x2="210" y2="300" stroke="#1a2535" strokeWidth="0.4" />
      <line x1="320" y1="248" x2="340" y2="300" stroke="#1a2535" strokeWidth="0.4" />

      {/* Lamp on street */}
      <Lamp x={320} y={155} glowing />

      {/* Building behind */}
      <Building x={10} y={140} w={60} h={108} col="#0d1520" windows />
      <Building x={320} y={148} w={80} h={100} col="#0d1520" windows tank />

      {/* Auto-rickshaw passing in bg */}
      <g opacity="0.5">
        <AutoRickshaw x={60} y={218} sc={0.7} />
      </g>

      {/* Person who stopped — larger, in foreground */}
      <motion.g animate={active ? {y:[0,-1,0]} : {y:0}} transition={{duration:3, repeat:Infinity}}>
        <Person x={258} y={162} sc={2.2} col="#2a4a7a" />
        {/* Saree/clothes detail suggestion */}
        <path d="M262,182 Q268,196 264,210 Q260,224 266,232" stroke="#3a6aaa" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />
      </motion.g>

      {/* Gaze line from person to dog */}
      <motion.line x1="264" y1="186" x2="212" y2="232"
        stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="5 8"
        animate={active ? {opacity:[0,0.5,0]} : {opacity:0}}
        transition={{duration:2.2, repeat:Infinity}} />

      {/* Dog looking up at person */}
      <motion.g animate={active ? {y:[0,-3,0]} : {y:0}} transition={{duration:2.8, repeat:Infinity}}>
        <Dog x={148} y={196} sc={0.9} pose="lookup" col="#F5A623" />
      </motion.g>

      {/* Warm glow spot where they connect */}
      <motion.ellipse cx="234" cy="242" rx="28" ry="8"
        fill="#F59E0B"
        animate={active ? {opacity:[0.08,0.2,0.08], rx:[28,36,28]} : {opacity:0.08}}
        transition={{duration:2.5, repeat:Infinity}} />
    </svg>
  );
}

/* ───────────────────────────────────────────────────────────────────
   SCENE 3: Report — hand on street with phone, dog in background
─────────────────────────────────────────────────────────────────── */
function SceneReport({ active }: { active: boolean }) {
  const dataWords = ["location", "photo", "condition", "time", "area"];
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="s3-glow" cx="50%" cy="60%" r="30%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0a0e1a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="#0a1020" />
      <rect width="400" height="300" fill="url(#s3-glow)" />

      {/* Street */}
      <path d="M0,252 Q200,248 400,252 L400,300 L0,300Z" fill="#141e30" />
      <Building x={290} y={148} w={110} h={104} col="#0d1520" windows />

      {/* Dog sitting in background — smaller, further away */}
      <g opacity="0.6">
        <Dog x={282} y={208} sc={0.62} pose="sit" col="#F5A623" />
      </g>

      {/* Person silhouette in background */}
      <Person x={340} y={188} sc={1.4} col="#1a2840" />

      {/* Hand holding phone — foreground */}
      {/* Hand */}
      <path d="M158,260 Q148,240 150,220 Q152,200 160,195 Q168,192 170,200 Q172,195 178,196 Q184,196 182,204 Q188,200 192,204 Q196,208 192,214 Q196,212 198,218 Q200,226 194,230 L186,260Z"
        fill="#c48257" />
      {/* Thumb */}
      <path d="M158,204 Q150,198 148,210 Q146,220 154,224" fill="#c48257" />

      {/* Phone */}
      <rect x="162" y="108" width="80" height="138" rx="12" fill="#1a2235" stroke="#06b6d4" strokeWidth="1.4" />
      <rect x="168" y="120" width="68" height="104" rx="6" fill="#0a0e1a" />
      {/* Notch */}
      <rect x="188" y="112" width="24" height="6" rx="3" fill="#0a0e1a" />

      {/* Dog photo on screen */}
      <rect x="170" y="122" width="64" height="58" rx="4" fill="#0e1a2e" />
      <Dog x={178} y={130} sc={0.52} pose="sit" col="#F5A623" />

      {/* Location pin bouncing */}
      <motion.g animate={active ? {y:[0,-5,0]} : {y:0}} transition={{duration:1.6, repeat:Infinity}}>
        <path d="M202,182 Q202,172 197,165 Q190,154 202,150 Q214,154 207,165 Q202,172 202,182Z" fill="#06b6d4" />
        <circle cx="202" cy="157" r="4.5" fill="#0a0e1a" />
      </motion.g>

      {/* Screen info */}
      <rect x="172" y="188" width="60" height="5" rx="2.5" fill="#06b6d4" opacity="0.35" />
      <rect x="172" y="197" width="40" height="4" rx="2" fill="#06b6d4" opacity="0.22" />
      <rect x="178" y="230" width="28" height="5" rx="2.5" fill="#1e2d45" />

      {/* Data flying up */}
      {dataWords.map((word, i) => (
        <motion.text key={i} x={145+i*26} y={0} fontSize="7" fill="#06b6d4" textAnchor="middle"
          animate={active ? {y:[108,-20], opacity:[0,0.7,0]} : {y:108,opacity:0}}
          transition={{duration:2.1, repeat:Infinity, delay:i*0.34, ease:"easeOut"}}>
          {word}
        </motion.text>
      ))}
    </svg>
  );
}

/* ───────────────────────────────────────────────────────────────────
   SCENE 4: Understand — dog with data profile forming around them
─────────────────────────────────────────────────────────────────── */
function SceneUnderstand({ active }: { active: boolean }) {
  const tags = [
    { label:"Healthy", angle:0 },
    { label:"Lajpat Nagar", angle:52 },
    { label:"Mar 2024", angle:106 },
    { label:"Feeder: Priya", angle:160 },
    { label:"Vaccinated", angle:214 },
    { label:"3 sightings", angle:268 },
    { label:"No injuries", angle:318 },
  ];
  const RX = 94, RY = 62;
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="s4-glow" cx="50%" cy="50%" r="38%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0a0e1a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="#0a0e1a" />
      <rect width="400" height="300" fill="url(#s4-glow)" />
      <ellipse cx="200" cy="152" rx={RX} ry={RY} fill="none" stroke="#7c3aed" strokeWidth="1" strokeDasharray="3 7" opacity="0.3" />

      <Dog x={148} y={100} sc={0.92} pose="sit" col="#a78bfa" />

      {tags.map((tag,i)=>{
        const rad = tag.angle*Math.PI/180;
        const tx = 200+Math.cos(rad)*RX;
        const ty = 152+Math.sin(rad)*RY;
        const len = tag.label.length*4.8+14;
        return (
          <motion.g key={i}
            animate={active ? {opacity:[0.35,1,0.35]} : {opacity:0.4}}
            transition={{duration:2.6, repeat:Infinity, delay:i*0.36}}>
            <line x1="200" y1="152" x2={tx} y2={ty} stroke="#7c3aed" strokeWidth="1" opacity="0.2" />
            <rect x={tx-len/2} y={ty-7} width={len} height="14" rx="7" fill="#1a103a" stroke="#7c3aed" strokeWidth="1" />
            <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fontSize="6.5" fill="#a78bfa">{tag.label}</text>
          </motion.g>
        );
      })}

      {([30,150,270] as number[]).map((angle,i)=>{
        const rad=angle*Math.PI/180;
        const x1=200+Math.cos(rad)*148, y1=152+Math.sin(rad)*108;
        const x2=200+Math.cos(rad)*112, y2=152+Math.sin(rad)*78;
        return (
          <motion.g key={i}>
            <motion.circle cx={x1} cy={y1} r="6" fill="#7c3aed"
              animate={active ? {opacity:[0,0.6,0]} : {opacity:0}}
              transition={{duration:2.2, repeat:Infinity, delay:i*0.68}} />
            <motion.line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round"
              animate={active ? {opacity:[0,0.75,0]} : {opacity:0}}
              transition={{duration:2.2, repeat:Infinity, delay:i*0.68}} />
          </motion.g>
        );
      })}
    </svg>
  );
}

/* ───────────────────────────────────────────────────────────────────
   SCENE 5: Connect — street scene with threads linking people
─────────────────────────────────────────────────────────────────── */
function SceneConnect({ active }: { active: boolean }) {
  const helpers = [
    { label:"NGO nearby",   glyph:"⌂", angle:322, col:"#34d399" },
    { label:"Vet clinic",   glyph:"+", angle:44,  col:"#34d399" },
    { label:"Volunteer",    glyph:"♥", angle:150, col:"#34d399" },
    { label:"Transport",    glyph:"◈", angle:238, col:"#34d399" },
  ];
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="s5-glow" cx="50%" cy="50%" r="40%">
          <stop offset="0%" stopColor="#059669" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0a0e1a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="#081410" />
      <rect width="400" height="300" fill="url(#s5-glow)" />

      {/* Faint street */}
      <path d="M0,256 Q200,252 400,256 L400,300 L0,300Z" fill="#0f1e18" />
      <Building x={0} y={162} w={44} h={94} col="#0a1810" windows />
      <Building x={352} y={155} w={48} h={101} col="#0a1810" windows />

      {/* Threads */}
      {helpers.map((h,i)=>{
        const rad=h.angle*Math.PI/180;
        const x=200+Math.cos(rad)*98, y=152+Math.sin(rad)*80;
        return (
          <motion.line key={i} x1="200" y1="152" x2={x} y2={y}
            stroke="#34d399" strokeWidth="2.2"
            animate={active ? {opacity:[0.08,0.7,0.08]} : {opacity:0.18}}
            transition={{duration:2.1, repeat:Infinity, delay:i*0.5}} />
        );
      })}

      {/* Dog */}
      <Dog x={148} y={100} sc={0.92} pose="sit" col="#34d399" />

      {/* Pulse */}
      <motion.circle cx="200" cy="152" r="28" fill="none" stroke="#34d399" strokeWidth="1.6"
        animate={active ? {r:[28,46,28], opacity:[0.5,0,0.5]} : {opacity:0}}
        transition={{duration:2.8, repeat:Infinity}} />

      {/* Helper nodes */}
      {helpers.map((h,i)=>{
        const rad=h.angle*Math.PI/180;
        const x=200+Math.cos(rad)*98, y=152+Math.sin(rad)*80;
        return (
          <motion.g key={i}
            animate={active ? {scale:[0.92,1.08,0.92]} : {}}
            transition={{duration:2.2, repeat:Infinity, delay:i*0.5}}
            style={{transformOrigin:`${x}px ${y}px`}}>
            <circle cx={x} cy={y} r="27" fill="#081a12" stroke="#34d399" strokeWidth="1.6" />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="#34d399">{h.glyph}</text>
            <text x={x} y={y+21} textAnchor="middle" fontSize="7" fill="#34d399" opacity="0.75">{h.label}</text>
          </motion.g>
        );
      })}
    </svg>
  );
}

/* ───────────────────────────────────────────────────────────────────
   SCENE 6: Act — dog being cared for on an Indian street / clinic
─────────────────────────────────────────────────────────────────── */
function SceneAct({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="s6-glow" cx="50%" cy="62%" r="40%">
          <stop offset="0%" stopColor="#ea580c" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#0a0e1a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="#0e0a08" />
      <rect width="400" height="300" fill="url(#s6-glow)" />

      {/* Indoor / clinic background */}
      <rect x="0" y="0" width="400" height="220" fill="#0e1218" />
      {/* Clinic wall stripe */}
      <rect x="0" y="0" width="400" height="6" fill="#1a2e3a" />
      {/* Tile floor */}
      <path d="M0,220 L400,220 L400,300 L0,300Z" fill="#141e28" />
      {([0,80,160,240,320] as number[]).map(x=>(
        <line key={x} x1={x} y1="220" x2={x} y2="300" stroke="#1a2a38" strokeWidth="0.6" />
      ))}
      {([240,260,280,300] as number[]).map(y=>(
        <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#1a2a38" strokeWidth="0.5" />
      ))}

      {/* Medical cross sign on wall */}
      <rect x="178" y="20" width="44" height="14" rx="7" fill="#1a2a3a" />
      <rect x="186" y="8" width="14" height="38" rx="7" fill="#1a2a3a" />
      <motion.g animate={active ? {opacity:[0.7,1,0.7]} : {opacity:0.7}} transition={{duration:2,repeat:Infinity}}>
        <rect x="180" y="22" width="40" height="10" rx="5" fill="#ef4444" opacity="0.9" />
        <rect x="188" y="10" width="10" height="34" rx="5" fill="#ef4444" opacity="0.9" />
      </motion.g>

      {/* Small table / mat */}
      <rect x="80" y="212" width="240" height="8" rx="4" fill="#1e3040" />

      {/* Dog lying on mat, being cared for */}
      <motion.g animate={active ? {y:[0,-2,0]} : {y:0}} transition={{duration:4,repeat:Infinity}}>
        <Dog x={96} y={156} sc={1.08} pose="lie" col="#F5A623" />
        {/* Bandage on leg */}
        <rect x="145" y="196" width="32" height="10" rx="5" fill="white" opacity="0.9" />
        <rect x="157" y="192" width="8" height="18" rx="4" fill="#ef4444" opacity="0.85" />
      </motion.g>

      {/* Left caring hand reaching in */}
      <motion.g animate={active ? {x:[-10,0,-10]} : {x:-10}} transition={{duration:3.2,repeat:Infinity}}>
        <path d="M36,186 Q68,170 92,180 Q110,186 108,198 Q100,210 80,208 Q56,212 38,202Z" fill="#c48257" />
        <path d="M60,172 Q64,164 68,172" stroke="#b07048" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M72,170 Q76,162 80,170" stroke="#b07048" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M84,172 Q88,165 92,172" stroke="#b07048" strokeWidth="3" fill="none" strokeLinecap="round" />
      </motion.g>

      {/* Right caring hand */}
      <motion.g animate={active ? {x:[10,0,10]} : {x:10}} transition={{duration:3.2,repeat:Infinity}}>
        <path d="M364,186 Q332,170 308,180 Q290,186 292,198 Q300,210 320,208 Q344,212 362,202Z" fill="#c48257" />
        <path d="M340,172 Q336,164 332,172" stroke="#b07048" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M328,170 Q324,162 320,170" stroke="#b07048" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M316,172 Q312,165 308,172" stroke="#b07048" strokeWidth="3" fill="none" strokeLinecap="round" />
      </motion.g>

      {/* Hearts floating */}
      {([0,1,2] as number[]).map(i=>(
        <motion.text key={i} x={148+i*52} y={0} fontSize="18" textAnchor="middle" fill="#f97316"
          animate={active ? {y:[170,100],opacity:[0,0.8,0]} : {y:170,opacity:0}}
          transition={{duration:2.8, repeat:Infinity, delay:i*0.85}}>♥</motion.text>
      ))}
    </svg>
  );
}

/* ───────────────────────────────────────────────────────────────────
   SCENE 7: Scale — city map from above, dog nodes across the city
─────────────────────────────────────────────────────────────────── */
function SceneScale({ active }: { active: boolean }) {
  const nodes: [number,number][] = [
    [58,54],[104,44],[160,62],[216,44],[268,60],[320,48],[372,60],
    [40,96],[86,108],[136,92],[184,104],[236,90],[284,108],[336,96],[380,104],
    [54,138],[104,130],[156,144],[200,132],[248,140],[298,128],[348,142],
    [68,178],[118,170],[166,184],[200,172],[252,182],[302,172],[354,184],
    [42,220],[92,210],[140,224],[192,214],[244,226],[296,214],[352,226],[388,218],
    [78,258],[136,250],[188,260],[240,252],[302,260],[360,252],
  ];
  const HERO = 22; // "our dog" highlighted node

  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="300" fill="#060c16" />

      {/* City grid — roads */}
      {([44,88,132,176,220,264] as number[]).map(y=>(
        <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#121e32" strokeWidth="1" />
      ))}
      {([44,100,156,212,268,324,380] as number[]).map(x=>(
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
      ] as [number,number,number,number][]).map(([bx,by,bw,bh],i)=>(
        <rect key={i} x={bx} y={by} width={bw} height={bh} fill="#0b1522" opacity="0.7" />
      ))}

      {/* Auto-rickshaws on roads — tiny */}
      <g opacity="0.35">
        <AutoRickshaw x={140} y={148} sc={0.28} />
        <AutoRickshaw x={230} y={148} sc={0.28} flip />
        <AutoRickshaw x={114} y={182} sc={0.25} />
      </g>

      {/* Dog nodes appearing */}
      {nodes.map(([nx,ny],i)=>(
        <motion.g key={i}
          animate={active ? {opacity:[0,1]} : {opacity:0}}
          transition={{duration:0.3, delay:i*0.06}}>
          {i===HERO ? (
            <>
              <motion.circle cx={nx} cy={ny} r="10" fill="#4EBDDB" opacity="0.16"
                animate={active ? {r:[10,20,10]} : {}}
                transition={{duration:2.6, repeat:Infinity}} />
              <circle cx={nx} cy={ny} r="5" fill="#4EBDDB" />
              <motion.text x={nx} y={ny-13} textAnchor="middle" fontSize="6.5" fill="#4EBDDB"
                animate={active ? {opacity:[0,1]} : {opacity:0}}
                transition={{delay:nodes.length*0.06+0.5, duration:0.6}}>
                our dog
              </motion.text>
            </>
          ) : (
            <circle cx={nx} cy={ny} r={i%5===0?3.5:2.5} fill="#4EBDDB" opacity={0.2+(i%6)*0.09} />
          )}
        </motion.g>
      ))}

      {/* Legend */}
      <motion.text x="200" y="284" textAnchor="middle" fontSize="8.5" fill="#4EBDDB"
        animate={active ? {opacity:[0,0.55]} : {opacity:0}}
        transition={{delay:nodes.length*0.06+0.9, duration:0.9}}>
        35 million dogs across India — every one visible, every one a node
      </motion.text>
    </svg>
  );
}

const SCENES = [
  SceneHero, SceneProblem, SceneNotice, SceneReport,
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
