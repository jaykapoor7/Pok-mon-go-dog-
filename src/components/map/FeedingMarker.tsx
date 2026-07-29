"use client";

/**
 * Feeding-zone map pin — a bowl icon in a colored circle, visually distinct
 * from dog PhotoMarkers so the two layers never get confused.
 */
export function FeedingMarker({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      aria-label={label}
      className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-status-hungry text-base shadow-pop transition-transform duration-150 hover:z-10 hover:scale-110 active:scale-95 dark:border-bark-900"
    >
      🥣
    </button>
  );
}
