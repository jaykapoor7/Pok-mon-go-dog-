"use client";

import { DogPhoto } from "@/components/ui/DogPhoto";

/**
 * Map marker: a CIRCULAR photo inside a colored status RING, with a small count
 * badge. The ring colour encodes the dog's marker state (seen / fed / needs-help
 * / sterilised / adoptable). Static (no looping animation) so many render
 * smoothly. Used for both single dogs and clusters.
 */
export function PhotoMarker({
  photo,
  seed,
  count = 1,
  ringColor = "#9A9C88",
  urgent = false,
  size = 54,
  onClick,
  label,
}: {
  photo: string;
  seed?: string;
  count?: number;
  /** status colour for the ring (from MARKER_META) */
  ringColor?: string;
  /** needs-help dogs get a soft attention pulse */
  urgent?: boolean;
  size?: number;
  onClick?: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      aria-label={label ?? "Dog sighting"}
      className="relative block transition-transform duration-150 hover:z-10 hover:scale-110 active:scale-95"
      style={{ width: size, height: size }}
    >
      {/* attention pulse for dogs that need help */}
      {urgent && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full animate-pulse-ring"
          style={{ backgroundColor: ringColor }}
        />
      )}
      {/* colored status ring */}
      <span
        className="block h-full w-full rounded-full"
        style={{
          backgroundColor: ringColor,
          padding: 3,
          boxShadow: `0 4px 14px -2px rgba(17,17,19,0.45)`,
        }}
      >
        {/* white separator + circular photo */}
        <span className="block h-full w-full overflow-hidden rounded-full bg-white ring-2 ring-white">
          <DogPhoto src={photo} alt={label ?? "Dog"} seed={seed} className="h-full w-full" />
        </span>
      </span>
      {count > 1 && (
        <span
          className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white"
          style={{ backgroundColor: "#1C1D17" }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
