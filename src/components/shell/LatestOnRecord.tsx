"use client";

/* ════════════════════════════════════════════════════════════════════
   The latest entries on the public record, one line at a time.

   Real entries from /api/latest (what, where, how long ago), refreshed
   every minute and turning over every few seconds. The dot pulses only
   when the newest entry is less than a day old; otherwise it sits still,
   so the line never pretends to be busier than the record is.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = { what: string; where: string | null; at: string; dog: string | null };

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 60 ? `${d} days ago` : `${Math.round(d / 30)} months ago`;
}

export function LatestOnRecord({ className = "" }: { className?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    let live = true;
    const read = () => fetch("/api/latest").then((r) => (r.ok ? r.json() : { items: [] })).then((j) => { if (live) setItems(j.items ?? []); }).catch(() => {});
    read();
    const t = window.setInterval(read, 60_000);
    return () => { live = false; window.clearInterval(t); };
  }, []);

  useEffect(() => {
    if (items.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % items.length), 6000);
    return () => window.clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;
  const it = items[i % items.length];
  const fresh = Date.now() - Date.parse(items[0].at) < 86_400_000;
  const line = <>{it.what}{it.where ? <> · {it.where}</> : null}</>;

  return (
    <div className={`lor ${className}`} aria-live="polite">
      <p className="lor-head"><i className={fresh ? "is-fresh" : ""} aria-hidden />Latest on the record</p>
      <p className="lor-line" key={i}>
        {it.dog ? <Link href={`/dog/${it.dog}`}>{line}</Link> : line}
        <span>{ago(it.at)}</span>
      </p>
    </div>
  );
}
