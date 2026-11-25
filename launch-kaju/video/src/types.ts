import type { KajuState } from "./kaju/poses";

/* ════════════════════════════════════════════════════════════════════
   The edit schema. One film = one file in edits/ that default-exports an Edit.
   Every time inside a `screen` segment is in seconds ON THE TAKE'S CLOCK (the same clock as log.json), and every
   position is in CSS px of the recording, so an edit survives recuts, speed changes and both aspect ratios.
   ════════════════════════════════════════════════════════════════════ */

export type Box = { x: number; y: number; w: number; h: number };
export type Point = { x: number; y: number };
/** A place in the footage: a named mark from log.json (its box), a box, or a point. */
export type Anchor = { mark: string } | { box: Box } | Point;

/** How a segment arrives. Default "zoom" (cross-zoom, 10 frames). The first segment has no transition. */
export type Transition = "zoom" | "wipe" | "cut" | { kind: "zoom" | "wipe"; frames?: number };

export type CameraTarget = {
  /** 1 = the whole recording fills the window. Omit with `box`/`mark` to fit that region with comfortable padding. */
  zoom?: number;
  /** Centre of the view. */
  focus?: Point;
  /** Frame this region (centre on it; fit it when `zoom` is omitted). */
  box?: Box;
  /** Same as `box`, taken from the named mark in log.json. */
  mark?: string;
};
export type CameraKey = CameraTarget & {
  /** When the move toward this framing starts. */
  t: number;
  /** How long the move takes, seconds of film time. Default 0.9. */
  dur?: number;
  /** While zoomed in, drift to keep the pointer in view. Default true. */
  follow?: boolean;
  /** Vertical (9:16) override. Without it the vertical framing is derived: same centre, tighter crop. */
  v?: CameraTarget;
};

export type Callout = {
  from: number; to: number;
  /** Label text. Omit for a bare ring or spotlight. */
  text?: string;
  anchor: Anchor;
  /** Which side of the region the label sits on. Default "top". */
  side?: "top" | "bottom" | "left" | "right";
  /** "ring" (default): highlight ring, plus a label on a leader line when there is text. "spotlight": dim everything else by 35%. */
  variant?: "ring" | "spotlight";
  /** Breathing room around the region, CSS px. Default 6. */
  pad?: number;
  /** Play the callout pop. Default true. */
  sfx?: boolean;
};

/** Feature caption: one short line (it wraps at about 42 characters). */
export type Caption = { from: number; to: number; text: string; /** Reveal word by word. */ words?: boolean };

/** Conversation subtitle. Give `audio` (a file name from log.audio) and its timing, speaker and text come from the log; or give them by hand. */
export type Subtitle = {
  audio?: string;
  from?: number; to?: number;
  /** "you" and "kaju" get their labels; anything else is shown as written. Default: question → you, answer → kaju. */
  speaker?: "you" | "kaju" | string;
  /** The line as spoken (Devanagari, Kannada or Latin; the face is chosen per script). An array = explicit chunks, shown in turn. */
  text?: string | string[];
  /** Smaller English line underneath. An array pairs with the text chunks. */
  gloss?: string | string[];
};

export type Span = { from: number; to: number; /** Playback rate. Default 1. Voice is never sped up. */ speed?: number };

export type TitleSegment = {
  kind: "title";
  /** Seconds. */
  duration: number;
  /** The hook. "\n" breaks lines. */
  text: string;
  eyebrow?: string;
  variant?: "light" | "dark";
  /** Show Kaju beside the headline in this pose. */
  kaju?: KajuState;
  transition?: Transition;
};

export type ScreenSegment = {
  kind: "screen";
  /** Folder name under launch-kaju/takes/ (or sample-takes/). */
  take: string;
  /** The span of the take to show… */
  from?: number; to?: number; speed?: number;
  /** …or several spans played back to back inside the same window (jump cuts and speed ramps). */
  spans?: Span[];
  /** Label in the window's address pill. Falls back to edit.host. */
  host?: string;
  /** Vertical only: a short line above the window. Falls back to edit.title. */
  heading?: string;
  /** Keyframes, or "auto": zoom in around each burst of clicks and typing, out again when it goes quiet. */
  camera?: CameraKey[] | "auto";
  /** Zoom used by camera: "auto". Default 1.5. */
  autoZoom?: number;
  callouts?: Callout[];
  captions?: Caption[];
  /** "auto": every log.audio entry that has text. */
  subtitles?: Subtitle[] | "auto";
  /** Take times (or marks) at which an answer is complete: plays the chime. */
  chimes?: (number | { mark: string })[];
  /** Draw the pointer. Default true. */
  pointer?: boolean;
  transition?: Transition;
};

export type EndSegment = {
  kind: "end";
  duration: number;
  /** Large wordmark line. Default "Kaju". */
  wordmark?: string;
  /** One line of copy. */
  line: string;
  /** URL line, beside the StrayPaw mark. */
  url: string;
  variant?: "light" | "dark";
  transition?: Transition;
};

export type Segment = TitleSegment | ScreenSegment | EndSegment;

export type Mix = {
  /** Music level, linear. Default 0.5 (the stock beds peak at -3 dBFS). */
  music?: number;
  /** dB taken off the music during screen segments. Default 3. */
  screenDuck?: number;
  /** dB taken off the music under voice. Default 8. Not added to screenDuck: the larger applies. */
  voiceDuck?: number;
  /** Voice level, linear. Default 0.85. */
  voice?: number;
  /** Sound design level, linear. Default 1. */
  sfx?: number;
};

export type Thumb = CameraTarget & {
  take: string;
  /** Take time of the frame to use. */
  t: number;
  headline: string;
  eyebrow?: string;
  kaju?: KajuState;
  /** 4:5 override for the framing. */
  v?: CameraTarget;
};

export type Edit = {
  /** File-safe name: out/<slug>-16x9.mp4, composition ids <Slug>-16x9 and <Slug>-9x16. */
  slug: string;
  /** Shown above the window in vertical when a screen segment has no heading. */
  title?: string;
  /** Default address-pill label, e.g. "app.straypaw.org · staging data". */
  host?: string;
  /** Music bed. "auto" (default) picks the shortest stock bed that covers the film and lines its ending up with the last frame.
      { length } picks public/music/kaju-<length>s.wav (make_kaju_music.py writes any length). false = no music. */
  music?: "auto" | false | { length: number; file?: string };
  mix?: Mix;
  segments: Segment[];
  thumb?: Thumb;
};

/* ── log.json, as written by launch-kaju/record/recorder.cjs ───────── */
export type TakeLog = {
  width: number; height: number; scale: number; duration: number;
  pointer: (Point & { t: number })[];
  clicks: (Point & { t: number })[];
  keys: ({ t: number; end: number; chars: number } | { t: number; end: number; key: string })[];
  marks: { t: number; name: string; box?: Box }[];
  /** `duration` is filled in by scripts/prepare.mjs (ffprobe) when the recorder did not write it. */
  audio: { t: number; file: string; kind: "question" | "answer"; lang?: string; text?: string; duration?: number }[];
};

export type Aspect = "landscape" | "vertical";
export type FilmProps = { edit: Edit; aspect: Aspect; logs?: Record<string, TakeLog> };
