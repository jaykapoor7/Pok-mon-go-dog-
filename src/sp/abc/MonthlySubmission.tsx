"use client";

/* Step 5, prepared continuously: this month's government submission from
   records already kept. What can be claimed, what blocks the rest (each a
   link to the exact queue), the draft bill from the source contract, and
   one confirmed action to prepare the month's package. Submission stays a
   separate, deliberate step on the package; acceptance is the office's. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, FileCheck2, Sparkles } from "lucide-react";
import { createPackage, offices, packages, verificationQueue, type Office } from "@/lib/abc";
import { readContracts } from "@/lib/reconciliation";
import { monthlyPlan, type Procedure } from "@/sp3/ai/monthly";
import { getSupabase } from "@/lib/supabase";
import type { Contract, ContractRate } from "@/lib/reconciliation";
import type { QueueRow } from "@/lib/abc";

export function MonthlySubmission({ canPrepare, compact = false }: { canPrepare: boolean; compact?: boolean }) {
  const router = useRouter();
  type Source = { rows: QueueRow[]; catalog: { contracts: Contract[]; rates: ContractRate[] }; offices: Office[]; existing: Set<string>; procedureOf: Record<string, Procedure> };
  const [src, setSrc] = useState<Source | null>(null);
  const [office, setOffice] = useState<string>("");
  const [which, setWhich] = useState<"current" | "previous">("current");
  const [state, setState] = useState<"loading" | "ok" | "off" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([verificationQueue(500), readContracts().catch(() => ({ contracts: [], rates: [] })), offices(), packages()])
      .then(async ([rows, catalog, offs, pkgs]) => {
        /* Procedure type per case, so each is priced at its own contract rate. */
        const procedureOf: Record<string, Procedure> = {};
        const ids = rows.map((r) => r.case_id);
        for (let i = 0; i < ids.length; i += 150) {
          const { data, error } = await getSupabase()!.from("cases").select("id,category").in("id", ids.slice(i, i + 150));
          if (error) throw error;
          for (const c of data ?? []) if (c.category === "sterilisation" || c.category === "vaccination") procedureOf[c.id] = c.category;
        }
        if (!live) return;
        setSrc({ rows, catalog, offices: offs, existing: new Set(pkgs.map((p) => `${p.period_start.slice(0, 10)}|${p.office_id}`)), procedureOf });
        /* One office: chosen for you. Several: you choose; nothing is assumed. */
        if (offs.length === 1) setOffice(offs[0].id);
        if (new Date().getUTCDate() <= 7) setWhich("previous");
        setState("ok");
      })
      .catch((e: Error) => { if (live) setState(/not switched on/i.test(e.message) ? "off" : "error"); });
    return () => { live = false; };
  }, []);
  const plan = src ? {
    current: monthlyPlan(src.rows, src.catalog, office || null, new Date(), false, src.procedureOf),
    previous: monthlyPlan(src.rows, src.catalog, office || null, new Date(), true, src.procedureOf),
    office: src.offices.find((o) => o.id === office) ?? null, existing: src.existing,
  } : null;

  if (state === "off") return null;
  if (state === "loading") return <section className="ms" aria-busy="true"><h2 className="ms-h"><Sparkles size={14} aria-hidden /> Monthly submission</h2><p className="ms-p">Kaju is reading this month’s procedures and contract…</p></section>;
  if (state === "error" || !plan) return <section className="ms"><h2 className="ms-h"><Sparkles size={14} aria-hidden /> Monthly submission</h2><p className="ms-p" role="status">The month’s records could not be read. Nothing is assumed ready.</p></section>;

  const p = plan[which];
  const already = plan.office ? plan.existing.has(`${p.start}|${plan.office.id}`) : false;
  const offs = src?.offices ?? [];
  const prepare = async () => {
    if (!plan.office || !window.confirm(`Prepare the ${p.label} package for ${plan.office.name}? It is created as a draft with the ${p.claimable} approved procedure${p.claimable === 1 ? "" : "s"}; you review and submit it yourself.`)) return;
    setBusy(true); setErr(null);
    try { const id = await createPackage(`ABC claims · ${p.label}`, p.start, p.end, plan.office.id); window.dispatchEvent(new Event("kaju:verified")); router.push(`/ngo/packages/${id}`); }
    catch (e) { setErr(e instanceof Error ? e.message : "The package could not be prepared."); setBusy(false); }
  };
  const total = Object.values(p.counts).reduce((a, b) => a + b, 0);

  return (
    <section className="ms" aria-labelledby="ms-h">
      <div className="ms-top">
        <h2 id="ms-h" className="ms-h"><Sparkles size={14} aria-hidden /> Monthly submission · {p.label}</h2>
        <div className="ms-switch" role="group" aria-label="Month">
          <button type="button" aria-pressed={which === "previous"} onClick={() => setWhich("previous")}>{plan.previous.label.split(" ")[0]}</button>
          <button type="button" aria-pressed={which === "current"} onClick={() => setWhich("current")}>{plan.current.label.split(" ")[0]}</button>
        </div>
      </div>
      {total === 0 ? <p className="ms-p">No ABC procedures recorded for {p.label} yet.</p> : <>
        <p className="ms-p"><b>{p.claimable}</b> of {total} procedure{total === 1 ? "" : "s"} can be claimed now{p.counts.packaged + p.counts.accepted ? ` · ${p.counts.packaged + p.counts.accepted} already in a package` : ""}.</p>
        {p.blockedBy.length > 0 && <ul className="ms-list">{p.blockedBy.slice(0, compact ? 3 : 6).map((x) => (
          <li key={x.reason}><Link href={x.href}><span>{x.reason}</span><b>{x.count}</b><ArrowRight size={13} aria-hidden /></Link></li>
        ))}</ul>}
        {offs.length > 1 && <label className="ms-office">Reviewing office <select className="select" value={office} onChange={(e) => setOffice(e.target.value)}><option value="">Choose…</option>{offs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>}
        <div className="ms-bill">
          {p.bill && p.bill.lines.length > 0 && <>
            <p><FileCheck2 size={14} aria-hidden /> Draft bill <small>{p.bill.contract} · source {p.bill.reference}{p.bill.illustrative ? " · illustrative contract" : ""}</small></p>
            <ul>{p.bill.lines.map((l) => <li key={l.code}>{l.code === "sterilisation" ? "Sterilisation (ABC)" : "Anti-rabies vaccination"}: {l.units} × {l.rate ? `₹${l.rate} = ₹${l.amount}` : "rate not in contract"}</li>)}</ul>
            {p.bill.total && <p>Total <b>₹{p.bill.total}</b></p>}
          </>}
          <small>{p.billNote} {p.basis}</small>
          {p.partial && <small role="status">Only the 500 most recent ABC records were read, and they did not reach the start of {p.label}. Counts for the month may be low.</small>}
        </div>
      </>}
      {canPrepare && plan.office && p.claimable > 0 && (already
        ? <Link className="btn is-s" href="/ngo/packages">The {p.label} package exists · open packages</Link>
        : <button type="button" className="btn is-ink is-s" disabled={busy} onClick={() => void prepare()}>{busy ? "Preparing…" : `Prepare the ${p.label} package`}</button>)}
      {canPrepare && !plan.office && <p className="ms-p"><small>No reviewing office is linked yet, so a package cannot be prepared.</small></p>}
      {err && <p role="alert" className="ms-err">{err}</p>}
    </section>
  );
}
