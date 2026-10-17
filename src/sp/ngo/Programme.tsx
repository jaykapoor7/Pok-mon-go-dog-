"use client";

/* NGO · one drive: its partition, its animals, and the honest share
   statements (share of known, share of all) side by side. */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { campaignAnimals, campaignStats, KIND_LABEL, type CampaignAnimal, type CampaignStats } from "@/lib/campaigns";
import { downloadCsv } from "@/lib/csv";
import { Portrait } from "../ui/Portrait";
import { Ack, State, day, n } from "../ui";
import { archiveDrive, type Receipt } from "../data/work";
import { Partition } from "./Ledger";
import { NgoGate } from "./Gate";
import "./ngo.css";

const pct = (v: number | null) => (v === null || v === undefined ? "not computable" : `${Math.round(v)}%`);

export function Programme({ id }: { id: string }) {
  const [s, setS] = useState<CampaignStats | null | "missing">(null);
  const [animals, setAnimals] = useState<CampaignAnimal[] | null>(null);
  const [ster, setSter] = useState("");
  const [r, setR] = useState<Receipt | null>(null);
  const load = useCallback(async () => { const x = await campaignStats(id).catch(() => null); setS(x ?? "missing"); }, [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setAnimals(null); campaignAnimals(id, ster || null).then(setAnimals).catch(() => setAnimals([])); }, [id, ster]);

  return (
    <NgoGate title="Programme" lede="One drive and the animals filed into it.">
      {s === null ? <div className="ngo-page"><div className="skel" style={{ height: 300, margin: 28 }} /></div> : s === "missing" ? <div className="ngo-page"><State kind="forbidden" title="Not available" action={<Link className="btn" href="/ngo/programmes">All programmes</Link>}>This drive is not readable with your organisation&rsquo;s access, or it does not exist.</State></div> : (
        <div className="ngo-page">
          <header className="ngo-head pg-head">
            <div><Link className="link small" href="/ngo/programmes"><ArrowLeft size={13} aria-hidden /> Programmes</Link><p className="k">{KIND_LABEL[s.kind]}{s.archived ? " · archived" : ""}</p><h1 className="serif">{s.name}</h1></div>
            <p className="ngo-sum">{[s.zone, s.starts_on && `from ${day(s.starts_on)}`, s.ends_on && `to ${day(s.ends_on)}`].filter(Boolean).join(" · ") || "No dates recorded"}. <b>{n(s.total)}</b> animals from <b>{n(s.observations)}</b> observations by <b>{n(s.people)}</b> people.</p>
            <div className="row">
              <button type="button" className="btn is-s" disabled={!animals?.length} onClick={() => downloadCsv(`straypaw-drive-${s.name.replace(/\W+/g, "-").toLowerCase()}.csv`, (animals ?? []).map((a) => ({ code: a.code, name: a.name, zone: a.zone, sterilisation: a.sterilisation_status, vaccination: a.vaccination_status, needs_help: a.needs_help, filed: a.created_at })))}><Download size={14} aria-hidden /> Animals as CSV</button>
              <button type="button" className="btn is-ghost is-s" onClick={async () => { setR(null); const x = await archiveDrive(s.id, !s.archived); setR(x); if (x.ok) void load(); }}>{s.archived ? "Restore" : "Archive"}</button>
            </div>
          </header>
          <div aria-live="polite" style={{ padding: "0 28px" }}>{r && (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not changed: {r.error}</Ack>)}</div>
          <section className="pg-read">
            <div className="pg-block">
              <h2 className="h3">Sterilisation</h2>
              <Partition yes={s.sterilised} no={s.not_sterilised} unknown={s.ster_unknown} yesLabel="sterilised" />
              <dl className="ledger"><div><dt>Of those recorded</dt><dd>{pct(s.ster_pct_of_known)} sterilised</dd></div><div><dt>Of all animals filed</dt><dd>{pct(s.ster_pct_of_all)} recorded sterilised</dd></div></dl>
            </div>
            <div className="pg-block">
              <h2 className="h3">Vaccination</h2>
              <Partition yes={s.vaccinated} no={s.not_vaccinated} unknown={s.vacc_unknown} yesLabel="vaccinated" />
              <dl className="ledger"><div><dt>Of those recorded</dt><dd>{pct(s.vacc_pct_of_known)} vaccinated</dd></div><div><dt>Of all animals filed</dt><dd>{pct(s.vacc_pct_of_all)} recorded vaccinated</dd></div></dl>
            </div>
            <p className="small pg-method">Method: each animal&rsquo;s latest status observed during the drive. An ear notch is a sign, not proof of surgery. Animals filed into a drive are those your team saw, not a census of the area; this is not coverage of a population.</p>
          </section>
          <div className="wk-tools"><select className="select ngo-sel" value={ster} onChange={(e) => setSter(e.target.value)} aria-label="Sterilisation"><option value="">Every animal</option><option value="sterilised">Sterilised</option><option value="not_sterilised">Recorded not</option><option value="unknown">Not recorded</option></select>{s.needs_help > 0 && <span className="pill is-urgent">{n(s.needs_help)} need help</span>}</div>
          <div className="reg">
            {animals === null && <div className="skel" style={{ height: 200, margin: 28 }} />}
            {animals && !animals.length && <p className="small" style={{ padding: "8px 28px" }}>No animal filed into this drive{ster ? " with that status" : ""} yet. File reports from the <Link className="link" href="/ngo/inbox">Inbox</Link>.</p>}
            {animals?.map((a) => (
              <Link key={a.id} href={`/ngo/animals/${a.id}`} className={`reg-row pg-arow${a.needs_help ? " is-help" : ""}`}>
                <span className="reg-id"><Portrait src={a.cover_photo} tag={a.code ?? a.name ?? "Animal"} sensitive={a.needs_help} size="s" /><span><b>{a.name ?? a.code ?? "Unnamed"}</b><small className="mono">{a.code ?? "no code"}</small></span></span>
                <span>{a.zone ?? <i className="small">not recorded</i>}</span>
                <span className={`pill ${a.sterilisation_status === "sterilised" ? "is-care" : a.sterilisation_status === "unknown" ? "is-unknown" : ""}`}>{a.sterilisation_status === "sterilised" ? "Sterilised" : a.sterilisation_status === "unknown" ? "Not recorded" : "Recorded not"}</span>
                <span className={`pill ${a.vaccination_status === "vaccinated" ? "is-care" : a.vaccination_status === "unknown" ? "is-unknown" : ""}`}>{a.vaccination_status === "vaccinated" ? "Vaccinated" : a.vaccination_status === "unknown" ? "Not recorded" : "Recorded not"}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </NgoGate>
  );
}
