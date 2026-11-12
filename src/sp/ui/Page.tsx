"use client";

/* One page pattern for every screen behind the menu: a head (what this page
   is, what is on it right now, its one or two actions), a choice of lanes
   whose marker glides to the chosen one, and rows that say what each record
   needs next. Pages bring their own data and actions; this file only draws. */

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import "./page.css";

export function PageHead({ title, sum, actions }: { title: ReactNode; sum?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="vw-head">
      <div><h1 className="vw-title">{title}</h1>{sum ? <p className="vw-sum" aria-live="polite">{sum}</p> : null}</div>
      {actions ? <div className="vw-act">{actions}</div> : null}
    </header>
  );
}

export type SegOption<T extends string> = { id: T; label: string; count?: number | null; tone?: "flame" | "plain" };

/** A choice between a few lanes. The marker glides to the chosen one. */
export function Seg<T extends string>({ label, options, value, onChange }: { label: string; options: SegOption<T>[]; value: T; onChange: (v: T) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [m, setM] = useState<{ x: number; w: number } | null>(null);
  /* Measured again whenever a label or a count changes width. */
  const widths = options.map((o) => `${o.label}${o.count ?? ""}`).join("|");
  useLayoutEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    setM(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
  }, [value, widths]);
  return (
    <div ref={ref} className={`vw-seg${m ? " has-mark" : ""}`} role="group" aria-label={label}>
      {m ? <span className="vw-seg-mark" aria-hidden style={{ transform: `translateX(${m.x}px)`, width: m.w }} /> : null}
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}{o.count !== undefined && o.count !== null ? <b data-tone={o.tone}>{o.count}</b> : null}
        </button>
      ))}
    </div>
  );
}

/** How much of what a record needs is on it: one segment per item. */
export function Meter({ n, total, label }: { n: number; total: number; label: string }) {
  return (
    <span className="vw-meter" role="img" aria-label={`${n} of ${total} ${label}`}>
      <span className="vw-meter-bar" aria-hidden>{Array.from({ length: total }, (_, i) => <i key={i} className={i < n ? "is-on" : undefined} style={{ ["--k" as string]: i }} />)}</span>
      <span aria-hidden>{n}/{total}</span>
    </span>
  );
}

export function Empty({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return <div className="vw-empty" role="status"><b>{title}</b>{children ? <p>{children}</p> : null}{action}</div>;
}
