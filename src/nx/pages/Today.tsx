"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowRight, CalendarClock, Camera, Hand, ListChecks, Plus, Sparkles, Trash2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { dueFollowups, opsCounts, type OpsCounts } from "@/lib/ops";
import { toast } from "../kit";
import { Shell } from "../Shell";
import { Check, Sample } from "../ui";
import { AtKaju, KAJU_SAVED } from "../AtKaju";
import { Grid, Meter, Panel, Rows, Split, Strip, Tile, Tiles, type Count, type HmTone, type Item } from "../HomeCards";
import { FIGS, ME, ORG, PREPARED, VISITS_OPS, WORK, type Work } from "../fixtures";
import { addTasks, setTaskDone, useLive, useTasks, type Task } from "../live";
import { readAnimalRefs } from "../data/animals";
import { animalLine, withAnimalName } from "../animalLabel";
import "../field.css";

/* Today, an NGO's home. One line to Kaju; four figures, each with a picture of what it counts and a link to its list;
   then what needs attention, the person's tasks and what Kaju is waiting on, side by side, five rows each. Every figure
   is a count the database returned; a read that failed says "Not read", never zero. Signed out, the same page shows the
   labelled sample organisation. */

const EASE = [0.2, 0.7, 0.2, 1] as const;
function greeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }
const dateLine = () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
const shortDay = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;
/** SPC-47A86E67E8E4… reads as SPC-47A86E (as data/ngo shortCode). */
const shortCode = (code: string | null | undefined, fallback: string) => { if (!code) return fallback; const m = /^([A-Z]{2,5}(?:-[A-Z]{2,5})?)-([0-9A-F]{12,})$/i.exec(code); return m ? `${m[1]}-${m[2].slice(0, 6).toUpperCase()}` : code; };

/* ── Sample organisation (signed out) ─────────────────────────────── */

const VISIT_TONE: Record<string, HmTone> = { Overdue: "warn", Today: "blue", Tomorrow: "plain", "This week": "plain" };
const VISIT_ORDER = ["Overdue", "Today", "Tomorrow", "This week"];

function TaskRow({ id, title, meta, chip, done, onToggle, onDelete, href }: { id: string; title: string; meta: string; chip: { text: string; tone: HmTone }; done: boolean; onToggle: () => void; onDelete?: () => void; href?: string }) {
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

function SampleToday() {
  const [done, setDone] = useState<string[]>([]);
  const [all, setAll] = useState(false);
  const toggle = (id: string) => setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  const open = WORK.filter((w) => !done.includes(w.id)), closed = done.map((id) => WORK.find((w) => w.id === id)!).reverse();
  const date = useMemo(dateLine, []);
  const visits = [...VISITS_OPS].sort((a, b) => VISIT_ORDER.indexOf(a.day) - VISIT_ORDER.indexOf(b.day));
  const n = (d: string) => VISITS_OPS.filter((v) => v.day === d).length;
  const row = (w: Work, isDone: boolean) => <TaskRow key={w.id} id={w.id} title={w.title} meta={`${w.ref} · ${w.kind} · ${w.place} · ${w.who}`} chip={{ text: w.state, tone: w.tone === "accent" ? "blue" : w.tone === "bad" ? "bad" : w.tone === "warn" ? "warn" : w.tone === "ok" ? "ok" : "plain" }} done={isDone} onToggle={() => toggle(w.id)} href={w.animal ? `/ngo/animals/${w.animal}` : undefined} />;
  const [evDone, evAll] = [214, 230];
  return (
    <Shell crumb={["Today"]}>
      <div className="nx-page hm-page">
        <div className="nx-head">
          <div>
            <p className="nx-eyebrow">{date} · {ORG.city}<Sample /></p>
            <h1 className="nx-h1">{greeting()}, {ME.name}</h1>
            <p className="nx-sub"><b className="num">{open.length}</b> {open.length === 1 ? "thing needs" : "things need"} you. Kaju has prepared {PREPARED.length}.</p>
          </div>
          <Link href="/try" className="nx-btn" title="Opens the live demo, where this works"><Plus size={14} />New case</Link>
        </div>
        <AtKaju role="ngo" />
        <Tiles>
          <Tile label="Visits overdue" n={n("Overdue")} tone="warn" href="/ngo/operations" visual={<Split parts={[{ n: n("Overdue"), tone: "warn", label: "overdue" }, { n: n("Today"), tone: "blue", label: "today" }, { n: n("Tomorrow") + n("This week"), tone: "plain", label: "later this week" }]} />} />
          <Tile label="Open cases" text={FIGS[0].n} href="/ngo/cases" visual={<Meter part={6} whole={28} tone="blue" label={FIGS[0].note} />} />
          <Tile label="Evidence complete" text={FIGS[2].n} href="/ngo/submissions" visual={<Meter part={evDone} whole={evAll} tone="ok" label={FIGS[2].note} />} />
          <Tile label="Waiting on partners" text={FIGS[3].n} href="/ngo/programmes" note="Requests a partner has not answered yet" />
        </Tiles>
        <Grid cols={3}>
          <Panel id="t-work" title="My work">
            <ul className="hm-rows">
              <AnimatePresence initial={false} mode="popLayout">{(all ? open : open.slice(0, 5)).map((w) => row(w, false))}</AnimatePresence>
            </ul>
            {open.length > 5 ? <button type="button" className="hm-all" aria-expanded={all} onClick={() => setAll((a) => !a)}>{all ? "Show fewer" : `Show all ${open.length}`}</button> : null}
            {closed.length ? <ul className="hm-rows" aria-label="Done"><AnimatePresence initial={false} mode="popLayout">{closed.slice(0, 3).map((w) => row(w, true))}</AnimatePresence></ul> : null}
          </Panel>
          <Panel id="t-visits" title="Visits due" foot={<span>Grouped by day; plan the round on Operations.</span>}>
            <Rows items={visits.map((v) => ({ id: v.id, title: v.what, meta: `${v.place} · ${v.who}`, href: v.animal ? `/ngo/animals/${v.animal}` : "/ngo/operations", icon: <CalendarClock size={16} />, tone: VISIT_TONE[v.day], chip: { text: v.day === "Overdue" ? `Overdue · ${v.when}` : v.when, tone: VISIT_TONE[v.day] } }))} total={visits.length} all={{ href: "/ngo/operations" }} empty="No visits due in the next 7 days." />
          </Panel>
          <Panel id="t-kaju" title="Kaju prepared" foot={<span>Nothing is sent or saved until you approve it.</span>}>
            <Rows items={PREPARED.map((p) => ({ id: p.title, title: p.title, meta: p.body, href: "/try", icon: <Sparkles size={16} />, tone: "blue" as const, chip: { text: p.act, tone: "blue" as const } }))} empty="Nothing is waiting for your approval." />
          </Panel>
        </Grid>
        <Link href="/try" className="nx-btn nx-capture" title="Opens the live demo, where this works"><Camera size={16} />Capture a field update</Link>
      </div>
    </Shell>
  );
}

/* ── A signed-in organisation ─────────────────────────────────────── */

const CRITICAL = ["Road accident", "Maggot wound", "Human abuse", "Dog bite", "Entrapment", "Suspected rabies"];
const CURRENT = "provenance.is.null,provenance.neq.imported_historical_record,reviewed_at.not.is.null";
type Visit = { id: string; at: number; day: "Overdue" | "Today" | "Later"; when: string; what: string; place: string; who: string; href?: string };
type Crit = { id: string; code: string; title: string; condition: string; zone: string | null; who: string | null; at: string | null };
type Herd = { total: number; sterilised: number; vaccinated: number; help: number };
type MissionWait = { id: string; title: string; state: string; step: string | null; at: string };

function dayOf(iso: string): Visit["day"] {
  const d = new Date(iso), t = new Date(); t.setHours(0, 0, 0, 0);
  const k = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - t.getTime()) / 864e5);
  return k < 0 ? "Overdue" : k === 0 ? "Today" : "Later";
}
const imported = (src: string | null | undefined) => src === "historical_import" || src === "imported_historical_record";

/** The field visits Operations lists: follow-ups due within a week and open cases whose own date has come, imported
    registers left out (they are never counted as overdue work). The same reads, so the two pages agree. */
async function readVisits(ngoId: string): Promise<Visit[]> {
  const db = getSupabase(); if (!db) throw new Error("StrayPaw could not be reached.");
  const week = new Date(Date.now() + 7 * 864e5).toISOString();
  const [fs, cs] = await Promise.all([
    dueFollowups(),
    db.from("cases").select("id,case_code,title,zone,city,assignee_name,next_action,due_at,follow_up_at,dog_id,provenance").eq("ngo_id", ngoId).is("resolved_at", null).or(`due_at.lte.${week},follow_up_at.lte.${week}`).limit(300),
  ]);
  if (cs.error) throw new Error(cs.error.message);
  type C = { id: string; case_code: string | null; title: string | null; zone: string | null; city: string | null; assignee_name: string | null; next_action: string | null; due_at: string | null; follow_up_at: string | null; dog_id: string | null; provenance: string | null };
  const cases = (cs.data ?? []) as C[];
  const refs = await readAnimalRefs(ngoId, [...fs.map((f) => f.dog_id), ...cases.map((c) => c.dog_id)]);
  const say = (text: string, id: string | null) => withAnimalName(text, id ? refs.get(id) : null);
  const out: Visit[] = fs.filter((f) => !imported(f.source)).map((f) => ({ id: f.id, at: Date.parse(f.due_at), day: dayOf(f.due_at), when: shortDay(f.due_at), what: say(f.note || (f.kind ?? "Follow-up").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), f.dog_id), place: f.zone ?? f.city ?? "Place not recorded", who: f.assignee_name ?? "Unassigned", href: f.case_id ? `/ngo/cases/${f.case_id}` : f.dog_id ? `/ngo/animals/${f.dog_id}` : undefined }));
  const seen = new Set(fs.map((f) => f.case_id).filter(Boolean));
  for (const c of cases) {
    const due = c.due_at ?? c.follow_up_at;
    if (!due || seen.has(c.id) || due > week || imported(c.provenance)) continue;
    out.push({ id: `case:${c.id}`, at: Date.parse(due), day: dayOf(due), when: shortDay(due), what: say(c.next_action || c.title || "Case follow-up", c.dog_id), place: c.zone ?? c.city ?? "Place not recorded", who: c.assignee_name ?? "Unassigned", href: `/ngo/cases/${c.id}` });
  }
  return out.sort((a, b) => a.at - b.at);
}
async function readCritical(): Promise<Crit[]> {
  const db = getSupabase(); if (!db) throw new Error("StrayPaw could not be reached.");
  const r = await db.from("org_case_facts").select("id,case_code,title,condition_class,zone,assignee_name,occurred_at").in("status_class", ["open", "in_progress"]).in("condition_class", CRITICAL).or(CURRENT).order("occurred_at", { ascending: false }).limit(20);
  if (r.error) throw new Error(r.error.message);
  return ((r.data ?? []) as { id: string; case_code: string | null; title: string | null; condition_class: string; zone: string | null; assignee_name: string | null; occurred_at: string | null }[]).map((c) => ({ id: c.id, code: shortCode(c.case_code, c.id.slice(0, 8).toUpperCase()), title: c.title || c.condition_class, condition: c.condition_class, zone: c.zone, who: c.assignee_name, at: c.occurred_at }));
}
/** The register's totals, from the same filtered read the Animals page uses (org_animals), one count at a time. */
async function readHerd(): Promise<Herd> {
  const db = getSupabase(); if (!db) throw new Error("StrayPaw could not be reached.");
  const count = async (args: Record<string, unknown>) => {
    const r = await db.rpc("org_animals", { p_search: null, p_ster: null, p_vacc: null, p_zone: null, p_from: null, p_to: null, p_needs: null, p_limit: 1, p_offset: 0, ...args });
    if (r.error) throw new Error(r.error.message);
    const rows = (Array.isArray(r.data) ? r.data : []) as { total_count: number | string }[];
    return rows.length ? Number(rows[0].total_count) : 0;
  };
  const [total, sterilised, vaccinated, help] = await Promise.all([count({}), count({ p_ster: "sterilised" }), count({ p_vacc: "vaccinated" }), count({ p_needs: true })]);
  return { total, sterilised, vaccinated, help };
}
async function readWaiting(orgId: string): Promise<MissionWait[]> {
  const db = getSupabase(); if (!db) throw new Error("StrayPaw could not be reached.");
  const r = await db.from("nx_missions").select("id,title,state,updated_at,nx_mission_steps(position,label,state)").eq("org_id", orgId).in("state", ["waiting_person", "blocked"]).order("updated_at", { ascending: false }).limit(20);
  if (r.error) throw new Error(r.error.message);
  type M = { id: string; title: string; state: string; updated_at: string; nx_mission_steps: { position: number; label: string; state: string }[] };
  return ((r.data ?? []) as M[]).map((m) => { const s = [...(m.nx_mission_steps ?? [])].sort((a, b) => a.position - b.position).find((x) => ["waiting_approval", "waiting_person", "failed"].includes(x.state)); return { id: m.id, title: m.title, state: s?.state ?? m.state, step: s?.label ?? null, at: m.updated_at }; });
}

/** A read with its three states: undefined while reading, the value, or an error. */
function useAsync<T>(key: string | null, read: () => Promise<T>) {
  const [s, setS] = useState<{ key: string; data?: T; error?: string } | null>(null);
  const [tick, setTick] = useState(0);
  const fn = useCallback(read, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!key) return;
    let alive = true;
    fn().then((data) => { if (alive) setS({ key, data }); }, (e: unknown) => { if (alive) setS({ key, error: e instanceof Error ? e.message : "Could not be read." }); });
    return () => { alive = false; };
  }, [key, fn, tick]);
  const hit = s && s.key === key ? s : null;
  return { data: hit?.data, error: hit?.error ?? null, loading: !!key && !hit, reload: () => setTick((n) => n + 1) };
}

function LiveToday() {
  const { org, userId, userName } = useLive();
  const ngo = org!.workspace === "ngo" ? org! : null;
  const tasks = useTasks(org!.org_id);
  const visits = useAsync(ngo ? `v:${ngo.org_id}` : null, () => readVisits(ngo!.org_id));
  const crit = useAsync(ngo ? `c:${ngo.org_id}` : null, readCritical);
  const counts = useAsync<OpsCounts | null>(ngo ? `o:${ngo.org_id}` : null, opsCounts);
  const herd = useAsync(ngo ? `h:${ngo.org_id}` : null, readHerd);
  const waiting = useAsync(`w:${org!.org_id}`, () => readWaiting(org!.org_id));
  const [title, setTitle] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const date = useMemo(dateLine, []);
  const { setRows, reload: reloadTasks } = tasks;
  /* Something confirmed in the @Kaju box (a task, a case, a follow-up) shows here without a reload. */
  useEffect(() => { const on = () => { reloadTasks(); }; window.addEventListener(KAJU_SAVED, on); return () => window.removeEventListener(KAJU_SAVED, on); }, [reloadTasks]);

  const rows = tasks.rows ?? [], open = rows.filter((t) => t.state === "open"), closed = rows.filter((t) => t.state === "done");
  const today = new Date().toISOString().slice(0, 10);
  const lateTasks = open.filter((t) => t.due_on && t.due_on < today);
  const toggle = async (t: Task) => {
    const done = t.state !== "done";
    setRows((r) => r?.map((x) => (x.id === t.id ? { ...x, state: done ? "done" : "open" } : x)) ?? r);
    const r = await setTaskDone(t.id, done, userId);
    if (r.error) { setNote(`Not saved: ${r.error.message}`); reloadTasks(); }
  };
  /* Delete archives the task (state "cancelled", which the list leaves out) rather than erasing it, so Undo puts it back
     exactly as it was and an admin can still find it. */
  const remove = async (t: Task) => {
    setNote(null);
    setRows((r) => r?.filter((x) => x.id !== t.id) ?? r);
    const db = getSupabase()!;
    const r = await db.from("nx_tasks").update({ state: "cancelled" }).eq("id", t.id);
    if (r.error) { setNote(`Not deleted: ${r.error.message}`); reloadTasks(); return; }
    toast({ text: `Deleted “${t.title}”.`, undo: async () => { await db.from("nx_tasks").update({ state: t.state }).eq("id", t.id); reloadTasks(); } });
  };
  const add = async () => { const t = title.trim(); if (!t) return; setNote(null); const r = await addTasks(org!.org_id, [t]); if (r.error) setNote(`Not added: ${r.error.message}`); else { setTitle(""); reloadTasks(); } };

  /* What needs attention: critical cases first, then overdue visits (oldest first), then tasks past their date. */
  const vs = visits.data ?? [];
  const late = vs.filter((v) => v.day === "Overdue"), now = vs.filter((v) => v.day === "Today"), later = vs.filter((v) => v.day === "Later");
  const attention: Item[] | null = (ngo && (visits.loading || crit.loading)) || tasks.rows === null ? null : [
    ...(crit.data ?? []).map((c): Item => ({ id: `c${c.id}`, title: c.title, meta: [c.code, c.zone, c.who ?? "Unassigned"].filter(Boolean).join(" · "), href: `/ngo/cases/${c.id}`, icon: <AlertTriangle size={16} />, tone: "bad", chip: { text: c.condition, tone: "bad" }, kaju: `Summarise case ${c.code} and what it needs next`, kajuLabel: `Ask @Kaju about ${c.code}` })),
    ...late.map((v): Item => ({ id: `v${v.id}`, title: v.what, meta: `${v.place} · ${v.who}`, href: v.href, icon: <CalendarClock size={16} />, tone: "warn", chip: { text: `Overdue · ${v.when}`, tone: "warn" }, kaju: `Add a task: ${v.what} at ${v.place}, tomorrow`, kajuLabel: `Make a task with @Kaju: ${v.what}` })),
    ...lateTasks.map((t): Item => ({ id: `t${t.id}`, title: t.title, meta: `Task · ${t.assignee_name ?? "Unassigned"}`, href: "#t-tasks", icon: <ListChecks size={16} />, tone: "warn", chip: { text: `Due ${shortDay(t.due_on!)}`, tone: "warn" } })),
  ];
  const partial = [visits.error ? "field visits" : null, crit.error ? "critical cases" : null].filter(Boolean) as string[];
  const c = counts.data, h = herd.data;
  const num = (r: { data?: unknown; error: string | null }, v: number | undefined): Count => (r.error ? null : v);
  const taskRow = (t: Task) => <TaskRow key={t.id} id={t.id} title={t.title} done={t.state === "done"} onToggle={() => void toggle(t)} onDelete={() => void remove(t)}
    meta={[t.source_kind === "kaju" ? "Proposed by Kaju, accepted by a person" : t.source_kind === "manual" ? "Added by hand" : t.source_kind, t.record_label, t.assignee_name ?? "Unassigned"].filter(Boolean).join(" · ")}
    chip={t.due_on && t.due_on < today ? { text: "Overdue", tone: "warn" } : t.due_on ? { text: `Due ${shortDay(t.due_on)}`, tone: "plain" } : { text: "Open", tone: "plain" }} />;

  return (
    <Shell crumb={["Today"]}>
      <div className="nx-page hm-page">
        <div className="nx-head">
          <div>
            <p className="nx-eyebrow">{date} · {org!.name}</p>
            <h1 className="nx-h1">{greeting()}{userName ? `, ${userName.split(" ")[0]}` : ""}</h1>
            <p className="nx-sub">{attention === null ? "Reading what needs you…" : attention.length ? <><b className="num">{attention.length}</b> {attention.length === 1 ? "thing needs" : "things need"} attention, most urgent first.{partial.length ? ` Some ${partial.join(" and ")} could not be read.` : ""}</> : partial.length ? `Your ${partial.join(" and ")} could not be read, so nothing is shown as clear.` : "Nothing is overdue or critical."}</p>
          </div>
          {ngo ? <Link href="/ngo/field?record=1" className="nx-btn is-keep fm-entry"><Camera size={14} />Record an animal</Link> : null}
        </div>
        <AtKaju role="ngo" />
        <Tiles>
          {ngo ? <Tile label="Visits overdue" n={num(visits, visits.data ? late.length : undefined)} tone={late.length ? "warn" : "plain"} href="/ngo/operations" note={visits.data ? `${plural(vs.length, "visit", "visits")} due in the next 7 days` : undefined}
            visual={<Split parts={[{ n: late.length, tone: "warn", label: "overdue" }, { n: now.length, tone: "blue", label: "today" }, { n: later.length, tone: "plain", label: "later" }]} />} /> : null}
          {ngo ? <Tile label="Open cases" n={num(counts, c?.currentOpen)} href="/ngo/cases" visual={c ? <Meter part={c.critical} whole={c.currentOpen} tone="bad" label={`${plural(c.critical, "is critical", "are critical")}`} /> : null} /> : null}
          <Tile label="Open tasks" n={tasks.error ? null : tasks.rows ? open.length : undefined} tone={lateTasks.length ? "warn" : "plain"} href="#t-tasks" note={lateTasks.length ? `${plural(lateTasks.length, "is", "are")} past the due date` : undefined}
            visual={open.length + closed.length ? <Meter part={closed.length} whole={open.length + closed.length} tone="ok" label={`${closed.length.toLocaleString("en-IN")} of ${(open.length + closed.length).toLocaleString("en-IN")} done`} /> : null} />
          {ngo ? <Tile label="Animals on the register" n={num(herd, h?.total)} href="/ngo/animals"
            visual={h && h.total ? <><Meter part={h.sterilised} whole={h.total} tone="ok" label={`${Math.round((h.sterilised / h.total) * 100)}% recorded as sterilised`} /><Meter part={h.vaccinated} whole={h.total} tone="blue" label={`${Math.round((h.vaccinated / h.total) * 100)}% recorded as vaccinated`} /></> : null} /> : null}
        </Tiles>
        <Grid cols={2}>
          {ngo ? <Panel id="t-attn" title="Needs attention" foot={<><Link href="/ngo/operations" className="hm-all">Operations<ArrowRight size={14} aria-hidden /></Link><Link href="/ngo/cases" className="hm-all">Cases<ArrowRight size={14} aria-hidden /></Link></>}>
            <Rows items={attention} error={partial.length === 2 ? "Visits and critical cases could not be read." : null} retry={() => { visits.reload(); crit.reload(); }} empty={partial.length ? `Your ${partial.join(" and ")} could not be read, so nothing is shown as clear.` : "Nothing is overdue or critical. New work arrives in the Inbox."} />
            {partial.length === 1 && attention ? <p className="hm-note is-bad" role="alert">{partial[0].replace(/^./, (x) => x.toUpperCase())} could not be read; they are not shown here.</p> : null}
          </Panel> : null}
          <Panel id="t-tasks" title="Your tasks" foot={closed.length ? <button type="button" className="hm-all" aria-expanded={allDone} onClick={() => setAllDone((a) => !a)}>{allDone ? "Hide done" : `Show ${plural(closed.length, "done task", "done tasks")}`}</button> : undefined}>
            <form className="hm-add" onSubmit={(e) => { e.preventDefault(); void add(); }}><Plus size={16} aria-hidden /><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task and press Enter" aria-label="Add a task" maxLength={240} /></form>
            {note ? <p className="hm-note is-bad" role="alert">{note}</p> : null}
            {tasks.error ? <p className="hm-note is-bad" role="alert">Tasks could not be read: {tasks.error}</p> : tasks.rows === null ? <Rows items={null} empty="" /> : (
              <>
                <ul className="hm-rows" aria-label="Open tasks"><AnimatePresence initial={false} mode="popLayout">{(allOpen ? open : open.slice(0, 5)).map(taskRow)}</AnimatePresence></ul>
                {open.length > 5 ? <button type="button" className="hm-all" aria-expanded={allOpen} onClick={() => setAllOpen((a) => !a)}>{allOpen ? "Show fewer" : `Show all ${open.length}`}</button> : null}
                {!rows.length ? <p className="hm-empty">No tasks yet. Add one above, or ask @Kaju: “Add a task: call the vet tomorrow”.</p> : !open.length ? <p className="hm-empty">Every task is done.</p> : null}
                {allDone && closed.length ? <ul className="hm-rows" aria-label="Done tasks"><AnimatePresence initial={false} mode="popLayout">{closed.slice(0, 20).map(taskRow)}</AnimatePresence></ul> : null}
              </>
            )}
          </Panel>
        </Grid>
        <Strip id="t-kaju" title="Kaju is waiting on you" all={{ href: "/kaju/missions", label: "Missions" }} error={waiting.error ? "What Kaju is waiting on could not be read." : null} retry={waiting.reload}
          items={waiting.data?.map((m): Item => ({ id: m.id, title: m.step ? `${m.state === "waiting_approval" ? "Approve" : m.state === "failed" ? "Stopped at" : "Waiting for a person"}: ${m.step}` : m.title, meta: m.title, href: `/kaju/missions/${m.id}`, icon: m.state === "failed" ? <AlertTriangle size={16} /> : <Hand size={16} />, tone: m.state === "failed" ? "bad" : "warn", chip: { text: shortDay(m.at), tone: "plain" } }))}
          empty="Nothing right now. Ask @Kaju above, or plan a mission in Kaju." />
        {ngo && vs.length ? <p className="hm-note" style={{ marginTop: 16 }}>Visits from imported registers are left out of these counts, as on Operations.</p> : null}
      </div>
    </Shell>
  );
}

export function Today() {
  const live = useLive();
  // Until the session is known the sample page is shown: it is in the server HTML, so it paints first (members never see it).
  return live.ready && live.org ? <LiveToday /> : <SampleToday />;
}
