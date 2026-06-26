"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SEEN_KEY = "straypaw.intro_seen";

/**
 * A short, branded first-load moment: the logo draws in, the tagline fades, a
 * live "dogs tracked" stat counts up, then it dissolves into the map. Shown
 * once per device (and skipped under reduced-motion).
 */
export function IntroSplash() {
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (seen || reduce) return;

    setShow(true);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }

    // Real stat for the count-up (falls back gracefully).
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setTarget(typeof d.dogs === "number" ? d.dogs : 0))
      .catch(() => setTarget(0));

    const hide = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(hide);
  }, []);

  // Count up to the target over ~1s.
  useEffect(() => {
    if (target === null || target <= 0) return;
    const start = performance.now();
    const dur = 1000;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-paper dark:bg-ink"
        >
          <motion.img
            src="/logo.png"
            alt="StrayPaw"
            initial={{ scale: 0.6, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 16 }}
            className="h-28 w-auto sm:h-36"
          />
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mt-5 font-display text-xl font-semibold text-paw-700 dark:text-paw-300 sm:text-2xl"
          >
            Every dog has a story.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-2 text-sm font-medium text-bark-500"
          >
            {target && target > 0 ? (
              <>
                <span className="font-bold text-paw-600">
                  {count.toLocaleString("en-IN")}
                </span>{" "}
                dogs tracked across India
              </>
            ) : (
              "Start seeing them."
            )}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
