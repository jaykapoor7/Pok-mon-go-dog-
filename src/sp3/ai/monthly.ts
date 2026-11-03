/* ════════════════════════════════════════════════════════════════════
   Kaju · the monthly government submission, prepared continuously.

   From records the team already keeps (the ABC verification queue and the
   source contract), Kaju works out for a month: which procedures can be
   claimed now, which are blocked and by exactly what, and a draft bill
   (units × the contract's own rate, in paise, never floating point).
   Nothing is submitted or billed here: the operator prepares the package
   and the municipality decides. No contract means the amount is unknown.
   ════════════════════════════════════════════════════════════════════ */

import { EVIDENCE_LABEL, stageOf, type EvidenceKind, type QueueRow, type Stage } from "@/lib/abc";
import type { Contract, ContractRate } from "@/lib/reconciliation";

export type MonthlyPlan = {
  label: string; start: string; end: string;
  counts: Record<Stage, number>;
  claimable: number;
  blockedBy: { reason: string; count: number; href: string }[];
  bill: { contract: string; reference: string; rate: string; units: number; amount: string; illustrative: boolean } | null;
  billNote: string;
};

const paise = (v: string | number) => { const m = String(v).match(/^(\d+)(?:\.(\d{1,2}))?$/); return m ? Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0")) : null; };
const rupees = (p: number) => `${Math.floor(p / 100)}.${String(p % 100).padStart(2, "0")}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function monthBounds(now: Date, previous = false) {
  const y = now.getUTCFullYear(), m = now.getUTCMonth() - (previous ? 1 : 0);
  const start = new Date(Date.UTC(y, m, 1)), end = new Date(Date.UTC(y, m + 1, 0));
  return { start: iso(start), end: iso(end), label: start.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }) };
}

export function monthlyPlan(rows: QueueRow[], catalog: { contracts: Contract[]; rates: ContractRate[] }, office: string | null, now: Date, previous = false): MonthlyPlan {
  const b = monthBounds(now, previous);
  const inMonth = rows.filter((r) => r.provenance !== "imported_historical_record" && r.created_at.slice(0, 10) >= b.start && r.created_at.slice(0, 10) <= b.end);
  const counts = { evidence: 0, vet: 0, review: 0, returned: 0, ready: 0, packaged: 0, accepted: 0 } as Record<Stage, number>;
  const missing = new Map<EvidenceKind, number>();
  for (const r of inMonth) {
    const s = stageOf(r); counts[s]++;
    if (s === "evidence") for (const k of r.missing) missing.set(k, (missing.get(k) ?? 0) + 1);
  }
  const blockedBy = [
    ...[...missing].sort((a, c) => c[1] - a[1]).map(([k, n]) => ({ reason: `Missing ${EVIDENCE_LABEL[k].toLowerCase()}`, count: n, href: "/ngo/verification?stage=evidence" })),
    ...(counts.vet ? [{ reason: "Waiting for veterinary authorisation", count: counts.vet, href: "/ngo/verification?stage=vet" }] : []),
    ...(counts.review ? [{ reason: "Waiting for coordinator evidence review", count: counts.review, href: "/ngo/verification?stage=review" }] : []),
    ...(counts.returned ? [{ reason: "Returned for correction", count: counts.returned, href: "/ngo/verification?stage=returned" }] : []),
  ];
  /* The bill uses the source contract covering the whole month for this office, never a guessed rate. */
  const contract = catalog.contracts.find((c) => (!office || c.office_id === office) && c.starts_on <= b.start && c.ends_on >= b.end) ?? null;
  const rate = contract ? catalog.rates.find((r) => r.contract_id === contract.id && r.code === "sterilisation") : null;
  const p = rate ? paise(rate.unit_rate) : null;
  const bill = contract && rate && p !== null ? { contract: `${contract.name} v${contract.version}`, reference: contract.reference, rate: rupees(p), units: counts.ready, amount: rupees(p * counts.ready), illustrative: contract.illustrative } : null;
  const billNote = !contract ? "No source contract covers this month, so the amount is unknown." : !rate ? "The contract has no sterilisation rate, so the amount is unknown." : "Draft only: the municipality decides what is accepted. StrayPaw does not process payments.";
  return { ...b, counts, claimable: counts.ready, blockedBy, bill, billNote };
}
