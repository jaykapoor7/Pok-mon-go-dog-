/* ════════════════════════════════════════════════════════════════════
   Redaction.

   The first version of this drew a Gaussian blur over a circle, which is
   what "blur the faces" sounds like it should mean and is the wrong tool.
   A Gaussian blur is a convolution: the original detail is still in there,
   spread out, and deconvolution puts a recognisable amount of it back if
   you know or can estimate the radius. Newspapers have been embarrassed by
   exactly this, and so have people who swirled a face and thought that was
   that.

   So the pixels are thrown away instead of smeared. Each region is
   redrawn from a copy of itself a handful of pixels across: the browser's
   own downscale averages every source pixel into one of those cells, and
   nothing outside those few averages survives to be recovered. The blur
   afterwards is applied to the mosaic, never to the photograph, so it is
   cosmetic — it softens the blocks without putting anything back.

   Two shapes, because two things need hiding. An ellipse covers a head.
   A rectangle covers the things a face detector will never find: a number
   plate, a shop board with a phone number on it, a child seen from
   behind, a doorway somebody lives in.
   ════════════════════════════════════════════════════════════════════ */

export type RegionShape = "ellipse" | "rect";

/**
 * An area to destroy, in source-image coordinates.
 *
 * Centre is normalised per axis so it survives a crop; the radii are both
 * normalised to the image WIDTH so a circle stays a circle whatever the
 * aspect ratio is.
 */
export type Region = {
  id: string;
  shape: RegionShape;
  x: number;
  y: number;
  rx: number;
  ry: number;
  /** Where it came from, so the UI can say what it found on its own. */
  origin: "auto" | "manual";
};

/* Smaller is safer and uglier. Eight cells across a head leaves a shape and
   a skin tone and no features, which is the point: somebody should be able
   to see that a person was there without being able to say who. */
const CELLS_ACROSS = 8;
const MIN_CELL_PX = 1;

/** The region's box in destination pixels. */
export function regionBox(
  r: Region,
  srcW: number,
  srcH: number,
  crop: { x: number; y: number; w: number; h: number },
  outW: number,
  outH: number
) {
  const scaleX = outW / crop.w;
  const scaleY = outH / crop.h;
  const cx = (r.x * srcW - crop.x) * scaleX;
  const cy = (r.y * srcH - crop.y) * scaleY;
  const rx = r.rx * srcW * scaleX;
  const ry = r.ry * srcW * scaleY;
  return { cx, cy, rx, ry, left: cx - rx, top: cy - ry, w: rx * 2, h: ry * 2 };
}

function clipTo(ctx: CanvasRenderingContext2D, shape: RegionShape, b: ReturnType<typeof regionBox>) {
  ctx.beginPath();
  if (shape === "rect") {
    const radius = Math.min(6, b.w / 4, b.h / 4);
    if (typeof ctx.roundRect === "function") ctx.roundRect(b.left, b.top, b.w, b.h, radius);
    else ctx.rect(b.left, b.top, b.w, b.h);
  } else {
    ctx.ellipse(b.cx, b.cy, b.rx, b.ry, 0, 0, Math.PI * 2);
  }
  ctx.closePath();
  ctx.clip();
}

/**
 * Destroy one region, in place, on a canvas that already holds the crop.
 *
 * `img` and the crop rectangle are needed because the mosaic is built from
 * the original pixels at their own resolution rather than from whatever is
 * already on the destination canvas, which may be a quarter the size.
 */
export function redactRegion(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  srcW: number,
  srcH: number,
  crop: { x: number; y: number; w: number; h: number },
  outW: number,
  outH: number,
  region: Region
) {
  const b = regionBox(region, srcW, srcH, crop, outW, outH);
  if (b.w <= 0 || b.h <= 0) return;
  if (b.left > outW || b.top > outH || b.left + b.w < 0 || b.top + b.h < 0) return;

  /* The same box back in the source image, which is where the pixels are. */
  const sx = crop.x + (b.left / outW) * crop.w;
  const sy = crop.y + (b.top / outH) * crop.h;
  const sw = (b.w / outW) * crop.w;
  const sh = (b.h / outH) * crop.h;

  const cellsX = Math.max(2, Math.min(CELLS_ACROSS, Math.round(b.w / MIN_CELL_PX)));
  const cellsY = Math.max(2, Math.round(cellsX * (b.h / Math.max(1, b.w))));

  const tiny = document.createElement("canvas");
  tiny.width = cellsX;
  tiny.height = cellsY;
  const tctx = tiny.getContext("2d");
  if (!tctx) return;
  /* Smoothing on: each destination cell becomes an average of the source
     pixels under it rather than a single sampled one, so a face cannot
     survive as one lucky pixel. */
  tctx.imageSmoothingEnabled = true;
  tctx.imageSmoothingQuality = "high";
  try {
    tctx.drawImage(img, sx, sy, sw, sh, 0, 0, cellsX, cellsY);
  } catch {
    return;
  }

  ctx.save();
  clipTo(ctx, region.shape, b);
  /* Fill first. If the mosaic has any transparency at the edges, what shows
     through must not be the photograph. */
  ctx.fillStyle = "#6b6f76";
  ctx.fillRect(b.left, b.top, b.w, b.h);
  /* The blur is on the mosaic. Every pixel it has to work with is already
     an average of hundreds, so this softens blocks and restores nothing. */
  const soften = Math.max(2, Math.min(b.w, b.h) / 14);
  if (supportsFilter(ctx)) ctx.filter = `blur(${soften}px)`;
  ctx.imageSmoothingEnabled = true;
  /* Drawn slightly proud of the box so the blur does not pull the grey fill
     in from the edges as a dark rim. */
  const bleed = soften;
  ctx.drawImage(tiny, b.left - bleed, b.top - bleed, b.w + bleed * 2, b.h + bleed * 2);
  ctx.filter = "none";
  ctx.restore();
}

let filterOk: boolean | null = null;
function supportsFilter(ctx: CanvasRenderingContext2D) {
  if (filterOk !== null) return filterOk;
  if (!("filter" in ctx)) return (filterOk = false);
  ctx.filter = "blur(2px)";
  filterOk = ctx.filter !== "none";
  ctx.filter = "none";
  return filterOk;
}

/** Is this point inside the region? Source-normalised coordinates. */
export function hitRegion(r: Region, p: { x: number; y: number }, aspect: number) {
  /* ry is normalised to width, so the vertical distance is converted into
     the same units before it is compared. */
  const dx = (p.x - r.x) / r.rx;
  const dy = ((p.y - r.y) / aspect) / r.ry;
  return r.shape === "rect"
    ? Math.abs(dx) <= 1 && Math.abs(dy) <= 1
    : dx * dx + dy * dy <= 1;
}
