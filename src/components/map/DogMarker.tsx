"use client";

import { markerMetaFor } from "@/lib/marker-state";
import type { Dog } from "@/lib/types";

/**
 * Playful, Pokémon-Go-style dog marker: a big tappable badge that pops in,
 * floats above a breathing ground shadow, and pulses when the dog needs help.
 * Visual only — positioning is handled by the parent (Mapbox <Marker> or the
 * fallback map's absolute layer).
 */
export function DogMarker({
  dog,
  onSelect,
  delay = 0,
}: {
  dog: Dog;
  onSelect?: (dog: Dog) => void;
  delay?: number;
}) {
  const meta = markerMetaFor(dog);
  const urgent = dog.needs_help;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(dog);
      }}
      aria-label={`${dog.name ?? "Street dog"} — ${meta.label}`}
      className="group relative grid h-12 w-12 place-items-end justify-items-center outline-none animate-marker-pop"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* ground shadow (breathes in sync with the float) */}
      <span className="pointer-events-none absolute bottom-0.5 h-1.5 w-6 rounded-[50%] bg-black/35 blur-[2px] animate-ground-shadow dark:bg-black/60" />

      {/* floating badge */}
      <span className="relative mb-1 block animate-bob">
        {/* pulse ring — always subtle, stronger for urgent */}
        <span
          className="absolute inset-0 -z-10 rounded-full animate-pulse-ring"
          style={{ backgroundColor: meta.color, opacity: urgent ? 0.9 : 0.45 }}
        />
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full text-[17px] ring-[3px] ring-white transition-transform duration-150 group-hover:scale-110 group-active:scale-90 dark:ring-bark-900"
          style={{
            backgroundColor: meta.color,
            boxShadow: `0 6px 14px -2px ${meta.color}80, 0 2px 6px rgba(17,17,19,0.3)`,
          }}
        >
          <span className="drop-shadow-sm">{meta.emoji}</span>
        </span>
      </span>
    </button>
  );
}
