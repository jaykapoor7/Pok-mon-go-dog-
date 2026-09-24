import { sized } from "@/lib/photo/src";
// ─────────────────────────────────────────────────────────────
// Dog photographs as map icons.
//
// The map used to show each animal as a React <Marker>: a DOM node holding
// an <img>, which MapLibre repositioned on every frame of a pan. That is
// what made scrolling feel like dragging something heavy, and it is why the
// markers were replaced with plain GL circles.
//
// Circles scroll beautifully and tell you nothing. A street dog map whose
// pins are dots is a map of incidents; the photograph is what makes it a
// map of animals, and recognising a dog you have seen before is the whole
// premise of the product.
//
// So the photographs come back, but as GL icons rather than DOM. Each one is
// drawn once into a canvas — circular crop, status-coloured ring, the same
// treatment the old PhotoMarker had — and handed to MapLibre as an image.
// From then on it is a texture in the same buffer as everything else and
// costs nothing per frame. React does not participate in panning at all.
//
// Two things make this cheap:
//
//   - Icons are built on demand, from MapLibre's own `styleimagemissing`
//     event, so only animals actually about to be drawn are ever fetched.
//     No viewport tracking, no re-render mid-gesture.
//   - The ring is drawn immediately and the photograph replaces it when it
//     arrives, so a marker never waits on the network to appear.
// ─────────────────────────────────────────────────────────────

/** Prefix that makes a dog id recognisable as ours in styleimagemissing. */
export const ICON_PREFIX = "dog:";

export const iconIdFor = (dogId: string) => `${ICON_PREFIX}${dogId}`;
export const dogIdFromIcon = (iconId: string) =>
  iconId.startsWith(ICON_PREFIX) ? iconId.slice(ICON_PREFIX.length) : null;

/* Drawn at 2x and handed over with pixelRatio 2, so it stays sharp on a
   phone without doubling the size of every icon on a desktop. */
const RATIO = 2;
const BOX = 56; // css px, the whole square including room for the shadow
const RING_R = 25; // css px, outer coloured disc
const WHITE_R = 22;
const PHOTO_R = 19.5;
/* An animal waiting on a decision gets a thicker band of its own colour
   rather than a marking inside the band. The first attempt drew a white
   stroke just inside the ring, which ate most of a 3px band and left the
   most urgent marker on the map reading as the palest one. */
const URGENT_WHITE_R = 19.5;
const URGENT_PHOTO_R = 17;

type Ctx = CanvasRenderingContext2D;

/* Radii depend on whether the marker is shouting. */
const inner = (urgent: boolean) =>
  urgent
    ? { white: URGENT_WHITE_R, photo: URGENT_PHOTO_R }
    : { white: WHITE_R, photo: PHOTO_R };

function circle(ctx: Ctx, r: number) {
  ctx.beginPath();
  ctx.arc(BOX / 2, BOX / 2, r, 0, Math.PI * 2);
  ctx.closePath();
}

function newCanvas(): { canvas: HTMLCanvasElement; ctx: Ctx } | null {
  const canvas = document.createElement("canvas");
  canvas.width = BOX * RATIO;
  canvas.height = BOX * RATIO;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(RATIO, RATIO);
  return { canvas, ctx };
}

/** The ring, the white collar, and whatever sits inside it. */
function drawFrame(ctx: Ctx, color: string, urgent: boolean) {
  ctx.save();
  ctx.shadowColor = "rgba(17,17,19,0.45)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = color;
  circle(ctx, RING_R);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#ffffff";
  circle(ctx, inner(urgent).white);
  ctx.fill();
}

/* An animal with no photograph: a navy disc and a plain line drawing of a
   dog, the same mark the map's street-level portraits use. No gradients,
   no seeded colours — every such animal looks the same, because the
   difference between them is not something we have recorded. */
const DOG_PATHS = [
  "M11.25 16.25h1.5L12 17z", "M16 14v.5", "M8 14v.5",
  "M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309",
  "M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5-1.931.722-3.576-.297-3.656-1-.113-.994 1.177-6.53 4-7 1.923-.321 3.651.845 3.651 2.235A7.497 7.497 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5",
];

function drawPawFallback(ctx: Ctx, _seed: string, r: number) {
  ctx.fillStyle = "#0b1e3d";
  circle(ctx, r);
  ctx.fill();
  const s = (r * 1.25) / 24;
  ctx.save();
  ctx.translate(BOX / 2 - 12 * s, BOX / 2 - 12.5 * s);
  ctx.scale(s, s);
  ctx.strokeStyle = "#efe7da";
  ctx.lineWidth = 1.7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of DOG_PATHS) ctx.stroke(new Path2D(d));
  ctx.restore();
}

/**
 * Cover-fit the photograph into the circular hole.
 *
 * Centred horizontally, but biased UPWARD on a tall photograph. Someone
 * standing over a dog and pointing a phone at it puts the animal in the
 * upper half of a 9:16 frame and a lot of ground underneath; a centre crop
 * of that is a circle of pavement. Every one of these markers is supposed
 * to be a face you might recognise, so the crop looks where the subject
 * actually is. Square and landscape frames stay centred — the bias only
 * applies where the aspect ratio implies the tilt.
 */
function drawPhoto(ctx: Ctx, img: CanvasImageSource, w: number, h: number, r: number) {
  ctx.save();
  circle(ctx, r);
  ctx.clip();
  const d = r * 2;
  const scale = Math.max(d / w, d / h);
  const dw = w * scale;
  const dh = h * scale;
  /* 0.5 is the middle of the photograph; 0.38 is a little above it. Ramped
     in by how tall the frame is, so a 4:3 snap barely moves and a 9:16 one
     gets the full shift. */
  const tallness = Math.min(Math.max(h / w - 1, 0), 0.8) / 0.8;
  const focusY = 0.5 - 0.12 * tallness;
  ctx.drawImage(img, BOX / 2 - dw / 2, BOX / 2 - dh * focusY, dw, dh);
  ctx.restore();
}

export type DogIconSpec = {
  photo: string | null;
  color: string;
  urgent: boolean;
  /** Stable seed for the fallback gradient, normally the animal's id. */
  seed: string;
};

type Rendered = { width: number; height: number; data: Uint8ClampedArray };

/* Rasterising a marker means drawing a 112x112 canvas and reading every
   pixel back with getImageData, which is a synchronous main-thread stall.
   Profiling a phone-width scroll of the landing page put toImageData at the
   top of the flame graph by a factor of six over everything else — because
   the page carries three separate MapLibre instances and each one rebuilt
   the same 24 photographs from scratch. The pixels are a pure function of
   this key, so the second and third map can have the first one's work.

   Bounded, because a long session panning a dense city would otherwise hold
   every animal ever drawn: 50KB per entry, so 240 entries is about 12MB and
   the oldest goes first. */
const CACHE = new Map<string, Rendered>();
const CACHE_MAX = 240;

/* Caching the finished pixels is not enough on its own. Three maps mount at
   roughly the same moment and all three ask for the same animal before any
   of them has finished, so every one of them missed a cache that was still
   empty and did the work anyway. Holding the in-flight promise is what
   actually collapses the three into one. */
const PENDING = new Map<string, Promise<Rendered | null>>();

const cacheKey = (spec: DogIconSpec, kind: "photo" | "paw") =>
  `${kind}|${spec.color}|${spec.urgent ? 1 : 0}|${kind === "photo" ? spec.photo : spec.seed}`;

function remember(key: string, value: Rendered | null): Rendered | null {
  if (!value) return null;
  if (CACHE.size >= CACHE_MAX) {
    const oldest = CACHE.keys().next().value;
    if (oldest !== undefined) CACHE.delete(oldest);
  }
  CACHE.set(key, value);
  return value;
}

function toImageData(canvas: HTMLCanvasElement, ctx: Ctx): Rendered | null {
  try {
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { width: d.width, height: d.height, data: d.data };
  } catch {
    /* A photograph served without CORS headers taints the canvas and
       getImageData throws. Nothing to do but fall back to the paw. */
    return null;
  }
}

/** The marker as it looks before, or without, a photograph. */
export function renderFallbackIcon(spec: DogIconSpec): Rendered | null {
  const key = cacheKey(spec, "paw");
  const hit = CACHE.get(key);
  if (hit) return hit;
  const made = newCanvas();
  if (!made) return null;
  drawFrame(made.ctx, spec.color, spec.urgent);
  drawPawFallback(made.ctx, spec.seed, inner(spec.urgent).photo);
  return remember(key, toImageData(made.canvas, made.ctx));
}

/**
 * The marker with the animal's photograph in it. Resolves to null when there
 * is no photograph, it fails to load, or the browser refuses to let us read
 * the pixels back — every one of which is a reason to keep the fallback.
 */
export async function renderPhotoIcon(spec: DogIconSpec): Promise<Rendered | null> {
  if (!spec.photo) return null;
  const key = cacheKey(spec, "photo");
  const hit = CACHE.get(key);
  if (hit) return hit;
  const inFlight = PENDING.get(key);
  if (inFlight) return inFlight;

  const work = (async () => {
    /* The marker is a 56px square. Asking for the original meant pulling a
       whole camera file per pin to paint a thumbnail; see lib/photo/src. */
    const img = await loadImage(sized(spec.photo!, BOX));
    if (!img) return null;
    const made = newCanvas();
    if (!made) return null;
    drawFrame(made.ctx, spec.color, spec.urgent);
    drawPhoto(made.ctx, img, img.naturalWidth, img.naturalHeight, inner(spec.urgent).photo);
    return remember(key, toImageData(made.canvas, made.ctx));
  })().finally(() => PENDING.delete(key));

  PENDING.set(key, work);
  return work;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    /* Required before the canvas can be read back. Supabase storage and the
       other hosts in use send Access-Control-Allow-Origin, and anything that
       does not simply keeps its fallback. */
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Icon width in css pixels, for sizing the layer's icon-size ramp. */
export const ICON_BOX = BOX;

/** Radius of the outer coloured ring, in css pixels at icon-size 1. Layers
    that have to line up with the edge of a marker measure from this. */
export const ICON_RING = RING_R;
