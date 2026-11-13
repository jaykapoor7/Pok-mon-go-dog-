"use client";

/* Step 5, prepared continuously. What can be claimed and for how much comes
   from the database's billing preview, which uses exactly the rule package
   preparation uses (procedure date, reviewed evidence, never already
   claimed, never historical) and the one contract version covering the
   period. Preparing the package then configures its claims from that same
   preview and reads the package back to confirm the totals match. Blockers
   below are guidance from the verification queue. If the preview is not
   available, no amount is shown and nothing can be prepared from here. */

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Btn, Lanes, Panel, Row, Rows, Section, Table, Tag } from "@/ws/kit";
import "./parts.k.css";
import { createPackage, offices, packages, verificationQueue, type Office, type QueueRow } from "@/lib/abc";
import { billLines, readBillingPreview, type PreviewResult } from "@/lib/billing";
import { operationRpc, verifyOperationReceipt, type OperationReceipt } from "@/lib/operations";
import { readContracts, readReconciliation } from "@/lib/reconciliation";
import { getSupabase } from "@/lib/supabase";
import { monthBounds, monthlyPlan } from "@/sp3/ai/monthly";
import { holdsPeriod } from "@/lib/machines/package";

const LABEL: Record<string, string> = { sterilisation: "Sterilisation (ABC)", vaccination: "Anti-rabies vaccination" };

/** What the month's parts are, so a page can lay them out: the sentence for its head, the month choice, the one action, the body. */
export type MonthParts = { sum: ReactNode; month: ReactNode; office: ReactNode; action: ReactNode; body: ReactNode };
type Line = { procedure: string; units: number; rate: string | null; amount: string | null };

export function MonthlySubmission({ canPrepare, compact = false, frame }: { canPrepare: boolean; compact?: boolean; /** Lays the parts out in a page. Without it, they are stacked in one section. */ frame?: (p: MonthParts) => ReactNode }) {
  const router = useRouter();
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [offs, setOffs] = useState<Office[]>([]);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [office, setOffice] = useState("");
  const [which, setWhich] = useState<"current" | "previous">(() => (new Date().getUTCDate() <= 7 ? "previous" : "current"));
  const [state, setState] = useState<"loading" | "ok" | "off" | "error">("loading");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([verificationQueue(500), offices(), packages(), contractOffice()])
      .then(([r, o, p, k]) => {
        if (!live) return;
        setRows(r); setOffs(o); setExisting(new Set(p.filter((x) => holdsPeriod(x.status)).map((x) => `${x.period_start.slice(0, 10)}|${x.office_id}`)));
        if (k) setOffice(k); else if (o.length === 1) setOffice(o[0].id);
        setState("ok");
      })
      .catch((e: Error) => { if (live) setState(/not switched on/i.test(e.message) ? "off" : "error"); });
    return () => { live = false; };
  }, []);

  const b = monthBounds(new Date(), which === "previous");
  useEffect(() => {
    if (!office || !canPrepare) { setPreview(null); return; }
    let live = true;
    setPreview(null);
    readBillingPreview(b.start, b.end, office).then((r) => { if (live) setPreview(r); });
    return () => { live = false; };
  }, [office, b.start, b.end, canPrepare]);

  const lay = (p: MonthParts) => (frame ? frame(p) : <section className="ms2" aria-label="Monthly submission"><p className="k-sum" aria-live="polite">{p.sum}</p>{p.month || p.office ? <div className="k-tools"><div className="k-tools-l">{p.month}</div><div className="k-tools-r">{p.office}</div></div> : null}{p.body}{p.action ? <div className="kx-acts">{p.action}</div> : null}</section>);
  if (state === "off") return frame ? lay({ sum: "Not switched on for this workspace yet.", month: null, office: null, action: null, body: null }) : null;
  if (state === "loading") return lay({ sum: "Kaju is reading this month’s records…", month: null, office: null, action: null, body: null });
  if (state === "error" || !rows) return lay({ sum: <span role="status">The month’s records could not be read. Nothing is assumed ready.</span>, month: null, office: null, action: null, body: null });

  const g = monthlyPlan(rows, new Date(), which === "previous");
  const pv = preview?.state === "ok" ? preview.preview : null;
  const already = office ? existing.has(`${b.start}|${office}`) : false;
  const ready = !!pv && pv.count > 0 && !pv.too_many && !!pv.contract && pv.unpriced === 0 && pv.total !== null;
  const officeName = offs.find((o) => o.id === office)?.name ?? "the reviewing office";

  const prepare = async () => {
    if (!pv || !ready || !pv.contract) return;
    if (!window.confirm(`Prepare the ${b.label} package for ${officeName}: ${pv.count} claim${pv.count === 1 ? "" : "s"}, total ₹${pv.total} under ${pv.contract.name} v${pv.contract.version}? It is created as a draft; you review and submit it yourself.`)) return;
    setBusy(true); setErr(null);
    try {
      const id = await createPackage(`ABC claims · ${b.label}`, b.start, b.end, office);
      /* The claims come from the same preview, so the package bills exactly what was shown. */
      const request = crypto.randomUUID();
      const receipt = await operationRpc<OperationReceipt>("operations_configure_package", { p_request: request, p_package: id, p_contract: pv.contract.id, p_claims: pv.claims.map((c) => ({ case_id: c.case_id, rate_id: c.rate_id, units: 1 })) });
      const uid = (await getSupabase()?.auth.getSession())?.data.session?.user.id;
      if (uid) await verifyOperationReceipt(receipt, "operations_package_configurations", uid, {}, request);
      const rec = await readReconciliation(id);
      const ids = new Set(rec.items.map((i) => i.case_id));
      const same = rec.claimed_amount !== null && Number(rec.claimed_amount) === Number(pv.total) && ids.size === pv.count && pv.claims.every((c) => ids.has(c.case_id));
      if (!same) { setErr(`The package was prepared, but its claims (₹${rec.claimed_amount ?? "unknown"}) do not match the preview (₹${pv.total}). Open it and check before submitting.`); setBusy(false); return; }
      window.dispatchEvent(new Event("kaju:verified"));
      router.push(`/ngo/packages/${id}`);
    } catch (e) { setErr(e instanceof Error ? e.message : "The package could not be prepared."); setBusy(false); }
  };

  const blocked = g.blockedBy.reduce((t, x) => t + x.count, 0);
  const blockedText = blocked || g.partial ? <> <span className="is-hot">{blocked}{g.partial ? "+" : ""} more {blocked === 1 && !g.partial ? "is" : "are"} blocked</span>.</> : null;
  /* The sentence: what can be claimed, for how much, under which terms, and what blocks the rest. An amount that cannot be read is never shown as zero. */
  const sum = !canPrepare ? <>{b.label}: {blocked || g.partial ? <><b>{blocked}{g.partial ? "+" : ""}</b> {blocked === 1 && !g.partial ? "record is" : "records are"} blocked from the claim.</> : "nothing is blocking this month’s records."} Coordinators and admins prepare packages.</>
    : offs.length === 0 ? <>{b.label}: no reviewing office is linked yet, so nothing can be claimed.{blockedText}</>
    : !office ? <>{b.label}: choose the reviewing office to see what can be claimed.{blockedText}</>
    : !preview ? <>{b.label}: Kaju is checking which procedures can be claimed…</>
    : preview.state === "not_deployed" ? <><span role="status">{b.label}: no amount is available for this period.</span>{blockedText}</>
    : preview.state === "error" ? <><span role="status">{b.label}: the billing preview could not be read: {preview.message}. No amount is shown.</span>{blockedText}</>
    : pv ? <>{b.label}: {pv.count === 0 ? "nothing can be claimed yet." : <><b>{pv.count}</b> {pv.count === 1 ? "procedure" : "procedures"} can be claimed{pv.contract && pv.total !== null ? <> for <b>₹{pv.total}</b></> : ", amount not known"}.</>}{blockedText}</>
    : null;
  const lines: Line[] = pv && pv.count > 0 && pv.contract ? billLines(pv) : [];
  const body = <>
    {canPrepare && office && pv && already ? <p className="kx-said" data-tone="ok">The {b.label} package is prepared. It is in the list of packages.</p> : null}
    {err && <p role="alert" className="kx-said" data-tone="err">{err}</p>}
    {canPrepare && office && pv && pv.count > 0 ? <Section title="Draft bill" note={pv.contract ? <>{pv.contract.name} v{pv.contract.version}{pv.contract.illustrative ? " · illustrative" : ""}{pv.unpriced ? ` · ${pv.unpriced} without a rate` : ""}</> : undefined}>
      {pv.contract ? <Panel><Table<Line> label="Draft bill by procedure" rows={lines} rowKey={(l) => l.procedure} cols={[
        { key: "what", label: "Procedure", width: "minmax(0, 2fr)", render: (l) => LABEL[l.procedure] ?? l.procedure },
        { key: "units", label: "Units and rate", keep: true, align: "end", render: (l) => <>{l.units} × {l.rate ? `₹${l.rate}` : "no rate"}</> },
        { key: "amount", label: "Amount", width: "112px", keep: true, align: "end", render: (l) => (l.rate ? `₹${l.amount}` : <span className="kx-none">Not known</span>) },
      ]} /></Panel> : <p className="kx-quiet">No contract with {officeName} covers {b.label}.</p>}
      {pv.too_many && <p className="kx-quiet is-top" role="status">Over 2,000 procedures: prepare shorter periods.</p>}
    </Section> : null}
    {(g.blockedBy.length > 0 || g.partial) && <Section title="Blocking the rest" count={`${blocked}${g.partial ? "+" : ""}`}>
      {g.blockedBy.length > 0 && <Panel><Rows label="What blocks the rest">{g.blockedBy.slice(0, compact ? 3 : 6).map((x) => (
        <Row key={x.reason} href={x.href} title={x.reason} end={<Tag tone="amber">{x.count}</Tag>} />
      ))}</Rows></Panel>}
    </Section>}
  </>;

  return lay({
    sum,
    month: <Lanes<"previous" | "current"> label="Month" value={which} onChange={setWhich} lanes={[{ id: "previous", label: monthBounds(new Date(), true).label.split(" ")[0] }, { id: "current", label: monthBounds(new Date()).label.split(" ")[0] }]} />,
    office: canPrepare && offs.length > 1 ? <select className="kx-in is-auto" aria-label="Reviewing office" value={office} onChange={(e) => setOffice(e.target.value)}><option value="">Choose the reviewing office…</option>{offs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select> : null,
    action: canPrepare && office && ready ? <Btn variant="primary" disabled={busy} onClick={() => void prepare()}>{busy ? "Preparing and checking…" : `Prepare ${already ? "another" : "the"} ${b.label} package · ₹${pv?.total}`}</Btn> : null,
    body,
  });
}

/** The reviewing office named by the one contract in force for your organisation today,
 *  or null when there is none or more than one: then the person chooses. */
export async function contractOffice(): Promise<string | null> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { contracts } = await readContracts();
    const ids = [...new Set(contracts.filter((c) => c.starts_on <= today && c.ends_on >= today).map((c) => c.office_id))];
    return ids.length === 1 ? ids[0] : null;
  } catch { return null; }
}
