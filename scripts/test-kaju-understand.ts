/* Kaju's tools-only understanding: pure functions, no database. */
import assert from "node:assert/strict";
import { closest, glossaryAnswer, nearestSkills, normalise, parseCaseQuery, smallTalk, timeWindow } from "../src/sp3/ai/understand";
let n = 0; const ok = (s: string) => console.log(`PASS ${++n} ${s}`);
const now = new Date("2026-11-10T06:00:00Z");
const p = (t: string, carry = null as ReturnType<typeof parseCaseQuery>) => parseCaseQuery(t, { carry, now });

assert.match(normalise("kitne case baki hai"), /how many case open/); assert.match(normalise("unasigned folowups"), /unassigned follow-up/); ok("Hinglish and spelling slips are rewritten");
assert.deepEqual([timeWindow("cases last month", now).since, timeWindow("cases last month", now).until], ["2026-10-01", "2026-11-01"]);
assert.equal(timeWindow("in december", now).since, "2025-12-01"); assert.equal(timeWindow("this week", now).since, "2026-11-09"); ok("time windows resolve to dates, a future month means the last one");

let q = p("How many open cases are unassigned?")!; assert.equal(q.measure, "count"); assert.equal(q.unassigned, true); assert.equal(q.state, "open"); ok("count with a filter");
q = p("Which critical cases have nobody assigned?")!; assert.equal(q.measure, "list"); assert.ok(q.critical && q.unassigned); ok("list with two filters");
q = p("open cases by zone")!; assert.equal(q.measure, "breakdown"); assert.equal(q.by, "zone"); ok("breakdown");
q = p("who holds the most cases")!; assert.equal(q.measure, "top"); assert.equal(q.by, "assignee"); ok("top by person");
q = p("how many cases came in last week in adyar")!; assert.equal(q.state, "all"); assert.equal(q.window, "last week"); assert.deepEqual(q.terms, ["adyar"]); ok("window, state and a rough place word");
q = p("kitne case baki hai")!; assert.equal(q.state, "open"); assert.equal(q.measure, "count"); ok("Hinglish question parses");
q = p("cases open for more than 30 days")!; assert.equal(q.olderDays, 30); ok("older than N days");

const first = p("how many open cases")!;
let f = p("only unassigned", first)!; assert.equal(f.unassigned, true); assert.equal(f.state, "open"); ok("follow-up adds a filter");
f = p("by zone", first)!; assert.equal(f.by, "zone"); assert.equal(f.measure, "breakdown"); ok("follow-up changes the grouping");
f = p("and last month?", first)!; assert.equal(f.window, "last month"); ok("follow-up changes the window");
assert.equal(p("only unassigned"), null); ok("a fragment with nothing before it is not a case question");
for (const other of ["Which records are missing evidence?", "Draft this month's claim", "Show my ABC verification queue", "What follow-ups are overdue?", "hello", "Find possible duplicate animals"]) assert.equal(p(other), null, other); ok("questions other tools answer are left alone");
assert.equal(p("add a note to this case", first), null); ok("a new job is never read as a follow-up");

assert.equal(closest("adyr", ["Adyar", "Besant Nagar"]), "Adyar"); assert.equal(closest("ravi", ["Ravi Kumar", "Meena S."]), "Ravi Kumar"); assert.equal(closest("xyz", ["Adyar"]), null); ok("rough words match only what is in the records");
assert.match(glossaryAnswer("what is ABC?") ?? "", /Animal Birth Control/); assert.match(glossaryAnswer("ear notch kya hai") ?? "", /ear notch/i); assert.equal(glossaryAnswer("what is the weather"), null); ok("glossary answers its own terms only");
assert.ok(smallTalk("thanks!", "Asha")); assert.match(smallTalk("who am i", "Asha") ?? "", /Asha/); assert.equal(smallTalk("how many cases", "Asha"), null); ok("small talk is answered without a search");
assert.ok(nearestSkills("something about billing money", { org: true, office: false })[0].includes("claim")); assert.ok(nearestSkills("zzz", { org: false, office: false }).length <= 4); ok("unknown requests get the closest skills");
console.log(`${n} understanding checks passed`);
