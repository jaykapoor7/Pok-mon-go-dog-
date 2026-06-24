"use client";

import { markerMetaFor } from "@/lib/marker-state";
import type { Dog } from "@/lib/types";

/**
 * Clean, tappable dog marker: a soft colored dot that pops in and gently
 * floats above a ground shadow. No emoji, no pulsing — calm and modern.
 * Positioning is handled by the parent (Mapbox <Marker> or the fallback map).
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
  const size = dog.needs_help ? 26 : 22;

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
      <span className="pointer-events-none absolute bottom-0.5 h-1.5 w-6 rounded-[50%] bg-black/30 blur-[2px] animate-ground-shadow dark:bg-black/55" />

      {/* floating dot */}
      <span className="relative mb-1 block animate-bob">
        <span
          className="flex items-center justify-center rounded-full ring-[3px] ring-white transition-transform duration-150 group-hover:scale-110 group-active:scale-90 dark:ring-bark-900"
          style={{
            height: size,
            width: size,
            backgroundColor: meta.color,
            boxShadow: `0 5px 12px -2px ${meta.color}66, 0 2px 5px rgba(17,17,19,0.28)`,
          }}
        >
          <span className="rounded-full bg-white/90" style={{ height: 5, width: 5 }} />
        </span>
      </span>
    </button>
  );
}
