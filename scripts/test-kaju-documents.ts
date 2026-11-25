import assert from "node:assert/strict";
import { cleanComposed, compareRows, composeReport, isoDate, normTag, periodFromText, rowsFromText } from "../src/sp3/ai/documents";
import { composed } from "../src/sp3/ai/validation";
import { parseResultText, sarvamApproved, tableToText } from "../src/lib/sarvam";
import type { ToolCtx } from "../src/sp3/ai/tools";

/* Kaju and attached documents: the comparison with the register is by fixed rules, the report is bounded and never
   built without Confirm, and Sarvam is closed unless each use was approved by name. No network, no model. */
let n = 0; const ok = (m: string) => { n++; console.log(`ok ${n} - ${m}`); };
globalThis.fetch = (async () => { throw new Error("no network in this test"); }) as typeof fetch;

assert.equal(isoDate("03-10-2026"), "2026-10-03"); assert.equal(isoDate("3/10/26"), "2026-10-03"); assert.equal(isoDate("2026-10-03"), "2026-10-03");
assert.equal(isoDate("31-02-2026"), null); assert.equal(isoDate("soon"), null); assert.equal(normTag(" kor 101 "), "KOR-101");
ok("dates as written on Indian paperwork are read day first; impossible dates are refused");

const text = "Period: 01-10-2026 to 15-11-2026\nSl\tTag\tName\tSurgery\n1\tKOR-101\tBruno\t03-10-2026\tYes\n2\tIND-102\tKalu\t08-10-2026\n3\tno tag here\t09-10-2026\nTotal 2 to 15 dogs";
const read = rowsFromText(text);
assert.deepEqual(read.map((r) => r.tag), ["KOR-101", "IND-102"]); assert.equal(read[0].sterilised_on, "2026-10-03");
assert.deepEqual(periodFromText(text), { from: "2026-10-01", to: "2026-11-15" });
ok("rows are a tag with a date; a period line and ordinary words are not taken for tags");

const A = (code: string, name: string, s: string, events: [string, string][]) => ({ id: code, code, name, zone: "Ward", sterilisation_status: s, vaccination_status: "unknown", medical_events: events.map(([kind, event_date]) => ({ kind, event_date })) });
const animals = [A("KOR-101", "Bruno", "sterilised", [["sterilisation", "2026-10-03"]]), A("IND-102", "Kalu", "sterilised", [["sterilisation", "2026-10-06"]]), A("WHI-117", "Coco", "unknown", [["sterilisation", "2026-11-07"]]), A("YEL-118", "Ginger", "unknown", [])];
const extra = A("JAY-114", "Raja", "sterilised", [["sterilisation", "2026-11-05"]]);
const R = (tag: string, d: string | null) => ({ tag, name: "", ward: "", sterilised_on: d, vaccinated_on: null });
const r = compareRows([R("KOR-101", "2026-10-03"), R("IND-102", "2026-10-08"), R("WHI-117", "2026-11-07"), R("YEL-118", "2026-11-10"), R("KOR-141", "2026-11-12"), R("KOR-101", "2026-10-03"), R("", "2026-11-12")], animals, [...animals, extra], { document: "register.xlsx", claimed: 18, from: "2026-10-01", to: "2026-11-15" });
assert.equal(r.rows_in_document, 7); assert.equal(r.distinct_tags, 5); assert.equal(r.rows_without_tag, 1); assert.equal(r.agrees, 1);
assert.deepEqual(r.not_on_register.map((x) => x.tag), ["KOR-141"]); assert.deepEqual(r.repeated_in_document, [{ tag: "KOR-101", times: 2 }]);
assert.deepEqual(r.date_differs.map((x) => [x.tag, x.document, x.register]), [["IND-102", "2026-10-08", "2026-10-06"]]);
assert.deepEqual(r.status_not_updated.map((x) => x.tag), ["WHI-117"]); assert.deepEqual(r.not_recorded_on_register.map((x) => x.tag), ["YEL-118"]);
assert.deepEqual(r.on_register_not_in_document.map((x) => x.tag), ["JAY-114"]); assert.equal(r.claimed_total, 18);
ok("a register is compared by tag and date: agreed, missing, repeated, differing dates, stale statuses, and procedures the document leaves out");

const ctx = { db: {}, orgId: "org", userName: "Lead" } as unknown as ToolCtx;
const made = composeReport({ format: "docx", title: "Reconciliation of the East Zone register", kind: "Register reconciliation", addressed_to: "Joint Director", sections: [{ heading: "Summary", figures: [{ label: "Entries agree", value: "10" }], paragraphs: ["Ten of fifteen tags agree."], table: { columns: ["Tag", "Finding"], rows: [["KOR-141", "Not on the register"], ["IND-102"]] } }, { junk: true }], notes: ["Compared by tag number."] }, ctx);
assert.equal(made.ok, undefined); assert.equal(made.proposals?.length, 1);
const p = made.proposals![0]; assert.equal(p.kind, "composed_report");
if (p.kind === "composed_report") { assert.equal(p.format, "docx"); assert.equal(p.doc.sections.length, 1); assert.deepEqual(p.doc.sections[0].table?.rows[1], ["IND-102", ""]); assert.ok(composed(p.doc)); }
assert.equal(composeReport({ format: "pdf", title: "", sections: [] }, ctx).ok, false); assert.equal(composeReport({ format: "pdf", title: "T", sections: [{ heading: "H" }] }, { ...ctx, orgId: null }).ok, false);
assert.equal(cleanComposed({ title: "x".repeat(500), sections: [{ paragraphs: ["y".repeat(5000)] }] })?.sections[0].paragraphs[0].length, 1400);
assert.equal(composed({ title: "T", sections: [{ figures: [], paragraphs: [], table: { columns: [], rows: [] } }], notes: [] }), false);
ok("a report is a bounded proposal: junk sections dropped, ragged rows squared, long text cut, nothing without an organisation");

assert.equal(sarvamApproved("speech", {}), false); assert.equal(sarvamApproved("speech", { SARVAM_API_KEY: "k" }), false);
assert.equal(sarvamApproved("speech", { SARVAM_API_KEY: "k", STRAYPAW_SARVAM_APPROVED: "documents" }), false);
assert.equal(sarvamApproved("documents", { SARVAM_VOICE_API_KEY: "k", STRAYPAW_SARVAM_APPROVED: "speech, documents" }), true);
assert.equal(sarvamApproved("speech", { STRAYPAW_SARVAM_APPROVED: "speech" }), false);
ok("Sarvam stays closed without a key and an approval that names the use");

assert.equal(tableToText("<table><tr><th>Tag</th><th>Date</th></tr><tr><td>KOR-101</td><td>03-10-2026</td></tr></table>"), "Tag\tDate\nKOR-101\t03-10-2026");
const scan = parseResultText({ documents: [{ pages: [{ blocks: [{ text: "<table><tr><td>IND-102</td><td>08-10-2026</td></tr></table>", reading_order: 2 }, { text: "ABC register", reading_order: 1 }] }] }] });
assert.equal(scan.pages, 1); assert.equal(scan.text, "ABC register\nIND-102\t08-10-2026"); assert.equal(rowsFromText(scan.text)[0].tag, "IND-102");
ok("a scanned page's blocks become lines in reading order, tables as rows the rules can read");

console.log(`\n${n} checks passed`);
