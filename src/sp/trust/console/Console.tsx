"use client";

/* ════════════════════════════════════════════════════════════════════
   Moderation · StrayPaw's operator console (/trust; /admin redirects).

   One password, checked by the server on every request. It opens on
   Today: what is waiting on a person, oldest first, what every public
   page prints, and whether the data under it is healthy. A section
   index on the left (a row of tabs on phones), new reports reviewed one
   at a time by default, and one dense table per other section with a
   record inspector beside it. Every section
   reads its own existing /api/admin route; a failed read says "Not
   read" with the server's words, never an empty table. Writes return
   the server's answer as a receipt.

   Master imports and historical enrichment are the 1.0 tools, framed
   here unchanged until they are redesigned; they use the same routes.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Download, LogOut, RefreshCw } from "lucide-react";
import { MasterImport } from "@/components/admin/MasterImport";
import { WorkbookEnrichment } from "@/components/admin/WorkbookEnrichment";
import { Ack, State } from "../../ui";
import { forgetKey, get, parse, rememberKey, savedKey, type Read } from "./api";
import { FeedbackQueue, Partners, Reports, Sightings, Verify } from "./Queues";
import { Arrivals } from "./Arrivals";
import { Today, type Need } from "./Today";
import { Dogs, Feeding, Fundraisers } from "./Records";
import { Helpers } from "./People";
import { Orgs } from "./Orgs";
import type { ArrivalsRead, ContentReport, Feedback, Helper, HelpersRead, Overview, PartnerRequest, PartnersRead, PendingCase, SectionId, Sighting } from "./types";
import "../trust.css";
import "./console.css";

type Def = { id: SectionId; label: string; note: string; path?: string; pick?: (b: Record<string, unknown>) => unknown };
const GROUPS: { label: string; items: Def[] }[] = [
  { label: "Moderation", items: [
    { id: "today", label: "Today", note: "What needs you, what the public sees, and whether the data is healthy", path: "/api/admin/overview", pick: (b) => b },
    { id: "arrivals", label: "Recent arrivals", note: "Every sighting and request that came in, from the community or an organisation, newest first", path: "/api/admin/arrivals", pick: (b) => ({ arrivals: b.arrivals ?? [], week: b.week ?? 0 }) },
  ] },
  { label: "Queues", items: [
    { id: "sightings", label: "New reports", note: "Approve, link to an animal, or reject", path: "/api/admin/sightings", pick: (b) => b.pending ?? [] },
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
  if (id === "today") return null;
  if (id === "arrivals") return (d as ArrivalsRead).week;
  if (id === "reports") return (d as ContentReport[]).filter((x) => x.status === "open").length;
  if (id === "feedback") return (d as Feedback[]).filter((x) => x.status === "open").length;
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
  const [sec, setSec] = useState<SectionId>("today");
  const [reads, setReads] = useState<Partial<Record<SectionId, Read<unknown>>>>({});
  const [exporting, setExporting] = useState<string | null>(null);

  const readOne = useCallback(async (s: string, d: Def) => {
    if (!d.path || !d.pick) return;
    setReads((r) => ({ ...r, [d.id]: { state: "reading", data: (r[d.id] as { data?: unknown } | undefined)?.data } }));
    const res = await get(s, d.path, d.pick);
    setReads((r) => ({ ...r, [d.id]: res }));
  }, []);

  /* The password is checked by asking the server for the overview. */
  const open = useCallback(async (s: string) => {
    setOpening(true); setGateErr(null);
    const first = await get(s, "/api/admin/overview", (b) => b);
    setOpening(false);
    if (first.state === "failed" && (first.status === 401 || first.status === 503 || first.status === 0)) { setGateErr(first.status === 401 ? "The server refused that password. Nothing was opened." : first.error); if (first.status === 401) forgetKey(); return; }
    rememberKey(s); setSecret(s);
    setReads({ today: first });
    for (const d of ALL) if (d.id !== "today") void readOne(s, d);
  }, [readOne]);
  const readAll = useCallback(async () => { if (secret) await Promise.all(ALL.map((d) => readOne(secret, d))); }, [secret, readOne]);

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
        <p className="k">StrayPaw · moderation</p>
        <h1 className="display">Moderation</h1>
        <p className="body">Reports, requests, records, organisations and the health of the data, in one place. The server checks the password on every read and every action.</p>
        <input className="input" type="password" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Moderation password" aria-label="Moderation password" autoComplete="current-password" />
        <button type="submit" className="btn is-ink" disabled={opening}>{opening ? "Checking…" : "Open"}</button>
        {gateErr && <Ack state="failed">{gateErr}</Ack>}
      </form>
    </div>
  );

  const def = ALL.find((d) => d.id === sec)!;
  const read = reads[sec];
  const reload = async () => { if (secret) await readOne(secret, def); };
  const empty = (t: string): ReactNode => <State title={t}>Nothing is waiting in this section. When something arrives it appears here for a person to decide.</State>;
  const P = { secret, read: read as never, reload };
  const ov = reads.today?.state === "read" ? (reads.today.data as Overview) : null;
  const settings = ov ? ov.settings : null;

  return (
    <div className="tr cn">
      <header className="tr-head cn-head">
        <div><p className="k">Moderation{sec === "today" ? ` · ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" })}` : ""}</p><h1 className="serif">{def.label}</h1><p className="small">{def.note}</p></div>
        <div className="row" style={{ ["--g" as string]: "8px" }}>
          <button type="button" className="btn is-s" onClick={() => void readAll()}><RefreshCw size={14} aria-hidden /> Read again</button>
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
          {sec === "today" && <Today secret={secret} read={reads.today as Read<Overview> | undefined} needs={needs(reads)} onGo={setSec} reload={reload} />}
          {sec === "arrivals" && <Arrivals {...P} onGo={setSec} empty={<State title="Nothing has come in yet">When a sighting or a request for help arrives, from the community or an organisation, it is listed here whatever its status.</State>} />}
          {sec === "sightings" && <Sightings {...P} empty={empty("No new sightings")} settings={settings} />}
          {sec === "partners" && <Partners {...P} empty={empty("No partner requests")} onOrgs={() => setSec("orgs")} />}
          {sec === "reports" && <Reports {...P} empty={empty("No content reports")} />}
          {sec === "feedback" && <FeedbackQueue {...P} empty={empty("No feedback")} />}
          {sec === "verify" && <Verify {...P} empty={empty("No outcomes to verify")} />}
          {sec === "dogs" && <Dogs {...P} empty={empty("No animal records")} />}
          {sec === "feeding" && <Feeding {...P} empty={empty("No feeding spots")} />}
          {sec === "fundraisers" && <Fundraisers {...P} empty={empty("No fundraisers")} />}
          {sec === "volunteers" && <Helpers {...P} read={(read as Read<HelpersRead> | undefined) && mapHelpers(read as Read<HelpersRead>, "volunteers")} empty={empty("No volunteer offers")} kind="volunteer" orgs={reads.orgs?.state === "read" ? (reads.orgs.data as { id: string; name: string }[]).map((o) => ({ id: o.id, name: o.name })) : []} />}
          {sec === "ngos" && <Helpers {...P} read={(read as Read<HelpersRead> | undefined) && mapHelpers(read as Read<HelpersRead>, "ngos")} empty={empty("No NGO offers")} kind="ngo" />}
          {sec === "orgs" && <Orgs {...P} empty={empty("No organisations yet")} />}
          {sec === "imports" && <Carried title="Master imports"><MasterImport secret={secret} /></Carried>}
          {sec === "enrich" && <Carried title="Historical enrichment"><WorkbookEnrichment secret={secret} /></Carried>}
        </main>
      </div>
    </div>
  );
}

/* What is waiting on a person, from the queues already read. Oldest first on Today. */
function needs(reads: Partial<Record<SectionId, Read<unknown>>>): Need[] {
  const data = <T,>(id: SectionId) => { const r = reads[id]; return r && "data" in r ? (r.data as T | undefined) : undefined; };
  const oldest = (xs: (string | null | undefined)[]) => xs.filter((x): x is string => !!x).sort()[0] ?? null;
  const out: Need[] = [];
  const s = data<Sighting[]>("sightings");
  if (s) out.push({ id: "sightings", label: "New reports", n: s.length, oldest: oldest(s.map((x) => x.created_at)), what: "Approve, link to an animal, or reject" });
  const p = data<PartnersRead>("partners");
  if (p) out.push({ id: "partners", label: "Partner requests", n: p.requests.length, oldest: oldest(p.requests.map((x: PartnerRequest) => x.created_at)), what: "An organisation asking for a workspace" });
  const c = data<ContentReport[]>("reports")?.filter((x) => x.status === "open");
  if (c) out.push({ id: "reports", label: "Content reports", n: c.length, oldest: oldest(c.map((x) => x.created_at)), what: "Something reported as wrong or unsafe" });
  const f = data<Feedback[]>("feedback")?.filter((x) => x.status === "open");
  if (f) out.push({ id: "feedback", label: "Feedback", n: f.length, oldest: oldest(f.map((x) => x.created_at)), what: "Notes from people using StrayPaw" });
  const v = data<PendingCase[]>("verify");
  if (v) out.push({ id: "verify", label: "Outcomes to verify", n: v.length, oldest: oldest(v.map((x) => x.resolved_at)), what: "Before and after photos to compare" });
  const h = data<HelpersRead>("volunteers");
  if (h) {
    const vol = h.volunteers.filter((x: Helper) => !x.acknowledged), ngo = h.ngos.filter((x: Helper) => !x.acknowledged);
    out.push({ id: "volunteers", label: "Volunteer offers", n: vol.length, oldest: oldest(vol.map((x) => x.created_at)), what: "People offering to help an animal" });
    out.push({ id: "ngos", label: "NGO offers", n: ngo.length, oldest: oldest(ngo.map((x) => x.created_at)), what: "Organisations offering to help" });
  }
  return out;
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

