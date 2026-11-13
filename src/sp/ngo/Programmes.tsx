"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Drives (decisions 022, 029, 034).

   Drives the organisation runs: sterilisation, vaccination, census and
   treatment camps. Each is read as a printed partition of the animals
   filed into it (recorded yes / recorded no / not recorded), never a
   single coverage percentage that hides the unknown. Percentages, where
   shown, say what they are a share of.

   One table of drives, a row each; the whole register's two partitions
   sit under it. Starting a drive opens a short form above the table.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { KIND_LABEL, orgCampaigns, programmeBreakdown, type Breakdown, type CampaignKind, type CampaignStats } from "@/lib/campaigns";
import { Btn, Empty, Head, Lanes, More, Note, Page, Panel, Section, Table, Tag, Tools, type Col } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { useMembership } from "../shell/Shell";
import { Ack, day, n } from "../ui";
import { Reading } from "../ui/Reading";
import { startDrive, type Receipt } from "../data/work";
import { Partition } from "./Ledger";
import { NgoGate } from "./Gate";
import "./org.k.css";

const when = (d: CampaignStats) => [d.zone, d.starts_on && `from ${day(d.starts_on)}`, d.ends_on && `to ${day(d.ends_on)}`].filter(Boolean).join(" · ") || "No dates recorded";

export function Programmes() {
  const mem = useMembership();
  const [drives, setDrives] = useState<CampaignStats[] | null>(null);
  const [bd, setBd] = useState<Breakdown | null>(null);
  const [archived, setArchived] = usePageState<boolean>("archived", false);
  const [error,setError]=useState<string|null>(null);
  const leader=mem.role==='admin'||mem.role==='coordinator';
  const [creating, setCreating] = useState(false);
  const load = useCallback(async () => { setDrives(null);setError(null);try{const [d,b]=await Promise.all([orgCampaigns(archived),programmeBreakdown()]);setDrives(d);setBd(b)}catch{setError("Drive records could not be read. Try again; unavailable data is not zero.")} }, [archived]);
  useEffect(() => { if (mem.member) void load(); }, [mem.member, load]);
  const o = bd?.overall;
  const waiting = bd ? bd.waiting.ours + bd.waiting.community : 0;

  const cols: Col<CampaignStats>[] = [
    { key: "name", label: "Drive", width: "minmax(0, 1.4fr)", render: (d) => <>{d.name}{d.archived ? <span className="og-tail">archived</span> : null}</> },
    { key: "kind", label: "Kind", width: "120px", render: (d) => <Tag>{KIND_LABEL[d.kind]}</Tag> },
    { key: "when", label: "Where and when", width: "minmax(0, 1.2fr)", render: (d) => when(d) },
    { key: "total", label: "Animals", width: "72px", align: "end", keep: true, render: (d) => n(d.total) },
    { key: "ster", label: "Sterilised", width: "160px", render: (d) => <span className="og-cell" title={`${n(d.sterilised)} sterilised, ${n(d.not_sterilised)} not sterilised, ${n(d.ster_unknown)} not recorded`}><Partition yes={d.sterilised} no={d.not_sterilised} unknown={d.ster_unknown} yesLabel="sterilised" noLabel="not sterilised" compact /><span>{n(d.sterilised)} of {n(d.total)}</span></span> },
    { key: "vacc", label: "Vaccinated", width: "160px", render: (d) => <span className="og-cell" title={`${n(d.vaccinated)} vaccinated, ${n(d.not_vaccinated)} not vaccinated, ${n(d.vacc_unknown)} not recorded`}><Partition yes={d.vaccinated} no={d.not_vaccinated} unknown={d.vacc_unknown} yesLabel="vaccinated" noLabel="not vaccinated" compact /><span>{n(d.vaccinated)} of {n(d.total)}</span></span> },
  ];

  return (
    <NgoGate title="Drives" lede="Your drives and camps, read as what is recorded and what is not.">
      <Page>
        <Head title="Drives"
          sum={error ? "Your drives could not be read." : drives === null ? <Reading>Reading your drives</Reading>
            : <>{drives.length ? <><b>{n(drives.length)}</b> {drives.length === 1 ? "drive" : "drives"}{archived ? ", archived ones included" : ""}.</> : "Sterilisation, vaccination, census and treatment drives, each with the animals filed into it."}{waiting > 0 ? <> <Link className="og-a" href="/ngo/inbox">{n(waiting)} {waiting === 1 ? "report" : "reports"} waiting to be filed</Link>.</> : null}</>}
          actions={leader ? <Btn variant={creating ? "plain" : "primary"} icon={<Plus size={14} />} aria-expanded={creating} onClick={() => setCreating((v) => !v)}>Start a drive</Btn> : undefined} />
        {creating && leader && <Panel pad><NewDrive onDone={() => { setCreating(false); void load(); }} onCancel={() => setCreating(false)} /></Panel>}
        {error && <Note tone="flame" action={<Btn small onClick={()=>void load()}>Try again</Btn>}>{error}</Note>}
        <Tools>
          <Lanes label="Drives shown" value={archived ? "all" : "active"} onChange={(v) => setArchived(v === "all")} lanes={[{ id: "active", label: "Active" }, { id: "all", label: "With archived" }]} />
        </Tools>
        {!error && (
          <Panel>
            {drives === null ? <div className="og-skel" aria-busy="true"><i /><i /><i /></div> : (
              <More items={drives} cap={12} noun="drives">{(shown) => (
                <Table label="Drives" cols={cols} rows={shown} rowKey={(d) => d.id} href={(d) => `/ngo/programmes/${d.id}`}
                  empty={<Empty title="No drive yet">Group the animals from a sterilisation, vaccination or census camp to see its coverage.{leader ? " Start a drive to begin." : ""}</Empty>} />
              )}</More>
            )}
          </Panel>
        )}
        {o && (
          <Section title="Whole register" count={`${n(o.total)} ${o.total === 1 ? "animal" : "animals"}`}>
            <Panel pad>
              <div className="og-cols">
                <div><h3 className="og-h3">Sterilisation</h3><Partition yes={o.sterilised} no={o.not_sterilised} unknown={o.ster_unknown} yesLabel="sterilised" noLabel="not sterilised" /></div>
                <div><h3 className="og-h3">Vaccination</h3><Partition yes={o.vaccinated} no={o.not_vaccinated} unknown={o.vacc_unknown} yesLabel="vaccinated" noLabel="not vaccinated" /></div>
              </div>
            </Panel>
          </Section>
        )}
      </Page>
    </NgoGate>
  );
}

const KINDS: CampaignKind[] = ["sterilisation", "vaccination", "census", "treatment", "other"];
function NewDrive({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CampaignKind>("sterilisation");
  const [zone, setZone] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<Receipt | null>(null);
  return (
    <form className="og-form" aria-label="Start a drive" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setR(null); const x = await startDrive({ name: name.trim(), kind, zone: zone.trim() || null, startsOn: from || null, endsOn: to || null, notes: null }); setR(x); setBusy(false); if (x.ok) setTimeout(onDone, 700); }}>
      <div className="og-f"><label htmlFor="pg-n">Name</label><input id="pg-n" className="og-in" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} placeholder="e.g. Ganapathy ABC, March" /></div>
      <div className="og-two">
        <div className="og-f"><label htmlFor="pg-k">Kind</label><select id="pg-k" className="og-in" value={kind} onChange={(e) => setKind(e.target.value as CampaignKind)}>{KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></div>
        <div className="og-f"><label htmlFor="pg-z">Locality <span className="og-opt">optional</span></label><input id="pg-z" className="og-in" value={zone} onChange={(e) => setZone(e.target.value)} /></div>
      </div>
      <div className="og-two">
        <div className="og-f"><label htmlFor="pg-f">From</label><input id="pg-f" type="date" className="og-in" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="og-f"><label htmlFor="pg-t">To <span className="og-opt">optional</span></label><input id="pg-t" type="date" className="og-in" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      <div className="og-go"><Btn type="submit" variant="primary" disabled={busy || name.trim().length < 3}>{busy ? "Sending…" : "Create the drive"}</Btn><Btn onClick={onCancel} disabled={busy}>Cancel</Btn><span aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not created: {r.error}</Ack>) : null}</span></div>
    </form>
  );
}
