"use client";

import { useState } from "react";
import { PawPrint } from "lucide-react";
import { cn, seededRandom } from "@/lib/utils";

const GRADIENTS = [
  ["#5b86f0", "#2f4fc0"],
  ["#D9A441", "#3b63e0"],
  ["#3E8473", "#2842a0"],
  ["#C06A86", "#2f4fc0"],
  ["#5b86f0", "#1f3168"],
  ["#3b63e0", "#141821"],
];

/**
 * Image with a warm gradient + paw fallback. Guarantees something beautiful
 * renders even if a remote photo fails or the app is offline.
 */
export function DogPhoto({
  src,
  alt,
  seed,
  className,
  imgClassName,
  fit = "cover",
}: {
  /* Nullable on purpose. dogs.cover_photo is null for most animals on a
     young register, and callers were already passing that null straight
     through — the type just did not admit it. */
  src: string | null | undefined;
  alt: string;
  seed?: string;
  className?: string;
  imgClassName?: string;
  /** "cover" fills (may crop); "contain" shows the WHOLE photo over a blurred
   *  fill so a dog's head/body is never cut off. */
  fit?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState(false);
  /* No photograph is not a failed photograph, but it takes the same path:
     without this an <img> was rendered with no src, which paints the
     browser's broken-image icon and never fires onError — so the animal
     detail panel opened on a torn-page glyph for every animal nobody has
     photographed yet, which is most of them. */
  const missing = !src || src.trim() === "";
  const [from, to] = GRADIENTS[
    Math.floor(seededRandom(seed ?? src ?? alt) * GRADIENTS.length)
  ];

  return (
    <div className={cn("relative overflow-hidden bg-bark-100", className)}>
      {!failed && !missing ? (
        fit === "contain" ? (
          <>
            {/* blurred backdrop fills the frame; foreground shows the full dog */}
            <img
              src={src}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl"
            />
            <img
              src={src}
              alt={alt}
              loading="lazy"
              onError={() => setFailed(true)}
              className={cn("relative h-full w-full object-contain", imgClassName)}
            />
          </>
        ) : (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(true)}
            className={cn("h-full w-full object-cover", imgClassName)}
          />
        )
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          <PawPrint className="h-1/3 w-1/3 text-white/70" />
        </div>
      )}
    </div>
  );
}
