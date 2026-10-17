"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Reports & proof (decisions 024, 029, 034).

   Evidence on demand, for a municipality, a funder or the board. The
   member composes the scope as one sentence (what work, which drive,
   which period, where), then takes the documents the existing export
   services build from the organisation's own records. Every document
   is generated server-side under the member's token, and each says what
   it counts and what it does not claim.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Images, Printer, Table2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { orgCampaigns, type CampaignStats } from "@/lib/campaigns";
import { orgZones } from "@/lib/programme";
import { useMembership } from "../shell/Shell";
import { Ack } from "../ui";
import { NgoGate } from "./Gate";
import "./ngo.css";

type Out = { key: string; icon: typeof FileText; name: string; unit: string; not: string; fmt: string; open?: boolean; endpoint: string; q: Record<string, string>; file?: string };

export function Proof() {
  const mem = useMembership();
  const yr = new Date().getFullYear();
  const [drives, setDrives] = useState<CampaignStats[]>([]);
  const [zones, setZones] = useState<{ zone: string; n: number }[]>([]);
  const [scope, setScope] = useState("");
  const [year, setYear] = useState(String(yr));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [where, setWhere] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  useEffect(() => { if (!mem.member) return; orgCampaigns(true).then(setDrives).catch(() => {}); orgZones().then(setZones).catch(() => {}); }, [mem.member]);

  const base = useMemo(() => {
    const p: Record<string, string> = { scopeType: scope ? "campaign" : "all" };
    if (scope) p.scopeId = scope;
    if (year === "custom") { if (from) p.from = from; if (to) p.to = to; } else if (year !== "all") p.year = year;
    if (cat !== "all") p.category = cat;
    if (status !== "all") p.status = status;
    if (where) p.locality = where;
    return p;
  }, [scope, year, from, to, cat, status, where]);
  const day = new Date().toISOString().slice(0, 10);
  const OUT: Out[] = [
    { key: "read", icon: Printer, name: "Report to read or print", unit: "Headline figures, outcomes and the case list", not: "Not a population estimate", fmt: "Opens in a tab", open: true, endpoint: "/api/partner/export", q: { type: "report", format: "html" } },
    { key: "gov", icon: FileText, name: "Government submission", unit: "Cases, care and drives in the scope, with method notes", not: "Not certified by a vet or the municipality", fmt: "PDF", endpoint: "/api/partner/government-report", q: { type: "report" }, file: `straypaw-government-report-${day}.pdf` },
    { key: "wb", icon: FileSpreadsheet, name: "Full evidence workbook", unit: "Every row: summary, cases, animals, care", not: "Unknown stays blank, never zero", fmt: "Excel", endpoint: "/api/partner/evidence-workbook", q: { type: "report" }, file: `straypaw-evidence-workbook-${day}.xlsx` },
    { key: "cases", icon: Table2, name: "Cases", unit: "One row per request", not: "", fmt: "CSV", endpoint: "/api/partner/export", q: { type: "report", format: "csv", sheet: "Cases" }, file: `straypaw-cases-${day}.csv` },
    { key: "animals", icon: Table2, name: "Animals", unit: "One row per animal profile", not: "Profiles, not unique animals in the area", fmt: "CSV", endpoint: "/api/partner/export", q: { type: "report", format: "csv", sheet: "Animals" }, file: `straypaw-animals-${day}.csv` },
    { key: "care", icon: Table2, name: "Care history", unit: "One row per care event", not: "Recorded by the organisation, not clinician-signed", fmt: "CSV", endpoint: "/api/partner/export", q: { type: "report", format: "csv", sheet: "Care history" }, file: `straypaw-care-${day}.csv` },
    { key: "story", icon: Images, name: "Animal story pack", unit: "Print-ready histories of individual animals", not: "Choose animals whose photos you may share", fmt: "Opens in a tab", open: true, endpoint: "/api/partner/story-pack", q: { type: "story" } },
  ];

  const take = async (o: Out) => {
    setBusy(o.key); setMsg(null);
    const win = o.open ? window.open("", "_blank") : null;
    try {
      const supa = getSupabase(); const token = supa ? (await supa.auth.getSession()).data.session?.access_token : null;
      if (!token) throw new Error("Sign in again with your organisation.");
      const qs = new URLSearchParams({ ...base, ...o.q });
      if (o.key === "story") { qs.delete("category"); qs.delete("status"); }
      const res = await fetch(`${o.endpoint}?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(res.status === 401 ? "Organisation access required." : "This document could not be built.");
      const href = URL.createObjectURL(await res.blob());
      if (o.open) { if (win) win.location.href = href; else window.open(href, "_blank"); }
      else { const a = document.createElement("a"); a.href = href; a.download = o.file!; a.click(); }
      window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
      setMsg({ ok: true, t: `${o.name} ${o.open ? "opened" : "downloaded"}.` });
    } catch (e) { win?.close(); setMsg({ ok: false, t: e instanceof Error ? e.message : "Not built." }); }
    finally { setBusy(null); }
  };

  const driveName = drives.find((d) => d.id === scope)?.name;
  return (
    <NgoGate title="Reports & proof" lede="Documents built from your own records, for a municipality, a funder or your board.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">{mem.org?.name ?? "Your organisation"} · evidence</p><h1 className="serif">Reports &amp; proof</h1></div>
          <p className="ngo-sum">Built on demand from your records, under your sign-in. Nothing here is sent anywhere; you decide who receives it.</p>
        </header>
        <section className="pf-scope" aria-label="Scope">
          <p className="pf-sentence serif">
            {cat === "all" ? "All work" : cat === "rescue" ? "Rescue and intake" : cat === "treatment" ? "Treatment" : cat === "vaccination" ? "Rabies vaccination" : "Sterilisation"}
            {driveName ? <> in <em>{driveName}</em></> : null}, {status === "open" ? "still open" : status === "completed" ? "closed" : "open and closed"}, {year === "all" ? "for all time" : year === "custom" ? <>from {from || "the start"} to {to || "today"}</> : <>in {year}</>}{where ? <>, in <em>{where}</em></> : <>, everywhere you work</>}.
          </p>
          <div className="pf-controls">
            <label className="field"><span className="label">Work</span><select className="select" value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All work</option><option value="rescue">Rescue and intake</option><option value="treatment">Treatment</option><option value="vaccination">Rabies vaccination</option><option value="sterilisation">Sterilisation (ABC)</option></select></label>
            <label className="field"><span className="label">Drive</span><select className="select" value={scope} onChange={(e) => setScope(e.target.value)}><option value="">Every drive</option>{drives.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
            <label className="field"><span className="label">Status</span><select className="select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Open and closed</option><option value="open">Open only</option><option value="completed">Closed only</option></select></label>
            <label className="field"><span className="label">Period</span><select className="select" value={year} onChange={(e) => setYear(e.target.value)}><option value="all">All time</option>{[yr, yr - 1, yr - 2].map((y) => <option key={y} value={String(y)}>{y}</option>)}<option value="custom">Choose dates…</option></select></label>
            {year === "custom" && <><label className="field"><span className="label">From</span><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="field"><span className="label">To</span><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></label></>}
            <label className="field"><span className="label">Locality</span><select className="select" value={where} onChange={(e) => setWhere(e.target.value)}><option value="">Everywhere</option>{zones.slice(0, 300).map((z) => <option key={z.zone} value={z.zone}>{z.zone}</option>)}</select></label>
          </div>
        </section>
        <div aria-live="polite" className="tm-receipt">{busy ? <Ack state="pending">Building the document…</Ack> : msg ? <Ack state={msg.ok ? "saved" : "failed"}>{msg.t}</Ack> : null}</div>
        <ol className="pf-shelf">
          {OUT.map((o) => (
            <li key={o.key} className="pf-doc">
              <span className="pf-spine" aria-hidden><o.icon size={18} /></span>
              <div className="pf-what"><b>{o.name}</b><small>{o.unit}</small>{o.not && <small className="pf-not">{o.not}</small>}</div>
              <span className="mono small">{o.fmt}</span>
              <button type="button" className="btn is-s" disabled={!!busy} onClick={() => void take(o)}>{busy === o.key ? "Building…" : o.open ? "Open" : <><Download size={14} aria-hidden /> Download</>}</button>
            </li>
          ))}
        </ol>
        <p className="small ngo-foot">Method notes travel inside each document: the unit counted, where locations are approximate, and which statuses come from imported registers. Figures with no recorded value are reported as not recorded, never as zero.</p>
      </div>
    </NgoGate>
  );
}
