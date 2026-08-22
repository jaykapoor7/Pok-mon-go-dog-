"use client";

import { useState } from "react";
import { PawPrint } from "lucide-react";
import { cn, seededRandom } from "@/lib/utils";

const GRADIENTS = [
  ["#cb7a56", "#97431f"],
  ["#D9A441", "#b4552d"],
  ["#3E8473", "#78371b"],
  ["#C06A86", "#97431f"],
  ["#cb7a56", "#4c2513"],
  ["#b4552d", "#17150f"],
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
  src: string;
  alt: string;
  seed?: string;
  className?: string;
  imgClassName?: string;
  /** "cover" fills (may crop); "contain" shows the WHOLE photo over a blurred
   *  fill so a dog's head/body is never cut off. */
  fit?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState(false);
  const [from, to] = GRADIENTS[
    Math.floor(seededRandom(seed ?? src) * GRADIENTS.length)
  ];

  return (
    <div className={cn("relative overflow-hidden bg-bark-100", className)}>
      {!failed ? (
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
