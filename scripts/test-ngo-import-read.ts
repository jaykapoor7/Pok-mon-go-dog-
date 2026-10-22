/* Reads registers shaped like the ones NGOs actually keep and checks what
   the import would do with them. Run: npm run test:ngo-import */
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { readDate, readWorkbook, rereadSheet, settleYears, summarise } from "../src/lib/ngo-import/read";

const today = new Date("2026-10-22T00:00:00Z");
const book = (sheets: Record<string, unknown[][]>) => {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows, { cellDates: true }), name);
  return XLSX.write(wb, { type: "array", bookType: "xlsx", cellDates: true }) as ArrayBuffer;
};

/* ── Dates ── */
assert.deepEqual(readDate("13/03/2024"), { y: 2024, m: 3, d: 13 });
assert.deepEqual(readDate("05.04.24"), { y: 2024, m: 4, d: 5 }, "day first, Indian style");
assert.deepEqual(readDate("03/25/2024"), { y: 2024, m: 3, d: 25 }, "only reading that works is US");
assert.deepEqual(readDate("26-Oct"), { y: null, m: 10, d: 26 });
assert.deepEqual(readDate("26-Nov-"), { y: null, m: 11, d: 26 });
assert.deepEqual(readDate("4th March 2025"), { y: 2025, m: 3, d: 4 });
assert.deepEqual(readDate("Oct 2025"), { y: 2025, m: 10, d: null });
assert.deepEqual(readDate("2015-01-18T23:00:00.000Z"), { y: 2015, m: 1, d: 18 });
assert.deepEqual(readDate(45366), { y: 2024, m: 3, d: 15 }, "Excel serial");
assert.deepEqual(readDate(new Date("2015-01-18T23:00:00.000Z")), { y: 2015, m: 1, d: 19 }, "a date cell shifted by a timezone rounds to its day");
assert.equal(readDate("call back later"), null);
const wrap = settleYears([readDate("20-Nov"), readDate("15-Dec"), readDate("3-Jan"), readDate("9-Feb")], "Rescue Requests", 2024, today);
assert.deepEqual([...wrap], ["2024-11-20", "2024-12-15", "2025-01-03", "2025-02-09"], "months wrapping into a new year");
const future = settleYears([readDate("20-Nov"), readDate("15-Dec")], "Rescues", 2026, today);
assert.deepEqual([...future], ["2025-11-20", "2025-12-15"], "a yearless register never lands in the future");

/* ── A rescue list like Pawsome's ── */
const rescue = book({
  "Rescue Requests": [
    ["Date", "Month", "Call via", "Informer number", "Location", "Case detail", "Injury Type", "Status", "Detailed Status", "Rescue Plan"],
    ["17-Oct", "Oct", "Yaamie", "98400 00000", "Papanaickenpalayam", "Puppy with huge ticks", "Ticks", "Closed", "Rescued 3 puppies. Vaccinated at JSR", ""],
    ["26-Oct", "Oct", "Timothy", "98400 00001", "TVS Nagar", "White dog with maggot wound under the tail", "Maggot", "Closed", "Rescued on 26-Oct. Taken to HAH", "26-Oct"],
    ["", "Nov", "", "", "", "", "", "", "", ""],
    ["2-Dec", "Dec", "Priya", "", "RS Puram", "Brown dog hit by a bike", "RTA", "Died", "Died on the way", ""],
    ["3-Jan", "Jan", "Arun", "", "Gandhipuram", "Black dog with wound on the back", "Minor injury", "Inprogress", "informer didnt pick up the call", ""],
    ["Total", "", "", "", "", "", "", "", "", ""],
  ],
  "TVT": [
    ["Date", "Month", "Call via", "Location", "Case detail", "Injury Type", "Status", "Review Date", "Detailed Status"],
    ["25-Oct", "Oct", "Pawsome", "Nava India", "Brown dog with TVT", "TVT", "Inprogress", "4-Nov- done 19-Nov", "1st dose given"],
  ],
  "Van details": [["Date", "Km start", "Km end", "Diesel"], ["1-Oct", 100, 140, 500]],
  "Salary": [["Name", "Month", "Amount"], ["Ravi", "Oct", 12000]],
});
const r1 = readWorkbook(XLSX, rescue, "_Rescue List.xlsx", today);
const sheet = (n: string) => r1.sheets.find((s) => s.name === n)!;
assert.equal(sheet("Rescue Requests").kind, "rescue");
assert.equal(sheet("TVT").kind, "treatment");
assert.equal(sheet("Van details").kind, "skip");
assert.equal(sheet("Salary").kind, "skip");
const rr = sheet("Rescue Requests");
assert.equal(rr.records.length, 4, "blank month rows and totals are not records");
assert.equal(rr.empty, 2);
assert.ok(rr.privateColumns.includes("Call via") && rr.privateColumns.includes("Informer number"));
for (const r of rr.records) {
  assert.ok(!("Call via" in r.raw) && !("Informer number" in r.raw), "contact columns never leave the device");
}
assert.equal(rr.mapping.condition, "Injury Type");
assert.equal(rr.mapping.detail, "Case detail");
assert.equal(rr.mapping.locality, "Location");
assert.equal(rr.mapping.status, "Status");
assert.equal(rr.mapping.outcome, "Detailed Status");
assert.equal(rr.yearless, 4);
const dates = rr.records.map((r) => r.date);
assert.ok(dates[3]! > dates[2]!, "January follows December");
assert.equal(rr.records[2].closed, "died");
assert.equal(rr.records[0].closed, "closed");
assert.equal(rr.records[3].closed, null);
const tvt = sheet("TVT").records[0];
assert.equal(tvt.kind, "treatment");
assert.ok(tvt.followUp?.endsWith("-11-04"), "review date read from a messy cell");

/* Re-reading is stable, and a longer copy only adds new keys. */
const again = readWorkbook(XLSX, rescue, "_Rescue List (1).xlsx", today);
assert.deepEqual(again.sheets[0].records.map((r) => r.key), rr.records.map((r) => r.key));

/* A person can set the year of a yearless sheet. */
const set = rereadSheet(XLSX, rescue, "_Rescue List.xlsx", rr, "rescue", rr.mapping, r1.workbookYear, 2023, today);
assert.ok(set.records[0].date?.startsWith("2023-10-17"));
assert.ok(set.records[3].date?.startsWith("2024-01-03"));

/* ── A vaccination export with GPS, like Mission Rabies ── */
const mr = book({
  "Vacc dataset": [
    ["DogId", "Date_Created", "Ward", "Lat", "Long", "Sex", "Age", "Ownership", "Neuter_Status", "Action", "Health"],
    ["R-1", new Date("2015-01-18T23:00:00.000Z"), "Ward 29", 23.353946, 85.316674, "Male", "Adult", "Free Roaming", "Neutered", "marked and released", "Healthy"],
    ["R-2", new Date("2015-01-14T23:00:00.000Z"), "Ward 29", 23.351582, 85.311078, "Female", "Adult", "Free Roaming", "Entire", "clinic(neutering)", "Healthy"],
    ["R-3", new Date("2015-01-14T23:00:00.000Z"), "Ward 30", 85.3111, 23.3516, "Female", "Adult", "Owned", "Entire", "vaccinated", "Healthy"],
    ["R-4", new Date("2015-01-15T23:00:00.000Z"), "Ward 31", 85.3111, 23.3516, "Female", "Puppy", "Free Roaming", "Entire", "vaccinated", "Healthy"],
  ],
});
const m1 = readWorkbook(XLSX, mr, "mission-rabies.xlsx", today).sheets[0];
assert.equal(m1.mapping.code, "DogId");
assert.equal(m1.mapping.lat, "Lat");
assert.equal(m1.mapping.lng, "Long");
assert.equal(m1.mapping.sterilised, "Neuter_Status");
assert.equal(m1.mapping.date, "Date_Created");
assert.ok(["vaccination", "animal", "sterilisation"].includes(m1.kind));
assert.equal(m1.records[0].kind, "vaccination", "marked and released = vaccinated");
assert.equal(m1.records[0].sterilised, true);
assert.equal(m1.records[1].kind, "sterilisation", "taken for neutering");
assert.ok(m1.records[2].notes[0].includes("owned pet"), "owned dogs are not street animals");
assert.equal(m1.records[3].lat, 23.3516, "swapped coordinates are put right");
assert.equal(m1.records[0].date, "2015-01-19");
assert.equal(m1.records[0].sex, "male");

/* ── A generic sheet with a title row and mixed dates ── */
const generic = book({
  Sheet1: [
    ["Paws Foundation · rescue log 2024"],
    [],
    ["S.No", "Animal ID", "Dog name", "Area", "City", "Date of rescue", "Problem", "Remarks", "Status"],
    [1, "PF-001", "Bholu", "Sector 14", "Gurugram", new Date("2024-03-13T00:00:00Z"), "Skin infection", "Mange, treated", "Recovered"],
    [2, "PF-002", "", "Sector 15", "Gurugram", "05.04.24", "Fracture", "", "Under treatment"],
    [3, "PF-001", "Bholu", "Sector 14", "Gurugram", "13/05/2024", "Recheck", "Healed", "Closed"],
  ],
  Cats: [["Name", "Area", "Date", "Problem"], ["Mini", "Sector 1", "1/2/2024", "Eye"]],
});
const g = readWorkbook(XLSX, generic, "log.xlsx", today);
const gs = g.sheets.find((s) => s.name === "Sheet1")!;
assert.equal(gs.headerRow, 3, "the header is found under a title row");
assert.equal(gs.kind, "rescue");
assert.equal(gs.mapping.code, "Animal ID");
assert.equal(gs.mapping.city, "City");
assert.deepEqual(gs.records.map((r) => r.date), ["2024-03-13", "2024-04-05", "2024-05-13"]);
assert.equal(gs.records[0].closed, "recovered");
const cats = g.sheets.find((s) => s.name === "Cats")!;
assert.ok(cats.records.every((r) => r.notes[0]?.startsWith("Not a dog")), "a cat sheet is never imported as dogs");
const sum = summarise(g.sheets);
assert.equal(sum.records, 3);
assert.equal(sum.animals, 2, "two rows with one Animal ID are one animal");

/* ── A CSV keeps day-first dates ── */
const csv = new TextEncoder().encode("Dog ID,Date,Locality,Condition\nC-1,05/04/2024,Anna Nagar,Wound\nC-2,13/03/2024,Adyar,Mange\n").buffer as ArrayBuffer;
const c1 = readWorkbook(XLSX, csv, "export.csv", today).sheets[0];
assert.deepEqual(c1.records.map((r) => r.date), ["2024-04-05", "2024-03-13"]);
assert.equal(c1.records[0].code, "C-1");

console.log("ngo-import read: all checks passed");
