import assert from "node:assert/strict";
import { commitStagedChunk } from "../src/lib/master-import/commit-resumable";

type Row = {
  id: string; batch_id: string; normalized: any; matched_dog_id: string | null; classification: string;
  decision: string; imported_dog_id: string | null; imported_case_id: string | null; error?: string | null;
};

const total = 205;
const rows: Row[] = Array.from({ length: total }, (_, i) => ({
  id: `row-${String(i + 1).padStart(3, "0")}`,
  batch_id: "batch-resume",
  classification: "rescue",
  decision: "review",
  matched_dog_id: null,
  imported_dog_id: null,
  imported_case_id: null,
  error: null,
  normalized: {
    source_sheet: "Rescue Requests 2025", source_row: i + 2,
    classification: "rescue", classification_reason: "Rescue request register",
    event_date: `2025-01-${String((i % 27) + 1).padStart(2, "0")}T00:00:00.000Z`, locality: "RS Puram", city: "Coimbatore",
    animal_name: null, animal_code: null, sex: null, colour: null,
    condition: "Road traffic injury", status: "closed", case_detail: `Historic rescue ${i + 1}`,
    treatment_update: null, review: null, rescue_plan: null, admit_date: null, release_date: null,
    fingerprint: `fp-${i + 1}`,
  },
}));

const dogs: any[] = [];
const cases: any[] = [];
const timelines: any[] = [];
const medical: any[] = [];
const followups: any[] = [];
const batches: any[] = [{ id: "batch-resume", status: "staged" }];
let nextDog = 1;
let nextCase = 1;
let nextTimeline = 1;

class Query {
  table: string;
  op = "select";
  payload: any;
  filters: Array<(row: any) => boolean> = [];
  constructor(table: string) { this.table = table; }
  select() { return this; }
  in(key: string, values: string[]) { this.filters.push((row) => values.includes(row[key])); return this; }
  eq(key: string, value: any) { this.filters.push((row) => row[key] === value); return this; }
  neq(key: string, value: any) { this.filters.push((row) => row[key] !== value); return this; }
  order() { return this; }
  update(payload: any) { this.op = "update"; this.payload = payload; return this; }
  insert(payload: any) { this.op = "insert"; this.payload = payload; return this; }
  maybeSingle() {
    if (this.table === "import_location_cache") return Promise.resolve({ data: { lat: 11.0168, lng: 76.9558, precision: "approximate" }, error: null });
    const data = this.source().filter((row) => this.filters.every((fn) => fn(row)))[0] ?? null;
    return Promise.resolve({ data, error: null });
  }
  range(from: number, to: number) {
    const data = this.source().filter((row) => this.filters.every((fn) => fn(row))).slice(from, to + 1);
    return Promise.resolve({ data, error: null });
  }
  single() {
    if (this.op !== "insert") return Promise.resolve({ data: null, error: null });
    if (this.table === "dogs") { const row = { id: `dog-${nextDog++}`, ...this.payload }; dogs.push(row); return Promise.resolve({ data: row, error: null }); }
    if (this.table === "cases") { const row = { id: `case-${nextCase++}`, ...this.payload }; cases.push(row); return Promise.resolve({ data: row, error: null }); }
    if (this.table === "animal_timeline_events") { const row = { id: `timeline-${nextTimeline++}`, ...this.payload }; timelines.push(row); return Promise.resolve({ data: row, error: null }); }
    if (this.table === "medical_events") { const row = { id: `medical-${medical.length + 1}`, ...this.payload }; medical.push(row); return Promise.resolve({ data: row, error: null }); }
    if (this.table === "animal_followups") { const row = { id: `followup-${followups.length + 1}`, ...this.payload }; followups.push(row); return Promise.resolve({ data: row, error: null }); }
    return Promise.resolve({ data: { id: "x", ...this.payload }, error: null });
  }
  then(resolve: (value: any) => unknown, reject?: (reason: any) => unknown) {
    if (this.op === "update") {
      for (const row of this.source().filter((row) => this.filters.every((fn) => fn(row)))) Object.assign(row, this.payload);
    } else if (this.op === "insert") {
      const target = this.source();
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      target.push(...items);
    }
    return Promise.resolve({ data: null, error: null }).then(resolve, reject);
  }
  source() {
    if (this.table === "import_rows") return rows;
    if (this.table === "dogs") return dogs;
    if (this.table === "cases") return cases;
    if (this.table === "medical_events") return medical;
    if (this.table === "animal_followups") return followups;
    if (this.table === "animal_timeline_events") return timelines;
    if (this.table === "import_batches") return batches;
    if (this.table === "campaigns") return [];
    return [];
  }
}

async function runChunk(supa: any) {
  return commitStagedChunk(supa, { id: "ngo-pawesome", name: "The Pawsome People Project", city: "Coimbatore", state: "Tamil Nadu" }, ["batch-resume"]);
}

async function main() {
  process.env.MAPBOX_ACCESS_TOKEN = "test-token";
  const supa = { from: (table: string) => new Query(table) };

  const first = await runChunk(supa);
  assert.equal(first.processedRows, 100);
  assert.equal(first.remainingRows, 105);
  assert.equal(dogs.length, 100);
  assert.equal(cases.length, 100);

  const second = await runChunk(supa);
  assert.equal(second.processedRows, 200);
  assert.equal(second.remainingRows, 5);
  assert.equal(dogs.length, 200);
  assert.equal(cases.length, 200);

  const third = await runChunk(supa);
  assert.equal(third.completed, true);
  assert.equal(third.processedRows, total);
  assert.equal(third.remainingRows, 0);
  assert.equal(dogs.length, total);
  assert.equal(cases.length, total);
  assert.equal(timelines.length, total);

  const retry = await runChunk(supa);
  assert.equal(retry.completed, true);
  assert.equal(dogs.length, total, "retry must not duplicate profiles");
  assert.equal(cases.length, total, "retry must not duplicate cases");
  assert.equal(timelines.length, total, "retry must not duplicate timeline events");

  console.log("Resumable master import passed: 205 rows committed as 100 + 100 + 5 and retry created zero duplicates.");
}

void main();
