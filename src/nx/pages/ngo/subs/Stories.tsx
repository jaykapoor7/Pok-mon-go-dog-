"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Case } from "@/lib/types";
import { useRead } from "@/oh/data";
import { read } from "../../../data/ngo-setup";
import { publishStory, readOwnStories, readResolvedCases, type Cursor, type OwnStory, type StoryStage } from "../../../data/ngo-submissions";
import { Confirm, Failed, Field, Modal, Skeleton, day, errText, useAct } from "../../../kit";
import { Grid, Tools, TryLink, type GCol, type Who } from "../parts";
import { S_STORIES } from "../sample";

/* Stories: a resolved case turned into a short public story through the server route, which checks the case belongs
   to the organisation and is resolved. Only what is written here is public; never intake notes or contacts. */

const blank = (): StoryStage[] => [{ label: "Reported", date: "" }, { label: "Care completed", date: "" }, { label: "Outcome", date: "" }];

export function StoriesTab({ who }: { who: Who }) {
  const ngoId = who.ngo?.org_id ?? null;
  const own = useRead<OwnStory[]>(() => read(() => readOwnStories(ngoId!)), `ns:stories:${ngoId}`, !!ngoId && !who.sample);
  const [writing, setWriting] = useState(false);
  if (!who.sample && own.loading && !own.data) return <Skeleton rows={4} label="Reading your stories" />;
  if (!who.sample && own.error && !own.data) return <Failed error={errText(own.error)} retry={own.reload} />;
  const rows = who.sample ? S_STORIES : own.data!;
  const cols: GCol<OwnStory>[] = [
    { label: "Story", width: "minmax(0, 1.8fr)", render: (s) => <span className="nx-cell-main"><span><b>{s.title}</b><small>{s.location_label || "No public locality"}</small></span></span> },
    { label: "Public locality", width: "minmax(0, 1fr)", render: (s) => <span className="nx-t2">{s.location_label || "Not given"}</span> },
    { label: "Published", width: "120px", keep: true, render: (s) => <span className="nx-t3">{s.published_at ? day(s.published_at) : "Not published"}</span> },
    { label: "", width: "120px", render: (s) => (s.case_id && !who.sample ? <Link className="nx-btn is-quiet is-sm" href={`/next/ngo/cases/${s.case_id}`}>Open the case</Link> : null) },
  ];
  return (
    <>
      <Tools end={<><Link className="nx-btn is-quiet is-sm" href="/community/stories">Public story feed</Link>{who.sample ? <TryLink small><Plus size={13} />Feature a resolved case</TryLink> : <button type="button" className="nx-btn is-sm" onClick={() => setWriting(true)}><Plus size={13} />Feature a resolved case</button>}</>}>
        <span className="ns-sum"><b>{rows.length}</b> published. Short public stories from completed cases. Only what you write here is public; never intake notes or contacts.</span>
      </Tools>
      <Grid label="Published stories" cols={cols} rows={rows} rowKey={(s) => s.id} empty={<><b>Nothing published yet</b><p>Your first story appears here and on the public feed.</p></>} />
      {writing ? <Write onClose={() => setWriting(false)} onDone={() => { setWriting(false); own.reload(); }} told={new Set(rows.map((s) => s.case_id).filter(Boolean) as string[])} /> : null}
    </>
  );
}

function Write({ onClose, onDone, told }: { onClose: () => void; onDone: () => void; told: Set<string> }) {
  const { busy, run } = useAct();
  const [cases, setCases] = useState<{ state: "loading" } | { state: "failed"; error: string } | { state: "read"; read: number; rows: Case[]; next: Cursor }>({ state: "loading" });
  const [more, setMore] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [location, setLocation] = useState("");
  const [stages, setStages] = useState<StoryStage[]>(blank);
  const [asking, setAsking] = useState(false);
  useEffect(() => { readResolvedCases(null).then((p) => setCases({ state: "read", ...p })).catch((e: unknown) => setCases({ state: "failed", error: errText(e) })); }, []);
  const rows = useMemo(() => (cases.state === "read" ? cases.rows : []), [cases]);
  const selected = rows.find((c) => c.id === caseId);
  const choose = (id: string) => { setCaseId(id); const c = rows.find((x) => x.id === id); if (c) { setTitle(c.title); setLocation(c.zone ?? ""); setSummary(c.outcome_note ?? c.description ?? ""); } };
  const further = async () => { if (cases.state !== "read" || !cases.next) return; setMore(true); try { const p = await readResolvedCases(cases.next); setCases({ state: "read", read: cases.read + p.read, rows: [...cases.rows, ...p.rows], next: p.next }); } catch (e) { setCases({ state: "failed", error: errText(e) }); } setMore(false); };
  const ready = !!selected && !!title.trim() && !!summary.trim();
  const publish = () => void run("story", () => publishStory({ caseId, title, publicSummary: summary, locationLabel: location, stages }), { ok: "Published to the public story feed. Private notes and reporter details were not included." }).then((x) => { if (x.ok) onDone(); else setAsking(false); });
  if (asking) return <Confirm title="Publish this story" confirm="Publish story" busy={busy === "story"} onClose={() => setAsking(false)} onConfirm={publish}><p>&ldquo;{title.trim()}&rdquo; goes on your public page and the public story feed, with the locality, summary and {stages.filter((s) => s.label.trim()).length} timeline stages. Intake notes, contacts and staff names are never included.</p></Confirm>;
  return (
    <Modal wide title="Feature a resolved case" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!ready} onClick={() => setAsking(true)}>Review</button></>}>
      {cases.state === "loading" ? <Skeleton rows={2} label="Reading resolved cases" /> : cases.state === "failed" ? <Failed error={`Your resolved cases could not be read. ${cases.error} This is not the same as having none.`} /> : (
        <Field label="Resolved case" hint={rows.length ? `${rows.length} resolved or closed, from the ${cases.read} most recently active cases.` : `None of the ${cases.read} most recently active cases is resolved. Resolve a case first.`}>
          <select value={caseId} onChange={(e) => choose(e.target.value)} autoFocus><option value="">{rows.length ? "Choose a completed case" : "No resolved cases read"}</option>{rows.map((c) => <option key={c.id} value={c.id}>{c.title}{c.zone ? ` · ${c.zone}` : ""}{told.has(c.id) ? " · already has a story" : ""}</option>)}</select>
        </Field>
      )}
      {cases.state === "read" && cases.next ? <div><button type="button" className="nx-btn is-quiet is-sm" disabled={more} onClick={() => void further()}>{more ? "Reading…" : "Look further back"}</button></div> : null}
      <div className="nx-fields">
        <Field label="Story title"><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="A clear, factual headline" /></Field>
        <Field label="Public locality" hint="Not a precise address."><input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} placeholder="Neighbourhood or city" /></Field>
        <Field label={`Public summary (${summary.length}/900)`} wide><textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={900} rows={4} placeholder="What happened, what care was given and the verified outcome." /></Field>
      </div>
      <fieldset className="ns-set"><legend>Outcome timeline</legend>
        {stages.map((s, i) => <div key={i} className="nx-fields" style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) auto", alignItems: "end" }}>
          <Field label={`Stage ${i + 1}`}><input value={s.label} onChange={(e) => setStages((all) => all.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} maxLength={90} /></Field>
          <Field label="Date or month"><input value={s.date} onChange={(e) => setStages((all) => all.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} maxLength={40} /></Field>
          <button type="button" className="nx-btn is-quiet is-sm" onClick={() => setStages((all) => all.filter((_, j) => j !== i))} aria-label={`Remove stage ${i + 1}`}>Remove</button>
        </div>)}
        {stages.length < 7 ? <div><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setStages((all) => [...all, { label: "", date: "" }])}>Add a stage</button> <span className="ns-small">Stages without a name are left out.</span></div> : null}
      </fieldset>
      <div className="nx-note" aria-label="What the public will see"><div><b>{title.trim() || "Story title"}</b><p className="ns-small">{location.trim() || selected?.zone || "Locality"}</p><p style={{ marginTop: 4 }}>{summary.trim() || "The public summary appears here."}</p></div></div>
    </Modal>
  );
}
