"use client";

/* ════════════════════════════════════════════════════════════════════
   The plate every in-app page opens on.

   An editorial document heading with the actual place, purpose, figures
   and actions. Geography belongs in the working map, not in a hidden
   decorative background fetch. Loading figures read as dashes, not zero.
   ════════════════════════════════════════════════════════════════════ */

import { FOLK_CUTOUTS, type CutoutKey } from "@/lib/art/sources";
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

export type DeskFigure = { label: string; value: number | string | null | undefined; tone?: "attention" | "quiet"; href?: string };

const fmt = (v: DeskFigure["value"]) => (v === null || v === undefined || v === "" ? "—" : typeof v === "number" ? v.toLocaleString("en-IN") : v);

export function DeskHeader({ kicker, title, lede, figures, actions, city, ground: withGround = true, children }: {
  kicker?: string;
  title: ReactNode;
  lede?: ReactNode;
  figures?: DeskFigure[];
  actions?: ReactNode;
  /** Recorded place; falls back to organisation context when omitted. */
  city?: string | null;
  /** False where no place is chosen yet: a screen must not show another city meanwhile. */
  ground?: boolean;
  /** Anything that belongs in the plate beneath the figures (a place picker, a tab row). */
  children?: ReactNode;
}) {
  const spacePlace = useContext(DeskPlace);
  const place = city === undefined ? spacePlace : city;

  /* A painted animal in the corner (desktop only), fixed per page. */
  const keys = Object.keys(FOLK_CUTOUTS).filter((k) => k !== "dogStanding") as CutoutKey[];
  const seed = `${kicker ?? ""}${typeof title === "string" ? title : ""}`;
  let h = 7; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const art = FOLK_CUTOUTS[keys[h % keys.length]];

  return (
    <header className="dh dh-editorial">
      <img className="dh-art" src={art.src} alt="" aria-hidden loading="lazy" decoding="async" draggable={false} />
      <div className="dh-in">
        <div className="dh-copy">
          {(kicker || (withGround && place)) && <p className="dh-kicker">{[kicker, withGround ? place : null].filter(Boolean).join(" · ")}</p>}
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
