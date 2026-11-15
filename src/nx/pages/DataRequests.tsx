"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Lock, Plus } from "lucide-react";
import { Shell } from "../Shell";
import { Chip } from "../ui";
import { Confirm, Denied, Empty, Field, Modal, Section, Skeleton, dayTime, todayIso, useAct } from "../kit";
import { useLive, type Workspace } from "../live";
import { getSupabase } from "@/lib/supabase";
import { downloadCsv } from "@/lib/csv";

/* Asking a programme for data, and deciding on those requests. A research group does not need to join the programme.
   The programme's coordinators decide. An approved request gives versioned extracts of suppressed counts with their
   exact query; revoking hides them and stops new ones. Kaju never grants access. */

type Req = { id: string; programme_id: string; requester_org: string; title: string; purpose: string; variables: string[]; period_from: string; period_to: string; status: string; decision_note: string | null; decided_at: string | null; expires_on: string | null; created_at: string; oh_programmes?: { name: string } | null; oh_organisations?: { name: string } | null };
type Extract = { id: string; request_id: string; version: number; taken_at: string; query: Record<string, unknown>; suppress_below: number; row_count: number; rows: Record<string, unknown>[] };
const VARS: [string, string][] = [["week", "Week"], ["area", "Area"], ["species", "Animal species"], ["category", "Exposure category"]];
const STATE: Record<string, ["ok" | "warn" | "bad" | "plain", string]> = { requested: ["warn", "Waiting for the programme"], approved: ["ok", "Approved"], denied: ["bad", "Declined"], revoked: ["bad", "Revoked"], withdrawn: ["plain", "Withdrawn"] };
const notSetUp = (e: string | null) => !!e && /does not exist|schema cache|Could not find/i.test(e);

function useRequests(filter: { org?: string } | null) {
  const [rows, setRows] = useState<Req[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const db = getSupabase(); if (!db || !filter) return;
    let alive = true;
    let q = db.from("nx_data_requests").select("id,programme_id,requester_org,title,purpose,variables,period_from,period_to,status,decision_note,decided_at,expires_on,created_at,oh_programmes(name),oh_organisations(name)").order("created_at", { ascending: false }).limit(100);
    if (filter.org) q = q.eq("requester_org", filter.org);
    void q.then(({ data, error: e }) => { if (!alive) return; setError(e?.message ?? null); setRows(e ? [] : (data ?? []) as unknown as Req[]); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.org, tick]);
  return { rows, error, reload: useCallback(() => setTick((n) => n + 1), []) };
}

/** The research group's side, under Datasets. */
export function DataRequests({ org }: { org: Workspace }) {
  const reqs = useRequests({ org: org.org_id });
  const [progs, setProgs] = useState<{ id: string; name: string }[]>([]);
  const [extracts, setExtracts] = useState<Record<string, Extract[]>>({});
  const [asking, setAsking] = useState(false);
  const [f, setF] = useState({ programme: "", title: "", purpose: "", variables: ["week", "category"], from: "", to: todayIso() });
  const { busy, run } = useAct();
  const db = getSupabase();
  useEffect(() => { void db?.rpc("nx_requestable_programmes").then(({ data }) => setProgs((data ?? []) as { id: string; name: string }[])); }, [db]);
  const approved = (reqs.rows ?? []).filter((r) => r.status === "approved").map((r) => r.id).join(",");
  useEffect(() => {
    if (!db || !approved) return;
    void db.from("nx_data_extracts").select("id,request_id,version,taken_at,query,suppress_below,row_count,rows").in("request_id", approved.split(",")).order("version", { ascending: false }).then(({ data }) => {
      const by: Record<string, Extract[]> = {}; for (const x of (data ?? []) as Extract[]) (by[x.request_id] ??= []).push(x); setExtracts(by);
    });
  }, [db, approved]);
  if (notSetUp(reqs.error)) return <Section title="Requests to programmes"><p className="nx-sub">Data requests are not set up on this database yet.</p></Section>;
  const ask = () => run("ask", async () => await db!.rpc("nx_request_data", { p_programme: f.programme, p_org: org.org_id, p_title: f.title.trim(), p_purpose: f.purpose.trim(), p_variables: f.variables, p_from: f.from, p_to: f.to }), { ok: "Sent. The programme's coordinators decide; you will be notified." }).then((r) => { if (r.ok) { setAsking(false); reqs.reload(); } });
  return (
    <Section title="Requests to programmes" count={reqs.rows?.length} action={<button type="button" className="nx-btn is-sm" onClick={() => setAsking(true)}><Plus size={12} />Ask a programme for data</button>}>
      {reqs.rows === null ? <Skeleton rows={3} /> : !reqs.rows.length ? <Empty title="No requests yet" hint="Ask a programme for aggregated, suppressed counts for a period. You do not need to join it." /> : (
        <ul className="nx-dreq">{reqs.rows.map((r) => { const [t, w] = STATE[r.status] ?? ["plain", r.status]; const xs = extracts[r.id] ?? []; return (
          <li key={r.id}>
            <div className="nx-dreq-h"><b>{r.title}</b><Chip tone={t}>{w}</Chip><small className="nx-t3">{r.oh_programmes?.name ?? "Programme"} · {r.period_from} to {r.period_to} · {r.variables.join(", ")}</small></div>
            {r.decision_note ? <p className="nx-t3">Programme&apos;s note: {r.decision_note}</p> : null}
            {r.status === "approved" ? <div className="nx-run-act">
              <button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => void run(`x${r.id}`, async () => await db!.rpc("nx_take_extract", { p_request: r.id }), { ok: "Extract taken. It is kept as a numbered version." }).then(reqs.reload)}>Take an extract</button>
              {r.expires_on ? <span className="nx-t3">Approved until {r.expires_on}</span> : null}
            </div> : r.status === "requested" ? <div className="nx-run-act"><button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => void run(`w${r.id}`, async () => await db!.rpc("nx_withdraw_data_request", { p_request: r.id }), { ok: "Withdrawn." }).then(reqs.reload)}>Withdraw</button></div> : null}
            {xs.length ? <table className="nx-rtable"><thead><tr><th>Version</th><th>Taken</th><th>Rows</th><th>Exact query</th><th /></tr></thead><tbody>{xs.map((x) => <tr key={x.id}><td>v{x.version}</td><td>{dayTime(x.taken_at)}</td><td>{x.row_count}</td><td><code className="nx-q">{JSON.stringify(x.query)}</code></td>
              <td><button type="button" className="nx-btn is-quiet is-sm" onClick={() => downloadCsv(`${r.title.replace(/\W+/g, "-").toLowerCase()}-v${x.version}.csv`, x.rows, { title: `${r.title} v${x.version} · counts below ${x.suppress_below} suppressed`, organisation: org.name })}><Download size={12} />CSV</button></td></tr>)}</tbody></table> : null}
          </li>); })}</ul>
      )}
      <p className="nx-note" style={{ marginTop: 12 }}><Lock size={13} /><span>Extracts hold suppressed counts only, never patient rows. Each records its exact query and suppression threshold so an analysis can be repeated. If the programme revokes the request, its extracts can no longer be opened.</span></p>
      {asking ? <Modal title="Ask a programme for data" wide onClose={() => setAsking(false)} foot={<><button type="button" className="nx-btn is-quiet" onClick={() => setAsking(false)}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy || !f.programme || f.title.trim().length < 3 || f.purpose.trim().length < 20 || !f.from || !f.to || !f.variables.length} onClick={() => void ask()}>Send request</button></>}>
        <div className="nx-fields">
          <Field label="Programme" wide><select value={f.programme} onChange={(e) => setF({ ...f, programme: e.target.value })} autoFocus><option value="">Choose a programme</option>{progs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Title" wide><input value={f.title} maxLength={160} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Weekly bite exposures for supply planning" /></Field>
          <Field label="Purpose" wide hint="At least 20 characters. The programme reads this to decide."><textarea rows={3} value={f.purpose} maxLength={2000} onChange={(e) => setF({ ...f, purpose: e.target.value })} /></Field>
          <Field label="From"><input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
          <Field label="To"><input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
          <fieldset className="nx-field is-wide" style={{ border: 0, padding: 0 }}><span>Grouped by</span><div className="nx-chips">{VARS.map(([k, l]) => <label key={k} className="nx-chk-inline"><input type="checkbox" checked={f.variables.includes(k)} onChange={(e) => setF({ ...f, variables: e.target.checked ? [...f.variables, k] : f.variables.filter((v) => v !== k) })} />{l}</label>)}</div></fieldset>
        </div>
      </Modal> : null}
    </Section>
  );
}

/** The programme's side: requests to programmes this person coordinates. */
export function StewardRequests() {
  const live = useLive();
  const reqs = useRequests(live.signedIn ? {} : null);
  const { busy, run } = useAct();
  const [deciding, setDeciding] = useState<{ r: Req; d: "approve" | "deny" | "revoke" } | null>(null);
  const [note, setNote] = useState("");
  const [until, setUntil] = useState("");
  const db = getSupabase();
  const mine = (reqs.rows ?? []).filter((r) => !live.orgs.some((o) => o.org_id === r.requester_org));
  const word = { approve: "Approve", deny: "Decline", revoke: "Revoke" } as const;
  return (
    <Shell ws="gov" crumb={["Programmes", "Data requests"]}>
      <div className="nx-page">
        <div className="nx-head"><div><p className="nx-eyebrow">Data stewardship</p><h1 className="nx-h1">Data requests</h1><p className="nx-sub">Research groups asking for your programme&apos;s data. They get suppressed counts for the period and groupings you approve, never patient rows. You can revoke at any time.</p></div></div>
        {!live.ready || reqs.rows === null ? <Skeleton /> : notSetUp(reqs.error) ? <p className="nx-sub">Data requests are not set up on this database yet.</p> : !live.signedIn ? <Denied what="Sign in to see requests to your programmes" /> : !mine.length ? <Empty title="No requests to your programmes" hint="When a research group asks, you are notified and the request appears here." /> : (
          <ul className="nx-dreq">{mine.map((r) => { const [t, w] = STATE[r.status] ?? ["plain", r.status]; return (
            <li key={r.id}>
              <div className="nx-dreq-h"><b>{r.title}</b><Chip tone={t}>{w}</Chip><small className="nx-t3">{r.oh_organisations?.name ?? "A research group"} · {r.oh_programmes?.name} · {r.period_from} to {r.period_to}</small></div>
              <p>{r.purpose}</p>
              <p className="nx-t3">Grouped by {r.variables.join(", ")} · asked {dayTime(r.created_at)}{r.decided_at ? ` · decided ${dayTime(r.decided_at)}` : ""}{r.expires_on ? ` · until ${r.expires_on}` : ""}</p>
              <div className="nx-run-act">
                {r.status === "requested" ? <><button type="button" className="nx-btn is-sm" onClick={() => { setNote(""); setUntil(""); setDeciding({ r, d: "approve" }); }}>Approve</button><button type="button" className="nx-btn is-quiet is-sm" onClick={() => { setNote(""); setDeciding({ r, d: "deny" }); }}>Decline</button></> : null}
                {r.status === "approved" ? <button type="button" className="nx-btn is-quiet is-sm" onClick={() => { setNote(""); setDeciding({ r, d: "revoke" }); }}>Revoke access</button> : null}
              </div>
            </li>); })}</ul>
        )}
      </div>
      {deciding ? <Confirm title={`${word[deciding.d]}: ${deciding.r.title}`} confirm={word[deciding.d]} danger={deciding.d !== "approve"} busy={!!busy} onClose={() => setDeciding(null)}
        onConfirm={() => void run("dec", async () => await db!.rpc("nx_decide_data_request", { p_request: deciding.r.id, p_decision: deciding.d, p_note: note || null, p_expires_on: deciding.d === "approve" && until ? until : null }), { ok: deciding.d === "approve" ? "Approved. They can take extracts now." : deciding.d === "deny" ? "Declined. They were told." : "Revoked. Their extracts can no longer be opened." }).then((r) => { if (r.ok) { setDeciding(null); reqs.reload(); } })}>
        <p>{deciding.d === "approve" ? `${deciding.r.oh_organisations?.name ?? "The group"} will be able to take suppressed counts for ${deciding.r.period_from} to ${deciding.r.period_to}, grouped by ${deciding.r.variables.join(", ")}. Your name is recorded as the approver.` : deciding.d === "revoke" ? "New extracts stop, and the ones already taken can no longer be opened by the group." : "The group is told the request was declined."}</p>
        {deciding.d === "approve" ? <Field label="Approved until (optional)"><input type="date" value={until} min={todayIso()} onChange={(e) => setUntil(e.target.value)} /></Field> : null}
        <Field label="Note to the group (optional)"><input value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} /></Field>
      </Confirm> : null}
    </Shell>
  );
}
