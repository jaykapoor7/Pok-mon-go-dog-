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
import { FileText } from "lucide-react";
import { Btn, Empty, Head, Lanes, Note, Page, Panel, SearchBox, Tag, Tools, type Col } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { FoldTable, Pager, SkelRows, pageOf } from "../../abc/Pager";
import { SensitiveVeil } from "@/components/ui/SensitiveVeil";
import { DOCUMENT_KINDS, type DocumentKind, type SourceDocument } from "@/lib/documents";
import { getPartnerCases } from "@/lib/cases";
import { animalTitle } from "@/lib/animal-name";
import type { Case } from "@/lib/types";
import { useMembership } from "../../shell/Shell";
import { Ack, day, n } from "../../ui";
import { attachDocument, fileScan, readAnimalsForAttach, readDocuments, saveDocument, type OrgAnimalLite, type Receipt } from "../../data/work-outreach";
import { NgoGate } from "../Gate";
import "../ngo.css";
import "./Evidence.k.css";

const KIND_LABEL = Object.fromEntries(DOCUMENT_KINDS.map((k) => [k.value, k.label])) as Record<DocumentKind, string>;
const animalLabel = (a: OrgAnimalLite) => a.name?.trim() || a.code || animalTitle({ name: a.name, straypaw_id: a.straypaw_id, id: a.id });
const sensitive = (d: SourceDocument) => d.kind === "medical_note" || d.kind === "other" || !!d.case_id;

export function Evidence() {
  const mem = useMembership();
  const [docs, setDocs] = useState<SourceDocument[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [animals, setAnimals] = useState<OrgAnimalLite[] | null>(null);
  const [cases, setCases] = useState<Case[] | null>(null);
  const [q, setQ] = usePageState("q", "");
  const [kindF, setKindF] = usePageState<DocumentKind | "">("kind", "");
  const [loose, setLoose] = usePageState("loose", false);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

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

  const { pg, pages, slice } = pageOf(shown, page, 20);
  const cols: Col<SourceDocument>[] = [
    { key: "t", label: "Scan", width: "minmax(0, 1.4fr)", render: (d) => <span className="kx-cell"><FileText size={14} aria-hidden /><span>{d.title?.trim() || "Untitled scan"}<small className="kx-sub">{KIND_LABEL[d.kind] ?? d.kind}</small></span></span> },
    { key: "k", label: "Type", width: "144px", render: (d) => KIND_LABEL[d.kind] ?? d.kind },
    { key: "d", label: "Date on the record", width: "136px", render: (d) => (d.recorded_on ? <span className="kx-num">{day(d.recorded_on)}</span> : <span className="kx-none">Not given</span>) },
    { key: "n", label: "Context", width: "minmax(0, 1.6fr)", render: (d) => (d.notes ? <span title={d.notes}>{d.notes}</span> : <span className="kx-none">No context written yet</span>) },
    { key: "a", label: "Attached to", keep: true, render: (d) => {
      const a = d.dog_id ? byId.get(d.dog_id) ?? null : null, c = d.case_id ? caseById.get(d.case_id) ?? null : null;
      return !d.dog_id && !d.case_id ? <Tag tone="amber">Not attached</Tag> : <span className="ev2-links">
        {d.dog_id && <Link className="kx-link" href={`/ngo/animals/${d.dog_id}`}>{a ? animalLabel(a) : "An animal"}</Link>}
        {d.case_id && <Link className="kx-link" href={`/ngo/cases/${d.case_id}`}>{c?.title ?? "A case"}</Link>}
      </span>; } },
  ];
  const detail = (d: SourceDocument) => (
    <div className="ev2-open">
      <a href={d.url} target="_blank" rel="noreferrer" className="ev2-thumb" aria-label={`Open ${d.title ?? "the scan"} in full`}><SensitiveVeil sensitive={sensitive(d)} id={d.url} compact note="May show an injured animal">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={d.url} alt={d.title ?? "Filed document"} loading="lazy" /></SensitiveVeil></a>
      <div className="ev2-body">
        <p className="kx-quiet">Filed {day(d.created_at)}. {d.notes ? d.notes : "No context written yet."}</p>
        <Attach doc={d} animals={animals} cases={cases} open={editing === d.id} onEdit={() => setEditing(editing === d.id ? null : d.id)} onDone={after} />
        {editing === d.id ? <EditDoc doc={d} onCancel={() => setEditing(null)} onDone={async (r) => { if (r.ok) setEditing(null); await after(r); }} /> : null}
      </div>
    </div>
  );

  return (
    <NgoGate title="Evidence files" lede="The original register pages, ledgers and message threads your records came from.">
      <Page>
        <Head title="Reports"
          sum={<>{docs ? <><b>{n(docs.length)}</b> filed{docs.length >= 300 ? " (the latest 300)" : ""}, <b>{n(unfiled)}</b> not yet attached. </> : failed ? "The files could not be read. Nothing is shown as none. " : "Reading your files… "}Attach a scan to an animal or case so any transcribed entry can be checked against its page. Private to your organisation.</>}
          actions={<FileBand onDone={after} />} />
        <div aria-live="polite" className="kx-live">{receipts.map((r, i) => <div key={i}>{r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not saved: {r.error}</Ack>}</div>)}</div>

        {failed ? (
          <Panel><div role="alert"><Empty title="Didn't load" action={<Btn onClick={() => void load()}>Try again</Btn>}>{failed} A failed read is never shown as an empty library.</Empty></div></Panel>
        ) : docs === null ? (
          <Panel><SkelRows label="Reading your files" /></Panel>
        ) : docs.length === 0 ? (
          <Panel><Empty title="No scans filed yet" action={<Btn href="/ngo/import">Import a workbook</Btn>}>Choose a type, then pick the files.</Empty></Panel>
        ) : (
          <>
            <Tools end={<>
              <SearchBox value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Titles, context, animals, cases" label="Search filed documents" />
              <select className="kx-in is-auto" value={kindF} onChange={(e) => { setKindF(e.target.value as DocumentKind | ""); setPage(0); }} aria-label="Type"><option value="">Every type</option>{DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select>
            </>}>
              <Lanes<"all" | "loose"> label="Show" value={loose ? "loose" : "all"} onChange={(v) => { setLoose(v === "loose"); setPage(0); }} lanes={[{ id: "all", label: "All", count: docs.length }, { id: "loose", label: "Not yet attached", count: unfiled, tone: unfiled ? "amber" : undefined }]} />
            </Tools>
            {animals === null || cases === null ? <Note tone="amber">{[animals === null ? "Animals could not be read, so attaching to an animal is unavailable." : null, cases === null ? "Cases could not be read, so attaching to a case is unavailable." : null].filter(Boolean).join(" ")}</Note> : null}
            <Panel>{!shown.length ? <Empty title="No file matches">Change the search or filters.</Empty>
              : <FoldTable cols={cols} rows={slice} rowKey={(d) => d.id} label="Filed documents" open={openId} onOpen={(k) => { setOpenId(k); setEditing(null); }} detail={detail} />}</Panel>
            <Pager pg={pg} pages={pages} total={shown.length} size={20} onPage={setPage} />
          </>
        )}
      </Page>
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
    <>
      <select className="kx-in is-auto" value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)} disabled={!!busy} aria-label="Document type">{DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select>
      <input ref={ref} type="file" accept="image/*" multiple hidden aria-label="Choose scans to file" onChange={(e) => { void pick(e.target.files); e.target.value = ""; }} />
      <Btn variant="primary" disabled={!!busy} onClick={() => ref.current?.click()}>{busy ? "Filing…" : "File scans"}</Btn>
      {busy && <Ack state="pending">{busy}</Ack>}
    </>
  );
}

function Attach({ doc, animals, cases, open, onEdit, onDone }: { doc: SourceDocument; animals: OrgAnimalLite[] | null; cases: Case[] | null; open: boolean; onEdit: () => void; onDone: (r: Receipt) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const go = async (opts: { dogId?: string; caseId?: string; clear?: boolean }, label: string) => { setBusy(true); const r = await attachDocument(doc.id, opts, label); setBusy(false); await onDone(r); };
  return (
    <div className="kx-acts">
      {!doc.dog_id && animals && animals.length > 0 && (
        <select className="kx-in is-auto ev2-sel" defaultValue="" disabled={busy} aria-label={`Attach ${doc.title ?? "this scan"} to an animal`} onChange={(e) => { const a = animals.find((x) => x.id === e.target.value); if (a) void go({ dogId: a.id }, animalLabel(a)); }}>
          <option value="">Attach to an animal…</option>{animals.map((a) => <option key={a.id} value={a.id}>{animalLabel(a)}{a.straypaw_id ? ` · ${a.straypaw_id}` : ""}</option>)}
        </select>
      )}
      {!doc.case_id && cases && cases.length > 0 && (
        <select className="kx-in is-auto ev2-sel" defaultValue="" disabled={busy} aria-label={`Attach ${doc.title ?? "this scan"} to a case`} onChange={(e) => { const c = cases.find((x) => x.id === e.target.value); if (c) void go({ caseId: c.id }, c.title); }}>
          <option value="">Attach to a case…</option>{cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      )}
      <Btn aria-expanded={open} onClick={onEdit}>{doc.notes ? "Edit context" : "Add context"}</Btn>
      {(doc.dog_id || doc.case_id) && <Btn variant="quiet" disabled={busy} onClick={() => void go({ clear: true }, "")}>Detach</Btn>}
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
    <form className="kx-form" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const r = await saveDocument(doc.id, { title, notes, kind, recordedOn: recordedOn || null }); setBusy(false); await onDone(r); }}>
      <div className="kx-f"><label htmlFor={`ev-t-${id}`}>Title</label><input id={`ev-t-${id}`} className="kx-in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. ABC ledger, page 14" /></div>
      <div className="kx-f"><label htmlFor={`ev-k-${id}`}>Type</label><select id={`ev-k-${id}`} className="kx-in" value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>{DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></div>
      <div className="kx-f"><label htmlFor={`ev-d-${id}`}>Date on the record</label><input id={`ev-d-${id}`} type="date" className="kx-in" value={recordedOn} onChange={(e) => setRecordedOn(e.target.value)} /></div>
      <div className="kx-f"><label htmlFor={`ev-n-${id}`}>What this is</label><textarea id={`ev-n-${id}`} className="kx-in" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Whose handwriting, which drive, what the entries cover. Anything the next person would need to read it." /></div>
      <div className="kx-acts"><Btn type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Btn><Btn variant="quiet" onClick={onCancel}>Cancel</Btn>{busy && <Ack state="pending">Saving…</Ack>}</div>
    </form>
  );
}
