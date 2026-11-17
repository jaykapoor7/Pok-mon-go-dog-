"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, AtSign, Plus, Trash2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { KAJU_SAVED, prefillKaju } from "./AtKaju";
import { toast } from "./kit";
import { Check } from "./ui";
import { addTasks, setTaskDone, type Task, type useTasks } from "./live";
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
export function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
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

/** At most `cap` rows, then "See all n" (a link to the full list), or "Show all n" (opens here) when the list is short
    and has no page of its own; `expand={false}` when the panel's foot already links to the lists it draws from.
    Honest states first: failed says so, reading shows the rows' shape, and empty says what that means. */
export function Rows({ items, cap = 5, total, all, loading, error, empty, retry, expand = true }: { items: Item[] | null; cap?: number; total?: number; all?: { href: string; label?: string }; loading?: boolean; error?: string | null; empty: ReactNode; retry?: () => void; expand?: boolean }) {
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
        : expand ? <button type="button" className="hm-all" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "Show fewer" : `Show all ${fmt(n)}`}</button> : null) : null}
    </>
  );
}

/* ── The person's tasks, on every home ─────────────────────────────
   A task added here, or confirmed in the @Kaju box, shows on the home it was asked from, whatever the place. */

const EASE = [0.2, 0.7, 0.2, 1] as const;
const shortDay = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export function TaskRow({ id, title, meta, chip, done, onToggle, onDelete, href }: { id: string; title: string; meta: string; chip: { text: string; tone: HmTone }; done: boolean; onToggle: () => void; onDelete?: () => void; href?: string }) {
  const calm = useReducedMotion();
  const words = <><b>{title}</b><small><span className={`hm-chip t-${done ? "ok" : chip.tone}`}>{done ? "Done" : chip.text}</span><span className="hm-task-meta">{meta}</span></small></>;
  return (
    <motion.li key={id} layout={calm ? false : "position"} initial={calm ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={calm ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0 }} transition={{ duration: .22, ease: EASE }} className={`hm-task ${done ? "is-done" : ""}`}>
      <Check done={done} onClick={onToggle} label={done ? `Reopen: ${title}` : `Mark done: ${title}`} />
      {href ? <Link href={href} className="hm-task-t">{words}</Link> : <span className="hm-task-t">{words}</span>}
      {onDelete ? <button type="button" className="hm-task-x" aria-label={`Delete: ${title}`} title="Delete" onClick={onDelete}><Trash2 size={16} aria-hidden /></button> : null}
    </motion.li>
  );
}

/** The open tasks of an organisation, five at a time: tick one done, delete one (archived, with Undo), add one by hand.
    `tasks` is the page's own useTasks read, so a page that also counts tasks reads them once. */
export function TasksPanel({ orgId, userId, tasks, id = "t-tasks", title = "Your tasks" }: { orgId: string; userId: string | null; tasks: ReturnType<typeof useTasks>; id?: string; title?: string }) {
  const [text, setText] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const { setRows, reload } = tasks;
  /* Something confirmed in the @Kaju box shows here without reloading the page. */
  useEffect(() => { const on = () => reload(); window.addEventListener(KAJU_SAVED, on); return () => window.removeEventListener(KAJU_SAVED, on); }, [reload]);
  const rows = tasks.rows ?? [], open = rows.filter((t) => t.state === "open"), closed = rows.filter((t) => t.state === "done");
  const today = new Date().toISOString().slice(0, 10);
  const toggle = async (t: Task) => {
    const done = t.state !== "done";
    setRows((r) => r?.map((x) => (x.id === t.id ? { ...x, state: done ? "done" : "open" } : x)) ?? r);
    const r = await setTaskDone(t.id, done, userId);
    if (r.error) { setNote(`Not saved: ${r.error.message}`); reload(); }
  };
  /* Delete archives the task (state "cancelled", which the list leaves out) rather than erasing it, so Undo puts it back
     exactly as it was and an admin can still find it. */
  const remove = async (t: Task) => {
    setNote(null);
    setRows((r) => r?.filter((x) => x.id !== t.id) ?? r);
    const db = getSupabase()!;
    const r = await db.from("nx_tasks").update({ state: "cancelled" }).eq("id", t.id);
    if (r.error) { setNote(`Not deleted: ${r.error.message}`); reload(); return; }
    toast({ text: `Deleted “${t.title}”.`, undo: async () => { await db.from("nx_tasks").update({ state: t.state }).eq("id", t.id); reload(); } });
  };
  const add = async () => { const t = text.trim(); if (!t) return; setNote(null); const r = await addTasks(orgId, [t]); if (r.error) setNote(`Not added: ${r.error.message}`); else { setText(""); reload(); } };
  const row = (t: Task) => <TaskRow key={t.id} id={t.id} title={t.title} done={t.state === "done"} onToggle={() => void toggle(t)} onDelete={() => void remove(t)}
    meta={[t.source_kind === "kaju" ? "Proposed by Kaju, accepted by a person" : t.source_kind === "manual" ? "Added by hand" : t.source_kind, t.record_label, t.assignee_name ?? "Unassigned"].filter(Boolean).join(" · ")}
    chip={t.due_on && t.due_on < today ? { text: "Overdue", tone: "warn" } : t.due_on ? { text: `Due ${shortDay(t.due_on)}`, tone: "plain" } : { text: "Open", tone: "plain" }} />;
  return (
    <Panel id={id} title={title} foot={closed.length ? <button type="button" className="hm-all" aria-expanded={allDone} onClick={() => setAllDone((a) => !a)}>{allDone ? "Hide done" : `Show ${fmt(closed.length)} done`}</button> : undefined}>
      <form className="hm-add" onSubmit={(e) => { e.preventDefault(); void add(); }}><Plus size={16} aria-hidden /><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task and press Enter" aria-label="Add a task" maxLength={240} /></form>
      {note ? <p className="hm-note is-bad" role="alert">{note}</p> : null}
      {tasks.error ? <p className="hm-note is-bad" role="alert">Tasks could not be read: {tasks.error}</p> : tasks.rows === null ? <Rows items={null} empty="" /> : (
        <>
          <ul className="hm-rows" aria-label="Open tasks"><AnimatePresence initial={false} mode="popLayout">{(allOpen ? open : open.slice(0, 5)).map(row)}</AnimatePresence></ul>
          {open.length > 5 ? <button type="button" className="hm-all" aria-expanded={allOpen} onClick={() => setAllOpen((a) => !a)}>{allOpen ? "Show fewer" : `Show all ${fmt(open.length)}`}</button> : null}
          {!rows.length ? <p className="hm-empty">No tasks yet. Add one above, or ask @Kaju: “Add a task: call the vet tomorrow”.</p> : !open.length ? <p className="hm-empty">Every task is done.</p> : null}
          {allDone && closed.length ? <ul className="hm-rows" aria-label="Done tasks"><AnimatePresence initial={false} mode="popLayout">{closed.slice(0, 20).map(row)}</AnimatePresence></ul> : null}
        </>
      )}
    </Panel>
  );
}
