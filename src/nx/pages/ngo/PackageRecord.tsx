"use client";

import { RecordThread } from "../../RecordThread";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Download, Send } from "lucide-react";
import { shortCode } from "@/lib/caseCode";
import { EVIDENCE_LABEL, NotEnabled, offices, packageAct, packageById, packageCases, packageEvents, PACKAGE_LABEL, type EvidenceKind, type Office, type Package, type PackageCase, type PackageEvent } from "@/lib/abc";
import { actionsFor, isDraftPackage } from "@/lib/machines/package";
import { money, readContracts, readReconciliation, type ClaimItem, type Contract, type ContractRate, type DecisionSource, type Reconciliation } from "@/lib/reconciliation";
import { Shell } from "../../Shell";
import { Chip, Sample } from "../../ui";
import { Confirm, Denied, Failed, Modal, Props, RecordHead, Skeleton, TabBar, Timeline, Empty, day, dayTime, errText, useAct } from "../../kit";
import { leadOrCoord, requestFor } from "../../data/ngo-setup";
import { answerItem, configureClaims, decisionSource, downloadPackage, itemDecisions, type ItemDecision } from "../../data/ngo-submissions";
import { Drawer, EvidenceLink, Grid, TryLink, Views, plural, useWho, type GCol } from "./frame";
import { PKG_TONE, period } from "./subs/Packages";
import { S_CONTRACTS, S_OFFICES, S_PACKAGE_CASES, S_PACKAGE_EVENTS, S_PACKAGES, S_RATES, S_RECON } from "./sample";

/* One report package, as the operator sees it: its claims animal by animal with the office's decisions, the records
   and evidence inside, the conversation with the reviewing office, and what the operator can do next (submit, answer
   a query, answer one claim, configure a draft's claims, download). abc_package_act and the operations functions
   decide; the reviewer's side is the government workspace. Accepted means approved for payment, not paid. */

const KIND: Record<string, string> = { created: "Prepared", submitted: "Submitted", query: "Query from the office", answer: "Answer", accepted: "Accepted", returned: "Returned", partial_review: "Partial package decision", sanctioned: "Payment sanctioned" };
const DECISION: Record<ClaimItem["decision"], { label: string; tone: "plain" | "ok" | "warn" | "bad" }> = { pending: { label: "Waiting", tone: "plain" }, accepted: { label: "Accepted", tone: "ok" }, query: { label: "Queried", tone: "warn" }, returned: { label: "Returned", tone: "bad" }, rejected: { label: "Rejected", tone: "bad" } };
type Filter = "all" | ClaimItem["decision"];
type Data = { pkg: Package; cases: PackageCase[]; events: PackageEvent[]; offices: Office[] };
const TABS = ["Claims", "Records and evidence", "Discussion"] as const;
type Tab = (typeof TABS)[number];

export function PackageRecord({ id }: { id: string }) {
  const who = useWho();
  const sampleId = id.startsWith("sample-");
  const [state, setState] = useState<{ s: "loading" } | { s: "ok"; d: Data } | { s: "missing" } | { s: "off" } | { s: "error"; e: string }>({ s: "loading" });
  const load = useCallback(async () => {
    try {
      const pk = await packageById(id);
      if (!pk) { setState({ s: "missing" }); return; }
      const [c, e, o] = await Promise.all([packageCases(id), packageEvents(id), offices().catch(() => [] as Office[])]);
      setState({ s: "ok", d: { pkg: pk, cases: c, events: e, offices: o } });
    } catch (x) { setState(x instanceof NotEnabled ? { s: "off" } : { s: "error", e: errText(x) }); }
  }, [id]);
  const live = who.ready && !who.sample && !!who.ngo;
  useEffect(() => { if (live) void load(); }, [live, load]);
  const crumb: [string, string] = ["Submissions & Reports", state.s === "ok" ? state.d.pkg.title : who.sample ? S_PACKAGES.find((p) => p.id === id)?.title ?? "Package" : "Package"];
  if (!who.ready) return <Shell crumb={crumb}><div className="nx-page"><Skeleton rows={6} label="Opening the package" /></div></Shell>;
  if (who.notNgo) return <Shell crumb={crumb}><div className="nx-page"><Denied what="This package belongs to an NGO workspace" why="Your organisation reviews packages under Verification in the government workspace." back={{ href: "/next/gov/verification", label: "Open Verification" }} /></div></Shell>;
  if (who.sample) {
    const pk = S_PACKAGES.find((p) => p.id === id) ?? (sampleId ? null : S_PACKAGES[1]);
    if (!pk) return <Shell crumb={crumb}><div className="nx-page"><Empty title="This sample package does not exist" action={<Link className="nx-btn is-quiet" href="/next/ngo/submissions">All packages</Link>} /></div></Shell>;
    return <View sample d={{ pkg: pk, cases: S_PACKAGE_CASES, events: S_PACKAGE_EVENTS, offices: S_OFFICES }} role="coordinator" reload={async () => {}} />;
  }
  if (state.s === "loading") return <Shell crumb={crumb}><div className="nx-page"><Skeleton rows={6} label="Reading the package" /></div></Shell>;
  if (state.s === "off") return <Shell crumb={crumb}><div className="nx-page"><Empty title="Packages are not switched on for this organisation yet" /></div></Shell>;
  if (state.s === "missing") return <Shell crumb={crumb}><div className="nx-page"><Denied what="This package is not available to you" why="It may belong to another organisation, or it no longer exists." back={{ href: "/next/ngo/submissions", label: "All packages" }} /></div></Shell>;
  if (state.s === "error") return <Shell crumb={crumb}><div className="nx-page"><Failed error={state.e} retry={() => void load()} /></div></Shell>;
  return <View sample={false} d={state.d} role={who.role} reload={load} />;
}

function View({ sample, d, role, reload }: { sample: boolean; d: Data; role: string | null; reload: () => Promise<void> }) {
  const { pkg: p, cases, events } = d;
  const { busy, run } = useAct();
  const [tab, setTab] = useState<Tab>("Claims");
  const [asking, setAsking] = useState<"submit" | "answer" | null>(null);
  const [body, setBody] = useState("");
  const operator = leadOrCoord(role);
  const office = d.offices.find((o) => o.id === p.office_id)?.name ?? "the reviewing office";
  const can = actionsFor("operator", p.status);
  const showActs = !p.item_review_enabled || ["draft", "queried"].includes(p.status);
  const records = p.summary?.records ?? cases.length;
  const act = (kind: "submitted" | "answer") => void run(kind, () => packageAct(p.id, kind, body), { ok: kind === "submitted" ? `Submitted to ${office}.` : "Answer sent; the package is back with the office." }).then(async (x) => { setAsking(null); if (x.ok) { setBody(""); await reload(); } });
  const download = (format: "pdf" | "xlsx") => void run(`dl:${format}`, () => downloadPackage(p.id, format), { ok: `${format.toUpperCase()} download prepared.` });
  return (
    <Shell crumb={["Submissions & Reports", p.title]}>
      <RecordHead title={<>{p.title}{sample ? <Sample /> : null}</>}
        sub={<><Chip tone={PKG_TONE[p.status] ?? "plain"}>{PACKAGE_LABEL[p.status] ?? p.status}</Chip><span>{office}</span><span>· {period(p)}</span></>}
        actions={<>
          {sample ? <><TryLink quiet><Download size={13} />Download PDF</TryLink><TryLink quiet><Download size={13} />Download XLSX</TryLink></>
            : operator ? <><button type="button" className="nx-btn is-quiet" disabled={!!busy} onClick={() => download("pdf")}><Download size={13} />{busy === "dl:pdf" ? "Preparing…" : "Download PDF"}</button><button type="button" className="nx-btn is-quiet" disabled={!!busy} onClick={() => download("xlsx")}><Download size={13} />{busy === "dl:xlsx" ? "Preparing…" : "Download XLSX"}</button></> : null}
          <Link className="nx-btn is-quiet" href="/next/ngo/submissions">All packages</Link>
        </>} />
      <TabBar id="pkg" tabs={TABS as unknown as Tab[]} value={tab} onChange={setTab} label="Package sections" />
      <div className="nx-rec">
        <div>
          <h3 className="nx-h3">Package</h3>
          <Props items={[["Status", <Chip key="s" tone={PKG_TONE[p.status] ?? "plain"}>{PACKAGE_LABEL[p.status]}</Chip>], ["Office", office], ["Period", period(p)], ["Records", <span key="r" className="num">{records}</span>], ["Vet-authorised", p.summary?.vet_authorised ?? "Not counted"], ["Evidence items", p.summary?.evidence_items ?? "Not counted"], ["Prepared", day(p.created_at)], ["Submitted", p.submitted_at ? dayTime(p.submitted_at) : "Not yet"], ["Decided", p.decided_by_name ? `${PACKAGE_LABEL[p.status]} by ${p.decided_by_name}` : "Not yet"]]} />
          <p className="nx-foot" style={{ marginTop: 14 }}>Figures are computed by the database from the records inside and frozen with the package. Accepted means approved for payment. It is not a payment.</p>
        </div>
        <div className="ns-rec-main">
          {tab === "Claims" ? (operator || sample ? <Claims sample={sample} pkg={p} cases={cases} /> : <Denied what="Claims are for coordinators and leads" why="Contract reconciliation is available to your coordinator or organisation lead. The records in this package are under Records and evidence." />)
            : tab === "Discussion" ? (sample ? <p className="nx-sub">Discussion about this package with your team appears here.</p> : <RecordThread kind="package" id={p.id} label={p.title} />)
            : <Records cases={cases} sample={sample} />}
        </div>
        <div>
          <h3 className="nx-h3">Next step</h3>
          {sample ? (p.status === "queried" ? <div className="ns-compose"><p className="nx-sub">The office asked a question. Answer it here; the package goes back to them.</p><TryLink><Send size={13} />Answer the query</TryLink></div> : can.includes("submitted") ? <TryLink><Send size={13} />Submit package</TryLink> : <p className="nx-sub">{p.status === "accepted" ? "Accepted by the reviewing office. It is not a payment." : "With the reviewing office."}</p>)
            : !operator ? <p className="nx-sub">A coordinator or lead submits packages and answers the office.</p>
            : showActs && can.includes("submitted") ? <div className="ns-compose"><p className="nx-sub">{p.status === "returned" ? "Returned by the office. Correct it, then submit again." : "Ready to send when its claims are right."}</p><div><button type="button" className="nx-btn" disabled={!!busy} onClick={() => setAsking("submit")}><Send size={13} />Submit package</button></div></div>
            : showActs && can.includes("answer") ? <div className="ns-compose"><label className="nx-field"><span>Your answer to the office</span><textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What you checked and what you changed" /></label><div><button type="button" className="nx-btn" disabled={!!busy || !body.trim()} onClick={() => setAsking("answer")}><Send size={13} />Send answer</button></div></div>
            : <p className="nx-sub">{p.status === "accepted" ? "Accepted by the reviewing office. Accepted means approved for payment. It is not a payment." : p.status === "partially_accepted" ? "Partly accepted. Each claim's decision is under Claims." : p.item_review_enabled && ["returned", "submitted"].includes(p.status) ? "The office decides claim by claim. Answer queried or returned claims under Claims." : "With the reviewing office."}</p>}
          <h3 className="nx-h3">Conversation</h3>
          <Timeline items={events.map((e) => ({ id: e.id, when: dayTime(e.created_at), who: e.actor_name, title: <>{KIND[e.kind] ?? e.kind}{e.side === "reviewer" ? <> <Chip tone="accent">Office</Chip></> : null}</>, body: e.body ?? undefined, tone: e.kind === "accepted" ? "ok" : e.kind === "query" || e.kind === "returned" ? "warn" : undefined }))} empty="Nothing recorded yet." />
        </div>
      </div>
      {asking === "submit" ? <Confirm title="Submit this package" confirm="Submit package" busy={busy === "submitted"} onClose={() => setAsking(null)} onConfirm={() => act("submitted")}><p>{p.title} goes to {office} with {plural(records, "record")}. The office can then see it, ask questions, accept or return it. Recorded in your name.</p></Confirm> : null}
      {asking === "answer" ? <Confirm title="Send your answer" confirm="Send answer" busy={busy === "answer"} onClose={() => setAsking(null)} onConfirm={() => act("answer")}><p>Your answer goes to {office} and the package goes back to them for review.</p><p className="nx-note"><span>{body.trim()}</span></p></Confirm> : null}
    </Shell>
  );
}

/* ── Records and evidence ── */
function Records({ cases, sample }: { cases: PackageCase[]; sample: boolean }) {
  const cols: GCol<PackageCase>[] = [
    { label: "Record", width: "minmax(0, 1.3fr)", render: (c) => <span className="nx-cell-main"><span><b>{sample ? c.title || c.case_code : <Link href={`/next/ngo/cases/${c.case_id}`} className="ns-link">{c.title || shortCode(c.case_code)}</Link>}</b><small>{[shortCode(c.case_code, ""), c.city].filter(Boolean).join(" · ")}</small></span></span> },
    { label: "Evidence", width: "minmax(0, 2fr)", keep: true, render: (c) => <span className="ns-row-acts" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>{c.evidence.length ? c.evidence.map((e, i) => e.url ? <EvidenceLink key={i} url={e.url}>{EVIDENCE_LABEL[e.kind as EvidenceKind] ?? e.kind}</EvidenceLink> : <span key={i} className="nx-t2">{EVIDENCE_LABEL[e.kind as EvidenceKind] ?? e.kind}{e.location ? `: ${e.location}` : ""}</span>) : <span className="nx-t3">None</span>}</span> },
    { label: "Signed by", width: "minmax(0, .8fr)", render: (c) => <span className="nx-t2 ns-cell">{c.vet_name ?? "Not recorded"}</span> },
    { label: "Reviewed by", width: "minmax(0, .8fr)", render: (c) => <span className="nx-t2 ns-cell">{c.reviewer_name ?? "Not recorded"}</span> },
  ];
  return <section><div className="nx-sec-h"><h2>Records in this package</h2><span className="nx-count">{cases.length}</span></div><Grid label="Records in this package" cols={cols} rows={cases} rowKey={(c) => c.case_id} empty={<b>No records in this package.</b>} /><p className="nx-foot">Stored files open through a link that expires after five minutes.</p></section>;
}

/* ── Claims, animal by animal ── */
function Claims({ sample, pkg, cases }: { sample: boolean; pkg: Package; cases: PackageCase[] }) {
  const [data, setData] = useState<Reconciliation | null>(sample ? S_RECON : null);
  const [catalog, setCatalog] = useState<{ contracts: Contract[]; rates: ContractRate[] }>(sample ? { contracts: S_CONTRACTS, rates: S_RATES } : { contracts: [], rates: [] });
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState(false);
  const load = useCallback(async () => {
    if (sample) return;
    try { const [r, c] = await Promise.all([readReconciliation(pkg.id), readContracts()]); setData(r); setCatalog(c); setError(null); }
    catch (x) { setError(errText(x)); }
  }, [pkg.id, sample]);
  useEffect(() => { void load(); }, [load, pkg.status]);
  if (error && !data) return <Failed error={`Claims could not be read. ${error}`} retry={() => void load()} />;
  if (!data) return <Skeleton rows={5} label="Reading claims" />;
  const count = (k: ClaimItem["decision"]) => data.items.filter((i) => i.decision === k).length;
  const shown = data.items.filter((i) => filter === "all" || i.decision === filter);
  const open = data.items.find((i) => i.key === openKey) ?? null;
  const cols: GCol<ClaimItem>[] = [
    { label: "Record", width: "minmax(0, 1.4fr)", render: (i) => <span className="nx-cell-main"><span><b>{i.title || i.case_code}</b><small>{i.procedure_label} · {money(i.claimed_amount)}</small></span></span> },
    { label: "Code", width: "104px", render: (i) => <span className="ns-mono nx-t2">{shortCode(i.case_code)}</span> },
    { label: "Units and rate", width: "128px", render: (i) => <span className="num nx-t2">{i.claimed_units} × {money(i.unit_rate)}</span> },
    { label: "Amount", width: "104px", render: (i) => <span className="num">{money(i.claimed_amount)}</span> },
    { label: "Decision", width: "104px", keep: true, render: (i) => <Chip tone={DECISION[i.decision].tone}>{DECISION[i.decision].label}</Chip> },
  ];
  return (
    <section>
      <div className="nx-sec-h"><h2>Claims, animal by animal</h2><span className="nx-count">{data.items.length}</span>
        {sample && isDraftPackage(pkg.status) ? <span style={{ marginLeft: "auto" }}><TryLink quiet small>Configure claims</TryLink></span> : !sample && isDraftPackage(pkg.status) ? <span style={{ marginLeft: "auto" }}><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setConfiguring(true)}>Configure claims</button></span> : null}
      </div>
      <p className="ns-small" style={{ marginBottom: 8 }}>{data.contract ? `${data.contract.name} · version ${data.contract.version}${data.contract.illustrative ? " · illustrative terms" : ""}` : "No contract rates linked to this package, so amounts are not known."}</p>
      <dl className="ns-dl"><div><dt>Claimed</dt><dd>{money(data.claimed_amount)}</dd></div><div><dt>Reviewed</dt><dd>{money(data.reviewed_amount)}</dd></div><div><dt>Accepted</dt><dd style={{ color: "var(--ok)" }}>{money(data.accepted_amount)}</dd></div><div><dt>Payment evidence</dt><dd>{money(data.paid_amount)}</dd></div></dl>
      {data.payment_exceeds_accepted ? <p className="nx-note" style={{ marginTop: 10 }}><span>Payment references exceed the accepted claims. No payment was initiated here.</span></p> : null}
      {!data.item_review_enabled ? <p className="nx-note" style={{ marginTop: 10 }}><span>This package was prepared before animal-by-animal review. The office decides it as a whole.</span></p> : null}
      {error ? <p className="nx-foot ns-note-bad" role="alert">{error}</p> : null}
      <Views id="cl" value={filter} onChange={setFilter} views={[{ id: "all", label: "All", count: data.items.length }, { id: "pending", label: "Waiting", count: count("pending") }, { id: "accepted", label: "Accepted", count: count("accepted") }, { id: "query", label: "Queried", count: count("query") }, { id: "returned", label: "Returned", count: count("returned") }, { id: "rejected", label: "Rejected", count: count("rejected") }]} />
      <Grid label="Claims" cols={cols} rows={shown} rowKey={(i) => i.key} rowLabel={(i) => i.title || i.case_code || "claim"} onOpen={(i) => setOpenKey(i.key)} openKey={openKey} empty={<b>{data.items.length ? "No claim in this view" : "No claims configured yet"}</b>} />
      <AnimatePresence>{open ? <Drawer key={open.key} head={open.procedure_label} title={open.title || shortCode(open.case_code)} sub={<><Chip tone={DECISION[open.decision].tone}>{DECISION[open.decision].label}</Chip> {money(open.claimed_amount)}</>} onClose={() => setOpenKey(null)}>
        <ClaimDetail sample={sample} pkg={pkg} item={open} source={cases.find((c) => c.case_id === open.case_id) ?? null} reviewEnabled={data.item_review_enabled} onChanged={load} />
      </Drawer> : null}</AnimatePresence>
      {configuring ? <Configure pkg={pkg} items={data.items} current={data.contract?.id ?? ""} catalog={catalog} onClose={() => setConfiguring(false)} onDone={() => { setConfiguring(false); void load(); }} /> : null}
    </section>
  );
}

function ClaimDetail({ sample, pkg, item, source, reviewEnabled, onChanged }: { sample: boolean; pkg: Package; item: ClaimItem; source: PackageCase | null; reviewEnabled: boolean; onChanged: () => Promise<void> }) {
  const { busy, run } = useAct();
  const requests = useRef(new Map<string, string>());
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  const evidence = item.evidence_snapshot ?? source?.evidence ?? [];
  const vet = item.signoffs_snapshot ? item.signoffs_snapshot.find((s) => s.kind === "vet_authorised")?.actor : source?.vet_name;
  const rev = item.signoffs_snapshot ? item.signoffs_snapshot.find((s) => s.kind === "evidence_reviewed")?.actor : source?.reviewer_name;
  const answer = () => void run("answer", () => answerItem(requestFor(requests.current, ["answer", item.key, note.trim()]), pkg.id, item.case_id, item.claim_id, note.trim()), { ok: "Response sent; the claim is back in the office's review queue. Source and audit checked." }).then(async (x) => { setAsking(false); if (x.ok) { setNote(""); await onChanged(); } });
  return (
    <>
      <Props items={[["Decision", <span key="d">{item.decision === "pending" ? "Awaiting individual review" : DECISION[item.decision].label}{item.decision === "accepted" && item.accepted_units !== null ? ` · ${item.accepted_units} accepted` : ""}</span>], ["Reviewer", item.reviewer ?? "Not yet"], ["Decided", item.decided_at ? dayTime(item.decided_at) : "Not yet"], ["Units and rate", `${item.claimed_units} × ${money(item.unit_rate)}`], ["Vet authorisation", vet ?? "Not recorded"], ["Coordinator review", rev ?? "Not recorded"]]} />
      {item.note ? <p className="nx-note" style={{ marginTop: 12 }}><span>{item.note}</span></p> : null}
      {item.missing.length ? <p className="nx-foot ns-note-bad">Requirements not complete: {item.missing.join("; ")}</p> : null}
      {!sample ? <p style={{ marginTop: 10 }}><Link className="ns-link" href={`/next/ngo/cases/${item.case_id}`}>Open the case, its evidence and clinical record</Link></p> : null}
      {reviewEnabled && (item.decision === "query" || item.decision === "returned") ? (sample ? <div className="ns-acts"><TryLink small>Answer this claim</TryLink></div> : <div className="ns-compose" style={{ marginTop: 14 }}>
        <label className="nx-field"><span>Your response to the office</span><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you checked or corrected for this animal" /></label>
        <div><button type="button" className="nx-btn is-sm" disabled={!note.trim() || !!busy} onClick={() => setAsking(true)}><Send size={12} />Send response</button></div>
      </div>) : null}
      <h3 className="nx-h3">Evidence {item.snapshot_at ? `as submitted, ${dayTime(item.snapshot_at)}` : "(draft source, not yet submitted)"}</h3>
      {evidence.length ? <ul className="ns-list">{evidence.map((e, j) => <li key={j}>{e.url ? <EvidenceLink url={e.url}>{EVIDENCE_LABEL[e.kind as EvidenceKind] ?? e.kind}</EvidenceLink> : `${EVIDENCE_LABEL[e.kind as EvidenceKind] ?? e.kind}: ${e.location ?? "not recorded"}`}</li>)}</ul> : <p className="nx-sub">No evidence listed.</p>}
      {!sample ? <History pkg={pkg.id} item={item} /> : null}
      {asking ? <Confirm title="Send this response" confirm="Send response" busy={busy === "answer"} onClose={() => setAsking(false)} onConfirm={answer}><p>Your response goes to the reviewing office and this claim returns to its review queue. Recorded in your name.</p></Confirm> : null}
    </>
  );
}

function History({ pkg, item }: { pkg: string; item: ClaimItem }) {
  const [rows, setRows] = useState<ItemDecision[] | null>(null);
  const [more, setMore] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [src, setSrc] = useState<DecisionSource | null>(null);
  const load = async (reset: boolean) => {
    setBusy(true);
    try { const r = await itemDecisions(pkg, item.case_id, item.claim_id, reset ? null : rows?.at(-1) ?? null); setRows((v) => (reset ? r : [...(v ?? []), ...r])); setMore(r.length === 20); setErr(null); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  return (
    <details className="ns-details" onToggle={(e) => { if (e.currentTarget.open && rows === null && !busy) void load(true); }}>
      <summary>Decision history</summary>
      {err ? <p className="ns-note-bad" role="alert">{err}</p> : null}
      {rows === null ? <p className="nx-sub">Reading…</p> : rows.length ? <Timeline items={rows.map((r) => ({ id: r.id, when: dayTime(r.created_at), who: r.actor_name, title: r.decision.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), body: r.note, action: r.snapshot_id ? <button type="button" className="nx-btn is-quiet is-sm" onClick={() => void decisionSource(r.id).then(setSrc).catch(() => setErr("The submitted source could not be read."))}>Inspect the source for this decision</button> : undefined }))} /> : <p className="nx-sub">No decisions recorded for this claim yet.</p>}
      {rows && more && rows.length ? <button type="button" className="nx-btn is-quiet is-sm" disabled={busy} onClick={() => void load(false)}>Read older decisions</button> : null}
      {src ? <Modal title={`Submitted source, ${dayTime(src.created_at)}`} onClose={() => setSrc(null)}>
        <p className="ns-small">Source hash</p><p><code className="ns-code ns-wrap">{src.hash}</code></p>
        <h3 className="nx-h3">Evidence</h3>{src.source.evidence.length ? <ul className="ns-list">{src.source.evidence.map((e, i) => <li key={i}>{e.url ? <EvidenceLink url={e.url}>{EVIDENCE_LABEL[e.kind as EvidenceKind] ?? e.kind}</EvidenceLink> : `${EVIDENCE_LABEL[e.kind as EvidenceKind] ?? e.kind}: ${e.location ?? "not recorded"}`}</li>)}</ul> : <p className="nx-sub">None.</p>}
        <h3 className="nx-h3">Sign-offs</h3><p className="nx-sub">{src.source.attestations.map((a) => `${a.kind.replace(/_/g, " ")}: ${a.actor}`).join(" · ") || "None recorded."}</p>
        <h3 className="nx-h3">Operations</h3>{src.source.operations.length ? <ul className="ns-list">{src.source.operations.map((o) => <li key={o.id}>{o.kind} · {dayTime(o.occurred_at)}{o.payload.notes ? ` · ${String(o.payload.notes)}` : ""}</li>)}</ul> : <p className="nx-sub">None.</p>}
      </Modal> : null}
    </details>
  );
}

/* ── A draft's claims (operations_configure_package) ── */
function Configure({ pkg, items, current, catalog, onClose, onDone }: { pkg: Package; items: ClaimItem[]; current: string; catalog: { contracts: Contract[]; rates: ContractRate[] }; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAct();
  const requests = useRef(new Map<string, string>());
  const eligible = catalog.contracts.filter((c) => c.ngo_id === pkg.ngo_id && c.office_id === pkg.office_id && c.starts_on <= pkg.period_start && c.ends_on >= pkg.period_end);
  const [contract, setContract] = useState(current);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(items.filter((i) => i.claim_id).map((i) => `${i.case_id}:${catalog.rates.find((r) => r.contract_id === current && r.code === i.procedure)?.id ?? ""}`)));
  const [asking, setAsking] = useState(false);
  const rates = catalog.rates.filter((r) => r.contract_id === contract);
  const cases = [...new Map(items.map((i) => [i.case_id, i])).values()];
  const claims = [...chosen].filter((k) => !k.endsWith(":")).sort().map((k) => { const [case_id, rate_id] = k.split(":"); return { case_id, rate_id, units: 1 }; });
  const save = () => void run("claims", () => configureClaims(requestFor(requests.current, ["claims", contract, claims]), pkg.id, contract || null, claims), { ok: "Claims saved; the source and audit were checked." }).then((x) => { if (x.ok) onDone(); else setAsking(false); });
  if (asking) return <Confirm title="Save these claims" confirm="Save claims" busy={busy === "claims"} onClose={() => setAsking(false)} onConfirm={save}><p>{plural(claims.length, "claim")} on {cases.length} {cases.length === 1 ? "record" : "records"}{contract ? `, priced from ${eligible.find((c) => c.id === contract)?.name ?? "the chosen contract"}` : ", with no contract: amounts stay unknown"}. The package stays a draft.</p></Confirm>;
  return (
    <Modal wide title="Configure claims" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" onClick={() => setAsking(true)}>Review</button></>}>
      <label className="nx-field"><span>Package contract</span><select value={contract} onChange={(e) => { setContract(e.target.value); setChosen(new Set()); }}><option value="">No contract · amounts unknown</option>{eligible.map((c) => <option key={c.id} value={c.id}>{c.name} · v{c.version}{c.illustrative ? " · illustrative" : ""}</option>)}</select><small>Only versions covering {period(pkg)} for this office are offered. <Link className="ns-link" href="/next/ngo/submissions?tab=contracts">Contract terms</Link></small></label>
      {!cases.length ? <p className="nx-sub">This package has no records to claim.</p> : !rates.length ? <p className="nx-sub">{contract ? "This contract has no rates." : "Choose a contract to pick procedures."}</p> : cases.map((c) => (
        <fieldset key={c.case_id} className="ns-set"><legend>{c.title || c.case_code}</legend>
          {rates.map((r) => { const key = `${c.case_id}:${r.id}`; return <label key={r.id} className="ns-check"><input type="checkbox" checked={chosen.has(key)} onChange={(e) => setChosen((old) => { const n = new Set(old); if (e.target.checked) n.add(key); else n.delete(key); return n; })} />{r.label} · {money(r.unit_rate)} · one animal, one claim</label>; })}
        </fieldset>
      ))}
    </Modal>
  );
}
