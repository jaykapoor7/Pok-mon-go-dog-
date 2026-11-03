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
  bill: { contract: string; reference: string; illustrative: boolean; lines: { code: Procedure; rate: string | null; units: number; amount: string | null }[]; total: string | null } | null;
  billNote: string;
  /** The queue read was cut off before the month began, so counts may be low. */
  partial: boolean;
  basis: string;
};
export type Procedure = "sterilisation" | "vaccination";

const paise = (v: string | number) => { const m = String(v).match(/^(\d+)(?:\.(\d{1,2}))?$/); return m ? Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0")) : null; };
const rupees = (p: number) => `${Math.floor(p / 100)}.${String(p % 100).padStart(2, "0")}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function monthBounds(now: Date, previous = false) {
  const y = now.getUTCFullYear(), m = now.getUTCMonth() - (previous ? 1 : 0);
  const start = new Date(Date.UTC(y, m, 1)), end = new Date(Date.UTC(y, m + 1, 0));
  return { start: iso(start), end: iso(end), label: start.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }) };
}

export function monthlyPlan(rows: QueueRow[], catalog: { contracts: Contract[]; rates: ContractRate[] }, office: string | null, now: Date, previous = false, procedureOf: Record<string, Procedure> = {}, readLimit = 500): MonthlyPlan {
  const b = monthBounds(now, previous);
  /* The queue is newest first and capped; if the cap was reached before the
     month's first day, older records of the month were not read. */
  const oldest = rows.length ? rows[rows.length - 1].created_at.slice(0, 10) : null;
  const partial = rows.length >= readLimit && !!oldest && oldest >= b.start;
  /* Same period basis as the server's package (case record date), so the
     forecast matches what "Prepare package" will actually include. */
  const inMonth = rows.filter((r) => r.provenance !== "imported_historical_record" && r.created_at.slice(0, 10) >= b.start && r.created_at.slice(0, 10) <= b.end);
  const counts = { evidence: 0, vet: 0, review: 0, returned: 0, ready: 0, packaged: 0, accepted: 0 } as Record<Stage, number>;
  const missing = new Map<EvidenceKind, number>();
  const readyBy: Record<Procedure, number> = { sterilisation: 0, vaccination: 0 };
  let unknownProcedure = 0;
  for (const r of inMonth) {
    const s = stageOf(r); counts[s]++;
    if (s === "evidence") for (const k of r.missing) missing.set(k, (missing.get(k) ?? 0) + 1);
    if (s === "ready") { const p = procedureOf[r.case_id]; if (p) readyBy[p]++; else unknownProcedure++; }
  }
  const blockedBy = [
    ...[...missing].sort((a, c) => c[1] - a[1]).map(([k, n]) => ({ reason: `Missing ${EVIDENCE_LABEL[k].toLowerCase()}`, count: n, href: "/ngo/verification?stage=evidence" })),
    ...(counts.vet ? [{ reason: "Waiting for veterinary authorisation", count: counts.vet, href: "/ngo/verification?stage=vet" }] : []),
    ...(counts.review ? [{ reason: "Waiting for coordinator evidence review", count: counts.review, href: "/ngo/verification?stage=review" }] : []),
    ...(counts.returned ? [{ reason: "Returned for correction", count: counts.returned, href: "/ngo/verification?stage=returned" }] : []),
  ];
  /* Each procedure is priced at the source contract's own rate for this office; never a guessed rate. */
  const contract = office ? catalog.contracts.find((c) => c.office_id === office && c.starts_on <= b.start && c.ends_on >= b.end) ?? null : null;
  let bill: MonthlyPlan["bill"] = null;
  if (contract) {
    const lines = (["sterilisation", "vaccination"] as Procedure[]).filter((code) => readyBy[code] > 0).map((code) => {
      const rate = catalog.rates.find((r) => r.contract_id === contract.id && r.code === code);
      const p = rate ? paise(rate.unit_rate) : null;
      return { code, rate: p === null ? null : rupees(p), units: readyBy[code], amount: p === null ? null : rupees(p * readyBy[code]), paise: p === null ? null : p * readyBy[code] };
    });
    const complete = lines.every((l) => l.paise !== null) && unknownProcedure === 0;
    bill = { contract: `${contract.name} v${contract.version}`, reference: contract.reference, illustrative: contract.illustrative, lines: lines.map(({ paise: _p, ...l }) => l), total: complete ? rupees(lines.reduce((t, l) => t + (l.paise ?? 0), 0)) : null };
  }
  const billNote = !office ? "Choose the reviewing office to price the claim." : !contract ? "No source contract for this office covers the whole month, so the amount is unknown."
    : bill && bill.total === null ? "Some procedures have no contract rate or no recorded procedure type, so the total is unknown."
    : "Draft only: the municipality decides what is accepted. StrayPaw does not process payments.";
  return { ...b, counts, claimable: counts.ready, blockedBy, bill, billNote, partial, basis: "Counted by case record date, the same period rule the package uses." };
}
