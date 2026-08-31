"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { MapCanvas } from "@/components/map/MapCanvas";
import type { Dog } from "@/lib/types";

/* ───────────────────────────────────────────────────────────────────
   Live map preview — the payoff of "network grows -> map". A real,
   chrome-less MapCanvas embed (reusing the existing preview mode, no
   new map library) with a subtle scroll-linked 3D tilt so it settles
   into place as the section comes into view, instead of a flat,
   static screenshot-like card.
─────────────────────────────────────────────────────────────────── */
export function LiveMapPreview({ dogs }: { dogs: Dog[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [9, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [0.4, 1]);

  return (
    <div ref={ref} style={{ perspective: "1400px" }} className="relative h-[320px] w-full sm:h-[400px]">
      <motion.div
        style={{ rotateX, opacity, transformOrigin: "center bottom" }}
        className="h-full w-full overflow-hidden rounded-2xl border border-black/10 shadow-card dark:border-white/10"
      >
        <MapCanvas dogs={dogs} preview />
      </motion.div>
    </div>
  );
}
