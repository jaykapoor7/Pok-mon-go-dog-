"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Evidence files (1.0 /partner/resources).

   The paper an organisation already has: register pages, ABC ledgers,
   medical notes, message threads, consent forms. Each scan keeps its own
   written context, attaches to an animal or a case, and is searchable by
   title, context, type, animal and case. A table, because every file
   carries the same fields.

   Private to the organisation (RLS on documents; add_document,
   update_document and link_document check my_ngo()). Medical notes,
   "other" files and anything attached to a case may show an injured
   animal, so they stay behind SensitiveVeil.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link2, Search, ShieldCheck } from "lucide-react";
import { SensitiveVeil } from "@/components/ui/SensitiveVeil";
import { DOCUMENT_KINDS, type DocumentKind, type SourceDocument } from "@/lib/documents";
import { getPartnerCases } from "@/lib/cases";
import { animalTitle } from "@/lib/animal-name";
import type { Case } from "@/lib/types";
import { useMembership } from "../../shell/Shell";
import { Ack, State, day, n } from "../../ui";
import { attachDocument, fileScan, readAnimalsForAttach, readDocuments, saveDocument, type OrgAnimalLite, type Receipt } from "../../data/work-outreach";
import { NgoGate } from "../Gate";
import "../ngo.css";
import "./outreach.css";

const KIND_LABEL = Object.fromEntries(DOCUMENT_KINDS.map((k) => [k.value, k.label])) as Record<DocumentKind, string>;
const animalLabel = (a: OrgAnimalLite) => a.name?.trim() || a.code || animalTitle({ name: a.name, straypaw_id: a.straypaw_id, id: a.id });
const sensitive = (d: SourceDocument) => d.kind === "medical_note" || d.kind === "other" || !!d.case_id;

export function Evidence() {
  const mem = useMembership();
  const [docs, setDocs] = useState<SourceDocument[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [animals, setAnimals] = useState<OrgAnimalLite[] | null>(null);
  const [cases, setCases] = useState<Case[] | null>(null);
  const [q, setQ] = useState("");
  const [kindF, setKindF] = useState<DocumentKind | "">("");
  const [loose, setLoose] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  const load = useCallback(async () => {
    setFailed(null);
    const [d, a, c] = await Promise.allSettled([readDocuments(), readAnimalsForAttach(), getPartnerCases()]);
    if (d.status === "fulfilled") setDocs(d.value); else { setDocs(null); setFailed(d.reason instanceof Error ? d.reason.message : "The files could not be read."); }
    setAnimals(a.status === "fulfilled" ? a.value : null);
    setCases(c.status === "fulfilled" ? c.value : null);
  }, []);
  useEffect(() => { if (mem.member) void load(); }, [mem.member, load]);
  const after = async (r: Receipt | Receipt[]) => { const all = Array.isArray(r) ? r : [r]; setReceipts(all); if (all.some((x) => x.ok)) await load(); };

  const byId = useMemo(() => new Map((animals ?? []).map((a) => [a.id, a])), [animals]);
  const caseById = useMemo(() => new Map((cases ?? []).map((c) => [c.id, c])), [cases]);
  const shown = useMemo(() => {
    if (!docs) return [];
    const needle = q.trim().toLowerCase();
    return docs.filter((d) => {
      if (kindF && d.kind !== kindF) return false;
      if (loose && (d.dog_id || d.case_id)) return false;
      if (!needle) return true;
      const a = d.dog_id ? byId.get(d.dog_id) : null;
      const c = d.case_id ? caseById.get(d.case_id) : null;
      return [d.title, d.notes, KIND_LABEL[d.kind], a ? animalLabel(a) : null, a?.code, a?.straypaw_id, c?.title].filter(Boolean).some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [docs, q, kindF, loose, byId, caseById]);
  const unfiled = docs?.filter((d) => !d.dog_id && !d.case_id).length ?? 0;

  return (
    <NgoGate title="Evidence files" lede="The original register pages, ledgers and message threads your records came from.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">{mem.org?.name ?? "Your organisation"} · evidence</p><h1 className="serif">Evidence files</h1></div>
          <p className="ngo-sum">{docs ? <><b>{n(docs.length)}</b> filed{docs.length >= 300 ? " (the latest 300)" : ""}, <b>{n(unfiled)}</b> not yet attached. </> : failed ? "The files could not be read. Nothing is shown as none. " : "Reading your files… "}Attach a scan to an animal or case so any transcribed entry can be checked against its page.</p>
        </header>

        <FileBand onDone={after} />
        <p className="or-note"><ShieldCheck size={16} aria-hidden /><span>These stay inside your organisation. A register page carries other people&rsquo;s handwriting and contact details, so it is never shown on a public animal page.</span></p>
        <div aria-live="polite" className="or-receipt">{receipts.map((r, i) => <div key={i}>{r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not saved: {r.error}</Ack>}</div>)}</div>

        {failed ? (
          <State kind="error" title="Not read" action={<button type="button" className="btn is-ink" onClick={() => void load()}>Try again</button>}>{failed} A failed read is never shown as an empty library.</State>
        ) : docs === null ? (
          <div style={{ padding: "18px 28px" }}><div className="skel" style={{ height: 180 }} /></div>
        ) : docs.length === 0 ? (
          <State art="ngo-empty" title="No scans filed yet" action={<Link className="btn" href="/ngo/import">Import a workbook</Link>}>Choose the type above, then pick the profiles, ledgers and medical notes your team keeps on paper. Each one can then be attached to the animal it describes.</State>
        ) : (
          <>
            <div className="wk-tools">
              <label className="search wk-search"><Search size={15} aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Titles, context notes, animals and cases" aria-label="Search filed documents" /></label>
              <select className="select ngo-sel" value={kindF} onChange={(e) => setKindF(e.target.value as DocumentKind | "")} aria-label="Type"><option value="">Every type</option>{DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select>
              <button type="button" className="chip" aria-pressed={loose} onClick={() => setLoose((v) => !v)}>Not yet attached <span className="n">{n(unfiled)}</span></button>
            </div>
            <p className="k or-count">{n(shown.length)} of {n(docs.length)} filed{unfiled ? ` · ${n(unfiled)} not yet attached` : ""}{animals === null ? " · animals could not be read, so attaching to an animal is unavailable" : ""}{cases === null ? " · cases could not be read, so attaching to a case is unavailable" : ""}</p>
            {!shown.length ? <State title="No file matches">Change the search or filters.</State> : (
              <div className="or-scroll" role="region" aria-label="Filed documents" tabIndex={0}>
                <table className="or-table" style={{ minWidth: 980 }}>
                  <thead><tr><th>Scan</th><th>Title and type</th><th>Date on the record</th><th>Context</th><th>Attached to</th><th>Actions</th></tr></thead>
                  <tbody>
                    {shown.flatMap((d) => {
                      const a = d.dog_id ? byId.get(d.dog_id) ?? null : null;
                      const c = d.case_id ? caseById.get(d.case_id) ?? null : null;
                      const open = editing === d.id;
                      const row = (
                        <tr key={d.id} className={open ? "is-open" : undefined}>
                          <td><a href={d.url} target="_blank" rel="noreferrer" className="or-thumb" aria-label={`Open ${d.title ?? "the scan"} in full`}><SensitiveVeil sensitive={sensitive(d)} id={d.url} compact note="May show an injured animal">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={d.url} alt={d.title ?? "Filed document"} loading="lazy" /></SensitiveVeil></a></td>
                          <td><b>{d.title?.trim() || "Untitled scan"}</b><small>{KIND_LABEL[d.kind] ?? d.kind}</small><small className="mono">Filed {day(d.created_at)}</small></td>
                          <td className="mono">{d.recorded_on ? day(d.recorded_on) : <i className="or-none">not given</i>}</td>
                          <td style={{ maxWidth: 320 }}>{d.notes ? d.notes : <i className="or-none">No context written yet.</i>}</td>
                          <td>
                            {d.dog_id && (a ? <Link className="or-linked" href={`/ngo/animals/${a.id}`}><Link2 size={12} aria-hidden /> {animalLabel(a)}</Link> : <Link className="or-linked" href={`/ngo/animals/${d.dog_id}`}><Link2 size={12} aria-hidden /> An animal</Link>)}
                            {d.case_id && <Link className="or-linked" href={`/ngo/cases/${d.case_id}`}><Link2 size={12} aria-hidden /> {c?.title ?? "A case"}</Link>}
                            {!d.dog_id && !d.case_id && <i className="or-none">Not attached</i>}
                          </td>
                          <td><Attach doc={d} animals={animals} cases={cases} open={open} onEdit={() => setEditing(open ? null : d.id)} onDone={after} /></td>
                        </tr>
                      );
                      return open ? [row, <tr key={`${d.id}-edit`} className="is-edit"><td colSpan={6}><EditDoc doc={d} onCancel={() => setEditing(null)} onDone={async (r) => { if (r.ok) setEditing(null); await after(r); }} /></td></tr>] : [row];
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        <p className="small ngo-foot" style={{ paddingTop: 18 }}>Any member of your organisation can file, describe and attach scans; the database checks membership on every write and refuses anyone else.</p>
      </div>
    </NgoGate>
  );
}

function FileBand({ onDone }: { onDone: (r: Receipt[]) => Promise<void> }) {
  const ref = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<DocumentKind>("register_page");
  const [busy, setBusy] = useState<string | null>(null);
  async function pick(files: FileList | null) {
    if (!files?.length || busy) return;
    const out: Receipt[] = [];
    /* Sequential: field connections fail bursts of parallel uploads. */
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) { setBusy(`Filing ${i + 1} of ${list.length}…`); out.push(await fileScan(list[i], kind)); }
    setBusy(null);
    await onDone(out);
  }
  return (
    <section className="or-band" aria-labelledby="ev-file">
      <h2 id="ev-file">File a scan</h2>
      <p className="small">A dog profile sheet, an ABC ledger page, a medical note, a screenshot of a thread. Add its context and attach it afterwards.</p>
      <div className="or-band-row">
        <select className="select" value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)} disabled={!!busy} aria-label="Document type">{DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select>
        <input ref={ref} type="file" accept="image/*" multiple hidden aria-label="Choose scans to file" onChange={(e) => { void pick(e.target.files); e.target.value = ""; }} />
        <button type="button" className="btn is-ink" disabled={!!busy} onClick={() => ref.current?.click()}>{busy ? "Filing…" : "Choose files"}</button>
        {busy && <Ack state="pending">{busy}</Ack>}
      </div>
    </section>
  );
}

function Attach({ doc, animals, cases, open, onEdit, onDone }: { doc: SourceDocument; animals: OrgAnimalLite[] | null; cases: Case[] | null; open: boolean; onEdit: () => void; onDone: (r: Receipt) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const go = async (opts: { dogId?: string; caseId?: string; clear?: boolean }, label: string) => { setBusy(true); const r = await attachDocument(doc.id, opts, label); setBusy(false); await onDone(r); };
  return (
    <div className="or-acts">
      {!doc.dog_id && animals && animals.length > 0 && (
        <select className="select" defaultValue="" disabled={busy} aria-label={`Attach ${doc.title ?? "this scan"} to an animal`} onChange={(e) => { const a = animals.find((x) => x.id === e.target.value); if (a) void go({ dogId: a.id }, animalLabel(a)); }}>
          <option value="">Attach to an animal…</option>{animals.map((a) => <option key={a.id} value={a.id}>{animalLabel(a)}{a.straypaw_id ? ` · ${a.straypaw_id}` : ""}</option>)}
        </select>
      )}
      {!doc.case_id && cases && cases.length > 0 && (
        <select className="select" defaultValue="" disabled={busy} aria-label={`Attach ${doc.title ?? "this scan"} to a case`} onChange={(e) => { const c = cases.find((x) => x.id === e.target.value); if (c) void go({ caseId: c.id }, c.title); }}>
          <option value="">Attach to a case…</option>{cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      )}
      <button type="button" className="btn is-s" aria-expanded={open} onClick={onEdit}>{doc.notes ? "Edit context" : "Add context"}</button>
      {(doc.dog_id || doc.case_id) && <button type="button" className="btn is-ghost is-s" disabled={busy} onClick={() => void go({ clear: true }, "")}>Detach</button>}
    </div>
  );
}

function EditDoc({ doc, onCancel, onDone }: { doc: SourceDocument; onCancel: () => void; onDone: (r: Receipt) => Promise<void> }) {
  const [title, setTitle] = useState(doc.title ?? "");
  const [notes, setNotes] = useState(doc.notes ?? "");
  const [kind, setKind] = useState<DocumentKind>(doc.kind);
  const [recordedOn, setRecordedOn] = useState(doc.recorded_on ?? "");
  const [busy, setBusy] = useState(false);
  const id = doc.id.slice(0, 8);
  return (
    <form className="or-edit" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const r = await saveDocument(doc.id, { title, notes, kind, recordedOn: recordedOn || null }); setBusy(false); await onDone(r); }}>
      <div className="field"><label htmlFor={`ev-t-${id}`}>Title</label><input id={`ev-t-${id}`} className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. ABC ledger, page 14" /></div>
      <div className="field"><label htmlFor={`ev-k-${id}`}>Type</label><select id={`ev-k-${id}`} className="select" value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>{DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></div>
      <div className="field"><label htmlFor={`ev-d-${id}`}>Date on the record</label><input id={`ev-d-${id}`} type="date" className="input" value={recordedOn} onChange={(e) => setRecordedOn(e.target.value)} /></div>
      <div className="field is-wide"><label htmlFor={`ev-n-${id}`}>What this is</label><textarea id={`ev-n-${id}`} className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Whose handwriting, which drive, what the entries cover. Anything the next person would need to read it." /></div>
      <div className="or-send is-wide"><button type="submit" className="btn is-ink is-s" disabled={busy}>{busy ? "Saving…" : "Save"}</button><button type="button" className="btn is-ghost is-s" onClick={onCancel}>Cancel</button>{busy && <Ack state="pending">Saving…</Ack>}</div>
    </form>
  );
}
