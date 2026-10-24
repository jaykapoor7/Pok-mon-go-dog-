"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Projects (1.0 /partner/projects).

   A register for work that is not a census: a rabies drive, an ABC
   drive, a school round. Each project names its own fields; each entry
   fills them in. Above the rows: entries week by week (is anyone still
   recording?) and, per field, how often it was filled, the missing part
   hatched. Projects are surveys carrying a field marker; create_survey
   and submit_survey_response are the 1.0 flows, unchanged.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, Plus } from "lucide-react";
import { getSurveyResponses, getSurveys, getSurveyTotals, PROJECT_MARKER } from "@/lib/surveys";
import type { Survey } from "@/lib/types";
import { useMembership } from "../../shell/Shell";
import { Ack, Method, State, day, n } from "../../ui";
import { Reading } from "../../ui/Reading";
import { addProjectEntry, startProject, type Receipt } from "../../data/work-outreach";
import { NgoGate } from "../Gate";
import { RegisterTabs } from "./Surveys";
import "../ngo.css";
import "./outreach.css";

type Entry = { id: string; attributes: Record<string, unknown>; notes: string | null; created_at: string };
const CAP = 500;
const fieldsOf = (p: Survey) => { const line = (p.description ?? "").split("\n").find((x) => x.startsWith(PROJECT_MARKER)); return line ? line.slice(PROJECT_MARKER.length).split("|").map((x) => x.trim()).filter(Boolean) : []; };
const purposeOf = (p: Survey) => (p.description ?? "").split("\n").filter((x) => !x.startsWith(PROJECT_MARKER)).join("\n").trim();
const filled = (v: unknown) => v != null && String(v).trim() !== "";
const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const splitFields = (t: string) => [...new Set(t.split(/[,\n]/).map((x) => x.trim()).filter(Boolean))];

export function Projects() {
  const mem = useMembership();
  const [projects, setProjects] = useState<Survey[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [making, setMaking] = useState(false);

  const reload = useCallback(async (pick?: string) => {
    setFailed(null);
    try {
      const p = (await getSurveys()).filter((x) => (x.description ?? "").includes(PROJECT_MARKER));
      setProjects(p); setSelected((s) => pick || s || p[0]?.id || "");
    } catch (e) { setProjects(null); setFailed(e instanceof Error ? e.message : "The projects could not be read."); }
  }, []);
  useEffect(() => { if (mem.member) void reload(); }, [mem.member, reload]);
  const project = projects?.find((p) => p.id === selected) ?? null;

  return (
    <NgoGate title="Projects" lede="Registers for work that is not a census.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">{mem.org?.name ?? "Your organisation"} · field registers</p><h1 className="serif">Projects</h1></div>
          <p className="ngo-sum">{projects ? <><b>{n(projects.length)}</b> project{projects.length === 1 ? "" : "s"}. </> : failed ? "Your projects could not be read. Nothing is shown as none. " : <><Reading>Reading your projects</Reading>{" "}</>}A rabies drive, an ABC drive, a school round: name the fields once and every entry fills them in.</p>
          <div className="row"><button type="button" className="btn is-flame" aria-expanded={making} onClick={() => setMaking((v) => !v)}><Plus size={15} aria-hidden /> New project</button></div>
        </header>
        <RegisterTabs on="projects" />
        {(making || (projects && projects.length === 0)) && <NewProject onCancel={projects?.length ? () => setMaking(false) : undefined} onDone={async (id) => { setMaking(false); await reload(id); }} />}

        {failed ? (
          <State kind="error" title="Not read" action={<button type="button" className="btn is-ink" onClick={() => void reload()}>Try again</button>}>{failed}</State>
        ) : projects === null ? (
          <div style={{ padding: "18px 28px" }}><div className="skel" style={{ height: 200 }} /></div>
        ) : projects.length === 0 ? (
          <State art="ngo-empty" title="No projects yet">Name the project and the fields each entry records, above. Ward counts and censuses belong under Surveys.</State>
        ) : (
          <div className="or-pj">
            <nav className="or-pj-list" aria-label="Projects">
              {projects.map((p) => (
                <button key={p.id} type="button" aria-current={selected === p.id} onClick={() => setSelected(p.id)}>
                  <b>{p.title}</b><small>{fieldsOf(p).length} field{fieldsOf(p).length === 1 ? "" : "s"} · since {day(p.created_at)}</small>
                </button>
              ))}
            </nav>
            {project && <Register key={project.id} project={project} />}
          </div>
        )}
        <p className="small ngo-foot" style={{ paddingTop: 18 }}>Any member of your organisation can create a project and add entries; the database checks membership on every write.</p>
      </div>
    </NgoGate>
  );
}

function Register({ project }: { project: Survey }) {
  const fields = useMemo(() => fieldsOf(project), [project]);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const load = useCallback(async () => {
    setFailed(null);
    const [rows, totals] = await Promise.allSettled([getSurveyResponses(project.id, CAP), getSurveyTotals(project.id)]);
    if (rows.status === "fulfilled") setEntries(rows.value as unknown as Entry[]); else { setEntries(null); setFailed(rows.reason instanceof Error ? rows.reason.message : "The entries could not be read."); }
    setTotal(totals.status === "fulfilled" ? totals.value.responses : null);
  }, [project.id]);
  useEffect(() => { void load(); }, [load]);

  const exportCsv = () => {
    if (!entries?.length) return;
    const cols = ["created_at", ...fields, "notes"];
    const csv = [cols.join(","), ...entries.map((r) => [r.created_at, ...fields.map((f) => r.attributes?.[f]), r.notes].map(esc).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-register.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="or-pj-main" aria-labelledby="pj-title">
      <div className="or-pj-title">
        <div><h2 id="pj-title" className="h2">{project.title}</h2>{purposeOf(project) && <p>{purposeOf(project)}</p>}</div>
        <button type="button" className="btn is-s" onClick={exportCsv} disabled={!entries?.length}><Download size={14} aria-hidden /> Export shown</button>
      </div>
      <div className="or-pj-sec" style={{ borderTop: 0, paddingTop: 0 }}>
        <Method items={[["Total", total !== null ? `${n(total)} ${total === 1 ? "entry" : "entries"}` : "not read"], ["Shown", entries ? `latest ${n(entries.length)} (up to ${CAP})` : "not read"], ["Fields", String(fields.length)]]} />
      </div>
      {failed ? (
        <State kind="error" title="Not read" action={<button type="button" className="btn is-ink" onClick={() => void load()}>Try again</button>}>{failed}</State>
      ) : entries === null ? (
        <div className="or-pj-sec"><div className="skel" style={{ height: 120 }} /></div>
      ) : (
        <>
          <div className="or-pj-sec"><Pulse entries={entries} /></div>
          {entries.length > 0 && <div className="or-pj-sec"><h3 className="h3">How often each field is filled</h3><Completeness fields={fields} entries={entries} /></div>}
          <div className="or-pj-sec"><NewEntry project={project} fields={fields} onDone={load} /></div>
          {entries.length > 0 ? (
            <div className="or-scroll" role="region" aria-label={`${project.title} entries`} tabIndex={0}>
              <table className="or-table" style={{ minWidth: Math.max(560, 160 * (fields.length + 2)) }}>
                <thead><tr><th>Date</th>{fields.map((f) => <th key={f}>{f}</th>)}<th>Notes</th></tr></thead>
                <tbody>
                  {entries.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">{day(r.created_at)}</td>
                      {fields.map((f) => filled(r.attributes?.[f]) ? <td key={f}>{String(r.attributes?.[f])}</td> : <td key={f} className="is-empty"><span className="sr">not recorded</span></td>)}
                      <td>{r.notes || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

/** Entries per week across the project's life (latest loaded entries only). */
function Pulse({ entries }: { entries: Entry[] }) {
  const weeks = useMemo(() => {
    if (!entries.length) return [];
    const W = 7 * 86_400_000;
    const ts = entries.map((e) => Date.parse(e.created_at));
    const t0 = Math.min(...ts), k = Math.max(1, Math.ceil((Date.now() - t0) / W));
    const out = Array.from({ length: Math.min(k, 104) }, () => 0);
    for (const t of ts) { const i = Math.floor((t - t0) / W) - Math.max(0, k - 104); if (i >= 0 && i < out.length) out[i]++; }
    return out;
  }, [entries]);
  if (!entries.length) return <p className="body">Nothing recorded yet. The first entry starts this project&rsquo;s clock.</p>;
  const max = Math.max(...weeks);
  const last = Math.max(...entries.map((e) => Date.parse(e.created_at)));
  const quiet = Math.floor((Date.now() - last) / 86_400_000);
  return (
    <figure className="or-pulse">
      <div className="or-pulse-bars" role="img" aria-label={`Entries per week over ${weeks.length} weeks, at most ${max} in one week`}>{weeks.map((v, i) => <i key={i} style={{ height: `${v ? Math.max(8, (v / max) * 100) : 0}%` }} className={v ? "" : "is-zero"} />)}</div>
      <figcaption><b>{n(entries.length)}</b> {entries.length === 1 ? "entry" : "entries"} over {weeks.length} {weeks.length === 1 ? "week" : "weeks"}; {quiet === 0 ? "the last one today" : <>the last one <span className={quiet > 30 ? "is-hot" : ""}>{quiet} {quiet === 1 ? "day" : "days"} ago</span></>}.</figcaption>
    </figure>
  );
}

function Completeness({ fields, entries }: { fields: string[]; entries: Entry[] }) {
  return (
    <ol className="or-fields">
      {fields.map((f) => {
        const k = entries.filter((e) => filled(e.attributes?.[f])).length;
        const p = k / entries.length;
        return <li key={f}><span>{f}</span><i className="or-band-bar" role="img" aria-label={`${f}: filled in ${k} of ${entries.length}, the rest not recorded`}><em style={{ width: `${p * 100}%` }} /></i><b>{Math.round(p * 100)}%</b></li>;
      })}
    </ol>
  );
}

function NewEntry({ project, fields, onDone }: { project: Survey; fields: string[]; onDone: () => Promise<void> }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<Receipt | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setR(null);
    const x = await addProjectEntry(project.id, Object.fromEntries(fields.map((f) => [f, values[f] || ""])), notes || null);
    setR(x); setBusy(false);
    if (x.ok) { setValues({}); setNotes(""); await onDone(); }
  };
  return (
    <form onSubmit={submit} className="stack" style={{ ["--g" as string]: "12px" }}>
      <h3 className="h3">A new entry</h3>
      <div className="or-form">
        {fields.map((f, i) => <div key={f} className="field"><label htmlFor={`pe-${i}`}>{f}</label><input id={`pe-${i}`} className="input" value={values[f] || ""} onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))} /></div>)}
        <div className="field is-wide"><label htmlFor="pe-notes">Notes</label><input id="pe-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </div>
      <div className="or-send"><button type="submit" className="btn is-ink" disabled={busy}>{busy ? "Adding…" : "Add the entry"}</button><span aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not added: {r.error}</Ack>) : <span className="small">Blank fields are kept as not recorded.</span>}</span></div>
    </form>
  );
}

function NewProject({ onCancel, onDone }: { onCancel?: () => void; onDone: (id?: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [fieldText, setFieldText] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<Receipt | null>(null);
  const fields = splitFields(fieldText);
  return (
    <form className="or-band" onSubmit={async (e) => { e.preventDefault(); if (!name.trim() || !fields.length) return; setBusy(true); setR(null); const x = await startProject(name.trim(), fields, purpose.trim()); setR(x); setBusy(false); if (x.ok) { setName(""); setFieldText(""); setPurpose(""); await onDone(x.id); } }}>
      <h2>A new project</h2>
      <div className="or-form">
        <div className="field"><label htmlFor="pj-n">Name</label><input id="pj-n" className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="ABC drive, R.S. Puram" /></div>
        <div className="field"><label htmlFor="pj-p">What it is for</label><input id="pj-p" className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="One line on why this is being recorded" /></div>
        <div className="field is-wide"><label htmlFor="pj-f">What each entry records</label><textarea id="pj-f" className="textarea" rows={2} style={{ minHeight: 70 }} value={fieldText} onChange={(e) => setFieldText(e.target.value)} placeholder="Sterilised, vaccinated, treatment, next review, separated by commas" /></div>
        {fields.length > 0 && <p className="or-preview is-wide" aria-label="Fields">{fields.map((f) => <span key={f} className="pill is-plain">{f}</span>)}</p>}
      </div>
      <div className="or-send">
        <button type="submit" className="btn is-ink" disabled={busy || !name.trim() || !fields.length}>{busy ? "Creating…" : "Create the project"}</button>
        {onCancel && <button type="button" className="btn is-ghost" onClick={onCancel}>Cancel</button>}
        <span aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not created: {r.error}</Ack>) : null}</span>
      </div>
    </form>
  );
}
