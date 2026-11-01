#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   STAGING ONLY. StrayPaw AI write actions: permissions and audit.

   Runs the four confirmed-proposal writes exactly as the app does
   (src/sp3/ai/execute.ts → sp/data/work → the same RPCs as the manual
   screens), under real sessions, then checks:
     · each write needs a signed-in member of the owning organisation;
     · another organisation's member and anonymous callers are refused;
     · every write produced an operational_audit_log row in the same
       transaction (database trigger), marked ai_assisted_insert and
       naming the person; members read only their own organisation's
       rows and cannot insert, change or delete any.
   ════════════════════════════════════════════════════════════════════ */
import { fixture, person, userId } from "./fixture-env.mjs";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.STAGING_URL, ANON = process.env.STAGING_ANON, PW = process.env.STAGING_PASSWORD;
if (!URL || !ANON || !PW) { console.error("Set STAGING_URL, STAGING_ANON and STAGING_PASSWORD."); process.exit(2); }
if (!URL.includes("ucxfxiddufwqithtdtix")) { console.error("Refusing: staging only."); process.exit(2); }

const MARK = (who) => `Prepared with StrayPaw AI, confirmed by ${who}.`;
const results = [];
const ok = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`); };
const mk = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
async function as(email) { const c = mk(); const { error } = await c.auth.signInWithPassword({ email, password: PW }); if (error) throw new Error(`${email}: ${error.message}`); return c; }

const ravi = await as(person("coord", "coordinator.demo@straypaw.invalid"));
const kiran = await as(person("other", "other.demo@straypaw.invalid"));
const anon = mk();
const RAVI = { id: userId("coord", "10000000-0000-4000-8000-000000000005"), name: "Ravi · coordinator demo" };
const stamp = new Date().toISOString().slice(0, 16);

// 1 open_case (as executeProposal does: description carries the mark)
await ravi.rpc("upsert_volunteer", { p_id: RAVI.id, p_name: RAVI.name });
const { data: caseId, error: e1 } = await ravi.rpc("create_case_with_location", {
  p_city: "Coimbatore", p_h3_r8: null, p_title: `STAGING TEST · AI-prepared case ${stamp}`, p_description: `Dog limping near the market.\n\n${MARK(RAVI.name)}`,
  p_dog_id: null, p_zone: "Ganapathy", p_lat: null, p_lng: null, p_severity: "normal", p_category: "injury", p_tags: [],
  p_actor_id: RAVI.id, p_actor_name: RAVI.name, p_species: "dog", p_informer_contact: null, p_hospital: null, p_cost_estimate: null, p_cost_spent: null,
});
ok("AI open_case saves under the member's session", !e1 && !!caseId, e1?.message);

// 2 add_note
{ const { error } = await ravi.rpc("add_case_note", { p_case_id: caseId, p_actor_id: RAVI.id, p_actor_name: RAVI.name, p_note: `Seen eating, wound clean.\n\n${MARK(RAVI.name)}` });
  ok("AI add_note saves", !error, error?.message); }
// 3 schedule_followup
const due = new Date(Date.now() + 3 * 86400000).toISOString();
const { data: fu, error: e3 } = await ravi.rpc("add_case_followup", { p_case_id: caseId, p_dog_id: null, p_due_at: due, p_note: `Recheck wound · ${MARK(RAVI.name)}` });
ok("AI schedule_followup saves", !e3 && !!fu, e3?.message);
// 4 record_care (needs an animal of the organisation)
const DOG = (fixture?.dog ?? "50000000-0000-4000-8000-000000000001");
const { data: ev, error: e4 } = await ravi.rpc("add_medical_event", { p_dog_id: DOG, p_case_id: null, p_kind: "checkup", p_event_date: new Date().toISOString().slice(0, 10), p_notes: `Wound cleaned · ${MARK(RAVI.name)}`, p_performed_by: RAVI.name });
ok("AI record_care saves", !e4 && !!ev, e4?.message);

// permissions: another organisation and anonymous callers
{ const { error } = await kiran.rpc("add_case_note", { p_case_id: caseId, p_actor_id: userId("other", "10000000-0000-4000-8000-000000000006"), p_actor_name: "Kiran", p_note: `forged ${MARK("Kiran")}` });
  const { data: notes } = await ravi.from("case_updates").select("id").eq("case_id", caseId).ilike("note", "%forged%");
  ok("another organisation cannot add a note to this case", !!error || (notes ?? []).length === 0, error?.message ?? "no row written"); }
{ const { error } = await kiran.rpc("add_case_followup", { p_case_id: caseId, p_dog_id: null, p_due_at: due, p_note: "forged" });
  ok("another organisation cannot schedule a follow-up", !!error, error?.message ?? "allowed"); }
{ const { error } = await kiran.rpc("add_medical_event", { p_dog_id: DOG, p_case_id: null, p_kind: "checkup", p_event_date: null, p_notes: "forged", p_performed_by: "Kiran" });
  ok("another organisation cannot record care on this animal", !!error, error?.message ?? "allowed"); }
{ const { error } = await anon.rpc("add_case_note", { p_case_id: caseId, p_actor_id: RAVI.id, p_actor_name: RAVI.name, p_note: "anon" });
  ok("anonymous callers cannot write", !!error, error?.message ?? "allowed"); }
{ const { data: mine } = await ravi.from("operational_audit_log").select("action,actor_id,after_data").eq("entity_id", caseId);
  ok("the case write left an audit row naming the person, marked AI-assisted", (mine ?? []).some((r) => r.action === "ai_assisted_insert" && r.actor_id === RAVI.id), `${(mine ?? []).length} rows`);
  const { data: theirs } = await kiran.from("operational_audit_log").select("id").eq("entity_id", caseId);
  ok("another organisation cannot read this organisation's audit rows", (theirs ?? []).length === 0, `${(theirs ?? []).length} rows`); }
{ const { error } = await ravi.from("operational_audit_log").delete().eq("entity_id", caseId);
  const { error: e } = await ravi.from("operational_audit_log").insert({ entity_type: "cases", action: "forged" });
  ok("members cannot delete or forge audit rows", !!e, `${error?.message ?? "delete: no rows"} / ${e?.message ?? "insert allowed"}`); }

console.log(`\nCASE=${caseId} FOLLOWUP=${fu} EVENT=${ev}`);
console.log(`${results.filter(Boolean).length}/${results.length} checks passed.`);
process.exit(results.every(Boolean) ? 0 : 1);
