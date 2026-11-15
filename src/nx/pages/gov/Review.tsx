"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check as Tick, Download, FileSearch, Info, ShieldCheck } from "lucide-react";
import { EVIDENCE_LABEL, NotEnabled, PACKAGE_LABEL, orgNames, packageAct, packageById, packageCases, packageEvents, type EvidenceKind, type Package, type PackageCase, type PackageEvent } from "@/lib/abc";
import { money, readReconciliation, type ClaimItem, type DecisionSource, type Reconciliation } from "@/lib/reconciliation";
import { operationRpc, operationsDb, readOperations, OPERATION_LABELS, type OperationEvent, type OperationReview } from "@/lib/operations";
import { PACKAGE_STATE, isDecided, isPackageStatus, type PackageAction } from "@/lib/machines/package";
import { checkPackage } from "@/sp3/ai/packageCheck";
import { Shell } from "../../Shell";
import { Chip, Sample } from "../../ui";
import { Denied, Empty, Failed, Field, FilePick, Modal, Props, RecordHead, Skeleton, TabBar, Timeline, dayTime, errText, toast, useAct, type TItem } from "../../kit";
import { useLive, type Workspace } from "../../live";
import type { Tone } from "../../fixtures";
import { DECISION_LABEL, decideItem, downloadPackage, finalizePackage, indiaToday, recordPayment, type ItemDecision } from "../../data/govhealth";
import { samplePackage } from "../../data/govhealth-samples";
import { Block, OpenFile, Opening, SignedConfirm, TryLink } from "../gh/parts";

/* One package from an operator, as the reviewing office decides it. Records and their evidence on the left; the
   checks, the exceptions and the decision on the right. Every decision is recorded in the reviewer's own name
   through the same audited functions the classic review used, and checked again after it is saved. Fixed checks
   list what to look at; they decide nothing, and Kaju decides nothing here. */

type Data = { pkg: Package; cases: PackageCase[]; events: PackageEvent[]; operator: string; rec: Reconciliation | null; recErr: string | null };
const TONE: Record<string, Tone> = { submitted: "accent", queried: "warn", accepted: "ok", returned: "bad", partially_accepted: "warn", draft: "plain" };
const DTONE: Record<string, Tone> = { pending: "plain", accepted: "ok", query: "warn", returned: "bad", rejected: "bad", answer: "accent" };
const KIND: Record<string, string> = { created: "Prepared", submitted: "Submitted", query: "Question from the office", answer: "Answer from the operator", accepted: "Accepted", returned: "Returned", partial_review: "Review closed, claim by claim", sanctioned: "Payment sanctioned" };
const evLabel = (k: string) => EVIDENCE_LABEL[k as EvidenceKind] ?? k.replace(/_/g, " ");
const period = (p: Package) => `${new Date(p.period_start).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${new Date(p.period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

export function PackageReview({ id }: { id: string }) {
  const live = useLive();
  if (!live.ready) return <Opening ws="gov" crumb={["Verification", "Package"]} />;
  if (!live.org) { const s = samplePackage(id); return <ReviewView sample data={{ ...s, rec: s.rec, recErr: null }} office="East Zone office" actor={null} who={null} reload={() => {}} />; }
  const office = live.orgs.find((o) => o.source === "review_office") ?? null;
  if (!office) return (
    <Shell ws="gov" crumb={["Verification", "Package"]}>
      <div className="nx-page" style={{ maxWidth: 760 }}>
        <h1 className="nx-h1">Package review</h1>
        <Denied what="Only a reviewing office decides packages" why={`Your account works in ${live.orgFor("government")?.name ?? live.org.name}, which is not a reviewing office. A package is opened and decided only by members of the office it was sent to. An office adds its reviewers; the role cannot be chosen here.`} back={{ href: "/gov/verification", label: "Back to verification" }} />
      </div>
    </Shell>
  );
  return <LiveReview id={id} office={office} actor={live.userId!} who={live.userName} />;
}

function LiveReview({ id, office, actor, who }: { id: string; office: Workspace; actor: string; who: string | null }) {
  const [s, setS] = useState<{ state: "loading" | "ok" | "missing" | "off" | "error"; data?: Data; err?: string }>({ state: "loading" });
  const load = useCallback(async () => {
    try {
      const pkg = await packageById(id);
      if (!pkg) { setS({ state: "missing" }); return; }
      const [cases, events, names] = await Promise.all([packageCases(id), packageEvents(id), orgNames([pkg.ngo_id]).catch(() => ({} as Record<string, string>))]);
      let rec: Reconciliation | null = null, recErr: string | null = null;
      try { rec = await readReconciliation(id); } catch (e) { recErr = errText(e); }
      setS({ state: "ok", data: { pkg, cases, events, operator: names[pkg.ngo_id] ?? "The operator", rec, recErr } });
    } catch (e) { if (e instanceof NotEnabled) setS({ state: "off" }); else setS({ state: "error", err: errText(e) }); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  if (s.state === "loading") return <Opening ws="gov" crumb={["Verification", "Package"]} />;
  if (s.state !== "ok") return (
    <Shell ws="gov" crumb={["Verification", "Package"]}>
      <div className="nx-page" style={{ maxWidth: 760 }}>
        <h1 className="nx-h1">Package review</h1>
        {s.state === "error" ? <Failed error={s.err!} retry={() => void load()} />
          : <Empty title={s.state === "off" ? "Package review is not switched on for this office yet" : "This package is not available to you"} hint={s.state === "off" ? undefined : "It may still be a draft with the operator, or it was sent to another office."} action={<Link href="/gov/verification" className="nx-btn is-quiet">Back to verification</Link>} />}
      </div>
    </Shell>
  );
  return <ReviewView sample={false} data={s.data!} office={office.name} actor={actor} who={who} reload={load} />;
}

type Dlg =
  | { k: "item"; item: ClaimItem; decision: ItemDecision }
  | { k: "batch"; decision: ItemDecision; items: ClaimItem[] }
  | { k: "package"; kind: PackageAction }
  | { k: "finalize" }
  | { k: "payment" }
  | null;

function ReviewView({ sample, data, office, actor, who, reload }: { sample: boolean; data: Data; office: string; actor: string | null; who: string | null; reload: () => Promise<void> | void }) {
  const { pkg, cases, events, operator, rec, recErr } = data;
  const [tab, setTab] = useState<"Review" | "Records" | "History">("Review");
  const items = useMemo(() => rec?.items ?? [], [rec]);
  const itemReview = !!(rec?.item_review_enabled ?? pkg.item_review_enabled);
  const open = pkg.status === "submitted";
  const canDecide = !sample && open;
  const check = useMemo(() => (rec ? checkPackage(rec.items, cases) : null), [rec, cases]);
  const issues = useMemo(() => new Map((check?.checks ?? []).map((c) => [c.key, c.issues])), [check]);
  const [sel, setSel] = useState<string | null>(null);
  const selected = items.find((i) => i.key === sel) ?? items.find((i) => i.decision === "pending") ?? items[0] ?? null;
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Record<string, string>>({});
  const [pkgNote, setPkgNote] = useState("");
  const [summary, setSummary] = useState("");
  const [batchNote, setBatchNote] = useState("");
  const [pay, setPay] = useState({ amount: "", paidOn: "", reference: "", note: "" });
  const [doc, setDoc] = useState<File | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const { busy, run } = useAct();
  const pending = items.filter((i) => i.decision === "pending");
  const unsettled = items.filter((i) => i.decision === "pending" || i.decision === "query").length;
  const pickedItems = items.filter((i) => picked.has(i.key));
  const clean = pending.filter((i) => !(issues.get(i.key) ?? []).length);
  const statusLabel = isPackageStatus(pkg.status) ? PACKAGE_STATE[pkg.status].label : PACKAGE_LABEL[pkg.status] ?? pkg.status;
  const toggle = (k: string) => setPicked((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const afterWrite = async () => { setDlg(null); await reload(); };
  const doItem = async (item: ClaimItem, decision: ItemDecision) => {
    const note = (notes[item.key] ?? "").trim(); const u = Number(units[item.key] ?? item.claimed_units);
    const r = await run(`item:${item.key}`, () => decideItem(actor!, pkg.id, item, decision, note, decision === "accepted" ? u : null), { ok: `${DECISION_LABEL[decision]}: ${item.case_code ?? item.title}. Saved in your name and checked against the audit.` });
    if (r.ok) { setNotes((n) => ({ ...n, [item.key]: "" })); setPicked((s) => { const n = new Set(s); n.delete(item.key); return n; }); await afterWrite(); }
  };
  const doBatch = async (decision: ItemDecision, list: ClaimItem[]) => {
    const note = batchNote.trim();
    let done = 0;
    const r = await run("batch", async () => {
      for (const item of list) { setProgress(`${done} of ${list.length} recorded…`); await decideItem(actor!, pkg.id, item, decision, note, decision === "accepted" ? item.claimed_units : null); done++; }
      setProgress(null);
    }, { ok: `${list.length} ${list.length === 1 ? "decision" : "decisions"} recorded in your name, each checked against the audit.`, quiet: false });
    setProgress(null);
    if (!r.ok && done) toast({ text: `${done} of ${list.length} were recorded before it stopped. Trying again repeats the same requests safely.`, tone: "bad" });
    if (r.ok) { setPicked(new Set()); setBatchNote(""); }
    await afterWrite();
  };
  const doPackage = async (kind: PackageAction) => {
    const r = await run(`pkg:${kind}`, () => packageAct(pkg.id, kind, pkgNote.trim() || undefined), { ok: kind === "accepted" ? "Package accepted in your name. Accepted is not paid." : kind === "query" ? "Question sent to the operator." : "Returned to the operator with your reason." });
    if (r.ok) { setPkgNote(""); await afterWrite(); }
  };
  const doFinalize = async () => {
    const r = await run("finalize", () => finalizePackage(actor!, pkg.id, summary.trim()), { ok: "Review closed. The accepted and returned claims stay as you decided them." });
    if (r.ok) { setSummary(""); await afterWrite(); }
  };
  const doPayment = async () => {
    if (!doc) return;
    const r = await run("payment", () => recordPayment(actor!, pkg.id, pay, doc), { ok: "Payment reference recorded with its document. StrayPaw did not make a payment." });
    if (r.ok) { setPay({ amount: "", paidOn: "", reference: "", note: "" }); setDoc(null); await afterWrite(); }
  };
  const download = async (f: "pdf" | "xlsx") => { await run(`dl:${f}`, () => downloadPackage(pkg.id, f), { ok: `${f === "pdf" ? "PDF" : "Spreadsheet"} prepared.` }); };

  const records = pkg.summary.records ?? cases.length;
  const head = (
    <RecordHead title={<>{pkg.title}{sample ? <Sample /> : null}</>}
      sub={<>{operator} · {period(pkg)}{pkg.submitted_at ? ` · sent ${dayTime(pkg.submitted_at)}` : ""} · {records} {records === 1 ? "record" : "records"} </>}
      chips={<><Chip tone={TONE[pkg.status] ?? "plain"}>{statusLabel}</Chip>{rec?.contract?.illustrative ? <Chip tone="warn">Illustrative contract</Chip> : null}</>}
      actions={sample ? <><TryLink quiet sm><Download size={13} />Download PDF</TryLink><TryLink quiet sm><Download size={13} />Spreadsheet</TryLink></> : <><button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => void download("pdf")}><Download size={13} />Download PDF</button><button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => void download("xlsx")}><Download size={13} />Spreadsheet</button></>} />
  );

  /* ── Left: records and evidence ── */
  const evidenceOf = (item: ClaimItem | null, c: PackageCase | undefined) => {
    const ev = item?.evidence_snapshot ?? c?.evidence ?? [];
    return ev.length ? <ul className="gh-ev">{ev.map((e, i) => <li key={i}><span className="gh-ck is-on" aria-hidden><Tick size={10} strokeWidth={3} /></span><span>{evLabel(e.kind)}<small>{e.location ?? (e.url ? "File" : "Recorded")}</small></span>{e.url ? <OpenFile url={e.url}>Open</OpenFile> : <span />}</li>)}</ul> : <p className="nx-sub">No evidence was submitted with this record.</p>;
  };
  const signoffs = (item: ClaimItem | null, c: PackageCase | undefined) => {
    const vet = item?.signoffs_snapshot ? item.signoffs_snapshot.find((x) => x.kind === "vet_authorised")?.actor : c?.vet_name;
    const rev = item?.signoffs_snapshot ? item.signoffs_snapshot.find((x) => x.kind === "evidence_reviewed")?.actor : c?.reviewer_name;
    return <Props items={[["Veterinarian", vet ?? null], ["Evidence reviewed by", rev ?? null], ["Source", item?.snapshot_at ? `Snapshot taken when sent, ${dayTime(item.snapshot_at)}` : "Current record"]]} />;
  };
  const left = itemReview ? (
    <div>
      {recErr ? <Failed error={recErr} retry={() => void reload()} /> : !rec ? <Skeleton rows={5} label="Reading claims" /> : <>
        <div className="gh-block-h"><h3 className="nx-h3">Claims, animal by animal <span className="nx-count">{items.length}</span></h3>
          {(canDecide || sample) && clean.length ? <span className="gh-block-a"><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setPicked(new Set(clean.map((i) => i.key)))}>Select the {clean.length} without exceptions</button></span> : null}</div>
        {pickedItems.length ? (
          <div className="gh-batch" role="region" aria-label="Decide the selected claims">
            <b>{pickedItems.length} selected</b>
            <span className="gh-batch-a">
              {sample ? <TryLink sm>Decide together</TryLink> : <>
                <button type="button" className="nx-btn is-sm" onClick={() => setDlg({ k: "batch", decision: "accepted", items: pickedItems })}>Accept</button>
                <button type="button" className="nx-btn is-sm is-quiet" onClick={() => setDlg({ k: "batch", decision: "query", items: pickedItems })}>Ask</button>
                <button type="button" className="nx-btn is-sm is-quiet" onClick={() => setDlg({ k: "batch", decision: "returned", items: pickedItems })}>Return</button>
                <button type="button" className="nx-btn is-sm is-quiet" onClick={() => setDlg({ k: "batch", decision: "rejected", items: pickedItems })}>Reject</button></>}
              <button type="button" className="nx-btn is-sm is-quiet" onClick={() => setPicked(new Set())}>Clear</button>
            </span>
          </div>
        ) : null}
        <div className="gh-claims" role="list" aria-label="Claims">
          {items.map((i) => { const iss = issues.get(i.key) ?? []; const can = canDecide || sample; return (
            <div key={i.key} role="listitem" className={`gh-claim ${selected?.key === i.key ? "is-sel" : ""}`}>
              <span className="gh-claim-box">{can && i.decision === "pending" ? <input type="checkbox" checked={picked.has(i.key)} onChange={() => toggle(i.key)} aria-label={`Select ${i.case_code ?? i.title}`} /> : null}</span>
              <button type="button" className="gh-claim-main" onClick={() => setSel(i.key)} aria-pressed={selected?.key === i.key} aria-label={`Open claim ${i.case_code ?? i.title}`}>
                <b>{i.title || i.case_code}</b>
                <small><span className="gh-code">{i.case_code}</span> · {i.procedure_label}{iss.length ? <span style={{ color: "var(--warn)" }}> · {iss.length} to check</span> : ""}</small>
              </button>
              <span className="gh-amount">{i.claimed_units} × {money(i.unit_rate)}</span>
              <Chip tone={DTONE[i.decision] ?? "plain"}>{DECISION_LABEL[i.decision] ?? i.decision}</Chip>
            </div>); })}
          {!items.length ? <p className="nx-sub" style={{ padding: "16px 0" }}>This package has no claims.</p> : null}
        </div>
        {selected ? (() => { const c = cases.find((x) => x.case_id === selected.case_id); return (
          <Block title={`Evidence for ${selected.case_code ?? selected.title}`} note={c?.city ? `Recorded in ${c.city}` : undefined}>
            {evidenceOf(selected, c)}
            <h3 className="nx-h3">Sign-offs</h3>
            {signoffs(selected, c)}
          </Block>); })() : null}
      </>}
    </div>
  ) : (
    <div>
      <h3 className="nx-h3">Records and evidence <span className="nx-count">{cases.length}</span></h3>
      <p className="gh-block-n">This package was prepared before claim-by-claim review, so it is decided as a whole.</p>
      {cases.map((c) => <Block key={c.case_id} title={c.title || c.case_code || "Record"} note={[c.case_code, c.city].filter(Boolean).join(" · ")}>{evidenceOf(null, c)}{signoffs(null, c)}</Block>)}
      {!cases.length ? <Empty title="No records in this package" /> : null}
    </div>
  );

  /* ── Right: checks, exceptions and the decision ── */
  const iss = selected ? issues.get(selected.key) ?? [] : [];
  const req = selected ? selected.missing : [];
  const decideBox = selected && itemReview ? (
    <Block title="Decision on this claim" note={selected.decision === "pending" ? "Write the reason first. It is recorded with your name and the source as it was sent." : undefined}>
      <ul className="gh-checks" aria-label="Fixed checks for this claim">
        {(iss.length ? iss : ["Required evidence, sign-offs, rate and arithmetic all match"]).map((x) => <li key={x} className={iss.length ? "is-bad" : "is-ok"}>{iss.length ? <AlertTriangle size={13} /> : <Tick size={13} />}<span>{x}</span></li>)}
      </ul>
      <Props items={[["Claimed", `${selected.claimed_units} × ${money(selected.unit_rate)} = ${money(selected.claimed_amount)}`], ["Decision", <Chip key="d" tone={DTONE[selected.decision] ?? "plain"}>{DECISION_LABEL[selected.decision] ?? selected.decision}</Chip>], ...(selected.reviewer ? [["By", `${selected.reviewer}${selected.decided_at ? `, ${dayTime(selected.decided_at)}` : ""}`] as [string, string]] : []), ...(selected.note ? [["Note", selected.note] as [string, string]] : [])]} />
      {selected.decision === "pending" && (canDecide || sample) ? (
        <div className="gh-form">
          <Field label="Reason for your decision"><textarea value={notes[selected.key] ?? ""} maxLength={3000} onChange={(e) => setNotes((n) => ({ ...n, [selected.key]: e.target.value }))} placeholder="What you checked, or what the operator must fix" /></Field>
          <Field label="Accepted quantity" hint={`Up to ${selected.claimed_units}. Used only when you accept.`}><input type="number" inputMode="numeric" min={1} max={selected.claimed_units} step={1} value={units[selected.key] ?? String(selected.claimed_units)} onChange={(e) => setUnits((u) => ({ ...u, [selected.key]: e.target.value }))} /></Field>
          {req.length ? <p className="gh-hint">Accept is not offered while a requirement is missing: {req.join(", ")}.</p> : null}
          <div className="gh-acts">
            {sample ? <TryLink sm>Accept</TryLink> : <button type="button" className="nx-btn is-sm" disabled={!!busy || !!req.length || !(notes[selected.key] ?? "").trim()} onClick={() => setDlg({ k: "item", item: selected, decision: "accepted" })}>Accept</button>}
            {(["query", "returned", "rejected"] as ItemDecision[]).map((d) => sample ? <TryLink key={d} quiet sm>{d === "query" ? "Ask a question" : d === "returned" ? "Return" : "Reject"}</TryLink> : <button key={d} type="button" className="nx-btn is-sm is-quiet" disabled={!!busy || !(notes[selected.key] ?? "").trim()} onClick={() => setDlg({ k: "item", item: selected, decision: d })}>{d === "query" ? "Ask a question" : d === "returned" ? "Return" : "Reject"}</button>)}
          </div>
        </div>
      ) : selected.decision !== "pending" ? <p className="gh-hint" style={{ marginTop: 8 }}>{selected.decision === "query" ? "Waiting for the operator's answer. It comes back here for your decision." : "Decided. The history tab shows every decision on this claim."}</p> : null}
    </Block>
  ) : null;

  const totals = rec ? (
    <Block title="Totals" note={rec.contract ? `${rec.contract.name}, version ${rec.contract.version}${rec.contract.illustrative ? ", illustrative" : ""}` : "No contract rates are linked, so amounts are unknown."}>
      <dl className="gh-totals"><div><dt>Claimed</dt><dd>{money(rec.claimed_amount)}</dd></div><div><dt>Reviewed</dt><dd>{money(rec.reviewed_amount)}</dd></div><div><dt>Accepted</dt><dd style={{ color: "var(--ok)" }}>{money(rec.accepted_amount)}</dd></div><div><dt>Payment references</dt><dd>{money(rec.paid_amount)}</dd></div></dl>
      {rec.payment_exceeds_accepted ? <p className="nx-note" style={{ marginTop: 10 }}><AlertTriangle size={13} /><span>Payment references add up to more than the accepted claims. Check the references; nothing was paid from here.</span></p> : null}
    </Block>
  ) : null;

  const exceptions = check && itemReview ? (
    <Block title="Exceptions">
      <p className="nx-sub" style={{ marginTop: 0 }}><b className="num">{check.clean}</b> waiting {check.clean === 1 ? "claim has" : "claims have"} no exceptions, <b className="num">{check.exceptions}</b> {check.exceptions === 1 ? "has" : "have"} something to check{check.decided ? `, ${check.decided} decided` : ""}.</p>
      {check.byIssue.length ? <ul className="gh-checks" style={{ marginTop: 6 }}>{check.byIssue.slice(0, 6).map((x) => <li key={x.issue} className="is-bad"><AlertTriangle size={13} /><span>{x.issue}: {x.count}</span></li>)}</ul> : null}
      <p className="nx-note" style={{ marginTop: 10 }}><Info size={13} /><span>These are fixed checks against each claim&apos;s own source. They show what to look at. They do not decide, and Kaju does not decide.</span></p>
    </Block>
  ) : null;

  const packageBox = !itemReview ? (
    <Block title="Your decision on the package">
      {open ? (sample ? <div className="gh-acts"><TryLink sm>Accept</TryLink><TryLink quiet sm>Ask a question</TryLink><TryLink quiet sm>Return</TryLink></div> : (
        <div className="gh-form">
          <Field label="Comment" hint="Required to ask a question or return the package."><textarea value={pkgNote} maxLength={3000} onChange={(e) => setPkgNote(e.target.value)} /></Field>
          <div className="gh-acts">
            <button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => setDlg({ k: "package", kind: "accepted" })}>Accept</button>
            <button type="button" className="nx-btn is-sm is-quiet" disabled={!!busy || !pkgNote.trim()} onClick={() => setDlg({ k: "package", kind: "query" })}>Ask a question</button>
            <button type="button" className="nx-btn is-sm is-quiet" disabled={!!busy || !pkgNote.trim()} onClick={() => setDlg({ k: "package", kind: "returned" })}>Return</button>
          </div>
        </div>)) : <p className="nx-sub" style={{ marginTop: 0 }}>{pkg.status === "queried" ? "Waiting for the operator's answer." : pkg.status === "returned" ? "Returned to the operator." : `Decided${pkg.decided_by_name ? ` by ${pkg.decided_by_name}` : ""}${pkg.decided_at ? `, ${dayTime(pkg.decided_at)}` : ""}.`}</p>}
    </Block>
  ) : null;

  const finalizeBox = itemReview && open ? (
    <Block title="Close the review" note="When every claim is accepted, returned or rejected. The package becomes accepted or partly accepted.">
      <div className="gh-form">
        <Field label="Summary of the review"><textarea value={summary} maxLength={3000} onChange={(e) => setSummary(e.target.value)} placeholder="For example: 58 accepted; 3 returned for missing release photos" /></Field>
        {unsettled ? <p className="gh-hint">{unsettled} {unsettled === 1 ? "claim is" : "claims are"} still waiting or queried.</p> : null}
        <div className="gh-acts">{sample ? <TryLink sm>Close the review</TryLink> : <button type="button" className="nx-btn is-sm" disabled={!!busy || !!unsettled || !summary.trim()} onClick={() => setDlg({ k: "finalize" })}>Close the review</button>}</div>
      </div>
    </Block>
  ) : null;

  const paid = isDecided(pkg.status);
  const paymentBox = paid ? (
    <Block title="Payment reference" note="Record the official reference of a payment made outside StrayPaw, with its document. StrayPaw does not make or approve payments.">
      {sample ? <div className="gh-acts"><TryLink quiet sm>Record a payment reference</TryLink></div> : (
        <form className="gh-form" onSubmit={(e) => { e.preventDefault(); if (doc) setDlg({ k: "payment" }); }}>
          <div className="nx-fields gh-fields">
            <Field label="Amount in the document (INR)"><input type="number" inputMode="decimal" min={0} step="0.01" required value={pay.amount} onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} /></Field>
            <Field label="Paid on"><input type="date" required max={indiaToday()} value={pay.paidOn} onChange={(e) => setPay((p) => ({ ...p, paidOn: e.target.value }))} /></Field>
            <Field label="Official reference" wide><input required maxLength={200} value={pay.reference} onChange={(e) => setPay((p) => ({ ...p, reference: e.target.value }))} placeholder="Voucher or transfer number" /></Field>
            <Field label="Explanation" wide><textarea required maxLength={2000} value={pay.note} onChange={(e) => setPay((p) => ({ ...p, note: e.target.value }))} /></Field>
          </div>
          <div className="gh-acts"><FilePick label={doc ? doc.name : "Attach the document"} accept="application/pdf,image/jpeg,image/png,image/webp" onFiles={(f) => setDoc(f[0] ?? null)} /><span className="gh-hint">PDF, JPEG, PNG or WebP, up to 15 MB.</span></div>
          <div className="gh-acts"><button type="submit" className="nx-btn is-sm" disabled={!!busy || !doc}>Record the reference</button></div>
        </form>)}
    </Block>
  ) : null;

  const right = (
    <aside className="gh-side" aria-label="Checks and decision">
      {decideBox}{packageBox}{exceptions}{totals}{finalizeBox}{paymentBox}
      <p className="nx-note" style={{ marginTop: 18 }}><ShieldCheck size={13} /><span>Every decision is recorded in your name with the reason and checked against the audit after it is saved. Accepted means approved for payment. It is not a payment.</span></p>
    </aside>
  );

  /* ── Dialogs ── */
  const dialog = (() => {
    if (!dlg) return null;
    const close = () => { if (!busy) setDlg(null); };
    if (dlg.k === "item") return <SignedConfirm title={`${dlg.decision === "accepted" ? "Accept" : dlg.decision === "query" ? "Ask about" : dlg.decision === "returned" ? "Return" : "Reject"} ${dlg.item.case_code ?? dlg.item.title}`} who={who} where={office} busy={busy === `item:${dlg.item.key}`} danger={dlg.decision === "rejected"} onClose={close} onConfirm={() => void doItem(dlg.item, dlg.decision)}>
      <p>{dlg.decision === "accepted" ? `Accept ${units[dlg.item.key] ?? dlg.item.claimed_units} of ${dlg.item.claimed_units} at ${money(dlg.item.unit_rate)}.` : dlg.decision === "query" ? "The question goes to the operator, who answers it on this claim." : dlg.decision === "returned" ? "The claim goes back to the operator to correct." : "The claim is refused. The operator sees your reason."}</p>
      <p className="gh-hint">Your reason: “{(notes[dlg.item.key] ?? "").trim()}”</p>
    </SignedConfirm>;
    if (dlg.k === "batch") {
      const list = dlg.decision === "accepted" ? dlg.items.filter((i) => !i.missing.length) : dlg.items;
      const left = dlg.items.length - list.length;
      return <SignedConfirm title={`${dlg.decision === "accepted" ? "Accept" : dlg.decision === "query" ? "Ask about" : dlg.decision === "returned" ? "Return" : "Reject"} ${list.length} ${list.length === 1 ? "claim" : "claims"}`} who={who} where={office} busy={busy === "batch"} danger={dlg.decision === "rejected"} confirm={progress ?? "Record decisions"} onClose={close} onConfirm={() => { if (batchNote.trim() && list.length) void doBatch(dlg.decision, list); }} tick="I have checked each of these claims and record the same decision and reason for each, in my name.">
        <ul>{list.slice(0, 8).map((i) => <li key={i.key}>{i.case_code ?? i.title} · {i.procedure_label} · {money(i.claimed_amount)}</li>)}{list.length > 8 ? <li>and {list.length - 8} more</li> : null}</ul>
        {left ? <p className="gh-hint">{left} selected {left === 1 ? "claim has" : "claims have"} a missing requirement and {left === 1 ? "is" : "are"} left out of the acceptance.</p> : null}
        <Field label="Reason, recorded on each claim"><textarea value={batchNote} maxLength={3000} onChange={(e) => setBatchNote(e.target.value)} /></Field>
        {!batchNote.trim() ? <p className="gh-hint">Write the reason to continue.</p> : null}
      </SignedConfirm>;
    }
    if (dlg.k === "package") return <SignedConfirm title={dlg.kind === "accepted" ? "Accept this package" : dlg.kind === "query" ? "Ask the operator a question" : "Return this package"} who={who} where={office} busy={busy === `pkg:${dlg.kind}`} onClose={close} onConfirm={() => void doPackage(dlg.kind)}>
      <p>{dlg.kind === "accepted" ? `All ${records} records in ${pkg.title} are accepted as a whole. Accepted means approved for payment. It is not a payment.` : dlg.kind === "query" ? "The package goes back to the operator with your question and returns to you with their answer." : "The package goes back to the operator. They can correct it and send it again."}</p>
      {pkgNote.trim() ? <p className="gh-hint">Your comment: “{pkgNote.trim()}”</p> : null}
    </SignedConfirm>;
    if (dlg.k === "finalize") return <SignedConfirm title="Close the review" who={who} where={office} busy={busy === "finalize"} onClose={close} onConfirm={() => void doFinalize()} confirm="Close the review">
      <p>{items.filter((i) => i.decision === "accepted").length} accepted, {items.filter((i) => i.decision === "returned" || i.decision === "rejected").length} returned or rejected. The package becomes {items.every((i) => i.decision === "accepted") ? "accepted" : "partly accepted"}. Decisions can no longer change here.</p>
    </SignedConfirm>;
    return <SignedConfirm title="Record a payment reference" who={who} where={office} busy={busy === "payment"} onClose={close} onConfirm={() => void doPayment()} confirm="Record the reference" tick="This reference and document are from the official payment record.">
      <p>{money(pay.amount || "0")} paid on {pay.paidOn || "—"}, reference {pay.reference || "—"}, with {doc?.name ?? "no document"}. StrayPaw stores the reference; it does not make, approve or check a payment.</p>
    </SignedConfirm>;
  })();

  return (
    <Shell ws="gov" crumb={["Verification", pkg.title]}>
      {head}
      <TabBar id="gh-review" tabs={[["Review", unsettled || undefined], ["Records", cases.length], ["History", events.length]]} value={tab} onChange={setTab} label="Package sections" />
      {tab === "Review" ? <div className="gh-split">{left}{right}</div>
        : tab === "Records" ? <RecordsTab cases={cases} sample={sample} />
        : <HistoryTab pkg={pkg} events={events} items={items} sample={sample} />}
      {dialog}
    </Shell>
  );
}

/* ── Records: every record in the package, and an animal's operation history, read only ── */
function RecordsTab({ cases, sample }: { cases: PackageCase[]; sample: boolean }) {
  const [pick, setPick] = useState<string | null>(null);
  const [ops, setOps] = useState<{ events: OperationEvent[]; reviews: OperationReview[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!pick || sample) return;
    let alive = true; setOps(null); setErr(null);
    readOperations(pick).then((r) => { if (alive) setOps({ events: r.events, reviews: r.reviews }); }).catch((e) => { if (alive) setErr(errText(e)); });
    return () => { alive = false; };
  }, [pick, sample]);
  return (
    <div className="gh-body is-narrow">
      <ul className="gh-list" aria-label="Records in this package">
        {cases.map((c) => <li key={c.case_id}><div><b>{c.title || c.case_code}</b><small>{[c.case_code, c.city].filter(Boolean).join(" · ")} · {c.evidence.length} evidence {c.evidence.length === 1 ? "item" : "items"} · vet {c.vet_name ?? "not recorded"} · reviewed by {c.reviewer_name ?? "not recorded"}</small></div>
          <span className="gh-row-a">{c.evidence.filter((e) => e.url).slice(0, 3).map((e, i) => <OpenFile key={i} url={e.url}>{evLabel(e.kind)}</OpenFile>)}<button type="button" className="nx-btn is-sm is-quiet" aria-expanded={pick === c.case_id} onClick={() => setPick(pick === c.case_id ? null : c.case_id)}>Operation history</button></span></li>)}
      </ul>
      {!cases.length ? <Empty title="No records in this package" /> : null}
      {pick ? <Block title="Operation history" note="As recorded on the animal now. Read only here.">
        {sample ? <p className="nx-sub">Capture, sterilisation and release are listed here for a real package.</p> : err ? <Failed error={err} /> : !ops ? <Skeleton rows={3} /> : (
          <Timeline items={ops.events.map((e): TItem => { const r = ops.reviews.find((x) => x.event_id === e.id); return { id: e.id, when: dayTime(e.occurred_at), title: OPERATION_LABELS[e.kind as keyof typeof OPERATION_LABELS] ?? (e.kind === "intake" ? "Intake" : e.kind), who: e.actor_name, tone: r?.decision === "confirmed" ? "ok" : r?.decision === "returned" ? "bad" : undefined, body: r ? `${r.decision === "confirmed" ? "Confirmed" : "Returned"} by ${r.actor_name}: ${r.reason}` : undefined }; })} empty="No operations recorded on this animal." />)}
      </Block> : null}
    </div>
  );
}

/* ── History: the package's conversation and every decision on its claims, with the source each was made on ── */
type DecisionRow = { id: string; snapshot_id: string | null; case_id: string; claim_id: string | null; decision: string; note: string | null; actor_name: string; created_at: string };
function HistoryTab({ pkg, events, items, sample }: { pkg: Package; events: PackageEvent[]; items: ClaimItem[]; sample: boolean }) {
  const [rows, setRows] = useState<DecisionRow[] | null>(sample ? items.filter((i) => i.decision !== "pending").map((i) => ({ id: i.key, snapshot_id: null, case_id: i.case_id, claim_id: i.claim_id, decision: i.decision, note: i.note ?? "Checked against the contract terms.", actor_name: i.reviewer ?? "A. Reviewer", created_at: i.decided_at ?? new Date().toISOString() })) : null);
  const [err, setErr] = useState<string | null>(null);
  const [src, setSrc] = useState<DecisionSource | null>(null);
  const load = useCallback(async () => {
    if (sample) return;
    try {
      const r = await operationsDb().from("operations_item_decisions").select("id,snapshot_id,case_id,claim_id,decision,note,actor_name,created_at").eq("package_id", pkg.id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(100);
      if (r.error) throw r.error;
      setRows(r.data as DecisionRow[]); setErr(null);
    } catch (e) { setErr(errText(e)); setRows([]); }
  }, [pkg.id, sample]);
  useEffect(() => { void load(); }, [load]);
  const label = (r: DecisionRow) => items.find((i) => i.case_id === r.case_id && i.claim_id === r.claim_id)?.case_code ?? items.find((i) => i.case_id === r.case_id)?.title ?? "A claim";
  const inspect = async (id: string) => { try { setSrc(await operationRpc<DecisionSource>("operations_decision_source", { p_decision: id })); } catch (e) { toast({ text: errText(e), tone: "bad" }); } };
  return (
    <div className="gh-body is-narrow">
      <Block title="The package" note="Who sent, asked, answered and decided, and when.">
        <Timeline items={events.map((e) => ({ id: e.id, when: dayTime(e.created_at), title: <>{KIND[e.kind] ?? e.kind}{e.side === "reviewer" ? <> <Chip tone="accent">Office</Chip></> : null}</>, who: e.actor_name, body: e.body ?? undefined, tone: e.kind === "accepted" ? "ok" : e.kind === "returned" ? "bad" : e.kind === "query" ? "warn" : undefined }))} empty="Nothing has happened on this package yet." />
      </Block>
      <Block title="Decisions on claims" note="Newest first. Each decision keeps the source as it was when the package was sent.">
        {err ? <Failed error={err} retry={() => void load()} /> : rows === null ? <Skeleton rows={3} /> : rows.length ? (
          <ul className="gh-list">{rows.map((r) => <li key={r.id}><div><b>{label(r)}: {DECISION_LABEL[r.decision] ?? r.decision}</b><small>{r.actor_name} · {dayTime(r.created_at)}{r.note ? ` · ${r.note}` : ""}</small></div>
            <span className="gh-row-a">{r.snapshot_id && !sample ? <button type="button" className="nx-btn is-sm is-quiet" onClick={() => void inspect(r.id)}><FileSearch size={13} />Source</button> : null}</span></li>)}</ul>
        ) : <p className="nx-sub">No claim has been decided yet.</p>}
      </Block>
      {src ? <Modal title="The source this decision was made on" onClose={() => setSrc(null)} wide>
        <Props items={[["Taken", dayTime(src.created_at)], ["Fingerprint", <code key="h" style={{ overflowWrap: "anywhere", fontSize: 11.5 }}>{src.hash}</code>]]} />
        <h3 className="nx-h3">Evidence</h3>
        <ul className="gh-ev">{src.source.evidence.map((e, i) => <li key={i}><span className="gh-ck is-on" aria-hidden><Tick size={10} strokeWidth={3} /></span><span>{evLabel(e.kind)}<small>{e.location ?? ""}</small></span>{e.url ? <OpenFile url={e.url}>Open</OpenFile> : <span />}</li>)}</ul>
        <h3 className="nx-h3">Sign-offs</h3>
        <p className="nx-sub">{src.source.attestations.map((a) => `${a.kind === "vet_authorised" ? "Veterinarian" : a.kind === "evidence_reviewed" ? "Evidence review" : a.kind}: ${a.actor}`).join(" · ") || "None recorded"}</p>
        <h3 className="nx-h3">Operations</h3>
        <Timeline items={src.source.operations.map((o) => ({ id: o.id, when: dayTime(o.occurred_at), title: OPERATION_LABELS[o.kind as keyof typeof OPERATION_LABELS] ?? o.kind, body: String(o.payload.notes ?? "") || undefined }))} empty="No operations were part of the source." />
      </Modal> : null}
    </div>
  );
}
