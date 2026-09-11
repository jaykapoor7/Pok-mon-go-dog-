/* ════════════════════════════════════════════════════════════════════
   Finding the people in a photograph.

   Three layers, in the order they can answer.

   1. The browser's own FaceDetector, where it exists. Free, instant, and
      present on roughly one of the browsers our reporters use.
   2. A real detector, downloaded the first time somebody edits a photo.
      Tiny Face Detector: a small YOLO trained on WIDER FACE, which is a
      dataset of exactly the situation we care about — many faces, most of
      them small, in a busy street scene. About half a megabyte of model
      and runtime, cached by the browser afterwards, and it never runs
      unless somebody is actually on the photo step.
   3. The reporter, who can see what the other two missed.

   All three are needed and none of them is optional. A detector finds
   faces, and a person photographed from behind has no face and is still
   somebody's neighbour. That is not a bug to be fixed with a better
   model; it is why the manual tools are the part that has to be good.

   Everything here runs in the browser. The photograph does not leave the
   phone to be scanned, which would give away the thing we are trying to
   protect in order to protect it.
   ════════════════════════════════════════════════════════════════════ */

import type { Region } from "./redact";

/** Where the weights are served from, alongside the app. */
const MODEL_URL = "/models/face";

/* A reporter should never be held at the photo step by a download. Past
   this the scan gives up and says so, and the manual tools carry it. */
const LOAD_TIMEOUT_MS = 15_000;

/* Detection runs on a copy this big at most. Tiny Face Detector resizes to
   its own input size anyway, and a 12 megapixel phone photograph costs real
   time to upload to the GPU for no extra recall. */
const WORK_MAX = 1280;

/* This detector is far more sensitive to scale than its accuracy figures
   suggest, and not in one direction. Measured on two ordinary street
   photographs: a close portrait was found at 320 and 416 and missed
   completely at 608 and 800, while a mother and child down the road were
   missed at 320 and 416 and found at 608. One pass at any single size
   would have shipped a privacy feature that works on half of photographs,
   so it runs a ladder and merges the results.

   Two rungs by default, because each one costs real time on a phone. The
   full ladder is there for anybody who wants to be sure, and it needs no
   further download: the same 190KB of weights, looked at harder. */
const QUICK_SIZES = [416, 608];
const CAREFUL_SIZES = [320, 416, 512, 608, 800];

/* Low, deliberately. A false positive costs a smudge on a wall. A false
   negative costs somebody their face on a public map. */
const SCORE_THRESHOLD = 0.2;

/* A face box is a face. Hair, ears and jaw are what make somebody
   recognisable at a glance, so the redaction is drawn round the head. */
const HEAD_SCALE = 1.55;

export type DetectStage = "native" | "model" | "careful" | "unavailable";

export type DetectReport = {
  regions: Region[];
  /** Which layers actually ran, for copy that does not overclaim. */
  ran: DetectStage[];
};

let modelPromise: Promise<FaceApi | null> | null = null;

function timeout<T>(ms: number): Promise<T> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("timed out")), ms)
  );
}

type Box = { x: number; y: number; width: number; height: number };
type Tf = {
  setBackend: (name: string) => Promise<boolean>;
  ready: () => Promise<void>;
  getBackend: () => string;
};
type FaceApi = {
  tf: Tf;
  nets: { tinyFaceDetector: { loadFromUri: (u: string) => Promise<void> } };
  TinyFaceDetectorOptions: new (o: { inputSize: number; scoreThreshold: number }) => object;
  detectAllFaces: (
    input: HTMLCanvasElement,
    options: object
  ) => Promise<{ box: Box; score: number }[]> & { run?: unknown };
};

/**
 * The model, loaded once per page and shared.
 *
 * Failure is normal and not an error worth showing: an old browser with no
 * WebGL, a network that dropped, a corporate proxy that blocks the weights.
 * Every one of those ends with the reporter marking faces by hand, which is
 * a worse experience and not a broken one.
 */
async function loadModel(): Promise<FaceApi | null> {
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        const api = (await Promise.race([
          import("@vladmandic/face-api"),
          timeout<never>(LOAD_TIMEOUT_MS),
        ])) as unknown as FaceApi;
        if (!(await pickBackend(api.tf))) return null;
        await Promise.race([
          api.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          timeout<void>(LOAD_TIMEOUT_MS),
        ]);
        return api;
      } catch (e) {
        if (process.env.NODE_ENV !== "production") console.error("[detect] model load failed", e);
        return null;
      }
    })();
  }
  return modelPromise;
}

/**
 * Choose something that can actually run the arithmetic.
 *
 * Left to itself the library takes the highest-priority backend it can see,
 * which is WebAssembly, and then asks for .wasm binaries that are not part
 * of this bundle: the console fills with 404s and the load fails even
 * though a perfectly good WebGL context was available. So the order is
 * stated here rather than inherited.
 *
 * WebGL first, because on a phone it is the difference between a fifth of a
 * second and several. CPU second, because a browser with WebGL turned off
 * or blocked, which is a real configuration on cheap Android builds and in
 * some privacy browsers, should still get its faces found. It is slow and
 * it is correct, and slow beats a privacy tool that quietly did nothing.
 */
async function pickBackend(tf: Tf): Promise<boolean> {
  for (const name of ["webgl", "cpu"]) {
    try {
      if (await tf.setBackend(name)) {
        await tf.ready();
        return true;
      }
    } catch {
      /* Try the next one. */
    }
  }
  return false;
}

/** Start fetching the weights before anybody asks for them. */
export function warmDetector() {
  void loadModel();
}

/** A working copy no larger than WORK_MAX on its long side. */
function workCanvas(img: CanvasImageSource, w: number, h: number) {
  const scale = Math.min(1, WORK_MAX / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** A detected face box, as an ellipse over the whole head. */
function toRegion(b: Box, w: number, h: number, index: number): Region {
  const cx = (b.x + b.width / 2) / w;
  /* Up a little. A face box stops at the hairline and the top of a head is
     most of what somebody is recognised by from across a road. */
  const cy = (b.y + b.height * 0.44) / h;
  const rx = ((b.width * HEAD_SCALE) / 2) / w;
  const ry = ((b.height * HEAD_SCALE) / 2) / w;
  return { id: `auto-${index}`, shape: "ellipse", x: cx, y: cy, rx, ry, origin: "auto" };
}

/**
 * Are these two the same head seen twice, rather than two people?
 *
 * The first version compared centres against the LARGER of the two radii,
 * and since each radius is already a head rather than a face, a child held
 * against an adult merged into one detection and only one of them got
 * covered. Distinct faces sit about a face-width apart; the same face found
 * at two scales sits almost exactly on top of itself. The threshold belongs
 * well below one radius.
 */
function overlaps(a: Region, b: Region, aspect: number) {
  const dx = a.x - b.x;
  const dy = (a.y - b.y) / aspect;
  const reach = 0.7 * Math.min(a.rx, b.rx);
  return Math.hypot(dx, dy) < reach;
}

function merge(into: Region[], found: Region[], aspect: number) {
  for (const r of found) {
    const near = into.find((k) => overlaps(k, r, aspect));
    if (!near) {
      into.push({ ...r, id: `auto-${into.length}` });
      continue;
    }
    /* Two passes found the same head at different sizes. Keep the larger
       circle: over-covering a face costs a little of the photograph, and
       under-covering it costs somebody their privacy. */
    if (r.rx > near.rx) {
      near.rx = r.rx;
      near.ry = r.ry;
    }
  }
}

/** The browser's own detector. Absent on most, instant where present. */
async function nativeFaces(img: CanvasImageSource, w: number, h: number): Promise<Region[] | null> {
  const Ctor = (
    globalThis as unknown as {
      FaceDetector?: new (o?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
        detect: (s: CanvasImageSource) => Promise<{ boundingBox: Box }[]>;
      };
    }
  ).FaceDetector;
  if (!Ctor) return null;
  try {
    const found = await new Ctor({ fastMode: false, maxDetectedFaces: 20 }).detect(img);
    return found.map((f, i) => toRegion(f.boundingBox, w, h, i));
  } catch {
    return null;
  }
}

/**
 * Everything the machine can find, in source-normalised coordinates.
 *
 * `onProgress` fires once per layer so the editor can show the first
 * results while the model is still downloading rather than holding an
 * empty frame for a second and a half on a slow connection.
 */
export async function detectPeople(
  img: CanvasImageSource,
  w: number,
  h: number,
  onProgress?: (report: DetectReport) => void
): Promise<DetectReport> {
  const aspect = w / h;
  const regions: Region[] = [];
  const ran: DetectStage[] = [];

  const native = await nativeFaces(img, w, h);
  if (native) {
    ran.push("native");
    merge(regions, native, aspect);
    onProgress?.({ regions: [...regions], ran: [...ran] });
  }

  const api = await loadModel();
  if (!api) {
    if (ran.length === 0) ran.push("unavailable");
    return { regions, ran };
  }

  const canvas = workCanvas(img, w, h);
  if (!canvas) return { regions, ran };

  await ladder(api, canvas, regions, aspect, QUICK_SIZES, false);
  if (!ran.includes("model")) ran.push("model");
  onProgress?.({ regions: [...regions], ran: [...ran] });
  return { regions, ran };
}

/**
 * The same weights, run over every rung and over a mirrored copy.
 *
 * Slower by about a factor of three, finds faces the quick pass does not,
 * and downloads nothing: this is what "look again" does. The mirrored pass
 * is not superstition — a detector trained on a finite set is not
 * left-right symmetric, and a face in profile one way is sometimes found
 * only the other way round.
 */
export async function detectCarefully(
  img: CanvasImageSource,
  w: number,
  h: number,
  existing: Region[]
): Promise<DetectReport> {
  const api = await loadModel();
  if (!api) return { regions: existing, ran: ["unavailable"] };
  const canvas = workCanvas(img, w, h);
  if (!canvas) return { regions: existing, ran: ["unavailable"] };

  const aspect = w / h;
  const regions = existing.map((r) => ({ ...r }));
  await ladder(api, canvas, regions, aspect, CAREFUL_SIZES, false);
  await ladder(api, canvas, regions, aspect, [512, 800], true);
  return { regions, ran: ["model", "careful"] };
}

async function ladder(
  api: FaceApi,
  canvas: HTMLCanvasElement,
  regions: Region[],
  aspect: number,
  sizes: number[],
  mirrored: boolean
) {
  const input = mirrored ? mirror(canvas) : canvas;
  if (!input) return;
  for (const inputSize of sizes) {
    try {
      const options = new api.TinyFaceDetectorOptions({
        inputSize,
        scoreThreshold: SCORE_THRESHOLD,
      });
      const found = await api.detectAllFaces(input, options);
      const mapped = found.map((f, i) => {
        const r = toRegion(f.box, input.width, input.height, i);
        return mirrored ? { ...r, x: 1 - r.x } : r;
      });
      merge(regions, mapped, aspect);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.error("[detect] pass failed", inputSize, e);
      /* One rung failing is not a reason to lose the others. */
    }
  }
}

function mirror(src: HTMLCanvasElement) {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return out;
}
