/* Pins down the app's explicit state machines (src/lib/machines). If a move,
   label or grouping changes, this fails and docs/STATE-MACHINES.md must change
   with it. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PACKAGE_ACTIONS, PACKAGE_STATE, PACKAGE_STATUSES, actionsFor, isDecided, isWaitingOnOffice, isWithOperator, nextStatus, type PackageStatus } from "../src/lib/machines/package";
import { STAGE_NEXT, STAGE_ORDER } from "../src/lib/machines/abc-stage";
import { STAGE_LABEL, stageOf, type QueueRow } from "../src/lib/abc";

/* Package lifecycle */
for (const [a, d] of Object.entries(PACKAGE_ACTIONS)) {
  for (const f of d.from) assert.ok(PACKAGE_STATUSES.includes(f), `${a}: unknown from ${f}`);
  assert.ok(PACKAGE_STATUSES.includes(d.to), `${a}: unknown to ${d.to}`);
}
assert.deepEqual(actionsFor("operator", "draft"), ["submitted"]);
assert.deepEqual(actionsFor("operator", "returned"), ["submitted"]);
assert.deepEqual(actionsFor("operator", "queried"), ["answer"]);
assert.deepEqual(actionsFor("reviewer", "submitted"), ["accepted", "query", "returned"]);
for (const s of PACKAGE_STATUSES) {
  if (PACKAGE_STATE[s].final) assert.deepEqual([...actionsFor("operator", s), ...actionsFor("reviewer", s)], [], `${s} is final but has moves`);
  /* whoever holds the package is the only side offered moves */
  const h = PACKAGE_STATE[s].holder;
  if (h === "operator") assert.equal(actionsFor("reviewer", s).length, 0, s);
  if (h === "office") assert.equal(actionsFor("operator", s).length, 0, s);
}
assert.equal(nextStatus("submitted", "query"), "queried");
assert.equal(nextStatus("queried", "answer"), "submitted");
assert.equal(nextStatus("accepted", "returned"), null);
/* every status except the per-record outcome is reachable from draft by single actions */
const seen = new Set<PackageStatus>(["draft"]); let grew = true;
while (grew) { grew = false; for (const d of Object.values(PACKAGE_ACTIONS)) if (d.from.some((f) => seen.has(f)) && !seen.has(d.to)) { seen.add(d.to); grew = true; } }
assert.deepEqual([...PACKAGE_STATUSES].filter((s) => !seen.has(s)), ["partially_accepted"]);
/* the three screen groupings never overlap, and unknown statuses fall in none */
for (const s of PACKAGE_STATUSES) assert.ok([isWaitingOnOffice(s), isWithOperator(s), isDecided(s)].filter(Boolean).length <= 1, s);
assert.deepEqual([isWaitingOnOffice("archived"), isWithOperator("archived"), isDecided("archived")], [false, false, false]);
/* no screen re-derives the groupings by hand */
for (const f of ["src/sp/city/OfficeStrip.tsx", "src/sp/abc/ReviewInbox.tsx", "src/sp3/ai/engine.ts"]) {
  const src = readFileSync(f, "utf8");
  assert.ok(!/status === "queried" \|\| \w+\.status === "returned"/.test(src), `${f} re-derives "with the operator"`);
  assert.ok(!/status === "accepted" \|\| \w+\.status === "partially_accepted"/.test(src), `${f} re-derives "decided"`);
}
assert.ok(readFileSync("src/lib/demo/abc-demo.ts", "utf8").includes("nextStatus("), "recording demo must move packages through the machine");

/* ABC case stage */
assert.deepEqual([...STAGE_ORDER].sort(), Object.keys(STAGE_LABEL).sort());
assert.deepEqual(Object.keys(STAGE_NEXT).sort(), Object.keys(STAGE_LABEL).sort());
const row = (o: Partial<QueueRow>): QueueRow => ({ case_id: "c", case_code: null, title: null, city: null, created_at: "", provenance: null, evidence_count: 0, missing: [], vet_authorised: false, evidence_reviewed: false, government_accepted: false, vet_name: null, reviewer_name: null, returned_note: null, returned_by: null, in_package: null, ...o });
assert.equal(stageOf(row({ missing: ["surgery_record"] })), "evidence");
assert.equal(stageOf(row({})), "vet");
assert.equal(stageOf(row({ vet_authorised: true })), "review");
assert.equal(stageOf(row({ vet_authorised: true, missing: ["release_photo"] })), "evidence");
assert.equal(stageOf(row({ returned_note: "x" })), "returned");
assert.equal(stageOf(row({ evidence_reviewed: true })), "ready");
assert.equal(stageOf(row({ evidence_reviewed: true, in_package: "draft" })), "packaged");
assert.equal(stageOf(row({ in_package: "submitted" })), "packaged");
assert.equal(stageOf(row({ government_accepted: true })), "accepted");

console.log("state machines: ok");
