/* The workspace importer against an in-memory database: what each kind of
   row becomes, that sending a chunk twice changes nothing, that an animal
   ID joins rows (and joins the team's own record), and that places never
   block an import. Run: npm run test:ngo-import */
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { readWorkbook } from "../src/lib/ngo-import/read";
import { writeChunk, type Org } from "../src/lib/ngo-import/write";

delete process.env.MAPBOX_ACCESS_TOKEN; delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const today = new Date("2026-10-22T00:00:00Z");
type Row = Record<string, any>;
const db: Record<string, Row[]> = { dogs: [], cases: [], medical_events: [], animal_followups: [], animal_timeline_events: [], import_rows: [], import_location_cache: [] };
let id = 0;

class Q {
  filters: ((r: Row) => boolean)[] = []; op: "select" | "insert" | "upsert" | "update" = "select"; payload: any; cap = Infinity; one = false;
  constructor(public table: string) {}
  select() { return this; }
  eq(k: string, v: any) { this.filters.push((r) => r[k] === v); return this; }
  in(k: string, v: any[]) { this.filters.push((r) => v.includes(r[k])); return this; }
  order() { return this; }
  limit(n: number) { this.cap = n; return this; }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  upsert(p: any) { this.op = "upsert"; this.payload = p; return this; }
  update(p: any) { this.op = "update"; this.payload = p; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; return this; }
  then(ok: (v: any) => any, no?: (e: any) => any) { return Promise.resolve(this.run()).then(ok, no); }
  run() {
    const t = (db[this.table] ??= []);
    if (this.op === "insert" || this.op === "upsert") {
      const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r: Row) => {
        if (this.op === "upsert") {
          const k = this.table === "import_location_cache" ? "normalized_query" : "import_source_key";
          const prev = t.find((x) => x[k] === r[k]);
          if (prev) { Object.assign(prev, r); return prev; }
        }
        if (r.import_source_key && t.some((x) => x.import_source_key === r.import_source_key) && this.table === "dogs") throw new Error("duplicate key");
        const row = { id: `${this.table}-${++id}`, ...r }; t.push(row); return row;
      });
      return { data: this.one ? rows[0] : rows, error: null };
    }
    const hit = t.filter((r) => this.filters.every((f) => f(r)));
    if (this.op === "update") { hit.forEach((r) => Object.assign(r, this.payload)); return { data: hit, error: null }; }
    const data = hit.slice(0, this.cap);
    return { data: this.one ? data[0] ?? null : data, error: null };
  }
}
const supa = { from: (t: string) => new Q(t) };
const org: Org = { id: "ngo-1", name: "Pawsome", city: "Coimbatore", state: "Tamil Nadu" };
const actor = { id: "user-1", label: "team@example.org" };
const count = (t: string) => db[t].length;
const send = async (records: unknown[]) => { const out = { animals: 0, cases: 0, care: 0, followUps: 0, already: 0, held: 0 }; for (let i = 0; i < records.length; i += 50) { const r = await writeChunk(supa, org, actor, "batch-1", records.slice(i, i + 50), today); for (const k of Object.keys(out) as (keyof typeof out)[]) out[k] += r[k]; } return out; };

const book = (sheets: Record<string, unknown[][]>) => {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows, { cellDates: true }), name);
  return XLSX.write(wb, { type: "array", bookType: "xlsx", cellDates: true }) as ArrayBuffer;
};
const recordsOf = (wb: ArrayBuffer, name: string) => readWorkbook(XLSX, wb, name, today).sheets.filter((s) => s.kind !== "skip").flatMap((s) => s.records);

async function main() {
/* ── A rescue list with no animal IDs ── */
const rescue = book({
  "Rescue Requests 2025": [
    ["Date", "Call via", "Location", "Case detail", "Injury Type", "Status", "Detailed Status"],
    ["17-Oct", "Yaamie", "Papanaickenpalayam", "Puppy with huge ticks", "Ticks", "Closed", "Rescued, vaccinated at JSR"],
    ["26-Oct", "Timothy", "TVS Nagar", "White dog with maggot wound", "Maggot", "Closed", "Taken to HAH"],
    ["2-Dec", "Priya", "RS Puram", "Brown dog hit by a bike", "RTA", "Died", "Died on the way"],
    ["3-Dec", "Arun", "", "Black dog with wound on the back", "Minor injury", "Inprogress", "No answer"],
  ],
});
const r1 = recordsOf(rescue, "rescue.xlsx");
let out = await send(r1);
assert.deepEqual({ a: out.animals, c: out.cases, h: out.held }, { a: 4, c: 4, h: 0 }, "each unnamed rescue is its own animal and case");
assert.equal(count("animal_timeline_events"), 4, "a timeline entry per case");
assert.equal(count("import_rows"), 4);
const died = db.cases.find((c) => c.title.startsWith("RTA"))!;
assert.equal(died.status, "resolved"); assert.equal(died.closure_reason, "died");
const open = db.cases.find((c) => c.title.startsWith("Minor injury"))!;
assert.equal(open.status, "in_progress"); assert.equal(open.provenance, "imported_historical_record", "open imported cases wait in the team's review queue"); assert.equal(open.verification_state, "source_record");
assert.ok(db.dogs.every((d) => d.city === "Coimbatore" && d.lat && d.h3_r8), "every animal is placed, at least at the city centre");
assert.ok(db.dogs.every((d) => d.name === null), "no invented names");
assert.ok(db.import_rows.every((r) => !("Call via" in r.raw_row)), "contacts never stored");

/* Sending the same rows again changes nothing. */
const before = Object.fromEntries(Object.keys(db).map((k) => [k, count(k)]));
out = await send(r1);
assert.equal(out.already, 4);
assert.deepEqual(Object.fromEntries(Object.keys(db).map((k) => [k, count(k)])), before, "a retried chunk writes nothing new");

/* Next month's longer copy only adds the new row. */
const longer = book({ "Rescue Requests 2025": [
  ["Date", "Call via", "Location", "Case detail", "Injury Type", "Status", "Detailed Status"],
  ["17-Oct", "Yaamie", "Papanaickenpalayam", "Puppy with huge ticks", "Ticks", "Closed", "Rescued, vaccinated at JSR"],
  ["26-Oct", "Timothy", "TVS Nagar", "White dog with maggot wound", "Maggot", "Closed", "Taken to HAH"],
  ["2-Dec", "Priya", "RS Puram", "Brown dog hit by a bike", "RTA", "Died", "Died on the way"],
  ["3-Dec", "Arun", "", "Black dog with wound on the back", "Minor injury", "Inprogress", "No answer"],
  ["9-Dec", "Kavya", "Peelamedu", "Dog with a swollen leg", "Fracture", "Inprogress", "Splinted"],
] });
out = await send(recordsOf(longer, "rescue (Dec).xlsx"));
assert.deepEqual({ a: out.animals, c: out.cases, already: out.already }, { a: 1, c: 1, already: 4 });

/* ── A register with animal IDs, follow-ups and the team's own record ── */
db.dogs.push({ id: "own-dog", ngo_id: "ngo-1", code: "PF-002", import_source_key: null });
const ids = book({ Sheet1: [
  ["Animal ID", "Dog name", "Area", "City", "Date of rescue", "Problem", "Remarks", "Status", "Next review"],
  ["PF-001", "Bholu", "Saibaba Colony", "Coimbatore", new Date("2024-03-13T00:00:00Z"), "Skin infection", "Mange", "Under treatment", "20-12-2026"],
  ["PF-002", "", "Ganapathy", "Coimbatore", "05.04.24", "Fracture", "", "Recovered", ""],
  ["PF-001", "Bholu", "Saibaba Colony", "Coimbatore", "13/05/2024", "Recheck", "Healed", "Closed", "01-01-2025"],
] });
const before2 = count("dogs");
out = await send(recordsOf(ids, "log.xlsx"));
assert.equal(out.animals, 1, "PF-001 becomes one animal; PF-002 is the team's own record");
assert.equal(count("dogs") - before2, 1);
assert.ok(db.cases.some((c) => c.dog_id === "own-dog"), "linked to the existing animal by its ID");
assert.equal(db.animal_followups.length, 1, "only a review still ahead becomes a follow-up task");
assert.equal(db.animal_followups[0].due_at, "2026-12-20");

/* ── A vaccination export with GPS ── */
const mr = book({ "Vacc dataset": [
  ["DogId", "Date_Created", "Ward", "Lat", "Long", "Sex", "Ownership", "Neuter_Status", "Action"],
  ["R-1", new Date("2015-01-18T23:00:00.000Z"), "Ward 29", 11.0168, 76.9558, "Male", "Free Roaming", "Neutered", "marked and released"],
  ["R-2", new Date("2015-01-14T23:00:00.000Z"), "Ward 29", 11.0172, 76.9561, "Female", "Free Roaming", "Entire", "clinic(neutering)"],
  ["R-3", new Date("2015-01-14T23:00:00.000Z"), "Ward 30", 11.0181, 76.957, "Female", "Owned", "Entire", "vaccinated"],
] });
const care0 = count("medical_events");
out = await send(recordsOf(mr, "mr.xlsx"));
assert.equal(out.held, 1, "an owned pet is held, not imported");
assert.equal(out.animals, 2);
assert.equal(count("medical_events") - care0, 2);
const r1dog = db.dogs.find((d) => d.code === "R-1")!;
assert.equal(r1dog.location_precision, "exact"); assert.equal(r1dog.sterilised, true); assert.equal(r1dog.vaccinated, true);
assert.equal(db.dogs.find((d) => d.code === "R-2")!.sterilisation_status, "sterilised");

/* ── Places: a cached locality inside the city is used; one far away is not ── */
db.import_location_cache.push({ normalized_query: "peelamedu, coimbatore, tamil nadu, india", lat: 11.026, lng: 76.996, precision: "approximate" });
db.import_location_cache.push({ normalized_query: "ganapathy, coimbatore, tamil nadu, india", lat: 28.6, lng: 77.2, precision: "approximate" });
const placed = book({ Rescues: [["Date", "Location", "Condition"], ["1/9/2026", "Peelamedu", "Limping"], ["2/9/2026", "Ganapathy", "Wound"]] });
await send(recordsOf(placed, "placed.xlsx"));
const pee = db.dogs.find((d) => d.zone === "Peelamedu" && d.geographic_precision?.startsWith("Locality"))!;
assert.equal(pee.lat, 11.026);
const gan = db.dogs.filter((d) => d.zone === "Ganapathy").at(-1)!;
assert.ok(gan.geographic_precision.startsWith("City centre"), "a geocode outside the city is refused, the city centre is used");

/* ── Hostile input is cleaned on the server ── */
const res = await writeChunk(supa, org, actor, "batch-1", [{ key: "x\" or 1=1", sheet: "a", row: 1, kind: "rescue" }, { key: "abc", sheet: "S", row: 2, kind: "rescue", raw: { "Informer phone": "999" }, locality: "Saravanampatti", lat: 999, lng: 1 }], today);
assert.equal(res.held, 1, "a malformed record is refused");
assert.ok(!db.import_rows.some((r) => "Informer phone" in r.raw_row));
assert.ok(db.dogs.filter((d) => d.lat != null).every((d) => Math.abs(d.lat) <= 90), "an impossible coordinate is never stored");

console.log("ngo-import write: all checks passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
