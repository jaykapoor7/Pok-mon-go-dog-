"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { createPackage, offices, packages, PACKAGE_LABEL, verificationQueue, type Office, type Package, type QueueRow } from "@/lib/abc";
import { billLines, type PreviewResult } from "@/lib/billing";
import { holdsPeriod } from "@/lib/machines/package";
import { read, leadOrCoord } from "../../../data/ngo-setup";
import { blockers, contractOffice, monthBounds, prepareMonthly, readBillingPreview } from "../../../data/ngo-submissions";
import { Confirm, Failed, Field, Modal, Props, Skeleton, day, errText, toast, useAct } from "../../../kit";
import { Chip } from "../../../ui";
import type { Tone } from "../../../fixtures";
import { useRead } from "@/oh/data";
import { Drawer, Grid, Tools, TryLink, Views, plural, type GCol, type Who } from "../frame";
import { S_OFFICES, S_PACKAGES } from "../sample";

/* Packages: the month in hand (what can be claimed, for how much, under which contract, and what blocks the rest),
   a package for any other period, and every package with where it stands. The reviewing office decides; accepted
   means approved for payment, not paid. */

export const PKG_TONE: Record<string, Tone> = { draft: "plain", submitted: "accent", queried: "warn", accepted: "ok", returned: "bad", partially_accepted: "warn" };
export const period = (p: Pick<Package, "period_start" | "period_end">) => `${day(p.period_start)} – ${day(p.period_end)}`;
const PROC: Record<string, string> = { sterilisation: "Sterilisation (ABC)", vaccination: "Anti-rabies vaccination" };
type Bucket = "all" | "draft" | "with" | "decided";
const bucketOf = (s: string): Exclude<Bucket, "all"> => (s === "draft" ? "draft" : s === "submitted" || s === "queried" ? "with" : "decided");

type Data = { list: Package[]; offices: Office[]; queue: QueueRow[]; office: string | null };
async function load(ngoId: string): Promise<Data> {
  const [p, o, q, k] = await Promise.all([packages(), offices(), verificationQueue(500), contractOffice()]);
  return { list: p.filter((x) => x.ngo_id === ngoId), offices: o, queue: q, office: k };
}

export function PackagesTab({ who }: { who: Who }) {
  const ngoId = who.ngo?.org_id ?? null;
  const r = useRead<Data>(() => read(() => load(ngoId!)), `ns:packages:${ngoId}`, !!ngoId);
  if (who.sample) return <PackagesView sample list={S_PACKAGES} offs={S_OFFICES} queue={[]} defaultOffice="of-east" canPrepare reload={() => {}} />;
  if (r.loading && !r.data) return <Skeleton rows={6} label="Reading packages" />;
  if (r.error && !r.data) return <Failed error={/not switched on|does not exist|Could not find/i.test(r.error) ? "Packages are not switched on for this organisation yet." : errText(r.error)} retry={r.reload} />;
  const d = r.data!;
  return <PackagesView sample={false} list={d.list} offs={d.offices} queue={d.queue} defaultOffice={d.office ?? (d.offices.length === 1 ? d.offices[0].id : "")} canPrepare={leadOrCoord(who.role)} reload={r.reload} />;
}

function PackagesView({ sample, list, offs, queue, defaultOffice, canPrepare, reload }: { sample: boolean; list: Package[]; offs: Office[]; queue: QueueRow[]; defaultOffice: string; canPrepare: boolean; reload: () => void }) {
  const [view, setView] = useState<Bucket>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [other, setOther] = useState(false);
  const officeName = (id: string) => offs.find((o) => o.id === id)?.name ?? "Reviewing office";
  const shown = list.filter((p) => view === "all" || bucketOf(p.status) === view);
  const open = list.find((p) => p.id === openId) ?? null;
  const asks = list.filter((p) => p.status === "queried" || p.status === "returned").length;
  const cols: GCol<Package>[] = [
    { label: "Package", width: "minmax(0, 1.6fr)", render: (p) => <span className="nx-cell-main"><span><b>{p.title}</b><small>{period(p)}<span className="nx-only-s"> · {officeName(p.office_id)}</span></small></span></span> },
    { label: "Reviewing office", width: "minmax(0, 1fr)", render: (p) => <span className="nx-t2 ns-cell">{officeName(p.office_id)}</span> },
    { label: "Records", width: "84px", render: (p) => <span className="num">{p.summary?.records ?? p.case_ids?.length ?? 0}</span> },
    { label: "State", width: "140px", keep: true, render: (p) => <Chip tone={PKG_TONE[p.status] ?? "plain"}>{PACKAGE_LABEL[p.status] ?? p.status}</Chip> },
    { label: "Updated", width: "104px", render: (p) => <span className="nx-t3">{day(p.decided_at ?? p.submitted_at ?? p.created_at)}</span> },
  ];
  return (
    <>
      <Month sample={sample} offs={offs} queue={queue} list={list} defaultOffice={defaultOffice} canPrepare={canPrepare} />
      <Tools end={sample ? <TryLink quiet small><Plus size={13} />A package for another period</TryLink> : canPrepare && offs.length ? <button type="button" className="nx-btn is-quiet is-sm" onClick={() => setOther(true)}><Plus size={13} />A package for another period</button> : null}>
        <p className="nx-sub ns-sum" style={{ marginTop: 0 }}><b>{list.length}</b> {list.length === 1 ? "package" : "packages"}{asks ? <>, <b>{asks}</b> waiting on you</> : null}. The reviewing office decides; accepted means approved for payment, not paid.</p>
      </Tools>
      <Views id="pk" value={view} onChange={setView} views={[{ id: "all", label: "All", count: list.length }, { id: "draft", label: "Being prepared", count: list.filter((p) => bucketOf(p.status) === "draft").length }, { id: "with", label: "With the reviewing office", count: list.filter((p) => bucketOf(p.status) === "with").length }, { id: "decided", label: "Decided", count: list.filter((p) => bucketOf(p.status) === "decided").length }]} />
      <Grid label="Packages" cols={cols} rows={shown} rowKey={(p) => p.id} rowLabel={(p) => p.title} onOpen={(p) => setOpenId(p.id)} openKey={openId}
        empty={<><b>{list.length ? "Nothing in this view" : "No packages yet"}</b><p>{list.length ? "Choose another view." : "A package gathers a period's approved records for the reviewing office."}</p></>} />
      <AnimatePresence>{open ? <Drawer key={open.id} head={officeName(open.office_id)} title={open.title} sub={<>{period(open)} <Chip tone={PKG_TONE[open.status] ?? "plain"}>{PACKAGE_LABEL[open.status]}</Chip></>} onClose={() => setOpenId(null)} href={`/next/ngo/submissions/${open.id}`} hrefLabel="Open the package">
        <Props items={[["Office", officeName(open.office_id)], ["Period", period(open)], ["Records", <span key="n" className="num">{open.summary?.records ?? open.case_ids?.length ?? 0}</span>], ["Vet-authorised", open.summary?.vet_authorised ?? "Not counted"], ["Evidence items", open.summary?.evidence_items ?? "Not counted"], ["Submitted", open.submitted_at ? day(open.submitted_at) : "Not yet"], ["Decided", open.decided_by_name ? `${PACKAGE_LABEL[open.status]} by ${open.decided_by_name}` : "Not yet"]]} />
        <p className="nx-note" style={{ marginTop: 14 }}><span>{open.status === "draft" ? "Not sent yet. Open the package to check its claims and submit it." : open.status === "queried" ? "The reviewing office asked a question. Open the package to answer it." : open.status === "returned" ? "Returned by the office. Correct it and submit again." : open.status === "accepted" ? "Accepted means approved for payment. It is not a payment." : "With the reviewing office."}</span></p>
      </Drawer> : null}</AnimatePresence>
      {other ? <OtherPeriod offs={offs} defaultOffice={defaultOffice} onClose={() => setOther(false)} onDone={reload} /> : null}
    </>
  );
}

/* ── The month in hand ── */
function Month({ sample, offs, queue, list, defaultOffice, canPrepare }: { sample: boolean; offs: Office[]; queue: QueueRow[]; list: Package[]; defaultOffice: string; canPrepare: boolean }) {
  const router = useRouter();
  const { busy, run } = useAct();
  const [which, setWhich] = useState<"previous" | "current">(() => (new Date().getUTCDate() <= 7 ? "previous" : "current"));
  const [office, setOffice] = useState(defaultOffice);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [asking, setAsking] = useState(false);
  const [mismatch, setMismatch] = useState<{ id: string; text: string } | null>(null);
  const b = monthBounds(new Date(), which === "previous");
  useEffect(() => {
    if (sample || !office || !canPrepare) { setPreview(null); return; }
    let live = true; setPreview(null);
    readBillingPreview(b.start, b.end, office).then((x) => { if (live) setPreview(x); });
    return () => { live = false; };
  }, [sample, office, b.start, b.end, canPrepare]);
  const g = useMemo(() => blockers(queue, b.start, b.end), [queue, b.start, b.end]);
  const blocked = g.list.reduce((t, x) => t + x.count, 0);
  const officeName = offs.find((o) => o.id === office)?.name ?? "the reviewing office";
  const pv = sample ? SAMPLE_PREVIEW : preview?.state === "ok" ? preview.preview : null;
  const ready = !!pv && pv.count > 0 && !pv.too_many && !!pv.contract && pv.unpriced === 0 && pv.total !== null;
  const already = office ? list.some((p) => holdsPeriod(p.status) && p.period_start.slice(0, 10) === b.start && p.office_id === office) : false;
  const lines = pv && pv.count > 0 && pv.contract ? billLines(pv) : [];
  const blockedText = blocked || g.partial ? <> <span className="ns-hot">{blocked}{g.partial ? "+" : ""} {blocked === 1 && !g.partial ? "is" : "are"} blocked</span>.</> : null;
  const sum = sample ? <>{b.label}: <b>{pv!.count}</b> procedures can be claimed for <b>₹{pv!.total}</b> under {pv!.contract!.name} v{pv!.contract!.version}. <span className="ns-hot">5 more are blocked</span>.</>
    : !canPrepare ? <>{b.label}: {blocked || g.partial ? <><b>{blocked}{g.partial ? "+" : ""}</b> {blocked === 1 ? "record is" : "records are"} blocked from the claim.</> : "nothing is blocking this month's records."} Coordinators and leads prepare packages.</>
    : offs.length === 0 ? <>{b.label}: no reviewing office is linked yet, so nothing can be claimed.{blockedText}</>
    : !office ? <>{b.label}: choose the reviewing office to see what can be claimed.{blockedText}</>
    : !preview ? <>{b.label}: checking which procedures can be claimed…</>
    : preview.state === "not_deployed" ? <>{b.label}: no amount is available for this period.{blockedText}</>
    : preview.state === "error" ? <>{b.label}: the billing preview could not be read ({preview.message}). No amount is shown.{blockedText}</>
    : pv ? <>{b.label}: {pv.count === 0 ? "nothing can be claimed yet." : <><b>{pv.count}</b> {pv.count === 1 ? "procedure" : "procedures"} can be claimed{pv.contract && pv.total !== null ? <> for <b>₹{pv.total}</b></> : ", amount not known"}.</>}{blockedText}</> : null;
  const prepare = () => {
    if (!pv || !pv.contract) return;
    void run("prepare", () => prepareMonthly(b.label, b.start, b.end, office, pv), { quiet: true }).then((x) => {
      setAsking(false);
      if (!x.ok || !x.result) return;
      if (!x.result.same) { setMismatch({ id: x.result.id, text: `The package was prepared, but its claims (₹${x.result.claimed ?? "unknown"}) do not match the preview (₹${pv.total}). Open it and check before submitting.` }); return; }
      toast({ text: `The ${b.label} package is prepared as a draft. Its totals match the preview.`, tone: "ok" });
      router.push(`/next/ngo/submissions/${x.result.id}`);
    });
  };
  return (
    <section className="ns-month" aria-label="This month's package">
      <div className="ns-month-h">
        <span className="ns-seg" role="group" aria-label="Month">{(["previous", "current"] as const).map((w) => <button key={w} type="button" aria-pressed={which === w} onClick={() => setWhich(w)}>{monthBounds(new Date(), w === "previous").label.split(" ")[0]}</button>)}</span>
        {!sample && canPrepare && offs.length > 1 ? <select className="ns-sel" aria-label="Reviewing office" value={office} onChange={(e) => setOffice(e.target.value)}><option value="">Choose the reviewing office…</option>{offs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select> : null}
      </div>
      <p className="ns-sum" aria-live="polite">{sum}</p>
      {already && !sample ? <p className="nx-note"><span>The {b.label} package for {officeName} is already prepared. It is in the list below.</span></p> : null}
      {mismatch ? <p className="nx-note ns-note-bad" role="alert"><span>{mismatch.text} <Link href={`/next/ngo/submissions/${mismatch.id}`} className="ns-link">Open the package</Link></span></p> : null}
      {pv && pv.count > 0 && (sample || canPrepare) ? (pv.contract ? <div className="ns-bill">
        <p className="ns-small">Draft bill · {pv.contract.name} v{pv.contract.version}{pv.contract.illustrative ? " · illustrative terms" : ""}{pv.unpriced ? ` · ${pv.unpriced} without a rate` : ""}</p>
        <Grid label="Draft bill by procedure" rows={lines} rowKey={(l) => l.procedure} cols={[
          { label: "Procedure", width: "minmax(0, 1.6fr)", render: (l) => PROC[l.procedure] ?? l.procedure },
          { label: "Units and rate", width: "160px", render: (l) => <span className="num">{l.units} × {l.rate ? `₹${l.rate}` : "no rate"}</span> },
          { label: "Amount", width: "120px", keep: true, render: (l) => <span className="num">{l.rate ? `₹${l.amount}` : "Not known"}</span> },
        ]} />
        {pv.too_many ? <p className="ns-small">Over 2,000 procedures: prepare shorter periods.</p> : null}
      </div> : <p className="ns-small">No contract with {officeName} covers {b.label}.</p>) : null}
      {g.list.length ? <ul className="nx-feed" aria-label="What blocks the rest">{g.list.slice(0, 6).map((x) => <li key={x.reason}><span className="nx-feed-i">{x.count}</span><div><b><Link href={x.href}>{x.reason}</Link></b><p>{x.count === 1 ? "1 record" : `${x.count} records`} from {b.label}</p></div></li>)}</ul> : null}
      <div className="ns-acts" style={{ marginTop: 0 }}>
        {sample ? <TryLink>Prepare the {b.label} package · ₹{pv!.total}</TryLink>
          : canPrepare && office && ready ? <button type="button" className="nx-btn" disabled={!!busy} onClick={() => setAsking(true)}>Prepare {already ? "another" : "the"} {b.label} package · ₹{pv!.total}</button> : null}
      </div>
      {asking && pv?.contract ? <Confirm title={`Prepare the ${b.label} package`} confirm="Prepare and check" busy={busy === "prepare"} onClose={() => setAsking(false)} onConfirm={prepare}>
        <p>For {officeName}: {plural(pv.count, "claim")}, total ₹{pv.total} under {pv.contract.name} v{pv.contract.version}.</p>
        <p>It is created as a draft with exactly these claims, then read back to check the totals match. You review and submit it yourself.</p>
      </Confirm> : null}
    </section>
  );
}

const SAMPLE_PREVIEW = { period_start: "2026-10-01", period_end: "2026-10-31", office_id: "of-east", contract: { id: "ct-2", name: "East Zone ABC agreement", version: 2, reference: "EZ/ABC/2026/14", illustrative: true }, claims: Array.from({ length: 43 }, (_, i) => ({ case_id: `s${i}`, case_code: null, procedure: "sterilisation", procedure_date: "2026-10-10", rate_id: "rt-1", unit_rate: "1650.00" })), count: 43, unpriced: 0, total: "70950.00", too_many: false, basis: "procedure_date" as const };

/* ── Any other period ── */
function OtherPeriod({ offs, defaultOffice, onClose, onDone }: { offs: Office[]; defaultOffice: string; onClose: () => void; onDone: () => void }) {
  const router = useRouter();
  const { busy, run } = useAct();
  const now = new Date();
  const [f, setF] = useState({ title: "", start: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10), end: now.toISOString().slice(0, 10), office: defaultOffice });
  const [asking, setAsking] = useState(false);
  const ok = f.title.trim().length > 2 && !!f.office && !!f.start && !!f.end && f.end >= f.start;
  const go = () => void run("other", () => createPackage(f.title.trim(), f.start, f.end, f.office), { ok: "Package prepared as a draft." }).then((x) => { if (x.ok && x.result) { onDone(); router.push(`/next/ngo/submissions/${x.result}`); } else setAsking(false); });
  if (asking) return <Confirm title="Prepare this package" confirm="Prepare package" busy={busy === "other"} onClose={() => setAsking(false)} onConfirm={go}><p>{f.title.trim()}, {day(f.start)} to {day(f.end)}, for {offs.find((o) => o.id === f.office)?.name}. The database gathers the approved records of that period; it is created as a draft and nothing is sent.</p></Confirm>;
  return (
    <Modal title="A package for another period" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!ok} onClick={() => setAsking(true)}>Review</button></>}>
      <div className="nx-fields">
        <Field label="Title" wide><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ward 14 ABC drive · October" autoFocus /></Field>
        <Field label="From"><input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
        <Field label="To"><input type="date" value={f.end} min={f.start} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
        <Field label="Reviewing office" wide><select value={f.office} onChange={(e) => setF({ ...f, office: e.target.value })}><option value="">Choose the office that funds this work</option>{offs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
      </div>
    </Modal>
  );
}

