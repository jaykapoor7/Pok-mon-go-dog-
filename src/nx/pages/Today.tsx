"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { AlertTriangle, ArrowRight, CalendarClock, Hand, ListChecks, PawPrint, Sparkles } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { dueFollowups } from "@/lib/ops";
import { Shell } from "../Shell";
import { Sample } from "../ui";
import { AtKaju, KAJU_SAVED } from "../AtKaju";
import { Grid, Meter, Panel, Rows, Split, Strip, TaskRow, TasksPanel, Tile, Tiles, type Count, type HmTone, type Item } from "../HomeCards";
import { ANIMALS, ME, ORG, PREPARED, VISITS_OPS, WORK, type Work } from "../fixtures";
import { SAMPLE_CASES } from "../data/ngo-sample";
import { useLive, useTasks } from "../live";
import { readAnimalRefs } from "../data/animals";
import { withAnimalName } from "../animalLabel";
import "../field.css";
import "../css/ngo-records.css";

/* Today, an NGO's home: what needs the person, not a launcher. It has no record buttons of its own; recording an
   animal is the phone's "+" and the Animals page, a new case is Cases. One line to Kaju; four figures, each with a small picture of what it counts and a link to the
   list it counts; then what needs attention beside the person's tasks, five rows each, and what Kaju is waiting on as a
   short row of cards. Every figure is counted with the same reads and the same rules as the list it opens (Operations,
   Cases, Animals), so the two always agree; a read that failed says "Not read", never zero. Signed out, the same page
   shows the labelled sample organisation, counted from the same sample lists those pages show. */

/* The greeting and the date follow the reader's clock. The server may be in another time zone, so the two sample lines
   that show them may differ from the server's HTML (suppressHydrationWarning) instead of failing hydration. */
function greeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }
const dateLine = () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
const shortDay = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;
const pctOf = (part: number, whole: number) => `${Math.round((part / whole) * 100)}%`;
const en = (n: number) => n.toLocaleString("en-IN");
/** "102 sterilised (4%) · 2,175 not recorded": what is recorded as done, as a share of the whole register, then what is
    recorded as not done and what has no status at all, each named for what it is. */
const statusLine = (yes: number, no: number, total: number, yesWord: string, noWord: string) =>
  [`${en(yes)} ${yesWord} (${pctOf(yes, total)})`, no ? `${en(no)} ${noWord}` : null, total - yes - no ? `${en(total - yes - no)} not recorded` : null].filter(Boolean).join(" · ");

/* ── Sample organisation (signed out) ─────────────────────────────── */

const VISIT_TONE: Record<string, HmTone> = { Overdue: "warn", Today: "blue", Tomorrow: "plain", "This week": "plain" };
const VISIT_ORDER = ["Overdue", "Today", "Tomorrow", "This week"];
const WORK_TONE: Record<string, HmTone> = { accent: "blue", bad: "bad", warn: "warn", ok: "ok", plain: "plain" };

function SampleToday() {
  const [done, setDone] = useState<string[]>([]);
  const [all, setAll] = useState(false);
  const toggle = (id: string) => setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  const open = WORK.filter((w) => !done.includes(w.id)), closed = done.map((id) => WORK.find((w) => w.id === id)!).reverse();
  const date = useMemo(dateLine, []);
  const visits = [...VISITS_OPS].sort((a, b) => VISIT_ORDER.indexOf(a.day) - VISIT_ORDER.indexOf(b.day));
  const n = (d: string) => VISITS_OPS.filter((v) => v.day === d).length;
  /* Counted as the sample Cases and Animals pages count them, so a figure matches the list it opens. */
  const cases = SAMPLE_CASES.filter((r) => r.open && !r.historical && !r.stale), crit = cases.filter((r) => r.crit).length;
  const ster = ANIMALS.filter((a) => a.abc === "Sterilised").length, vacc = ANIMALS.filter((a) => a.arv === "Vaccinated").length;
  const row = (w: Work, isDone: boolean) => <TaskRow key={w.id} id={w.id} title={w.title} meta={`${w.ref} · ${w.kind} · ${w.place} · ${w.who}`} chip={{ text: w.state, tone: WORK_TONE[w.tone] ?? "plain" }} done={isDone} onToggle={() => toggle(w.id)} href={w.animal ? `/ngo/animals/${w.animal}` : undefined} />;
  return (
    <Shell crumb={["Today"]}>
      <div className="nx-page hm-page nr-today">
        <div className="nx-head">
          <div>
            <p className="nx-eyebrow" suppressHydrationWarning>{date} · {ORG.city}<Sample /></p>
            <h1 className="nx-h1" suppressHydrationWarning>{greeting()}, {ME.name}</h1>
            <p className="nx-sub"><b className="num">{open.length}</b> {open.length === 1 ? "thing needs" : "things need"} you. Kaju has prepared {PREPARED.length}.</p>
          </div>
        </div>
        <AtKaju role="ngo" />
        <Tiles>
          <Tile label="Visits overdue" n={n("Overdue")} tone="warn" href="/ngo/operations" visual={<Split parts={[{ n: n("Overdue"), tone: "warn", label: "overdue" }, { n: n("Today"), tone: "blue", label: "today" }, { n: n("Tomorrow") + n("This week"), tone: "plain", label: "later this week" }]} />} />
          <Tile label="Open cases" n={cases.length} href="/ngo/cases" visual={<Meter part={crit} whole={cases.length} tone="bad" label={`${plural(crit, "is", "are")} critical or high`} />} />
          <Tile label="Open work" n={open.length} href="#t-work" visual={<Meter part={closed.length} whole={WORK.length} tone="ok" label={`${closed.length} of ${WORK.length} done`} />} />
          <Tile label="Animals on the register" n={ANIMALS.length} href="/ngo/animals"
            visual={<><Meter part={ster} whole={ANIMALS.length} tone="ok" label={`${ster} sterilised (${pctOf(ster, ANIMALS.length)})`} /><Meter part={vacc} whole={ANIMALS.length} tone="ok" label={`${vacc} vaccinated (${pctOf(vacc, ANIMALS.length)})`} /></>} />
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
      </div>
    </Shell>
  );
}

/* ── A signed-in organisation ─────────────────────────────────────── */

type Visit = { id: string; at: number; day: "Overdue" | "Today" | "Later"; when: string; what: string; place: string; who: string; href?: string };
type CaseItem = { id: string; code: string; title: string; chip: string; bad: boolean; place: string | null; who: string | null };
type CaseRead = { open: number; openCrit: number; critical: CaseItem[]; capped: boolean; imported: number };
type Herd = { total: number; ster: number; notSter: number; vacc: number; notVacc: number; help: number };
type MissionWait = { id: string; title: string; state: string; step: string | null; at: string };

function dayOf(iso: string): Visit["day"] {
  const d = new Date(iso), t = new Date(); t.setHours(0, 0, 0, 0);
  const k = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - t.getTime()) / 864e5);
  return k < 0 ? "Overdue" : k === 0 ? "Today" : "Later";
}
const imported_ = (src: string | null | undefined) => src === "historical_import" || src === "imported_historical_record";

/** The field visits Operations lists (loadVisits there): follow-ups due within a week and open cases whose own date has
    come. Imported registers are left out here; Operations shows them apart and never counts them as overdue. */
async function readVisits(ngoId: string): Promise<{ list: Visit[]; imported: number }> {
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
  const out: Visit[] = fs.filter((f) => !imported_(f.source)).map((f) => ({ id: f.id, at: Date.parse(f.due_at), day: dayOf(f.due_at), when: shortDay(f.due_at), what: say(f.note || (f.kind ?? "Follow-up").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), f.dog_id), place: f.zone ?? f.city ?? "Place not recorded", who: f.assignee_name ?? "Unassigned", href: f.case_id ? `/ngo/cases/${f.case_id}` : f.dog_id ? `/ngo/animals/${f.dog_id}` : undefined }));
  const seen = new Set(fs.map((f) => f.case_id).filter(Boolean));
  /* How many were left out as imported, so the tile can say so: an imported register's follow-ups are kept apart, and
     an organisation whose visits are all imported would otherwise read "0 overdue" with no word why. */
  let imported = fs.filter((f) => imported_(f.source)).length;
  for (const c of cases) {
    const due = c.due_at ?? c.follow_up_at;
    if (!due || seen.has(c.id) || due > week) continue;
    if (imported_(c.provenance)) { imported++; continue; }
    out.push({ id: `case:${c.id}`, at: Date.parse(due), day: dayOf(due), when: shortDay(due), what: say(c.next_action || c.title || "Case follow-up", c.dog_id), place: c.zone ?? c.city ?? "Place not recorded", who: c.assignee_name ?? "Unassigned", href: `/ngo/cases/${c.id}` });
  }
  return { list: out.sort((a, b) => a.at - b.at), imported };
}

/** The organisation's open cases, read and sorted into the Cases page's own views with its own rules (data/ngo):
    "Open" is current work that has not gone quiet; "Critical and high" is a critical condition or a critical or high
    severity, quiet or not. The rules module loads with the read, not with the page. */
async function readCases(ngoId: string): Promise<CaseRead> {
  const db = getSupabase(); if (!db) throw new Error("StrayPaw could not be reached.");
  const rules = await import("../data/ngo");
  const r = await db.from("org_case_facts").select("id,case_code,title,condition_class,severity,zone,city,assignee_name,occurred_at,last_activity_at,provenance,reviewed_at,status_class")
    .eq("ngo_id", ngoId).in("status_class", ["open", "in_progress"]).order("occurred_at", { ascending: false }).limit(rules.OPEN_LIMIT);
  if (r.error) throw new Error(r.error.message);
  type F = { id: string; case_code: string | null; title: string | null; condition_class: string | null; severity: string | null; zone: string | null; city: string | null; assignee_name: string | null; occurred_at: string | null; last_activity_at: string | null; provenance: string | null; reviewed_at: string | null; status_class: string | null };
  const rows = (r.data ?? []) as F[], now = Date.now();
  const crit = (c: F) => rules.isCriticalCondition(c.condition_class) || c.severity === "critical" || c.severity === "high";
  const current = rows.filter((c) => !rules.isHistorical(c));
  const open = current.filter((c) => !rules.isStaleFact(c, now));
  const critical = current.filter(crit).sort((a, b) => (Date.parse(a.occurred_at ?? "") || 0) - (Date.parse(b.occurred_at ?? "") || 0)).map((c): CaseItem => {
    const bad = rules.isCriticalCondition(c.condition_class) || c.severity === "critical";
    return { id: c.id, code: rules.shortCode(c.case_code, c.id.slice(0, 8).toUpperCase()), title: c.title || c.condition_class || "Case", chip: rules.isCriticalCondition(c.condition_class) ? c.condition_class! : c.severity === "critical" ? "Critical" : "High", bad, place: c.zone ?? c.city, who: c.assignee_name };
  });
  /* Imported open cases nobody has confirmed are kept out of today's work, as on Cases; the tile says how many, so an
     organisation whose register is mostly imported does not read as having nothing open. */
  return { open: open.length, openCrit: open.filter(crit).length, critical, capped: rows.length >= rules.OPEN_LIMIT, imported: rows.length - current.length };
}

/** The register's totals with the Animals page's own lenses (org_animals: All, Needs help, Not sterilised, Not vaccinated),
    and the recorded sterilised and vaccinated counts. One rule everywhere (sp3/ai/figures): the animal's recorded status
    counts; an animal with no status recorded is "not recorded", never "not sterilised", and the share is of every animal
    on the register. An imported register with most statuses unrecorded therefore reads "102 sterilised (4%) · 2,175 not
    recorded", not "0 not sterilised (0%)". */
async function readHerd(): Promise<Herd> {
  const db = getSupabase(); if (!db) throw new Error("StrayPaw could not be reached.");
  const count = async (args: Record<string, unknown>) => {
    const r = await db.rpc("org_animals", { p_search: null, p_ster: null, p_vacc: null, p_zone: null, p_from: null, p_to: null, p_needs: null, p_limit: 1, p_offset: 0, ...args });
    if (r.error) throw new Error(r.error.message);
    const rows = (Array.isArray(r.data) ? r.data : []) as { total_count: number | string }[];
    return rows.length ? Number(rows[0].total_count) : 0;
  };
  const [total, ster, notSter, vacc, notVacc, help] = await Promise.all([count({}), count({ p_ster: "sterilised" }), count({ p_ster: "not_sterilised" }), count({ p_vacc: "vaccinated" }), count({ p_vacc: "not_vaccinated" }), count({ p_needs: true })]);
  return { total, ster, notSter, vacc, notVacc, help };
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
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data: hit?.data, error: hit?.error ?? null, loading: !!key && !hit, reload };
}

function LiveToday() {
  const { org, userId, userName } = useLive();
  const ngo = org!.workspace === "ngo" ? org! : null;
  const tasks = useTasks(org!.org_id);
  const visits = useAsync(ngo ? `v:${ngo.org_id}` : null, () => readVisits(ngo!.org_id));
  const cases = useAsync(ngo ? `c:${ngo.org_id}` : null, () => readCases(ngo!.org_id));
  const herd = useAsync(ngo ? `h:${ngo.org_id}` : null, readHerd);
  const waiting = useAsync(`w:${org!.org_id}`, () => readWaiting(org!.org_id));
  const date = useMemo(dateLine, []);
  const { reload: reloadVisits } = visits, { reload: reloadCases } = cases, { reload: reloadWaiting } = waiting;
  /* Something confirmed in the @Kaju box (a case, a follow-up, a task) shows here without reloading the page. */
  useEffect(() => { const on = () => { reloadVisits(); reloadCases(); reloadWaiting(); }; window.addEventListener(KAJU_SAVED, on); return () => window.removeEventListener(KAJU_SAVED, on); }, [reloadVisits, reloadCases, reloadWaiting]);

  const rows = tasks.rows ?? [], open = rows.filter((t) => t.state === "open"), closed = rows.filter((t) => t.state === "done");
  const today = new Date().toISOString().slice(0, 10);
  const lateTasks = open.filter((t) => t.due_on && t.due_on < today);

  /* What needs attention, most urgent first: animals marked as needing help, critical and high cases, visits past their
     date (oldest first), then tasks past their date. Five show; the foot opens the lists they come from. */
  const vs = visits.data?.list ?? [], visitsImported = visits.data?.imported ?? 0;
  const late = vs.filter((v) => v.day === "Overdue"), now = vs.filter((v) => v.day === "Today"), later = vs.filter((v) => v.day === "Later");
  const help = herd.data?.help ?? 0;
  const crit = cases.data?.critical ?? [];
  const attention: Item[] | null = (ngo && (visits.loading || cases.loading || herd.loading)) || tasks.rows === null ? null : [
    ...(help ? [{ id: "help", title: `${plural(help, "animal is", "animals are")} marked as needing help`, meta: "On the register", href: "/ngo/animals?view=help", icon: <PawPrint size={16} />, tone: "bad" as const, chip: { text: "Needs help", tone: "bad" as const }, kaju: "Which animals need help, and who is on them?", kajuLabel: "Ask @Kaju about the animals that need help" }] : []),
    ...crit.map((c): Item => ({ id: `c${c.id}`, title: c.title, meta: [c.code, c.place, c.who ?? "Unassigned"].filter(Boolean).join(" · "), href: `/ngo/cases/${c.id}`, icon: <AlertTriangle size={16} />, tone: c.bad ? "bad" : "warn", chip: { text: c.chip, tone: c.bad ? "bad" : "warn" }, kaju: `Summarise case ${c.code} and what it needs next`, kajuLabel: `Ask @Kaju about ${c.code}` })),
    ...late.map((v): Item => ({ id: `v${v.id}`, title: v.what, meta: `${v.place} · ${v.who}`, href: v.href, icon: <CalendarClock size={16} />, tone: "warn", chip: { text: `Overdue · ${v.when}`, tone: "warn" }, kaju: `Add a task: ${v.what} at ${v.place}, tomorrow`, kajuLabel: `Make a task with @Kaju: ${v.what}` })),
    ...lateTasks.map((t): Item => ({ id: `t${t.id}`, title: t.title, meta: `Task · ${t.assignee_name ?? "Unassigned"}`, href: "#t-tasks", icon: <ListChecks size={16} />, tone: "warn", chip: { text: `Due ${shortDay(t.due_on!)}`, tone: "warn" } })),
  ];
  const partial = [visits.error ? "field visits" : null, cases.error ? "cases" : null, herd.error ? "animals" : null].filter(Boolean) as string[];
  const c = cases.data, h = herd.data;
  const num = (r: { error: string | null }, v: number | undefined): Count => (r.error ? null : v);
  const retryAll = () => { visits.reload(); cases.reload(); herd.reload(); };
  return (
    <Shell crumb={["Today"]}>
      <div className="nx-page hm-page nr-today">
        <div className="nx-head">
          <div>
            <p className="nx-eyebrow">{date} · {org!.name}</p>
            <h1 className="nx-h1">{greeting()}{userName ? `, ${userName.split(" ")[0]}` : ""}</h1>
            <p className="nx-sub">{attention === null ? "Reading what needs you…" : attention.length ? <><b className="num">{attention.length}</b> {attention.length === 1 ? "thing needs" : "things need"} attention, most urgent first.{partial.length ? ` Your ${partial.join(" and ")} could not be read.` : ""}</> : partial.length ? `Your ${partial.join(" and ")} could not be read, so nothing is shown as clear.` : "Nothing is overdue or critical."}</p>
          </div>
        </div>
        <AtKaju role="ngo" />
        <Tiles>
          {ngo ? <Tile label="Visits overdue" n={num(visits, visits.data ? late.length : undefined)} tone={late.length ? "warn" : "plain"} href="/ngo/operations" note={visits.data ? `${plural(vs.length, "visit", "visits")} due in the next 7 days${visitsImported ? `; ${plural(visitsImported, "imported follow-up", "imported follow-ups")} not counted` : ""}` : undefined}
            visual={vs.length ? <Split parts={[{ n: late.length, tone: "warn", label: "overdue" }, { n: now.length, tone: "blue", label: "today" }, { n: later.length, tone: "plain", label: "later" }]} /> : null} /> : null}
          {ngo ? <Tile label="Open cases" n={num(cases, c?.open)} href="/ngo/cases" note={c ? [c.imported ? `${plural(c.imported, "imported case", "imported cases")} awaiting confirmation, not counted` : null, c.capped ? "The newest 800 open cases were read" : null].filter(Boolean).join(". ") || undefined : undefined}
            visual={c && c.open ? <Meter part={c.openCrit} whole={c.open} tone="bad" label={`${plural(c.openCrit, "is", "are")} critical or high`} /> : null} /> : null}
          <Tile label="Open tasks" n={tasks.error ? null : tasks.rows ? open.length : undefined} tone={lateTasks.length ? "warn" : "plain"} href="#t-tasks" note={lateTasks.length ? `${plural(lateTasks.length, "is", "are")} past the due date` : undefined}
            visual={open.length + closed.length ? <Meter part={closed.length} whole={open.length + closed.length} tone="ok" label={`${closed.length.toLocaleString("en-IN")} of ${(open.length + closed.length).toLocaleString("en-IN")} done`} /> : null} />
          {ngo ? <Tile label="Animals on the register" n={num(herd, h?.total)} href="/ngo/animals"
            visual={h && h.total ? <><Meter part={h.ster} whole={h.total} tone="ok" label={statusLine(h.ster, h.notSter, h.total, "sterilised", "not sterilised")} /><Meter part={h.vacc} whole={h.total} tone="ok" label={statusLine(h.vacc, h.notVacc, h.total, "vaccinated", "not vaccinated")} /></> : null} /> : null}
        </Tiles>
        <Grid cols={2}>
          {ngo ? <Panel id="t-attn" title="Needs attention" foot={<><Link href="/ngo/cases?view=critical" className="hm-all">Critical and high cases{c ? ` (${c.critical.length.toLocaleString("en-IN")})` : ""}<ArrowRight size={14} aria-hidden /></Link></>}>
            <Rows items={attention} expand={false} error={partial.length === 3 ? "Visits, cases and animals could not be read." : null} retry={retryAll} empty={partial.length ? `Your ${partial.join(" and ")} could not be read, so nothing is shown as clear.` : "Nothing is overdue or critical. New work arrives in the Inbox."} />
            {partial.length && partial.length < 3 && attention ? <p className="hm-note is-bad" role="alert">Your {partial.join(" and ")} could not be read; {partial.length === 1 ? "it is" : "they are"} not shown here. <button type="button" className="hm-link" onClick={retryAll}>Try again</button></p> : null}
          </Panel> : null}
          <TasksPanel orgId={org!.org_id} userId={userId} tasks={tasks} />
        </Grid>
        <Strip id="t-kaju" title="Waiting for you in Kaju" all={{ href: "/kaju", label: "Kaju" }} error={waiting.error ? "What Kaju is waiting on could not be read." : null} retry={waiting.reload}
          items={waiting.data?.map((m): Item => ({ id: m.id, title: m.step ? `${m.state === "waiting_approval" ? "Approve" : m.state === "failed" ? "Stopped at" : "Waiting for a person"}: ${m.step}` : m.title, meta: m.title, href: `?job=${m.id}`, icon: m.state === "failed" ? <AlertTriangle size={16} /> : <Hand size={16} />, tone: m.state === "failed" ? "bad" : "warn", chip: { text: shortDay(m.at), tone: "plain" } }))}
          empty="Nothing right now. Ask @Kaju above, or tell Kaju what you want done." />
      </div>
    </Shell>
  );
}

export function Today() {
  const live = useLive();
  // Until the session is known the sample page is shown: it is in the server HTML, so it paints first (members never see it).
  return live.ready && live.org ? <LiveToday /> : <SampleToday />;
}
