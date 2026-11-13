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
import { Head, Page, Panel, Table, Tools, type Col } from "@/ws/kit";
import { Ack } from "../ui";
import "../abc/parts.k.css";
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
    if (busy) return;
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
  const cols: Col<Out>[] = [
    { key: "doc", label: "Document", width: "minmax(0, 1.2fr)", render: (o) => <span className="kx-cell"><o.icon size={14} aria-hidden /><span>{o.name}<small className="kx-sub">{o.unit}</small></span></span> },
    { key: "unit", label: "What it holds", width: "minmax(0, 1.4fr)", render: (o) => o.unit },
    { key: "not", label: "Keep in mind", width: "minmax(0, 1.4fr)", render: (o) => o.not },
    { key: "fmt", label: "Format", width: "112px", render: (o) => o.fmt },
    { key: "go", label: "", width: "104px", keep: true, align: "end", render: (o) => <span className="kx-link">{busy === o.key ? "Building…" : o.open ? "Open" : <><Download size={12} aria-hidden /> Download</>}</span> },
  ];
  return (
    <NgoGate title="Reports & proof" lede="Documents built from your own records, for a municipality, a funder or your board.">
      <Page>
        <Head title="Reports" sum={<>
          {cat === "all" ? "All work" : cat === "rescue" ? "Rescue and intake" : cat === "treatment" ? "Treatment" : cat === "vaccination" ? "Rabies vaccination" : "Sterilisation"}
          {driveName ? <> in <b>{driveName}</b></> : null}, {status === "open" ? "still open" : status === "completed" ? "closed" : "open and closed"}, {year === "all" ? "for all time" : year === "custom" ? <>from {from || "the start"} to {to || "today"}</> : <>in {year}</>}{where ? <>, in <b>{where}</b></> : <>, everywhere you work</>}. Each document is built from your own records.
        </>} />
        <Tools>
          <select className="kx-in is-auto" aria-label="Work" value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All work</option><option value="rescue">Rescue and intake</option><option value="treatment">Treatment</option><option value="vaccination">Rabies vaccination</option><option value="sterilisation">Sterilisation (ABC)</option></select>
          <select className="kx-in is-auto" aria-label="Drive" value={scope} onChange={(e) => setScope(e.target.value)}><option value="">Every drive</option>{drives.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <select className="kx-in is-auto" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Open and closed</option><option value="open">Open only</option><option value="completed">Closed only</option></select>
          <select className="kx-in is-auto" aria-label="Period" value={year} onChange={(e) => setYear(e.target.value)}><option value="all">All time</option>{[yr, yr - 1, yr - 2].map((y) => <option key={y} value={String(y)}>{y}</option>)}<option value="custom">Choose dates…</option></select>
          {year === "custom" && <><input type="date" className="kx-in is-auto" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} /><input type="date" className="kx-in is-auto" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} /></>}
          <select className="kx-in is-auto" aria-label="Locality" value={where} onChange={(e) => setWhere(e.target.value)}><option value="">Everywhere</option>{zones.slice(0, 300).map((z) => <option key={z.zone} value={z.zone}>{z.zone}</option>)}</select>
        </Tools>
        <div aria-live="polite" className="kx-live">{busy ? <Ack state="pending">Building the document…</Ack> : msg ? <Ack state={msg.ok ? "saved" : "failed"}>{msg.t}</Ack> : null}</div>
        <Panel><Table cols={cols} rows={OUT} rowKey={(o) => o.key} onRow={(o) => void take(o)} label="Documents you can take" /></Panel>
      </Page>
    </NgoGate>
  );
}
