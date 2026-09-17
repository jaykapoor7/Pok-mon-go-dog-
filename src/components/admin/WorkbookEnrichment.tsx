"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Org = { id: string; name: string; city: string | null; verified: boolean };
type Preview = { sourceRows: number; animalRows: number; rescueRows: number; missingRescueCases: number; derivedMedicalEvents: number; missingMedicalEvents: number; historicalFollowupEvents: number; missingHistoricalFollowupEvents: number; falsePositiveVaccinations: number; rowsRemaining: number; programmes: Array<{ name: string; count: number; publicSummary: string }> };

async function read(res: Response) { const text = await res.text(); try { return text ? JSON.parse(text) : {}; } catch { return { error: `Unreadable server response (${res.status}).` }; } }

export function WorkbookEnrichment() {
  const [secret, setSecret] = useState("");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [ngoId, setNgoId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function loadOrgs() {
    if (!secret) return;
    setBusy(true); setError(null);
    try { const res = await fetch("/api/admin/orgs", { headers: { Authorization: `Bearer ${secret}` } }); const data = await read(res); if (!res.ok) throw new Error(data.error ?? "Could not load organisations."); const list = data.orgs ?? []; setOrgs(list); setNgoId(list.find((o: Org) => /pawsome/i.test(o.name))?.id ?? list[0]?.id ?? ""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load organisations."); }
    finally { setBusy(false); }
  }

  async function run(mode: "preview" | "apply") {
    if (!secret || !ngoId) return;
    setBusy(true); setError(null); setProgress(null);
    try {
      for (;;) {
        const res = await fetch("/api/admin/imports/enrich", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ ngoId, mode }) });
        const data = await read(res); if (!res.ok) throw new Error(data.error ?? "Could not enrich workbook history.");
        if (data.preview) setPreview(data.preview);
        if (mode === "preview") break;
        setProgress(`${data.processedThisRequest ?? 0} processed this pass · ${data.remainingRows ?? 0} rows left`);
        if (data.completed) { setProgress("Enrichment complete. Native cases, care history, follow-ups, statuses and programmes are synced."); break; }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Enrichment paused. Progress already written is idempotent and safe to resume."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-5xl px-5 py-10"><div className="mb-8"><span className="text-xs font-semibold uppercase tracking-[0.18em] text-paw-600">Admin · historical data</span><h1 className="mt-2 text-3xl font-semibold tracking-tight text-bark-900">Turn stored workbook history into product data</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-bark-500">Read-only preview first. Apply is chunked and idempotent: it adds missing rescue cases and dated care/follow-up events, corrects false vaccination labels, restores historical timestamps/statuses, and publishes programme summaries without re-importing or deleting the completed workbook.</p></div>
    <section className="card p-5"><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Admin key" className="h-11 rounded-md border border-black/10 bg-white px-3 text-sm"/><button onClick={() => void loadOrgs()} disabled={!secret || busy} className="btn-secondary min-h-11 px-4">Load organisations</button></div>{orgs.length > 0 && <div className="mt-4 flex flex-wrap gap-3"><select value={ngoId} onChange={(e) => { setNgoId(e.target.value); setPreview(null); }} className="h-11 min-w-72 rounded-md border border-black/10 bg-white px-3 text-sm">{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}{o.city ? ` · ${o.city}` : ""}</option>)}</select><button onClick={() => void run("preview")} disabled={busy} className="btn-secondary min-h-11 px-4">Preview enrichment</button>{preview && <button onClick={() => void run("apply")} disabled={busy || preview.rowsRemaining === 0} className="btn-primary min-h-11 px-4">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : null}Apply all safely</button>}</div>}{error && <p className="mt-4 text-sm font-medium text-status-injured">{error}</p>}{progress && <p className="mt-4 text-sm font-medium text-paw-700">{progress}</p>}
      {preview && <div className="mt-6"><div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">{[["Source rows",preview.sourceRows],["Animal-linked",preview.animalRows],["Rescue rows",preview.rescueRows],["Missing cases",preview.missingRescueCases],["Care events to add",preview.missingMedicalEvents],["Follow-up events to add",preview.missingHistoricalFollowupEvents],["Wrong vaccine labels",preview.falsePositiveVaccinations],["Rows to enrich",preview.rowsRemaining]].map(([label,value]) => <div key={String(label)}><b className="block text-2xl text-bark-900">{Number(value).toLocaleString()}</b><span className="text-xs text-bark-500">{label}</span></div>)}</div><div className="mt-6 border-t border-black/[.08] pt-4"><h2 className="font-semibold text-bark-900">Programmes recovered from the ledger</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{preview.programmes.map((p) => <div key={p.name} className="rounded-lg border border-black/[.08] p-3"><b>{p.name} · {p.count.toLocaleString()}</b><p className="mt-1 text-xs leading-relaxed text-bark-500">{p.publicSummary}</p></div>)}</div></div></div>}
    </section>
  </main>;
}
