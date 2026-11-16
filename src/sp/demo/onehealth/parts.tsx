"use client";

/* The building blocks of the demo's screens: a workspace frame drawn the way StrayPaw's app is drawn (place card,
   menu, breadcrumb, search, Kaju), chips, the "today / proposed" mark, and a clock for what happens inside a step.
   Nothing here is a control: the screens are pictures of the product that the demo moves through. */

import { useEffect, useState, type ReactNode } from "react";
import { Check, Search, Sparkles, type LucideIcon } from "lucide-react";
import type { Avail } from "./story";

export type Tone = "plain" | "accent" | "ok" | "warn" | "bad";

export function Chip({ tone = "plain", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`ohd-chip is-${tone}`}>{children}</span>;
}

/** Whether something shown is in StrayPaw today or proposed in this application. */
export function AvailTag({ s, small = false }: { s: Avail; small?: boolean }) {
  return <span className={`ohd-avail is-${s}${small ? " is-sm" : ""}`}>{s === "today" ? <><Check size={12} aria-hidden />In StrayPaw today</> : "Proposed"}</span>;
}

/** The highlight that follows the story: on for the thing the current step is about. */
export const hl = (on: boolean, extra = "") => `ohd-hl${on ? " is-on" : ""}${extra ? ` ${extra}` : ""}`;

/** Milliseconds since the current step began, so a step can unfold (a modal is confirmed, a suggestion arrives). */
export function useStepClock(key: string): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    setT(0);
    const start = performance.now();
    const id = window.setInterval(() => {
      const e = performance.now() - start;
      setT(e);
      if (e > 12000) window.clearInterval(id);
    }, 200);
    return () => window.clearInterval(id);
  }, [key]);
  return t;
}

/** Shown once the story has passed step `at`, or `ms` into step `at`. */
export function useReveal(b: number, key: string) {
  const t = useStepClock(key);
  return (at: number, ms = 0) => b > at || (b === at && t >= ms);
}

export type Place = { name: string; initials: string; kind: string };
export type NavI = { label: string; icon: LucideIcon; n?: number };

/** A StrayPaw workspace, drawn: the place, its menu, the bar with where you are, and the page. */
export function Frame({ place, nav, active, crumb, children, toast, overlay }: { place: Place; nav: NavI[]; active: string; crumb: string[]; children: ReactNode; toast?: ReactNode; overlay?: ReactNode }) {
  return (
    <section className="ohd-app" aria-label={`${place.name}: illustrative screen`}>
      <div className="ohd-side">
        <div className="ohd-place"><span className="ohd-ini" aria-hidden>{place.initials}</span><span><b>{place.name}</b><small>{place.kind}</small></span></div>
        <ul className="ohd-nav">
          {nav.map((n) => { const I = n.icon; return (
            <li key={n.label} className={n.label === active ? "is-on" : undefined} aria-current={n.label === active ? "page" : undefined}><I size={16} aria-hidden /><span>{n.label}</span>{n.n ? <em>{n.n}</em> : null}</li>
          ); })}
        </ul>
        <p className="ohd-side-foot">Illustrative demonstration</p>
      </div>
      <div className="ohd-bar">
        <p className="ohd-crumb">{crumb.map((c, i) => <span key={c + i} className={i === crumb.length - 1 ? "is-here" : undefined}>{c}</span>)}</p>
        <span className="ohd-search" aria-hidden><Search size={14} />Search anything<kbd>⌘K</kbd></span>
        <span className="ohd-kajubtn" aria-hidden><Sparkles size={14} />Kaju</span>
      </div>
      <div className="ohd-page" data-scroll tabIndex={0} aria-label={`${place.name}, page`}>{children}</div>
      {overlay ? <div className="ohd-overlay">{overlay}</div> : null}
      {toast ? <div className="ohd-toast" role="status">{toast}</div> : null}
    </section>
  );
}

export function Head({ eyebrow, title, sub, chips, icon }: { eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; chips?: ReactNode; icon?: ReactNode }) {
  return (
    <header className="ohd-head">
      {icon ? <span className="ohd-head-ic" aria-hidden>{icon}</span> : null}
      <div>
        {eyebrow ? <p className="ohd-eyebrow">{eyebrow}</p> : null}
        <h3 className="ohd-h">{title}</h3>
        {sub ? <p className="ohd-sub">{sub}</p> : null}
        {chips ? <p className="ohd-chips">{chips}</p> : null}
      </div>
    </header>
  );
}

export function Props({ items }: { items: [string, ReactNode][] }) {
  return <dl className="ohd-props">{items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}

/** Kaju's own block on a screen: what it prepared, marked as today or proposed. */
export function KajuCard({ title, s, children, className = "" }: { title: ReactNode; s: Avail; children: ReactNode; className?: string }) {
  return (
    <div className={`ohd-kcard${s === "proposed" ? " is-prop" : ""} ${className}`}>
      <p className="ohd-kcard-h"><span className="ohd-kmark" aria-hidden><Sparkles size={12} /></span><b>{title}</b><AvailTag s={s} small /></p>
      {children}
    </div>
  );
}
