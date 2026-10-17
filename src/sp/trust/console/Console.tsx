"use client";

/* ════════════════════════════════════════════════════════════════════
   Trust · the operator console (1.0 /admin, AdminClient).

   One password, checked by the server on every request (the same
   moderation password as /trust). A section index on the left, one
   dense table per section, a record inspector beside it. Every section
   reads its own existing /api/admin route; a failed read says "Not
   read" with the server's words, never an empty table. Writes return
   the server's answer as a receipt.

   Master imports and historical enrichment are the 1.0 tools, framed
   here unchanged until they are redesigned; they use the same routes.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Download, LogOut } from "lucide-react";
import { MasterImport } from "@/components/admin/MasterImport";
import { WorkbookEnrichment } from "@/components/admin/WorkbookEnrichment";
import { Ack, State } from "../../ui";
import { forgetKey, get, parse, rememberKey, savedKey, type Read } from "./api";
import { FeedbackQueue, Partners, Reports, Sightings, Verify } from "./Queues";
import { Dogs, Feeding, Fundraisers } from "./Records";
import { Helpers } from "./People";
import { Orgs } from "./Orgs";
import type { HelpersRead, PartnersRead, SectionId } from "./types";
import "../trust.css";
import "./console.css";

type Def = { id: SectionId; label: string; note: string; path?: string; pick?: (b: Record<string, unknown>) => unknown };
const GROUPS: { label: string; items: Def[] }[] = [
  { label: "Queues", items: [
    { id: "sightings", label: "New sightings", note: "Approve, merge into an animal, or reject", path: "/api/admin/sightings", pick: (b) => b.pending ?? [] },
    { id: "partners", label: "Partner requests", note: "Organisations asking for a workspace", path: "/api/admin/partners", pick: (b) => ({ requests: b.requests ?? [], grants: b.grants ?? [] }) },
    { id: "reports", label: "Content reports", note: "Something reported as wrong or unsafe", path: "/api/admin/reports", pick: (b) => b.reports ?? [] },
    { id: "feedback", label: "Feedback", note: "Notes from people using StrayPaw", path: "/api/admin/feedback", pick: (b) => b.feedback ?? [] },
    { id: "verify", label: "Outcomes to verify", note: "Closed cases with before and after proof", path: "/api/admin/cases", pick: (b) => b.pending ?? [] },
  ] },
  { label: "Records", items: [
    { id: "dogs", label: "Animals", note: "Correct or remove an animal record", path: "/api/admin/dogs", pick: (b) => b.dogs ?? [] },
    { id: "feeding", label: "Feeding spots", note: "Public feeding spots", path: "/api/admin/feeding-zones", pick: (b) => b.zones ?? [] },
    { id: "fundraisers", label: "Fundraisers", note: "Approve, feature or close campaigns", path: "/api/admin/fundraisers", pick: (b) => b.fundraisers ?? [] },
  ] },
  { label: "People", items: [
    { id: "volunteers", label: "Volunteer offers", note: "People offering to help an animal", path: "/api/admin/helpers", pick: (b) => ({ volunteers: b.volunteers ?? [], ngos: b.ngos ?? [] }) },
    { id: "ngos", label: "NGO offers", note: "Organisations offering to help", path: "/api/admin/helpers", pick: (b) => ({ volunteers: b.volunteers ?? [], ngos: b.ngos ?? [] }) },
  ] },
  { label: "Setup", items: [
    { id: "orgs", label: "Organisations", note: "Workspaces, members and codes", path: "/api/admin/orgs", pick: (b) => b.orgs ?? [] },
    { id: "imports", label: "Master imports", note: "Load an organisation's workbook" },
    { id: "enrich", label: "Historical enrichment", note: "Match imported history to records" },
  ] },
];
const ALL = GROUPS.flatMap((g) => g.items);
const count = (r: Read<unknown> | undefined, id: SectionId): number | null => {
  if (!r || r.state !== "read") return null;
  const d = r.data as unknown;
  if (Array.isArray(d)) return d.length;
  if (id === "partners") return (d as PartnersRead).requests.length;
  if (id === "volunteers") return (d as HelpersRead).volunteers.filter((h) => !h.acknowledged).length;
  if (id === "ngos") return (d as HelpersRead).ngos.filter((h) => !h.acknowledged).length;
  return null;
};

export function Console() {
  const [secret, setSecret] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [gateErr, setGateErr] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [sec, setSec] = useState<SectionId>("sightings");
  const [reads, setReads] = useState<Partial<Record<SectionId, Read<unknown>>>>({});
  const [exporting, setExporting] = useState<string | null>(null);

  const readOne = useCallback(async (s: string, d: Def) => {
    if (!d.path || !d.pick) return;
    setReads((r) => ({ ...r, [d.id]: { state: "reading", data: (r[d.id] as { data?: unknown } | undefined)?.data } }));
    const res = await get(s, d.path, d.pick);
    setReads((r) => ({ ...r, [d.id]: res }));
  }, []);

  /* The password is checked by asking the server for the first queue. */
  const open = useCallback(async (s: string) => {
    setOpening(true); setGateErr(null);
    const first = await get(s, "/api/admin/sightings", (b) => b.pending ?? []);
    setOpening(false);
    if (first.state === "failed") { setGateErr(first.status === 401 ? "The server refused that password. Nothing was opened." : first.error); if (first.status === 401) forgetKey(); return; }
    rememberKey(s); setSecret(s);
    setReads({ sightings: first });
    for (const d of ALL) if (d.id !== "sightings") void readOne(s, d);
  }, [readOne]);

  useEffect(() => { const k = savedKey(); if (k) void open(k); }, [open]);

  const exportEmails = async () => {
    if (!secret) return;
    setExporting("Preparing the list…");
    try {
      const res = await fetch("/api/admin/emails", { headers: { Authorization: `Bearer ${secret}` } });
      if (!res.ok) { const b = await parse(res); setExporting(typeof b.error === "string" ? b.error : `Export failed (${res.status}).`); return; }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a"); a.href = url; a.download = `straypaw-reporters-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
      setExporting(null);
    } catch { setExporting("The server could not be reached. Nothing was exported."); }
  };

  if (!secret) return (
    <div className="tr">
      <form className="tr-gate" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) void open(typed.trim()); }}>
        <p className="k">Trust · operator console</p>
        <h1 className="display">The console</h1>
        <p className="body">Queues, records, people and organisation setup, for StrayPaw operators. The password is the moderation password; the server checks it on every read and every action.</p>
        <input className="input" type="password" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Moderation password" aria-label="Moderation password" autoComplete="current-password" />
        <button type="submit" className="btn is-ink" disabled={opening}>{opening ? "Checking…" : "Open the console"}</button>
        {gateErr && <Ack state="failed">{gateErr}</Ack>}
        <Link className="link" href="/trust">Only the review queue</Link>
      </form>
    </div>
  );

  const def = ALL.find((d) => d.id === sec)!;
  const read = reads[sec];
  const reload = async () => { if (secret) await readOne(secret, def); };
  const empty = (t: string): ReactNode => <State title={t}>Nothing is waiting in this section. When something arrives it appears here for a person to decide.</State>;
  const P = { secret, read: read as never, reload };

  return (
    <div className="tr cn">
      <header className="tr-head cn-head">
        <div><p className="k">Trust · operator console</p><h1 className="serif">{def.label}</h1><p className="small">{def.note}</p></div>
        <div className="row" style={{ ["--g" as string]: "8px" }}>
          <Link className="btn is-s" href="/trust">Review queue</Link>
          <button type="button" className="btn is-s" onClick={() => void exportEmails()}><Download size={14} aria-hidden /> Reporter emails (CSV)</button>
          <button type="button" className="btn is-s" onClick={() => { forgetKey(); setSecret(null); setReads({}); }}><LogOut size={14} aria-hidden /> Lock</button>
        </div>
        {exporting && <p className="small cn-export" role="status">{exporting}</p>}
      </header>
      <div className="cn-body">
        <nav className="cn-index" aria-label="Console sections">
          {GROUPS.map((g) => (
            <div key={g.label} className="cn-group">
              <p className="k">{g.label}</p>
              {g.items.map((d) => {
                const r = reads[d.id], c = count(r, d.id);
                return (
                  <button key={d.id} type="button" aria-current={sec === d.id ? "page" : undefined} onClick={() => setSec(d.id)}>
                    <span>{d.label}</span>
                    <em className={`mono${r?.state === "failed" ? " is-err" : ""}`}>{r?.state === "failed" ? "not read" : r?.state === "reading" && c === null ? "…" : c ?? ""}</em>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <main className="cn-main">
          {sec === "sightings" && <Sightings {...P} empty={empty("No new sightings")} />}
          {sec === "partners" && <Partners {...P} empty={empty("No partner requests")} onOrgs={() => setSec("orgs")} />}
          {sec === "reports" && <Reports {...P} empty={empty("No content reports")} />}
          {sec === "feedback" && <FeedbackQueue {...P} empty={empty("No feedback")} />}
          {sec === "verify" && <Verify {...P} empty={empty("No outcomes to verify")} />}
          {sec === "dogs" && <Dogs {...P} empty={empty("No animal records")} />}
          {sec === "feeding" && <Feeding {...P} empty={empty("No feeding spots")} />}
          {sec === "fundraisers" && <Fundraisers {...P} empty={empty("No fundraisers")} />}
          {sec === "volunteers" && <Helpers {...P} read={(read as Read<HelpersRead> | undefined) && mapHelpers(read as Read<HelpersRead>, "volunteers")} empty={empty("No volunteer offers")} kind="volunteer" />}
          {sec === "ngos" && <Helpers {...P} read={(read as Read<HelpersRead> | undefined) && mapHelpers(read as Read<HelpersRead>, "ngos")} empty={empty("No NGO offers")} kind="ngo" />}
          {sec === "orgs" && <Orgs {...P} empty={empty("No organisations yet")} />}
          {sec === "imports" && <Carried title="Master imports"><MasterImport secret={secret} /></Carried>}
          {sec === "enrich" && <Carried title="Historical enrichment"><WorkbookEnrichment secret={secret} /></Carried>}
        </main>
      </div>
    </div>
  );
}

function mapHelpers(r: Read<HelpersRead>, k: "volunteers" | "ngos"): Read<HelpersRead["volunteers"]> {
  if (r.state === "read") return { state: "read", data: r.data[k], at: r.at };
  if (r.state === "reading") return { state: "reading", data: r.data?.[k] };
  return { state: "failed", error: r.error, status: r.status };
}

/* Two specialist import tools, kept as they were in 1.0 until they are redesigned. */
function Carried({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="cn-carried" aria-label={title}>
      <p className="small cn-carried-note">This tool is carried over from StrayPaw 1.0 without redesign. It uses the same server routes and checks.</p>
      <div className="cn-carried-body">{children}</div>
    </section>
  );
}

