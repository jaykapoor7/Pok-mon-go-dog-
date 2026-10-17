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

/* StrayPaw 2.0: the same cohort separation, asserted on the screens that replaced Today and Field. */
const work = readFileSync(new URL("../src/sp/ngo/Work.tsx", import.meta.url), "utf8");
const field = readFileSync(new URL("../src/sp/ngo/Field.tsx", import.meta.url), "utf8");
const imp = readFileSync(new URL("../src/sp/ngo/Import.tsx", import.meta.url), "utf8");
assert.match(work, /f\.source === "scheduled" && Date\.parse\(f\.due_at\) < now/, "Work's overdue follow-ups are scheduled ones only");
assert.match(work, /isHistoricalCase/, "Work keeps imported, unconfirmed cases in their own cohort");
assert.match(field, /f\.source === "scheduled"/, "Field keeps historical dates separate");
assert.match(imp, /\/ngo\/review\?cohort=history/, "An import's receipt links to its exact review cohort");

console.log("Operational follow-up cohorts and exact links passed.");
