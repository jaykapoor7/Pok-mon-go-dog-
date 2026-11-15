"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { KIND_LABEL, type Breakdown, type CampaignKind, type CampaignStats } from "@/lib/campaigns";
import { useRead } from "@/oh/data";
import { leadOrCoord, read } from "../../../data/ngo-setup";
import { readBreakdown, readDrives, setArchived, startDrive } from "../../../data/ngo-programmes";
import { Failed, Field, Modal, Props, Skeleton, day, errText, useAct } from "../../../kit";
import { Chip } from "../../../ui";
import { Drawer, Grid, Partition, Tools, TryLink, Views, type GCol, type Who } from "../frame";
import { S_BREAKDOWN, S_DRIVES } from "../sample";

/* Drives: sterilisation, vaccination, census and treatment drives, each read as what is recorded and what is not.
   A share always says what it is a share of; unknown is never folded into no. */

const KINDS: CampaignKind[] = ["sterilisation", "vaccination", "census", "treatment", "other"];
export const when = (d: CampaignStats) => [d.zone, d.starts_on && `from ${day(d.starts_on)}`, d.ends_on && `to ${day(d.ends_on)}`].filter(Boolean).join(" · ") || "No dates recorded";
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");
function Mini({ yes, no, unknown, label }: { yes: number; no: number; unknown: number; label: string }) {
  const total = yes + no + unknown, w = (v: number) => (total ? `${(v / total) * 100}%` : "0%");
  return <span className="ns-mini ns-part" title={`${yes} ${label}, ${no} not, ${unknown} not recorded`}><span className="ns-part-bar" aria-hidden><i className="is-yes" style={{ width: w(yes) }} /><i className="is-no" style={{ width: w(no) }} /><i className="is-unk" style={{ width: w(unknown) }} /></span><span className="num nx-t2">{yes} of {total}</span>{unknown ? <small className="nx-t3">{unknown} unknown</small> : null}</span>;
}
type Data = { drives: CampaignStats[]; breakdown: Breakdown | null };

export function DrivesTab({ who }: { who: Who }) {
  const r = useRead<Data>(() => read(async () => { const [d, b] = await Promise.all([readDrives(true), readBreakdown()]); return { drives: d, breakdown: b }; }), "ns:drives", !who.sample && !!who.ngo);
  const [view, setView] = useState<"active" | "archived" | "all">("active");
  const [making, setMaking] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  if (!who.sample && r.loading && !r.data) return <Skeleton rows={5} label="Reading your drives" />;
  if (!who.sample && r.error && !r.data) return <Failed error={`${errText(r.error)} Unavailable data is not zero.`} retry={r.reload} />;
  const d: Data = who.sample ? { drives: S_DRIVES, breakdown: S_BREAKDOWN as Breakdown } : r.data!;
  const leader = who.sample || leadOrCoord(who.role);
  const shown = d.drives.filter((x) => view === "all" || (view === "archived" ? x.archived : !x.archived));
  const o = d.breakdown?.overall;
  const open = d.drives.find((x) => x.id === openId) ?? null;
  const waiting = d.breakdown ? d.breakdown.waiting.ours + d.breakdown.waiting.community : 0;
  const cols: GCol<CampaignStats>[] = [
    { label: "Drive", width: "minmax(0, 1.5fr)", render: (x) => <span className="nx-cell-main"><span><b>{x.name}{x.archived ? <span className="nx-t3" style={{ fontWeight: 400 }}> · archived</span> : null}</b><small>{KIND_LABEL[x.kind] ?? x.kind} · {when(x)}<span className="nx-only-s"> · {x.total} animals, {pct(x.sterilised, x.sterilised + x.not_sterilised)} sterilised of known</span></small></span></span> },
    { label: "Animals", width: "80px", render: (x) => <span className="num">{x.total}</span> },
    { label: "Sterilised", width: "210px", render: (x) => <Mini yes={x.sterilised} no={x.not_sterilised} unknown={x.ster_unknown} label="sterilised" /> },
    { label: "Vaccinated", width: "210px", render: (x) => <Mini yes={x.vaccinated} no={x.not_vaccinated} unknown={x.vacc_unknown} label="vaccinated" /> },
    { label: "Kind", width: "150px", keep: true, render: (x) => <Chip>{KIND_LABEL[x.kind] ?? x.kind}</Chip> },
  ];
  return (
    <>
      <Tools end={who.sample ? <TryLink small><Plus size={13} />Start a drive</TryLink> : leader ? <button type="button" className="nx-btn is-sm" onClick={() => setMaking(true)}><Plus size={13} />Start a drive</button> : null}>
        <span className="ns-sum"><b>{d.drives.filter((x) => !x.archived).length}</b> active {d.drives.filter((x) => !x.archived).length === 1 ? "drive" : "drives"}. Percentages count only animals whose status was recorded.{waiting > 0 ? <> <Link className="ns-link" href="/ngo/inbox">{waiting} {waiting === 1 ? "report" : "reports"} waiting to be filed</Link>.</> : null}{!leader ? " A lead or coordinator starts drives." : ""}</span>
      </Tools>
      <Views id="dr" value={view} onChange={setView} views={[{ id: "active", label: "Active", count: d.drives.filter((x) => !x.archived).length }, { id: "archived", label: "Archived", count: d.drives.filter((x) => x.archived).length }, { id: "all", label: "All", count: d.drives.length }]} />
      <Grid label="Drives" cols={cols} rows={shown} rowKey={(x) => x.id} rowLabel={(x) => x.name} onOpen={(x) => setOpenId(x.id)} openKey={openId}
        empty={<><b>{d.drives.length ? "Nothing in this view" : "No drive yet"}</b><p>Group the animals from a sterilisation, vaccination or census camp to see what is recorded.{leader && !d.drives.length ? " Start a drive to begin." : ""}</p></>} />
      <AnimatePresence>{open ? <Drawer key={open.id} head={KIND_LABEL[open.kind] ?? open.kind} title={open.name} sub={<>{when(open)}{open.archived ? <> <Chip bare>Archived</Chip></> : null}</>} onClose={() => setOpenId(null)} href={`/ngo/programmes/${open.id}`} hrefLabel="Open the drive">
        <Props items={[["Animals", <span key="a" className="num">{open.total}</span>], ["Sterilised", <span key="s"><span className="num">{open.sterilised}</span>&nbsp;<span className="nx-t3" style={{ fontWeight: 400 }}>of {open.sterilised + open.not_sterilised} known · {open.ster_unknown} not recorded</span></span>], ["Vaccinated", <span key="v"><span className="num">{open.vaccinated}</span>&nbsp;<span className="nx-t3" style={{ fontWeight: 400 }}>of {open.vaccinated + open.not_vaccinated} known · {open.vacc_unknown} not recorded</span></span>], ["Need help", open.needs_help], ["People", open.people], ["Observations", open.observations]]} />
        <p className="nx-note" style={{ marginTop: 14 }}><span>These are animals the organisation recorded in this drive, not a share of the area&apos;s dog population. Population coverage needs a dated estimate.</span></p>
      </Drawer> : null}</AnimatePresence>
      {o ? <section className="ns-sec"><div className="nx-sec-h"><h2>Whole register</h2><span className="nx-count">{o.total} animals</span></div>
        <div className="ns-cols" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", marginTop: 8 }}>
          <div className="ns-stack"><b style={{ fontWeight: 500 }}>Sterilisation</b><Partition yes={o.sterilised} no={o.not_sterilised} unknown={o.ster_unknown} yesLabel="sterilised" noLabel="not sterilised" /></div>
          <div className="ns-stack"><b style={{ fontWeight: 500 }}>Vaccination</b><Partition yes={o.vaccinated} no={o.not_vaccinated} unknown={o.vacc_unknown} yesLabel="vaccinated" noLabel="not vaccinated" /></div>
        </div>
        <p className="nx-foot">These are animals the organisation recorded, not a share of the area&apos;s dog population. Population coverage needs a dated estimate.</p>
      </section> : null}
      {making ? <NewDrive onClose={() => setMaking(false)} onDone={() => { setMaking(false); r.reload(); }} reload={r.reload} /> : null}
    </>
  );
}

function NewDrive({ onClose, onDone, reload }: { onClose: () => void; onDone: () => void; reload: () => void }) {
  const { busy, run } = useAct();
  const [f, setF] = useState({ name: "", kind: "sterilisation" as CampaignKind, zone: "", from: "", to: "" });
  const save = () => void run("drive", () => startDrive({ name: f.name.trim(), kind: f.kind, zone: f.zone.trim() || null, startsOn: f.from || null, endsOn: f.to || null }), {
    ok: `${f.name.trim()} started.`,
    /* Drives are never deleted; the honest undo is to archive the one just started. */
    undo: async (id) => { await setArchived(id as string, true); reload(); },
  }).then((x) => { if (x.ok) onDone(); });
  return (
    <Modal title="Start a drive" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={f.name.trim().length < 3 || !!busy} onClick={save}>{busy ? "Starting…" : "Start the drive"}</button></>}>
      <div className="nx-fields">
        <Field label="Name" wide><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} minLength={3} placeholder="Ganapathy ABC, March" autoFocus /></Field>
        <Field label="Kind"><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as CampaignKind })}>{KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></Field>
        <Field label="Locality (optional)"><input value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })} /></Field>
        <Field label="From"><input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
        <Field label="To (optional)"><input type="date" value={f.to} min={f.from || undefined} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
      </div>
      <p className="nx-sub">Reports filed into the drive from the Inbox become its animals. You can archive it later; nothing is deleted.</p>
    </Modal>
  );
}
