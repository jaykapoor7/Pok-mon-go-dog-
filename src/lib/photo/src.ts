/* ════════════════════════════════════════════════════════════════════
   Ask for the size you are going to draw.

   Every photograph on this site was being downloaded at the size it was
   uploaded, whatever that was, and then drawn small. The map is the worst
   case: a marker is a 56px square, and it was fetching the original — a
   3 or 4 MB camera file once organisations start uploading — to paint it.
   Sixty markers in view is then a couple of hundred megabytes of transfer
   for a screen that shows sixty thumbnails.

   Supabase bills egress (5 GB a month on the free plan, 250 GB on Pro and
   $0.09 a gigabyte after that), so this is a real bill as well as a slow
   page on a phone.

   Next's image optimizer is already configured for the storage host in
   next.config.mjs, so asking it for a width is all this needs to be. It
   resizes once and caches; the browser gets a few kilobytes instead of a
   few megabytes. Anything it cannot handle — a data: URI, a relative
   path, an empty value — is returned untouched.
   ════════════════════════════════════════════════════════════════════ */

/** Widths Next will serve without extra config: the default imageSizes
    plus deviceSizes. Asking for one outside the list returns a 400, so a
    requested width is rounded UP to the nearest allowed one. */
const ALLOWED = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920];

function snap(width: number) {
  return ALLOWED.find((w) => w >= width) ?? ALLOWED[ALLOWED.length - 1];
}

/**
 * A URL for `src` at roughly `width` css pixels, doubled for retina.
 *
 * @param width  the size it will actually be drawn at, in css pixels.
 * @param quality  JPEG quality. 70 is invisible at thumbnail sizes.
 */
export function sized(src: string | null | undefined, width: number, quality = 70): string {
  if (!src) return "";
  const url = src.trim();
  if (!url) return "";
  /* Already small, already local, or not something the optimizer takes. */
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (!/^https?:\/\//i.test(url)) return url;
  /* Next rejects an optimizer request for a host that is not in its static
     allow-list. Public-source photographs have record-level hosts, so they
     load directly in the browser and retain DogPhoto's broken-image fallback;
     only the small set of storage hosts we control/explicitly configured are
     sent through the server-side optimizer. */
  try {
    const host = new URL(url).hostname.toLowerCase();
    const optimizable = host === "images.unsplash.com" || host === "plus.unsplash.com" || host.endsWith(".supabase.co");
    if (!optimizable) return url;
  } catch {
    return "";
  }
  return `/_next/image?url=${encodeURIComponent(url)}&w=${snap(width * 2)}&q=${quality}`;
}
