"use client";

/* A register photograph with its dog in the middle of the box.

   Each framed photo records the box the whole dog occupies in its own
   picture. Once the picture and the card or tile it sits in are measured,
   the picture is scaled until the dog fills most of the box (never less
   than covering it, never more than a modest zoom so a phone photo stays
   sharp) and moved so the dog's centre lands on the box's centre, as far
   as it can go without showing an edge; a dog too tall to fit keeps its
   head in frame. Until then, and for photos with
   no frame, it is a plain centred cover crop. */

import { useEffect, useRef } from "react";
import { REGISTER_FRAMES } from "@/lib/landing/frames";

/** How much of the box the dog should fill along its tighter side. */
const FILL = 0.88;
/** The furthest in a photo is taken beyond a plain cover crop. */
const MAX_ZOOM = 2.4;

export function FramedPhoto({ src, alt, sid, lazy = false }: {
  src: string; alt: string; sid: string | null | undefined; lazy?: boolean;
}) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    const box = img?.parentElement;
    if (!img || !box) return;
    img.removeAttribute("style");
    const frame = sid ? REGISTER_FRAMES[sid] : undefined;
    if (!frame) return;
    const [l, t, r, b] = frame.map((v) => v / 100);
    const place = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      const W = box.clientWidth, H = box.clientHeight;
      if (!w || !h || !W || !H) return;
      const cover = Math.max(W / w, H / h);
      const fit = Math.min((W * FILL) / ((r - l) * w), (H * FILL) / ((b - t) * h));
      const s = Math.min(cover * MAX_ZOOM, Math.max(cover, fit));
      const rw = w * s, rh = h * s;
      const left = Math.min(0, Math.max(W - rw, W / 2 - ((l + r) / 2) * rw));
      /* A dog too tall for the box keeps its head: aim above its middle. */
      const focusY = s > fit + 1e-6 ? t + (b - t) * 0.36 : (t + b) / 2;
      const top = Math.min(0, Math.max(H - rh, H / 2 - focusY * rh));
      Object.assign(img.style, {
        position: "absolute", maxWidth: "none", objectFit: "fill",
        width: `${rw}px`, height: `${rh}px`, left: `${left}px`, top: `${top}px`,
      });
    };
    if (img.complete) place();
    img.addEventListener("load", place);
    const ro = new ResizeObserver(place);
    ro.observe(box);
    return () => { img.removeEventListener("load", place); ro.disconnect(); };
  }, [src, sid]);

  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src} alt={alt} loading={lazy ? "lazy" : undefined} decoding="async" />;
}
