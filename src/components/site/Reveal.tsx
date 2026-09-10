"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reveals children as they enter the viewport, and un-reveals them as they
 * leave.
 *
 * The exit is the point. The first version called io.disconnect() the moment
 * something appeared, so every reveal was one-way: scroll down and the page
 * assembled itself, scroll back up and it was already assembled. That makes
 * a long page feel like it only has one direction — going back up is just
 * looking at the wreckage of an animation you already watched.
 *
 * With a mirrored exit, scrolling up rewinds the sequence instead. It costs
 * one observer that stays connected, and it is the difference between a page
 * that performs once and one that responds continuously.
 *
 * `once` opts out for anything that must not move again after it lands.
 */
export function Reveal({
  children,
  delay = 0,
  once = false,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  /** Keep the revealed state permanently once it has been reached. */
  once?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /* No entrance at all when the visitor has asked for less motion: the
       content is simply there, in both directions. */
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setSeen(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          if (once) io.disconnect();
        } else if (!once) {
          /* Only retract when it leaves past the BOTTOM of the viewport,
             i.e. the reader scrolled back up above it. Retracting on the way
             out of the top would mean content vanishing behind you as you
             read downward, which is the opposite of the intent. */
          if (entry.boundingClientRect.top > 0) setSeen(false);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      className={`sp-reveal ${seen ? "in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
