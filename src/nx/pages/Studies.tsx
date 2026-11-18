"use client";

import { About, GhMark } from "./gh/parts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Camera, Download, Info, Lock, Plus } from "lucide-react";
import { call, type Count, type Place, type ProgrammeRef } from "@/oh/data";
import { getSupabase } from "@/lib/supabase";
import { ListPage, type Col } from "../ListPage";
import { Shell } from "../Shell";
import { Chip } from "../ui";
import type { Tone } from "../fixtures";
import { useLive } from "../live";

/* Research studies and their reports. A study names a question, the programme whose aggregated data it uses and a
   cohort (period, animal, category, areas). A report is a versioned snapshot of that programme's suppressed extract,
   taken by the database as the signed-in person: it can never hold more than the person may see, and it never changes
   afterwards. Suppressed cells are counted apart, never added in. Kaju does not write studies or reports. */

type Cohort = { days?: number; species?: string; category?: string; areas?: string[] };
type Study = { id: string; title: string; question: string | null; design: string | null; programme_id: string | null; cohort: Cohort; status: "draft" | "active" | "closed"; created_at: string; updated_at: string };
type Note = { id: string; study_id: string; body: string; author_name: string | null; created_at: string };
type Row = { week: string; area: string; species: string; category: string; exposures: Count };
type Output = { id: string; study_id: string; version: number; title: string; summary: string | null; caveats: string | null; query: { programme_id: string; days: number; cohort: Cohort; source: string }; snapshot: { since: string; suppress_below: number; rows: Row[] }; created_at: string };
const STATUS: Record<Study["status"], [string, Tone]> = { draft: ["Draft", "plain"], active: ["Active", "accent"], closed: ["Closed", "ok"] };
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const cohortText = (c: Cohort) => [`last ${c.days ?? 365} days`, c.species ? c.species : "all animals", c.category ? `category ${c.category}` : "all categories", c.areas?.length ? c.areas.join(", ") : "all areas"].join(" · ");

/* Sample data, invented. */
const S_STUDIES: Study[] = [
  { id: "st1", title: "Category III exposures and wound washing before arrival", question: "Is washing before arrival recorded more often in some areas than others?", design: "Descriptive, by area and month. No causal claims.", programme_id: "p", cohort: { days: 365, category: "III" }, status: "active", created_at: "2026-10-02", updated_at: "2026-11-12" },
  { id: "st2", title: "Cat exposures over the past year", question: "How often are cats recorded as the animal involved?", design: "Counts by week and area.", programme_id: "p", cohort: { days: 365, species: "cat" }, status: "draft", created_at: "2026-11-08", updated_at: "2026-11-08" },
];
const S_NOTES: Note[] = [{ id: "n1", study_id: "st1", body: "Two areas have mostly suppressed cells; report them as 'fewer than 5' only.", author_name: "Analyst", created_at: "2026-11-12" }];
const sRows = (): Row[] => ["HSR Layout", "Koramangala", "Jayanagar"].flatMap((a, i) => ["2026-10-06", "2026-10-13", "2026-10-20"].map((w, j) => ({ week: w, area: a, species: "dog", category: "III", exposures: (i + j) % 3 === 0 ? "<5" as const : 5 + i * 2 + j })));
const S_OUTPUTS: Output[] = [{ id: "o1", study_id: "st1", version: 1, title: "Category III exposures by area, October", summary: "Counts by area and week. Most cells are at or above 5.", caveats: "Descriptive only. Differences between areas can come from how much is reported.", query: { programme_id: "p", days: 365, cohort: { category: "III" }, source: "oh_research_extract" }, snapshot: { since: "2025-11-15", suppress_below: 5, rows: sRows() }, created_at: "2026-11-12" }];

function useResearch() {
  const live = useLive();
  const org = live.orgFor("research");
  const orgId = live.org ? org?.org_id ?? null : null;
  const [progs, setProgs] = useState<ProgrammeRef[]>([]);
  const [studies, setStudies] = useState<Study[] | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [outputs, setOutputs] = useState<Output[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    const db = getSupabase(); if (!db || !orgId) return;
    const [s, n, o] = await Promise.all([
      db.from("nx_studies").select("id,title,question,design,programme_id,cohort,status,created_at,updated_at").eq("org_id", orgId).order("updated_at", { ascending: false }),
      db.from("nx_study_notes").select("id,study_id,body,author_name,created_at").order("created_at", { ascending: true }).limit(500),
      db.from("nx_study_outputs").select("id,study_id,version,title,summary,caveats,query,snapshot,created_at").eq("org_id", orgId).order("created_at", { ascending: false }),
    ]);
    if (s.error) { setErr(/does not exist|schema cache|PGRST205|42P01/i.test(`${s.error.code} ${s.error.message}`) ? "Studies are not set up on this database yet." : "Studies could not be read."); setStudies([]); setOutputs([]); return; }
    setStudies((s.data ?? []) as Study[]); setNotes((n.data ?? []) as Note[]); setOutputs((o.data ?? []) as Output[]); setErr(null);
  }, [orgId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!orgId) return; let alive = true; call<Place[]>("oh_my_today").then((r) => { if (alive) setProgs((Array.isArray(r.data) ? r.data : []).find((p) => p.organisation_id === orgId)?.programmes ?? []); }); return () => { alive = false; }; }, [orgId]);
  const sample = live.ready && !live.org;
  return { live, org, orgId, sample, progs: sample ? [{ id: "p", slug: "sample", name: "Bengaluru Rabies Elimination · Illustrative", illustrative: true }] : progs,
    studies: sample ? S_STUDIES : studies, notes: sample ? S_NOTES : notes, outputs: sample ? S_OUTPUTS : outputs, err, load };
}
const NotResearch = ({ crumb }: { crumb: string }) => <Shell ws="research" crumb={["Research", crumb]}><div className="nx-page"><h1 className="nx-h1">{crumb}</h1><p className="nx-sub">Your account is not part of a research organisation. Researchers request access from the programme that holds the data; it is not granted by choosing a menu.</p></div></Shell>;

/* ── Studies ──────────────────────────────────────────────────────── */
export function Studies() {
  const r = useResearch();
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const progName = (id: string | null) => r.progs.find((p) => p.id === id)?.name ?? "No programme chosen";
  if (!r.live.ready) return <Shell ws="research" crumb={["Research", "Studies"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  if (!r.sample && !r.org) return <NotResearch crumb="Studies" />;
  const list = r.studies ?? [];
  const create = async (f: FormData) => {
    if (r.sample) { setMsg("Sample data: sign in as a researcher to start a study."); setCreating(false); return; }
    const db = getSupabase(); if (!db || !r.orgId) return;
    const days = Number(f.get("days")) || 365;
    const cohort: Cohort = { days, ...(f.get("species") ? { species: String(f.get("species")) } : {}), ...(f.get("category") ? { category: String(f.get("category")) } : {}) };
    setBusy(true);
    const { error } = await db.from("nx_studies").insert({ org_id: r.orgId, title: String(f.get("title") ?? "").trim(), question: String(f.get("question") ?? "").trim() || null, design: String(f.get("design") ?? "").trim() || null, programme_id: String(f.get("programme") ?? "") || null, cohort });
    setBusy(false);
    if (error) { setMsg(error.message.includes("check") ? "Give the study a title of at least 3 characters." : error.message); return; }
    setCreating(false); setMsg("Study started as a draft."); await r.load();
  };
  const addNote = async (s: Study, body: string) => {
    if (r.sample) { setMsg("Sample data: sign in to add notes."); return; }
    const db = getSupabase(); if (!db || !body.trim()) return;
    const { error } = await db.from("nx_study_notes").insert({ study_id: s.id, body: body.trim(), author_name: r.live.userName });
    setMsg(error ? error.message : "Note added."); await r.load();
  };
  const snapshot = async (s: Study, f: FormData) => {
    if (r.sample) { setMsg("Sample data: sign in to take a snapshot of the programme's data."); return; }
    const db = getSupabase(); if (!db) return;
    setBusy(true);
    const { error } = await db.rpc("nx_study_snapshot", { p_study: s.id, p_title: String(f.get("title") ?? "").trim() || s.title, p_summary: String(f.get("summary") ?? "").trim() || null, p_caveats: String(f.get("caveats") ?? "").trim() || null });
    setBusy(false);
    setMsg(error ? error.message : "Snapshot saved as a new report version. It is listed under Reports."); await r.load();
  };
  const cols: Col<Study>[] = [
    { label: "Study", width: "minmax(0, 1.6fr)", render: (s) => <span className="nx-cell-main"><span><b>{s.title}</b><small>{cohortText(s.cohort)}<span className="nx-only-s"> · {STATUS[s.status][0]}</span></small></span></span> },
    { label: "Programme", width: "minmax(0, 1fr)", hideOnPhone: true, render: (s) => <span className="nx-t2">{progName(s.programme_id)}</span> },
    { label: "Reports", width: "80px", hideOnPhone: true, render: (s) => <span className="num">{(r.outputs ?? []).filter((o) => o.study_id === s.id).length}</span> },
    { label: "State", width: "100px", hideOnPhone: true, render: (s) => <Chip tone={STATUS[s.status][1]}>{STATUS[s.status][0]}</Chip> },
  ];
  return <>
    <ListPage ws="research" crumb={["Research", "Studies"]} title="Studies" sample={r.sample} eyebrow={r.sample ? "Programme Epidemiology Unit" : r.org!.name}
      sub={r.studies === null ? "Reading studies…" : <><b className="num">{list.filter((s) => s.status !== "closed").length}</b> open {list.filter((s) => s.status !== "closed").length === 1 ? "study" : "studies"}. <About>Each uses one programme&apos;s aggregated data, with small counts suppressed by the database.</About><GhMark /></>}
      action={<button type="button" className="nx-btn is-keep" onClick={() => setCreating(true)}><Plus size={14} />New study</button>}
      views={[{ id: "open", label: "Open", test: (s: Study) => s.status !== "closed" }, { id: "closed", label: "Closed", test: (s: Study) => s.status === "closed" }, { id: "all", label: "All", test: () => true }]}
      columns={cols} rows={list} rowKey={(s) => s.id} rowLabel={(s) => s.title} search={(s) => `${s.title} ${s.question ?? ""}`}
      preview={(s) => ({ title: s.title, sub: <><Chip tone={STATUS[s.status][1]}>{STATUS[s.status][0]}</Chip> <span className="nx-t3">updated {day(s.updated_at)}</span></>, body: <>
        <dl className="nx-props"><div><dt>Question</dt><dd>{s.question ?? "Not written yet"}</dd></div><div><dt>Design</dt><dd>{s.design ?? "Not written yet"}</dd></div><div><dt>Programme</dt><dd>{progName(s.programme_id)}</dd></div><div><dt>Cohort</dt><dd>{cohortText(s.cohort)}</dd></div></dl>
        <h3 className="nx-h3" style={{ marginTop: 18 }}>Take a snapshot</h3>
        <form className="nx-form" onSubmit={(e) => { e.preventDefault(); void snapshot(s, new FormData(e.currentTarget)); }}>
          <input name="title" placeholder="Report title" aria-label="Report title" defaultValue={s.title} maxLength={160} />
          <textarea name="summary" rows={2} placeholder="What it shows, in plain words" aria-label="Summary" maxLength={4000} />
          <textarea name="caveats" rows={2} placeholder="Caveats: what it cannot show" aria-label="Caveats" maxLength={2000} defaultValue="Descriptive counts only. Differences between areas can come from how much is reported." />
          <button type="submit" className="nx-btn is-sm" disabled={busy || !s.programme_id}><Camera size={12} />{busy ? "Saving…" : "Save as a new report version"}</button>
          {!s.programme_id ? <p className="nx-foot">Choose a programme for this study first.</p> : null}
        </form>
        <h3 className="nx-h3" style={{ marginTop: 18 }}>Notes</h3>
        <ul className="nx-feed">{r.notes.filter((n) => n.study_id === s.id).map((n) => <li key={n.id} style={{ gridTemplateColumns: "minmax(0, 1fr)" }}><div><p style={{ color: "var(--ink)" }}>{n.body}</p><small>{n.author_name ?? "A member"} · {day(n.created_at)}</small></div></li>)}</ul>
        <form className="nx-form" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; void addNote(s, String(new FormData(f).get("note") ?? "")); f.reset(); }}><textarea name="note" rows={2} placeholder="Add a note" aria-label="Add a note" maxLength={4000} /><button type="submit" className="nx-btn is-sm is-quiet">Add note</button></form>
        {msg ? <p className="nx-foot" role="status">{msg}</p> : null}
        <p className="nx-note" style={{ marginTop: 14 }}><Lock size={13} /><span>A snapshot is taken by the database as you, from data you are already allowed to see. Kaju does not write studies or reports.</span></p></> })}
      loading={r.studies === null} error={r.err} note={msg} empty={{ none: "No studies yet", hint: "Start one with a question and the programme whose data it uses." }} />
    {creating ? <div className="nx-modal" role="dialog" aria-label="New study" onKeyDown={(e) => { if (e.key === "Escape") setCreating(false); }}>
      <form className="nx-modal-b nx-form" onSubmit={(e) => { e.preventDefault(); void create(new FormData(e.currentTarget)); }}>
        <h2 className="nx-h3" style={{ marginTop: 0, fontSize: 15 }}>New study</h2>
        <label>Title<input name="title" required minLength={3} maxLength={160} autoFocus /></label>
        <label>Question<textarea name="question" rows={2} maxLength={2000} placeholder="What do you want to find out?" /></label>
        <label>Design<textarea name="design" rows={2} maxLength={2000} placeholder="How: descriptive counts, comparison, time trend…" /></label>
        <label>Programme<select name="programme" defaultValue={r.progs[0]?.id ?? ""}>{r.progs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}<option value="">Choose later</option></select></label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label>Period<select name="days" defaultValue="365"><option value="90">90 days</option><option value="180">6 months</option><option value="365">12 months</option><option value="730">2 years</option></select></label>
          <label>Animal<select name="species" defaultValue=""><option value="">All</option><option value="dog">Dog</option><option value="cat">Cat</option><option value="other">Other</option></select></label>
          <label>Category<select name="category" defaultValue=""><option value="">All</option><option value="I">I</option><option value="II">II</option><option value="III">III</option></select></label>
        </div>
        <div style={{ display: "flex", gap: 8 }}><button type="submit" className="nx-btn" disabled={busy}>{busy ? "Starting…" : "Start study"}</button><button type="button" className="nx-btn is-quiet" onClick={() => setCreating(false)}>Cancel</button></div>
      </form>
    </div> : null}
  </>;
}

/* ── Reports: versioned snapshots ─────────────────────────────────── */
function summarise(rows: Row[]) {
  const by = new Map<string, { known: number; suppressed: number }>();
  for (const r of rows) { const k = r.area; const x = by.get(k) ?? { known: 0, suppressed: 0 }; if (typeof r.exposures === "number") x.known += r.exposures; else if (r.exposures === "<5") x.suppressed += 1; by.set(k, x); }
  return [...by].sort((a, b) => b[1].known - a[1].known);
}
const csv = (o: Output) => {
  const head = "week,area,species,category,exposures";
  const body = o.snapshot.rows.map((r) => [r.week, r.area, r.species, r.category, r.exposures ?? ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const blob = new Blob([[`# ${o.title} (version ${o.version}), taken ${o.created_at}. Counts under ${o.snapshot.suppress_below} are shown as <5.`, head, ...body].join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${o.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-v${o.version}.csv`; a.click(); URL.revokeObjectURL(a.href);
};
export function ResearchReports() {
  const r = useResearch();
  const studyOf = useMemo(() => new Map((r.studies ?? []).map((s) => [s.id, s])), [r.studies]);
  if (!r.live.ready) return <Shell ws="research" crumb={["Research", "Reports"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  if (!r.sample && !r.org) return <NotResearch crumb="Reports" />;
  const list = r.outputs ?? [];
  const cols: Col<Output>[] = [
    { label: "Report", width: "minmax(0, 1.6fr)", render: (o) => <span className="nx-cell-main"><span><b>{o.title}</b><small>{studyOf.get(o.study_id)?.title ?? "Study"} · version {o.version}</small></span></span> },
    { label: "Rows", width: "80px", hideOnPhone: true, render: (o) => <span className="num">{o.snapshot.rows.length}</span> },
    { label: "Taken", width: "130px", hideOnPhone: true, render: (o) => <span className="nx-t3">{day(o.created_at)}</span> },
  ];
  return <ListPage ws="research" crumb={["Research", "Reports"]} title="Reports" sample={r.sample} eyebrow={r.sample ? "Programme Epidemiology Unit" : r.org!.name}
    sub={r.outputs === null ? "Reading reports…" : <><b className="num">{list.length}</b> report {list.length === 1 ? "version" : "versions"}. <About>Each is a fixed snapshot with the exact query that made it; it does not change when the data does.</About><GhMark /></>}
    views={[{ id: "all", label: "All", test: () => true }]} columns={cols} rows={list} rowKey={(o) => o.id} rowLabel={(o) => `${o.title} v${o.version}`} search={(o) => `${o.title} ${o.summary ?? ""}`}
    preview={(o) => { const sum = summarise(o.snapshot.rows); const max = Math.max(1, ...sum.map(([, x]) => x.known)); return { title: o.title, sub: <>Version {o.version} · taken {day(o.created_at)}</>, body: <>
      {o.summary ? <p style={{ marginBottom: 12 }}>{o.summary}</p> : null}
      <h3 className="nx-h3">By area</h3>
      <div className="nx-bars">{sum.map(([area, x]) => <div key={area} className="nx-barrow" style={{ gridTemplateColumns: "110px minmax(0, 1fr) 110px" }}><span className="nx-t2">{area}</span><span className="nx-bar-t"><span style={{ width: `${(x.known / max) * 100}%` }} /></span><em>{x.known || "—"}{x.suppressed ? ` · ${x.suppressed} under 5` : ""}</em></div>)}</div>
      <p className="nx-foot">Known counts are added. Cells under {o.snapshot.suppress_below} are counted apart (&ldquo;under 5&rdquo;) and never added in; a dash means every cell in that area was under 5.</p>
      <h3 className="nx-h3" style={{ marginTop: 18 }}>Exact query</h3>
      <dl className="nx-props"><div><dt>Source</dt><dd>Programme extract, suppressed by the database</dd></div><div><dt>Period</dt><dd>{o.query.days} days, from {day(o.snapshot.since)}</dd></div><div><dt>Cohort</dt><dd>{cohortText(o.query.cohort)}</dd></div></dl>
      {o.caveats ? <p className="nx-note" style={{ marginTop: 12 }}><Info size={13} /><span>{o.caveats}</span></p> : null}
      <p style={{ marginTop: 14 }}><button type="button" className="nx-btn is-sm" onClick={() => csv(o)}><Download size={12} />Download CSV</button></p></> }; }}
    loading={r.outputs === null} error={r.err} empty={{ none: "No reports yet", hint: "Open a study and save a snapshot; it appears here as version 1." }} />;
}
