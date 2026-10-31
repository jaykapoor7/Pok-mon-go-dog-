"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/* Content rises once as it enters the viewport (~520ms, ease-out), the way
   the reference does. Server-rendered content is visible: only blocks that
   start below the fold are armed after hydration, so nothing above the fold
   flashes and nothing is hidden without JavaScript. Reduced motion: CSS
   turns the transition off. */
export function Rise({ as: Tag = "div", className = "", delay = 0, children, ...rest }: { as?: ElementType; className?: string; delay?: number; children: ReactNode } & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "armed" | "in">("idle");
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    setState("armed");
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setState("in"); io.disconnect(); }
    }, { rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const cls = state === "idle" ? className : `${className} s4-rise${state === "in" ? " is-in" : ""}`;
  return <Tag ref={ref} className={cls.trim()} style={delay && state !== "idle" ? { transitionDelay: `${delay}ms` } : undefined} {...rest}>{children}</Tag>;
}
