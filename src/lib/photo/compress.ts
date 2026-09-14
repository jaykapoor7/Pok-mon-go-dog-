/* ════════════════════════════════════════════════════════════════════
   Every photograph is compressed before it is stored.

   The public report flow already exported through PhotoStudio: cropped,
   redacted, 1600px wide, JPEG. Every OTHER upload — a case photo, a
   before-and-after proof, a fundraiser cover — went up as the camera
   produced it, which on a current phone is three to five megabytes.

   That is the path organisations use, so it is the path that decides the
   bill. A 4 MB original costs 4 MB of storage and 4 MB of transfer every
   time somebody who has not cached it opens the page. The same photograph
   at 1600px and quality 0.86 is around 350 KB and looks identical at any
   size this product draws it.

   HEIC is left alone: Safari can decode it to a canvas but most browsers
   cannot, and a failed decode must not lose somebody's photograph. The
   original is returned unchanged whenever anything goes wrong, so this can
   only ever make an upload smaller, never fail one.
   ════════════════════════════════════════════════════════════════════ */

const MAX_W = 1600;
const QUALITY = 0.86;
/** Below this, re-encoding costs more than it saves. */
const SKIP_UNDER = 400 * 1024;

export async function compressForUpload(file: File): Promise<File> {
  try {
    if (typeof document === "undefined") return file;
    if (!/^image\/(jpe?g|png|webp)$/i.test(file.type)) return file;
    if (file.size <= SKIP_UNDER) return file;

    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return file;

    const scale = Math.min(1, MAX_W / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    );
    /* Only take the new one if it is actually smaller. A small PNG of a
       screenshot can come out bigger as a JPEG. */
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
