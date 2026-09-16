"use client";

import { useEffect, useState } from "react";
import { Check, FileSpreadsheet, Loader2, Upload } from "lucide-react";

type Org = { id: string; name: string; city: string | null; verified: boolean };
type Result = { ngo: string; rowsStaged: number; casesCreated: number; batches: Array<{ sheet: string; rows: number }>; programmes: Array<{ name: string; records: number }>; animals?: { profilesCreated: number; profilesTotal: number; timelinesCreated: number } };

export function MasterImport({ secret }: { secret: string }) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [ngoId, setNgoId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [reconciled, setReconciled] = useState<Result["animals"] | null>(null);

  useEffect(() => {
    fetch("/api/admin/orgs", { headers: { Authorization: `Bearer ${secret}` } })
      .then((res) => res.json())
      .then((data) => {
        const list = (data.orgs ?? []) as Org[];
        setOrgs(list);
        setNgoId((current) => current || list.find((org) => org.verified)?.id || list[0]?.id || "");
      })
      .catch(() => setError("Could not load organisations."));
  }, [secret]);

  async function submit() {
    if (!file || !ngoId) return;
    setBusy(true); setError(null); setResult(null); setReconciled(null);
    const body = new FormData(); body.set("ngoId", ngoId); body.set("file", file);
    try { const res = await fetch("/api/admin/imports", { method: "POST", headers: { Authorization: `Bearer ${secret}` }, body }); const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Import failed."); setResult(data); } catch (e) { setError(e instanceof Error ? e.message : "Import failed."); } finally { setBusy(false); }
  }

  async function buildProfiles() {
    if (!ngoId) return;
    setBusy(true); setError(null);
    try { const res = await fetch("/api/admin/imports/reconcile", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ ngoId }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Could not build animal records."); setReconciled(data); setResult((current) => current ? { ...current, animals: data } : current); } catch (e) { setError(e instanceof Error ? e.message : "Could not build animal records."); } finally { setBusy(false); }
  }

  const animalResult = result?.animals ?? reconciled;
  return <section className="card max-w-3xl p-5 sm:p-7"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-paw-50 text-paw-600"><FileSpreadsheet className="h-5 w-5" /></span><div><h2 className="font-display text-xl tracking-tight">Master organisation import</h2><p className="mt-1 text-sm leading-relaxed text-bark-500">Choose the NGO once and upload one workbook. StrayPaw turns each operational sheet into case records, animal profiles and care timelines.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1.2fr]"><label className="grid gap-1.5 text-xs font-semibold text-bark-600">Organisation<select value={ngoId} onChange={(e) => setNgoId(e.target.value)} className="h-11 rounded-md border border-black/10 bg-white px-3 text-sm text-bark-800"><option value="">Choose organisation</option>{orgs.map((org) => <option key={org.id} value={org.id}>{org.name}{org.city ? ` · ${org.city}` : ""}</option>)}</select></label><label className="grid gap-1.5 text-xs font-semibold text-bark-600">Workbook<input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block h-11 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-bark-600" /></label></div><p className="mt-4 text-xs leading-relaxed text-bark-500">Repeated identity signals are linked into one animal timeline. Profiles with no captured coordinates remain off the map until the team adds a location.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => void submit()} disabled={!file || !ngoId || busy} className="btn-primary min-h-11 px-4">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{busy ? "Importing every operational sheet…" : "Import organisation workbook"}</button><button type="button" onClick={() => void buildProfiles()} disabled={!ngoId || busy} className="btn-secondary min-h-11 px-4">Build animal profiles from imported history</button></div>{error && <p className="mt-4 text-sm font-medium text-status-injured">{error}</p>}{animalResult && !result && <div className="mt-5 rounded-lg border border-status-vaccinated/30 bg-status-vaccinated/10 p-4 text-sm text-status-vaccinated"><p className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4" />Animal histories are ready</p><p className="mt-1 text-bark-600">{animalResult.profilesCreated.toLocaleString()} profiles and {animalResult.timelinesCreated.toLocaleString()} timeline entries were added. {animalResult.profilesTotal.toLocaleString()} imported animal records are connected for this organisation.</p></div>}{result && <div className="mt-5 rounded-lg border border-status-vaccinated/30 bg-status-vaccinated/10 p-4 text-sm text-status-vaccinated"><p className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4" />{result.ngo}: {result.rowsStaged.toLocaleString()} historic records staged</p><p className="mt-1">{result.casesCreated.toLocaleString()} case episodes are now in the NGO dashboard. {result.batches.map((batch) => `${batch.sheet} (${batch.rows})`).join(" · ")}</p>{animalResult && <p className="mt-1 text-bark-600">{animalResult.profilesCreated.toLocaleString()} animal profiles and {animalResult.timelinesCreated.toLocaleString()} timeline entries created.</p>}{result.programmes.map((programme) => <p key={programme.name} className="mt-1 text-bark-600">Published work: {programme.name} ({programme.records} dogs sterilised).</p>)}</div>}</section>;
}
