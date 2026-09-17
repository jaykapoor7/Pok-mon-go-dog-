"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronRight, FileSpreadsheet, Loader2, ShieldAlert, Upload } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";

type Mapping = Record<string, string | null>;
type PreviewRow = { sourceRowNumber: number; raw: Record<string, unknown>; normalized: Record<string, string | undefined> };
type Match = { id: string; label: string; reasons: string[] };
type SheetProfile = { name:string; rows:number; headers:string[]; kind:string; label:string; confidence:"high"|"medium"|"review"; reason:string };
type Preview = { sheetNames: string[]; sheetName: string; sheetProfiles: SheetProfile[]; headers: string[]; mapping: Mapping; sample: PreviewRow[]; rows: Array<{ sourceRowNumber: number }>; matches: Record<number, Match[]> };
type Decision = "new" | "merge" | "review" | "skip";

const FIELDS: Array<[string, string]> = [
  ["animalCode", "Legacy animal ID"], ["name", "Animal name"], ["species", "Species"], ["sex", "Sex"], ["colour", "Colour / identifiers"], ["location", "Location"], ["latitude", "Latitude (for map)"], ["longitude", "Longitude (for map)"], ["condition", "Condition"], ["date", "Report date"], ["reviewDate", "Review / follow-up"], ["detailedStatus", "Treatment / outcome notes"], ["programme", "Programme / drive"],
];

async function accessToken() {
  const supa = getSupabase();
  if (!supa) return "";
  const { data } = await supa.auth.getSession();
  return data.session?.access_token ?? "";
}

export function ImportClient() {
  const { user, openSignIn } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [decisions, setDecisions] = useState<Record<number, { decision: Decision; matchedDogId?: string }>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; review: number; failed: number; sourceStored: boolean } | null>(null);
  const mapped = useMemo(() => Object.values(mapping).filter(Boolean).length, [mapping]);

  async function read(next = file, selectedSheet?: string) {
    if (!next) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const form = new FormData();
      form.append("action", "preview"); form.append("file", next); form.append("accessToken", await accessToken());
      if (selectedSheet) form.append("sheetName", selectedSheet);
      if (Object.keys(mapping).length) form.append("mapping", JSON.stringify(mapping));
      const res = await fetch("/api/partner/import", { method: "POST", body: form });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Could not read this workbook.");
      setPreview(data); setMapping(data.mapping); setDecisions({});
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read this workbook."); }
    finally { setBusy(false); }
  }

  async function commit() {
    if (!file || !preview) return;
    if (!user) return openSignIn();
    setBusy(true); setError(null);
    try {
      const form = new FormData();
      form.append("action", "commit"); form.append("file", file); form.append("sheetName", preview.sheetName);
      form.append("mapping", JSON.stringify(mapping)); form.append("decisions", JSON.stringify(decisions)); form.append("accessToken", await accessToken());
      const res = await fetch("/api/partner/import", { method: "POST", body: form });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Import could not be started."); setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Import could not be started."); }
    finally { setBusy(false); }
  }

  function rowDecision(row: PreviewRow): { decision: Decision; matchedDogId?: string } {
    const saved = decisions[row.sourceRowNumber]; if (saved) return saved;
    return { decision: "review" };
  }

  const selectedProfile = preview?.sheetProfiles?.find((sheet)=>sheet.name===preview.sheetName) ?? null;

  return <div className="space-y-5">
    <section className="rounded-xl border border-black/[.08] bg-white/70 p-5 dark:border-white/10 dark:bg-white/[.03]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-paw-50 text-paw-600 dark:bg-paw-900/30"><FileSpreadsheet className="h-5 w-5" /></span><div><h2 className="font-semibold text-bark-900 dark:text-bark-50">Bring your existing workbook</h2><p className="mt-1 max-w-xl text-[13px] leading-relaxed text-bark-500">StrayPaw reads the whole workbook first, identifies what each sheet appears to represent, then lets you map and review the operational sheet you want to stage. Original files and raw rows remain attached as provenance.</p></div></div><button type="button" className="spa-cta shrink-0" onClick={() => fileRef.current?.click()} disabled={busy}><Upload className="h-4 w-4" /> Choose file</button><input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { const next = e.target.files?.[0] ?? null; setFile(next); setPreview(null); setMapping({}); if (next) void read(next); }} /></div>
      {file && <p className="mt-4 border-t border-black/[.06] pt-3 text-[12px] text-bark-500 dark:border-white/[.08]"><b className="text-bark-700 dark:text-bark-200">{file.name}</b> · {(file.size / 1024 / 1024).toFixed(1)} MB · {preview ? `${preview.sheetProfiles?.length ?? preview.sheetNames.length} sheets understood` : "reading…"}</p>}
    </section>

    {preview && !result && <>
      {preview.sheetProfiles?.length>1&&<section className="rounded-xl border border-black/[.08] p-5 dark:border-white/10"><div><p className="text-[11px] font-semibold uppercase tracking-[.13em] text-paw-600">Workbook map</p><h2 className="mt-1 font-semibold text-bark-900 dark:text-bark-50">What StrayPaw thinks each sheet is</h2><p className="mt-1 max-w-2xl text-[13px] text-bark-500">This is a routing suggestion, not a silent import decision. Salary/rent sheets stay separate from animal records; vehicle sheets feed Operations; rescue, care, follow-up, programme and survey sheets can be reviewed in their own context.</p></div><div className="mt-4 divide-y divide-black/[.06] border-y border-black/[.08] dark:divide-white/[.06] dark:border-white/10">{preview.sheetProfiles.map(sheet=><button type="button" key={sheet.name} onClick={()=>void read(file,sheet.name)} className={`grid w-full gap-1 px-1 py-3 text-left sm:grid-cols-[minmax(0,1.4fr)_170px_90px_minmax(0,2fr)] sm:items-center ${sheet.name===preview.sheetName?"bg-paw-50/60 dark:bg-paw-900/10":""}`}><b className="truncate text-[13px]">{sheet.name}</b><span className="text-[12px] font-medium">{sheet.label}</span><span className="text-[11px] tabular-nums text-bark-400">{sheet.rows.toLocaleString()} rows</span><span className="text-[11px] leading-4 text-bark-500">{sheet.reason}</span></button>)}</div></section>}

      <section className="rounded-xl border border-black/[.08] p-5 dark:border-white/10"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[.13em] text-paw-600">Step 1</p><h2 className="mt-1 font-semibold text-bark-900 dark:text-bark-50">Choose a sheet and map it</h2><p className="mt-1 text-[13px] text-bark-500">{mapped} fields mapped{selectedProfile?` · detected as ${selectedProfile.label.toLowerCase()}`:""}. Empty mappings remain in the raw import and can be mapped later.</p></div><select aria-label="Workbook sheet" value={preview.sheetName} onChange={(e) => void read(file, e.target.value)} className="rounded-md border border-black/[.1] bg-transparent px-3 py-2 text-sm dark:border-white/10">{preview.sheetNames.map((name) => <option key={name}>{name}</option>)}</select></div>
        {selectedProfile?.kind==="administrative"&&<p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-900">This looks like staff/pay/rent administration. Keep it private and out of animal identities, cases and public evidence unless you intentionally need it for a separate internal workflow.</p>}
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{FIELDS.map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3 rounded-md border border-black/[.06] px-3 py-2 dark:border-white/[.08]"><span className="text-[12px] text-bark-500">{label}</span><select value={mapping[key] ?? ""} onChange={(e) => setMapping((current) => ({ ...current, [key]: e.target.value || null }))} className="max-w-[55%] truncate bg-transparent text-right text-[12px] font-medium text-bark-800 outline-none dark:text-bark-100"><option value="">Not mapped</option>{preview.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>)}</div>
        <button type="button" onClick={() => void read(file, preview.sheetName)} disabled={busy} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-paw-600 hover:underline">Refresh preview <ChevronRight className="h-4 w-4" /></button>
      </section>
      <section className="rounded-xl border border-black/[.08] p-5 dark:border-white/10"><div><p className="text-[11px] font-semibold uppercase tracking-[.13em] text-paw-600">Step 2</p><h2 className="mt-1 font-semibold text-bark-900 dark:text-bark-50">Review identity decisions</h2><p className="mt-1 text-[13px] leading-relaxed text-bark-500">Matching name, colour or locality is not enough to silently merge. Rows with possible matches stop for review. A new permanent profile needs a legacy ID, or name + locality + distinguishing detail. Add latitude/longitude columns when you want confirmed profiles to appear on the community map; a place name alone is kept off-map until a team pins it.</p></div><div className="mt-4 overflow-hidden rounded-lg border border-black/[.08] dark:border-white/10">{preview.sample.map((row) => { const current = rowDecision(row); const candidates = preview.matches?.[row.sourceRowNumber] ?? []; return <div key={row.sourceRowNumber} className="grid gap-3 border-b border-black/[.06] px-3 py-3 last:border-0 dark:border-white/[.06] md:grid-cols-[1fr_190px] md:items-center"><div className="min-w-0"><p className="truncate text-[13px] font-medium text-bark-900 dark:text-bark-50">{row.normalized.animalCode || row.normalized.name || row.normalized.condition || "Untitled historic record"}</p><p className="mt-0.5 truncate text-[12px] text-bark-500">Row {row.sourceRowNumber} · {[row.normalized.location, row.normalized.condition, row.normalized.date].filter(Boolean).join(" · ") || "No mapped identity detail"}</p>{candidates.length > 0 && <p className="mt-1 text-[11px] text-status-hungry">Possible match: {candidates[0].label} ({candidates[0].reasons.join(", ")})</p>}</div><select aria-label={`Decision for row ${row.sourceRowNumber}`} value={current.decision} onChange={(e) => { const next = e.target.value as Decision; setDecisions((all) => ({ ...all, [row.sourceRowNumber]: { decision: next, matchedDogId: next === "merge" ? candidates[0]?.id : undefined } })); }} className="min-w-0 rounded-md border border-black/[.1] bg-transparent px-2 py-1.5 text-[12px] dark:border-white/10"><option value="new">New animal + case</option><option value="review">Review later</option><option value="skip">Skip</option>{candidates.length > 0 && <option value="merge">Merge into candidate</option>}</select></div>; })}</div></section>
      <section className="flex flex-col justify-between gap-4 rounded-xl bg-bark-900 p-5 text-white sm:flex-row sm:items-center dark:bg-white dark:text-bark-900"><div><h2 className="font-semibold">Ready to stage this sheet?</h2><p className="mt-1 max-w-xl text-[13px] leading-relaxed text-white/70 dark:text-bark-500">The workbook stays one source of truth, while each sheet keeps its own name and classification. New animal records require explicit identity decisions; review rows stay private until your team resolves them.</p></div><button type="button" onClick={() => void commit()} disabled={busy || !user || selectedProfile?.kind==="administrative"} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-paw-500 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-paw-600 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{user ? "Stage selected sheet" : "Sign in to import"}</button></section>
    </>}
    {result && <section className="rounded-xl border border-status-vaccinated/30 bg-status-vaccinated/10 p-5 text-status-vaccinated"><div className="flex gap-3"><Check className="mt-0.5 h-5 w-5" /><div><h2 className="font-semibold">Import staged</h2><p className="mt-1 text-[13px]">{result.imported} records imported · {result.review} need identity review · {result.failed} failed rows. {result.sourceStored ? "The original workbook is attached to this batch." : "The rows were saved, but the original file could not be stored."}</p></div></div></section>}
    {error && <p role="alert" className="rounded-lg bg-status-injured/10 px-4 py-3 text-[13px] font-medium text-status-injured"><ShieldAlert className="mr-2 inline h-4 w-4" />{error}</p>}
  </div>;
}
