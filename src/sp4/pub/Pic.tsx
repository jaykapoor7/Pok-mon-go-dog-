"use client";

import { useEffect, useState } from "react";
import { SensitiveVeil } from "@/components/ui/SensitiveVeil";

/* An animal's photograph, honestly: the real photo with its alt text; one
   that may show an injury stays veiled until the viewer chooses to see it;
   with no photograph (or one that fails to load) the plate says so. Nothing
   stands in for the animal. */
export function Pic({ src, tag, sensitive = false, small = false, alt }: { src: string | null | undefined; tag: string; sensitive?: boolean; small?: boolean; alt?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) {
    return <div className={`pb-pic is-none${small ? " is-s" : ""}`} role="img" aria-label={`No photograph recorded for ${tag}`}>{small ? null : <span><b>No photograph recorded</b><span>{tag}</span></span>}</div>;
  }
  return (
    <div className={`pb-pic${small ? " is-s" : ""}`}>
      <SensitiveVeil sensitive={sensitive} id={src} compact={small}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? (small ? "" : `Photograph of ${tag}`)} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      </SensitiveVeil>
    </div>
  );
}
