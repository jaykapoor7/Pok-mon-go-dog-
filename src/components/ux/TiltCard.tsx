"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * Lightweight 3D tilt, the card leans toward the pointer (mouse on desktop,
 * finger drag on touch). Pure CSS transforms, no library, and it respects
 * users who prefer reduced motion.
 */
export function TiltCard({
  children,
  className,
  max = 9,
  scale = 1.02,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  scale?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>("");

  // Mouse-only (fine pointer) so it never fights touch scrolling, and off when
  // the user prefers reduced motion.
  function enabled() {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return (
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || !enabled()) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTransform(
      `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(
        px * max
      ).toFixed(2)}deg) scale(${scale})`
    );
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => setTransform("")}
      style={{
        transform: transform || undefined,
        transition: transform ? "transform 60ms linear" : "transform 400ms ease",
        willChange: "transform",
      }}
      className={className}
    >
      {children}
    </div>
  );
}
