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
import { Btn, Empty, Head, Lanes, More, Note, Page, Panel, Section, Split, Table, Tag, Tools, type Col } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { useMembership } from "../../shell/Shell";
import { Ack, day, n } from "../../ui";
import { Reading } from "../../ui/Reading";
import { addProjectEntry, startProject, type Receipt } from "../../data/work-outreach";
import { NgoGate } from "../Gate";
import "../org.k.css";

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
  const [selected, setSelected] = usePageState<string>("project", "");
  const [making, setMaking] = useState(false);

  const reload = useCallback(async (pick?: string) => {
    setFailed(null);
    try {
      const p = (await getSurveys()).filter((x) => (x.description ?? "").includes(PROJECT_MARKER));
      setProjects(p); setSelected((s) => pick || s || p[0]?.id || "");
    } catch (e) { setProjects(null); setFailed(e instanceof Error ? e.message : "The projects could not be read."); }
  }, [setSelected]);
  useEffect(() => { if (mem.member) void reload(); }, [mem.member, reload]);
  const project = projects?.find((p) => p.id === selected) ?? projects?.[0] ?? null;
  const none = !!projects && projects.length === 0;

  return (
    <NgoGate title="Projects" lede="Registers for work that is not a census.">
      <Page>
        <Head title="Drives"
          sum={<>{projects ? <><b>{n(projects.length)}</b> project{projects.length === 1 ? "" : "s"}. </> : failed ? "Your projects could not be read. Nothing is shown as none. " : <><Reading>Reading your projects</Reading>{" "}</>}A rabies drive, an ABC drive, a school round: name the fields once and every entry fills them in.</>}
          actions={<Btn variant={making || none ? "plain" : "primary"} icon={<Plus size={14} />} aria-expanded={making || none} onClick={() => setMaking((v) => !v)}>New project</Btn>} />
        {(making || none) && <Panel pad><NewProject onCancel={projects?.length ? () => setMaking(false) : undefined} onDone={async (id) => { setMaking(false); await reload(id); }} /></Panel>}

        {failed ? (
          <Note tone="flame" action={<Btn small onClick={() => void reload()}>Try again</Btn>}>Didn&rsquo;t load. {failed}</Note>
        ) : projects === null ? (
          <div className="og-skel" aria-busy="true"><i /><i /><i /></div>
        ) : projects.length === 0 ? (
          <Panel><Empty title="No projects yet">Name the project and the fields each entry records, above. Ward counts and censuses belong under Surveys.</Empty></Panel>
        ) : (
          <>
            <Tools>
              {projects.length <= 5
                ? <Lanes label="Projects" value={project?.id ?? ""} onChange={setSelected} lanes={projects.map((p) => ({ id: p.id, label: p.title }))} />
                : <label className="og-go"><span className="og-l">Project</span><select className="og-in is-s" value={project?.id ?? ""} onChange={(e) => setSelected(e.target.value)}>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}
            </Tools>
            {project && <Register key={project.id} project={project} />}
          </>
        )}
      </Page>
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

  const cols: Col<Entry>[] = [
    { key: "date", label: "Date", width: "104px", render: (r) => day(r.created_at) },
    ...fields.map((f, i): Col<Entry> => ({ key: `f${i}`, label: f, keep: i === 0, render: (r) => (filled(r.attributes?.[f]) ? String(r.attributes?.[f]) : <span className="pj-blank"><span className="sr-only">not recorded</span></span>) })),
    { key: "notes", label: "Notes", render: (r) => r.notes || "" },
  ];

  return (
    <Section title={project.title} count={total !== null ? `${n(total)} ${total === 1 ? "entry" : "entries"}` : null}
      note={[purposeOf(project), `since ${day(project.created_at)}`, entries && total !== null && total > entries.length ? `latest ${n(entries.length)} shown` : ""].filter(Boolean).join(" · ")}
      action={<Btn small icon={<Download size={14} />} onClick={exportCsv} disabled={!entries?.length}>Export shown</Btn>}>
      {failed ? (
        <Note tone="flame" action={<Btn small onClick={() => void load()}>Try again</Btn>}>Didn&rsquo;t load. {failed}</Note>
      ) : entries === null ? (
        <div className="og-skel" aria-busy="true"><i /><i /><i /></div>
      ) : (
        <Split side={<>
          <Section title="A new entry"><Panel pad><NewEntry project={project} fields={fields} onDone={load} /></Panel></Section>
          {entries.length > 0 && <Section title="How often each field is filled" fold="filled" open={false}><Panel pad><Completeness fields={fields} entries={entries} /></Panel></Section>}
        </>}>
          <Pulse entries={entries} />
          {entries.length > 0 ? (
            <Panel>
              <div className="pj-scroll" role="region" aria-label={`${project.title} entries`} tabIndex={0} style={{ ["--pj-n" as string]: fields.length + 2 }}>
                <More items={entries} cap={12} noun="entries">{(shown) => <Table label={`${project.title} entries`} cols={cols} rows={shown} rowKey={(r) => r.id} />}</More>
              </div>
            </Panel>
          ) : null}
        </Split>
      )}
    </Section>
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
  if (!entries.length) return <p className="og-p">Nothing recorded yet. The first entry starts this project&rsquo;s clock.</p>;
  const max = Math.max(...weeks);
  const last = Math.max(...entries.map((e) => Date.parse(e.created_at)));
  const quiet = Math.floor((Date.now() - last) / 86_400_000);
  return (
    <figure className="pj-pulse">
      <div className="pj-pulse-bars" role="img" aria-label={`Entries per week over ${weeks.length} weeks, at most ${max} in one week`}>{weeks.map((v, i) => <i key={i} style={{ height: `${v ? Math.max(8, (v / max) * 100) : 0}%` }} className={v ? "" : "is-zero"} />)}</div>
      <figcaption><b>{n(entries.length)}</b> {entries.length === 1 ? "entry" : "entries"} over {weeks.length} {weeks.length === 1 ? "week" : "weeks"}; {quiet === 0 ? "the last one today" : <>the last one <span className={quiet > 30 ? "is-hot" : ""}>{quiet} {quiet === 1 ? "day" : "days"} ago</span></>}.</figcaption>
    </figure>
  );
}

function Completeness({ fields, entries }: { fields: string[]; entries: Entry[] }) {
  return (
    <ol className="pj-fields">
      {fields.map((f) => {
        const k = entries.filter((e) => filled(e.attributes?.[f])).length;
        const p = k / entries.length;
        return <li key={f}><span>{f}</span><i className="og-bar is-fill is-hatch" role="img" aria-label={`${f}: filled in ${k} of ${entries.length}, the rest not recorded`}><i style={{ width: `${p * 100}%` }} /></i><b>{Math.round(p * 100)}%</b></li>;
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
    <form onSubmit={submit} className="og-form" aria-label="A new entry">
      {fields.map((f, i) => <div key={f} className="og-f"><label htmlFor={`pe-${i}`}>{f}</label><input id={`pe-${i}`} className="og-in" value={values[f] || ""} onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))} /></div>)}
      <div className="og-f"><label htmlFor="pe-notes">Notes</label><input id="pe-notes" className="og-in" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <div className="og-go"><Btn type="submit" disabled={busy}>{busy ? "Adding…" : "Add the entry"}</Btn><span aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not added: {r.error}</Ack>) : <span className="og-hint">Blank fields are kept as not recorded.</span>}</span></div>
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
    <form className="og-form" aria-label="A new project" onSubmit={async (e) => { e.preventDefault(); if (!name.trim() || !fields.length) return; setBusy(true); setR(null); const x = await startProject(name.trim(), fields, purpose.trim()); setR(x); setBusy(false); if (x.ok) { setName(""); setFieldText(""); setPurpose(""); await onDone(x.id); } }}>
      <div className="og-f"><label htmlFor="pj-n">Name</label><input id="pj-n" className="og-in" value={name} onChange={(e) => setName(e.target.value)} required placeholder="ABC drive, R.S. Puram" /></div>
      <div className="og-f"><label htmlFor="pj-p">What it is for</label><input id="pj-p" className="og-in" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="One line on why this is being recorded" /></div>
      <div className="og-f"><label htmlFor="pj-f">What each entry records</label><textarea id="pj-f" className="og-in" rows={2} value={fieldText} onChange={(e) => setFieldText(e.target.value)} placeholder="Sterilised, vaccinated, treatment, next review, separated by commas" /></div>
      {fields.length > 0 && <p className="og-go" aria-label="Fields">{fields.map((f) => <Tag key={f}>{f}</Tag>)}</p>}
      <div className="og-go">
        <Btn type="submit" variant="primary" disabled={busy || !name.trim() || !fields.length}>{busy ? "Creating…" : "Create the project"}</Btn>
        {onCancel && <Btn onClick={onCancel}>Cancel</Btn>}
        <span aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not created: {r.error}</Ack>) : null}</span>
      </div>
    </form>
  );
}
