import assert from "node:assert/strict";
import { commitStaged } from "../src/lib/master-import/commit";

type Row = { id: string; batch_id: string; normalized: any; matched_dog_id: null; classification: string; decision: string; imported_dog_id: null; imported_case_id: null };

const total = 2324;
const sourceRows: Row[] = Array.from({ length: total }, (_, index) => ({
  id: `row-${index + 1}`,
  batch_id: "batch-pawesome",
  classification: "rescue",
  decision: "review",
  matched_dog_id: null,
  imported_dog_id: null,
  imported_case_id: null,
  normalized: {
    source_sheet: "Rescue Requests 2025", source_row: index + 2,
    classification: "rescue", classification_reason: "Rescue request register",
    event_date: "2025-01-02T00:00:00.000Z", locality: "RS Puram", city: "Coimbatore",
    animal_name: null, animal_code: null, sex: null, colour: null,
    condition: "Road traffic injury", status: "closed", case_detail: "Historic rescue request",
    treatment_update: null, review: null, rescue_plan: null, admit_date: null, release_date: null,
    fingerprint: `fp-${index + 1}`,
  },
}));

const caseWrites: any[] = [];
const ranges: number[] = [];

class Query {
  table: string; operation = "select"; payload: any; filterId: string | null = null;
  constructor(table: string) { this.table = table; }
  select() { return this; }
  in() { return this; }
  eq(_key?: string, value?: string) { if (_key === "id") this.filterId = value ?? null; return this; }
  neq() { return this; }
  order() { return this; }
  range(from: number, to: number) {
    if (this.table === "import_rows") ranges.push(from);
    const rows = this.table === "import_rows" ? sourceRows.slice(from, to + 1) : [];
    return Promise.resolve({ data: rows, error: null });
  }
  maybeSingle() {
    if (this.table === "import_location_cache") return Promise.resolve({ data: { lat: 11.0168, lng: 76.9558, precision: "approximate" }, error: null });
    return Promise.resolve({ data: null, error: null });
  }
  insert(payload: any) { this.operation = "insert"; this.payload = payload; if (this.table === "cases") caseWrites.push(payload); return this; }
  update(payload: any) { this.operation = "update"; this.payload = payload; return this; }
  upsert() { return Promise.resolve({ error: null }); }
  single() { return Promise.resolve({ data: this.table === "cases" ? { id: `case-${caseWrites.length}` } : null, error: null }); }
  then(resolve: (value: any) => unknown, reject?: (reason: any) => unknown) { return Promise.resolve({ data: null, error: null }).then(resolve, reject); }
}

async function main() {
  process.env.MAPBOX_ACCESS_TOKEN = "test-token";
  const supa = { from: (table: string) => new Query(table) };
  const result = await commitStaged(supa, { id: "ngo-pawesome", name: "The Pawsome People Project", city: "Coimbatore", state: "Tamil Nadu" }, ["batch-pawesome"]);

  assert.equal(result.casesCreated, total, "every staged source row must survive the import path");
  assert.equal(caseWrites.length, total, "the database write path must not stop at 1,000 rows");
  assert.deepEqual(ranges, [0, 500, 1000, 1500, 2000], "import_rows must be paginated in 500-row reads");
  assert.deepEqual(result.localityStatus, { recordsFound: total, successfullyGeocoded: total, unresolved: 0, geocoderConfigured: true, requiredEnv: null });

  console.log(`Master import pagination integration passed: ${total} staged rows committed across ${ranges.length} pages.`);
}

void main();
