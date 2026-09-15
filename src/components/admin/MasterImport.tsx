"use client";

import { useEffect, useState } from "react";
import { Check, FileSpreadsheet, Loader2, Upload } from "lucide-react";

type Org = { id: string; name: string; city: string | null; verified: boolean };
type Result = { ngo: string; rowsStaged: number; casesCreated: number; batches: Array<{ sheet: string; rows: number }>; programmes: Array<{ name: string; records: number }> };

export function MasterImport({ secret }: { secret: string }) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [ngoId, setNgoId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

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
    setBusy(true); setError(null); setResult(null);
    const body = new FormData(); body.set("ngoId", ngoId); body.set("file", file);
    try { const res = await fetch("/api/admin/imports", { method: "POST", headers: { Authorization: `Bearer ${secret}` }, body }); const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Import failed."); setResult(data); } catch (e) { setError(e instanceof Error ? e.message : "Import failed."); } finally { setBusy(false); }
  }

  return <section className="card max-w-3xl p-5 sm:p-7"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-paw-50 text-paw-600"><FileSpreadsheet className="h-5 w-5" /></span><div><h2 className="font-display text-xl tracking-tight">Master organisation import</h2><p className="mt-1 text-sm leading-relaxed text-bark-500">Choose the NGO once and upload one workbook. Every operational sheet is staged privately and becomes a searchable historic case record. Reporter contacts are removed from the working rows; the original workbook remains in private storage.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1.2fr]"><label className="grid gap-1.5 text-xs font-semibold text-bark-600">Organisation<select value={ngoId} onChange={(e) => setNgoId(e.target.value)} className="h-11 rounded-md border border-black/10 bg-white px-3 text-sm text-bark-800"><option value="">Choose organisation</option>{orgs.map((org) => <option key={org.id} value={org.id}>{org.name}{org.city ? ` · ${org.city}` : ""}</option>)}</select></label><label className="grid gap-1.5 text-xs font-semibold text-bark-600">Workbook<input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block h-11 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-bark-600" /></label></div><p className="mt-4 text-xs leading-relaxed text-bark-500">This creates case episodes from the source. It does not invent animal identities or GPS pins from a free-text rescue description. A completed sterilisation ledger becomes an aggregate evidence card; private names and contacts never do.</p><button type="button" onClick={() => void submit()} disabled={!file || !ngoId || busy} className="btn-primary mt-5 min-h-11 px-4">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{busy ? "Importing every operational sheet…" : "Import organisation workbook"}</button>{error && <p className="mt-4 text-sm font-medium text-status-injured">{error}</p>}{result && <div className="mt-5 rounded-lg border border-status-vaccinated/30 bg-status-vaccinated/10 p-4 text-sm text-status-vaccinated"><p className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4" />{result.ngo}: {result.rowsStaged.toLocaleString()} historic records staged</p><p className="mt-1">{result.casesCreated.toLocaleString()} case episodes are now in the NGO dashboard. {result.batches.map((batch) => `${batch.sheet} (${batch.rows})`).join(" · ")}</p>{result.programmes.map((programme) => <p key={programme.name} className="mt-1 text-bark-600">Published evidence: {programme.name} ({programme.records} source records).</p>)}</div>}</section>;
}
