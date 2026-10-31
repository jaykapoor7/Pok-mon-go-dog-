#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   STAGING ONLY. End-to-end check of the ABC verification workflow with
   real sessions (API + RLS), one person per role:

     coordinator opens a case → adds evidence → vet authorises →
     coordinator returns incomplete evidence → evidence completed →
     coordinator reviews → package → submitted → municipal reviewer
     queries → operator answers → reviewer accepts.

   Every forbidden action is attempted too and must be refused: wrong
   role, another organisation's records, direct table writes, reviewing
   a draft, changing an accepted record, and anonymous access.

   Usage:
     STAGING_URL=https://<staging-ref>.supabase.co STAGING_ANON=<anon key> \
     STAGING_PASSWORD=<demo password> node scripts/staging/abc-workflow-check.mjs
   Refuses to run against any project other than the staging ref below.
   ════════════════════════════════════════════════════════════════════ */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.STAGING_URL, ANON = process.env.STAGING_ANON, PW = process.env.STAGING_PASSWORD;
const STAGING_REF = "ucxfxiddufwqithtdtix";
if (!URL || !ANON || !PW) { console.error("Set STAGING_URL, STAGING_ANON and STAGING_PASSWORD."); process.exit(2); }
if (!URL.includes(STAGING_REF)) { console.error("Refusing: this check only runs against staging."); process.exit(2); }

const OFFICE = "30000000-0000-4000-8000-0000000000a1";
const people = {
  admin: "ngo.demo@straypaw.invalid", vet: "vet.demo@straypaw.invalid", coord: "coordinator.demo@straypaw.invalid",
  reviewer: "reviewer.demo@straypaw.invalid", other: "other.demo@straypaw.invalid", community: "noorg.demo@straypaw.invalid",
};
const results = [];
const ok = (name, pass, detail = "") => { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`); };
const client = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
async function as(who) {
  const c = client();
  const { error } = await c.auth.signInWithPassword({ email: people[who], password: PW });
  if (error) throw new Error(`${who}: ${error.message}`);
  return c;
}
async function expectOk(name, p) { const { data, error } = await p; ok(name, !error, error?.message ?? ""); return data; }
async function expectRefused(name, p, match) {
  const { data, error } = await p;
  const refused = !!error && (!match || match.test(error.message));
  ok(name, refused, error ? error.message : `allowed: ${JSON.stringify(data)?.slice(0, 80)}`);
}

const c = Object.fromEntries(await Promise.all(Object.keys(people).map(async (k) => [k, await as(k)])));
const anon = client();

// ── context and roles ─────────────────────────────────────────────────
for (const [k, want] of [["vet", "veterinarian"], ["coord", "coordinator"], ["admin", "admin"], ["other", "admin"]]) {
  const { data } = await c[k].rpc("abc_my_context");
  ok(`context: ${k} has role ${want}`, data?.role === want, JSON.stringify(data?.role));
}
{ const { data } = await c.reviewer.rpc("abc_my_context"); ok("context: reviewer sits in the review office", (data?.offices ?? []).some((o) => o.id === OFFICE)); }

// ── capture ───────────────────────────────────────────────────────────
const stamp = new Date().toISOString().slice(0, 16);
await c.coord.rpc("upsert_volunteer", { p_id: "10000000-0000-4000-8000-000000000005", p_name: "Ravi · coordinator demo" });
const caseId = await expectOk("coordinator opens an ABC case", c.coord.rpc("create_case_with_location", {
  p_city: "Coimbatore", p_h3_r8: null, p_title: `STAGING TEST · ABC verification check ${stamp}`, p_description: "Automated staging check. Fictional.",
  p_dog_id: null, p_zone: "Gandhipuram", p_lat: null, p_lng: null, p_severity: "normal", p_category: "sterilisation", p_tags: [],
  p_actor_id: "10000000-0000-4000-8000-000000000005", p_actor_name: "Ravi · coordinator demo", p_species: "dog",
  p_informer_contact: null, p_hospital: null, p_cost_estimate: null, p_cost_spent: null,
}));
{ const { data } = await c.coord.from("cases").select("provenance").eq("id", caseId).single(); ok("new case is labelled operator_created, not community_report", data?.provenance === "operator_created", data?.provenance); }

// ── evidence and vet sign-off ─────────────────────────────────────────
await expectRefused("vet cannot authorise before a surgery record exists", c.vet.rpc("abc_vet_authorise", { p_case_id: caseId }), /surgery record/i);
for (const [kind, url] of [["capture_photo", "https://example.invalid/capture.jpg"], ["surgery_record", "https://example.invalid/surgery.pdf"], ["ear_notch_photo", "https://example.invalid/notch.jpg"], ["release_photo", "https://example.invalid/release.jpg"]]) {
  await expectOk(`coordinator adds ${kind}`, c.coord.rpc("abc_add_evidence", { p_case_id: caseId, p_kind: kind, p_url: url }));
}
await expectRefused("a photo without its file is refused", c.coord.rpc("abc_add_evidence", { p_case_id: caseId, p_kind: "release_photo", p_url: "" }), /file link/i);
await expectRefused("coordinator cannot authorise a procedure", c.coord.rpc("abc_vet_authorise", { p_case_id: caseId }), /veterinarian/i);
await expectRefused("admin cannot authorise a procedure either", c.admin.rpc("abc_vet_authorise", { p_case_id: caseId }), /veterinarian/i);
const vetAtt = await expectOk("veterinarian authorises in their own name", c.vet.rpc("abc_vet_authorise", { p_case_id: caseId, p_note: "Procedure and recovery normal." }));
await expectRefused("vet cannot review evidence (role)", c.vet.rpc("abc_review_evidence", { p_case_id: caseId }), /coordinator or admin/i);

// ── rejection and completion ──────────────────────────────────────────
await expectRefused("review with missing evidence is refused", c.coord.rpc("abc_review_evidence", { p_case_id: caseId }), /incomplete/i);
await expectRefused("a return needs a reason", c.coord.rpc("abc_return_evidence", { p_case_id: caseId, p_reason: " " }), /missing or wrong/i);
await expectOk("coordinator returns the evidence with a reason", c.coord.rpc("abc_return_evidence", { p_case_id: caseId, p_reason: "Release location not recorded." }));
{ const { data } = await c.coord.rpc("abc_verification_queue", { p_limit: 50 }); const row = (data ?? []).find((r) => r.case_id === caseId);
  ok("queue shows the open return and who returned it", row?.returned_note === "Release location not recorded." && !!row?.returned_by, row?.returned_by ?? ""); }
await expectOk("coordinator records the release location", c.coord.rpc("abc_add_evidence", { p_case_id: caseId, p_kind: "release_location", p_location: "Gandhipuram, near the bus stand" }));
await expectOk("coordinator reviews complete, authorised evidence", c.coord.rpc("abc_review_evidence", { p_case_id: caseId, p_note: "All five items present." }));
{ const { data } = await c.coord.rpc("abc_verification_queue", { p_limit: 50 }); const row = (data ?? []).find((r) => r.case_id === caseId);
  ok("review clears the return and names vet and reviewer", row && !row.returned_note && row.vet_name && row.reviewer_name && row.evidence_count === 5, `${row?.vet_name} / ${row?.reviewer_name}`); }

// ── tenant isolation and direct writes ────────────────────────────────
{ const { data } = await c.other.from("abc_attestations").select("id").eq("case_id", caseId); ok("another organisation sees none of these sign-offs", (data ?? []).length === 0); }
{ const { data } = await c.other.from("cases").select("id").eq("id", caseId); ok("another organisation cannot read the case row", (data ?? []).length === 0); }
await expectRefused("another organisation cannot read the checklist", c.other.rpc("abc_case_checklist", { p_case_id: caseId }), /cannot read/i);
await expectRefused("another organisation cannot read the history", c.other.rpc("abc_case_history", { p_case_id: caseId }), /cannot read/i);
await expectRefused("another organisation cannot add evidence", c.other.rpc("abc_add_evidence", { p_case_id: caseId, p_kind: "capture_photo", p_url: "https://example.invalid/x.jpg" }), /not in your organisation/i);
await expectRefused("another organisation cannot return evidence", c.other.rpc("abc_return_evidence", { p_case_id: caseId, p_reason: "x" }), /not in your organisation/i);
{ const { error } = await c.coord.from("abc_attestations").insert({ ngo_id: "20000000-0000-4000-8000-000000000001", case_id: caseId, kind: "vet_authorised", actor_id: "10000000-0000-4000-8000-000000000005", actor_name: "forged", actor_role: "veterinarian" });
  ok("a direct insert into sign-offs is refused (RLS / grants)", !!error, error?.message ?? "insert allowed"); }
{ const { data, error } = await c.coord.from("abc_attestations").update({ actor_name: "forged" }).eq("case_id", caseId).select("id");
  ok("a direct update of sign-offs changes nothing", !!error || (data ?? []).length === 0, error?.message ?? `${(data ?? []).length} rows`); }
await expectRefused("anonymous visitors cannot read the queue", anon.rpc("abc_verification_queue", { p_limit: 5 }));
await expectRefused("a signed-in person with no organisation cannot read the queue", c.community.rpc("abc_verification_queue", { p_limit: 5 }), /Organisation access/i);

// ── package and municipal review ─────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
await expectRefused("vet cannot prepare a package", c.vet.rpc("abc_create_package", { p_title: "x", p_start: today, p_end: today, p_office: OFFICE }), /coordinator or admin/i);
const pkg = await expectOk("coordinator prepares a package of reviewed records", c.coord.rpc("abc_create_package", { p_title: `STAGING TEST · Gandhipuram ABC ${stamp}`, p_start: today, p_end: today, p_office: OFFICE }));
{ const { data } = await c.coord.rpc("abc_package_cases", { p_package: pkg }); ok("the package holds the reviewed case", (data ?? []).some((r) => r.case_id === caseId)); }
{ const { data } = await c.reviewer.from("report_packages").select("id").eq("id", pkg); ok("reviewer cannot see a draft package", (data ?? []).length === 0); }
await expectRefused("reviewer cannot act on a draft", c.reviewer.rpc("abc_package_act", { p_package: pkg, p_kind: "accepted" }));
await expectRefused("reviewer cannot submit for the operator", c.reviewer.rpc("abc_package_act", { p_package: pkg, p_kind: "submitted" }), /coordinator/i);
await expectOk("coordinator submits the package", c.coord.rpc("abc_package_act", { p_package: pkg, p_kind: "submitted" }));
await expectRefused("operator admin cannot accept their own package", c.admin.rpc("abc_package_act", { p_package: pkg, p_kind: "accepted" }), /reviewer/i);
{ const { data } = await c.reviewer.from("report_packages").select("status").eq("id", pkg).single(); ok("reviewer sees the submitted package", data?.status === "submitted", data?.status); }
{ const { data } = await c.reviewer.rpc("abc_package_cases", { p_package: pkg }); const r = (data ?? []).find((x) => x.case_id === caseId);
  ok("reviewer sees each record with its evidence and signers", !!r && (r.evidence ?? []).length === 5 && !!r.vet_name && !!r.reviewer_name); }
await expectOk("reviewer can read the record's checklist", c.reviewer.rpc("abc_case_checklist", { p_case_id: caseId }));
await expectRefused("a query needs words", c.reviewer.rpc("abc_package_act", { p_package: pkg, p_kind: "query", p_body: "" }), /needs attention/i);
await expectOk("reviewer raises a query", c.reviewer.rpc("abc_package_act", { p_package: pkg, p_kind: "query", p_body: "Please confirm the release ward." }));
await expectRefused("reviewer cannot accept while a query is open", c.reviewer.rpc("abc_package_act", { p_package: pkg, p_kind: "accepted" }), /not waiting/i);
await expectOk("coordinator answers the query", c.coord.rpc("abc_package_act", { p_package: pkg, p_kind: "answer", p_body: "Released in Ward 14, Gandhipuram." }));
await expectOk("reviewer accepts the package", c.reviewer.rpc("abc_package_act", { p_package: pkg, p_kind: "accepted" }));
{ const { data } = await c.coord.rpc("abc_verification_queue", { p_limit: 50 }); const row = (data ?? []).find((r) => r.case_id === caseId); ok("queue shows government acceptance", row?.government_accepted === true); }
await expectRefused("an accepted record's vet sign-off cannot be withdrawn", c.vet.rpc("abc_revoke_attestation", { p_attestation: vetAtt, p_reason: "test" }), /submitted package/i);
await expectRefused("an accepted record cannot be returned", c.coord.rpc("abc_return_evidence", { p_case_id: caseId, p_reason: "test" }), /submitted package/i);
await expectRefused("the case cannot go into a second package", c.coord.rpc("abc_create_package", { p_title: "dup", p_start: today, p_end: today, p_office: OFFICE }), /already in a package|No reviewed/i);

// ── history ───────────────────────────────────────────────────────────
{ const { data } = await c.coord.rpc("abc_case_history", { p_case_id: caseId }); const kinds = (data ?? []).map((h) => h.kind);
  const need = ["evidence", "vet_authorised", "evidence_returned", "evidence_reviewed", "package:created", "package:submitted", "package:query", "package:answer", "package:accepted"];
  ok("history records every step in order", need.every((k) => kinds.includes(k)), `${kinds.length} events`); }

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed. Case ${caseId}, package ${pkg}.`);
process.exit(failed.length ? 1 : 0);
