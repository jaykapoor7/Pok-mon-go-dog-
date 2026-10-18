/* ════════════════════════════════════════════════════════════════════
   The thread. One flame-coloured running stitch, the kantha's own mark,
   carried through every act of the page. A path in a 0–100 box that
   stretches with its scene; it is sewn in by a CSS variable (--sew, 0 → 1)
   that each scene drives from scroll. The stitch pattern stays the same
   size at any width (non-scaling stroke); a solid twin of the path, used
   as a mask, does the revealing, so the stitches themselves never slide.
   ════════════════════════════════════════════════════════════════════ */

export function Thread({ d, id, className = "" }: { d: string; id: string; className?: string }) {
  return (
    <svg className={`kt-thread ${className}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <defs>
        <mask id={`m-${id}`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
          <path d={d} pathLength={1} className="kt-thread-mask" />
        </mask>
      </defs>
      <path d={d} className="kt-thread-shadow" vectorEffect="non-scaling-stroke" mask={`url(#m-${id})`} />
      <path d={d} className="kt-thread-stitch" vectorEffect="non-scaling-stroke" mask={`url(#m-${id})`} />
    </svg>
  );
}
