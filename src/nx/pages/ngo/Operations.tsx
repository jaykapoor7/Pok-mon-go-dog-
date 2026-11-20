"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Camera, MapPin, Smartphone } from "lucide-react";
import { dueFollowups, type DueFollowup } from "@/lib/ops";
import { getSupabase } from "@/lib/supabase";
import { careNote } from "@/lib/care-note";
import { MEDICAL_KINDS } from "@/lib/types";
import { Shell } from "../../Shell";
import { Chip, Sample } from "../../ui";
import { Props, TabBar, day, errText, n, words } from "../../kit";
import { ANIMALS, VISITS_OPS, type Tone } from "../../fixtures";
import { useLive, type Workspace } from "../../live";
import { AnimalTag } from "../../AnimalPhoto";
import { animalLabel, animalLine, withAnimalName } from "../../animalLabel";
import { readAnimalRefs } from "../../data/animals";
import { readCareLog, readLanes, readMedicalCases, shortCode, type CareLogRow, type LaneCard, type Lanes, type MedicalCase } from "../../data/ngo";
import { SAMPLE_CARE, SAMPLE_LANES, type SampleCare } from "../../data/ngo-sample";
import { RecordList, type RCol, type RView } from "./RecordList";
import "../../field.css";
import { SharedClinicStatus } from "../VetClinic";

/* Operations: the field visits due, grouped by day and place so a team can plan a round; the care log (every care event
   in date order beside its animal, and the cases that carry medical work); and the two lines of work, rescues and
   sterilisation, step by step. Field mode, for the phone on the street, opens from here. Where the animals are is the
   Animals page's map (an old link to the map here opens it there). */

type Part = "Visits" | "Care log" | "Rescues" | "Sterilisation";
const PARTS: Part[] = ["Visits", "Care log", "Rescues", "Sterilisation"];
const word = (v: string | null | undefined, none = "—") => (v ? v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : none);
/** A sample visit names its animal the way the live list does. */
const sampleAnimal = (id: string | null) => { const a = id ? ANIMALS.find((x) => x.id === id) : null; return a ? animalLine({ id: a.id, name: a.name, code: a.id, species: a.species }) : id; };

export function Operations() {
  const live = useLive();
  const router = useRouter();
  const [part, setPart] = useState<Part>("Visits");
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("view");
    if (v === "map") { router.replace("/ngo/animals?view=map"); return; }
    const p = PARTS.find((x) => x.toLowerCase().replace(" ", "-") === v); if (p) setPart(p);
  }, [router]);
  const choose = (p: Part) => { setPart(p); try { const u = new URL(window.location.href); if (p === "Visits") u.searchParams.delete("view"); else u.searchParams.set("view", p.toLowerCase().replace(" ", "-")); window.history.replaceState(window.history.state, "", u); } catch { /* address unchanged */ } };
  if (!live.ready) return <Shell crumb={["NGO", "Operations"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  const ngo = live.orgFor("ngo");
  if (live.org && !ngo) return <Shell crumb={["NGO", "Operations"]}><div className="nx-page"><h1 className="nx-h1">Operations</h1><p className="nx-sub">Your account is not part of an NGO, so there are no field visits here.</p></div></Shell>;
  const tabs = <div className="nr-bleed"><TabBar id="ops" tabs={PARTS} value={part} onChange={choose} label="Operations" /></div>;
  /* Field mode, and the quickest way to record an animal (it opens field mode with the record screen up). */
  const field = <div className="nr-tools nr-plus-dup"><Link href="/ngo/field" className="nx-btn is-quiet is-keep"><Smartphone size={14} />Open field mode</Link><Link href="/ngo/field?record=1" className="nx-btn is-keep fm-entry"><Camera size={14} />Record an animal</Link></div>;
  return (
    <Shell crumb={["NGO", "Operations"]}>
      {part === "Visits" ? <Visits ngo={ngo} tabs={tabs} action={field} />
        : part === "Care log" ? <CareLog ngo={ngo} tabs={tabs} action={field} />
        : <LanePage ngo={ngo} tabs={tabs} action={field} which={part === "Rescues" ? "rescue" : "abc"} />}
      {part === "Care log" && ngo ? <div className="nx-page" style={{ maxWidth: "none", paddingTop: 0 }}><SharedClinicStatus ngoId={ngo.org_id} /></div> : null}
    </Shell>
  );
}

/* ── Visits (as before, on the rebuilt pages) ────────────────────── */

const DAY_TONE: Record<string, Tone> = { Overdue: "bad", Today: "accent", Tomorrow: "plain", "This week": "plain", Imported: "warn" };
const ORDER = ["Overdue", "Today", "Tomorrow", "This week", "Imported"];
type Visit = { id: string; when: string; day: string; what: string; kind: string; place: string; who: string; animal: string | null; case: string | null; caseHref?: string; animalHref?: string };
const vCols: RCol<Visit>[] = [
  { label: "Visit", width: "minmax(0, 1.7fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.what}</b><small>{[r.case, r.animal && !r.what.includes(r.animal) ? r.animal : null].filter(Boolean).join(" · ") || r.kind}<span className="nx-only-s"> · {r.place}</span></small></span></span> },
  { label: "When", width: "150px", render: (r) => <Chip tone={DAY_TONE[r.day] ?? "plain"}>{r.day === "Overdue" ? `Overdue · ${r.when}` : r.day === "Imported" ? `Imported · ${r.when}` : r.when}</Chip> },
  { label: "Place", width: "minmax(0, 1fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.place}</span> },
  { label: "Assigned to", width: "minmax(0, 1fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.who}</span> },
];
function dayOf(iso: string) {
  const d = new Date(iso), t = new Date(); t.setHours(0, 0, 0, 0);
  const k = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - t.getTime()) / 864e5);
  return k < 0 ? "Overdue" : k === 0 ? "Today" : k === 1 ? "Tomorrow" : "This week";
}
const fmt = (iso: string) => { const d = new Date(iso); const dd = dayOf(iso); const time = d.getHours() || d.getMinutes() ? ` ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toLowerCase()}` : ""; return dd === "Today" ? `Today${time}` : dd === "Tomorrow" ? `Tomorrow${time}` : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }); };
type DueCase = { id: string; case_code: string | null; title: string | null; zone: string | null; city: string | null; assignee_name: string | null; next_action: string | null; due_at: string | null; follow_up_at: string | null; dog_id: string | null; provenance: string | null };
/** Follow-ups scheduled on a case or animal, and open cases whose own due date has come; a case with a follow-up in the list is shown once. */
async function loadVisits(ngoId: string): Promise<Visit[]> {
  const db = getSupabase(); if (!db) return [];
  const week = new Date(Date.now() + 7 * 864e5).toISOString();
  const [fs, cs] = await Promise.all([
    dueFollowups(),
    db.from("cases").select("id,case_code,title,zone,city,assignee_name,next_action,due_at,follow_up_at,dog_id,provenance").eq("ngo_id", ngoId).is("resolved_at", null).or(`due_at.lte.${week},follow_up_at.lte.${week}`).limit(300),
  ]);
  if (cs.error) throw new Error(cs.error.message);
  const imported = (src: string | null | undefined) => src === "historical_import" || src === "imported_historical_record";
  /* Each visit names its animal as the register does ("Dog 125", "Tiger (132)"), read from the organisation's own animals. */
  const caseRows = (cs.data ?? []) as DueCase[];
  const refs = await readAnimalRefs(ngoId, [...fs.map((f) => f.dog_id), ...caseRows.map((c) => c.dog_id)]);
  const named = (id: string | null, fallback?: { name: string | null; straypaw_id: string | null }) => (id && refs.get(id) ? animalLine(refs.get(id)) : id && fallback ? animalLine({ id, ...fallback }) : null);
  const say = (text: string, id: string | null) => withAnimalName(text, id ? refs.get(id) : null);
  const out: Visit[] = fs.map((f: DueFollowup) => ({ id: f.id, when: imported(f.source) ? day(f.due_at) : fmt(f.due_at), day: imported(f.source) ? "Imported" : dayOf(f.due_at), what: say(f.note || word(f.kind, "Follow-up"), f.dog_id), kind: word(f.kind, "Follow-up"), place: f.zone ?? f.city ?? "Place not recorded", who: f.assignee_name ?? "Unassigned", animal: named(f.dog_id, { name: f.animal_name, straypaw_id: f.straypaw_id }), case: f.case_code ? shortCode(f.case_code) : null, caseHref: f.case_id ? `/ngo/cases/${f.case_id}` : undefined, animalHref: f.dog_id ? `/ngo/animals/${f.dog_id}` : undefined }));
  const seen = new Set(fs.map((f) => f.case_id).filter(Boolean));
  for (const c of caseRows) {
    const due = c.due_at ?? c.follow_up_at;
    if (!due || seen.has(c.id) || due > week) continue;
    const old = imported(c.provenance);
    out.push({ id: `case:${c.id}`, when: old ? day(due) : fmt(due), day: old ? "Imported" : dayOf(due), what: say(c.next_action || c.title || "Case follow-up", c.dog_id), kind: "Case due", place: c.zone ?? c.city ?? "Place not recorded", who: c.assignee_name ?? "Unassigned", animal: named(c.dog_id), case: shortCode(c.case_code, c.id.slice(0, 8).toUpperCase()), caseHref: `/ngo/cases/${c.id}`, animalHref: c.dog_id ? `/ngo/animals/${c.dog_id}` : undefined });
  }
  return out;
}

function Visits({ ngo, tabs, action }: { ngo: Workspace | null; tabs: React.ReactNode; action: React.ReactNode }) {
  const [rows, setRows] = useState<Visit[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => { if (!ngo) return; try { setRows(await loadVisits(ngo.org_id)); setErr(null); } catch (e) { setRows([]); setErr(errText(e)); } }, [ngo]);
  useEffect(() => { void load(); }, [load]);
  const sample = !ngo;
  /* A link can open the list on one of its views (Today's "Visits overdue" opens ?show=late). */
  const [view, setView] = useState("soon");
  useEffect(() => { const s = new URLSearchParams(window.location.search).get("show"); if (s) setView(s); }, []);
  const list = useMemo<Visit[]>(() => [...(sample ? (VISITS_OPS as Visit[]).map((v) => ({ ...v, animal: sampleAnimal(v.animal) })) : rows ?? [])].sort((a, b) => ORDER.indexOf(a.day) - ORDER.indexOf(b.day) || a.place.localeCompare(b.place)), [sample, rows]);
  const byPlace = useMemo(() => { const m = new Map<string, number>(); for (const v of list) if (["Overdue", "Today", "Tomorrow"].includes(v.day)) m.set(v.place, (m.get(v.place) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1]); }, [list]);
  const overdue = list.filter((v) => v.day === "Overdue").length, today = list.filter((v) => v.day === "Today").length;
  const views: RView<Visit>[] = [{ id: "soon", label: "Due by tomorrow", test: (v) => ["Overdue", "Today", "Tomorrow"].includes(v.day) }, { id: "late", label: "Overdue", test: (v) => v.day === "Overdue" }, { id: "week", label: "Next 7 days", test: (v) => v.day !== "Imported" }, ...(list.some((v) => v.day === "Imported") ? [{ id: "imp", label: "Imported, never confirmed", test: (v: Visit) => v.day === "Imported" }] : [])];
  return (
    <RecordList id="visits" title="Operations" sample={sample} view={views.some((x) => x.id === view) ? view : "soon"} onView={setView} rows={list} rowKey={(r) => r.id} rowLabel={(r) => r.what} columns={vCols} views={views} search={(r) => `${r.what} ${r.place} ${r.who} ${r.animal ?? ""} ${r.case ?? ""}`} placeholder="Place, person, animal"
      sub={sample || rows ? <><b className="num">{today}</b> {today === 1 ? "visit" : "visits"} today{overdue ? <>, <b className="num">{overdue}</b> overdue</> : null}. {byPlace.length && byPlace[0][1] > 1 ? <>Busiest place: <b>{byPlace[0][0]}</b> ({byPlace[0][1]} due by tomorrow).</> : null}</> : "Reading field visits…"}
      action={action} above={tabs} loading={!sample && rows === null} error={err} onRetry={() => void load()} hrefOf={(r) => r.caseHref ?? r.animalHref}
      empty={{ none: "No visits due in the next 7 days", hint: "Follow-ups scheduled on cases appear here." }}
      preview={(r) => ({ title: r.what, sub: <>{r.place} <Chip tone={DAY_TONE[r.day] ?? "plain"}>{r.day}</Chip></>, href: r.caseHref, hrefLabel: "Open the case", body: <>
        <Props items={[["When", r.when], ["Kind", r.kind], ["Place", r.place], ["Assigned to", r.who], ...(r.animal ? [["Animal", r.animalHref ? <Link key="a" className="nr-link" href={r.animalHref}>{r.animal}</Link> : r.animal] as [string, React.ReactNode]] : []), ...(r.case ? [["Case", <span key="c" className="num">{r.case}</span>] as [string, React.ReactNode]] : [])]} />
        <p className="nx-note" style={{ marginTop: 14 }}><MapPin size={13} /><span>{r.day === "Imported" ? "This follow-up came from an imported register and was never confirmed. It is not counted as overdue work." : "Visits are grouped by place to help plan a round. StrayPaw does not have travel times, so it does not order a route for you."}</span></p>
        <p className="nr-hint" style={{ marginTop: 10 }}>Mark it done or missed on the case, or from <Link className="nr-link" href="/ngo/field">field mode</Link> on the phone.</p>
      </> })} />
  );
}

/* ── Care log (read only) ────────────────────────────────────────── */

const kindLabel = (k: string) => MEDICAL_KINDS.find((x) => x.id === k)?.label ?? words(k);
/* Each care entry names its animal as the register does: the name with its number beside it, or "Dog 128". */
type CareRow = { id: string; animal: string; tag: string | null; line: string; code: string; zone: string; kind: string; date: string; dateIso: string | null; notes: string; by: string; href?: string; caseHref?: string };
const careAnimal = (a: { id?: string; name: string | null; code: string | null; species?: string | null }) => { const l = animalLabel(a); return { animal: l.title, tag: l.name ? l.tag : null, line: l.line, code: l.code ?? "" }; };
const cCols: RCol<CareRow>[] = [
  { label: "Animal", width: "minmax(0, 1.3fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.animal}<AnimalTag tag={r.tag} /></b><small>{r.zone || "Place not recorded"}<span className="nx-only-s"> · {r.date}</span></small></span></span> },
  { label: "Care", width: "140px", render: (r) => <Chip tone="ok">{r.kind}</Chip> },
  { label: "Date", width: "112px", hideOnPhone: true, render: (r) => <span className="nx-t3">{r.date}</span> },
  { label: "Notes", width: "minmax(0, 1.6fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.notes || "No notes"}</span> },
  { label: "Given by", width: "minmax(0, .9fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.by || "Not recorded"}</span> },
];
type MedRow = { id: string; code: string; title: string; state: string; zone: string; notes: string; last: string; href: string };
const mCols: RCol<MedRow>[] = [
  { label: "Case", width: "minmax(0, 1.4fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.title}</b><small><span className="num">{r.code}</span>{r.zone ? ` · ${r.zone}` : ""}</small></span></span> },
  { label: "Status", width: "120px", render: (r) => <Chip tone={/resolved|closed/i.test(r.state) ? "ok" : "accent"}>{r.state}</Chip> },
  { label: "Medical notes", width: "minmax(0, 1.6fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.notes || "None"}</span> },
  { label: "Last activity", width: "112px", hideOnPhone: true, render: (r) => <span className="nx-t3">{r.last}</span> },
];
function CareLog({ ngo, tabs, action }: { ngo: Workspace | null; tabs: React.ReactNode; action: React.ReactNode }) {
  const [lane, setLane] = useState<"events" | "cases">("events");
  const [data, setData] = useState<{ rows: CareLogRow[]; total: number | null } | null>(null);
  const [cases, setCases] = useState<MedicalCase[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => { if (!ngo) return; const [a, b] = await Promise.all([readCareLog(ngo.org_id), readMedicalCases(ngo.org_id)]); if (a.error || b.error) { setErr(errText(a.error ?? b.error)); setData({ rows: [], total: 0 }); setCases([]); return; } setErr(null); setData(a.data!); setCases(b.data!); }, [ngo]);
  useEffect(() => { void load(); }, [load]);
  const sample = !ngo;
  const rows: CareRow[] = useMemo(() => sample ? SAMPLE_CARE.map((s: SampleCare) => ({ ...s, ...careAnimal({ name: s.animal, code: s.code }), dateIso: null })) : (data?.rows ?? []).map((m) => ({ id: m.id, ...careAnimal(m.animal), zone: m.animal.zone ?? "", kind: kindLabel(m.kind), date: day(m.event_date), dateIso: m.event_date, notes: careNote(m.notes), by: m.performed_by ?? "", href: `/ngo/animals/${m.animal.id}`, caseHref: m.case_id ? `/ngo/cases/${m.case_id}` : undefined })), [sample, data]);
  const kinds = useMemo(() => [...new Set(rows.map((r) => r.kind))].sort(), [rows]);
  const meds: MedRow[] = (cases ?? []).map((c) => ({ id: c.id, code: shortCode(c.case_code, c.id.slice(0, 8).toUpperCase()), title: c.title || "Case", state: words(c.status), zone: c.zone ?? "", notes: c.medical_notes ?? "", last: day(c.last_activity_at), href: `/ngo/cases/${c.id}` }));
  const switcher = <div className="nx-views" role="tablist" aria-label="Care log view" style={{ marginRight: 8 }}>{(["events", "cases"] as const).map((l) => <button key={l} type="button" role="tab" aria-selected={lane === l} className={`nx-view ${lane === l ? "is-on" : ""}`} onClick={() => setLane(l)} style={lane === l ? { background: "var(--hover)" } : undefined}><span>{l === "events" ? "Care given" : "Medical cases"}</span></button>)}</div>;
  if (lane === "cases" && !sample) return (
    <RecordList id="med" title="Operations" sample={false} rows={meds} rowKey={(r) => r.id} rowLabel={(r) => r.title} columns={mCols} views={[{ id: "all", label: "All", test: () => true }, { id: "open", label: "Open", test: (r) => !/resolved|closed/i.test(r.state) }]} search={(r) => `${r.title} ${r.code} ${r.zone} ${r.notes}`}
      sub={cases === null ? "Reading medical cases…" : <><b className="num">{n(meds.length)}</b> medical {meds.length === 1 ? "case" : "cases"} among your most recently active: injury, vaccination, sterilisation, or with medical notes.</>}
      action={action} above={<>{tabs}<div className="nr-acts" style={{ marginTop: 12 }}>{switcher}</div></>} loading={cases === null} error={err} onRetry={() => void load()} hrefOf={(r) => r.href} empty={{ none: "No medical cases yet" }}
      preview={(r) => ({ title: r.title, sub: <span className="num">{r.code}</span>, href: r.href, hrefLabel: "Open the case", body: <Props items={[["Status", r.state], ["Place", r.zone || "Not recorded"], ["Medical notes", r.notes || "None"], ["Last activity", r.last]]} /> })} />
  );
  return (
    <RecordList id="care" title="Operations" sample={sample} rows={rows} rowKey={(r) => r.id} rowLabel={(r) => `${r.kind}, ${r.line}`} columns={cCols} views={[{ id: "all", label: "All care", test: () => true }, ...kinds.map((k) => ({ id: k, label: k, test: (r: CareRow) => r.kind === k }))]} search={(r) => `${r.line} ${r.code} ${r.zone} ${r.notes} ${r.by}`} placeholder="Animal, number, place, person"
      sub={sample ? <>Care given, newest first, each beside its animal. Read only: care is recorded on an animal&apos;s record.</> : data === null ? "Reading care history…" : !rows.length ? "No care recorded yet." : data.total && data.total > rows.length ? <>The newest <b className="num">{n(rows.length)}</b> of <b className="num">{n(data.total)}</b> care entries, as dated on each record. Older entries are on each animal&apos;s record.</> : <><b className="num">{n(rows.length)}</b> care {rows.length === 1 ? "entry" : "entries"}, newest first, as dated on each record.</>}
      action={action} above={<>{tabs}{!sample ? <div className="nr-acts" style={{ marginTop: 12 }}>{switcher}</div> : null}</>} loading={!sample && data === null} error={err} onRetry={() => void load()} hrefOf={(r) => r.href}
      empty={{ none: "No care recorded yet", hint: <>Care added on an animal&apos;s record appears here. <Link className="nr-link" href="/ngo/animals">Open the register</Link>.</> }}
      preview={(r) => ({ title: `${r.kind} · ${r.line}`, sub: <>{r.zone || "Place not recorded"}{r.code ? <> · code <span className="num">{r.code}</span></> : null}</>, href: r.href, hrefLabel: "Open the animal's record", body: <>
        <Props items={[["Care", r.kind], ["Date", r.date], ["Given by", r.by || "Not recorded"], ["Notes", r.notes || "None"], ...(r.caseHref ? [["Case", <Link key="c" className="nr-link" href={r.caseHref}>Open the case</Link>] as [string, React.ReactNode]] : [])]} />
        <p className="nr-hint" style={{ marginTop: 12 }}>Recorded by your organisation. A veterinary sign-off is a separate step on the case.</p>
      </> })} />
  );
}

/* ── The two lines of work ───────────────────────────────────────── */

type Step = { id: keyof Lanes; title: string; says: string; none: string; all: string; href: string };
const RESCUE: Step[] = [
  { id: "new", title: "New", says: "Read, then accept or pass on", none: "No new report is waiting.", all: "Open the inbox", href: "/ngo/inbox" },
  { id: "care", title: "In care", says: "Most urgent first", none: "No animal is in your care right now.", all: "Open the cases", href: "/ngo/cases" },
];
const ABC: Step[] = [
  { id: "vet", title: "Vet sign-off", says: "Needs a veterinarian's signature", none: "Nothing is waiting for the veterinarian.", all: "Open submissions", href: "/ngo/submissions" },
  { id: "evidence", title: "Evidence", says: "Release photo or place", none: "Every record has what it needs.", all: "Open submissions", href: "/ngo/submissions" },
  { id: "report", title: "Ready to send", says: "Goes into this month's report", none: "Nothing is waiting to be sent.", all: "Open submissions", href: "/ngo/submissions" },
];
function LanePage({ ngo, tabs, action, which }: { ngo: Workspace | null; tabs: React.ReactNode; action: React.ReactNode; which: "rescue" | "abc" }) {
  const [lanes, setLanes] = useState<Lanes | null>(null);
  useEffect(() => { if (!ngo) return; let live = true; void readLanes(ngo.org_id).then((l) => { if (live) setLanes(l); }); return () => { live = false; }; }, [ngo]);
  const steps = which === "rescue" ? RESCUE : ABC;
  const sample = !ngo;
  const title = which === "rescue" ? "Rescues" : "Sterilisation";
  return (
    <div className="nx-page" style={{ maxWidth: "none" }}>
      <div className="nx-head"><div><h1 className="nx-h1">Operations{sample ? <Sample /> : null}</h1><p className="nx-sub">{which === "rescue" ? "Animals someone asked you to help, from the first report until the case is closed." : "Each procedure, from the operation to the report the municipality accepts. The database's own flags say where each one stands."}</p></div>{action}</div>
      {tabs}
      <h2 className="nx-h3" style={{ marginTop: 18 }}>{title}, step by step</h2>
      <ol className="nr-lanes">
        {steps.map((s, i) => {
          const cards: (LaneCard | { key: string; title: string; meta: string; tag: string; hot?: boolean })[] | null = sample ? (which === "rescue" ? SAMPLE_LANES.rescue : SAMPLE_LANES.abc)[i]?.cards ?? [] : lanes ? lanes[s.id] : null;
          const count = cards?.length ?? 0;
          return (
            <li key={s.id} className="nr-lane" id={s.id}>
              <h2><span className="nr-lane-n" aria-hidden>{i + 1}</span>{s.title}{cards ? <span className="nx-count">{count}</span> : null}</h2>
              <p>{s.says}</p>
              {!sample && lanes === null ? <p className="nr-quiet" role="status">Reading…</p>
                : cards === null ? <p className="nr-err" role="alert">This list could not be read. Check the connection and reload.</p>
                : !count ? <p className="nr-quiet">{s.none}</p>
                : <ul>{cards.slice(0, 6).map((k) => { const lc = "href" in k ? k : null; return <li key={k.key} className={k.hot ? "is-hot" : undefined}><Link href={sample ? "/try" : lc!.href} title={sample ? "Opens the live demo, where this works" : undefined}><b>{k.title}</b><Chip tone={lc ? lc.tag.tone : k.hot ? "bad" : "plain"}>{lc ? lc.tag.label : (k as { tag: string }).tag}</Chip><small>{lc ? [lc.code, lc.meta, lc.age === null ? "" : lc.age === 0 ? "today" : `${lc.age} days`, lc.who ? `with ${lc.who}` : ""].filter(Boolean).join(" · ") : k.meta}</small></Link></li>; })}
                  {count > 6 ? <li><Link href={s.href} className="nr-link" style={{ display: "inline-flex", minHeight: 36, alignItems: "center", gap: 4 }}>See all {count}<ArrowRight size={13} /></Link></li> : null}</ul>}
              {count <= 6 && cards && count ? <p style={{ marginTop: 4 }}><Link className="nr-link" href={sample ? "/try" : s.href}>{s.all}</Link></p> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
