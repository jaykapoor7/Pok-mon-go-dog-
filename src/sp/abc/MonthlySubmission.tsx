"use client";

/* Step 5, prepared continuously. What can be claimed and for how much comes
   from the database's billing preview, which uses exactly the rule package
   preparation uses (procedure date, reviewed evidence, never already
   claimed, never historical) and the one contract version covering the
   period. Preparing the package then configures its claims from that same
   preview and reads the package back to confirm the totals match. Blockers
   below are guidance from the verification queue. If the preview is not
   available, no amount is shown and nothing can be prepared from here. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check, FileCheck2, Sparkles } from "lucide-react";
import { createPackage, offices, packages, verificationQueue, type Office, type QueueRow } from "@/lib/abc";
import { billLines, readBillingPreview, type PreviewResult } from "@/lib/billing";
import { operationRpc, verifyOperationReceipt, type OperationReceipt } from "@/lib/operations";
import { readContracts, readReconciliation } from "@/lib/reconciliation";
import { getSupabase } from "@/lib/supabase";
import { monthBounds, monthlyPlan } from "@/sp3/ai/monthly";
import { holdsPeriod } from "@/lib/machines/package";

const LABEL: Record<string, string> = { sterilisation: "Sterilisation (ABC)", vaccination: "Anti-rabies vaccination" };

export function MonthlySubmission({ canPrepare, compact = false }: { canPrepare: boolean; compact?: boolean }) {
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

  if (state === "off") return null;
  if (state === "loading") return <section className="ms" aria-busy="true"><h2 className="ms-h"><Sparkles size={14} aria-hidden /> Monthly submission</h2><p className="ms-p">Kaju is reading this month’s records…</p></section>;
  if (state === "error" || !rows) return <section className="ms"><h2 className="ms-h"><Sparkles size={14} aria-hidden /> Monthly submission</h2><p className="ms-p" role="status">The month’s records could not be read. Nothing is assumed ready.</p></section>;

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

  return (
    <section className="ms" aria-labelledby="ms-h">
      <div className="ms-top">
        <h2 id="ms-h" className="ms-h"><Sparkles size={14} aria-hidden /> Monthly submission · {b.label}</h2>
        <div className="ms-switch" role="group" aria-label="Month">
          <button type="button" aria-pressed={which === "previous"} onClick={() => setWhich("previous")}>{monthBounds(new Date(), true).label.split(" ")[0]}</button>
          <button type="button" aria-pressed={which === "current"} onClick={() => setWhich("current")}>{monthBounds(new Date()).label.split(" ")[0]}</button>
        </div>
      </div>

      {canPrepare && offs.length > 1 && <label className="ms-office">Reviewing office <select className="select" value={office} onChange={(e) => setOffice(e.target.value)}><option value="">Choose…</option>{offs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>}
      {canPrepare && offs.length === 0 && <p className="ms-p"><small>No reviewing office is linked yet, so nothing can be claimed.</small></p>}

      {canPrepare && office && (!preview ? <p className="ms-p">Kaju is checking which procedures can be claimed…</p>
        : preview.state === "not_deployed" ? <p className="ms-p" role="status">No amount is available for this period.</p>
        : preview.state === "error" ? <p className="ms-p" role="status">The billing preview could not be read: {preview.message}. No amount is shown.</p>
        : pv && <div className="ms-bill">
          <ul className="ms-stats">
            <li><span>Ready to claim</span><b>{pv.count}</b></li>
            <li><span>Blocked</span><b className={g.blockedBy.length ? "is-due" : undefined}>{g.blockedBy.reduce((t, x) => t + x.count, 0)}{g.partial ? "+" : ""}</b></li>
            <li><span>Draft bill</span><b>{pv.count === 0 ? "₹0" : pv.contract && pv.total !== null ? `₹${pv.total}` : "—"}</b></li>
          </ul>
          {pv.count > 0 && (pv.contract ? <>
            <ul className="ms-lines">{billLines(pv).map((l) => <li key={l.procedure}><span>{LABEL[l.procedure] ?? l.procedure}</span><span>{l.units} × {l.rate ? `₹${l.rate}` : "no rate"}</span><b>{l.rate ? `₹${l.amount}` : "—"}</b></li>)}</ul>
            <small className="ms-src"><FileCheck2 size={13} aria-hidden /> {pv.contract.name} v{pv.contract.version}{pv.unpriced ? ` · ${pv.unpriced} without a rate` : ""}</small>
          </> : <small className="ms-src">No contract with {officeName} covers {b.label}.</small>)}
          {pv.too_many && <small className="ms-src" role="status">Over 2,000 procedures: prepare shorter periods.</small>}
        </div>)}

      {(g.blockedBy.length > 0 || g.partial) && <>
        <h3 className="ms-sub">Blocking</h3>
        {g.blockedBy.length > 0 && <ul className="ms-list">{g.blockedBy.slice(0, compact ? 3 : 6).map((x) => (
          <li key={x.reason}><Link href={x.href}><span>{x.reason}</span><b>{x.count}</b><ArrowRight size={13} aria-hidden /></Link></li>
        ))}</ul>}

      </>}

      {canPrepare && office && pv && already && <p className="ms-done"><Check size={14} aria-hidden /> The {b.label} package is prepared. <a href="#ms-packages">See it below</a></p>}
      {canPrepare && office && ready && <button type="button" className="btn is-ink is-s" disabled={busy} onClick={() => void prepare()}>{busy ? "Preparing and checking…" : `Prepare ${already ? "another" : "the"} ${b.label} package · ₹${pv?.total}`}</button>}
      {err && <p role="alert" className="ms-err">{err}</p>}
    </section>
  );
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
