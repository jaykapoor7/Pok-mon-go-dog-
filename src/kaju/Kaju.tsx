"use client";

/* ════════════════════════════════════════════════════════════════════
   Kaju: StrayPaw's AI companion, an Indian indie puppy.

   One articulated SVG rig. Every part is drawn around its own joint at
   the local origin; the pose (poses.ts) places it. Two nested groups per
   part: the outer carries the pose (transitioned, so he really sits down
   and stands up), the inner carries the loop (walk cycle, wag, wave).

   <Kaju state="sitting" size={120} />            decorative by default
   <Kaju state="thinking" label="Kaju is thinking" />   announced
   ════════════════════════════════════════════════════════════════════ */

import { useId, type CSSProperties } from "react";
import { POSES, type KajuState, type Part, type T } from "./poses";
import "./kaju.css";

export const KAJU = {
  fur: "#C98A3E", furDeep: "#A86C2B", furShade: "#B87A33", cream: "#F6E4C6", white: "#FFF9EF",
  eye: "#3A2214", nose: "#2A2528", innerEar: "#E7B486", tongue: "#E77F7A", line: "#8E5A22",
} as const;

const tf = (t: T): CSSProperties => ({
  transform: `translate(${t.x}px, ${t.y}px) rotate(${t.r ?? 0}deg) scale(${t.sx ?? 1}, ${t.sy ?? 1})`,
  opacity: t.hide ? 0 : 1,
});

type Props = {
  state?: KajuState;
  size?: number | string;
  /** Spoken name for screen readers; omit for a decorative Kaju. */
  label?: string;
  /** Freeze every loop (reduced motion, ambient off, off-screen). The pose still shows. */
  still?: boolean;
  /** Mirror him to face left. */
  flip?: boolean;
  className?: string;
};

export function Kaju({ state = "sitting", size = 120, label, still = false, flip = false, className = "" }: Props) {
  const pose = POSES[state] ?? POSES.sitting;
  const id = useId().replace(/:/g, "");
  const P = pose.parts;
  const loops = still ? [] : pose.loops;
  const has = (l: string) => loops.includes(l as never);
  const cls = ["kaju", `is-${state}`, `eyes-${pose.eyes}`, `ears-${pose.ears}`, still ? "is-still" : "", flip ? "is-flip" : "", ...loops.map((l) => `l-${l}`), className].filter(Boolean).join(" ");
  const part = (k: Part, inner: React.ReactNode, loopClass = "") => (
    <g className={`kj-pose kj-${k}`} style={tf(P[k])}><g className={`kj-loop ${loopClass}`}>{inner}</g></g>
  );

  return (
    <svg className={cls} viewBox="0 0 240 200" width={size} height={typeof size === "number" ? (size * 200) / 240 : undefined}
      role={label ? "img" : undefined} aria-label={label ? `${label} (${pose.label})` : undefined} aria-hidden={label ? undefined : true} focusable="false" data-kaju-state={state}>
      <defs>
        <radialGradient id={`f${id}`} cx="40%" cy="35%" r="75%"><stop offset="0" stopColor="#D69A4E" /><stop offset="1" stopColor={KAJU.fur} /></radialGradient>
        <radialGradient id={`h${id}`} cx="45%" cy="30%" r="75%"><stop offset="0" stopColor="#DCA257" /><stop offset="1" stopColor={KAJU.furShade} /></radialGradient>
      </defs>
      <g className="kj-flip">
        <ellipse className="kj-shadow" cx="120" cy="188" rx="62" ry="6" style={{ transform: `scaleX(${pose.shadow ?? 1})`, opacity: pose.shadow === 0 ? 0 : 0.14 }} />

        {/* far legs and tail sit behind the body */}
        {part("bFar", <Leg far />, has("walk") ? "w-b2" : has("trot") ? "t-b2" : "")}
        {part("fFar", <Leg far front />, has("walk") ? "w-f2" : has("trot") ? "t-f2" : "")}
        {part("tail", <Tail />, has("wag") ? "wag" : has("wagSlow") ? "wag-slow" : "")}

        {/* torso, with the breath and the walk bob */}
        <g className={`kj-pose kj-torso`} style={tf(P.torso)}>
          <g className={`kj-loop ${has("breathe") ? "breathe" : ""} ${has("walk") ? "bob" : ""} ${has("trot") ? "bob-fast" : ""} ${has("hop") ? "hop" : ""}`}>
            <Torso grad={`url(#f${id})`} />
          </g>
        </g>

        {part("bNear", <Leg thigh />, has("walk") ? "w-b1" : has("trot") ? "t-b1" : "")}
        {part("fNear", <Leg front />, has("walk") ? "w-f1" : has("trot") ? "t-f1" : has("wave") ? "wave" : has("explain") ? "explain" : "")}

        {/* head last: it overlaps everything */}
        <g className="kj-pose kj-head" style={tf(P.head)}>
          <g className={`kj-loop ${has("look") ? "look" : ""} ${has("hop") ? "hop" : ""} ${has("bob") ? "" : ""} ${has("walk") ? "bob" : ""} ${has("trot") ? "bob-fast" : ""} ${has("stretch") ? "stretch" : ""} ${has("wake") ? "wake" : ""}`}>
            <g transform="scale(1.2)"><Head grad={`url(#h${id})`} pose={pose} blink={has("blink")} twitch={has("twitch")} /></g>
          </g>
        </g>

        {has("zz") && <g className="kj-zz" aria-hidden><text x="182" y="124">z</text><text x="194" y="110">z</text><text x="206" y="94">Z</text></g>}
        {has("think") && <g className="kj-think" aria-hidden><circle cx="168" cy="44" r="4" /><circle cx="182" cy="34" r="5" /><circle cx="198" cy="22" r="6" /></g>}
        {has("sparkle") && <g className="kj-spark" aria-hidden><path d="M178 34 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z" /><path d="M200 58 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" /></g>}
      </g>
    </svg>
  );
}

/* ── parts (local coordinates, joint at 0,0) ─────────────────────── */

function Leg({ far = false, front = false, thigh = false }: { far?: boolean; front?: boolean; thigh?: boolean }) {
  const fill = far ? KAJU.furDeep : KAJU.fur;
  return (
    <g>
      {thigh && <ellipse cx="1" cy="6" rx="16" ry="20" fill={KAJU.fur} stroke={KAJU.line} strokeOpacity=".35" strokeWidth="1.2" />}
      <rect x="-8" y="-4" width="16" height={front ? 44 : 42} rx="8" fill={fill} />
      {thigh && <path d="M-9 4 C-6 12 -2 16 6 18" fill="none" stroke={KAJU.line} strokeOpacity=".28" strokeWidth="1.4" strokeLinecap="round" />}
      <ellipse cx="3" cy={front ? 41 : 39} rx="11" ry="6.8" fill={far ? "#E3C9A2" : KAJU.cream} />
      <path d={`M1 ${front ? 37 : 35} v6 M6 ${front ? 37 : 35} v6`} stroke={KAJU.line} strokeOpacity=".35" strokeWidth="1.1" strokeLinecap="round" />
    </g>
  );
}

function Tail() {
  return (
    <g>
      <path d="M4 2 C-8 -2 -18 -14 -16 -28 C-15 -36 -6 -38 -5 -31 C-6 -22 -1 -12 8 -6 Z" fill={KAJU.fur} stroke={KAJU.line} strokeOpacity=".3" strokeWidth="1.2" />
      <path d="M-16 -27 C-15 -35 -7 -37 -5.5 -31 C-8 -31 -12 -30 -16 -27 Z" fill={KAJU.cream} />
    </g>
  );
}

function Torso({ grad }: { grad: string }) {
  return (
    <g>
      <ellipse cx="0" cy="0" rx="45" ry="29" fill={grad} stroke={KAJU.line} strokeOpacity=".3" strokeWidth="1.3" />
      {/* saddle: the slightly deeper coat along the back */}
      <path d="M-38 -12 C-26 -28 10 -30 30 -21 C12 -23 -16 -21 -38 -12 Z" fill={KAJU.furDeep} opacity=".35" />
      {/* belly and chest */}
      <path d="M-26 21 C-4 31 18 29 34 15 C26 27 0 32 -26 21 Z" fill={KAJU.cream} opacity=".8" />
      <ellipse cx="32" cy="-12" rx="18" ry="21" fill={KAJU.fur} />
      <ellipse cx="38" cy="-2" rx="13" ry="17" fill={KAJU.cream} />
      <ellipse cx="40" cy="4" rx="5.5" ry="7.5" fill={KAJU.white} />
    </g>
  );
}

function Head({ grad, pose, blink, twitch }: { grad: string; pose: (typeof POSES)[KajuState]; blink: boolean; twitch: boolean }) {
  const earUp = pose.ears === "back" ? -38 : pose.ears === "up" ? 4 : -6;
  const earFlop = pose.ears === "back" ? 26 : pose.ears === "up" ? -14 : 6;
  return (
    <g>
      {/* upright ear (behind the skull) */}
      <g className="kj-ear-up" style={{ transform: `translate(-8px, -42px) rotate(${earUp}deg)` }}>
        <g className={twitch ? "twitch" : ""}>
          <path d="M-6 4 C-9 -10 -6 -26 2 -34 C10 -26 14 -12 13 2 Z" fill={KAJU.furDeep} stroke={KAJU.line} strokeOpacity=".3" strokeWidth="1.2" />
          <path d="M-1 0 C-3 -10 -1 -20 3 -25 C8 -19 9 -9 8 0 Z" fill={KAJU.innerEar} />
        </g>
      </g>
      {/* skull and cheeks */}
      <ellipse cx="7" cy="-22" rx="28" ry="26" fill={grad} stroke={KAJU.line} strokeOpacity=".3" strokeWidth="1.3" />
      <path d="M-14 -8 C-10 2 2 6 12 4 C2 2 -8 -2 -14 -8 Z" fill={KAJU.furDeep} opacity=".3" />
      {/* blaze between the eyes */}
      <path d="M12 -44 C16 -36 17 -28 20 -20 C14 -22 10 -30 12 -44 Z" fill={KAJU.cream} opacity=".85" />
      {/* muzzle */}
      <ellipse cx="29" cy="-12" rx="18" ry="12.5" fill={KAJU.cream} />
      <ellipse cx="24" cy="-4" rx="10" ry="5" fill="#EBD3AE" opacity=".7" />
      {/* nose */}
      <ellipse cx="43" cy="-17" rx="6.4" ry="4.8" fill={KAJU.nose} />
      <ellipse cx="41.5" cy="-18.6" rx="2" ry="1.2" fill="#fff" opacity=".45" />
      {/* mouth */}
      {pose.mouth === "open" ? (
        <g><path d="M30 -8 C34 -2 41 -2 44 -9 C40 -6 34 -6 30 -8 Z" fill="#5A2B22" /><path d="M34 -5 C36 0 40 0 41 -5 Z" fill={KAJU.tongue} /></g>
      ) : pose.mouth === "flat" ? (
        <path d="M32 -7 L42 -8" stroke={KAJU.eye} strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <path d="M30 -8 C34 -4 39 -4 43 -10" fill="none" stroke={KAJU.eye} strokeWidth="1.6" strokeLinecap="round" />
      )}
      <path d="M43 -12.5 V-9.5" stroke={KAJU.eye} strokeWidth="1.4" strokeLinecap="round" />
      {/* eyes */}
      <g className={blink ? "kj-eyes blink" : "kj-eyes"}>
        <Eye cx={3} cy={-27} r={4.6} kind={pose.eyes} />
        <Eye cx={21} cy={-26} r={5.6} kind={pose.eyes} />
      </g>
      {pose.brows && <path d="M-3 -33 L6 -36.5 M16 -37 L25 -33.5" stroke={KAJU.line} strokeWidth="1.8" strokeLinecap="round" />}
      {/* floppy ear (in front) */}
      <g className="kj-ear-flop" style={{ transform: `translate(18px, -46px) rotate(${earFlop}deg)` }}>
        <path d="M-4 2 C4 -10 18 -12 25 -3 C29 4 23 14 15 17 C11 9 6 5 -4 6 Z" fill={KAJU.furDeep} stroke={KAJU.line} strokeOpacity=".3" strokeWidth="1.2" />
        <path d="M6 1 C12 -5 20 -5 22 0 C18 2 12 3 6 1 Z" fill={KAJU.line} opacity=".25" />
      </g>
    </g>
  );
}

function Eye({ cx, cy, r, kind }: { cx: number; cy: number; r: number; kind: string }) {
  if (kind === "closed") return <path d={`M${cx - r} ${cy} Q${cx} ${cy + r * 0.9} ${cx + r} ${cy}`} fill="none" stroke={KAJU.eye} strokeWidth="1.8" strokeLinecap="round" />;
  if (kind === "happy") return <path d={`M${cx - r} ${cy + 1} Q${cx} ${cy - r * 1.1} ${cx + r} ${cy + 1}`} fill="none" stroke={KAJU.eye} strokeWidth="2" strokeLinecap="round" />;
  const ry = kind === "half" ? r * 0.55 : kind === "wide" ? r * 1.12 : r;
  const dy = kind === "up" ? -r * 0.35 : 0;
  return (
    <g className="kj-eye">
      <ellipse cx={cx} cy={cy} rx={r * (kind === "wide" ? 1.08 : 1)} ry={ry} fill={KAJU.eye} />
      <circle cx={cx + r * 0.32} cy={cy - r * 0.38 + dy} r={r * 0.36} fill="#fff" />
      <circle cx={cx - r * 0.35} cy={cy + r * 0.3 + dy} r={r * 0.14} fill="#fff" opacity=".7" />
      {kind === "half" && <path d={`M${cx - r - 1} ${cy - ry} H${cx + r + 1}`} stroke={KAJU.furShade} strokeWidth="2.4" />}
    </g>
  );
}

/** Kaju's face alone, for small places (nav items, avatars). Static. */
export function KajuFace({ size = 20, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={`kaju-face ${className}`} viewBox="-26 -80 80 86" width={size} height={size} aria-hidden focusable="false">
      <defs><radialGradient id={`hf${id}`} cx="45%" cy="30%" r="75%"><stop offset="0" stopColor="#DCA257" /><stop offset="1" stopColor={KAJU.furShade} /></radialGradient></defs>
      <Head grad={`url(#hf${id})`} pose={POSES.listening} blink={false} twitch={false} />
    </svg>
  );
}
