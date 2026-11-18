"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pin } from "lucide-react";
import { useCalm } from "./hooks";
import { SPRING } from "./tokens";

/** Pin to the sidebar, as a toggle that morphs between its two states: the pin drops in with a small spring and a
    filled backing when pinned, and tilts away when unpinned. `busy` keeps it from being pressed twice. */
export function PinToggle({ on, busy, onToggle, label }: { on: boolean; busy?: boolean; onToggle: () => void; label: string }) {
  const calm = useCalm();
  const t = calm ? { duration: 0 } : SPRING.morph;
  return (
    <button type="button" className="nx-ib mo-pin mo-tip" data-on={on || undefined} aria-pressed={on} aria-label={`Pin ${label} to the sidebar`}
      data-tip={on ? "Pinned · unpin" : "Pin to the sidebar"} disabled={busy} onClick={onToggle}>
      <motion.span className="mo-pin-b" aria-hidden initial={false} animate={{ scale: on ? 1 : 0.4, opacity: on ? 1 : 0 }} transition={t} />
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={on ? "on" : "off"} className="mo-pin-i" aria-hidden initial={calm ? { opacity: 0 } : { opacity: 0, rotate: on ? -40 : 30, y: on ? -6 : 0, scale: 0.7 }} animate={{ opacity: 1, rotate: 0, y: 0, scale: 1 }} exit={calm ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, rotate: on ? 30 : -40, scale: 0.7 }} transition={t}>
          <Pin size={15} fill={on ? "currentColor" : "none"} />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
