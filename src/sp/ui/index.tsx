/* ════════════════════════════════════════════════════════════════════
   StrayPaw 2.0 shared primitives.
   ════════════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";
import { ART_SLOTS, INTERIM } from "./slots";
import { FOLK_CUTOUTS, FOLK_PANELS, WORKS, type CutoutKey } from "@/lib/art/sources";

/* ── art slots ───────────────────────────────────────────────────────
   A commissioned artwork belongs here. Until a named artist's licensed
   commission exists, the slot shows an openly licensed existing artwork,
   credited (see INTERIM), or else an honest two-ink geometric plate that
   says it awaits a commission. Never carries data. */
const PLATES: Record<string, (k: number) => ReactNode> = {
  sun: () => (<><circle cx="78" cy="38" r="22" fill="var(--flame)" opacity=".86" /><path d="M0 70 Q30 52 60 66 T120 62 V90 H0Z" fill="var(--indigo)" opacity=".78" /><path d="M0 78 Q34 64 68 76 T120 74" stroke="var(--ink)" strokeWidth=".7" fill="none" opacity=".5" /></>),
  field: () => (<><rect x="10" y="18" width="62" height="54" rx="2" fill="var(--turmeric)" opacity=".8" /><circle cx="78" cy="48" r="24" fill="var(--blue)" opacity=".7" style={{ mixBlendMode: "multiply" }} /><path d="M10 80 H110" stroke="var(--ink)" strokeWidth=".7" opacity=".5" /></>),
  hills: () => (<><path d="M0 90 L34 40 L60 72 L86 30 L120 90Z" fill="var(--leaf)" opacity=".8" /><circle cx="30" cy="26" r="12" fill="var(--flame)" opacity=".85" /><path d="M0 82 H120" stroke="var(--ink)" strokeWidth=".7" opacity=".5" /></>),
  page: () => (<><rect x="18" y="12" width="84" height="66" rx="2" fill="none" stroke="var(--ink)" strokeWidth=".8" opacity=".5" /><rect x="26" y="20" width="40" height="30" fill="var(--terracotta)" opacity=".8" /><path d="M26 58 H94 M26 64 H84 M26 70 H70" stroke="var(--ink)" strokeWidth=".8" opacity=".55" /></>),
};

export function ArtSlot({ id, caption = true, plate, className = "", variant = 0 }: { id: string; caption?: boolean; plate?: keyof typeof PLATES; className?: string; variant?: number }) {
  const s = ART_SLOTS.find((x) => x.id === id);
  if (!s) return null;
  if (s.commission) {
    return (
      <figure className={`art ${className}`} data-slot={s.id}>
        <div className="art-frame" style={{ aspectRatio: String(s.ratio) }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={s.commission.src} alt={s.alt ?? ""} /></div>
        {caption && <figcaption>{s.commission.credit}</figcaption>}
      </figure>
    );
  }
  const it = INTERIM[s.id];
  if (it) {
    const key = it.keys[variant % it.keys.length], ground = it.grounds[variant % it.grounds.length];
    const art = it.kind === "panel" ? FOLK_PANELS[Number(key) % FOLK_PANELS.length] : FOLK_CUTOUTS[key as CutoutKey];
    const w = WORKS[art.work];
    return (
      <figure className={`art is-interim is-${it.kind} ${className}`} data-slot={s.id}>
        <div className="art-frame" style={{ aspectRatio: String(s.ratio), background: ground }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={art.src} alt="" loading="lazy" decoding="async" draggable={false} />
        </div>
        <figcaption>{caption ? <>{w.title}{w.maker ? ` · ${w.maker}` : ""} · {w.licence}{w.adapted ? ", adapted" : ""} · <a className="link" href="/art-credits">credits</a></> : <span className="sr-only">Artwork: {w.title}, {w.maker}, {w.licence}</span>}</figcaption>
      </figure>
    );
  }
  return (
    <figure className={`art is-slot ${className}`} data-slot={s.id} aria-hidden>
      <div className="art-frame" style={{ aspectRatio: String(s.ratio) }}>
        <svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice">{PLATES[plate ?? s.plate]?.(0)}</svg>
        <span className="art-tag">Artwork to be commissioned</span>
      </div>
      {caption && <figcaption>{s.title}</figcaption>}
    </figure>
  );
}

/* ── honest states (decision 046) ─────────────────────────────────── */
export function State({ kind = "empty", title, children, action, art }: { kind?: "empty" | "error" | "forbidden" | "offline" | "loading"; title: ReactNode; children?: ReactNode; action?: ReactNode; art?: string }) {
  return (
    <section className={`state${art ? " has-art" : ""}`} data-kind={kind} role={kind === "error" ? "alert" : "status"}>
      {art && <ArtSlot id={art} caption={false} />}
      <div className="stack" style={{ ["--g" as string]: "10px" }}>
        <h3>{title}</h3>
        {children && <div className="body">{children}</div>}
        {action && <div className="row">{action}</div>}
      </div>
    </section>
  );
}

/* ── page brief: what a working page is for, what to watch, what to do, what happens after ── */
export function PageBrief({ items }: { items: [string, ReactNode][] }) {
  return <dl className="brief">{items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}

/* ── write acknowledgement (decision 043): draft, pending, saved, failed, offline ── */
export type AckState = "draft" | "pending" | "saved" | "failed" | "offline";
export function Ack({ state, children }: { state: AckState; children: ReactNode }) {
  return <span className="ack" data-state={state} role="status" aria-live="polite">{children}</span>;
}

/* ── method line: scope, source, precision and period before any figure ── */
export function Method({ items }: { items: [string, ReactNode][] }) {
  return <p className="method">{items.map(([k, v]) => <span key={k}>{k} <b>{v}</b></span>)}</p>;
}

/* ── a figure that keeps unknown apart from zero ──────────────────── */
export function Figure({ label, value, note, unknown }: { label: string; value: number | string | null | undefined; note?: ReactNode; unknown?: boolean }) {
  const shown = unknown ? "Not known" : value === null || value === undefined ? "—" : typeof value === "number" ? value.toLocaleString("en-IN") : value;
  return <div className="fig"><dt>{label}</dt><dd className={unknown ? "is-unknown" : undefined}>{shown}</dd>{note && <small>{note}</small>}</div>;
}

export const n = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toLocaleString("en-IN"));
export const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "date not recorded");
export function since(iso: string | null | undefined) {
  if (!iso) return "unknown";
  const d = Math.round((Date.now() - Date.parse(iso)) / 86_400_000);
  return d < 1 ? "today" : d === 1 ? "yesterday" : d < 45 ? `${d} days ago` : d < 540 ? `${Math.round(d / 30)} months ago` : `${(d / 365).toFixed(1).replace(/\.0$/, "")} years ago`;
}
