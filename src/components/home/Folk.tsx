/* A licensed Indian folk-art cutout (lib/art/sources), unfurling into place
   as it is reached and drifting a little against the scroll. Always
   credited; art never encodes data. */

import { FOLK_CUTOUTS, WORKS, type CutoutKey } from "@/lib/art/sources";

export function Folk({ k, className = "", w = 180, par = 0.06, flip = false }: { k: CutoutKey; className?: string; w?: number; par?: number; flip?: boolean }) {
  const c = FOLK_CUTOUTS[k];
  const work = WORKS[c.work];
  return (
    <figure className={`h-folk ${className}`} data-rv="unfurl" data-par={par} style={{ width: w }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.src} alt="" width={w} height={Math.round(w / c.ratio)} loading="lazy" decoding="async" style={flip ? { transform: "scaleX(-1)" } : undefined} />
      <figcaption>{work.title} · {work.maker} · {work.licence}{work.adapted ? ", adapted" : ""}</figcaption>
    </figure>
  );
}
