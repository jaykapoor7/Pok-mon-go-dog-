import { type CSSProperties, type ReactNode } from "react";
import { staticFile } from "remotion";
import { POSES, type KajuState, type Part, type T } from "./poses";

// One reference-derived texture separated into joints, never whole-pose swaps.
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
const transform = (p: T): CSSProperties => ({ transform: `translate(${p.x}px, ${p.y}px) rotate(${p.r ?? 0}deg) scale(${p.sx ?? 1}, ${p.sy ?? 1})`, opacity: p.hide ? 0 : 1 });
type Props = { state?: KajuState; size?: number | string; label?: string; still?: boolean; flip?: boolean; className?: string };

export function Kaju({ state = "sitting", size = 120, label, still = false, flip = false, className = "" }: Props) {
  const pose = POSES[state] ?? POSES.sitting;
  const loops = still ? [] : pose.loops;
  const has = (name: string) => loops.some(l => l === name);
  const upright = !["standing", "walking", "trotting", "tailWag", "success", "stretching", "lying", "sleeping", "waking", "settling", "error"].includes(state);
  const gait = has("walk") ? "w" : has("trot") ? "t" : "";
  const part = (name: Part, child: ReactNode, loop = "") => <g className={`kj-pose kj-${name}`} style={transform(pose.parts[name])}><g className={`kj-loop ${loop}`}>{child}</g></g>;
  return <svg className={`kaju kaju-explorer is-${state} eyes-${pose.eyes}${still ? " is-still" : ""}${flip ? " is-flip" : ""} ${loops.map(l => `l-${l}`).join(" ")} ${className}`}
    viewBox="0 0 240 200" width={size} height={typeof size === "number" ? size * 200 / 240 : undefined} role={label ? "img" : undefined} aria-label={label ? `${label} (${pose.label})` : undefined} aria-hidden={label ? undefined : true} focusable="false" data-kaju-state={state} data-kaju-art="explorer" data-kaju-rig="articulated">
    <g className="kj-flip">
      <ellipse className="kj-shadow" cx="120" cy="190" rx="58" ry="4" style={{ opacity: pose.shadow === 0 ? 0 : .1, transform: `scaleX(${pose.shadow ?? 1})` }} />
      <g className={`kj-loop${has("hop") ? " hop" : ""}`}>
      {part("bFar", <Leg far haunch={upright} />, gait ? `${gait}-b2` : "")}
      {part("fFar", <Leg far />, gait ? `${gait}-f2` : "")}
      {part("tail", <Texture name="tail" x={-38} y={-61} width={44} height={66} />, has("wag") ? "wag" : has("wagSlow") ? "wag-slow" : "")}
      {part("torso", upright ? <Texture name="torso" x={-31} y={-43} width={62} height={81} /> : <g transform="rotate(-90)"><image href={BODY} x={-47} y={-41} width={97} height={65}/></g>, has("walk") ? "bob" : has("trot") ? "bob-fast" : has("breathe") ? "breathe" : "")}
      {part("bNear", <Leg haunch={upright} />, gait ? `${gait}-b1` : "")}
      {part("fNear", <Leg />, gait ? `${gait}-f1` : has("wave") ? "wave" : has("explain") ? "explain" : "")}
      {part("head", <Head eyes={pose.eyes} mouth={pose.mouth} ears={pose.ears} blink={has("blink")} twitch={has("twitch")} />, has("look") ? "look" : has("walk") ? "bob" : has("trot") ? "bob-fast" : has("wake") ? "wake" : has("stretch") ? "stretch" : "")}
      </g>
      {has("zz") && <g className="kj-zz" aria-hidden><text x="180" y="124">z</text><text x="194" y="108">z</text><text x="205" y="92">Z</text></g>}
      {has("think") && <g className="kj-think" aria-hidden><circle cx="174" cy="66" r="2"/><circle cx="183" cy="57" r="3"/><circle cx="194" cy="47" r="4"/></g>}
      {has("sparkle") && <g className="kj-spark" aria-hidden><path d="M180 46 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z"/></g>}
    </g>
  </svg>;
}

function Leg({ far = false, haunch = false }: { far?: boolean; haunch?: boolean }) {
  if (haunch) return <Texture name={far ? "haunchFar" : "haunch"} x={-18} y={-22} width={36} height={47} />;
  // Split the same leg texture at the knee so the paw flexes during each step.
  return <g opacity={far ? .92 : 1}>
    <svg x={-10} y={-5} width="21" height="25" viewBox="-10 -5 21 25" overflow="hidden"><Texture name={far ? "far" : "front"} x={-10} y={-5} width={21} height={49}/></svg>
    <g transform="translate(0 20)"><g className="kj-knee"><svg x={-10} y="0" width="21" height="25" viewBox="-10 20 21 25" overflow="hidden"><Texture name={far ? "far" : "front"} x={-10} y={-5} width={21} height={49}/></svg></g></g>
  </g>;
}

function Face({ frame }: { frame: number }) {
  return <svg x={-46} y={-68} width={92} height={92} viewBox={`${frame * 724} 0 724 724`} overflow="hidden"><image href={FACES} width="2172" height="724"/></svg>;
}
function Head({ eyes = "open", mouth = "smile", ears = "relaxed", blink = false, twitch = false }: { eyes?: string; mouth?: string; ears?: string; blink?: boolean; twitch?: boolean }) {
  return <g>
    <g className="kj-ear-up" style={{ transform: `translate(19px,-40px) rotate(${ears === "back" ? 24 : ears === "up" ? -4 : 4}deg)` }}><g className={twitch ? "twitch" : ""}><Texture name="upright" x={-10} y={-42} width={28} height={47}/></g></g>
    <Face frame={eyes === "closed" || eyes === "half" ? 0 : mouth === "open" ? 1 : 2}/>
    {blink && <g className="kj-lids kj-natural-blink"><Face frame={0}/></g>}
    <g className="kj-ear-flop" style={{ transform: `translate(-26px,-51px) rotate(${ears === "back" ? -17 : ears === "up" ? 4 : -3}deg)` }}><g className={twitch ? "kj-flop-follow" : ""}><Texture name="floppy" x={-27} y={-5} width={43} height={44}/></g></g>
  </g>;
}

/** The same head and ear parts, cropped for compact UI placements. */
export function KajuFace({ size = 20, className = "" }: { size?: number; className?: string }) {
  return <svg className={`kaju-face kaju ${className}`} viewBox="-56 -96 112 112" width={size} height={size} aria-hidden focusable="false"><Head/></svg>;
}
