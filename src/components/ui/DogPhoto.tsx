"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { sized } from "@/lib/photo/src";

export type PhotoTone = "urgent" | "active" | "resolved" | "neutral";

/* No photograph: a navy tile with a plain line drawing of a dog, the same
   mark the map uses — so an unphotographed animal looks the same in a list,
   on a card and on the map. The tone only changes the ring. */
const RING: Record<PhotoTone, string> = {
  urgent: "rgba(240,91,64,0.9)",
  active: "rgba(143,183,255,0.55)",
  resolved: "rgba(239,231,218,0.18)",
  neutral: "rgba(239,231,218,0.12)",
};
const DOG_PATHS = [
  "M11.25 16.25h1.5L12 17z", "M16 14v.5", "M8 14v.5",
  "M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309",
  "M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5-1.931.722-3.576-.297-3.656-1-.113-.994 1.177-6.53 4-7 1.923-.321 3.651.845 3.651 2.235A7.497 7.497 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5",
];

/**
 * Animal image with a deliberately quiet fallback.
 *
 * Missing photos are represented as a flat state colour rather than fake
 * artwork, icons or gradients. When the caller knows the animal's state it
 * can pass a tone; generic/non-animal uses remain neutral.
 */
export function DogPhoto({
  src,
  alt,
  seed: _seed,
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
        <div
          className="grid h-full w-full place-items-center"
          style={{ background: "radial-gradient(circle at 50% 40%, #16305e, #0b1e3d 72%)", boxShadow: `inset 0 0 0 2px ${RING[tone]}` }}
          role="img"
          aria-label={`${alt || "Animal"}: no photo available`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#efe7da" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden
            style={{ width: "34%", height: "34%", maxWidth: 72, maxHeight: 72, opacity: 0.85 }}>
            {DOG_PATHS.map((d) => <path key={d} d={d} />)}
          </svg>
        </div>
      )}
    </div>
  );
}
