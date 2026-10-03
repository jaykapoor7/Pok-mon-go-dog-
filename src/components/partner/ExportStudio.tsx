"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Images, Loader2, Printer, Table2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { orgCampaigns, type CampaignStats } from "@/lib/campaigns";
import { getSurveys } from "@/lib/surveys";
import type { Survey } from "@/lib/types";
import { orgZones } from "@/lib/programme";
import { SearchSelect } from "@/components/app/SearchSelect";
import "./export.css";

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
  const [zones, setZones] = useState<{ zone: string; n: number }[]>([]);

  useEffect(() => {
    Promise.all([orgCampaigns(true), getSurveys()]).then(([driveRows, surveyRows]) => {
      setCampaigns(driveRows);
      setSurveys(surveyRows);
    }).catch(() => {});
    orgZones().then(setZones).catch(() => {});
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

  function params(type: ExportType = "report", format?: "xlsx" | "html" | "csv", sheet?: string) {
    const initial: Record<string,string> = { type, scopeType: scopeInfo.type };
    if (format) initial.format = format;
    if (sheet) initial.sheet = sheet;
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

  const day = new Date().toISOString().slice(0, 10);
  const OUTPUTS: { key: string; icon: typeof FileText; name: string; what: string; fmt: string; run: () => void; survey?: boolean }[] = [
    { key: "preview", icon: Printer, name: "Report to read or print", what: "Headline figures, outcomes and the case list on one page. Print it or save it as PDF from the browser.", fmt: "Opens in a tab", run: () => void openBlob("/api/partner/export", params("report", "html"), "preview"), survey: true },
    { key: "government-pdf", icon: FileText, name: "Government PDF", what: "A formal report for a municipality or animal-welfare board submission.", fmt: "PDF", run: () => void downloadBlob("/api/partner/government-report", params("report"), `straypaw-government-report-${day}.pdf`, "government-pdf"), survey: true },
    { key: "evidence", icon: FileSpreadsheet, name: "Full workbook", what: "Every row: a summary sheet, then cases, animals and care history, each on its own sheet.", fmt: "Excel", run: () => void downloadBlob("/api/partner/evidence-workbook", params("report"), `straypaw-evidence-workbook-${day}.xlsx`, "evidence"), survey: true },
    { key: "csv-cases", icon: Table2, name: "Cases", what: "One row per rescue case: condition, place, status, dates, outcome.", fmt: "CSV", run: () => void downloadBlob("/api/partner/export", params("report", "csv", "Cases"), `straypaw-cases-${day}.csv`, "csv-cases") },
    { key: "csv-animals", icon: Table2, name: "Animals", what: "One row per animal: StrayPaw ID, name, place, sterilisation and vaccination.", fmt: "CSV", run: () => void downloadBlob("/api/partner/export", params("report", "csv", "Animals"), `straypaw-animals-${day}.csv`, "csv-animals") },
    { key: "csv-care", icon: Table2, name: "Care history", what: "One row per treatment, sterilisation or vaccination given.", fmt: "CSV", run: () => void downloadBlob("/api/partner/export", params("report", "csv", "Care history"), `straypaw-care-${day}.csv`, "csv-care") },
    { key: "story", icon: Images, name: "Animal story pack", what: "Print-ready histories of individual animals with photos, IDs, care and outcome, for funders.", fmt: "Opens in a tab", run: () => void openBlob("/api/partner/story-pack", params("story"), "story") },
  ];
  const outputs = OUTPUTS.filter((o) => !scopeInfo.survey || o.survey);

  return <section className="xs" aria-labelledby="report-builder-title">
    <div className="xs-step">
      <p className="xs-n sys-mono">1</p>
      <div className="xs-body">
        <h3 id="report-builder-title">Choose what goes in</h3>
        <p className="xs-lede">Every file below uses these choices.</p>
        <div className="xs-grid">
          <label className="xs-f"><span>Project or drive</span><select value={scope} onChange={(e)=>setScope(e.target.value)}><option value="all">All your organisation&apos;s work</option>{campaigns.length>0&&<optgroup label="Drives and programmes">{campaigns.map(c=><option key={c.id} value={`campaign:${c.id}`}>{c.name}</option>)}</optgroup>}{surveys.length>0&&<optgroup label="Projects and surveys">{surveys.map(s=><option key={s.id} value={`survey:${s.id}`}>{s.title}</option>)}</optgroup>}</select></label>
          <label className="xs-f"><span>Period</span><select value={year} onChange={(e)=>setYear(e.target.value)}><option value="all">All time</option><option value={String(currentYear)}>{currentYear}</option><option value={String(currentYear-1)}>{currentYear-1}</option><option value={String(currentYear-2)}>{currentYear-2}</option><option value="custom">Choose dates…</option></select></label>
          {!scopeInfo.survey&&<label className="xs-f"><span>Kind of work</span><select value={category} onChange={(e)=>setCategory(e.target.value)}><option value="all">All work</option><option value="rescue">Rescue and intake</option><option value="treatment">Treatment</option><option value="vaccination">Rabies vaccination</option><option value="sterilisation">Sterilisation (ABC)</option></select></label>}
          {!scopeInfo.survey&&<label className="xs-f"><span>Case status</span><select value={status} onChange={(e)=>setStatus(e.target.value)}><option value="all">Open and closed</option><option value="open">Open only</option><option value="completed">Closed only</option></select></label>}
          {year==="custom"&&<label className="xs-f"><span>From</span><input type="date" value={from} onChange={(e)=>setFrom(e.target.value)}/></label>}
          {year==="custom"&&<label className="xs-f"><span>To</span><input type="date" value={to} onChange={(e)=>setTo(e.target.value)}/></label>}
          {!scopeInfo.survey&&<div className="xs-f is-wide"><span>Location</span><SearchSelect icon="place" label="Location" allLabel="Every location" placeholder="Every location" options={zones.map((z)=>({ value: z.zone, hint: `${z.n.toLocaleString("en-IN")} animal${z.n===1?"":"s"}` }))} value={locality} onChange={setLocality} /></div>}
        </div>
      </div>
    </div>

    <div className="xs-step">
      <p className="xs-n sys-mono">2</p>
      <div className="xs-body">
        <h3>Get it as</h3>
        <p className="xs-lede">Reporter phone numbers and other private contact fields are never included.</p>
        <ul className="xs-outs">
          {outputs.map((o) => (
            <li key={o.key}>
              <button type="button" onClick={o.run} disabled={!!busy} aria-busy={busy===o.key}>
                <o.icon size={18} aria-hidden className="xs-ico" />
                <span className="xs-what"><b>{o.name}</b><small>{o.what}</small></span>
                <span className="xs-fmt sys-mono">{busy===o.key ? <Loader2 size={14} className="xs-spin" aria-hidden /> : <Download size={14} aria-hidden />}{o.fmt}</span>
              </button>
            </li>
          ))}
        </ul>
        {error&&<p role="alert" className="xs-err">{error}</p>}
      </div>
    </div>
  </section>;
}
