import { type ReactNode } from "react";
import { staticFile } from "remotion";
import { POSES, type KajuState, type Part, type T } from "./poses";

/* Kaju's articulated rig, driven by time instead of CSS.
   The product's rig (src/kaju/Kaju.tsx) moves between poses with CSS transitions and runs its loops as CSS
   animations, which a frame-by-frame render cannot see. This is the same rig, the same textures, crops, joints and
   pose library (poses.ts is an unmodified copy), with every transform computed from `t`, so a frame always
   renders the same way. Loop shapes and periods follow kaju.css. */
const ART = staticFile("explorer-rig.png");
const FACES = staticFile("explorer-expressions.png");
const BODY = staticFile("explorer-torso.png");
const CROPS = {
  head: [20, 55, 420, 350], torso: [470, 45, 340, 365], body: [470, 150, 340, 260], collar: [510, 45, 245, 160], tail: [855, 18, 370, 395],
  floppy: [55, 450, 350, 350], upright: [525, 438, 270, 380],
  front: [965, 425, 210, 395], far: [100, 815, 200, 405],
  haunch: [475, 825, 305, 395], haunchFar: [895, 825, 310, 395],
} as const;
function Texture({ name, x, y, width, height }: { name: keyof typeof CROPS; x: number; y: number; width: number; height: number }) {
  return <svg x={x} y={y} width={width} height={height} viewBox={CROPS[name].join(" ")} preserveAspectRatio="none" overflow="hidden"><image href={ART} width="1254" height="1254" /></svg>;
}
const tf = (p: T) => `translate(${p.x} ${p.y}) rotate(${p.r ?? 0}) scale(${p.sx ?? 1} ${p.sy ?? 1})`;
const mixT = (a: T, b: T, m: number): T => ({ x: a.x + (b.x - a.x) * m, y: a.y + (b.y - a.y) * m, r: (a.r ?? 0) + ((b.r ?? 0) - (a.r ?? 0)) * m, sx: (a.sx ?? 1) + ((b.sx ?? 1) - (a.sx ?? 1)) * m, sy: (a.sy ?? 1) + ((b.sy ?? 1) - (a.sy ?? 1)) * m, hide: m < 0.5 ? a.hide : b.hide });
const UPRIGHT = (s: KajuState) => !["standing", "walking", "trotting", "tailWag", "success", "stretching", "lying", "sleeping", "waking", "settling", "error"].includes(s);
const wave01 = (t: number, period: number) => 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / period);   // 0 → 1 → 0

export type KajuRigProps = {
  /** The pose. */
  state?: KajuState;
  /** Blend from this pose into `state` by `mix` (0 to 1). Both should share a body (sitting poses, or standing poses). */
  from?: KajuState; mix?: number;
  /** Seconds. Drives the loops (wave, wag, breath, blink). */
  t?: number;
  /** 0 to 1: how far through a single hop the body is. */
  hop?: number;
  /** Scales the wave and wag loops, so they can ease in and out. */
  energy?: number;
  size?: number; flip?: boolean; shadow?: boolean;
};

export function KajuRig({ state = "sitting", from, mix = 1, t = 0, hop = 0, energy = 1, size = 120, flip = false, shadow = true }: KajuRigProps) {
  const pose = POSES[state] ?? POSES.sitting;
  const prev = from ? POSES[from] : pose;
  const face = mix >= 0.5 ? pose : prev;
  const has = (name: string) => (mix >= 0.5 ? pose : prev).loops.some((l) => l === name);
  const upright = UPRIGHT(mix >= 0.5 ? state : from ?? state);
  const parts = (k: Part) => mixT(prev.parts[k], pose.parts[k], mix);
  const breath = wave01(t, 3.4);
  const loop: Partial<Record<Part, string>> = {
    tail: has("wag") ? `rotate(${(-18 + 34 * wave01(t, 0.3)) * energy})` : has("wagSlow") ? `rotate(${(-18 + 34 * wave01(t, 1.1)) * energy * 0.7})` : "",
    torso: `scale(${1 + 0.012 * breath} ${1 + 0.028 * breath})`,
    fNear: has("wave") ? `rotate(${-24 * wave01(t, 0.52) * energy})` : has("explain") ? `rotate(${-14 * wave01(t, 1.4) * energy})` : "",
    head: `rotate(${Math.sin(t * 1.7) * 1.4}) translate(0 ${-0.5 * breath})`,
  };
  const blink = has("blink") && ((t + 0.6) % 3.8) / 3.8 > 0.955;
  const hopY = -12 * Math.sin(Math.PI * Math.min(1, Math.max(0, hop)));
  const part = (name: Part, child: ReactNode) => { const p = parts(name); return <g transform={tf(p)} opacity={p.hide ? 0 : 1}><g transform={loop[name] || undefined}>{child}</g></g>; };
  return (
    <svg viewBox="0 0 240 200" width={size} height={(size * 200) / 240} style={{ display: "block", overflow: "visible" }} aria-hidden focusable="false">
      <g transform={flip ? "translate(240 0) scale(-1 1)" : undefined}>
        {shadow && <ellipse cx="120" cy="190" rx={58 * (1 - 0.12 * Math.sin(Math.PI * hop))} ry="4" fill="#0b1e3d" opacity={0.1} />}
        <g transform={`translate(0 ${hopY})`}>
          {part("bFar", <Leg far haunch={upright} />)}
          {part("fFar", <Leg far />)}
          {part("tail", <Texture name="tail" x={-38} y={-61} width={44} height={66} />)}
          {part("torso", upright ? <Texture name="torso" x={-31} y={-43} width={62} height={81} /> : <g transform="rotate(-90)"><image href={BODY} x={-47} y={-41} width={97} height={65} /></g>)}
          {part("bNear", <Leg haunch={upright} />)}
          {part("fNear", <Leg />)}
          {part("head", <Head eyes={blink ? "closed" : face.eyes} mouth={face.mouth} ears={face.ears} />)}
        </g>
      </g>
    </svg>
  );
}

function Leg({ far = false, haunch = false }: { far?: boolean; haunch?: boolean }) {
  if (haunch) return <Texture name={far ? "haunchFar" : "haunch"} x={-18} y={-22} width={36} height={47} />;
  return (
    <g opacity={far ? 0.92 : 1}>
      <svg x={-10} y={-5} width="21" height="25" viewBox="-10 -5 21 25" overflow="hidden"><Texture name={far ? "far" : "front"} x={-10} y={-5} width={21} height={49} /></svg>
      <g transform="translate(0 20)"><svg x={-10} y="0" width="21" height="25" viewBox="-10 20 21 25" overflow="hidden"><Texture name={far ? "far" : "front"} x={-10} y={-5} width={21} height={49} /></svg></g>
    </g>
  );
}
function Face({ frame }: { frame: number }) {
  return <svg x={-46} y={-68} width={92} height={92} viewBox={`${frame * 724} 0 724 724`} overflow="hidden"><image href={FACES} width="2172" height="724" /></svg>;
}
function Head({ eyes, mouth, ears }: { eyes: string; mouth: string; ears: string }) {
  return (
    <g>
      <g transform={`translate(19 -40) rotate(${ears === "back" ? 24 : ears === "up" ? -4 : 4})`}><Texture name="upright" x={-10} y={-42} width={28} height={47} /></g>
      <Face frame={eyes === "closed" || eyes === "half" ? 0 : mouth === "open" ? 1 : 2} />
      <g transform={`translate(-26 -51) rotate(${ears === "back" ? -17 : ears === "up" ? 4 : -3})`}><Texture name="floppy" x={-27} y={-5} width={43} height={44} /></g>
    </g>
  );
}
