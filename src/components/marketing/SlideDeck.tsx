"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** A paged, interactive slide deck for the landing, arrows, dots, keyboard,
 *  and swipe, so the story is stepped through instead of scrolled. */
export function SlideDeck({ slides }: { slides: React.ReactNode[] }) {
  const [[i, dir], setState] = useState<[number, number]>([0, 0]);
  const n = slides.length;
  const go = useCallback(
    (next: number) => setState(([cur]) => {
      const clamped = Math.max(0, Math.min(n - 1, next));
      return [clamped, clamped > cur ? 1 : -1];
    }),
    [n]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go]);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-paper text-bark-900 dark:bg-ink dark:text-bark-50">
      {/* slide number */}
      <div className="pointer-events-none absolute left-5 top-20 z-20 text-[12px] font-semibold tabular-nums tracking-[0.2em] text-bark-400 sm:left-8">
        {String(i + 1).padStart(2, "0")} <span className="text-bark-300">/ {String(n).padStart(2, "0")}</span>
      </div>

      <div className="relative flex-1">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.section
            key={i}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.14}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) go(i + 1);
              else if (info.offset.x > 80) go(i - 1);
            }}
            className="absolute inset-0 flex items-center justify-center px-5 py-24"
          >
            {slides[i]}
          </motion.section>
        </AnimatePresence>
      </div>

      {/* controls */}
      <div className="relative z-20 flex items-center justify-center gap-5 pb-7">
        <button
          onClick={() => go(i - 1)}
          disabled={i === 0}
          aria-label="Previous"
          className="grid h-10 w-10 place-items-center rounded-full border border-black/[0.08] bg-white/70 text-bark-600 transition-colors hover:bg-white disabled:opacity-30 dark:border-white/10 dark:bg-bark-900/60"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {slides.map((_, k) => (
            <button
              key={k}
              onClick={() => go(k)}
              aria-label={`Slide ${k + 1}`}
              className={`h-2 rounded-full transition-all ${k === i ? "w-6 bg-paw-500" : "w-2 bg-bark-300 hover:bg-bark-400"}`}
            />
          ))}
        </div>
        <button
          onClick={() => go(i + 1)}
          disabled={i === n - 1}
          aria-label="Next"
          className="grid h-10 w-10 place-items-center rounded-full border border-black/[0.08] bg-white/70 text-bark-600 transition-colors hover:bg-white disabled:opacity-30 dark:border-white/10 dark:bg-bark-900/60"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
