"use client";

import { useEffect, useState } from "react";
import { Check, FileSpreadsheet, Loader2, ScanSearch, Upload } from "lucide-react";

type Org = { id: string; name: string; city: string | null; verified: boolean };
type Preview = { totalRows: number; acceptedRows: number; identityCandidates: number; unidentified: number; counts: Record<string, number>; sheets: Array<{ name: string; headerRow: number; rows: Array<{ sourceRowNumber: number; normalized: { classification: string; classification_reason: string; locality: string | null; event_date: string | null } }> }> };
type Result = { ngo?: string; rowsStaged?: number; alreadyStaged?: boolean; batchIds?: string[]; casesCreated?: number; profilesCreated?: number; medicalEvents?: number; rowsNeedingReview?: number };
type CleanupPlan = { batches: number; sourceRows: number; cases: number; syntheticProfiles: number; syntheticTimelineEvents: number };
type ReviewRow = { id: string; source_row_number: number; source_subrecord: string | null; classification: string; decision: "new" | "merge" | "review" | "skip"; normalized: { locality?: string | null; event_date?: string | null; animal_name?: string | null; condition?: string | null; classification_reason?: string | null } };
const label = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

export function MasterImport({ secret }: { secret: string }) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [ngoId, setNgoId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [cleanup, setCleanup] = useState<CleanupPlan | null>(null);
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);

  useEffect(() => {
    fetch("/api/admin/orgs", { headers: { Authorization: `Bearer ${secret}` } })
      .then((res) => res.json()).then((data) => { const list = (data.orgs ?? []) as Org[]; setOrgs(list); setNgoId((current) => current || list.find((org) => org.verified)?.id || list[0]?.id || ""); })
      .catch(() => setError("Could not load organisations."));
  }, [secret]);

  async function send(action: "preview" | "stage") {
    if (!file || !ngoId) return;
    setBusy(true); setError(null); if (action === "preview") { setPreview(null); setResult(null); }
    const body = new FormData(); body.set("action", action); body.set("ngoId", ngoId); body.set("file", file);
    try {
      const res = await fetch("/api/admin/imports", { method: "POST", headers: { Authorization: `Bearer ${secret}` }, body });
      const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Import could not be processed.");
      if (action === "preview") setPreview(data.preview); else { setResult(data); if (data.batchIds?.length) void loadReview(data.batchIds); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Import could not be processed."); }
    finally { setBusy(false); }
  }

  async function loadReview(batchIds: string[]) {
    const res = await fetch(`/api/admin/imports/review?ngoId=${encodeURIComponent(ngoId)}&batchIds=${encodeURIComponent(batchIds.join(","))}`, { headers: { Authorization: `Bearer ${secret}` } });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Could not load staged review rows."); return; }
    setReviewRows(data.rows ?? []); setReviewTotal(data.total ?? 0);
  }
  async function decide(row: ReviewRow, decision: "review" | "skip") {
    setBusy(true); setError(null);
    try { const res = await fetch("/api/admin/imports/review", { method: "PATCH", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ ngoId, rowId: row.id, decision }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Could not save review decision."); setReviewRows((rows) => decision === "skip" ? rows.filter((item) => item.id !== row.id) : rows.map((item) => item.id === row.id ? { ...item, decision } : item)); setReviewTotal((total) => decision === "skip" ? Math.max(0, total - 1) : total); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save review decision."); } finally { setBusy(false); }
  }

  async function inspectCleanup(execute = false) {
    if (!ngoId) return;
    setBusy(true); setError(null);
    try { const res = await fetch("/api/admin/imports/cleanup", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ ngoId, execute }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Could not inspect cleanup."); setCleanup(data.cleaned ?? data.plan); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not inspect cleanup."); } finally { setBusy(false); }
  }
  async function commit() {
    if (!ngoId || !result?.batchIds?.length) return;
    setBusy(true); setError(null);
    try { const body = new FormData(); body.set("action", "commit"); body.set("ngoId", ngoId); body.set("batchIds", JSON.stringify(result.batchIds)); const res = await fetch("/api/admin/imports", { method: "POST", headers: { Authorization: `Bearer ${secret}` }, body }); const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Could not commit staged import."); setResult((current) => ({ ...current, ...data })); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not commit staged import."); } finally { setBusy(false); }
  }

  return <section className="card max-w-4xl p-5 sm:p-7"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-paw-50 text-paw-600"><FileSpreadsheet className="h-5 w-5" /></span><div><h2 className="font-display text-xl tracking-tight">Master organisation import</h2><p className="mt-1 text-sm leading-relaxed text-bark-500">Analyse the whole workbook first. StrayPaw separates rescues, care, follow-ups and drive records before anything is added to the organisation workspace.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1.2fr]"><label className="grid gap-1.5 text-xs font-semibold text-bark-600">Organisation<select value={ngoId} onChange={(e) => { setNgoId(e.target.value); setPreview(null); setResult(null); setCleanup(null); setReviewRows([]); }} className="h-11 rounded-md border border-black/10 bg-white px-3 text-sm text-bark-800"><option value="">Choose organisation</option>{orgs.map((org) => <option key={org.id} value={org.id}>{org.name}{org.city ? ` · ${org.city}` : ""}</option>)}</select></label><label className="grid gap-1.5 text-xs font-semibold text-bark-600">Workbook<input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setResult(null); setReviewRows([]); }} className="block h-11 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-bark-600" /></label></div><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => void send("preview")} disabled={!file || !ngoId || busy} className="btn-primary min-h-11 px-4">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}{busy ? "Analysing workbook…" : "Analyse workbook"}</button>{preview && <button type="button" onClick={() => void send("stage")} disabled={busy} className="btn-secondary min-h-11 px-4"><Upload className="h-4 w-4" />Stage reviewed import</button>}<button type="button" onClick={() => void inspectCleanup(false)} disabled={!ngoId || busy} className="btn-secondary min-h-11 px-4">Inspect broken V1 import</button></div>{error && <p className="mt-4 text-sm font-medium text-status-injured">{error}</p>}{cleanup && <div className="mt-5 rounded-lg border border-status-hungry/30 bg-status-hungry/10 p-4 text-sm text-bark-700"><p className="font-semibold">Safe cleanup plan</p><p className="mt-1">Only the prior row-as-case master batches and their generated HIST records will be removed: {cleanup.cases.toLocaleString()} cases, {cleanup.syntheticProfiles.toLocaleString()} synthetic profiles and {cleanup.syntheticTimelineEvents.toLocaleString()} timeline entries. Existing community and pre-import animals are not selected.</p><button type="button" onClick={() => void inspectCleanup(true)} disabled={busy} className="mt-3 text-sm font-semibold text-status-injured hover:underline">Remove only these broken V1 records</button></div>}{preview && <div className="mt-5 rounded-lg border border-black/10 bg-shell-50 p-4"><p className="font-semibold text-bark-900">Workbook review</p><p className="mt-1 text-sm text-bark-600">{preview.totalRows.toLocaleString()} rows scanned · {preview.acceptedRows.toLocaleString()} operational records · {preview.identityCandidates.toLocaleString()} possible animal identities · {preview.unidentified.toLocaleString()} events kept without guessing an animal.</p><div className="mt-4 grid gap-2 sm:grid-cols-3">{Object.entries(preview.counts).filter(([, count]) => count > 0).map(([kind, count]) => <div key={kind} className="rounded-md border border-black/[.07] bg-white px-3 py-2"><span className="block text-[11px] font-semibold uppercase tracking-wide text-bark-500">{label(kind)}</span><b className="text-lg text-bark-900">{count.toLocaleString()}</b></div>)}</div><div className="mt-4 space-y-2 border-t border-black/[.07] pt-3 text-xs text-bark-600">{preview.sheets.map((sheet) => <p key={sheet.name}><b className="text-bark-800">{sheet.name}</b> · {sheet.rows.length ? `${sheet.rows.length} sample records checked` : "no operational table found"}</p>)}</div><p className="mt-4 text-xs leading-relaxed text-bark-500">Staging stores the workbook and reviewable source rows only. It does not create cases, profiles or map points until the reviewed commit step is complete.</p></div>}{result && <div className="mt-5 rounded-lg border border-status-vaccinated/30 bg-status-vaccinated/10 p-4 text-sm text-status-vaccinated"><p className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4" />{result.casesCreated !== undefined ? "Reviewed import committed" : result.alreadyStaged ? "This workbook is already staged" : "Workbook staged safely"}</p>{result.casesCreated !== undefined ? <p className="mt-1 text-bark-600">{result.casesCreated.toLocaleString()} cases, {result.profilesCreated?.toLocaleString() ?? 0} defensible animal profiles and {result.medicalEvents?.toLocaleString() ?? 0} care events were committed. {result.rowsNeedingReview?.toLocaleString() ?? 0} records remain for human review.</p> : <><p className="mt-1 text-bark-600">{(result.rowsStaged ?? 0).toLocaleString()} source rows are available for review. No animal profiles or cases were created by staging.</p>{reviewRows.length > 0 && <div className="mt-4 rounded border border-black/10 bg-white p-3 text-bark-700"><p className="font-semibold">Confirm source records</p><p className="mt-1 text-xs text-bark-500">{reviewTotal.toLocaleString()} eligible records. Review the sample below; excluding a row prevents it from being committed.</p><div className="mt-3 divide-y divide-black/[.07]">{reviewRows.slice(0, 12).map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-xs"><span><b>{label(row.classification)}</b> · {row.normalized.event_date?.slice(0, 10) ?? "Date missing"} · {row.normalized.locality ?? "Locality missing"}{row.normalized.animal_name ? ` · ${row.normalized.animal_name}` : ""}</span><span className="flex gap-2"><button type="button" disabled={busy} onClick={() => void decide(row, "review")} className="font-semibold text-paw-700">Keep</button><button type="button" disabled={busy} onClick={() => void decide(row, "skip")} className="font-semibold text-status-injured">Exclude</button></span></div>)}</div></div>}<button type="button" onClick={() => void commit()} disabled={busy || !result.batchIds?.length} className="mt-3 text-sm font-semibold text-paw-700 hover:underline">Confirm and commit eligible records</button></>}</div>}</section>;
}
