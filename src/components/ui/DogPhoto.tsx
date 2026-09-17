"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { sized } from "@/lib/photo/src";

export type PhotoTone = "urgent" | "active" | "resolved" | "neutral";

const FALLBACK_COLOURS: Record<PhotoTone, string> = {
  urgent: "#efd0c7",
  active: "#dce6f3",
  resolved: "#dfe8df",
  neutral: "#e9e7e2",
};

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
    <div className={cn("relative overflow-hidden bg-bark-100", className)}>
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
          className="h-full w-full"
          style={{ backgroundColor: FALLBACK_COLOURS[tone] }}
          role="img"
          aria-label={`${alt || "Animal"}: no photo available`}
        />
      )}
    </div>
  );
}
