"use client";

/* One report package, as the operator sees it (submit, answer queries) or
   as the reviewing office sees it (query, accept, return). The same
   records, figures and thread on both sides; the database decides which
   actions each person may take and refuses the rest. */

import { Rail } from "@/sp/ui/Rail";
import { shortCode } from "@/lib/caseCode";
import {useMembership} from '../shell/Shell';
import {Reconciliation} from "./Reconciliation";
import {OperationsPanel} from "../ngo/OperationsPanel";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { EVIDENCE_LABEL, NotEnabled, PACKAGE_LABEL, orgNames, packageAct, packageById, packageCases, packageEvents, type EvidenceKind, type Package, type PackageCase, type PackageEvent } from "@/lib/abc";
import { Btn, Empty, Head, Page, Panel, Section, Split, Table, Tag, type Col } from "@/ws/kit";
import { Pager, SkelRows, pageOf } from "./Pager";
import { period } from "./Packages";
import { EvidenceLink } from "./EvidenceLink";
import { isRecordingDemo } from "@/lib/recording-demo";
import { DEMO_RATE, demoSanction, demoSanctionPayment } from "@/lib/demo/abc-demo";
import "../ngo/ngo.css";
import "./PackageView.k.css";
import { actionsFor, type PackageAction } from "@/lib/machines/package";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const KIND: Record<string, string> = { created: "Prepared", submitted: "Submitted", query: "Query", answer: "Answer", accepted: "Accepted", returned: "Returned", partial_review:"Partial package decision", sanctioned: "Payment sanctioned" };

export function PackageView({ id, side }: { id: string; side: "operator" | "reviewer" }) {
  const mem=useMembership(),canExport=side==="reviewer"?mem.reviewer:["admin","coordinator"].includes(mem.role??"");
  const [recordPage,setRecordPage]=useState(0);
  const [operationCase,setOperationCase]=useState<string|null>(null);
  const [p, setP] = useState<Package | null>(null);
  const [cases, setCases] = useState<PackageCase[]>([]);
  const [ev, setEv] = useState<PackageEvent[]>([]);
  const [org, setOrg] = useState("");
  const [state, setState] = useState<"loading" | "ok" | "missing" | "off" | "error">("loading");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [body, setBody] = useState("");

  const load = useCallback(async () => {
    try {
      const pk = await packageById(id);
      if (!pk) { setState("missing"); return; }
      const [c, e, names] = await Promise.all([packageCases(id), packageEvents(id), orgNames([pk.ngo_id])]);
      setP(pk); setCases(c); setEv(e); setOrg(names[pk.ngo_id] ?? "The operator"); setState("ok");
    } catch (x) { if (x instanceof NotEnabled) setState("off"); else { setErr((x as Error).message); setState("error"); } }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const act = async (kind: PackageAction, done: string) => {
    setBusy(true); setMsg(null);
    try { await packageAct(id, kind, body); setBody(""); setMsg({ ok: true, text: done }); await load(); }
    catch (x) { setMsg({ ok: false, text: (x as Error).message }); }
    finally { setBusy(false); }
  };
  const download = async (format: "pdf" | "xlsx") => {
    setBusy(true); setMsg(null);
    if (isRecordingDemo) { await new Promise((r) => setTimeout(r, 600)); setMsg({ ok: true, text: `${format.toUpperCase()} prepared: ledger, evidence index and vet sign-offs for ${cases.length} records.` }); setBusy(false); return; }
    try {
      const session = await getSupabase()?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) throw new Error("Sign in again to export this package.");
      const response = await fetch("/api/files/package", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id, format }) });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not export this package.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `straypaw-package-${id}.${format}`;
      document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg({ ok: true, text: `${format.toUpperCase()} download prepared.` });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  };

  const claims = side === "reviewer" || ["admin", "coordinator"].includes(mem.role ?? "");
  const recordCols: Col<PackageCase>[] = [
    { key: "rec", label: "Record", width: "minmax(0, 1.2fr)", render: (c) => (side === "operator" ? <Link className="pv-open" href={`/ngo/verification/${c.case_id}`}>{c.title || c.case_code}</Link> : c.title || c.case_code) },
    { key: "code", label: "Code and place", render: (c) => [c.case_code ? shortCode(c.case_code) : null, c.city].filter(Boolean).join(" · ") },
    { key: "ev", label: "Evidence", width: "minmax(0, 2fr)", render: (c) => <span className="pv-ev">{c.evidence.map((e, i) => e.url
      ? <EvidenceLink key={i} url={e.url}>{EVIDENCE_LABEL[e.kind as EvidenceKind] ?? e.kind}</EvidenceLink>
      : <span key={i}>{EVIDENCE_LABEL[e.kind as EvidenceKind] ?? e.kind}{e.location ? `: ${e.location}` : ""}</span>)}</span> },
    { key: "vet", label: "Signed by", render: (c) => c.vet_name ?? <span className="kx-none">Not recorded</span> },
    { key: "rev", label: "Reviewed by", render: (c) => c.reviewer_name ?? <span className="kx-none">Not recorded</span> },
  ];
  const tone = (st: string): "flame" | "amber" | "blue" | "green" | "plain" => (st === "accepted" ? "green" : st === "returned" ? "flame" : st === "queried" || st === "partially_accepted" ? "amber" : st === "submitted" ? "blue" : "plain");
  const rp = pageOf(cases, recordPage, 25);
  const records = <><Panel><Table cols={recordCols} rows={rp.slice} rowKey={(c) => c.case_id} label="Records in this package" empty={<p className="kx-quiet is-pad">No records in this package.</p>} /></Panel><Pager pg={rp.pg} pages={rp.pages} total={cases.length} size={25} onPage={setRecordPage} /></>;

  return (
    <Page className="pv">
      {state === "loading" && <SkelRows label="Reading the package" />}
      {state === "off" && <Empty title="Package review is not switched on here yet." />}
      {state === "missing" && <Empty title="This package is not available to you.">It may still be a draft, or belong to another office.</Empty>}
      {state === "error" && <p className="kx-said" data-tone="err" role="alert">{err}</p>}
      {state === "ok" && p && (
        <>
          {/* Where the package is on its way to the reviewing office: the same rail as a record, for both sides. */}
          <Rail label="Where this package is" steps={[{ title: p.status === "returned" ? "Returned to prepare" : "Prepared", href: side === "operator" ? "/ngo/packages" : undefined, hint: "All report packages" }, { title: p.status === "queried" ? "Queried by the office" : "With the reviewing office" }]} at={["draft", "returned"].includes(p.status) ? 0 : 1} end="Accepted" ended={p.status === "accepted"} />
          <Head title={p.title}
            sum={<><Tag tone={tone(p.status)}>{PACKAGE_LABEL[p.status]}</Tag> {org} · {period(p)}{p.submitted_at ? ` · submitted ${when(p.submitted_at)}` : ""}{p.decided_by_name ? ` · ${PACKAGE_LABEL[p.status].toLowerCase()} by ${p.decided_by_name}` : ""}. <b>{p.summary.records ?? cases.length}</b> {(p.summary.records ?? cases.length) === 1 ? "record" : "records"}, {p.summary.vet_authorised ?? "not counted"} vet-authorised, {p.summary.evidence_items ?? "not counted"} evidence items.</>}
            actions={canExport ? <><Btn disabled={busy} onClick={() => void download("pdf")}>Download PDF</Btn><Btn disabled={busy} onClick={() => void download("xlsx")}>Download XLSX</Btn></> : undefined} />
          {msg && <p className="kx-said" data-tone={msg.ok ? "ok" : "err"} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
          <Split side={<>
            <Section title="Conversation" count={ev.length}>
              <Panel><ol className="pv-thread">{ev.map((e) => (
                <li key={e.id}>
                  <header><b>{KIND[e.kind] ?? e.kind}</b>{e.side === "reviewer" ? <Tag tone="violet">Office</Tag> : null}<span>{e.actor_name} · {when(e.created_at)}</span></header>
                  {e.body && <p>{e.body}</p>}
                </li>
              ))}</ol></Panel>
            </Section>
            {(!p.item_review_enabled||side==="operator"&&["draft","queried"].includes(p.status))&&<Actions side={side} status={p.status} body={body} setBody={setBody} busy={busy} act={act} />}
            {isRecordingDemo && p.status === "accepted" && <Sanction id={p.id} side={side} records={cases.length} onDone={load} />}
          </>}>
            <Reconciliation pkg={p} side={side} onChanged={load} sourceCases={cases}/>
            {claims ? <Section title="Records and evidence" count={cases.length} fold="records" open={false}>{records}</Section> : <Section title="Records" count={cases.length}>{records}</Section>}
            {side==="reviewer"&&<Section title="Current animal operation history" fold="ops" open={false}><label className="kx-f pv-pick"><span>Animal record</span><select className="kx-in" aria-label="Inspect animal operations" value={operationCase??""} onChange={e=>setOperationCase(e.target.value||null)}><option value="">Choose one submitted animal</option>{cases.map(c=><option key={c.case_id} value={c.case_id}>{c.title||c.case_code}</option>)}</select></label>{operationCase&&<OperationsPanel key={operationCase} caseId={operationCase} readOnly wrap="ka2-ops"/>}</Section>}
          </Split>
        </>
      )}
    </Page>
  );
}

function Actions({ side, status, body, setBody, busy, act }: { side: "operator" | "reviewer"; status: Package["status"]; body: string; setBody: (v: string) => void; busy: boolean; act: (k: PackageAction, done: string) => Promise<void> }) {
  if (side === "operator") {
    const can = actionsFor("operator", status);
    if (can.includes("submitted")) return (
      <Section title={status === "returned" ? "Returned" : "Ready to send"}><div className="kx-acts"><Btn variant="primary" disabled={busy} onClick={() => act("submitted", "Submitted to the reviewing office.")}>Submit package</Btn></div></Section>
    );
    if (can.includes("answer")) return (
      <Section title="Answer the query"><div className="kx-form">
        <textarea className="kx-in" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Your answer to the office" aria-label="Answer" />
        <div className="kx-acts"><Btn variant="primary" disabled={busy || !body.trim()} onClick={() => act("answer", "Answer sent; the package is back with the office.")}>Send answer</Btn></div></div>
      </Section>
    );
    return <p className="kx-said pv-state">{status === "accepted" ? "Accepted by the reviewing office. Accepted means approved for payment. It is not a payment." : "With the reviewing office."}</p>;
  }
  if (!actionsFor("reviewer", status).length) return <p className="kx-said pv-state">{status === "queried" ? "Waiting for the operator's answer." : status === "accepted" ? "You accepted this package. Accepted means approved for payment. It is not a payment." : "Returned to the operator."}</p>;
  return (
    <Section title="Your review"><div className="kx-form">
      <textarea className="kx-in" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Comment (required to ask or return)" aria-label="Review comment" />
      <div className="kx-acts">
        <Btn variant="primary" disabled={busy} onClick={() => act("accepted", "Package accepted.")}>Accept</Btn>
        <Btn disabled={busy || !body.trim()} onClick={() => act("query", "Query sent to the operator.")}>Ask a question</Btn>
        <Btn disabled={busy || !body.trim()} onClick={() => act("returned", "Returned to the operator.")}>Return</Btn>
      </div>
      <p className="kx-quiet">Recorded in your name. Accepted means approved for payment. It is not a payment.</p></div>
    </Section>
  );
}

/* Payment sanction after acceptance (recording build): the reviewing office
   records the amount cleared for payment against verified procedures. */
function Sanction({ id, side, records, onDone }: { id: string; side: "operator" | "reviewer"; records: number; onDone: () => Promise<void> }) {
  const [done, setDone] = useState(() => demoSanction(id));
  const [busy, setBusy] = useState(false);
  const amount = records * DEMO_RATE;
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  if (done) return (
    <Section title="Payment sanctioned">
      <p className="pv-amt">{inr(done.amount)}</p>
      <p className="kx-quiet">{done.records} verified procedures × {inr(DEMO_RATE)} · sanctioned by {done.by} · ref {done.ref}</p>
    </Section>
  );
  if (side !== "reviewer") return <p className="kx-said pv-state">Accepted. Waiting for the payment sanction.</p>;
  return (
    <Section title="Sanction for payment">
      <p className="pv-amt">{inr(amount)}</p>
      <p className="kx-quiet">{records} verified procedures × {inr(DEMO_RATE)} contract rate. The sanction goes to accounts with this package attached.</p>
      <div className="kx-acts pv-gap"><Btn disabled={busy} onClick={async () => { setBusy(true); setDone(await demoSanctionPayment(id)); await onDone(); setBusy(false); }}>Sanction {inr(amount)}</Btn></div>
      <p className="kx-quiet">Recorded in your name</p>
    </Section>
  );
}
