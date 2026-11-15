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

/* The same cohort separation, asserted on the screens that do this work now. */
const cases = readFileSync(new URL("../src/nx/pages/Cases.tsx", import.meta.url), "utf8");
const ops = readFileSync(new URL("../src/nx/pages/ngo/Operations.tsx", import.meta.url), "utf8");
const field = readFileSync(new URL("../src/nx/pages/ngo/Field.tsx", import.meta.url), "utf8");
const imp = readFileSync(new URL("../src/nx/pages/ngo/Import.tsx", import.meta.url), "utf8");
assert.match(ops, /imported\(f\.source\) \? "Imported" : dayOf\(f\.due_at\)/, "Operations shows imported follow-up dates as imported, never as overdue");
assert.match(cases, /isHistorical\(c\)/, "Cases keeps imported, unconfirmed cases in their own cohort");
assert.match(field, /f\.source === "scheduled"/, "Field keeps historical dates separate");
assert.match(imp, /\/ngo\/cases\?view=imported/, "An import's receipt links to its exact review cohort");

console.log("Operational follow-up cohorts and exact links passed.");
