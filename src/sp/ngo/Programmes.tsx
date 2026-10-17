"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Programmes (decisions 022, 029, 034).

   Drives the organisation runs: sterilisation, vaccination, census and
   treatment camps. Each is read as a printed partition of the animals
   filed into it (recorded yes / recorded no / not recorded), never a
   single coverage percentage that hides the unknown. Percentages, where
   shown, say what they are a share of.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { KIND_LABEL, orgCampaigns, programmeBreakdown, type Breakdown, type CampaignKind, type CampaignStats } from "@/lib/campaigns";
import { useMembership } from "../shell/Shell";
import { Ack, State, day, n } from "../ui";
import { startDrive, type Receipt } from "../data/work";
import { Partition } from "./Ledger";
import { NgoGate } from "./Gate";
import "./ngo.css";

export function Programmes() {
  const mem = useMembership();
  const [drives, setDrives] = useState<CampaignStats[] | null>(null);
  const [bd, setBd] = useState<Breakdown | null>(null);
  const [archived, setArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const load = useCallback(async () => { setDrives(null); const [d, b] = await Promise.all([orgCampaigns(archived).catch(() => []), programmeBreakdown().catch(() => null)]); setDrives(d); setBd(b); }, [archived]);
  useEffect(() => { if (mem.member) void load(); }, [mem.member, load]);
  const o = bd?.overall;

  return (
    <NgoGate title="Programmes" lede="Your drives and camps, read as what is recorded and what is not.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">{mem.org?.name ?? "Your organisation"} · programmes</p><h1 className="serif">Programmes</h1></div>
          <p className="ngo-sum">{o ? <>Across your drives, <b>{n(o.total)}</b> animals: sterilisation recorded for <b>{n(o.sterilised + o.not_sterilised)}</b>, not recorded for <b>{n(o.ster_unknown)}</b>.</> : "Sterilisation, vaccination, census and treatment drives, each with the animals filed into it."}{bd && bd.waiting.ours + bd.waiting.community > 0 ? <> <Link className="link" href="/ngo/inbox">{n(bd.waiting.ours + bd.waiting.community)} reports waiting to be filed</Link>.</> : null}</p>
          <div className="row"><button type="button" className="btn is-ink is-s" onClick={() => setCreating((v) => !v)}><Plus size={14} aria-hidden /> Start a drive</button></div>
        </header>
        {creating && <NewDrive onDone={() => { setCreating(false); void load(); }} />}
        {o && (
          <section className="pg-all">
            <div><p className="k">All drives · sterilisation</p><Partition yes={o.sterilised} no={o.not_sterilised} unknown={o.ster_unknown} yesLabel="sterilised" /></div>
            <div><p className="k">All drives · vaccination</p><Partition yes={o.vaccinated} no={o.not_vaccinated} unknown={o.vacc_unknown} yesLabel="vaccinated" /></div>
            {bd && bd.unfiled.animals > 0 && <p className="small">{n(bd.unfiled.animals)} animals in your register are in no drive; they are not counted above.</p>}
          </section>
        )}
        <div className="wk-tools"><button type="button" className="chip" aria-pressed={archived} onClick={() => setArchived((v) => !v)}>Include archived drives</button></div>
        {drives === null && <div className="stack" style={{ padding: "0 28px" }}>{[0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 120 }} />)}</div>}
        {drives && !drives.length && <State art="ngo-empty" title="No drive yet" action={<button type="button" className="btn is-ink" onClick={() => setCreating(true)}>Start a drive</button>}>A drive groups the animals your team sees during a sterilisation, vaccination, census or treatment camp, so its coverage can be read honestly.</State>}
        <ol className="pg-list">
          {drives?.map((d) => (
            <li key={d.id}>
              <Link href={`/ngo/programmes/${d.id}`} className={`pg-row${d.archived ? " is-arch" : ""}`}>
                <div className="pg-id"><span className="pill is-plain">{KIND_LABEL[d.kind]}</span><b className="serif">{d.name}</b><small>{[d.zone, d.starts_on && `from ${day(d.starts_on)}`, d.ends_on && `to ${day(d.ends_on)}`].filter(Boolean).join(" · ") || "No dates recorded"}{d.archived ? " · archived" : ""}</small></div>
                <div className="pg-fig"><b>{n(d.total)}</b><small>animals · {n(d.observations)} observations · {n(d.people)} people</small></div>
                <div className="pg-parts">
                  <div><span className="small">Sterilisation</span><Partition yes={d.sterilised} no={d.not_sterilised} unknown={d.ster_unknown} yesLabel="sterilised" compact /></div>
                  <div><span className="small">Vaccination</span><Partition yes={d.vaccinated} no={d.not_vaccinated} unknown={d.vacc_unknown} yesLabel="vaccinated" compact /></div>
                </div>
                <ArrowUpRight size={16} aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </NgoGate>
  );
}

const KINDS: CampaignKind[] = ["sterilisation", "vaccination", "census", "treatment", "other"];
function NewDrive({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CampaignKind>("sterilisation");
  const [zone, setZone] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<Receipt | null>(null);
  return (
    <form className="pg-new" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setR(null); const x = await startDrive({ name: name.trim(), kind, zone: zone.trim() || null, startsOn: from || null, endsOn: to || null, notes: null }); setR(x); setBusy(false); if (x.ok) setTimeout(onDone, 700); }}>
      <div className="field"><label htmlFor="pg-n">Name</label><input id="pg-n" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} placeholder="e.g. Ganapathy ABC, March" /></div>
      <div className="field"><label htmlFor="pg-k">Kind</label><select id="pg-k" className="select" value={kind} onChange={(e) => setKind(e.target.value as CampaignKind)}>{KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></div>
      <div className="field"><label htmlFor="pg-z">Locality <span className="small">optional</span></label><input id="pg-z" className="input" value={zone} onChange={(e) => setZone(e.target.value)} /></div>
      <div className="field"><label htmlFor="pg-f">From</label><input id="pg-f" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
      <div className="field"><label htmlFor="pg-t">To <span className="small">optional</span></label><input id="pg-t" type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></div>
      <div className="pg-new-go"><button type="submit" className="btn is-ink" disabled={busy || name.trim().length < 3}>{busy ? "Sending…" : "Create the drive"}</button><span aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not created: {r.error}</Ack>) : null}</span></div>
    </form>
  );
}
