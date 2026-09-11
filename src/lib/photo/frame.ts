/* ════════════════════════════════════════════════════════════════════
   Getting the animal into the frame, and people out of it.

   Two problems with a photograph taken on a street.

   The first is where the animal is in it. Somebody standing over a dog
   with a phone puts the animal in the upper half of a tall frame with a
   lot of pavement underneath, and a centre crop of that is a picture of
   pavement. The map, the cards and the record all crop to a rectangle,
   so the crop has to look where the subject actually is.

   `focusPoint` is a contrast measure rather than a model: cheap, runs on
   any phone, needs no download, and is right often enough to be a better
   starting position than the middle. It is a starting position. The
   reporter can drag it, which is the part that is actually reliable.

   The second problem is who else is in the photograph, and that lives in
   detect.ts and redact.ts. This file only knows that regions exist and
   have to be destroyed before the file is written.
   ════════════════════════════════════════════════════════════════════ */

import { redactRegion, type Region } from "./redact";

/** A point in the source image, 0..1 on each axis. */
export type Focus = { x: number; y: number };

/** What the reporter has chosen: where the crop is centred and how tight. */
export type Frame = { focus: Focus; zoom: number };

export const OUTPUT_ASPECT = 4 / 3;
const MAX_OUTPUT_W = 1600;
const JPEG_QUALITY = 0.86;

/**
 * Where the interesting part of the picture is.
 *
 * The image is reduced to a thumbnail a few dozen pixels across, and each
 * pixel scored by how different it is from its neighbours. Sky, road and
 * wall score near zero; an animal against any of them scores high. The
 * result is the centre of mass of that score, pulled back toward the middle
 * so a single bright corner cannot drag the whole crop off the subject.
 */
export function focusPoint(img: CanvasImageSource, w: number, h: number): Focus {
  const S = 64;
  const sw = w >= h ? S : Math.max(8, Math.round((w / h) * S));
  const sh = h > w ? S : Math.max(8, Math.round((h / w) * S));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { x: 0.5, y: 0.5 };
  ctx.drawImage(img, 0, 0, sw, sh);

  let px: Uint8ClampedArray;
  try {
    px = ctx.getImageData(0, 0, sw, sh).data;
  } catch {
    /* A cross-origin image taints the canvas. Middle of the frame, then. */
    return { x: 0.5, y: 0.5 };
  }

  const lum = new Float32Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    lum[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
  }

  let total = 0;
  let mx = 0;
  let my = 0;
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const i = y * sw + x;
      const gx = Math.abs(lum[i + 1] - lum[i - 1]);
      const gy = Math.abs(lum[i + sw] - lum[i - sw]);
      /* Squared, so a strong edge counts for much more than a busy texture
         of weak ones: a dog's outline should beat a brick wall. */
      const e = (gx + gy) * (gx + gy);
      total += e;
      mx += e * (x + 0.5);
      my += e * (y + 0.5);
    }
  }
  if (total <= 0) return { x: 0.5, y: 0.5 };

  /* Two thirds of the way from the middle to the centre of mass. A photo
     with detail spread evenly should not be cropped at all, and this keeps
     the worst case close to what a centre crop would have done. */
  const cx = mx / total / sw;
  const cy = my / total / sh;
  return {
    x: clamp01(0.5 + (cx - 0.5) * 0.66),
    y: clamp01(0.5 + (cy - 0.5) * 0.66),
  };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * The source rectangle a frame selects, in source pixels.
 *
 * Zoom 1 takes the largest 4:3 rectangle the picture allows; above that it
 * closes in on the focus point. The rectangle is always pushed back inside
 * the image, so dragging to a corner crops the corner rather than leaving a
 * band of empty canvas.
 */
export function cropRect(w: number, h: number, frame: Frame) {
  const base = Math.min(w, h * OUTPUT_ASPECT);
  const cw = base / Math.max(1, frame.zoom);
  const ch = cw / OUTPUT_ASPECT;
  const x = Math.min(Math.max(frame.focus.x * w - cw / 2, 0), Math.max(0, w - cw));
  const y = Math.min(Math.max(frame.focus.y * h - ch / 2, 0), Math.max(0, h - ch));
  return { x, y, w: cw, h: ch };
}

/** The zoom at which the crop still fits inside the image. */
export function maxZoom(w: number, h: number) {
  const base = Math.min(w, h * OUTPUT_ASPECT);
  /* Never past the point where the crop is a quarter of the short side:
     beyond that the upload is mostly interpolation. */
  return Math.max(1, Math.min(4, base / 160));
}

/**
 * Draw the frame onto a canvas, with every region destroyed.
 *
 * The redaction is drawn into the picture rather than laid over it, so
 * what is uploaded has no face in it at all. A CSS-style overlay would
 * have been a blurred rectangle sitting on top of an intact photograph,
 * which is a photograph of somebody's face with a decoration on it.
 */
export function paint(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  w: number,
  h: number,
  frame: Frame,
  regions: Region[],
  out: { w: number; h: number }
) {
  const r = cropRect(w, h, frame);
  ctx.clearRect(0, 0, out.w, out.h);
  ctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, out.w, out.h);
  for (const region of regions) {
    redactRegion(ctx, img, w, h, r, out.w, out.h, region);
  }
}

/** The finished photograph, as a file ready to upload. */
export async function exportFrame(
  img: CanvasImageSource,
  w: number,
  h: number,
  frame: Frame,
  regions: Region[],
  name: string
): Promise<File | null> {
  const r = cropRect(w, h, frame);
  const outW = Math.round(Math.min(MAX_OUTPUT_W, r.w));
  const outH = Math.round(outW / OUTPUT_ASPECT);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  paint(ctx, img, w, h, frame, regions, { w: outW, h: outH });
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );
  if (!blob) return null;
  const base = name.replace(/\.[^.]+$/, "") || "sighting";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
