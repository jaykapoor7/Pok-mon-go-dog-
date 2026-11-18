"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/* A compact row of icon actions with their names on hover and keyboard focus (desktop). The name is always the
   button's accessible name, so a screen reader hears it whether or not the tooltip shows. On a touch screen there are
   no tooltips (docs/rebuild/MOBILE.md): phones get the labelled RecordBar "More" sheet instead. */

/** One icon action. `href` makes it a link. */
export function Tool({ label, icon, onClick, href, pressed, disabled, tone }: { label: string; icon: ReactNode; onClick?: () => void; href?: string; pressed?: boolean; disabled?: boolean; tone?: "bad" }) {
  const cls = `nx-ib mo-tip ${tone === "bad" ? "is-bad" : ""}`;
  if (href) return <Link href={href} className={cls} aria-label={label} data-tip={label}>{icon}</Link>;
  return <button type="button" className={cls} aria-label={label} data-tip={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}>{icon}</button>;
}

/** A toolbar: arrow keys move between its actions (WAI-ARIA toolbar pattern), Tab leaves it. */
export function Toolbar({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const key = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const all = [...e.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
    const i = all.indexOf(document.activeElement as HTMLElement); if (i < 0) return;
    e.preventDefault();
    const j = e.key === "Home" ? 0 : e.key === "End" ? all.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + all.length) % all.length;
    all[j]?.focus();
  };
  return <div role="toolbar" aria-label={label} className={`mo-bar-t ${className ?? ""}`} onKeyDown={key}>{children}</div>;
}
