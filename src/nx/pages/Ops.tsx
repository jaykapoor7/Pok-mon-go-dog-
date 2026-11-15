"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Route } from "lucide-react";
import { dueFollowups, type DueFollowup } from "@/lib/ops";
import { getSupabase } from "@/lib/supabase";
import { KIND_LABEL, orgCampaigns, type CampaignStats } from "@/lib/campaigns";
import { ListPage, type Col } from "../ListPage";
import { Shell } from "../Shell";
import { Chip } from "../ui";
import { DRIVES, VISITS_OPS, type Tone } from "../fixtures";
import { useLive } from "../live";

const word = (v: string | null | undefined, none = "—") => (v ? v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : none);
const DAY_TONE: Record<string, Tone> = { Overdue: "bad", Today: "accent", Tomorrow: "plain", "This week": "plain", Imported: "warn" };
const ORDER = ["Overdue", "Today", "Tomorrow", "This week", "Imported"];

/* ── Operations: the field visits due, grouped by day and by place so a team can plan a route ── */
type Visit = { id: string; when: string; day: string; what: string; kind: string; place: string; who: string; animal: string | null; case: string | null; caseHref?: string; animalHref?: string };
const vCols: Col<Visit>[] = [
  { label: "Visit", width: "minmax(0, 1.7fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.what}</b><small>{[r.case, r.animal].filter(Boolean).join(" · ") || r.kind}<span className="nx-only-s"> · {r.place}</span></small></span></span> },
  { label: "When", width: "150px", render: (r) => <Chip tone={DAY_TONE[r.day] ?? "plain"}>{r.day === "Overdue" ? `Overdue · ${r.when}` : r.day === "Imported" ? `Imported · ${r.when}` : r.when}</Chip> },
  { label: "Place", width: "minmax(0, 1fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.place}</span> },
  { label: "Assigned to", width: "minmax(0, 1fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.who}</span> },
];
function dayOf(iso: string) {
  const d = new Date(iso), t = new Date(); t.setHours(0, 0, 0, 0);
  const n = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - t.getTime()) / 864e5);
  return n < 0 ? "Overdue" : n === 0 ? "Today" : n === 1 ? "Tomorrow" : "This week";
}
const fmt = (iso: string) => { const d = new Date(iso); const day = dayOf(iso); const time = d.getHours() || d.getMinutes() ? ` ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toLowerCase()}` : ""; return day === "Today" ? `Today${time}` : day === "Tomorrow" ? `Tomorrow${time}` : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }); };

const short = (code: string | null) => (code && code.length > 14 ? `${code.slice(0, 4)}…${code.slice(-6)}` : code);
type DueCase = { id: string; case_code: string | null; title: string | null; zone: string | null; city: string | null; assignee_name: string | null; next_action: string | null; due_at: string | null; follow_up_at: string | null; dog_id: string | null; provenance: string | null };
/** Two kinds of visit: follow-ups scheduled on a case or animal, and open cases whose own due date has come.
    A case that already has a scheduled follow-up in the list is shown once, by its follow-up. */
async function load(ngoId: string): Promise<Visit[]> {
  const db = getSupabase(); if (!db) return [];
  const week = new Date(Date.now() + 7 * 864e5).toISOString();
  const [fs, cs] = await Promise.all([
    dueFollowups(),
    db.from("cases").select("id,case_code,title,zone,city,assignee_name,next_action,due_at,follow_up_at,dog_id,provenance").eq("ngo_id", ngoId).is("resolved_at", null).or(`due_at.lte.${week},follow_up_at.lte.${week}`).limit(300),
  ]);
  if (cs.error) throw new Error(cs.error.message);
  const imported = (src: string | null | undefined) => src === "historical_import" || src === "imported_historical_record";
  const out: Visit[] = fs.map((f: DueFollowup) => ({ id: f.id, when: imported(f.source) ? new Date(f.due_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : fmt(f.due_at), day: imported(f.source) ? "Imported" : dayOf(f.due_at), what: f.note || word(f.kind, "Follow-up"), kind: word(f.kind, "Follow-up"), place: f.zone ?? f.city ?? "Place not recorded", who: f.assignee_name ?? "Unassigned", animal: f.animal_name ?? f.straypaw_id, case: short(f.case_code), caseHref: f.case_id ? `/ngo/cases/${f.case_id}` : undefined, animalHref: f.dog_id ? `/next/ngo/animals/${f.dog_id}` : undefined }));
  const seen = new Set(fs.map((f) => f.case_id).filter(Boolean));
  for (const c of (cs.data ?? []) as DueCase[]) {
    const due = c.due_at ?? c.follow_up_at;
    if (!due || seen.has(c.id) || due > week) continue;
    const old = imported(c.provenance);
    out.push({ id: `case:${c.id}`, when: old ? new Date(due).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : fmt(due), day: old ? "Imported" : dayOf(due), what: c.next_action || c.title || "Case follow-up", kind: "Case due", place: c.zone ?? c.city ?? "Place not recorded", who: c.assignee_name ?? "Unassigned", animal: null, case: short(c.case_code) ?? c.id.slice(0, 8).toUpperCase(), caseHref: `/ngo/cases/${c.id}`, animalHref: c.dog_id ? `/next/ngo/animals/${c.dog_id}` : undefined });
  }
  return out;
}

export function Operations() {
  const live = useLive();
  const ngo = live.orgFor("ngo") ?? null;
  const [rows, setRows] = useState<Visit[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ngoId = ngo?.org_id ?? null;
  useEffect(() => {
    if (!live.ready || !ngoId) return;
    let alive = true;
    load(ngoId).then((v) => { if (alive) setRows(v); }).catch((e: unknown) => { if (alive) { setRows([]); setErr(e instanceof Error ? e.message : "Field visits could not be read."); } });
    return () => { alive = false; };
  }, [live.ready, ngoId]);
  const sample = live.ready && !live.org;
  const list: Visit[] = useMemo(() => (sample ? VISITS_OPS : rows ?? []), [sample, rows]);
  const byPlace = useMemo(() => { const m = new Map<string, number>(); for (const v of list) if (["Overdue", "Today", "Tomorrow"].includes(v.day)) m.set(v.place, (m.get(v.place) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1]); }, [list]);
  if (!live.ready) return <Shell crumb={["NGO", "Operations"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  if (live.org && !ngo) return <Shell crumb={["NGO", "Operations"]}><div className="nx-page"><h1 className="nx-h1">Operations</h1><p className="nx-sub">Your account is not part of an NGO, so there are no field visits here.</p></div></Shell>;
  const overdue = list.filter((v) => v.day === "Overdue").length, today = list.filter((v) => v.day === "Today").length;
  return (
    <ListPage crumb={["NGO", "Operations"]} title="Operations" sample={sample}
      sub={sample || rows ? <><b className="num">{today}</b> {today === 1 ? "visit" : "visits"} today{overdue ? <>, <b className="num">{overdue}</b> overdue</> : null}. {byPlace.length && byPlace[0][1] > 1 ? <>Busiest place: <b>{byPlace[0][0]}</b> ({byPlace[0][1]} due by tomorrow).</> : null}</> : "Reading field visits…"}
      action={sample ? <Link href="/try" className="nx-btn" title="Opens the live demo, where this works"><Route size={14} />Plan today&apos;s round</Link> : <Link href="/ngo/field" className="nx-btn"><Route size={14} />Open field mode</Link>}
      views={[{ id: "soon", label: "Due by tomorrow", test: (v: Visit) => ["Overdue", "Today", "Tomorrow"].includes(v.day) }, { id: "late", label: "Overdue", test: (v: Visit) => v.day === "Overdue" }, { id: "week", label: "Next 7 days", test: (v: Visit) => v.day !== "Imported" }, ...(list.some((v) => v.day === "Imported") ? [{ id: "imp", label: "Imported, never confirmed", test: (v: Visit) => v.day === "Imported" }] : [])]}
      columns={vCols} rows={list} rowKey={(r) => r.id} rowLabel={(r) => r.what} search={(r) => `${r.what} ${r.place} ${r.who} ${r.animal ?? ""} ${r.case ?? ""}`}
      sort={(a, b) => ORDER.indexOf(a.day) - ORDER.indexOf(b.day) || a.place.localeCompare(b.place)}
      preview={(r) => ({ title: r.what, sub: <>{r.place} <Chip tone={DAY_TONE[r.day] ?? "plain"}>{r.day}</Chip></>, body: <><dl className="nx-props"><div><dt>When</dt><dd>{r.when}</dd></div><div><dt>Kind</dt><dd>{r.kind}</dd></div><div><dt>Place</dt><dd>{r.place}</dd></div><div><dt>Assigned to</dt><dd>{r.who}</dd></div>{r.animal ? <div><dt>Animal</dt><dd>{r.animalHref ? <Link href={r.animalHref} style={{ color: "var(--accent)" }}>{r.animal}</Link> : r.animal}</dd></div> : null}{r.case ? <div><dt>Case</dt><dd className="num">{r.case}</dd></div> : null}</dl><p className="nx-note" style={{ marginTop: 14 }}><MapPin size={13} /><span>{r.day === "Imported" ? "This follow-up came from an imported register and was never confirmed. It is not counted as overdue work." : "Visits are grouped by place to help plan a round. StrayPaw does not have travel times, so it does not order a route for you."}</span></p></>, href: r.caseHref, hrefLabel: "Open the case", hrefNote: "Recording what was found opens the case or field mode in the current app." })}
      loading={!sample && rows === null} note={err} empty={{ none: "No visits due in the next 7 days", hint: "Follow-ups scheduled on cases appear here." }} />
  );
}

/* ── Programmes: the NGO's drives, with what is known and what is not ── */
type Drive = { id: string; name: string; kind: string; zone: string; dates: string; animals: number; sterilised: number; sterUnknown: number; vaccinated: number; vaccUnknown: number; people: number; archived: boolean; href?: string };
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");
function Known({ n, unknown, total, label }: { n: number; unknown: number; total: number; label: string }) {
  const known = total - unknown;
  return <span className="nx-cov" title={`${n} ${label} of ${known} with a known status; ${unknown} not recorded`}><span className="nx-bar-t" style={{ width: 64 }}><span style={{ width: known ? `${(n / known) * 100}%` : "0%" }} /></span><span className="num">{pct(n, known)}</span>{unknown ? <small className="nx-t3">{unknown} unknown</small> : null}</span>;
}
const dCols: Col<Drive>[] = [
  { label: "Programme", width: "minmax(0, 1.5fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.name}</b><small>{r.kind} · {r.dates}<span className="nx-only-s"> · {r.animals} animals · {pct(r.sterilised, r.animals - r.sterUnknown)} sterilised, {pct(r.vaccinated, r.animals - r.vaccUnknown)} vaccinated of known</span></small></span></span> },
  { label: "Place", width: "minmax(0, .8fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.zone}</span> },
  { label: "Animals", width: "80px", hideOnPhone: true, render: (r) => <span className="num">{r.animals}</span> },
  { label: "Sterilised (of known)", width: "190px", hideOnPhone: true, render: (r) => <Known n={r.sterilised} unknown={r.sterUnknown} total={r.animals} label="sterilised" /> },
  { label: "Vaccinated (of known)", width: "190px", hideOnPhone: true, render: (r) => <Known n={r.vaccinated} unknown={r.vaccUnknown} total={r.animals} label="vaccinated" /> },
];
const span = (a: string | null, b: string | null) => { const f = (x: string) => new Date(x).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); return a && b ? `${f(a)} – ${f(b)}` : a ? `From ${f(a)}` : "No dates"; };

export function NgoProgrammes() {
  const live = useLive();
  const ngo = live.orgFor("ngo") ?? null;
  const [rows, setRows] = useState<Drive[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ngoId = ngo?.org_id ?? null;
  useEffect(() => {
    if (!live.ready || !ngoId) return;
    let alive = true;
    orgCampaigns(true).then((cs: CampaignStats[]) => { if (alive) setRows(cs.map((c) => ({ id: c.id, name: c.name, kind: KIND_LABEL[c.kind] ?? word(c.kind), zone: c.zone ?? "—", dates: span(c.starts_on, c.ends_on), animals: c.total, sterilised: c.sterilised, sterUnknown: c.ster_unknown, vaccinated: c.vaccinated, vaccUnknown: c.vacc_unknown, people: c.people, archived: c.archived, href: `/ngo/programmes/${c.id}` }))); })
      .catch((e: unknown) => { if (alive) { setRows([]); setErr(e instanceof Error ? e.message : "Programmes could not be read."); } });
    return () => { alive = false; };
  }, [live.ready, ngoId]);
  const sample = live.ready && !live.org;
  const list: Drive[] = sample ? DRIVES : rows ?? [];
  if (!live.ready) return <Shell crumb={["NGO", "Programmes"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  if (live.org && !ngo) return <Shell crumb={["NGO", "Programmes"]}><div className="nx-page"><h1 className="nx-h1">Programmes</h1><p className="nx-sub">Your account is not part of an NGO. A government or coordinating office sees its programmes under Government &amp; Programmes.</p></div></Shell>;
  const active = list.filter((d) => !d.archived);
  return (
    <ListPage crumb={["NGO", "Programmes"]} title="Programmes" sample={sample}
      sub={sample || rows ? <><b className="num">{active.length}</b> active, {active.reduce((a, d) => a + d.animals, 0).toLocaleString("en-IN")} animals recorded in them. Percentages count only animals whose status was recorded.</> : "Reading programmes…"}
      action={sample ? <Link href="/try" className="nx-btn" title="Opens the live demo, where this works">New programme</Link> : <Link href="/ngo/programmes" className="nx-btn">New programme</Link>}
      views={[{ id: "active", label: "Active", test: (d: Drive) => !d.archived }, { id: "archived", label: "Archived", test: (d: Drive) => d.archived }, { id: "all", label: "All", test: () => true }]}
      columns={dCols} rows={list} rowKey={(r) => r.id} rowLabel={(r) => r.name} search={(r) => `${r.name} ${r.zone} ${r.kind}`}
      preview={(r) => ({ title: r.name, sub: <>{r.kind} · {r.zone}{r.archived ? <> <Chip bare>Archived</Chip></> : null}</>, body: <><dl className="nx-props"><div><dt>Dates</dt><dd>{r.dates}</dd></div><div><dt>Animals</dt><dd className="num">{r.animals}</dd></div><div><dt>Sterilised</dt><dd><span className="num">{r.sterilised}</span>&nbsp;<span className="nx-t3">of {r.animals - r.sterUnknown} known · {r.sterUnknown} not recorded</span></dd></div><div><dt>Vaccinated</dt><dd><span className="num">{r.vaccinated}</span>&nbsp;<span className="nx-t3">of {r.animals - r.vaccUnknown} known · {r.vaccUnknown} not recorded</span></dd></div><div><dt>People</dt><dd className="num">{r.people}</dd></div></dl><p className="nx-note" style={{ marginTop: 14 }}><span>These are animals the NGO recorded in this programme, not a share of the area&apos;s dog population. Population coverage needs a dated estimate, set by the programme coordinator.</span></p></>, href: r.href, hrefLabel: "Open the programme", hrefNote: "Zones, staff and the full breakdown open in the current app." })}
      loading={!sample && rows === null} note={err} empty={{ none: "No programmes yet", hint: "A programme groups the animals recorded in one drive, census or round." }} />
  );
}
