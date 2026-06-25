"use client";

import { useState } from "react";
import { PawPrint } from "lucide-react";
import { cn, seededRandom } from "@/lib/utils";

const GRADIENTS = [
  ["#8f9c5f", "#515C30"],
  ["#D9A441", "#6E7A45"],
  ["#3E8473", "#515C30"],
  ["#C06A86", "#6E7A45"],
  ["#4E8A5F", "#3D4522"],
  ["#6E7A45", "#232711"],
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
}: {
  src: string;
  alt: string;
  seed?: string;
  className?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [from, to] = GRADIENTS[
    Math.floor(seededRandom(seed ?? src) * GRADIENTS.length)
  ];

  return (
    <div className={cn("relative overflow-hidden bg-bark-100", className)}>
      {!failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn("h-full w-full object-cover", imgClassName)}
        />
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
