/* Step 5: the monthly submission is computed from existing records, priced
   per procedure from the source contract of the chosen office, in exact
   paise; truncated reads are reported, never presented as complete. */
import assert from "node:assert/strict";
import { monthlyPlan } from "../src/sp3/ai/monthly";
import type { QueueRow } from "../src/lib/abc";

const row = (o: Partial<QueueRow>): QueueRow => ({ case_id: "c", case_code: "SPC", title: "t", city: "Coimbatore", created_at: "2026-11-02T10:00:00Z", provenance: null, evidence_count: 5, missing: [], vet_authorised: true, evidence_reviewed: true, government_accepted: false, vet_name: "Dr", reviewer_name: "Co", returned_note: null, returned_by: null, in_package: null, ...o });
const rows = [row({ case_id: "s1" }), row({ case_id: "s2" }), row({ case_id: "v1" }), row({ case_id: "e1", evidence_reviewed: false, missing: ["release_photo"] }), row({ case_id: "w1", evidence_reviewed: false, vet_authorised: false }), row({ case_id: "o1", created_at: "2026-10-30T10:00:00Z" }), row({ case_id: "h1", provenance: "imported_historical_record" })];
const kinds = { s1: "sterilisation", s2: "sterilisation", v1: "vaccination", o1: "sterilisation" } as const;
const now = new Date("2026-11-20T00:00:00Z");
const contract = { id: "k", ngo_id: "n", office_id: "o", name: "ABC contract", version: 2, reference: "WO/14/2026", starts_on: "2026-04-01", ends_on: "2027-03-31", currency: "INR" as const, illustrative: false };
const rates = [{ id: "r", contract_id: "k", code: "sterilisation", label: "S", unit_rate: "1450.50", required_evidence: [], required_events: [] }, { id: "r2", contract_id: "k", code: "vaccination", label: "V", unit_rate: "180", required_evidence: [], required_events: [] }] as never;
let n = 0; const ok = () => n++;
const p = monthlyPlan(rows, { contracts: [contract], rates }, "o", now, false, kinds);
assert.equal(p.claimable, 3); assert.equal(p.counts.evidence, 1); assert.equal(p.counts.vet, 1); ok();
assert.deepEqual(p.bill?.lines.map((l) => [l.code, l.units, l.amount]), [["sterilisation", 2, "2901.00"], ["vaccination", 1, "180.00"]]); assert.equal(p.bill?.total, "3081.00"); ok();
assert.ok(p.blockedBy.some((b) => b.reason === "Missing release photo" && b.href.includes("stage=evidence"))); ok();
assert.equal(monthlyPlan(rows, { contracts: [contract], rates }, null, now, false, kinds).bill, null, "no office chosen, no price"); ok();
assert.equal(monthlyPlan(rows, { contracts: [contract], rates }, "other-office", now, false, kinds).bill, null, "another office's contract is never used"); ok();
assert.equal(monthlyPlan(rows, { contracts: [contract], rates }, "o", now, false, { s1: "sterilisation" }).bill?.total, null, "unknown procedure type means unknown total"); ok();
assert.equal(monthlyPlan(rows, { contracts: [contract], rates }, "o", now, true, kinds).claimable, 1, "last month counted separately; imports never billed"); ok();
const capped = Array.from({ length: 500 }, (_, i) => row({ case_id: `x${i}`, created_at: "2026-11-15T00:00:00Z" }));
assert.equal(monthlyPlan(capped, { contracts: [], rates: [] }, "o", now).partial, true, "a read cut off inside the month is flagged"); ok();
assert.equal(monthlyPlan(rows, { contracts: [], rates: [] }, "o", now).partial, false); ok();
console.log(`monthly submission: ${n} checks passed`);
