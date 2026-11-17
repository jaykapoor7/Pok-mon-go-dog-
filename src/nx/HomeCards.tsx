"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, AtSign } from "lucide-react";
import { prefillKaju } from "./AtKaju";
import "./css/home.css";

/* The parts every home is built from (DESIGN.md 4.0, "No long columns"): a row of figures, each with a small honest
   picture of what it counts and a link to the list it counts; and panels that sit side by side, each showing at most
   five rows with "See all n" one click away. A figure that could not be read says so; it is never shown as zero. */

export type HmTone = "plain" | "blue" | "ok" | "warn" | "bad";

/** A count from a read: a number, `undefined` while reading, or `null` when the read failed. */
export type Count = number | null | undefined;
const fmt = (n: number) => n.toLocaleString("en-IN");

export function Tiles({ children, label = "Figures" }: { children: ReactNode; label?: string }) {
  return <div className="hm-tiles" role="list" aria-label={label}>{children}</div>;
}

/** One figure. `n` undefined shows that it is being read; null shows "Not read". `text` replaces the number (e.g. "93%"). */
export function Tile({ label, n, text, href, tone = "plain", note, visual }: { label: string; n?: Count; text?: string; href?: string; tone?: HmTone; note?: ReactNode; visual?: ReactNode }) {
  const known = text !== undefined || typeof n === "number";
  const body = (
    <>
      <span className="hm-tile-l">{label}{href ? <ArrowRight size={14} aria-hidden /> : null}</span>
      <span className={`hm-tile-n ${known && tone !== "plain" ? `t-${tone}` : ""}`}>
        {text !== undefined ? text : typeof n === "number" ? fmt(n) : n === null ? <span className="hm-unread">Not read</span> : <span className="hm-skel is-n" aria-label="Reading" />}
      </span>
      {note ? <span className="hm-tile-note">{note}</span> : null}
      {visual && known ? <span className="hm-tile-v">{visual}</span> : null}
    </>
  );
  return <div role="listitem" className="hm-tile-w">{href ? <Link href={href} className="hm-tile is-link">{body}</Link> : <div className="hm-tile">{body}</div>}</div>;
}

/** A bar showing part of a whole, with the sentence that says it. Nothing is drawn when the whole is unknown or zero. */
export function Meter({ part, whole, tone = "blue", label, mark }: { part: number; whole: number; tone?: HmTone; label: ReactNode; mark?: number }) {
  const w = whole > 0 ? Math.max(0, Math.min(1, part / whole)) : 0;
  return (
    <span className="hm-meter">
      <span className="hm-track" aria-hidden>{whole > 0 ? <i className={`t-${tone}`} style={{ width: `${(w * 100).toFixed(1)}%` }} /> : null}{mark !== undefined ? <b className="hm-mark" style={{ left: `${mark * 100}%` }} /> : null}</span>
      <small>{label}</small>
    </span>
  );
}

/** One bar split into parts (overdue, today, later), with a legend that carries the numbers. */
export function Split({ parts }: { parts: { n: number; tone: HmTone; label: string }[] }) {
  const total = parts.reduce((a, p) => a + p.n, 0);
  return (
    <span className="hm-split">
      <span className="hm-track is-split" aria-hidden>{total ? parts.filter((p) => p.n > 0).map((p) => <i key={p.label} className={`t-${p.tone}`} style={{ flexGrow: p.n }} />) : null}</span>
      <span className="hm-legend">{parts.map((p) => <span key={p.label}><i className={`t-${p.tone}`} aria-hidden />{fmt(p.n)} {p.label}</span>)}</span>
    </span>
  );
}

/** Small columns for a short series (days, weeks, stages). The label says what the columns show. */
export function MiniBars({ values, label, tone = "blue" }: { values: { key: string; n: number; tone?: HmTone }[]; label: string; tone?: HmTone }) {
  const max = Math.max(1, ...values.map((v) => v.n));
  return (
    <span className="hm-bars-w">
      <span className="hm-bars" role="img" aria-label={`${label}: ${values.map((v) => `${v.key} ${v.n}`).join(", ")}`}>
        {values.map((v) => <span key={v.key} className="hm-bar" title={`${v.key}: ${v.n}`}><i className={`t-${v.tone ?? tone}`} style={{ height: `${v.n ? Math.max(8, (v.n / max) * 100) : 0}%` }} /></span>)}
      </span>
      <small aria-hidden>{label}</small>
    </span>
  );
}

/** Panels that sit side by side on a wide screen and stack on a phone. `cols` is how many fit in a row at full width. */
export function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={`hm-grid is-${cols}`}>{children}</div>;
}

export function Panel({ id, title, count, children, foot, tone }: { id: string; title: string; count?: Count; children: ReactNode; foot?: ReactNode; tone?: HmTone }) {
  return (
    <section className={`hm-panel ${tone ? `t-${tone}` : ""}`} aria-labelledby={id}>
      <div className="hm-panel-h"><h2 id={id}>{title}</h2>{typeof count === "number" ? <span className="hm-count">{fmt(count)}</span> : null}</div>
      <div className="hm-panel-b">{children}</div>
      {foot ? <div className="hm-panel-f">{foot}</div> : null}
    </section>
  );
}

export type Item = { id: string; title: ReactNode; meta?: ReactNode; href?: string; chip?: { text: string; tone: HmTone }; icon?: ReactNode; tone?: HmTone; kaju?: string; kajuLabel?: string; end?: ReactNode };

function Row({ it }: { it: Item }) {
  const inner = <><span className={`hm-row-i t-${it.tone ?? "plain"}`} aria-hidden>{it.icon}</span><span className="hm-row-t"><b>{it.title}</b>{it.chip || it.meta ? <small>{it.chip ? <span className={`hm-chip t-${it.chip.tone}`}>{it.chip.text}</span> : null}{it.meta ? <span className="hm-row-meta">{it.meta}</span> : null}</small> : null}</span></>;
  return (
    <li className={`hm-row ${it.kaju ? "has-ask" : ""}`}>
      {it.href ? <Link href={it.href} className="hm-row-m">{inner}</Link> : <div className="hm-row-m">{inner}</div>}
      {it.end}
      {it.kaju ? <button type="button" className="hm-ask" aria-label={it.kajuLabel ?? "Put this in the @Kaju box"} title="Put this in the @Kaju box" onClick={() => prefillKaju(it.kaju!)}><AtSign size={16} aria-hidden /></button> : null}
    </li>
  );
}

/** A short row of cards under the panels (what Kaju is waiting on, what it noticed): at most `cap`, then a link to the
    rest. With nothing in it, it is one line, not an empty box. */
export function Strip({ id, title, items, cap = 3, all, empty, error, retry }: { id: string; title: string; items: Item[] | null | undefined; cap?: number; all?: { href: string; label: string }; empty: ReactNode; error?: string | null; retry?: () => void }) {
  const list = items ?? [];
  return (
    <section className="hm-strip" aria-labelledby={id}>
      <div className="hm-strip-h">
        <h2 id={id}>{title}</h2>{list.length ? <span className="hm-count">{fmt(list.length)}</span> : null}
        {error ? <span className="hm-note is-bad" role="alert">{error}{retry ? <> <button type="button" className="hm-link" onClick={retry}>Try again</button></> : null}</span>
          : items === null || items === undefined ? <span className="hm-skel is-line" aria-label="Reading" />
          : !list.length ? <span className="hm-strip-none">{empty}</span> : null}
        {all ? <Link href={all.href} className="hm-all">{list.length > cap ? `${all.label} (${fmt(list.length)})` : all.label}<ArrowRight size={14} aria-hidden /></Link> : null}
      </div>
      {list.length ? <ul className="hm-strip-l">{list.slice(0, cap).map((it) => (
        <li key={it.id}>{(() => { const inner = <><span className={`hm-row-i t-${it.tone ?? "plain"}`} aria-hidden>{it.icon}</span><span className="hm-row-t"><b>{it.title}</b>{it.chip || it.meta ? <small>{it.chip ? <span className={`hm-chip t-${it.chip.tone}`}>{it.chip.text}</span> : null}{it.meta ? <span className="hm-row-meta">{it.meta}</span> : null}</small> : null}{it.end}</span></>;
          return it.href ? <Link href={it.href} className="hm-card">{inner}</Link> : <div className="hm-card">{inner}</div>; })()}</li>))}</ul> : null}
    </section>
  );
}

/** At most `cap` rows, then "See all n" (a link to the full list) or "Show all n" (opens here). Honest states first. */
export function Rows({ items, cap = 5, total, all, loading, error, empty, retry }: { items: Item[] | null; cap?: number; total?: number; all?: { href: string; label?: string }; loading?: boolean; error?: string | null; empty: ReactNode; retry?: () => void }) {
  const [open, setOpen] = useState(false);
  if (error) return <div className="hm-fail" role="alert"><p>{error} Nothing is shown as zero.</p>{retry ? <button type="button" className="hm-btn" onClick={retry}>Try again</button> : null}</div>;
  if (loading || items === null) return <ul className="hm-rows" aria-label="Reading">{[0, 1, 2].map((i) => <li key={i} className="hm-row is-skel"><span className="hm-skel is-i" /><span className="hm-skel is-t" /></li>)}</ul>;
  if (!items.length) return <p className="hm-empty">{empty}</p>;
  const n = total ?? items.length;
  const shown = open ? items : items.slice(0, cap);
  return (
    <>
      <ul className="hm-rows">{shown.map((it) => <Row key={it.id} it={it} />)}</ul>
      {n > cap ? (all ? <Link href={all.href} className="hm-all">{all.label ?? `See all ${fmt(n)}`}<ArrowRight size={14} aria-hidden /></Link>
        : <button type="button" className="hm-all" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "Show fewer" : `Show all ${fmt(n)}`}</button>) : null}
    </>
  );
}
