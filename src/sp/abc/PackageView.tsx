"use client";

/* One report package, as the operator sees it (submit, answer queries) or
   as the reviewing office sees it (query, accept, return). The same
   records, figures and thread on both sides; the database decides which
   actions each person may take and refuses the rest. */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { ArrowLeft } from "lucide-react";
import { EVIDENCE_LABEL, NotEnabled, PACKAGE_LABEL, orgNames, packageAct, packageById, packageCases, packageEvents, type EvidenceKind, type Package, type PackageCase, type PackageEvent } from "@/lib/abc";
import { Reading } from "../ui/Reading";
import { period } from "./Packages";
import { EvidenceLink } from "./EvidenceLink";
import { isRecordingDemo } from "@/lib/recording-demo";
import { DEMO_RATE, demoSanction, demoSanctionPayment } from "@/lib/demo/abc-demo";
import "../ngo/ngo.css";
import "./abc.css";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const KIND: Record<string, string> = { created: "Prepared", submitted: "Submitted", query: "Query", answer: "Answer", accepted: "Accepted", returned: "Returned", sanctioned: "Payment sanctioned" };

export function PackageView({ id, side }: { id: string; side: "operator" | "reviewer" }) {
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

  const act = async (kind: "submitted" | "answer" | "query" | "accepted" | "returned", done: string) => {
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
  const back = side === "operator" ? { href: "/ngo/packages", label: "Report packages" } : { href: "/city/review", label: "Package review" };

  return (
    <div className="ngo-page abc">
      <Link href={back.href} className="abc-back"><ArrowLeft size={14} aria-hidden />{back.label}</Link>
      {state === "loading" && <div className="abc-empty"><Reading>Reading the package</Reading></div>}
      {state === "off" && <div className="abc-empty"><b>Package review is not switched on here yet.</b></div>}
      {state === "missing" && <div className="abc-empty"><b>This package is not available to you.</b>It may still be a draft, or belong to another office.</div>}
      {state === "error" && <p className="abc-err" role="alert">{err}</p>}
      {state === "ok" && p && (
        <>
          <header className="ngo-head abc-head">
            <div><h1>{p.title}</h1></div>
            <p className="ngo-sum">{org} · {period(p)}{p.submitted_at ? ` · submitted ${when(p.submitted_at)}` : ""}{p.decided_by_name ? ` · ${PACKAGE_LABEL[p.status].toLowerCase()} by ${p.decided_by_name}` : ""}</p>
            <div className="row ngo-head-act"><span className={`abc-tag t-${p.status}`}>{PACKAGE_LABEL[p.status]}</span><button type="button" className="btn is-s" disabled={busy} onClick={() => void download("pdf")}>Download PDF</button><button type="button" className="btn is-s" disabled={busy} onClick={() => void download("xlsx")}>Download XLSX</button></div>
          </header>
          {msg && <p className={msg.ok ? "abc-ok" : "abc-err"} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
          <div className="abc-grid">
            <div>
              <section className="abc-sec" aria-label="Figures">
                <div className="abc-kpis">
                  <div><b>{p.summary.records ?? cases.length}</b><small>Records</small></div>
                  <div><b>{p.summary.vet_authorised ?? "—"}</b><small>Vet-authorised</small></div>
                  <div><b>{p.summary.evidence_items ?? "—"}</b><small>Evidence items</small></div>
                </div>
              </section>
              <section className="abc-sec" aria-labelledby="rec-h">
                <h2 id="rec-h">Records</h2>
                <table className="abc-cases">
                  <thead><tr><th>Record</th><th>Evidence</th><th>Signed by</th></tr></thead>
                  <tbody>{cases.map((c) => (
                    <tr key={c.case_id}>
                      <td>{side === "operator" ? <Link href={`/ngo/verification/${c.case_id}`}>{c.title || c.case_code}</Link> : c.title || c.case_code}<small>{[c.case_code, c.city].filter(Boolean).join(" · ")}</small></td>
                      <td><span className="ev">{c.evidence.map((e, i) => e.url
                        ? <EvidenceLink key={i} url={e.url}>{EVIDENCE_LABEL[e.kind as EvidenceKind] ?? e.kind}</EvidenceLink>
                        : <span key={i}>{EVIDENCE_LABEL[e.kind as EvidenceKind] ?? e.kind}{e.location ? `: ${e.location}` : ""}</span>)}</span></td>
                      <td>{c.vet_name ?? "—"}<small>Reviewed by {c.reviewer_name ?? "—"}</small></td>
                    </tr>
                  ))}</tbody>
                </table>
              </section>
            </div>
            <aside className="abc-side" aria-label="Review thread">
              <section className="abc-sec">
                <h2>Thread</h2>
                <ol className="abc-thread">{ev.map((e) => (
                  <li key={e.id} className={e.side === "reviewer" ? "is-reviewer" : undefined}>
                    <header><b>{KIND[e.kind] ?? e.kind}</b><span>{e.actor_name} · {when(e.created_at)}</span></header>
                    {e.body && <p style={{ margin: 0 }}>{e.body}</p>}
                  </li>
                ))}</ol>
              </section>
              <Actions side={side} status={p.status} body={body} setBody={setBody} busy={busy} act={act} />
              {isRecordingDemo && p.status === "accepted" && <Sanction id={p.id} side={side} records={cases.length} onDone={load} />}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function Actions({ side, status, body, setBody, busy, act }: { side: "operator" | "reviewer"; status: Package["status"]; body: string; setBody: (v: string) => void; busy: boolean; act: (k: "submitted" | "answer" | "query" | "accepted" | "returned", done: string) => Promise<void> }) {
  if (side === "operator") {
    if (status === "draft" || status === "returned") return (
      <section className="abc-sec"><h2>{status === "returned" ? "Returned" : "Ready to send"}</h2>
        <div className="abc-sign"><div className="acts"><button type="button" className="btn is-ink is-s" disabled={busy} onClick={() => act("submitted", "Submitted to the reviewing office.")}>Submit package</button></div></div>
      </section>
    );
    if (status === "queried") return (
      <section className="abc-sec"><h2>Answer the query</h2>
        <textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Your answer to the office" aria-label="Answer" />
        <div className="abc-sign"><div className="acts"><button type="button" className="btn is-ink is-s" disabled={busy || !body.trim()} onClick={() => act("answer", "Answer sent; the package is back with the office.")}>Send answer</button></div></div>
      </section>
    );
    return <section className="abc-sec"><p className="abc-note">{status === "accepted" ? "Accepted by the reviewing office." : "With the reviewing office."}</p></section>;
  }
  if (status !== "submitted") return <section className="abc-sec"><p className="abc-note">{status === "queried" ? "Waiting for the operator's answer." : status === "accepted" ? "You accepted this package." : "Returned to the operator."}</p></section>;
  return (
    <section className="abc-sec"><h2>Your review</h2>
      <textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Comment (required to ask or return)" aria-label="Review comment" />
      <div className="abc-sign"><div className="acts">
        <button type="button" className="btn is-ink is-s" disabled={busy} onClick={() => act("accepted", "Package accepted.")}>Accept</button>
        <button type="button" className="btn is-s" disabled={busy || !body.trim()} onClick={() => act("query", "Query sent to the operator.")}>Ask a question</button>
        <button type="button" className="btn is-s" disabled={busy || !body.trim()} onClick={() => act("returned", "Returned to the operator.")}>Return</button>
      </div></div>
      <p className="abc-hint">Recorded in your name</p>
    </section>
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
    <section className="abc-sec abc-sanction is-done" aria-label="Payment sanction">
      <h2>Payment sanctioned</h2>
      <p className="abc-sanction-amt">{inr(done.amount)}</p>
      <p className="abc-note">{done.records} verified procedures × {inr(DEMO_RATE)} · sanctioned by {done.by} · ref {done.ref}</p>
    </section>
  );
  if (side !== "reviewer") return <section className="abc-sec"><p className="abc-note">Accepted. Waiting for the payment sanction.</p></section>;
  return (
    <section className="abc-sec abc-sanction" aria-label="Payment sanction">
      <h2>Sanction for payment</h2>
      <p className="abc-sanction-amt">{inr(amount)}</p>
      <p className="abc-note">{records} verified procedures × {inr(DEMO_RATE)} contract rate. The sanction goes to accounts with this package attached.</p>
      <div className="abc-sign"><div className="acts"><button type="button" className="btn is-ink is-s" disabled={busy} onClick={async () => { setBusy(true); setDone(await demoSanctionPayment(id)); await onDone(); setBusy(false); }}>Sanction {inr(amount)}</button></div></div>
      <p className="abc-hint">Recorded in your name</p>
    </section>
  );
}
