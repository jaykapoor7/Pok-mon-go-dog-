import { FOLK_CUTOUTS, WORKS, type CutoutKey } from "@/lib/art/sources";

/* A public-domain Indian painting set into a page's opening: the site's creative voice comes from real artists' work, never
   from generated ornament. */
export function FolkHero({ art, className = "" }: { art: CutoutKey; className?: string }) {
  const a = FOLK_CUTOUTS[art], w = WORKS[a.work];
  return (
    <figure className={`co-folk ${className}`} style={{ ["--ratio" as string]: a.ratio }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a.src} alt="" loading="eager" decoding="async" />
      <figcaption className="sr-only">Artwork: {w.title}</figcaption>
    </figure>
  );
}
