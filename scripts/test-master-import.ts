import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseMasterWorkbook } from "../src/lib/master-import/pipeline";
import { planImport } from "../src/lib/master-import/commit";

function bytes(book: XLSX.WorkBook) {
  return XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

const book = XLSX.utils.book_new();
const chiloo = [["Date", "Location", "Gender", "Remarks"]] as (string | number)[][];
for (let i = 0; i < 61; i++) chiloo.push([`2025-02-${String((i % 28) + 1).padStart(2, "0")}`, "RS Puram", i % 2 ? "Female" : "Male", "Sterilised"]);
for (let i = 0; i < 15; i++) chiloo.push(["", "", "", `Payment / note ${i + 1}`]);
XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(chiloo), "Chiloo Sterilization Drive");
XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
  ["Date", "Location", "Case Detail", "Animal name", "Gender", "Colour"],
  ["2-Jan", "Saibaba Colony", "Road traffic injury", "Pinky", "Female", "Black"],
  ["3-Jan", "RS Puram", "Wound care", "", "", ""],
]), "Rescue Requests 2025");
XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
  ["Month", "Location", "Adoptions", "Month", "Location", "Foster"],
  ["2025-04-01", "Peelamedu", "Milo", "2025-04-02", "Gandhipuram", "Luna"],
]), "Adopt - Foster");

const parsed = parseMasterWorkbook(bytes(book), "renamed-by-user.xlsx");
assert.equal(parsed.counts.sterilisation, 76, "all ledger rows remain classified as sterilisation source rows");
assert.equal(parsed.acceptedRows, 65, "only operational rows, including both adopt/foster events, are eligible");
assert.equal(parsed.identityCandidates, 1, "a named animal must also have corroborating traits before profile matching");
assert.equal(parsed.unidentified, 64, "identity confidence remains visible for workbook-local matching");
const drive = parsed.sheets.find((sheet) => sheet.name === "Chiloo Sterilization Drive");
assert.equal(drive?.rows.filter((row) => row.normalized.event_date && row.normalized.locality).length, 61, "drive campaign total counts only dated locality records");
const foster = parsed.sheets.find((sheet) => sheet.name === "Adopt - Foster");
assert.deepEqual(foster?.rows.map((row) => row.normalized.source_subrecord), ["adoption", "foster"], "one physical row may create two explicitly labelled source events");
assert.match(parsed.sheets.find((sheet) => sheet.name === "Rescue Requests 2025")!.rows[0].normalized.event_date ?? "", /^2025-01-02T/, "sheet year is retained for partial dates");

const plan = planImport(parsed.sheets.flatMap((sheet) => sheet.rows.map((row) => ({ normalized: row.normalized, matched_dog_id: null, decision: row.normalized.event_date && row.normalized.locality ? "new" : "skip", imported_dog_id: null, imported_case_id: null }))));
assert.equal(plan.profilesToCreate, 65, "valid unnamed ledger records become native animal profiles");
assert.equal(plan.sterilisations, 61, "only dated, located sterilisation records become native care events");
assert.equal(plan.cases, 4, "rescue, adoption and foster records become canonical cases");

console.log("Master import parser regression checks passed.");
