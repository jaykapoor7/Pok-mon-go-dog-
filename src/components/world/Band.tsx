/* ════════════════════════════════════════════════════════════════════
   The banner every company page opens on: a real Indian painted textile
   from a museum's open-access collection, shown as the work it is and
   credited. Each page keeps its own: chintz palampores and a quilt from
   the Coromandel Coast, 17th and 18th century (The Met, CC0).
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { WORK_IMAGES, creditLine, type WorkImageKey } from "@/lib/art/sources";

const BY_SEED: WorkImageKey[] = ["palamporeTree", "palamporeTree", "palamporeQuilt", "coromandelQuilt", "palamporeHanging", "palamporeBlossom"];

export function Band({ seed = 1, className = "" }: { seed?: number; className?: string }) {
  const key = BY_SEED[seed % BY_SEED.length], im = WORK_IMAGES[key];
  return (
    <figure className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={im.src} width={im.w} height={im.h} alt="" fetchPriority="high" decoding="async" />
      <figcaption><Link href="/art-credits">{creditLine(key)}</Link></figcaption>
    </figure>
  );
}
