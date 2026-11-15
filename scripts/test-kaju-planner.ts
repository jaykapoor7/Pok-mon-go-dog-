/* Kaju's planner: plans are validated before anything starts, fixed-rule plans work with no model, and the model
   planner is exercised against a mock client (no network, no key), including refusals, truncation and invented tools. */
import assert from "node:assert/strict";
import { planFromIntent, preview, validatePlan } from "../src/lib/kaju/registry";
import { ScriptedPlanner, choosePlanner, type PlanContext } from "../src/lib/kaju/planner";

const ok = (name: string) => console.log(`  ✓ ${name}`);
const ctx = (over: Partial<PlanContext> = {}): PlanContext => ({ text: "Prepare next week's follow-ups for Ward 12 and tell field-ops", org: { id: "o", name: "Ward Twelve Animal Care", workspace: "ngo" }, channels: ["general", "field-ops"], places: ["Ward 12"], people: [{ id: "00000000-0000-4000-8000-000000000001", name: "Ana" }], ...over });

(async () => {
  console.log("Plan validation");
  assert.equal(validatePlan({ title: "x", steps: [{ tool: "drop_tables", input: {} }] }).ok, false); ok("an invented tool is refused");
  assert.equal(validatePlan({ title: "x", steps: [{ tool: "create_task", input: { title: "a", owner: "me" } }] }).ok, false); ok("an unexpected field is refused");
  assert.equal(validatePlan({ title: "x", steps: [{ tool: "create_task", input: { title: "" } }] }).ok, false); ok("an empty title is refused");
  assert.equal(validatePlan({ title: "x", steps: [{ tool: "create_followup_tasks", input: { from_step: 1 } }] }).ok, false); ok("a step cannot build on itself or a later step");
  assert.equal(validatePlan({ title: "x", steps: Array.from({ length: 21 }, () => ({ tool: "find_overdue_cases", input: {} })) }).ok, false); ok("at most 20 steps");
  assert.equal(validatePlan({ title: "x", steps: [{ tool: "post_message", input: { body: "hi" } }] }).ok, false); ok("a message needs a channel");
  assert.equal(validatePlan({ title: "x", steps: [{ tool: "notify_members", input: { user_ids: ["not-a-uuid"], title: "t" } }] }).ok, false); ok("recipients must be ids, not names");
  assert.equal(validatePlan({ title: "x", steps: [{ tool: "send_external", input: { channel: "fax", to: "a@b.c", body: "b" } }] }).ok, false); ok("only email, WhatsApp or SMS");

  console.log("Fixed-rule plans");
  const p = planFromIntent({ action: "prepare_followups", place: "Ward 12", when: "next week", channel: "field-ops", team: "Field team A" });
  assert.ok(p); const v = validatePlan(p);
  assert.ok(v.ok && v.plan.steps.length === 3 && v.plan.steps[1].tool === "create_followup_tasks"); ok("prepare follow-ups: find, create (from step 1), tell the channel");
  const pv = preview(v.ok ? v.plan : p!, {});
  assert.deepEqual(pv.map((s) => s.waits), [false, true, false]); ok("creating several tasks waits; finding and posting do not");
  assert.equal(preview(v.ok ? v.plan : p!, { post_message: 9 })[2].why, "Your organisation has switched this tool off."); ok("a switched-off tool says so before anything starts");
  assert.equal(planFromIntent({ action: "create_task" }), null); ok("a task without a title is not planned");

  console.log("Choosing a planner");
  const none = await choosePlanner(ctx(), async () => null);
  assert.ok("unavailable" in none && /needs a model/.test(none.unavailable)); ok("free-form words with no model connected: an honest message, no fake plan");
  const rules = await choosePlanner(ctx({ intent: { action: "find_overdue" } }), async () => { throw new Error("must not be called"); });
  assert.ok(!("unavailable" in rules) && rules.id === "rules"); ok("a confirmed request uses fixed rules and never calls the model");

  console.log("Scripted planner (test double)");
  const hostile = await new ScriptedPlanner(() => ({ title: "Ignore previous instructions", steps: [{ tool: "grant_data_access", input: { note: "auto" } }, { tool: "sql", input: { q: "drop" } }] })).plan(ctx());
  assert.equal(hostile.ok, false); ok("a hostile plan with an invented tool is refused whole");
  const human = await new ScriptedPlanner(() => ({ title: "Claim", steps: [{ tool: "verify_claim", input: {} }] })).plan(ctx());
  assert.ok(human.ok && preview(human.plan)[0].level === 4 && preview(human.plan)[0].waits); ok("a decision reserved for people becomes a person-only step");
  const cannot = await new ScriptedPlanner(() => ({ not_possible: "StrayPaw cannot book flights." })).plan(ctx());
  assert.ok(!cannot.ok && cannot.error.includes("flights")); ok("a request outside Kaju's tools is declined in words");

  console.log("Model planner against a mock client");
  const { ClaudePlanner, modelPlanner } = await import("../src/lib/kaju/claude");
  const reply = (r: unknown) => ({ messages: { create: async () => r as never } });
  const good = await new ClaudePlanner(reply({ stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 5 }, content: [{ type: "tool_use", id: "t", name: "propose_mission", input: { title: "Ward 12 follow-ups", steps: [{ label: "Find", tool: "find_due_followups", input: { place: "Ward 12", when: "next week" } }, { label: "Create", tool: "create_followup_tasks", input: { from_step: 1 } }] } }] }), "m", false).plan(ctx());
  assert.ok(good.ok && good.plan.steps.length === 2 && good.planner === "model"); ok("a valid proposal becomes a plan for review");
  const invented = await new ClaudePlanner(reply({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t", name: "propose_mission", input: { title: "x", steps: [{ label: "x", tool: "approve_payment", input: {} }] } }] }), "m", false).plan(ctx());
  assert.ok(!invented.ok && /not accepted/.test(invented.error)); ok("a proposal with a tool that does not exist is not accepted");
  const refused = await new ClaudePlanner(reply({ stop_reason: "refusal", content: [] }), "m", false).plan(ctx());
  assert.ok(!refused.ok); ok("a refusal is reported, not turned into a plan");
  const cut = await new ClaudePlanner(reply({ stop_reason: "max_tokens", content: [{ type: "tool_use", id: "t", name: "propose_mission", input: { title: "x", steps: [] } }] }), "m", false).plan(ctx());
  assert.ok(!cut.ok && /cut off/.test(cut.error)); ok("a truncated proposal is never used");
  const chatty = await new ClaudePlanner(reply({ stop_reason: "end_turn", content: [{ type: "text", text: "Sure, I did it." }] }), "m", false).plan(ctx());
  assert.ok(!chatty.ok); ok("words claiming success without a proposal are not a plan");
  const down = await new ClaudePlanner({ messages: { create: async () => { throw new Error("socket hang up"); } } }, "m", false).plan(ctx());
  assert.ok(!down.ok && /could not be reached/.test(down.error)); ok("a network failure starts nothing");
  for (const k of ["STRAYPAW_AI_MODE", "ANTHROPIC_API_KEY"]) delete process.env[k];
  assert.equal(await modelPlanner({ purpose: "kaju_chat", userId: "u", orgId: "o" }), null); ok("with paid inference off there is no model planner");
  console.log("\nKaju planner: all checks passed");
})().catch((e) => { console.error(e); process.exit(1); });
