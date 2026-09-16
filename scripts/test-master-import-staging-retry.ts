import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseMasterWorkbook } from "../src/lib/master-import/pipeline";
import { resolveExistingStaging } from "../src/lib/master-import/staging";

const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
  ["Date", "Location", "Case Detail"],
  ["2025-02-01", "RS Puram", "Wound care"],
  ["2025-02-01", "RS Puram", "Wound care"],
]), "Rescue Requests 2025");
const parsed = parseMasterWorkbook(XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
const rows = parsed.sheets[0].rows;
assert.notEqual(rows[0].normalized.fingerprint, rows[1].normalized.fingerprint, "identical physical spreadsheet rows must retain separate staging identities");

let batches: any[] = [{ id: "failed-batch", status: "staged", rows_total: 2, sheet_name: "Rescue Requests 2025", mapping: { master_import_v2: true } }];
let storedRows = new Map([["failed-batch", 1]]);
const deleted: string[][] = [];

class Query {
  action = "select"; batchId = ""; ids: string[] = [];
  constructor(readonly table: string) {}
  select() { return this; }
  eq(key: string, value: string) { if (this.table === "import_rows" && key === "batch_id") this.batchId = value; return this; }
  in(_key: string, ids: string[]) { this.ids = ids; return this; }
  delete() { this.action = "delete"; return this; }
  then(resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) {
    if (this.table === "import_batches" && this.action === "select") return Promise.resolve({ data: batches, error: null }).then(resolve, reject);
    if (this.table === "import_batches" && this.action === "delete") { deleted.push(this.ids); batches = batches.filter((batch) => !this.ids.includes(batch.id)); return Promise.resolve({ error: null }).then(resolve, reject); }
    if (this.table === "import_rows") return Promise.resolve({ count: storedRows.get(this.batchId) ?? 0, error: null }).then(resolve, reject);
    return Promise.resolve({ count: 0, error: null }).then(resolve, reject);
  }
}
const supa = { from: (table: string) => new Query(table) };
const expected = [{ name: "Rescue Requests 2025", rows: 2 }];

async function main() {
  const cleared = await resolveExistingStaging(supa, "ngo-1", parsed.workbookHash, expected);
  assert.deepEqual(cleared, { batchIds: [], rowsStaged: 0, clearedIncomplete: true }, "a partial V2 staging attempt should be removed before retry");
  assert.deepEqual(deleted, [["failed-batch"]], "only incomplete staged batch IDs may be deleted");

  batches = [{ id: "complete-batch", status: "staged", rows_total: 2, sheet_name: "Rescue Requests 2025", mapping: { master_import_v2: true } }];
  storedRows = new Map([["complete-batch", 2]]);
  const reusable = await resolveExistingStaging(supa, "ngo-1", parsed.workbookHash, expected);
  assert.deepEqual(reusable, { batchIds: ["complete-batch"], rowsStaged: 2, clearedIncomplete: false }, "a complete same-hash stage must remain idempotently reusable");

  console.log("Master import staging retry regression passed.");
}

void main();
