"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

/* Work tabs: the records and conversations a person has open stay one click away, across pages and reloads, until
   they close them. Only record pages and channels become tabs; lists and home pages are what the sidebar is for. */

type T = { href: string; title: string };
const KEY = "nx.tabs.v1";
const MAX = 8;
const RECORD = /^\/(ngo\/(animals|cases|submissions|programmes)\/[^/]+|gov\/(verification|programmes|reports)\/[^/]+|research\/(studies|datasets)\/[^/]+|health\/(patients|referrals|samples|bites|procedures)\/(?!new$)[^/]+|channels\/[^/]+)$/;

const read = (): T[] => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v.filter((t) => t && typeof t.href === "string" && typeof t.title === "string" && RECORD.test(t.href)).slice(0, MAX) : []; } catch { return []; } };
const write = (t: T[]) => { try { localStorage.setItem(KEY, JSON.stringify(t)); } catch {} };

export function WorkTabs({ path, title, home }: { path: string; title?: string; home: string }) {
  const [tabs, setTabs] = useState<T[]>([]);
  const router = useRouter();
  const calm = useReducedMotion();
  useEffect(() => { setTabs(read()); }, []);
  useEffect(() => {
    if (!RECORD.test(path) || !title) return;
    setTabs((cur) => {
      const has = cur.find((t) => t.href === path);
      if (has && has.title === title) return cur;
      const next = has ? cur.map((t) => (t.href === path ? { ...t, title } : t)) : [...cur, { href: path, title }];
      const trimmed = next.length > MAX ? next.filter((t, i) => t.href === path || i >= next.length - MAX) : next;
      write(trimmed);
      return trimmed;
    });
  }, [path, title]);
  const close = (href: string) => {
    setTabs((cur) => {
      const i = cur.findIndex((t) => t.href === href);
      const next = cur.filter((t) => t.href !== href);
      write(next);
      if (href === path) router.push(next[Math.max(0, i - 1)]?.href ?? home);
      return next;
    });
  };
  if (!tabs.length) return null;
  return (
    <nav className="nx-wtabs" aria-label="Open records">
      <AnimatePresence initial={false}>
        {tabs.map((t) => (
          <motion.span key={t.href} className={`nx-wtab ${t.href === path ? "is-on" : ""}`} layout={!calm} initial={calm ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={calm ? { opacity: 0 } : { opacity: 0, width: 0 }} transition={{ duration: .16 }}>
            <Link href={t.href} aria-current={t.href === path ? "page" : undefined} onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); close(t.href); } }}>{t.title}</Link>
            <button type="button" aria-label={`Close ${t.title}`} onClick={() => close(t.href)}><X size={12} /></button>
          </motion.span>
        ))}
      </AnimatePresence>
    </nav>
  );
}
