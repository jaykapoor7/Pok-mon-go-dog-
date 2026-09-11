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

/* Same palette and the same seeding as DogPhoto, so an animal with no
   photograph looks the same on the map as it does in a list rather than
   turning into a different creature between the two. */
const GRADIENTS: [string, string][] = [
  ["#5b86f0", "#2f4fc0"],
  ["#D9A441", "#3b63e0"],
  ["#3E8473", "#2842a0"],
  ["#C06A86", "#2f4fc0"],
  ["#5b86f0", "#1f3168"],
  ["#3b63e0", "#141821"],
];

/** DogPhoto's seededRandom, inlined so this file has no React dependency. */
function seeded(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function drawPawFallback(ctx: Ctx, seed: string, r: number) {
  const [from, to] = GRADIENTS[Math.floor(seeded(seed) * GRADIENTS.length)];
  const g = ctx.createLinearGradient(
    BOX / 2 - r, BOX / 2 - r,
    BOX / 2 + r, BOX / 2 + r
  );
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  ctx.fillStyle = g;
  circle(ctx, r);
  ctx.fill();

  /* A paw, plainly: four toes over a pad. Small enough that detail would be
     lost anyway, so it is built from ellipses rather than a traced path. */
  const cx = BOX / 2;
  const cy = BOX / 2;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  const toes: [number, number, number][] = [
    [cx - 6.2, cy - 3.4, 2.5],
    [cx - 2.1, cy - 6.0, 2.7],
    [cx + 2.1, cy - 6.0, 2.7],
    [cx + 6.2, cy - 3.4, 2.5],
  ];
  for (const [x, y, r] of toes) {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 1.25, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(cx, cy + 3.6, 6.4, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();
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
    const img = await loadImage(spec.photo!);
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
