"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Archive, ArchiveRestore, Download } from "lucide-react";
import { KIND_LABEL, type CampaignAnimal, type CampaignStats } from "@/lib/campaigns";
import { downloadCsv } from "@/lib/csv";
import { Shell } from "../../Shell";
import { Chip, Sample } from "../../ui";
import { Confirm, Denied, Props, RecordHead, Skeleton, day, useAct } from "../../kit";
import { leadOrCoord } from "../../data/ngo-setup";
import { campaignAnimals, campaignStats, setArchived } from "../../data/ngo-programmes";
import { Grid, Partition, TryLink, Views, useWho, type GCol } from "./parts";
import { when } from "./prog/Drives";
import { S_DRIVES, S_DRIVE_ANIMALS } from "./sample";

/* One drive: what is recorded about the animals filed into it, the share statements side by side (of those
   recorded, of all filed), its animals with filters, CSV, and archive or restore (archive_campaign). */

type Ster = "" | "sterilised" | "not_sterilised" | "unknown";
const pct = (v: number | null) => (v === null || v === undefined ? "not computable" : `${Math.round(v)}%`);
const STER: Record<string, string> = { sterilised: "Sterilised", not_sterilised: "Recorded not", unknown: "Not recorded" };
const VACC: Record<string, string> = { vaccinated: "Vaccinated", not_vaccinated: "Recorded not", unknown: "Not recorded" };

export function DriveRecord({ id }: { id: string }) {
  const who = useWho();
  const { busy, run } = useAct();
  const [s, setS] = useState<CampaignStats | null | "missing">(null);
  const [animals, setAnimals] = useState<CampaignAnimal[] | null>(null);
  const [ster, setSter] = useState<Ster>("");
  const [asking, setAsking] = useState(false);
  const live = who.ready && !who.sample && !!who.ngo;
  const load = useCallback(async () => { const x = await campaignStats(id).catch(() => null); setS(x ?? "missing"); }, [id]);
  useEffect(() => { if (live) void load(); }, [live, load]);
  useEffect(() => { if (!live) return; setAnimals(null); campaignAnimals(id, ster || null).then(setAnimals).catch(() => setAnimals([])); }, [live, id, ster]);
  const sample = who.sample ? S_DRIVES.find((d) => d.id === id) ?? null : null;
  const stats = who.sample ? sample : s && s !== "missing" ? s : null;
  const list = who.sample ? S_DRIVE_ANIMALS.filter((a) => !ster || a.sterilisation_status === ster) : animals;
  const crumb: [string, string] = ["Programmes", stats?.name ?? "Drive"];
  if (!who.ready || (live && s === null)) return <Shell crumb={crumb}><div className="nx-page"><Skeleton rows={6} label="Reading the drive" /></div></Shell>;
  if (who.notNgo) return <Shell crumb={crumb}><div className="nx-page"><Denied what="Drives belong to an NGO workspace" why="Your account is not part of an NGO." /></div></Shell>;
  if (!stats) return <Shell crumb={crumb}><div className="nx-page"><Denied what="This drive is not available to you" why="It is not readable with your organisation's access, or it does not exist." back={{ href: "/next/ngo/programmes", label: "All drives" }} /></div></Shell>;
  const leader = who.sample || leadOrCoord(who.role);
  const flip = () => void run("arch", () => setArchived(stats.id, !stats.archived), { ok: stats.archived ? "Drive restored." : "Drive archived. Its animals and records are kept.", undo: async () => { await setArchived(stats.id, stats.archived); await load(); } }).then(async (x) => { setAsking(false); if (x.ok) await load(); });
  const csv = () => downloadCsv(`straypaw-drive-${stats.name.replace(/\W+/g, "-").toLowerCase()}.csv`, (list ?? []).map((a) => ({ code: a.code, name: a.name, zone: a.zone, sterilisation: a.sterilisation_status, vaccination: a.vaccination_status, needs_help: a.needs_help, filed: a.created_at })), { title: `Drive: ${stats.name}`, organisation: who.ngo?.name ?? null });
  const cols: GCol<CampaignAnimal>[] = [
    { label: "Animal", width: "minmax(0, 1.4fr)", render: (a) => <span className="nx-cell-main"><span><b>{a.name ?? a.code ?? "Unnamed"}</b><small className="ns-mono">{a.code ?? "no code"}<span className="nx-only-s"> · {STER[a.sterilisation_status] ?? a.sterilisation_status}</span></small></span></span> },
    { label: "Locality", width: "minmax(0, 1fr)", render: (a) => <span className="nx-t2">{a.zone ?? "Not recorded"}</span> },
    { label: "Vaccination", width: "120px", render: (a) => <Chip tone={a.vaccination_status === "vaccinated" ? "ok" : "plain"}>{VACC[a.vaccination_status] ?? a.vaccination_status}</Chip> },
    { label: "Needs help", width: "100px", render: (a) => (a.needs_help ? <Chip tone="bad">Needs help</Chip> : null) },
    { label: "Sterilisation", width: "128px", keep: true, render: (a) => <Chip tone={a.sterilisation_status === "sterilised" ? "ok" : "plain"}>{STER[a.sterilisation_status] ?? a.sterilisation_status}</Chip> },
  ];
  return (
    <Shell crumb={crumb}>
      <RecordHead title={<>{stats.name}{who.sample ? <Sample /> : null}</>}
        sub={<><Chip>{KIND_LABEL[stats.kind] ?? stats.kind}</Chip>{stats.archived ? <Chip tone="warn">Archived</Chip> : null}<span>{when(stats)}</span></>}
        actions={<>
          <button type="button" className="nx-btn is-quiet" disabled={!list?.length} onClick={csv}><Download size={13} />Animals as CSV</button>
          {who.sample ? <TryLink quiet><Archive size={13} />Archive</TryLink> : leader ? <button type="button" className="nx-btn is-quiet" disabled={!!busy} onClick={() => setAsking(true)}>{stats.archived ? <><ArchiveRestore size={13} />Restore</> : <><Archive size={13} />Archive</>}</button> : null}
          <Link className="nx-btn is-quiet" href="/next/ngo/programmes">All drives</Link>
        </>} />
      <div className="nx-rec" style={{ marginTop: 16, borderTop: "1px solid var(--line)" }}>
        <div>
          <h3 className="nx-h3">Drive</h3>
          <Props items={[["Kind", KIND_LABEL[stats.kind] ?? stats.kind], ["Locality", stats.zone ?? "Not recorded"], ["From", stats.starts_on ? day(stats.starts_on) : "Not recorded"], ["To", stats.ends_on ? day(stats.ends_on) : "Not recorded"], ["Animals", <span key="a" className="num">{stats.total}</span>], ["Observations", <span key="o" className="num">{stats.observations}</span>], ["People", <span key="p" className="num">{stats.people}</span>], ["Need help", <span key="h" className={stats.needs_help ? "ns-hot" : undefined}>{stats.needs_help}</span>]]} />
          <p className="nx-foot" style={{ marginTop: 14 }}>These are animals the organisation filed into this drive, not a share of the area&apos;s dog population.</p>
        </div>
        <div className="ns-rec-main">
          <section>
            <div className="nx-sec-h"><h2>Animals in this drive</h2><span className="nx-count">{list?.length ?? "…"}</span></div>
            <Views id="dra" value={ster} onChange={setSter} views={[{ id: "", label: "Every animal" }, { id: "sterilised", label: "Sterilised" }, { id: "not_sterilised", label: "Recorded not" }, { id: "unknown", label: "Not recorded" }]} />
            {list === null ? <Skeleton rows={5} label="Reading animals" /> : <Grid label="Animals in this drive" cols={cols} rows={list} rowKey={(a) => a.id} rowLabel={(a) => a.name ?? a.code ?? "animal"} href={(a) => (who.sample ? null : `/next/ngo/animals/${a.id}`)}
              empty={<><b>No animal filed into this drive{ster ? " with that status" : ""} yet</b><p>File reports from the Inbox to add animals to this drive.</p><p><Link className="nx-btn is-quiet" href="/next/ngo/inbox">Open the Inbox</Link></p></>} />}
          </section>
        </div>
        <div>
          <h3 className="nx-h3">Sterilisation</h3>
          <Partition yes={stats.sterilised} no={stats.not_sterilised} unknown={stats.ster_unknown} yesLabel="sterilised" noLabel="not sterilised" />
          <dl className="ns-dl" style={{ gridTemplateColumns: "minmax(0, 1fr)", marginTop: 8 }}><div><dt>Of those recorded</dt><dd>{pct(stats.ster_pct_of_known)}</dd></div><div><dt>Of all animals filed</dt><dd>{pct(stats.ster_pct_of_all)}</dd></div></dl>
          <h3 className="nx-h3">Vaccination</h3>
          <Partition yes={stats.vaccinated} no={stats.not_vaccinated} unknown={stats.vacc_unknown} yesLabel="vaccinated" noLabel="not vaccinated" />
          <dl className="ns-dl" style={{ gridTemplateColumns: "minmax(0, 1fr)", marginTop: 8 }}><div><dt>Of those recorded</dt><dd>{pct(stats.vacc_pct_of_known)}</dd></div><div><dt>Of all animals filed</dt><dd>{pct(stats.vacc_pct_of_all)}</dd></div></dl>
        </div>
      </div>
      {asking ? <Confirm title={stats.archived ? "Restore this drive" : "Archive this drive"} confirm={stats.archived ? "Restore" : "Archive"} busy={busy === "arch"} onClose={() => setAsking(false)} onConfirm={flip}><p>{stats.archived ? `${stats.name} returns to the active drives.` : `${stats.name} moves to the archived drives. Its animals and records are kept, and you can restore it.`}</p></Confirm> : null}
    </Shell>
  );
}

