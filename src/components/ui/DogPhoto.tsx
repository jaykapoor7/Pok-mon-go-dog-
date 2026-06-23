"use client";

import { useState } from "react";
import { PawPrint } from "lucide-react";
import { cn, seededRandom } from "@/lib/utils";

const GRADIENTS = [
  ["#fb923c", "#f97316"],
  ["#f59e0b", "#ef4444"],
  ["#ec4899", "#f97316"],
  ["#8b5cf6", "#ec4899"],
  ["#10b981", "#f59e0b"],
  ["#f97316", "#7c2d12"],
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
