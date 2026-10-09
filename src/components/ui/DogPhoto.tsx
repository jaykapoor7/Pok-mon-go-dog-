"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { sized } from "@/lib/photo/src";
import { FolkPortrait } from "@/components/art/FolkPortrait";
import { SensitiveVeil } from "@/components/ui/SensitiveVeil";

export type PhotoTone = "urgent" | "active" | "resolved" | "neutral";

/* No photograph: the animal's seal on a hatched ground (see AnimalSeal), the
   same mark the map's pins carry, so an unphotographed animal looks the same
   in a list, on a card and on the map. The tone only changes the ring. */
const RING: Record<PhotoTone, string> = {
  urgent: "var(--sp-flame)",
  active: "rgba(143,183,255,0.55)",
  resolved: "var(--sp-night-line)",
  neutral: "transparent",
};

/**
 * Animal image with a deliberately quiet fallback.
 *
 * A missing photo is drawn as the animal's seal, never as fake artwork.
 * When the caller knows the animal's state it can pass a tone.
 */
export function DogPhoto({
  src,
  alt,
  seed,
  className,
  imgClassName,
  fit = "cover",
  width = 384,
  tone = "neutral",
  size,
  sensitive = false,
}: {
  /** Start blurred with a tap to view (see lib/sensitive-photo). */
  sensitive?: boolean;
  /** Recorded size class; a puppy's illustration is drawn smaller. */
  size?: string | null;
  src: string | null | undefined;
  alt: string;
  seed?: string;
  className?: string;
  imgClassName?: string;
  fit?: "cover" | "contain";
  width?: number;
  tone?: PhotoTone;
}) {
  const [failed, setFailed] = useState(false);
  const missing = !src || src.trim() === "";
  const at = sized(src, width);
  const backdrop = sized(src, 64, 55);

  return (
    <div className={cn("relative overflow-hidden bg-[#f6eee2]", className)}>
      {!failed && !missing ? (
        <SensitiveVeil sensitive={sensitive} id={src} compact={width < 160} className="h-full w-full">{
        fit === "contain" ? (
          <>
            <img
              src={backdrop}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl"
            />
            <img
              src={at}
              alt={alt}
              loading="lazy"
              onError={() => setFailed(true)}
              className={cn("relative h-full w-full object-contain", imgClassName)}
            />
          </>
        ) : (
          <img
            src={at}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(true)}
            className={cn("h-full w-full object-cover", imgClassName)}
          />
        )}</SensitiveVeil>
      ) : (
        <div className="h-full w-full" style={{ boxShadow: `inset 0 0 0 2px ${RING[tone]}` }}>
          <FolkPortrait seed={seed ?? alt ?? ""} size={size} className="block h-full w-full" label={`${alt || "Animal"}: illustration, no photograph on record`} />
        </div>
      )}
    </div>
  );
}
