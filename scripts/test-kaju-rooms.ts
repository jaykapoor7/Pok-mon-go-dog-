/* Workrooms about records: the record link a mission carries is cleaned to a known kind, an id and a short label; the
   starting points offered on a case, an animal or a package are plans of Kaju's real tools that pass the same
   validation as any other, keep their approval levels, and link what they make back to the record. No network. */
import assert from "node:assert/strict";
import { preview, validatePlan } from "../src/lib/kaju/registry";
import { handoffStarts, makes, recordHref, recordLinkOf, startIsReal, type RecordLink } from "../src/lib/kaju/records";

const ok = (name: string) => console.log(`  ✓ ${name}`);
const ID = "497bea18-c431-4783-b7cb-375d15bf1edd";
const TODAY = "2026-11-18";

console.log("Record links");
assert.deepEqual(recordLinkOf({ kind: "case", id: ID, label: "  SPC-497BEA ", ws: "ngo" }), { kind: "case", id: ID, label: "SPC-497BEA", ws: "ngo" }); ok("a case link is kept, its label trimmed");
assert.equal(recordLinkOf({ kind: "patient", id: ID, label: "x" }), null); ok("an unknown kind is dropped");
assert.equal(recordLinkOf({ kind: "case", id: "1; drop table", label: "x" }), null); ok("an id that is not a uuid is dropped");
assert.equal(recordLinkOf("case"), null); assert.equal(recordLinkOf(null), null); ok("anything that is not an object is dropped");
assert.equal(recordLinkOf({ kind: "case", id: ID, label: "x".repeat(400) })!.label.length, 160); ok("a label is at most 160 characters");
assert.equal(recordLinkOf({ kind: "case", id: ID, label: "x", ws: "gov" })!.ws, "ngo"); ok("only a package can be a government record");
assert.equal(recordLinkOf({ kind: "animal", id: ID, label: "" })!.label, "Animal"); ok("an empty label falls back to the kind");
assert.equal(recordLinkOf({ kind: "case", id: ID.toUpperCase(), label: "x" })!.id, ID); ok("ids are compared in lower case");
assert.equal(recordHref({ kind: "case", id: ID, ws: "ngo" }), `/ngo/cases/${ID}`);
assert.equal(recordHref({ kind: "animal", id: ID, ws: "ngo" }), `/ngo/animals/${ID}`);
assert.equal(recordHref({ kind: "package", id: ID, ws: "ngo" }), `/ngo/submissions/${ID}`);
assert.equal(recordHref({ kind: "package", id: ID, ws: "gov" }), `/gov/verification/${ID}`); ok("each kind links to its own page");

console.log("Starting points");
const kase: RecordLink = { kind: "case", id: ID, label: "SPC-497BEA", ws: "ngo" };
const cs = handoffStarts(kase, { title: "Mange treatment, week 2", place: "Whitefield", due: "2026-11-25T00:00:00Z", holder: "Ravi Kumar", channels: ["indiranagar"] }, TODAY);
assert.deepEqual(cs.map((s) => s.id), ["followup", "area", "tell"]); ok("a case with a place offers a follow-up, follow-ups in its area, and a word to the team");
for (const s of cs) { const v = validatePlan(s.plan); assert.ok(v.ok, `${s.id}: ${v.ok ? "" : v.error}`); assert.ok(startIsReal(s)); }
ok("every starting point passes the same validation as any plan");
const fu = cs[0].plan.steps[0];
assert.equal(fu.tool, "create_task");
assert.deepEqual([fu.input.record_kind, fu.input.record_id, fu.input.record_label, fu.input.due_on, fu.input.assignee_name], ["case", ID, "SPC-497BEA", "2026-11-25", "Ravi Kumar"]); ok("the follow-up task is linked to the case, due on its date, for its holder");
assert.equal(handoffStarts(kase, { due: "2026-11-01" }, TODAY)[0].plan.steps[0].input.due_on, "2026-11-19"); ok("a date already past becomes tomorrow, never a task born overdue");
const area = cs[1].plan;
assert.deepEqual(area.steps.map((s) => s.tool), ["find_due_followups", "create_followup_tasks"]);
assert.ok(preview(area)[1].waits); ok("follow-ups in the area wait for the person's approval before any task is made");
assert.equal(preview(area, { create_followup_tasks: 9 })[1].level, 9); ok("an organisation that switched a tool off is still respected");
assert.equal(cs[2].plan.steps[0].input.channel, "indiranagar"); assert.equal(cs[2].plan.steps[0].input.record_id, ID); ok("the team message names a real channel and carries the case");
const noPlace = handoffStarts(kase, {}, TODAY);
assert.ok(!noPlace.some((s) => s.id === "area")); ok("no place, no area plan");
const noChannel = noPlace.find((s) => s.id === "tell")!;
assert.ok(!validatePlan(noChannel.plan).ok && startIsReal(noChannel)); ok("with no channel yet, the message waits for the person to choose one in review");
assert.ok(/already has an open task/.test(handoffStarts(kase, { openTasks: 1 }, TODAY)[0].line)); ok("a case that already has an open task says so before another is added");

const dog = handoffStarts({ kind: "animal", id: ID, label: "Dog 127", ws: "ngo" }, { channels: ["general"] }, TODAY);
assert.deepEqual(dog.map((s) => s.id), ["check", "tell"]);
assert.equal(dog[0].plan.steps[0].input.record_kind, "animal"); ok("an animal offers a check linked to it, and a word to the team");
const pkg = handoffStarts({ kind: "package", id: ID, label: "ABC claims · October 2026", ws: "ngo" }, { channels: ["general"] }, TODAY);
assert.deepEqual(pkg.map((s) => s.id), ["finish", "tell"]);
assert.equal(pkg[0].plan.steps[0].input.record_kind, "package"); ok("a package offers a task linked to it, and a word to the team");
for (const s of [...dog, ...pkg]) assert.ok(validatePlan(s.plan).ok, s.id);
const all = [...cs, ...dog, ...pkg].flatMap((s) => s.plan.steps.map((x) => x.tool));
assert.ok(!all.some((t) => ["verify_claim", "validate_result", "clinical_decision", "grant_data_access", "send_external"].includes(t))); ok("no starting point decides for a person or reaches outside StrayPaw");
for (const s of [...cs, ...dog, ...pkg]) assert.ok(!/Runs on its own|approved|done/i.test(s.line), s.line);
ok("no starting point claims how it will run or that anything is done; the plan card says that from the levels");

console.log("Room words");
assert.match(makes("create_followup_tasks"), /once you approve/);
assert.match(makes("post_message", { channel: "general" }), /#general/);
assert.match(makes("verify_claim"), /reviewing officer/); ok("each step says what it will make, and who decides");

console.log("\nKaju rooms: all checks passed");
