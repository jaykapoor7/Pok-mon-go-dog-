/* ════════════════════════════════════════════════════════════════════
   Kaju's pose library.

   Kaju is an articulated SVG rig (see Kaju.tsx): torso, head, tail and
   four legs, each drawn around its own joint. A pose places every part
   (translate + rotate + scale, in the 240×200 view box) and sets the
   face. Moving between poses is a CSS transition on those transforms, so
   sitting down, standing up and lying down are real motion of the same
   body, not swapped pictures. Loops (walk cycle, tail wag, blink, breath)
   run inside each part, on top of its pose.

   Canonical identity and rules: KAJU_CHARACTER.md.
   ════════════════════════════════════════════════════════════════════ */

export const EVERYDAY = ["sitting", "lying", "standing", "walking", "trotting", "sleeping", "waking", "stretching", "peeking", "looking", "headTilt", "earTwitch", "tailWag", "settling"] as const;
export const ASSISTANT = ["greeting", "listening", "thinking", "explaining", "success", "insight", "concerned", "error", "goodbye"] as const;
export type KajuState = (typeof EVERYDAY)[number] | (typeof ASSISTANT)[number];
export const ALL_STATES: KajuState[] = [...EVERYDAY, ...ASSISTANT];

export type Part = "torso" | "head" | "tail" | "bFar" | "bNear" | "fFar" | "fNear";
export type T = { x: number; y: number; r?: number; sx?: number; sy?: number; hide?: boolean };
export type Eyes = "open" | "closed" | "happy" | "up" | "half" | "wide";
export type Mouth = "smile" | "open" | "flat";
export type Ears = "up" | "relaxed" | "back";
/** Loops a pose runs. Each is a CSS animation on one part (kaju.css). */
export type Loop = "walk" | "trot" | "wag" | "wagSlow" | "breathe" | "blink" | "look" | "twitch" | "hop" | "wave" | "explain" | "think" | "zz" | "sparkle" | "stretch" | "wake";

export type Pose = { parts: Record<Part, T>; eyes: Eyes; mouth: Mouth; ears: Ears; brows?: boolean; loops: Loop[]; shadow?: number; label: string };

/* Base bodies: standing, sitting, lying. Everything else varies one. */
const STAND: Record<Part, T> = {
  torso: { x: 118, y: 128 }, head: { x: 150, y: 106 }, tail: { x: 78, y: 120, r: 0 },
  bFar: { x: 88, y: 142, r: 4 }, bNear: { x: 99, y: 144, r: -4 }, fFar: { x: 132, y: 142, r: -3 }, fNear: { x: 142, y: 144, r: 3 },
};
const SIT: Record<Part, T> = {
  torso: { x: 110, y: 144, r: -40 }, head: { x: 126, y: 100, r: -2 }, tail: { x: 80, y: 174, r: -64 },
  bFar: { x: 88, y: 164, r: -72, sy: 0.62 }, bNear: { x: 98, y: 166, r: -70, sy: 0.62 }, fFar: { x: 126, y: 142, r: 0 }, fNear: { x: 136, y: 144, r: 2 },
};
const LIE: Record<Part, T> = {
  torso: { x: 116, y: 162, sy: 0.9 }, head: { x: 150, y: 152, r: 6 }, tail: { x: 76, y: 168, r: -52 },
  bFar: { x: 88, y: 170, r: -80, sy: 0.6 }, bNear: { x: 98, y: 174, r: -82, sy: 0.6 }, fFar: { x: 136, y: 174, r: -90, sy: 0.86 }, fNear: { x: 144, y: 179, r: -92, sy: 0.9 },
};
const w = (base: Record<Part, T>, over: Partial<Record<Part, Partial<T>>>): Record<Part, T> =>
  Object.fromEntries((Object.keys(base) as Part[]).map((k) => [k, { ...base[k], ...(over[k] ?? {}) }])) as Record<Part, T>;

export const POSES: Record<KajuState, Pose> = {
  /* everyday */
  sitting: { parts: SIT, eyes: "open", mouth: "smile", ears: "relaxed", loops: ["breathe", "blink"], label: "sitting" },
  lying: { parts: LIE, eyes: "open", mouth: "smile", ears: "relaxed", loops: ["breathe", "blink"], shadow: 1.15, label: "lying down" },
  standing: { parts: STAND, eyes: "open", mouth: "smile", ears: "relaxed", loops: ["breathe", "blink"], label: "standing" },
  walking: { parts: STAND, eyes: "open", mouth: "smile", ears: "relaxed", loops: ["walk", "blink", "wagSlow"], label: "walking" },
  trotting: { parts: w(STAND, { head: { r: 4 }, tail: { r: -14 } }), eyes: "happy", mouth: "open", ears: "relaxed", loops: ["trot", "wag"], label: "trotting" },
  sleeping: { parts: w(LIE, { head: { x: 146, y: 162, r: 22 }, tail: { x: 80, y: 174, r: -112 } }), eyes: "closed", mouth: "flat", ears: "relaxed", loops: ["breathe", "zz"], shadow: 1.15, label: "sleeping" },
  waking: { parts: w(LIE, { head: { x: 150, y: 148, r: -8 } }), eyes: "half", mouth: "open", ears: "relaxed", loops: ["wake"], shadow: 1.15, label: "waking up" },
  stretching: {
    parts: w(STAND, { torso: { x: 116, y: 146, r: 16 }, head: { x: 150, y: 152, r: 10 }, tail: { x: 76, y: 130, r: -26 }, bFar: { x: 88, y: 136, r: 6 }, bNear: { x: 99, y: 138, r: 0 }, fFar: { x: 138, y: 160, r: -68, sy: 0.92 }, fNear: { x: 146, y: 162, r: -72, sy: 0.92 } }),
    eyes: "closed", mouth: "open", ears: "back", loops: ["stretch"], label: "stretching",
  },
  peeking: {
    parts: { torso: { x: 118, y: 170, hide: true }, tail: { x: 70, y: 170, hide: true }, bFar: { x: 80, y: 190, hide: true }, bNear: { x: 92, y: 190, hide: true }, head: { x: 110, y: 172, r: -6 }, fFar: { x: 96, y: 180, r: 0, sy: 0.3 }, fNear: { x: 134, y: 180, r: 0, sy: 0.3 } },
    eyes: "wide", mouth: "smile", ears: "up", loops: ["blink", "twitch"], shadow: 0, label: "peeking",
  },
  looking: { parts: SIT, eyes: "open", mouth: "smile", ears: "up", loops: ["look", "blink", "breathe"], label: "looking around" },
  headTilt: { parts: w(SIT, { head: { r: -16 } }), eyes: "wide", mouth: "smile", ears: "up", loops: ["blink", "breathe"], label: "tilting his head" },
  earTwitch: { parts: SIT, eyes: "open", mouth: "smile", ears: "up", loops: ["twitch", "blink", "breathe"], label: "twitching an ear" },
  tailWag: { parts: STAND, eyes: "happy", mouth: "open", ears: "relaxed", loops: ["wag", "breathe"], label: "wagging his tail" },
  settling: { parts: w(LIE, { head: { r: 12 } }), eyes: "half", mouth: "smile", ears: "relaxed", loops: ["breathe"], shadow: 1.15, label: "settling down" },
  /* assistant */
  greeting: { parts: w(SIT, { fNear: { x: 137, y: 134, r: -128, sy: 0.9 } }), eyes: "happy", mouth: "open", ears: "up", loops: ["wave", "wag"], label: "saying hello" },
  listening: { parts: w(SIT, { head: { r: -8 } }), eyes: "wide", mouth: "smile", ears: "up", loops: ["blink", "twitch", "breathe"], label: "listening" },
  thinking: { parts: w(SIT, { head: { r: -12 } }), eyes: "up", mouth: "flat", ears: "relaxed", loops: ["think", "wagSlow", "breathe"], label: "thinking" },
  explaining: { parts: w(SIT, { fNear: { x: 137, y: 138, r: -48, sy: 0.95 } }), eyes: "open", mouth: "open", ears: "up", loops: ["explain", "blink", "breathe"], label: "explaining" },
  success: { parts: w(STAND, { head: { r: -6 }, tail: { r: -18 } }), eyes: "happy", mouth: "open", ears: "up", loops: ["hop", "wag"], label: "pleased with the result" },
  insight: { parts: w(SIT, { head: { r: -4 } }), eyes: "wide", mouth: "open", ears: "up", loops: ["sparkle", "blink", "breathe"], label: "spotting something" },
  concerned: { parts: w(SIT, { head: { r: 8 } }), eyes: "open", mouth: "flat", ears: "back", brows: true, loops: ["blink", "breathe"], label: "concerned" },
  error: { parts: w(LIE, { head: { x: 148, y: 158, r: 16 } }), eyes: "half", mouth: "flat", ears: "back", brows: true, loops: ["breathe"], shadow: 1.15, label: "unable to finish" },
  goodbye: { parts: w(SIT, { fNear: { x: 137, y: 134, r: -120, sy: 0.9 } }), eyes: "happy", mouth: "smile", ears: "relaxed", loops: ["wave", "wagSlow"], label: "saying goodbye" },
};

/** Loops that are pure motion: dropped entirely under reduced motion. Blink and breath stay off too. */
export const MOTION_LOOPS: Loop[] = ["walk", "trot", "wag", "wagSlow", "breathe", "blink", "look", "twitch", "hop", "wave", "explain", "think", "zz", "sparkle", "stretch", "wake"];

/** Ready-made sequences for ambient presence. Durations in ms; the last step holds. */
export type Step = { state: KajuState; ms: number };
export const SEQUENCES: Record<string, Step[]> = {
  wakeUp: [{ state: "sleeping", ms: 2200 }, { state: "waking", ms: 1100 }, { state: "stretching", ms: 1300 }, { state: "standing", ms: 600 }, { state: "tailWag", ms: 1400 }, { state: "sitting", ms: 0 }],
  arrive: [{ state: "trotting", ms: 1800 }, { state: "standing", ms: 400 }, { state: "sitting", ms: 1400 }, { state: "headTilt", ms: 1400 }, { state: "sitting", ms: 0 }],
  idle: [{ state: "sitting", ms: 5000 }, { state: "looking", ms: 3200 }, { state: "sitting", ms: 4000 }, { state: "earTwitch", ms: 1600 }, { state: "sitting", ms: 4000 }, { state: "settling", ms: 900 }, { state: "lying", ms: 6000 }, { state: "sleeping", ms: 0 }],
  /* chilling: long, calm holds; mostly lying and dozing */
  chill: [{ state: "lying", ms: 7000 }, { state: "earTwitch", ms: 1600 }, { state: "lying", ms: 6000 }, { state: "sleeping", ms: 14000 }, { state: "waking", ms: 1100 }, { state: "lying", ms: 5000 }],
  perch: [{ state: "sitting", ms: 6000 }, { state: "looking", ms: 3200 }, { state: "sitting", ms: 5000 }, { state: "headTilt", ms: 1600 }, { state: "sitting", ms: 6000 }, { state: "tailWag", ms: 1400 }],
  open: [{ state: "greeting", ms: 1600 }, { state: "listening", ms: 0 }],
  close: [{ state: "goodbye", ms: 1100 }, { state: "settling", ms: 900 }, { state: "lying", ms: 0 }],
  done: [{ state: "success", ms: 1500 }, { state: "sitting", ms: 0 }],
  fullDemo: [
    { state: "sleeping", ms: 2000 }, { state: "waking", ms: 1100 }, { state: "stretching", ms: 1300 }, { state: "standing", ms: 500 }, { state: "trotting", ms: 1600 },
    { state: "sitting", ms: 900 }, { state: "listening", ms: 1400 }, { state: "thinking", ms: 1800 }, { state: "success", ms: 1500 }, { state: "settling", ms: 900 }, { state: "lying", ms: 0 },
  ],
};
