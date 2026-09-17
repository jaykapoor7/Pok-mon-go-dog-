"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Org = { id: string; name: string; city: string | null; verified: boolean };
type Preview = { sourceRows: number; animalRows: number; rescueRows: number; missingRescueCases: number; derivedMedicalEvents: number; missingMedicalEvents: number; historicalFollowupEvents: number; missingHistoricalFollowupEvents: number; falsePositiveVaccinations: number; rowsRemaining: number; programmes: Array<{ name: string; count: number; publicSummary: string }> };

async function read(res: Response) { const text = await res.text(); try { return text ? JSON.parse(text) : {}; } catch { return { error: `Unreadable server response (${res.status}).` }; } }

export function WorkbookEnrichment({ secret }: { secret: string }) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [ngoId, setNgoId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!secret) return;
    let active = true;
    setBusy(true);
    setError(null);
    fetch("/api/admin/orgs", { headers: { Authorization: `Bearer ${secret}` } })
      .then(read)
      .then((data) => {
        if (!active) return;
        const list = (data.orgs ?? []) as Org[];
        setOrgs(list);
        setNgoId((current) => current || list.find((o) => /pawsome/i.test(o.name))?.id || list[0]?.id || "");
      })
      .catch(() => { if (active) setError("Could not load organisations."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [secret]);

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

  return <section className="card p-5 sm:p-6"><div><span className="text-xs font-semibold uppercase tracking-[0.18em] text-paw-600">Moderation · historical data</span><h2 className="mt-2 text-2xl font-semibold tracking-tight text-bark-900">Workbook enrichment</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-bark-500">Turn already-imported workbook history into complete cases, care events, follow-ups, statuses and programme summaries. Preview is read-only; apply is chunked and idempotent.</p></div>
    {orgs.length > 0 && <div className="mt-5 flex flex-wrap gap-3"><select value={ngoId} onChange={(e) => { setNgoId(e.target.value); setPreview(null); setProgress(null); }} className="h-11 min-w-72 rounded-md border border-black/10 bg-white px-3 text-sm"><option value="">Choose organisation</option>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}{o.city ? ` · ${o.city}` : ""}</option>)}</select><button onClick={() => void run("preview")} disabled={busy || !ngoId} className="btn-secondary min-h-11 px-4">{busy && !preview ? <Loader2 className="h-4 w-4 animate-spin"/> : null}Preview enrichment</button>{preview && <button onClick={() => void run("apply")} disabled={busy || preview.rowsRemaining === 0} className="btn-primary min-h-11 px-4">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : null}{preview.rowsRemaining === 0 ? "Already enriched" : "Apply all safely"}</button>}</div>}
    {error && <p className="mt-4 text-sm font-medium text-status-injured">{error}</p>}{progress && <p className="mt-4 text-sm font-medium text-paw-700">{progress}</p>}
    {preview && <div className="mt-6"><div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">{[["Source rows",preview.sourceRows],["Animal-linked",preview.animalRows],["Rescue rows",preview.rescueRows],["Missing cases",preview.missingRescueCases],["Care events to add",preview.missingMedicalEvents],["Follow-up events to add",preview.missingHistoricalFollowupEvents],["Wrong vaccine labels",preview.falsePositiveVaccinations],["Rows to enrich",preview.rowsRemaining]].map(([label,value]) => <div key={String(label)}><b className="block text-2xl text-bark-900">{Number(value).toLocaleString()}</b><span className="text-xs text-bark-500">{label}</span></div>)}</div><div className="mt-6 border-t border-black/[.08] pt-4"><h3 className="font-semibold text-bark-900">Programmes recovered from the ledger</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{preview.programmes.map((p) => <div key={p.name} className="rounded-lg border border-black/[.08] p-3"><b>{p.name} · {p.count.toLocaleString()}</b><p className="mt-1 text-xs leading-relaxed text-bark-500">{p.publicSummary}</p></div>)}</div></div></div>}
  </section>;
}
