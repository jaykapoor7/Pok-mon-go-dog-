import { continueRender, delayRender, Easing, staticFile, useVideoConfig } from "remotion";

/* StrayPaw 4.0 palette (DESIGN.md). Flame is for urgency only. */
export const C = {
  ground: "#ffffff", fill: "#f5f7fb", hairline: "#e4e8f0", ink: "#0b1e3d", body: "#4a5568", muted: "#6b7486",
  blue: "#2457ce", deep: "#071630", green: "#1f7a4d", amber: "#d08a1d", flame: "#f05b40",
} as const;

/* Fonts ship in public/ so a render never touches the network. Each face is limited to its own script, and the
   stack lists all three, so a line that mixes Latin, Devanagari and Kannada gets the right face glyph by glyph. */
export const INTER = "KJInter, KJDeva, KJKannada, system-ui, sans-serif";
export const DEVA = "KJDeva, KJInter, KJKannada, sans-serif";
export const KANNADA = "KJKannada, KJInter, KJDeva, sans-serif";

const FACES: [string, string, FontFaceDescriptors][] = [
  ["KJInter", "inter.woff2", { weight: "100 900" }],
  ["KJDeva", "deva.woff2", { weight: "100 900", unicodeRange: "U+0900-097F, U+1CD0-1CFF, U+A8E0-A8FF, U+200C-200D, U+20B9, U+25CC" }],
  ["KJKannada", "kannada.woff2", { weight: "100 900", unicodeRange: "U+0C80-0CFF, U+0964-0965, U+1CD0-1CF9, U+200C-200D, U+25CC" }],
];
if (typeof document !== "undefined") {
  const h = delayRender("Loading fonts");
  /* A face that fails to load (say, the Kannada file was removed) is skipped: the stack falls through to the next. */
  Promise.all(FACES.map(([family, file, d]) => new FontFace(family, `url(${staticFile(file)})`, d).load().then((f) => document.fonts.add(f)).catch((e) => console.warn(`Font ${family} (${file}) did not load; falling back.`, e))))
    .then(() => continueRender(h));
}

export type Script = "latin" | "devanagari" | "kannada";
/** Which script a line is mostly written in, by Unicode block. */
export function scriptOf(text: string): Script {
  let d = 0, k = 0, l = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x0900 && c <= 0x097f) d++; else if (c >= 0x0c80 && c <= 0x0cff) k++; else if ((c >= 0x41 && c <= 0x7a) || (c >= 0xc0 && c <= 0x24f)) l++;
  }
  return d > k && d >= l ? "devanagari" : k >= l && k > 0 ? "kannada" : "latin";
}
/** Family, and how much taller and larger a script needs to be set to sit level with Latin at the same size. */
export const SCRIPT: Record<Script, { family: string; lineHeight: number; scale: number; tracking: string }> = {
  latin: { family: INTER, lineHeight: 1.22, scale: 1, tracking: "-0.012em" },
  devanagari: { family: DEVA, lineHeight: 1.5, scale: 1.04, tracking: "0" },
  kannada: { family: KANNADA, lineHeight: 1.55, scale: 1.0, tracking: "0" },
};

/** Product motion curve: cubic-bezier(.2,.7,.2,1). */
export const EASE = Easing.bezier(0.2, 0.7, 0.2, 1);
export const EASE_IN_OUT = Easing.bezier(0.45, 0, 0.2, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0 to 1 over `len` frames starting at `at`, on the product curve. */
export const rise = (frame: number, at: number, len = 7) => EASE(clamp01((frame - at) / len));

/** Canvas facts every component needs. `u` is one pixel at 1080 on the short side; `safe` is the 5% title-safe inset. */
export function useLayout() {
  const { width, height, fps } = useVideoConfig();
  const V = height > width;
  const u = Math.min(width, height) / 1080;
  return { V, u, width, height, fps, safeX: width * 0.05, safeY: height * 0.05 };
}
