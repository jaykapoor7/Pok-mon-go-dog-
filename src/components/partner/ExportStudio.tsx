"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Images, Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { orgCampaigns, type CampaignStats } from "@/lib/campaigns";
import { getSurveys } from "@/lib/surveys";
import type { Survey } from "@/lib/types";

type ExportType = "report" | "story";

export function ExportStudio() {
  const currentYear = new Date().getFullYear();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignStats[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [scope, setScope] = useState("all");
  const [year, setYear] = useState(String(currentYear));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [locality, setLocality] = useState("");

  useEffect(() => {
    Promise.all([orgCampaigns(true), getSurveys()]).then(([driveRows, surveyRows]) => {
      setCampaigns(driveRows);
      setSurveys(surveyRows);
    }).catch(() => {});
  }, []);

  const scopeInfo = useMemo(() => {
    if (scope.startsWith("campaign:")) return { type: "campaign", id: scope.slice(9), survey: false };
    if (scope.startsWith("survey:")) return { type: "survey", id: scope.slice(7), survey: true };
    return { type: "all", id: "", survey: false };
  }, [scope]);

  async function authToken() {
    const supa = getSupabase();
    return supa ? (await supa.auth.getSession()).data.session?.access_token ?? null : null;
  }

  function params(type: ExportType = "report", format?: "xlsx" | "html") {
    const initial: Record<string,string> = { type, scopeType: scopeInfo.type };
    if (format) initial.format = format;
    const p = new URLSearchParams(initial);
    if (scopeInfo.id) p.set("scopeId", scopeInfo.id);
    if (year === "custom") {
      if (from) p.set("from", from);
      if (to) p.set("to", to);
    } else if (year !== "all") p.set("year", year);
    if (!scopeInfo.survey) {
      if (category !== "all") p.set("category", category);
      if (status !== "all") p.set("status", status);
      if (locality.trim()) p.set("locality", locality.trim());
    }
    return p;
  }

  async function fetchBlob(endpoint:string, query:URLSearchParams) {
    const token = await authToken();
    const res = await fetch(`${endpoint}?${query.toString()}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    if (!res.ok) throw new Error(res.status === 401 ? "Organisation access required." : "Could not generate this output.");
    return res.blob();
  }

  async function openBlob(endpoint:string, query:URLSearchParams, key:string) {
    setBusy(key); setError(null);
    const win = window.open("", "_blank");
    try {
      const blob = await fetchBlob(endpoint, query);
      const href = URL.createObjectURL(blob);
      if (win) win.location.href = href;
      else { const a=document.createElement("a");a.href=href;a.target="_blank";a.click(); }
      window.setTimeout(()=>URL.revokeObjectURL(href),60000);
    } catch(e) { if(win)win.close();setError(e instanceof Error?e.message:"Could not open output."); }
    finally { setBusy(null); }
  }

  async function downloadBlob(endpoint:string, query:URLSearchParams, filename:string, key:string) {
    setBusy(key);setError(null);
    try { const blob=await fetchBlob(endpoint,query);const href=URL.createObjectURL(blob);const a=document.createElement("a");a.href=href;a.download=filename;a.click();URL.revokeObjectURL(href); }
    catch(e){setError(e instanceof Error?e.message:"Export failed.");}
    finally{setBusy(null);}
  }

  return <section className="mb-8 rounded-xl border border-black/[.08] bg-white p-5" aria-labelledby="report-builder-title">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div><span className="product-kicker">Report builder</span><h2 id="report-builder-title" className="mt-1 text-xl font-semibold">Turn field records into evidence</h2><p className="mt-1 max-w-3xl text-sm text-bark-500">Set the scope once. The preview, government PDF, evidence workbook and animal story pack all use the same project, period and locality filters.</p></div>
    </div>

    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-semibold">Project / drive<select value={scope} onChange={(e)=>setScope(e.target.value)} className="mt-1.5 w-full rounded-lg border border-black/[.1] bg-white px-3 py-2.5 text-sm font-normal"><option value="all">All organisation work</option>{campaigns.length>0&&<optgroup label="Drives & programmes">{campaigns.map(c=><option key={c.id} value={`campaign:${c.id}`}>{c.name}</option>)}</optgroup>}{surveys.length>0&&<optgroup label="Projects & surveys">{surveys.map(s=><option key={s.id} value={`survey:${s.id}`}>{s.title}</option>)}</optgroup>}</select></label>
      <label className="text-xs font-semibold">Period<select value={year} onChange={(e)=>setYear(e.target.value)} className="mt-1.5 w-full rounded-lg border border-black/[.1] bg-white px-3 py-2.5 text-sm font-normal"><option value="all">All time</option><option value={String(currentYear)}>{currentYear}</option><option value={String(currentYear-1)}>{currentYear-1}</option><option value={String(currentYear-2)}>{currentYear-2}</option><option value="custom">Custom dates</option></select></label>
      {!scopeInfo.survey&&<label className="text-xs font-semibold">Work type<select value={category} onChange={(e)=>setCategory(e.target.value)} className="mt-1.5 w-full rounded-lg border border-black/[.1] bg-white px-3 py-2.5 text-sm font-normal"><option value="all">All work</option><option value="rescue">Rescue / intake</option><option value="treatment">Treatment / medical</option><option value="vaccination">Rabies / vaccination</option><option value="sterilisation">ABC / sterilisation</option></select></label>}
      {!scopeInfo.survey&&<label className="text-xs font-semibold">Case status<select value={status} onChange={(e)=>setStatus(e.target.value)} className="mt-1.5 w-full rounded-lg border border-black/[.1] bg-white px-3 py-2.5 text-sm font-normal"><option value="all">All statuses</option><option value="open">Open</option><option value="completed">Completed / resolved</option></select></label>}
    </div>

    {year==="custom"&&<div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">From<input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="mt-1.5 w-full rounded-lg border border-black/[.1] px-3 py-2.5 text-sm font-normal"/></label><label className="text-xs font-semibold">To<input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="mt-1.5 w-full rounded-lg border border-black/[.1] px-3 py-2.5 text-sm font-normal"/></label></div>}
    {!scopeInfo.survey&&<label className="mt-3 block max-w-md text-xs font-semibold">Locality <span className="font-normal text-bark-400">optional</span><input value={locality} onChange={(e)=>setLocality(e.target.value)} placeholder="e.g. Ludhiana, Chiloo, Ward 12" className="mt-1.5 w-full rounded-lg border border-black/[.1] px-3 py-2.5 text-sm font-normal"/></label>}

    <div className="mt-5 flex flex-wrap gap-2 border-t border-black/[.07] pt-5">
      <button onClick={()=>void openBlob("/api/partner/export",params("report","html"),"preview")} disabled={!!busy} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0b1e3d] px-4 py-2 text-sm font-semibold text-white">{busy==="preview"?<Loader2 className="h-4 w-4 animate-spin"/>:<FileText className="h-4 w-4"/>}Preview report</button>
      <button onClick={()=>void downloadBlob("/api/partner/government-report",params("report"),"straypaw-government-report.pdf","government-pdf")} disabled={!!busy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-black/[.1] bg-white px-4 py-2 text-sm font-semibold">{busy==="government-pdf"?<Loader2 className="h-4 w-4 animate-spin"/>:<Download className="h-4 w-4"/>}Government PDF</button>
      <button onClick={()=>void downloadBlob("/api/partner/export",params("report","xlsx"),"straypaw-evidence-workbook.xlsx","evidence")} disabled={!!busy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-black/[.1] bg-white px-4 py-2 text-sm font-semibold">{busy==="evidence"?<Loader2 className="h-4 w-4 animate-spin"/>:<Download className="h-4 w-4"/>}Evidence workbook</button>
      {!scopeInfo.survey&&<button onClick={()=>void openBlob("/api/partner/story-pack",params("story"),"story")} disabled={!!busy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-black/[.1] bg-white px-4 py-2 text-sm font-semibold">{busy==="story"?<Loader2 className="h-4 w-4 animate-spin"/>:<Images className="h-4 w-4"/>}Animal story pack</button>}
    </div>
    <p className="mt-3 text-xs leading-5 text-bark-500">Government PDF is a real downloadable PDF for submissions. Evidence workbook keeps the complete row-level register. Story pack is a visual, print-ready set of traceable animal histories with photos, IDs, care and outcomes. Private reporter contact fields stay excluded.</p>
    {error&&<p role="alert" className="mt-3 text-xs font-semibold text-status-injured">{error}</p>}
  </section>;
}
