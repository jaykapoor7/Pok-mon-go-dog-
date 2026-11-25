import { random } from "remotion";
import type { Anchor, Aspect, Box, CameraKey, CameraTarget, Edit, Point, ScreenSegment, Segment, Span, TakeLog, Transition } from "./types";

export const FPS = 30;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/* ── Time: spans of a take laid end to end on the film ─────────────── */
export type PlacedSpan = { from: number; to: number; speed: number; /** segment frames */ f0: number; f1: number; /** source frame to seek to */ trim: number };

export function placeSpans(seg: ScreenSegment, log: TakeLog | undefined, fps = FPS): PlacedSpan[] {
  const raw: Span[] = seg.spans?.length ? seg.spans : [{ from: seg.from ?? 0, to: seg.to ?? log?.duration ?? 5, speed: seg.speed }];
  let f = 0;
  return raw.map((s) => {
    const speed = s.speed ?? seg.speed ?? 1;
    const trim = Math.round(s.from * fps), from = trim / fps;           // snap to the footage's frame grid: pointer and picture share one clock
    const n = Math.max(1, Math.round(((s.to - from) / speed) * fps));
    const p = { from, to: from + (n / fps) * speed, speed, f0: f, f1: f + n, trim };
    f += n; return p;
  });
}
/** Take time → segment frame (fractional). Null when that moment is not in the cut. */
export function takeToFrame(spans: PlacedSpan[], t: number, fps = FPS): number | null {
  for (const s of spans) if (t >= s.from - 1e-6 && t < s.to) return s.f0 + ((t - s.from) / s.speed) * fps;
  return null;
}
/** As above, but a moment that was cut lands on the next thing that is shown (or the nearest end). */
export function takeToFrameNear(spans: PlacedSpan[], t: number, fps = FPS): number {
  const f = takeToFrame(spans, t, fps); if (f !== null) return f;
  for (const s of spans) if (t < s.from) return s.f0;
  return spans[spans.length - 1].f1;
}
export function frameToTake(spans: PlacedSpan[], frame: number, fps = FPS): number {
  const s = spans.find((x) => frame < x.f1) ?? spans[spans.length - 1];
  return s.from + ((frame - s.f0) / fps) * s.speed;
}

/* ── The film's timeline ───────────────────────────────────────────── */
export type Placed = { seg: Segment; index: number; start: number; dur: number; /** frames of transition in / out */ tin: number; tout: number; tinKind: "zoom" | "wipe" | "cut"; toutKind: "zoom" | "wipe" | "cut"; spans: PlacedSpan[] };
const transitionOf = (t: Transition | undefined, first: boolean) => {
  if (first || t === "cut") return { kind: "cut" as const, frames: 0 };
  if (t === undefined || typeof t === "string") return { kind: (t ?? "zoom") as "zoom" | "wipe", frames: 10 };
  return { kind: t.kind, frames: clamp(t.frames ?? 10, 4, 20) };
};
export function buildTimeline(edit: Edit, logs: Record<string, TakeLog> = {}, fps = FPS): { items: Placed[]; total: number } {
  const items: Placed[] = []; let at = 0;
  edit.segments.forEach((seg, index) => {
    const spans = seg.kind === "screen" ? placeSpans(seg, logs[seg.take], fps) : [];
    const dur = seg.kind === "screen" ? spans[spans.length - 1].f1 : Math.max(1, Math.round(seg.duration * fps));
    const tr = transitionOf(seg.transition, index === 0);
    const start = Math.max(0, at - tr.frames);
    if (items.length) { items[items.length - 1].tout = tr.frames; items[items.length - 1].toutKind = tr.kind; }
    items.push({ seg, index, start, dur, tin: tr.frames, tout: 0, tinKind: tr.kind, toutKind: "cut", spans });
    at = start + dur;
  });
  return { items, total: Math.max(1, at) };
}
export const takesOf = (edit: Edit) => [...new Set([...edit.segments.flatMap((s) => (s.kind === "screen" ? [s.take] : [])), ...(edit.thumb ? [edit.thumb.take] : [])])];
/** "voice-film" → "VoiceFilm": composition ids may only hold letters, digits and dashes. */
export const idOf = (slug: string) => slug.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join("");

/* ── Marks and anchors ─────────────────────────────────────────────── */
export function markBox(log: TakeLog, name: string, t?: number): Box | null {
  const all = log.marks.filter((m) => m.name === name && m.box);
  if (!all.length) return null;
  const before = t === undefined ? [] : all.filter((m) => m.t <= t + 1e-3);
  return (before.length ? before[before.length - 1] : all[0]).box!;
}
export function anchorBox(a: Anchor, log: TakeLog, t?: number): Box {
  if ("mark" in a) { const b = markBox(log, a.mark, t); if (!b) console.warn(`Mark "${a.mark}" has no box in log.json`); return b ?? { x: log.width / 2, y: log.height / 2, w: 0, h: 0 }; }
  if ("box" in a) return a.box;
  return { x: a.x, y: a.y, w: 0, h: 0 };
}

/* ── Pointer ───────────────────────────────────────────────────────── */
/** Where the pointer is at take time t: linear between samples; across a pause it holds, then leaves on time. */
export function pointerAt(log: TakeLog, t: number): Point {
  const p = log.pointer; if (!p.length) return { x: log.width / 2, y: log.height / 2 };
  if (t <= p[0].t) return p[0]; if (t >= p[p.length - 1].t) return p[p.length - 1];
  let lo = 0, hi = p.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m].t <= t) lo = m; else hi = m; }
  const a = p[lo], b = p[hi], gap = b.t - a.t;
  const start = gap > 0.12 ? b.t - 0.04 : a.t;          // a long gap is a pause, not a slow drift
  const k = clamp((t - start) / Math.max(1e-6, b.t - start), 0, 1);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}
/** Moments the pointer was really moving (or clicking). */
export function pointerMoments(log: TakeLog): number[] {
  const out: number[] = []; const p = log.pointer;
  for (let i = 1; i < p.length; i++) if (Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y) > 0.4) out.push(p[i].t);
  return out;
}
/** 0 to 1: is the pointer on screen? It leaves after 2.5 s of stillness and is back just before it moves or clicks. */
export function pointerPresence(log: TakeLog, moments: number[], t: number): number {
  let last = -Infinity, next = Infinity;
  let lo = 0, hi = moments.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (moments[m] <= t) lo = m + 1; else hi = m; }
  if (lo > 0) last = moments[lo - 1]; if (lo < moments.length) next = moments[lo];
  let v = Math.max(clamp((2.5 + 0.2 - (t - last)) / 0.2, 0, 1), clamp((0.35 - (next - t)) / 0.2, 0, 1));
  for (const c of log.clicks) v = Math.max(v, clamp((0.9 - Math.abs(t - c.t)) / 0.2, 0, 1));
  if (t < (log.pointer[0]?.t ?? 0)) v = 0;
  return v;
}

/* ── Camera ────────────────────────────────────────────────────────── */
export type Cam = { /** canvas px per CSS px of the take */ k: number; cx: number; cy: number };
export type Viewport = { vw: number; vh: number; aspect: Aspect };
const baseScale = (v: Viewport, log: TakeLog) => Math.max(v.vw / log.width, v.vh / log.height);

/** One keyframe → zoom and centre for this aspect ratio. */
export function resolveTarget(key: CameraTarget & { v?: CameraTarget }, log: TakeLog, v: Viewport, t?: number): { z: number; cx: number; cy: number } {
  const k0 = baseScale(v, log), vert = v.aspect === "vertical";
  const kv = vert ? key.v : undefined, placed = !!(kv && (kv.focus || kv.box || kv.mark));
  /* A vertical override replaces what it names: a new place replaces the place, and a box without a zoom means "fit it". */
  const src: CameraTarget = !kv ? key : { zoom: kv.zoom ?? (kv.box || kv.mark ? undefined : key.zoom), focus: placed ? kv.focus : key.focus, box: placed ? kv.box : key.box, mark: placed ? kv.mark : key.mark };
  const explicitV = kv?.zoom !== undefined;
  const box = src.box ?? (src.mark ? markBox(log, src.mark, t) ?? undefined : undefined);
  const c = src.focus ?? (box ? { x: box.x + box.w / 2, y: box.y + box.h / 2 } : { x: log.width / 2, y: log.height / 2 });
  let z: number;
  if (src.zoom !== undefined) {
    /* Vertical shows a narrower slice of the same moment: 72% of the landscape view's width, never wider than the window allows. */
    z = vert && !explicitV ? Math.max(1, v.vw / k0 / (0.72 * (log.width / src.zoom))) : src.zoom;
  } else if (box) {
    const padX = Math.max(44, box.w * 0.07), padY = Math.max(44, box.h * 0.28);
    z = clamp(Math.min(v.vw / (k0 * (box.w + 2 * padX)), v.vh / (k0 * (box.h + 2 * padY))), 1, 2.6);
  } else z = 1;
  return { z: Math.max(1, z), cx: c.x, cy: c.y };
}
/** Step response of a critically damped spring, normalised to arrive at 1: quick to start, long soft landing, no overshoot. */
export function settle(x: number, w = 6): number {
  if (x <= 0) return 0; if (x >= 1) return 1;
  return (1 - (1 + w * x) * Math.exp(-w * x)) / (1 - (1 + w) * Math.exp(-w));
}
/** Keyframes for camera: "auto": in around each burst of clicks and typing, out when it goes quiet. */
export function autoKeys(log: TakeLog, spans: PlacedSpan[], zoom = 1.5): CameraKey[] {
  const ev = [...log.clicks.map((c) => ({ t: c.t, end: c.t })), ...log.keys.map((k) => ({ t: k.t, end: k.end }))]
    .filter((e) => takeToFrame(spans, e.t) !== null).sort((a, b) => a.t - b.t);
  const keys: CameraKey[] = [{ t: spans[0].from, zoom: 1 }];
  let i = 0;
  while (i < ev.length) {
    let end = ev[i].end, j = i + 1;
    while (j < ev.length && ev[j].t - end < 2.2) { end = Math.max(end, ev[j].end); j++; }
    keys.push({ t: Math.max(spans[0].from, ev[i].t - 0.7), zoom, focus: pointerAt(log, ev[i].t) });
    keys.push({ t: end + 1.4, zoom: 1 });
    i = j;
  }
  return keys;
}

/** The camera for every frame of a screen segment. */
export function cameraTrack(seg: ScreenSegment, log: TakeLog, spans: PlacedSpan[], v: Viewport, fps = FPS): Cam[] {
  const n = spans[spans.length - 1].f1, k0 = baseScale(v, log);
  const keys = (seg.camera === "auto" ? autoKeys(log, spans, seg.autoZoom) : seg.camera ?? []).slice().sort((a, b) => a.t - b.t);
  const T = keys.map((key) => ({ ...resolveTarget(key, log, v, key.t), f: Math.round(takeToFrameNear(spans, key.t, fps)), d: Math.max(1, Math.round((key.dur ?? 0.9) * fps)), follow: key.follow !== false }));
  const first = T[0] ?? { z: 1, cx: log.width / 2, cy: log.height / 2, follow: true };
  const lz = new Float64Array(n + 1).fill(Math.log(first.z)), cx = new Float64Array(n + 1).fill(first.cx), cy = new Float64Array(n + 1).fill(first.cy);
  const follow = new Uint8Array(n + 1).fill(first.follow ? 1 : 0);
  /* Each move starts from wherever the camera is at that moment, so a move that interrupts another stays continuous. */
  for (let i = 1; i < T.length; i++) {
    const k = T[i], f0 = clamp(k.f, 0, n), s = { lz: lz[f0], cx: cx[f0], cy: cy[f0] };
    for (let f = f0; f <= n; f++) {
      const p = settle((f - f0) / k.d);
      lz[f] = s.lz + (Math.log(k.z) - s.lz) * p; cx[f] = s.cx + (k.cx - s.cx) * p; cy[f] = s.cy + (k.cy - s.cy) * p; follow[f] = k.follow ? 1 : 0;
    }
  }
  /* Pointer follow. While zoomed in and the pointer is on screen, the view leans toward it once it leaves the middle
     of the frame (a damped spring, so it trails rather than tracks), and a hard limit keeps it from ever leaving. */
  const moments = pointerMoments(log);
  const out: Cam[] = []; let ox = 0, oy = 0, vx = 0, vy = 0; const W = 5.5, SUB = 4, dt = 1 / fps / SUB;
  for (let f = 0; f <= n; f++) {
    const z = Math.exp(lz[f]), k = k0 * z, hw = v.vw / k / 2, hh = v.vh / k / 2;
    const bound = (c: number, half: number, size: number) => (half * 2 >= size ? size / 2 : clamp(c, half, size - half));
    const t = frameToTake(spans, f, fps), p = pointerAt(log, t);
    const on = follow[f] && z > 1.04 ? pointerPresence(log, moments, t) : 0;
    const bx = bound(cx[f], hw, log.width), by = bound(cy[f], hh, log.height);
    const push = (c: number, q: number, half: number) => { const inner = half * 0.72, d = q - c; return Math.abs(d) > inner ? d - Math.sign(d) * inner : 0; };
    const tx = push(bx, p.x, hw) * on, ty = push(by, p.y, hh) * on;
    for (let s = 0; s < SUB; s++) { vx += (W * W * (tx - ox) - 2 * W * vx) * dt; ox += vx * dt; vy += (W * W * (ty - oy) - 2 * W * vy) * dt; oy += vy * dt; }
    let fx = bound(bx + ox, hw, log.width), fy = bound(by + oy, hh, log.height);
    if (on > 0.5) {                                     // the guarantee: pointer inside the view, with a margin
      const mx = hw * 0.9, my = hh * 0.86;
      fx = bound(clamp(fx, p.x - mx, p.x + mx), hw, log.width); fy = bound(clamp(fy, p.y - my, p.y + my), hh, log.height);
    }
    out.push({ k, cx: fx, cy: fy });
  }
  return out;
}
/** Take CSS px → px inside the window's viewport. */
export const project = (c: Cam, v: Viewport, x: number, y: number) => ({ x: (x - c.cx) * c.k + v.vw / 2, y: (y - c.cy) * c.k + v.vh / 2 });

/* ── Text ──────────────────────────────────────────────────────────── */
/** Greedy wrap, then even out: lines of at most `max` characters, as equal as they can be. */
export function wrap(text: string, max = 42): string[] {
  const words = text.trim().split(/\s+/); const fit = (limit: number) => {
    const lines: string[] = []; let cur = "";
    for (const w of words) { if (cur && (cur + " " + w).length > limit) { lines.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; }
    if (cur) lines.push(cur); return lines;
  };
  const base = fit(max); let best = base;
  for (let limit = max - 1; limit >= Math.ceil(text.length / base.length); limit--) { const l = fit(limit); if (l.length > base.length) break; best = l; }
  return best;
}
/** Split a long spoken line into subtitle-sized chunks at sentence and clause ends. */
export function chunk(text: string, max = 84): string[] {
  if (text.length <= max) return [text];
  const parts = text.split(/(?<=[.!?।॥,;:])\s+/); const out: string[] = []; let cur = "";
  for (const p of parts) {
    if (cur && (cur + " " + p).length > max) { out.push(cur); cur = p; } else cur = cur ? cur + " " + p : p;
    while (cur.length > max) { const cut = cur.lastIndexOf(" ", max); if (cut <= 0) break; out.push(cur.slice(0, cut)); cur = cur.slice(cut + 1); }
  }
  if (cur) out.push(cur); return out;
}
/** Split `text` into `n` pieces by words, in proportion to `weights` (used to pair an English gloss with spoken chunks). */
export function splitLike(text: string, weights: number[]): string[] {
  if (weights.length <= 1) return [text];
  const words = text.split(/\s+/), total = weights.reduce((a, b) => a + b, 0); const out: string[] = []; let i = 0, acc = 0;
  weights.forEach((w, k) => { acc += w; const end = k === weights.length - 1 ? words.length : Math.round((acc / total) * words.length); out.push(words.slice(i, end).join(" ")); i = end; });
  return out;
}

/* ── Sound placement ───────────────────────────────────────────────── */
export type Cue = { frame: number; file: string; volume: number; trim?: number; frames?: number };
/** Typing ticks across a burst of keys: never closer than `gap` seconds, each a random one of six, at a random quiet level. */
export function typingCues(seg: ScreenSegment, log: TakeLog, spans: PlacedSpan[], seed: string, fps = FPS, gap = 0.1): Cue[] {
  const out: Cue[] = []; let lastFrame = -1e9;
  log.keys.forEach((k, ki) => {
    const n = "chars" in k ? k.chars : 1;
    for (let i = 0; i < n; i++) {
      const r = (s: string) => random(`${seed}-${ki}-${i}-${s}`);
      const t = "chars" in k ? k.t + ((i + 0.2 + 0.6 * r("t")) / n) * (k.end - k.t) : k.t;
      const f = takeToFrame(spans, t, fps); if (f === null) continue;
      if (f - lastFrame < gap * fps) continue;
      lastFrame = f;
      out.push({ frame: Math.round(f), file: `sfx/key-${1 + Math.floor(r("v") * 6)}.wav`, volume: "chars" in k ? 0.22 + 0.2 * r("g") : 0.5 });
    }
  });
  return out;
}
