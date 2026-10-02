"use client";

/* ════════════════════════════════════════════════════════════════════
   The plate every in-app page opens on.

   A night band carried over from the Field Workspace on the landing: the
   page's place standing behind it as a living honeycomb (the city's real
   record replayed, the same LiveGround as the landing), and in front the
   page's name, one line on what it is for, its live figures and its one
   or two actions. The figures are the page's own numbers, passed in; a
   figure still loading reads as a dash, never as a zero.

   The ground is fetched once per city and shared across pages; it moves
   only while the plate is on screen, and under reduced motion it holds
   still with the record drawn in full.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { getMyOrg } from "@/lib/actions";

/* The place a whole space stands on: an organisation's own city for every
   page in its workspace, set once by the layout. A page may still name its
   own place. */
const DeskPlace = createContext<string | null>(null);

export function OrgPlace({ children }: { children: ReactNode }) {
  const [city, setCity] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    getMyOrg().then((org) => { if (live) setCity(org?.city?.trim() || null); }).catch(() => {});
    return () => { live = false; };
  }, []);
  return <DeskPlace.Provider value={city}>{children}</DeskPlace.Provider>;
}
import { PlaceGround } from "@/components/system/PlaceGround";

export type DeskFigure = { label: string; value: number | string | null | undefined; tone?: "attention" | "quiet"; href?: string };

const fmt = (v: DeskFigure["value"]) => (v === null || v === undefined || v === "" ? "—" : typeof v === "number" ? v.toLocaleString("en-IN") : v);

export function DeskHeader({ kicker, title, lede, figures, actions, city, ground: withGround = true, children }: {
  kicker?: string;
  title: ReactNode;
  lede?: ReactNode;
  figures?: DeskFigure[];
  actions?: ReactNode;
  /** The place behind the plate; the busiest city when not given. */
  city?: string | null;
  /** False where no place is chosen yet: a screen must not show another city meanwhile. */
  ground?: boolean;
  /** Anything that belongs in the plate beneath the figures (a place picker, a tab row). */
  children?: ReactNode;
}) {
  const spacePlace = useContext(DeskPlace);
  const place = city === undefined ? spacePlace : city;

  return (
    <header className="dh">
      <PlaceGround city={place} enabled={withGround} className="dh-ground" />
      <div className="dh-in">
        <div className="dh-copy">
          {kicker && <p className="dh-kicker sys-mono">{kicker}</p>}
          <h1 className="dh-title">{title}</h1>
          {lede && <p className="dh-lede">{lede}</p>}
        </div>
        {actions && <div className="dh-actions">{actions}</div>}
        {figures && figures.length > 0 && (
          <dl className="dh-figs">
            {figures.map((f) => (
              <div key={f.label} className={f.tone ? `is-${f.tone}` : undefined}>
                <dt>{f.label}</dt>
                <dd>{f.href ? <Link href={f.href}>{fmt(f.value)}<ArrowUpRight size={14} aria-hidden /></Link> : fmt(f.value)}</dd>
              </div>
            ))}
          </dl>
        )}
        {children && <div className="dh-extra">{children}</div>}
      </div>
    </header>
  );
}
