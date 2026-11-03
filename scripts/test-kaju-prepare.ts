/* Kaju prepared work: stalled critical cases, promised reviews and locality
   spellings, using note and locality patterns seen in a real NGO register. */
import assert from "node:assert/strict";
import { localityVariants, promisedReviews, reviewDate, stalledCritical, workId, type CareEvent } from "../src/sp3/ai/prepare";

const now = new Date("2026-11-03T06:00:00Z");
let n = 0;
const ok = (m: string) => { n++; console.log(`ok ${n} - ${m}`); };

/* Review dates in the notes' own formats; unreadable or completed ones are not guessed. */
assert.deepEqual(reviewDate("The dog was rescued and treated in Ukam. Review on 19-Sep Brown dog with injured leg", "2026-09-13")?.date, "2026-09-19");
assert.equal(reviewDate("Review on 21-Rev", "2026-03-10"), null);
assert.equal(reviewDate("Review on 16-Jul done", "2026-07-10"), null);
assert.equal(reviewDate("Review Done", "2026-07-10"), null);
assert.equal(reviewDate("review on 3/1", "2025-12-28")?.date, "2026-01-03");
assert.equal(reviewDate("Review on 31-Feb", "2026-02-01"), null);
ok("review dates parse real formats and refuse to guess");

const ev = (id: string, dog: string, date: string, notes: string): CareEvent => ({ id, dog_id: dog, case_id: `c-${dog}`, event_date: date, notes, dog_label: dog, zone: "Vadavalli" });
const reviews = promisedReviews([
  ev("1", "d1", "2026-09-13", "Treated. Review on 19-Sep"),
  ev("2", "d2", "2026-09-13", "Treated. Review on 19-Sep"),
  ev("3", "d2", "2026-09-20", "Reviewed, healing"),
  ev("4", "d3", "2026-11-01", "Wound dressed. Review on 8-Nov"),
  ev("5", "d4", "2026-11-01", "Review on 8-Nov"),
], [{ dog_id: "d4", case_id: null, due_at: "2026-11-08T00:00:00Z" }], now);
assert.deepEqual(reviews.map((r) => [r.dogId, r.state]), [["d1", "missed"], ["d3", "upcoming"]]);
ok("a later care entry or a scheduled follow-up resolves a promised review");

const stalled = stalledCritical([
  { id: "a", case_code: "SPC-1", title: "Maggot wound", condition_class: "Maggot wound", occurred_at: "2026-09-01T00:00:00Z", last_activity_at: "2026-09-02T00:00:00Z", assignee_name: "field.worker42@example.org", dog_id: null, zone: "RS Puram", provenance: null, critical: true },
  { id: "b", case_code: "SPC-2", title: "Fracture", condition_class: null, occurred_at: "2026-10-30T00:00:00Z", last_activity_at: "2026-11-01T00:00:00Z", assignee_name: null, dog_id: null, zone: null, provenance: null, critical: true },
  { id: "c", case_code: "SPC-3", title: "Old import", condition_class: null, occurred_at: "2024-01-01T00:00:00Z", last_activity_at: null, assignee_name: null, dog_id: null, zone: null, provenance: "imported_historical_record", critical: true },
], now);
assert.deepEqual(stalled.map((s) => s.caseId), ["a"]);
assert.equal(stalled[0].holder, "field worker");
assert.ok(stalled[0].quietDays >= 60);
ok("a held critical case with no activity is surfaced; imports and fresh cases are not");

const groups = localityVariants([
  { zone: "Koundampalayam", count: 22 }, { zone: "Kovundampalayam", count: 6 }, { zone: "Kouvandampalayam", count: 9 },
  { zone: "Kovandampalayam", count: 5 }, { zone: "Goundampalayam", count: 5 }, { zone: "Kovumdampalayam", count: 7 },
  { zone: "Saibaba Colony", count: 22 }, { zone: "Saibaba colony", count: 20 },
  { zone: "Avarampalayam", count: 5 }, { zone: "Avrampalayam", count: 5 },
  { zone: "Edayarpalayam", count: 40 }, { zone: "Udayampalayam", count: 5 }, { zone: "S.P Nagar Koundampalayam", count: 5 }, { zone: "SKR Nagar Koundampalayam", count: 1 }, { zone: "SP Nagar, Koundampalayam", count: 3 }, { zone: "Sai Baba colony", count: 1 },
  { zone: "Ganapathy", count: 77 }, { zone: "Podanur", count: 31 }, { zone: "Perur", count: 5 }, { zone: "Peelamedu", count: 14 },
]);
const kg = groups.find((g) => g.canonical === "Koundampalayam");
assert.ok(kg && kg.variants.length >= 5, JSON.stringify(groups));
assert.ok(groups.some((g) => g.canonical === "Saibaba Colony" && g.total === 43));
assert.ok(!groups.some((g) => g.variants.some((v) => v.zone === "Udayampalayam")), "different first letters stay apart");
const sp = groups.find((g) => g.variants.some((v) => v.zone === "S.P Nagar Koundampalayam"));
assert.ok(sp && sp.variants.some((v) => v.zone === "SP Nagar, Koundampalayam") && !sp.variants.some((v) => v.zone.startsWith("SKR")), "short words must match exactly");
assert.ok(groups.some((g) => g.variants.some((v) => v.zone === "Avrampalayam")));
assert.ok(!groups.some((g) => g.variants.some((v) => v.zone === "Ganapathy" || v.zone === "Podanur" || v.zone === "Perur")));
ok("locality spellings group without merging different short names");

assert.equal(workId("kp", "a", "b"), workId("kp", "a", "b"));
assert.notEqual(workId("kp", "a", "b"), workId("kp", "a", "c"));
assert.match(workId("kp", "x"), /^[a-zA-Z0-9_-]{6,80}$/);
ok("request IDs are deterministic and accepted by kaju_confirm_action");

console.log(`\n${n} passed`);
