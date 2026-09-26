"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { sized } from "@/lib/photo/src";
import { AnimalSeal } from "@/components/system/AnimalSeal";

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
}: {
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
    <div className={cn("relative overflow-hidden bg-[#0b1e3d]", className)}>
      {!failed && !missing ? (
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
        )
      ) : (
        <div className="h-full w-full" style={{ boxShadow: `inset 0 0 0 2px ${RING[tone]}` }}>
          <AnimalSeal seed={seed ?? alt ?? ""} name={alt} label={`${alt || "Animal"}: no photograph yet`} caption />
        </div>
      )}
    </div>
  );
}
