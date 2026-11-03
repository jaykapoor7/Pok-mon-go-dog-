/* Step 5: the monthly submission is computed from existing records, with a
   bill only from a source contract, in exact paise arithmetic. */
import assert from "node:assert/strict";
import { monthlyPlan } from "../src/sp3/ai/monthly";
import type { QueueRow } from "../src/lib/abc";

const row = (o: Partial<QueueRow>): QueueRow => ({ case_id: "c", case_code: "SPC", title: "t", city: "Coimbatore", created_at: "2026-11-02T10:00:00Z", provenance: null, evidence_count: 5, missing: [], vet_authorised: true, evidence_reviewed: true, government_accepted: false, vet_name: "Dr", reviewer_name: "Co", returned_note: null, returned_by: null, in_package: null, ...o });
const rows = [row({}), row({}), row({ evidence_reviewed: false, missing: ["release_photo"] }), row({ evidence_reviewed: false, vet_authorised: false }), row({ created_at: "2026-10-30T10:00:00Z" }), row({ provenance: "imported_historical_record" })];
const now = new Date("2026-11-20T00:00:00Z");
const contract = { id: "k", ngo_id: "n", office_id: "o", name: "ABC contract", version: 2, reference: "WO/14/2026", starts_on: "2026-04-01", ends_on: "2027-03-31", currency: "INR" as const, illustrative: false };
const rate = { id: "r", contract_id: "k", code: "sterilisation" as const, label: "Sterilisation", unit_rate: "1450.50", required_evidence: [], required_events: [] } as never;
const p = monthlyPlan(rows, { contracts: [contract], rates: [rate] }, "o", now);
assert.equal(p.claimable, 2); assert.equal(p.counts.evidence, 1); assert.equal(p.counts.vet, 1);
assert.equal(p.bill?.amount, "2901.00"); assert.equal(p.bill?.rate, "1450.50");
assert.ok(p.blockedBy.some((b) => b.reason === "Missing release photo" && b.href.includes("stage=evidence")));
const none = monthlyPlan(rows, { contracts: [], rates: [] }, "o", now);
assert.equal(none.bill, null); assert.match(none.billNote, /amount is unknown/);
assert.equal(monthlyPlan(rows, { contracts: [contract], rates: [rate] }, "o", now, true).claimable, 1, "last month counted separately; imports never billed");
console.log("monthly submission: 6 checks passed");
