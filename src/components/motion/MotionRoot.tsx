"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/* ════════════════════════════════════════════════════════════════════
   Reduced motion, for framer-motion.

   framer-motion writes inline transforms through requestAnimationFrame,
   not through CSS transitions. So every prefers-reduced-motion block in
   this codebase — the global one in globals.css and the targeted ones
   in site.css, app.css and field-site.css — reached none of it. Thirteen
   components played their full travel for somebody who had asked their
   operating system not to move things: a full viewport-height bottom
   sheet on every map marker tap, four modals flying up 60px, a whole
   feed of cards rising as you scroll.

   `reducedMotion="user"` is framer's own implementation of the branch
   the audit asks for: transform values are dropped and opacity is kept,
   so a panel still fades in and simply does not fly. One wrapper rather
   than a useReducedMotion() call in thirteen files — which is the
   version that stays correct when somebody adds the fourteenth.
   ════════════════════════════════════════════════════════════════════ */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
