"use client";

import { useLayoutEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LivingEvent } from "@/lib/animal/living";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  return `${date.getUTCDate()} ${MON[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};
const SOURCE: Record<LivingEvent["source"], string> = { field: "field record", resident: "resident", import: "imported register" };

/** The only animated island inside the server-rendered animal record.
 *
 *  line-draw + temporal-overlap: as the entries come into view a thread is
 *  drawn down through their marks at one constant speed, and each mark
 *  settles as the thread reaches it — the animal's care read as one life
 *  line, in the order it happened, rather than a list of rows. */
export function LivingChronology({ entries }: { entries: LivingEvent[] }) {
  const reduceMotion = useReducedMotion();
  const SEG = 0.12; // seconds of thread per entry: constant speed, because the line stands for time
  /* The thread is placed from the marks themselves, so it stays on them
     whatever column widths a surface's stylesheet gives the row. */
  const list = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    const ol = list.current; if (!ol) return;
    const place = () => {
      const li = ol.firstElementChild as HTMLElement | null, mark = li?.querySelector<HTMLElement>(".lr-ch-mark");
      const last = ol.lastElementChild as HTMLElement | null, lastMark = last?.querySelector<HTMLElement>(".lr-ch-mark");
      if (!li || !mark || !last || !lastMark) return;
      const a = li.getBoundingClientRect(), m = mark.getBoundingClientRect();
      const b = last.getBoundingClientRect(), n = lastMark.getBoundingClientRect();
      ol.style.setProperty("--lr-mx", `${m.left + m.width / 2 - a.left}px`);
      ol.style.setProperty("--lr-first", `${m.top + m.height / 2 - a.top}px`);
      ol.style.setProperty("--lr-last", `${b.bottom - (n.top + n.height / 2)}px`);
    };
    place();
    const ro = new ResizeObserver(place); ro.observe(ol);
    return () => ro.disconnect();
  }, [entries.length]);
  return (
    <ol className="lr-chrono" ref={list}>
      {entries.map((entry, index) => {
        const at = Math.min(index, 8) * SEG;
        return (
          <motion.li key={entry.id} className={`lr-ch is-${entry.lane}`} initial={reduceMotion ? false : { opacity: 0, y: 8 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.22 }} transition={{ duration: 0.28, delay: Math.min(index, 8) * 0.04, ease: [0.23, 1, 0.32, 1] }}>
            {entries.length > 1 && (
              <motion.i className={`lr-ch-thread${index === 0 ? " is-first" : ""}${index === entries.length - 1 ? " is-last" : ""}`} aria-hidden
                initial={reduceMotion ? false : { scaleY: 0 }} whileInView={reduceMotion ? undefined : { scaleY: 1 }} viewport={{ once: true, amount: 0.22 }}
                transition={{ duration: SEG, delay: at, ease: "linear" }} />
            )}
            <span className="lr-ch-date sys-mono">{day(entry.date)}</span>
            <motion.i className={`lr-ch-mark is-${entry.tone}`} aria-hidden
              initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }} whileInView={reduceMotion ? undefined : { scale: 1, opacity: 1 }} viewport={{ once: true, amount: 0.22 }}
              transition={{ duration: 0.36, delay: at + SEG * 0.5, ease: [0.34, 1.4, 0.64, 1] }} />
            <span className="lr-ch-what"><b>{entry.title}</b>{entry.note && <span>{entry.note}</span>}</span>
            <span className="lr-ch-src">{[entry.source === "field" && entry.by ? entry.by : SOURCE[entry.source], entry.source !== "field" ? entry.by : null, entry.via].filter(Boolean).join(" · ")}</span>
          </motion.li>
        );
      })}
    </ol>
  );
}
