/* Kaju package check: exceptions are found from the sources, clean claims are
   only those with nothing missing, and Kaju never records a decision. */
import assert from "node:assert/strict";
import { checkPackage } from "../src/sp3/ai/packageCheck";
import type { ClaimItem } from "../src/lib/reconciliation";

const item = (o: Partial<ClaimItem>): ClaimItem => ({ key: o.case_id ?? "k", case_id: "c1", claim_id: "cl", case_code: "SPC-1", animal_id: "a1", title: "Dog", procedure: "sterilisation", procedure_label: "Sterilisation", claimed_units: 1, unit_rate: "1450.00", claimed_amount: "1450.00", decision: "pending", accepted_units: null, note: null, reviewer: null, decided_at: null, missing: [], signoffs_snapshot: [{ id: "s1", kind: "vet_authorised", actor: "Dr Rao" }, { id: "s2", kind: "evidence_reviewed", actor: "Coordinator" }], ...o, });
const r = checkPackage([
  item({ key: "a", case_id: "c1" }),
  item({ key: "b", case_id: "c2", animal_id: "a2", missing: ["release_photo"], signoffs_snapshot: [{ id: "s", kind: "evidence_reviewed", actor: "Coordinator" }] }),
  item({ key: "c", case_id: "c3", animal_id: "a3", claimed_amount: "1500.00" }),
  item({ key: "d", case_id: "c4", animal_id: "a1" }),
  item({ key: "e", case_id: "c5", animal_id: "a5", decision: "accepted" }),
], []);
const by = (k: string) => r.checks.find((c) => c.key === k)!;
assert.ok(!by("a").clean && by("a").issues.some((x) => x.includes("more than once")), "a repeated animal is an exception");
assert.ok(by("b").issues.includes("Missing evidence: Release photo") || by("b").issues.some((x) => x.startsWith("Missing evidence")));
assert.ok(by("b").issues.includes("No veterinary authorisation recorded"));
assert.ok(by("c").issues.some((x) => x.startsWith("Amount does not equal")));
assert.ok(by("e").clean && by("e").draft.includes("Dr Rao") && by("e").draft.includes("1450.00"));
assert.equal(r.clean, 0, "only pending claims are offered for decision"); assert.equal(r.decided, 1); assert.equal(r.exceptions, 4);
assert.ok(by("b").draft.startsWith("Query on SPC-1") && by("b").suggested === "query");
console.log("package check: 7 checks passed");
