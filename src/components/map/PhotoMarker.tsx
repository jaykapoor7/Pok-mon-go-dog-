"use client";

import { DogPhoto } from "@/components/ui/DogPhoto";

/**
 * meowmbai-style map marker: a rounded photo thumbnail with a white border and
 * a small count badge. Used for both single dogs and clusters. Static (no
 * looping animation) so many can render smoothly.
 */
export function PhotoMarker({
  photo,
  seed,
  count = 1,
  urgent = false,
  size = 56,
  onClick,
  label,
}: {
  photo: string;
  seed?: string;
  count?: number;
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
      className="relative block transition-transform duration-150 hover:z-10 hover:scale-105 active:scale-95"
      style={{ width: size, height: size }}
    >
      <span
        className="block h-full w-full overflow-hidden rounded-2xl bg-white shadow-[0_4px_14px_-2px_rgba(17,17,19,0.45)]"
        style={{
          boxShadow: `0 4px 14px -2px rgba(17,17,19,0.45)`,
          border: `3px solid ${urgent ? "#ef4444" : "#ffffff"}`,
        }}
      >
        <DogPhoto src={photo} alt={label ?? "Dog"} seed={seed} className="h-full w-full" />
      </span>
      {count > 1 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-bark-900 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
          {count}
        </span>
      )}
    </button>
  );
}
