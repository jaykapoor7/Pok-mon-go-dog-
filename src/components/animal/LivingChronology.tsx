"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LivingEvent } from "@/lib/animal/living";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  return `${date.getUTCDate()} ${MON[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};
const SOURCE: Record<LivingEvent["source"], string> = { field: "field record", resident: "resident", import: "imported register" };

/** The only animated island inside the server-rendered animal record. */
export function LivingChronology({ entries }: { entries: LivingEvent[] }) {
  const reduceMotion = useReducedMotion();
  return (
    <ol className="lr-chrono">
      {entries.map((entry, index) => (
        <motion.li key={entry.id} className={`lr-ch is-${entry.lane}`} initial={reduceMotion ? false : { opacity: 0, y: 8 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.22 }} transition={{ duration: 0.2, delay: Math.min(index, 5) * 0.025, ease: [0.23, 1, 0.32, 1] }}>
          <span className="lr-ch-date sys-mono">{day(entry.date)}</span>
          <i className={`lr-ch-mark is-${entry.tone}`} aria-hidden />
          <span className="lr-ch-what"><b>{entry.title}</b>{entry.note && <span>{entry.note}</span>}</span>
          <span className="lr-ch-src">{SOURCE[entry.source]}</span>
        </motion.li>
      ))}
    </ol>
  );
}
