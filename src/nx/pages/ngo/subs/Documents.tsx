"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { FileText, Upload } from "lucide-react";
import { DOCUMENT_KINDS, type DocumentKind, type SourceDocument } from "@/lib/documents";
import type { Case } from "@/lib/types";
import { useRead } from "@/oh/data";
import { read } from "../../../data/ngo-setup";
import { attachDocument, editDocument, fileScan, readAnimalsLite, readCasesLite, readDocuments, type AnimalLite } from "../../../data/ngo-submissions";
import { Failed, Field, FilePick, Skeleton, day, errText, toast, useAct } from "../../../kit";
import { Chip } from "../../../ui";
import { Drawer, Find, Grid, Tools, TryLink, Views, type GCol, type Who } from "../frame";
import { S_DOCS } from "../sample";

/* Documents: the paper the organisation already has (register pages, ledgers, medical notes, message threads,
   consent forms), each with its own context and attached to an animal or a case, so a transcribed entry can be
   checked against its page. Private to the organisation (add_document, link_document, update_document). */

const KIND = Object.fromEntries(DOCUMENT_KINDS.map((k) => [k.value, k.label])) as Record<DocumentKind, string>;
const sensitive = (d: SourceDocument) => d.kind === "medical_note" || d.kind === "other" || !!d.case_id;
const animalLabel = (a: AnimalLite) => a.name?.trim() || a.code || a.straypaw_id || "Unnamed animal";
type Data = { docs: SourceDocument[]; animals: AnimalLite[] | null; cases: Case[] | null };

export function DocumentsTab({ who }: { who: Who }) {
  const ngoId = who.ngo?.org_id ?? null;
  const r = useRead<Data>(() => read(async () => {
    const [d, a, c] = await Promise.allSettled([readDocuments(), readAnimalsLite(ngoId!), readCasesLite()]);
    if (d.status === "rejected") throw d.reason;
    return { docs: d.value, animals: a.status === "fulfilled" ? a.value : null, cases: c.status === "fulfilled" ? c.value : null };
  }), `ns:docs:${ngoId}`, !!ngoId && !who.sample);
  const { busy, run } = useAct();
  const [kind, setKind] = useState<DocumentKind>("register_page");
  const [filing, setFiling] = useState<string | null>(null);
  const [view, setView] = useState<"all" | "loose">("all");
  const [kindF, setKindF] = useState<DocumentKind | "">("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const d: Data | null = useMemo(() => (who.sample ? { docs: S_DOCS, animals: [], cases: [] } : r.data), [who.sample, r.data]);
  const byAnimal = useMemo(() => new Map((d?.animals ?? []).map((a) => [a.id, a])), [d]);
  const byCase = useMemo(() => new Map((d?.cases ?? []).map((c) => [c.id, c])), [d]);
  if (!who.sample && r.loading && !r.data) return <Skeleton rows={6} label="Reading your files" />;
  if (!who.sample && r.error && !r.data) return <Failed error={`${errText(r.error)} A failed read is never shown as an empty library.`} retry={r.reload} />;
  const docs = d!.docs;
  const loose = docs.filter((x) => !x.dog_id && !x.case_id).length;
  const needle = q.trim().toLowerCase();
  const shown = docs.filter((x) => (view === "all" || (!x.dog_id && !x.case_id)) && (!kindF || x.kind === kindF) && (!needle || [x.title, x.notes, KIND[x.kind], x.dog_id ? animalLabel(byAnimal.get(x.dog_id) ?? { id: "", name: null, code: null, straypaw_id: null, zone: null }) : null, x.case_id ? byCase.get(x.case_id)?.title : null].filter(Boolean).some((v) => String(v).toLowerCase().includes(needle))));
  const open = docs.find((x) => x.id === openId) ?? null;

  const file = async (files: File[]) => {
    let ok = 0; const failed: string[] = [];
    /* One at a time: field connections fail bursts of parallel uploads. */
    for (let i = 0; i < files.length; i++) {
      setFiling(`Filing ${i + 1} of ${files.length}…`);
      const x = await run(`file:${i}`, () => fileScan(files[i], kind), { quiet: true });
      if (x.ok) ok++; else failed.push(files[i].name);
    }
    setFiling(null);
    if (ok) toast({ text: `${ok === 1 ? "1 scan" : `${ok} scans`} filed as ${KIND[kind].toLowerCase()}.${failed.length ? ` ${failed.length} not filed.` : ""}`, tone: "ok" });
    if (ok) r.reload();
  };
  const cols: GCol<SourceDocument>[] = [
    { label: "Scan", width: "minmax(0, 1.4fr)", render: (x) => <span className="nx-cell-main"><FileText size={14} style={{ color: "var(--ink-3)", flex: "none" }} /><span><b>{x.title?.trim() || "Untitled scan"}</b><small>{KIND[x.kind] ?? x.kind}</small></span></span> },
    { label: "Date on the record", width: "128px", render: (x) => <span className="nx-t2">{x.recorded_on ? day(x.recorded_on) : "Not given"}</span> },
    { label: "Context", width: "minmax(0, 1.6fr)", render: (x) => <span className="nx-t2 ns-cell" title={x.notes ?? undefined}>{x.notes || "No context written yet"}</span> },
    { label: "Attached to", width: "minmax(120px, 1fr)", keep: true, render: (x) => (!x.dog_id && !x.case_id ? <Chip tone="warn">Not attached</Chip> : <span className="nx-t2 ns-cell">{[x.dog_id ? (byAnimal.get(x.dog_id) ? animalLabel(byAnimal.get(x.dog_id)!) : "An animal") : null, x.case_id ? byCase.get(x.case_id)?.title ?? "A case" : null].filter(Boolean).join(" · ")}</span>) },
  ];
  return (
    <>
      <Tools end={who.sample ? <TryLink small><Upload size={13} />File scans</TryLink> : <>
        <select className="ns-sel" value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)} disabled={!!filing} aria-label="Document type for new scans">{DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select>
        <FilePick label={filing ?? "File scans"} accept="image/*" multiple disabled={!!filing || !!busy} onFiles={(f) => void file(f)} />
      </>}>
        <span className="ns-sum"><b>{docs.length}</b> filed{docs.length >= 300 ? " (the latest 300)" : ""}, <b>{loose}</b> not yet attached. Private to your organisation.</span>
      </Tools>
      <Views id="dc" value={view} onChange={setView} views={[{ id: "all", label: "All", count: docs.length }, { id: "loose", label: "Not yet attached", count: loose }]}
        end={<><select className="ns-sel" value={kindF} onChange={(e) => setKindF(e.target.value as DocumentKind | "")} aria-label="Type" style={{ marginLeft: "auto" }}><option value="">Every type</option>{DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select><Find value={q} onChange={setQ} label="Search filed documents" /></>} />
      {!who.sample && (d!.animals === null || d!.cases === null) ? <p className="nx-foot" role="status">{[d!.animals === null ? "Animals could not be read, so attaching to an animal is unavailable." : null, d!.cases === null ? "Cases could not be read, so attaching to a case is unavailable." : null].filter(Boolean).join(" ")}</p> : null}
      <Grid label="Filed documents" cols={cols} rows={shown} rowKey={(x) => x.id} rowLabel={(x) => x.title ?? "scan"} onOpen={(x) => setOpenId(x.id)} openKey={openId}
        empty={docs.length ? <><b>No file matches</b><p>Change the search or filters.</p></> : <><b>No scans filed yet</b><p>Choose a type, then pick the files. Registers can also be imported.</p><p><Link className="nx-btn is-quiet" href="/next/ngo/import">Import a register</Link></p></>} />
      <AnimatePresence>{open ? <Drawer key={open.id} head={KIND[open.kind] ?? "Document"} title={open.title?.trim() || "Untitled scan"} sub={<>Filed {day(open.created_at)}</>} onClose={() => setOpenId(null)}>
        <DocDetail doc={open} sample={who.sample} animals={d!.animals} cases={d!.cases} onChanged={r.reload} />
      </Drawer> : null}</AnimatePresence>
    </>
  );
}

function DocDetail({ doc, sample, animals, cases, onChanged }: { doc: SourceDocument; sample: boolean; animals: AnimalLite[] | null; cases: Case[] | null; onChanged: () => void }) {
  const { busy, run } = useAct();
  const [shown, setShown] = useState(!sensitive(doc));
  const [edit, setEdit] = useState({ title: doc.title ?? "", notes: doc.notes ?? "", kind: doc.kind, recordedOn: doc.recorded_on ?? "" });
  const attach = (opts: { dogId?: string; caseId?: string; clear?: boolean }, label: string) => {
    const bare = !doc.dog_id && !doc.case_id;
    void run("attach", () => attachDocument(doc.id, opts), { ok: opts.clear ? "Detached." : `Attached to ${label}.`, undo: !opts.clear && bare ? async () => { await attachDocument(doc.id, { clear: true }); onChanged(); } : undefined }).then((x) => { if (x.ok) onChanged(); });
  };
  return (
    <>
      {doc.url ? (shown
        // eslint-disable-next-line @next/next/no-img-element
        ? <a href={doc.url} target="_blank" rel="noreferrer noopener" aria-label="Open the scan in full"><img src={doc.url} alt={doc.title ?? "Filed document"} className="ns-thumb" loading="lazy" /></a>
        : <button type="button" className="nx-note" style={{ width: "100%" }} onClick={() => setShown(true)}><span>May show an injured animal. Show the scan.</span></button>)
        : <p className="nx-note"><span>Sample record: no file is attached.</span></p>}
      <h3 className="nx-h3">Attached to</h3>
      <p className="nx-sub">{doc.dog_id ? <Link href={`/next/ngo/animals/${doc.dog_id}`} style={{ color: "var(--accent)" }}>{animals?.find((a) => a.id === doc.dog_id) ? animalLabel(animals.find((a) => a.id === doc.dog_id)!) : "An animal"}</Link> : null}{doc.dog_id && doc.case_id ? " · " : null}{doc.case_id ? <Link href={`/next/ngo/cases/${doc.case_id}`} style={{ color: "var(--accent)" }}>{cases?.find((c) => c.id === doc.case_id)?.title ?? "A case"}</Link> : null}{!doc.dog_id && !doc.case_id ? "Nothing yet." : null}</p>
      {sample ? <div className="ns-acts"><TryLink quiet small>Attach to an animal or case</TryLink></div> : <div className="nx-fields" style={{ marginTop: 8 }}>
        {!doc.dog_id && animals?.length ? <Field label="Attach to an animal"><select defaultValue="" disabled={!!busy} onChange={(e) => { const a = animals.find((x) => x.id === e.target.value); if (a) attach({ dogId: a.id }, animalLabel(a)); }}><option value="">Choose an animal…</option>{animals.map((a) => <option key={a.id} value={a.id}>{animalLabel(a)}{a.straypaw_id ? ` · ${a.straypaw_id}` : ""}</option>)}</select></Field> : null}
        {!doc.case_id && cases?.length ? <Field label="Attach to a case"><select defaultValue="" disabled={!!busy} onChange={(e) => { const c = cases.find((x) => x.id === e.target.value); if (c) attach({ caseId: c.id }, c.title); }}><option value="">Choose a case…</option>{cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field> : null}
        {doc.dog_id || doc.case_id ? <div><button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => attach({ clear: true }, "")}>Detach</button></div> : null}
      </div>}
      <h3 className="nx-h3">Context</h3>
      {sample ? <p className="nx-sub">{doc.notes ?? "No context written yet."}</p> : <form className="nx-fields" onSubmit={(e) => { e.preventDefault(); void run("edit", () => editDocument(doc.id, { title: edit.title, notes: edit.notes, kind: edit.kind, recordedOn: edit.recordedOn || null }), { ok: "Context saved." }).then((x) => { if (x.ok) onChanged(); }); }}>
        <Field label="Title" wide><input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="ABC ledger, page 14" /></Field>
        <Field label="Type"><select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as DocumentKind })}>{DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></Field>
        <Field label="Date on the record"><input type="date" value={edit.recordedOn} onChange={(e) => setEdit({ ...edit, recordedOn: e.target.value })} /></Field>
        <Field label="What this is" wide><textarea rows={3} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} placeholder="Whose handwriting, which drive, what the entries cover. Anything the next person would need to read it." /></Field>
        <div><button type="submit" className="nx-btn is-sm" disabled={!!busy}>{busy === "edit" ? "Saving…" : "Save context"}</button></div>
      </form>}
    </>
  );
}
