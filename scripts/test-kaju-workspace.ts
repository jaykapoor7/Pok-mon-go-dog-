/* Kaju's workspace: who is responsible for each step, what a step says it will change, capabilities that map only to
   real tools, ready-made jobs that plan by fixed rules, and a capability report that never claims what is not set up.
   Run: NODE_PATH=scripts/shims/node_modules node --import tsx scripts/test-kaju-workspace.ts */
import assert from "node:assert/strict";
import { TOOLS, planFromIntent, validatePlan, type ToolName } from "../src/lib/kaju/registry";
import { ADDABLE, DECIDER, FIELDS, GROUPS, JOBS, cleanInput, duty, effect, intentWords } from "../src/lib/kaju/capabilities";
import { kajuStatus, modelReady } from "../src/lib/kaju/status";

const ok = (name: string) => console.log(`  ✓ ${name}`);

console.log("Responsibility");
assert.equal(duty("find_due_followups", 0).who, "Kaju"); assert.equal(duty("create_task", 2).how, "Runs on its own"); ok("Kaju's own steps say so");
assert.equal(duty("create_followup_tasks", 3).tone, "you"); ok("a step that asks first is the person's approval");
assert.equal(duty("clinical_decision", 4).who, "A clinician"); assert.equal(duty("verify_claim", 4).who, "A reviewing officer"); ok("a decision names who makes it");
assert.equal(duty("post_message", 9).tone, "off"); ok("a switched-off tool says so");

console.log("What a step will change");
assert.match(effect("find_overdue_cases", {}), /Changes nothing/); ok("reading changes nothing, and says so");
assert.match(effect("create_task", { title: "Visit", assignee_id: "u1", due_on: "2026-11-20" }, (id) => (id === "u1" ? "Ana" : null)), /“Visit” for Ana, due/); ok("a task names its title, person and date");
assert.match(effect("send_external", { channel: "email", to: "a@b.org", body: "x" }), /only after you approve/); ok("an outside message says it waits for approval");
assert.match(effect("grant_data_access", {}), /data steward/); ok("a person-only step says nothing changes until they decide");

console.log("Capabilities are made of real tools");
for (const g of GROUPS) for (const t of g.tools) assert.ok(t in TOOLS, `${g.name}: ${t}`);
assert.equal(new Set(GROUPS.flatMap((g) => g.tools)).size, Object.keys(TOOLS).length); ok("every tool belongs to exactly one capability, and none is invented");
for (const t of Object.keys(DECIDER) as ToolName[]) assert.equal(TOOLS[t].level, 4); ok("only person-only tools name a decider");
for (const a of ADDABLE) assert.ok(a.tool in TOOLS); for (const t of Object.keys(FIELDS)) assert.ok(t in TOOLS); ok("steps a person can add or edit are real tools");

console.log("Ready-made jobs plan by fixed rules");
const samples = {
  prepare_followups: { action: "prepare_followups", when: "next week", channel: "field-ops" },
  find_overdue: { action: "find_overdue" },
  create_task: { action: "create_task", title: "Collect the release photo" },
  message_channel: { action: "message_channel", channel: "general", body: "Clinic closed tomorrow" },
  email: { action: "email", to: "office@example.org", body: "The package is ready" },
} as const;
for (const j of JOBS) {
  const p = planFromIntent(samples[j.id]);
  assert.ok(p && validatePlan(p).ok, j.id);
  for (const s of p!.steps) assert.ok(j.tools.includes(s.tool), `${j.id} uses ${s.tool}`);
  assert.ok(intentWords(samples[j.id]).length > 5);
}
ok("each job becomes a valid plan using only the tools it lists");
assert.deepEqual(cleanInput({ title: " Visit ", note: "", user_ids: [] }), { title: "Visit" }); ok("blank words are left out, never sent as empty");

console.log("What Kaju can use, as booleans and labels only");
const none = kajuStatus({}, null);
assert.equal(none.find((c) => c.id === "model")?.state, "setup"); assert.equal(modelReady({}), false); ok("no model settings: planning needs the owner");
assert.equal(none.find((c) => c.id === "mission_email")?.state, "setup"); ok("no mail apps: email from missions needs the owner");
assert.equal(none.find((c) => c.id === "whatsapp")?.state, "none"); assert.equal(none.find((c) => c.id === "sms")?.state, "none"); ok("WhatsApp and SMS are never shown as live");
const on = { STRAYPAW_AI_MODE: "model", STRAYPAW_AI_AUTHORISED_BY: "owner:2026-11-16", STRAYPAW_AI_MONTHLY_CEILING_INR: "100", STRAYPAW_AI_USER_DAILY_REQUESTS: "5", STRAYPAW_AI_ORG_DAILY_REQUESTS: "5", STRAYPAW_AI_INR_PER_MTOK_IN: "1", STRAYPAW_AI_INR_PER_MTOK_OUT: "1" };
assert.equal(modelReady(on), false); ok("the gate open but no credential: still not live");
assert.equal(kajuStatus({ ...on, ANTHROPIC_API_KEY: "k" }).find((c) => c.id === "model")?.state, "live"); ok("gate and credential: live");
const mail = { GOOGLE_CLIENT_ID: "a", GOOGLE_CLIENT_SECRET: "b", CONNECTIONS_ENC_KEY: "c" };
assert.equal(kajuStatus(mail, false).find((c) => c.id === "mission_email")?.state, "you"); assert.equal(kajuStatus(mail, true).find((c) => c.id === "mission_email")?.state, "live"); assert.equal(kajuStatus(mail, null).find((c) => c.id === "mission_email")?.state, "unknown"); ok("mail apps set: live only with the person's own account; unknown is not false");
const text = JSON.stringify(kajuStatus({ ...on, ANTHROPIC_API_KEY: "SECRET-VALUE", ...mail, RESEND_API_KEY: "SECRET-VALUE", EMAIL_FROM: "x" }, true));
assert.ok(!text.includes("SECRET-VALUE")); ok("no setting's value ever appears in the report");
console.log("\nKaju workspace: all checks passed");
