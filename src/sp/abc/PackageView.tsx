"use client";

/* One report package, as the operator sees it (submit, answer queries) or
   as the reviewing office sees it (query, accept, return). The same
   records, figures and thread on both sides; the database decides which
   actions each person may take and refuses the rest. */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { EVIDENCE_LABEL, NotEnabled, PACKAGE_LABEL, orgNames, packageAct, packageById, packageCases, packageEvents, type EvidenceKind, type Package, type PackageCase, type PackageEvent } from "@/lib/abc";
import { Reading } from "../ui/Reading";
import { period } from "./Packages";
import "../ngo/ngo.css";
import "./abc.css";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const KIND: Record<string, string> = { created: "Prepared", submitted: "Submitted", query: "Query", answer: "Answer", accepted: "Accepted", returned: "Returned" };

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
            <div className="row ngo-head-act"><span className={`abc-tag t-${p.status}`}>{PACKAGE_LABEL[p.status]}</span></div>
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
                <p className="abc-note">Computed from the records below when the package was prepared. Each record was authorised by a veterinarian and approved by a different person.</p>
              </section>
              <section className="abc-sec" aria-labelledby="rec-h">
                <h2 id="rec-h">Records</h2>
                <table className="abc-cases">
                  <thead><tr><th>Record</th><th>Evidence</th><th>Signed by</th></tr></thead>
                  <tbody>{cases.map((c) => (
                    <tr key={c.case_id}>
                      <td>{side === "operator" ? <Link href={`/ngo/verification/${c.case_id}`}>{c.title || c.case_code}</Link> : c.title || c.case_code}<small>{[c.case_code, c.city].filter(Boolean).join(" · ")}</small></td>
                      <td><span className="ev">{c.evidence.map((e, i) => e.url
                        ? <a key={i} href={e.url} target="_blank" rel="noreferrer">{EVIDENCE_LABEL[e.kind as EvidenceKind] ?? e.kind}</a>
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
      <section className="abc-sec"><h2>{status === "returned" ? "Returned by the office" : "Ready to send"}</h2>
        <p className="abc-note">Submitting sends these records and figures to the reviewing office. Records in it are locked while it is under review.</p>
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
      <textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} placeholder="A question, or what needs attention when returning" aria-label="Review comment" />
      <div className="abc-sign"><div className="acts">
        <button type="button" className="btn is-ink is-s" disabled={busy} onClick={() => act("accepted", "Package accepted.")}>Accept</button>
        <button type="button" className="btn is-s" disabled={busy || !body.trim()} onClick={() => act("query", "Query sent to the operator.")}>Ask a question</button>
        <button type="button" className="btn is-s" disabled={busy || !body.trim()} onClick={() => act("returned", "Returned to the operator.")}>Return</button>
      </div></div>
      <p className="abc-note">Acceptance is recorded in your name. Nothing is accepted automatically.</p>
    </section>
  );
}
