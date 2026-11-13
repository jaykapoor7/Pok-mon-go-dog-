"use client";

/* ════════════════════════════════════════════════════════════════════
   The page kit: what every page inside the workspace is built from.

   The rules it encodes (read these before building a page):

   1. One column. <Page> sets the width and the gutters; nothing sets its
      own. A page starts with <Head>: the title, ONE sentence saying what
      matters now, and at most two actions on the right.
   2. Data is a table or a list of rows, never a stack of cards. A row is
      40px, says what the thing is and what it needs, and opens the record
      (in a peek) when clicked. Use <Table> when a record has several
      facts to compare down a column; <Rows> when it is a title and a line.
   3. No lines around anything. A surface is white on the sheet with a
      soft shadow (<Panel>); rows inside it are divided by a hairline.
      Space and a small heading separate sections (<Section>).
   4. A page should fit in about one and a half screens. Put the second
      thing beside the first (<Split>), fold what is rarely needed
      (<Section fold>), and cap a long list (<More>), before letting a
      page run long.
   5. Each fact once. If the head's sentence says it, no tile repeats it.
   6. Figures go in a quiet strip (<Stats>), three to five, no boxes.
   7. Status is a <Tag>; colour means something (flame: urgent or overdue,
      amber: waiting, green: done or accepted, blue: new or yours).
   8. Controls are 32px, radius 8; primary is blue, one per page.

   Spacing 4/8/12/16/24/32, radius 4/8/12, type 12/14/16/20/24.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronRight, Search } from "lucide-react";
import { usePageState } from "./store";
import "./kit.css";

type Tone = "flame" | "amber" | "green" | "blue" | "violet" | "teal" | "plain";

export function Page({ children, width = "default", className = "" }: { children: ReactNode; width?: "default" | "narrow" | "wide" | "full"; className?: string }) {
  return <div className={`k-page is-${width} ${className}`}>{children}</div>;
}

/** Title, one sentence, actions. `sum` is the sentence: what waits, what is late, what to do. */
export function Head({ title, sum, actions, eyebrow }: { title: ReactNode; sum?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="k-head">
      <div className="k-head-t">{eyebrow ? <p className="k-eyebrow">{eyebrow}</p> : null}<h1 className="k-title">{title}</h1>{sum ? <p className="k-sum" aria-live="polite">{sum}</p> : null}</div>
      {actions ? <div className="k-acts">{actions}</div> : null}
    </header>
  );
}

/** One row of controls above the data: lanes or filters on the left, search and the rest on the right. */
export function Tools({ children, end }: { children?: ReactNode; end?: ReactNode }) {
  return <div className="k-tools"><div className="k-tools-l">{children}</div>{end ? <div className="k-tools-r">{end}</div> : null}</div>;
}

export type Lane<T extends string> = { id: T; label: string; count?: number | null; tone?: Tone };
/** A choice between a few lists of the same thing ("Waiting for you", "With others", "Done"). */
export function Lanes<T extends string>({ label, lanes, value, onChange }: { label: string; lanes: Lane<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="k-lanes" role="group" aria-label={label}>
      {lanes.map((l) => <button key={l.id} type="button" aria-pressed={value === l.id} onClick={() => onChange(l.id)}>{l.label}{l.count !== undefined && l.count !== null ? <b data-tone={l.tone}>{l.count}</b> : null}</button>)}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = "Search", label = "Search" }: { value: string; onChange: (v: string) => void; placeholder?: string; label?: string }) {
  return <label className="k-search"><Search size={14} aria-hidden /><input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} /></label>;
}

/** A white surface on the sheet. Tables and row lists go straight inside; give `pad` for prose or a form. */
export function Panel({ children, pad = false, className = "", ...rest }: { children: ReactNode; pad?: boolean; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`k-panel${pad ? " is-pad" : ""} ${className}`} {...rest}>{children}</div>;
}

/* ── table ────────────────────────────────────────────────────────── */
export type Col<R> = { key: string; label: string; /** A CSS track: "minmax(0,2fr)", "120px", "auto". */ width?: string; align?: "end"; /** Hidden on phones; the first column and any with `keep` stay. */ keep?: boolean; render: (r: R) => ReactNode };
/** Records with several facts each. The first column is the record's name and carries the row's link. */
export function Table<R>({ cols, rows, rowKey, href, label, empty, onRow }: { cols: Col<R>[]; rows: R[]; rowKey: (r: R) => string; /** Where a row opens. A record address opens in a peek. */ href?: (r: R) => string | null; label: string; empty?: ReactNode; onRow?: (r: R) => void }) {
  const tracks = cols.map((c) => c.width ?? "minmax(0, 1fr)").join(" ");
  const phone = cols.filter((c, i) => i === 0 || c.keep).map((c) => c.width ?? "minmax(0, 1fr)").join(" ");
  if (!rows.length) return <>{empty ?? null}</>;
  return (
    <div className="k-table" role="table" aria-label={label} style={{ ["--k-cols" as string]: tracks, ["--k-cols-s" as string]: phone } as CSSProperties}>
      <div className="k-tr k-th" role="row">{cols.map((c, i) => <span key={c.key} role="columnheader" className={`${c.align === "end" ? "is-end" : ""}${i === 0 || c.keep ? "" : " is-wide"}`}>{c.label}</span>)}</div>
      {rows.map((r) => {
        const to = href?.(r) ?? null;
        /* A row that opens a record stays a row for a screen reader; its first cell is the link, stretched over the whole row. */
        const cells = cols.map((c, i) => <span key={c.key} role="cell" data-l={i === 0 || c.keep || typeof c.label !== "string" ? undefined : c.label} className={`${c.align === "end" ? "is-end" : ""}${i === 0 ? " k-td-main" : ""}${i === 0 || c.keep ? "" : " is-wide"}`}>{i === 0 && to ? <Link href={to} className="k-tr-a">{c.render(r)}</Link> : c.render(r)}</span>);
        return to ? <div key={rowKey(r)} className="k-tr is-link" role="row">{cells}</div>
          : onRow ? <div key={rowKey(r)} className="k-tr is-click" role="row" tabIndex={0} onClick={() => onRow(r)} onKeyDown={(e) => { if (e.key === "Enter") onRow(r); }}>{cells}</div>
          : <div key={rowKey(r)} className="k-tr" role="row">{cells}</div>;
      })}
    </div>
  );
}

/* ── rows ─────────────────────────────────────────────────────────── */
/** A list of things that are a name and a line. */
export function Rows({ children, label }: { children: ReactNode; label?: string }) { return <ul className="k-rows" aria-label={label}>{children}</ul>; }
export function Row({ href, onClick, icon, tone, title, meta, end, go = true }: { href?: string; onClick?: () => void; icon?: ReactNode; tone?: Tone; title: ReactNode; meta?: ReactNode; /** Tags, a count, a small control. */ end?: ReactNode; go?: boolean }) {
  const inner = <>
    {icon ? <span className="k-row-i" data-tone={tone} aria-hidden>{icon}</span> : null}
    <span className="k-row-t"><b>{title}</b>{meta ? <small>{meta}</small> : null}</span>
    {end ? <span className="k-row-e">{end}</span> : null}
    {go && (href || onClick) ? <ChevronRight size={14} aria-hidden className="k-row-go" /> : null}
  </>;
  return <li>{href ? <Link href={href} className="k-row">{inner}</Link> : onClick ? <button type="button" className="k-row" onClick={onClick}>{inner}</button> : <div className="k-row">{inner}</div>}</li>;
}

/** Past `cap`, a list shows a "Show all n" control instead of running on. */
export function More<T>({ items, cap = 8, children, noun = "" }: { items: T[]; cap?: number; children: (shown: T[]) => ReactNode; noun?: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, cap);
  return <>{children(shown)}{items.length > cap ? <button type="button" className="k-more" onClick={() => setAll((v) => !v)}>{all ? "Show fewer" : `Show all ${items.length}${noun ? ` ${noun}` : ""}`}</button> : null}</>;
}

/* ── sections, columns, figures ───────────────────────────────────── */
/** A part of a page: a small heading, a count, an action. `fold` gives it a name to remember being folded under. */
export function Section({ title, count, action, children, fold, open = true, note }: { title: ReactNode; count?: number | string | null; action?: ReactNode; children: ReactNode; /** A stable name: makes the section foldable and remembers it. */ fold?: string; open?: boolean; note?: ReactNode }) {
  const [isOpen, setOpen] = usePageState<boolean>(`sec:${fold ?? "-"}`, open);
  const shown = fold ? isOpen : true;
  return (
    <section className={`k-sec${shown ? "" : " is-folded"}`}>
      <div className="k-sec-h">
        {fold ? <button type="button" className="k-sec-t" aria-expanded={shown} onClick={() => setOpen(!shown)}><ChevronRight size={14} aria-hidden /><h2>{title}</h2>{count !== undefined && count !== null ? <b>{count}</b> : null}</button>
          : <div className="k-sec-t"><h2>{title}</h2>{count !== undefined && count !== null ? <b>{count}</b> : null}</div>}
        {note && shown ? <span className="k-sec-n">{note}</span> : null}
        {action ? <span className="k-sec-a">{action}</span> : null}
      </div>
      {shown ? children : null}
    </section>
  );
}

/** Two things side by side on a wide screen: the work, and what goes with it (about 320px). */
export function Split({ children, side }: { children: ReactNode; side: ReactNode }) {
  return <div className="k-split"><div className="k-split-m">{children}</div><aside className="k-split-s">{side}</aside></div>;
}

export type Stat = { label: string; value: ReactNode; tone?: Tone; href?: string; note?: ReactNode };
/** Three to five figures in a row. A figure that cannot be read says so; it is never shown as zero. */
export function Stats({ items, label }: { items: Stat[]; label?: string }) {
  return (
    <dl className="k-stats" aria-label={label}>
      {items.map((s) => { const body = <><dt>{s.label}</dt><dd data-tone={s.tone}>{s.value}</dd>{s.note ? <small>{s.note}</small> : null}</>; return s.href ? <Link key={s.label} href={s.href} className="k-stat">{body}</Link> : <div key={s.label} className="k-stat">{body}</div>; })}
    </dl>
  );
}

/** A record's facts: a label and a value per line. */
export function Props({ items }: { items: { label: string; icon?: ReactNode; value: ReactNode }[] }) {
  return <dl className="k-props">{items.map((p) => <div key={p.label}><dt>{p.icon ? <span aria-hidden>{p.icon}</span> : null}{p.label}</dt><dd>{p.value}</dd></div>)}</dl>;
}

/* ── small parts ──────────────────────────────────────────────────── */
export function Tag({ tone = "plain", children, dot = false }: { tone?: Tone; children: ReactNode; dot?: boolean }) { return <span className={`k-tag${dot ? " has-dot" : ""}`} data-tone={tone}>{children}</span>; }

type BtnProps = { children: ReactNode; variant?: "primary" | "plain" | "quiet" | "danger"; small?: boolean; icon?: ReactNode; href?: string; className?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">;
export function Btn({ children, variant = "plain", small = false, icon, href, className = "", ...rest }: BtnProps) {
  const cls = `k-btn is-${variant}${small ? " is-s" : ""} ${className}`;
  const inner = <>{icon ? <span className="k-btn-i" aria-hidden>{icon}</span> : null}<span>{children}</span></>;
  return href ? <Link href={href} className={cls}>{inner}</Link> : <button type="button" className={cls} {...rest}>{inner}</button>;
}

export function Empty({ title, children, action, icon }: { title: ReactNode; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return <div className="k-empty" role="status">{icon ? <span className="k-empty-i" aria-hidden>{icon}</span> : null}<b>{title}</b>{children ? <p>{children}</p> : null}{action}</div>;
}
export function Note({ tone = "plain", children, action }: { tone?: "plain" | "amber" | "flame" | "blue"; children: ReactNode; action?: ReactNode }) {
  return <p className="k-note" data-tone={tone} role={tone === "flame" ? "alert" : "note"}><span>{children}</span>{action}</p>;
}

/* ── board ────────────────────────────────────────────────────────── */
/** Records grouped by stage, a column each. Cards are the only "cards" in the product. */
/** A board by stage. On a phone it shows one stage at a time: the stages become a row of buttons above it and the columns swipe sideways. */
export function Board({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [stages, setStages] = useState<{ t: string; n: string }[]>([]);
  const [on, setOn] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const read = () => { const next = [...el.children].map((c) => ({ t: c.querySelector("h2")?.textContent ?? "", n: c.querySelector(".k-col-h b")?.textContent ?? "" })); setStages((cur) => (JSON.stringify(cur) === JSON.stringify(next) ? cur : next)); };
    const where = () => { let best = 0, d = Infinity; [...el.children].forEach((c, i) => { const x = Math.abs((c as HTMLElement).offsetLeft - el.offsetLeft - el.scrollLeft); if (x < d) { d = x; best = i; } }); setOn(best); };
    read(); where();
    const mo = new MutationObserver(read); mo.observe(el, { childList: true, subtree: true, characterData: true });
    el.addEventListener("scroll", where, { passive: true });
    return () => { mo.disconnect(); el.removeEventListener("scroll", where); };
  }, []);
  const go = (i: number) => { const el = ref.current, c = el?.children[i] as HTMLElement | undefined; if (el && c) el.scrollTo({ left: c.offsetLeft - el.offsetLeft, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };
  return (
    <>
      {stages.length > 1 ? <div className="k-board-tabs" role="group" aria-label={`${label}: choose a stage`}>{stages.map((s, i) => <button key={i} type="button" aria-pressed={i === on} onClick={() => go(i)}>{s.t}{s.n ? <b>{s.n}</b> : null}</button>)}</div> : null}
      <div ref={ref} className="k-board" role="list" aria-label={label}>{children}</div>
    </>
  );
}
export function Column({ title, count, note, children, footer, mine = false }: { title: ReactNode; count?: number | null; note?: ReactNode; children: ReactNode; footer?: ReactNode; mine?: boolean }) {
  return (
    <section className={`k-col${mine ? " is-mine" : ""}`} role="listitem">
      <header className="k-col-h"><h2>{title}</h2>{count !== undefined && count !== null ? <b>{count}</b> : null}{note ? <small>{note}</small> : null}</header>
      <div className="k-col-b">{children}</div>
      {footer ? <div className="k-col-f">{footer}</div> : null}
    </section>
  );
}
export function Card({ href, code, title, meta, end, hot = false }: { href: string; code?: ReactNode; title: ReactNode; meta?: ReactNode; end?: ReactNode; hot?: boolean }) {
  return <Link href={href} className={`k-card${hot ? " is-hot" : ""}`}>{code ? <span className="k-card-c">{code}</span> : null}<b>{title}</b>{meta ? <small>{meta}</small> : null}{end ? <span className="k-card-e">{end}</span> : null}</Link>;
}
