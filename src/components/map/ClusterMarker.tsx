"use client";

/**
 * A group of animals at this point on the map.
 *
 * Clusters used to render as a PhotoMarker, the same circular photo in the
 * same status ring used for one animal, with a small count badge in the
 * corner. Forty animals in a ward and one animal seen forty times looked
 * identical, and at a city or national zoom the map became a field of
 * identical 54px photographs with no read on density at all.
 *
 * So a cluster stops pretending to be an animal. It is a disc, it is sized
 * by how many are inside it, and the number is the whole point rather than
 * a badge on the corner of something else. Photographs are reserved for
 * individual animals, which is the only place a photograph identifies
 * anything.
 */

/* Five steps rather than a continuous scale: a smooth radius makes 30 and
   40 indistinguishable, while steps make "this is a bigger group than that
   one" readable across a whole screen without reading any numbers. */
function sizeFor(count: number) {
  if (count < 10) return 42;
  if (count < 50) return 52;
  if (count < 200) return 64;
  if (count < 1000) return 78;
  return 92;
}

function labelFor(count: number) {
  if (count < 1000) return String(count);
  return `${Math.round(count / 100) / 10}k`;
}

export function ClusterMarker({
  count,
  urgent = 0,
  onClick,
}: {
  count: number;
  /** How many animals inside this group are flagged as needing help. */
  urgent?: number;
  onClick?: () => void;
}) {
  const size = sizeFor(count);
  const ring = urgent > 0 ? "#FF5A3C" : "#66C5D5";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      aria-label={
        urgent > 0
          ? `${count} animals here, ${urgent} needing help. Zoom in.`
          : `${count} animals here. Zoom in.`
      }
      title={
        urgent > 0
          ? `${count} animals, ${urgent} needing help`
          : `${count} animals`
      }
      className="relative block transition-transform duration-150 hover:z-10 hover:scale-110 active:scale-95"
      style={{ width: size, height: size }}
    >
      {/* A translucent halo, so the disc holds its edge over a pale street
          map and over dark water alike without a hard white outline. */}
      <span
        aria-hidden
        className="absolute rounded-full"
        style={{
          inset: -6,
          background: ring,
          opacity: 0.18,
        }}
      />
      <span
        className="flex h-full w-full items-center justify-center rounded-full"
        style={{
          background: "rgba(9, 13, 22, 0.92)",
          border: `2.5px solid ${ring}`,
          boxShadow: "0 6px 18px -4px rgba(9, 13, 22, 0.7)",
          color: "#fff",
          fontWeight: 700,
          /* Tracks the disc so a four-digit count still fits inside it. */
          fontSize: Math.round(size * (count >= 1000 ? 0.3 : 0.36)),
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        {labelFor(count)}
      </span>

      {/* How many in there need help. The count alone says how much is
          recorded; this says how much of it is waiting on somebody. */}
      {urgent > 0 && (
        <span
          className="absolute -right-1 -top-1 flex items-center justify-center rounded-full px-1.5 font-bold leading-none text-white"
          style={{
            minWidth: 20,
            height: 20,
            background: "#FF5A3C",
            border: "2px solid rgba(9, 13, 22, 0.92)",
            fontSize: 11,
          }}
        >
          {urgent > 99 ? "99+" : urgent}
        </span>
      )}
    </button>
  );
}
