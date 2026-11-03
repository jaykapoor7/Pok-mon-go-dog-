/* Monthly guidance and bill lines. Amounts come from the database preview;
   the client only groups them, exactly, and flags a truncated blocker read. */
import assert from "node:assert/strict";
import { monthlyPlan } from "../src/sp3/ai/monthly";
import { billLines, type BillingPreview } from "../src/lib/billing";
import type { QueueRow } from "../src/lib/abc";

const row = (o: Partial<QueueRow>): QueueRow => ({ case_id: "c", case_code: "SPC", title: "t", city: "Coimbatore", created_at: "2026-11-02T10:00:00Z", provenance: null, evidence_count: 5, missing: [], vet_authorised: true, evidence_reviewed: true, government_accepted: false, vet_name: "Dr", reviewer_name: "Co", returned_note: null, returned_by: null, in_package: null, ...o });
const now = new Date("2026-11-20T00:00:00Z");
const g = monthlyPlan([row({}), row({ evidence_reviewed: false, missing: ["release_photo"] }), row({ evidence_reviewed: false, vet_authorised: false }), row({ provenance: "imported_historical_record", evidence_reviewed: false, vet_authorised: false })], now);
assert.ok(g.blockedBy.some((b) => b.reason === "Missing release photo" && b.href.includes("stage=evidence")));
assert.equal(g.counts.vet, 1, "historical records are not blockers");
assert.equal(monthlyPlan(Array.from({ length: 500 }, (_, i) => row({ case_id: `x${i}`, created_at: "2026-11-15T00:00:00Z" })), now).partial, true);
const pv = { claims: [
  { case_id: "a", case_code: null, procedure: "sterilisation", procedure_date: "2026-11-02", rate_id: "r", unit_rate: "1450.50" },
  { case_id: "b", case_code: null, procedure: "sterilisation", procedure_date: "2026-11-02", rate_id: "r", unit_rate: "1450.50" },
  { case_id: "c", case_code: null, procedure: "vaccination", procedure_date: "2026-11-03", rate_id: "v", unit_rate: "180.00" },
  { case_id: "d", case_code: null, procedure: "treatment", procedure_date: "2026-11-03", rate_id: null, unit_rate: null },
] } as BillingPreview;
assert.deepEqual(billLines(pv), [{ procedure: "sterilisation", units: 2, rate: "1450.50", amount: "2901.00" }, { procedure: "vaccination", units: 1, rate: "180.00", amount: "180.00" }, { procedure: "treatment", units: 1, rate: null, amount: null }]);
console.log("monthly submission: 4 checks passed");
