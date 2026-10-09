"use client";

/* ════════════════════════════════════════════════════════════════════
   One dashboard frame for every role.

   Community, NGO and municipality homes are the same instrument with
   different readings: a heading with the place, a row of KPIs, the live
   map as the hero, and a right column holding what needs attention and
   what happened. A role changes the numbers, the map's measure and the
   lists — never the frame, so moving between roles is effortless.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { FolkScene, FolkVignette } from "@/components/art/Folk";
import "./dash.css";

export type Kpi = { label: string; value: number | string | null | undefined; note?: string; tone?: "hot" | "care" | "blue" | "quiet"; href?: string };
export type Item = { key: string; href?: string; title: string; meta?: string; tag?: { text: string; tone?: "hot" | "care" | "open" | "quiet" }; right?: string; thumb?: ReactNode };

const fmt = (v: Kpi["value"]) => (v === null || v === undefined || v === "" ? "—" : typeof v === "number" ? v.toLocaleString("en-IN") : v);

export function Dashboard({ eyebrow, title, subtitle, controls, actions, kpis, map, side, children, art = "home" }: {
  art?: "home" | "care" | "city";
  eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode;
  controls?: ReactNode; actions?: ReactNode;
  kpis: Kpi[]; map: ReactNode; side: ReactNode; children?: ReactNode;
}) {
  return (
    <div className="db">
      <header className="db-head">
        <FolkScene variant={art} className="db-art" />
        <div className="db-head-t">
          {eyebrow && <p className="db-eyebrow">{eyebrow}</p>}
          <h1 className="db-title">{title}</h1>
          {subtitle && <p className="db-sub">{subtitle}</p>}
        </div>
        {(controls || actions) && <div className="db-head-c">{controls}{actions}</div>}
      </header>
      <dl className="db-kpis">
        {kpis.map((k) => {
          const inner = <><dt>{k.label}</dt><dd className={k.tone ? `is-${k.tone}` : ""}>{fmt(k.value)}</dd>{k.note && <p>{k.note}</p>}</>;
          return k.href ? <Link key={k.label} href={k.href} className="db-kpi is-link">{inner}<ArrowUpRight size={15} className="db-kpi-go" aria-hidden /></Link> : <div key={k.label} className="db-kpi">{inner}</div>;
        })}
      </dl>
      <div className="db-main">
        <section className="db-map" aria-label="Live map">{map}</section>
        <aside className="db-side">{side}</aside>
      </div>
      {children && <div className="db-more">{children}</div>}
    </div>
  );
}

export function Panel({ title, action, count, children, className = "" }: { title: string; action?: { label: string; href: string }; count?: number | string; children: ReactNode; className?: string }) {
  return (
    <section className={`db-panel ${className}`} aria-label={title}>
      <header>
        <h2>{title}{count !== undefined && <span className="db-count">{typeof count === "number" ? count.toLocaleString("en-IN") : count}</span>}</h2>
        {action && <Link href={action.href}>{action.label} <ArrowUpRight size={14} aria-hidden /></Link>}
      </header>
      <div className="db-panel-b">{children}</div>
    </section>
  );
}

export function ItemList({ items, empty, loading }: { items: Item[]; empty: ReactNode; loading?: boolean }) {
  if (loading) return <ul className="db-items is-loading" aria-busy="true">{[0, 1, 2, 3].map((i) => <li key={i}><span className="db-skel" /></li>)}</ul>;
  if (!items.length) return <div className="db-empty"><FolkVignette className="db-empty-art" tone="rest" /><p>{empty}</p></div>;
  return (
    <ul className="db-items">
      {items.map((it) => {
        const body = <>
          {it.thumb ?? <i className={`db-dot ${it.tag?.tone ? `is-${it.tag.tone}` : ""}`} aria-hidden />}
          <span className="db-item-t"><b>{it.title}</b>{it.meta && <small>{it.meta}</small>}</span>
          <span className="db-item-r">{it.tag && <em className={`is-${it.tag.tone ?? "quiet"}`}>{it.tag.text}</em>}{it.right && <small>{it.right}</small>}</span>
        </>;
        return <li key={it.key}>{it.href ? <Link href={it.href}>{body}</Link> : <div>{body}</div>}</li>;
      })}
    </ul>
  );
}

export function Feed({ items, empty, loading }: { items: Item[]; empty: ReactNode; loading?: boolean }) {
  if (loading) return <ol className="db-feed is-loading">{[0, 1, 2].map((i) => <li key={i}><span className="db-skel" /></li>)}</ol>;
  if (!items.length) return <p className="db-empty">{empty}</p>;
  return (
    <ol className="db-feed">
      {items.map((it) => {
        const body = <><i className={`db-dot ${it.tag?.tone ? `is-${it.tag.tone}` : ""}`} aria-hidden /><span><b>{it.title}</b>{it.meta && <small>{it.meta}</small>}</span>{it.right && <time>{it.right}</time>}</>;
        return <li key={it.key}>{it.href ? <Link href={it.href}>{body}</Link> : <div>{body}</div>}</li>;
      })}
    </ol>
  );
}

export function MapChips<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="db-mapchips" role="group" aria-label={label}>
      {options.map((o) => <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>)}
    </div>
  );
}
