/* Kaju's work about records, and Kaju's work in plain words. The record link the work carries is cleaned to a known
   kind, an id and a short label; the starting points offered on a case, an animal or a package are plans of Kaju's real
   tools that pass the same validation as any other, keep their approval levels, and link what they make back to the
   record. The card's words (state, the one line of what Kaju is doing) never say "mission" or "workroom"; the words the
   database still writes are shown in plain words; and old links to the retired pages open the same work in place.
   No network. */
import assert from "node:assert/strict";
import { preview, validatePlan } from "../src/lib/kaju/registry";
import { handoffStarts, makes, recordHref, recordLinkOf, startIsReal, type RecordLink } from "../src/lib/kaju/records";
import { isJobId, jobLine, jobTarget, jobWord, plainWords, withJob, type JobStep } from "../src/lib/kaju/jobs";
import { canonicalHref } from "../src/lib/routes/canonical";

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

console.log("Step words");
assert.match(makes("create_followup_tasks"), /once you approve/);
assert.match(makes("post_message", { channel: "general" }), /#general/);
assert.match(makes("verify_claim"), /reviewing officer/); ok("each step says what it will make, and who decides");

console.log("Kaju's work, in plain words");
const banned = /\bmissions?\b|workroom|\broom\b/i;
const S = (state: string, label: string, tool: string | null = null, note: string | null = null): JobStep => ({ state, label, tool, note });
const follow = [S("done", "Find open cases due a follow-up", "find_due_followups"), S("waiting_approval", "Create a follow-up task for each", "create_followup_tasks"), S("todo", "Tell #field-operations", "post_message")];
assert.deepEqual(jobWord("waiting_person", follow), ["Waiting for you", "warn"]);
assert.equal(jobLine("waiting_person", follow), "Waiting for your approval: Create a follow-up task for each"); ok("a job waiting for an approval says so, and names the step");
const person = [S("done", "Find", "find_due_followups"), S("waiting_person", "Verify the claim", "verify_claim")];
assert.match(jobWord("waiting_person", person)[0], /^Waiting for a reviewing officer$/i);
assert.match(jobLine("waiting_person", person), /^Waiting for a reviewing officer: Verify the claim$/i); ok("a step only a person decides names who decides it, never 'you'");
assert.deepEqual(jobWord("running", follow), ["Kaju is working", "accent"]);
assert.equal(jobLine("running", [S("done", "Find", "find_due_followups"), S("running", "Create the tasks", "create_followup_tasks")]), "Working on: Create the tasks");
assert.deepEqual(jobWord("completed"), ["Done", "ok"]); assert.equal(jobLine("completed", follow), "Every step is done");
assert.equal(jobWord("cancelled", [S("done", "Find"), S("cancelled", "Create", null, "Not now")])[0], "Rejected");
assert.equal(jobWord("cancelled", [S("done", "Find"), S("skipped", "Create")])[0], "Cancelled");
assert.equal(jobLine("blocked", [S("done", "Find"), S("failed", "Create the tasks")]), "Stopped at: Create the tasks"); ok("each state reads in plain words: working, waiting for you, done, rejected, stopped");
for (const st of ["draft", "ready", "running", "retrying", "waiting_person", "waiting_partner", "blocked", "completed", "cancelled"]) {
  assert.ok(!banned.test(jobWord(st, follow)[0]), st); assert.ok(!banned.test(jobLine(st, follow)), st);
}
ok("no state word or line says mission, workroom or room");
assert.equal(plainWords("Mission completed."), "Every step is done.");
assert.equal(plainWords("A step failed. Nothing after it ran. Open the mission to retry or cancel."), "A step failed. Nothing after it ran. Open it to try again or stop it.");
assert.equal(plainWords("Only the person who started this mission decides its steps."), "Only the person who asked Kaju for this decides its steps.");
assert.equal(plainWords("This mission cannot be cancelled."), "This can no longer be stopped.");
assert.equal(plainWords("12 open cases, 4 open tasks, 1 overdue follow-ups, 2 Kaju missions waiting"), "12 open cases, 4 open tasks, 1 overdue follow-ups, 2 waiting for approval in Kaju");
assert.equal(plainWords("WhatsApp from missions is not connected."), "WhatsApp from Kaju is not connected.");
assert.equal(plainWords("Approved by Priya: Create a follow-up task for each"), "Approved by Priya: Create a follow-up task for each"); ok("what the database writes is shown in plain words; other lines are left exactly as written");
for (const t of ["Mission completed.", "The deadline passed before the mission finished.", "Too many missions started in the last minute. Try again shortly.", "a mission has 1 to 20 steps", "a mission needs a title"]) assert.ok(!banned.test(plainWords(t)), t);
ok("every database line that used the word reads without it");

const JOB = "0f5a3c0e-1d2b-4c3a-9e8f-7a6b5c4d3e2f";
assert.equal(jobTarget(`/kaju/missions/${JOB}`), `/kaju?job=${JOB}`);
assert.equal(jobTarget(`/kaju/missions?m=${JOB}`), `/kaju?job=${JOB}`);
assert.equal(jobTarget(`/kaju/approvals?m=${JOB}`), `/kaju?job=${JOB}`);
assert.equal(jobTarget(`/kaju/missions/${JOB.toUpperCase()}?new=1`), `/kaju?job=${JOB}`); ok("an old link to a job, from a page or a notification, opens the same job in place");
assert.equal(jobTarget("/kaju/missions"), "/kaju"); assert.equal(jobTarget("/kaju/approvals"), "/kaju");
assert.equal(jobTarget("/kaju/missions/not-an-id"), "/kaju"); assert.equal(jobTarget("/kaju/missions?m=1;drop"), "/kaju"); ok("an old list link, or one without a real id, opens Kaju's home");
assert.equal(jobTarget("/kaju/history"), "/kaju/history"); assert.equal(jobTarget("/ngo/cases/x"), "/ngo/cases/x"); ok("other links are left alone");
assert.equal(canonicalHref(`/kaju/approvals?m=${JOB}`), `/kaju?job=${JOB}`); assert.equal(canonicalHref(`/kaju/missions?m=${JOB}`), `/kaju?job=${JOB}`); assert.equal(canonicalHref("/kaju/missions"), "/kaju");
ok("a stored notification link is mapped the same way where it is shown");
assert.equal(withJob("", JOB), `?job=${JOB}`); assert.equal(withJob("?tab=abc", JOB), `?tab=abc&job=${JOB}`); assert.equal(withJob(`?job=x&tab=abc`, JOB), `?job=${JOB}&tab=abc`); ok("opening a job keeps the page and its own query");
assert.ok(isJobId(JOB) && !isJobId("x") && !isJobId(null)); ok("only a real id opens a job");

console.log("\nKaju rooms: all checks passed");
