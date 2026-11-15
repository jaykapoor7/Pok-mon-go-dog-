"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { orgCampaigns, type CampaignStats } from "@/lib/campaigns";
import { useRead } from "@/oh/data";
import { read, saveBlob } from "../../../data/ngo-setup";
import { buildExport, readZonesList } from "../../../data/ngo-submissions";
import { toast, useAct } from "../../../kit";
import { Grid, Tools, TryLink, type GCol, type Who } from "../parts";
import { S_DRIVES } from "../sample";

/* Exports: documents built on the server from the organisation's own records, under the person's own session, for a
   municipality, a funder or the board (the /api/partner/* routes with the same filters as classic). Each says what
   it counts and what it does not claim. */

type Out = { key: string; name: string; unit: string; not: string; fmt: string; open?: boolean; endpoint: string; q: Record<string, string>; file?: string };
const day = () => new Date().toISOString().slice(0, 10);
const OUT = (): Out[] => [
  { key: "read", name: "Report to read or print", unit: "Headline figures, outcomes and the case list", not: "Not a population estimate", fmt: "Opens in a tab", open: true, endpoint: "/api/partner/export", q: { type: "report", format: "html" } },
  { key: "gov", name: "Government submission", unit: "Cases, care and drives in the scope, with method notes", not: "Not certified by a vet or the municipality", fmt: "PDF", endpoint: "/api/partner/government-report", q: { type: "report" }, file: `straypaw-government-report-${day()}.pdf` },
  { key: "wb", name: "Full evidence workbook", unit: "Every row: summary, cases, animals, care", not: "Unknown stays blank, never zero", fmt: "Excel", endpoint: "/api/partner/evidence-workbook", q: { type: "report" }, file: `straypaw-evidence-workbook-${day()}.xlsx` },
  { key: "cases", name: "Cases", unit: "One row per request", not: "", fmt: "CSV", endpoint: "/api/partner/export", q: { type: "report", format: "csv", sheet: "Cases" }, file: `straypaw-cases-${day()}.csv` },
  { key: "animals", name: "Animals", unit: "One row per animal profile", not: "Profiles, not unique animals in the area", fmt: "CSV", endpoint: "/api/partner/export", q: { type: "report", format: "csv", sheet: "Animals" }, file: `straypaw-animals-${day()}.csv` },
  { key: "care", name: "Care history", unit: "One row per care event", not: "Recorded by the organisation, not clinician-signed", fmt: "CSV", endpoint: "/api/partner/export", q: { type: "report", format: "csv", sheet: "Care history" }, file: `straypaw-care-${day()}.csv` },
  { key: "story", name: "Animal story pack", unit: "Print-ready histories of individual animals", not: "Choose animals whose photos you may share", fmt: "Opens in a tab", open: true, endpoint: "/api/partner/story-pack", q: { type: "story" } },
];
const WORK: Record<string, string> = { all: "All work", rescue: "Rescue and intake", treatment: "Treatment", vaccination: "Rabies vaccination", sterilisation: "Sterilisation (ABC)" };

export function ExportsTab({ who }: { who: Who }) {
  const live = !who.sample && !!who.ngo;
  const drives = useRead<CampaignStats[]>(() => read(() => orgCampaigns(true)), "ns:drives:all", live);
  const zones = useRead<{ zone: string; n: number }[]>(() => read(readZonesList), "ns:zones", live);
  const { busy, run } = useAct();
  const yr = new Date().getFullYear();
  const [f, setF] = useState({ scope: "", year: String(yr), from: "", to: "", cat: "all", status: "all", where: "" });
  const base = useMemo(() => {
    const p: Record<string, string> = { scopeType: f.scope ? "campaign" : "all" };
    if (f.scope) p.scopeId = f.scope;
    if (f.year === "custom") { if (f.from) p.from = f.from; if (f.to) p.to = f.to; } else if (f.year !== "all") p.year = f.year;
    if (f.cat !== "all") p.category = f.cat;
    if (f.status !== "all") p.status = f.status;
    if (f.where) p.locality = f.where;
    return p;
  }, [f]);
  const driveList = who.sample ? S_DRIVES : drives.data ?? [];
  const take = (o: Out) => {
    /* A tab opened inside the click, so phones do not block it; it is pointed at the document once built. */
    const win = o.open ? window.open("", "_blank") : null;
    const qs = new URLSearchParams({ ...base, ...o.q });
    if (o.key === "story") { qs.delete("category"); qs.delete("status"); }
    void run(o.key, async () => {
      const blob = await buildExport(o.endpoint, qs);
      if (o.open) { const href = URL.createObjectURL(blob); if (win) win.location.href = href; else window.open(href, "_blank"); window.setTimeout(() => URL.revokeObjectURL(href), 60_000); }
      else saveBlob(blob, o.file!);
    }, { quiet: true }).then((x) => { if (x.ok) toast({ text: `${o.name} ${o.open ? "opened" : "downloaded"}.`, tone: "ok" }); else win?.close(); });
  };
  const driveName = driveList.find((d) => d.id === f.scope)?.name;
  const cols: GCol<Out>[] = [
    { label: "Document", width: "minmax(0, 1.3fr)", render: (o) => <span className="nx-cell-main"><span><b>{o.name}</b><small>{o.unit}</small></span></span> },
    { label: "Keep in mind", width: "minmax(0, 1.2fr)", render: (o) => <span className="nx-t2 ns-cell">{o.not || "—"}</span> },
    { label: "Format", width: "112px", render: (o) => <span className="nx-t3">{o.fmt}</span> },
    { label: "", width: "128px", keep: true, render: (o) => <span className="ns-row-acts">{who.sample ? <TryLink quiet small>{o.open ? "Open" : "Download"}</TryLink> : <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => take(o)} aria-label={`${o.open ? "Open" : "Download"} ${o.name}`}>{busy === o.key ? "Building…" : o.open ? <><ExternalLink size={12} />Open</> : <><Download size={12} />Download</>}</button>}</span> },
  ];
  return (
    <>
      <Tools>
        <select aria-label="Work" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>{Object.entries(WORK).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select aria-label="Drive" value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })}><option value="">Every drive</option>{driveList.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <select aria-label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="all">Open and closed</option><option value="open">Open only</option><option value="completed">Closed only</option></select>
        <select aria-label="Period" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })}><option value="all">All time</option>{[yr, yr - 1, yr - 2].map((y) => <option key={y} value={String(y)}>{y}</option>)}<option value="custom">Choose dates…</option></select>
        {f.year === "custom" ? <><input type="date" aria-label="From" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /><input type="date" aria-label="To" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></> : null}
        <select aria-label="Locality" value={f.where} onChange={(e) => setF({ ...f, where: e.target.value })}><option value="">Everywhere</option>{(zones.data ?? []).slice(0, 300).map((z) => <option key={z.zone} value={z.zone}>{z.zone}</option>)}</select>
      </Tools>
      <p className="ns-sum" aria-live="polite">{WORK[f.cat]}{driveName ? <> in <b>{driveName}</b></> : null}, {f.status === "open" ? "still open" : f.status === "completed" ? "closed" : "open and closed"}, {f.year === "all" ? "for all time" : f.year === "custom" ? <>from {f.from || "the start"} to {f.to || "today"}</> : <>in {f.year}</>}{f.where ? <>, in <b>{f.where}</b></> : <>, everywhere you work</>}. Each document is built from your own records.</p>
      <Grid label="Documents you can take" cols={cols} rows={OUT()} rowKey={(o) => o.key} />
    </>
  );
}
