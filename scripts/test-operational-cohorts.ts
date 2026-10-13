import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isHistoricalFollowup } from "../src/lib/ops";

const base = { case_id: "case-1", kind: "review", import_batch_id: null, import_source_key: null };

assert.equal(isHistoricalFollowup(base), false, "a current case schedule stays current");
assert.equal(isHistoricalFollowup({ ...base, import_batch_id: "batch-1" }), true, "an import batch is historical");
assert.equal(isHistoricalFollowup({ ...base, import_source_key: "row-1" }), true, "an import source key is historical");
assert.equal(isHistoricalFollowup({ ...base, kind: "imported_follow_up" }), true, "an imported kind is historical");
assert.equal(isHistoricalFollowup({ ...base, case_provenance: "imported_historical_record" }), true, "an imported case is historical");
assert.equal(isHistoricalFollowup({ ...base, case_id: null, animal_provenance: "imported_historical_record" }), true, "an unlinked imported animal date is historical");
assert.equal(isHistoricalFollowup({ ...base, animal_provenance: "imported_historical_record" }), false, "a current linked case remains authoritative");

const today = readFileSync(new URL("../src/components/partner/OpsRoom.tsx", import.meta.url), "utf8");
const field = readFileSync(new URL("../src/components/partner/FieldToday.tsx", import.meta.url), "utf8");
assert.match(today, /\/partner\/followups\?view=overdue/, "Today's overdue metric links to its exact scheduled cohort");
assert.match(today, /\/partner\/review\?tab=historical/, "Today's imported decisions link to their exact review cohort");
assert.match(field, /\/partner\/followups\?view=historical/, "Field keeps historical dates separate");

console.log("Operational follow-up cohorts and exact links passed.");
