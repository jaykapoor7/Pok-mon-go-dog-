"use client";

/* On a phone, a page's sections become tabs so it stays one or two
   screens long; on wider screens every section shows, in order. Nothing
   is removed: each section is one tap away. */

import { useState, type ReactNode } from "react";

export function PhoneTabs({ tabs, label = "Sections" }: { tabs: { id: string; label: string; node: ReactNode }[]; label?: string }) {
  const list = tabs.filter((t) => t.node);
  const [on, setOn] = useState(list[0]?.id);
  if (list.length < 2) return <>{list.map((t) => <div key={t.id}>{t.node}</div>)}</>;
  return (
    <div className="ptabs">
      <div className="ptabs-bar" role="tablist" aria-label={label}>
        {list.map((t) => <button key={t.id} type="button" role="tab" aria-selected={on === t.id} onClick={() => setOn(t.id)}>{t.label}</button>)}
      </div>
      {list.map((t) => <div key={t.id} className="ptabs-panel" data-on={on === t.id ? "" : undefined}>{t.node}</div>)}
    </div>
  );
}

/** A long list shows its first few items on a phone, with the rest a tap away. */
export function PhoneFold({ children, count = 5, total, noun = "more" }: { children: ReactNode; count?: number; total: number; noun?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`pfold${open ? " is-open" : ""}`} style={{ ["--pf" as string]: count }} data-count={count}>
      {children}
      {total > count && !open && <button type="button" className="pfold-more" onClick={() => setOpen(true)}>Show {total - count} {noun}</button>}
    </div>
  );
}
