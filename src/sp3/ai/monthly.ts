/* ════════════════════════════════════════════════════════════════════
   Kaju · the monthly submission: what still blocks records of a month.

   Guidance from the ABC verification queue (newest 500 records; a read cut
   off inside the month is flagged). What can be claimed, and for how much,
   is never computed here: it comes from the database's billing preview,
   which uses the same rule as package preparation.
   ════════════════════════════════════════════════════════════════════ */

import { EVIDENCE_LABEL, stageOf, type EvidenceKind, type QueueRow, type Stage } from "@/lib/abc";

export type MonthlyPlan = {
  label: string; start: string; end: string;
  counts: Record<Stage, number>;
  blockedBy: { reason: string; count: number; href: string }[];
  /** The queue read was cut off before the month began, so these counts may be low. */
  partial: boolean;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function monthBounds(now: Date, previous = false) {
  const y = now.getUTCFullYear(), m = now.getUTCMonth() - (previous ? 1 : 0);
  const start = new Date(Date.UTC(y, m, 1)), end = new Date(Date.UTC(y, m + 1, 0));
  return { start: iso(start), end: iso(end), label: start.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }) };
}

/** What still blocks records recorded in the month. Guidance only: what can be
 *  claimed, and for how much, comes from the server's billing preview. */
export function monthlyPlan(rows: QueueRow[], now: Date, previous = false, readLimit = 500): MonthlyPlan {
  const b = monthBounds(now, previous);
  const oldest = rows.length ? rows[rows.length - 1].created_at.slice(0, 10) : null;
  const partial = rows.length >= readLimit && !!oldest && oldest >= b.start;
  const inMonth = rows.filter((r) => r.provenance !== "imported_historical_record" && r.created_at.slice(0, 10) >= b.start && r.created_at.slice(0, 10) <= b.end);
  const counts = { evidence: 0, vet: 0, review: 0, returned: 0, ready: 0, packaged: 0, accepted: 0 } as Record<Stage, number>;
  const missing = new Map<EvidenceKind, number>();
  for (const r of inMonth) { const s = stageOf(r); counts[s]++; if (s === "evidence") for (const k of r.missing) missing.set(k, (missing.get(k) ?? 0) + 1); }
  const blockedBy = [
    ...[...missing].sort((a, c) => c[1] - a[1]).map(([k, n]) => ({ reason: `Missing ${EVIDENCE_LABEL[k].toLowerCase()}`, count: n, href: "/ngo/verification?stage=evidence" })),
    ...(counts.vet ? [{ reason: "Waiting for veterinary authorisation", count: counts.vet, href: "/ngo/verification?stage=vet" }] : []),
    ...(counts.review ? [{ reason: "Waiting for coordinator evidence review", count: counts.review, href: "/ngo/verification?stage=review" }] : []),
    ...(counts.returned ? [{ reason: "Returned for correction", count: counts.returned, href: "/ngo/verification?stage=returned" }] : []),
  ];
  return { ...b, counts, blockedBy, partial };
}
