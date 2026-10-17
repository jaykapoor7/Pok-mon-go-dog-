#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// StrayPaw local staging: permission and contract tests.
//
// Every test runs in its own transaction against the LOCAL database, as one
// identity, exactly as PostgREST would run it (SET LOCAL ROLE + the JWT
// claims in request.jwt.claims), and is rolled back, so tests never affect
// each other. Results are written to staging/local/results.json and printed.
//
// Identities (staging/local/seed.sql):
//   leadA memberA volunteerA (Org A) · leadB memberB (Org B)
//   resident (signed in, no organisation) · anon · service (operators)
// ─────────────────────────────────────────────────────────────────
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "package.json"));
const pg = require("pg");
const url = process.env.STAGING_URL ?? "postgresql://postgres@127.0.0.1:54329/straypaw_staging";
if (!/^postgresql:\/\/[^@]+@(127\.0\.0\.1|localhost):\d+\/straypaw_staging$/.test(url)) { console.error("Refusing: not the local staging database."); process.exit(2); }

const U = {
  leadA: "a0000000-0000-4000-8000-00000000a001", memberA: "a0000000-0000-4000-8000-00000000a002", volunteerA: "a0000000-0000-4000-8000-00000000a003",
  leadB: "b0000000-0000-4000-8000-00000000b001", memberB: "b0000000-0000-4000-8000-00000000b002",
  resident: "c0000000-0000-4000-8000-00000000c001", newcomer: "c0000000-0000-4000-8000-00000000c002",
};
const ORG_A = "a1000000-0000-4000-8000-0000000000a1", ORG_B = "b1000000-0000-4000-8000-0000000000b1";
const DOG_A = "d0000000-0000-4000-8000-0000000000a1", DOG_B = "d0000000-0000-4000-8000-0000000000b1", DOG_PUB = "d0000000-0000-4000-8000-0000000000c1";
const CASE_A = "e0000000-0000-4000-8000-0000000000a1", CASE_B = "e0000000-0000-4000-8000-0000000000b1";
const H = { A: "20000000-0000-4000-8000-0000000000a1", B: "20000000-0000-4000-8000-0000000000b1", G: "20000000-0000-4000-8000-0000000000c1", R: "20000000-0000-4000-8000-0000000000c2", N: "20000000-0000-4000-8000-0000000000c3" };

/* Expectations */
const ok = (r) => r.ok;
const denied = (r) => !r.ok;
const rowsAre = (...ids) => (r) => r.ok && JSON.stringify(r.rows.map((x) => x.id).sort()) === JSON.stringify([...ids].sort());
const count = (n) => (r) => r.ok && r.rows.length === n;
const none = (r) => !r.ok || r.rows.length === 0;
const truthy = (r) => r.ok && r.rows.length > 0 && Object.values(r.rows[0]).some((v) => v === true || (v && v !== false && v !== null));

const T = [];
const t = (area, name, as, sql, params, expect, why) => T.push({ area, name, as, sql, params, expect, why });

/* ── 1. Volunteer sign-ups (the release blocker) ─────────────────── */
const VOL = "select id from public.org_volunteers()";
t("volunteers", "Org A member sees only offers about Org A's animals", "memberA", VOL, [], rowsAre(H.A), "permitted: own animal");
t("volunteers", "Org A lead sees the same, nothing from Org B", "leadA", VOL, [], rowsAre(H.A), "permitted: own animal");
t("volunteers", "Org B member sees Org B's offer and the sign-up routed to B", "memberB", VOL, [], rowsAre(H.B, H.R), "permitted: own animal + routed");
t("volunteers", "Org B lead sees the same", "leadB", VOL, [], rowsAre(H.B, H.R), "permitted");
t("volunteers", "Org A volunteer-role member sees no one's contact details", "volunteerA", VOL, [], count(0), "forbidden: volunteers see nothing private");
t("volunteers", "Signed-in resident with no organisation sees nothing", "resident", VOL, [], count(0), "forbidden");
t("volunteers", "Anonymous visitor cannot call it at all", "anon", VOL, [], denied, "forbidden: execute revoked");
t("volunteers", "No member sees the general sign-up nobody routed", "memberA", `select id from public.org_volunteers() where id = '${H.G}'`, [], count(0), "forbidden: operators only");
t("volunteers", "No member sees NGO registrations", "memberA", `select id from public.org_volunteers() where id = '${H.N}'`, [], count(0), "forbidden: operators only");
t("volunteers", "Members cannot read the helpers table directly", "memberB", "select id from public.helpers", [], none, "forbidden: RLS deny-all");
t("volunteers", "Anonymous cannot read the helpers table directly", "anon", "select id from public.helpers", [], none, "forbidden");
t("volunteers", "A member cannot route a sign-up to their own organisation", "leadA", "select public.route_helper($1, $2)", [H.G, ORG_A], denied, "forbidden: service role only");
t("volunteers", "Operators (service role) read every sign-up", "service", "select id from public.helpers", [], count(5), "permitted: operator console");
t("volunteers", "Operators can route a sign-up, and it then appears for that organisation only", "service",
  `with r as (select public.route_helper('${H.G}', '${ORG_A}') as done) select done from r`, [], truthy, "permitted: designed sharing workflow");

/* ── 2. Membership and team ──────────────────────────────────────── */
t("membership", "my_ngo() names Org A for an Org A member", "memberA", "select public.my_ngo() as id", [], (r) => r.ok && r.rows[0].id === ORG_A);
t("membership", "my_ngo() is empty for a resident", "resident", "select public.my_ngo() as id", [], (r) => r.ok && r.rows[0].id === null);
t("membership", "Org A team list holds only Org A people", "leadA", "select user_id as id from public.my_org_members()", [], rowsAre(U.leadA, U.memberA, U.volunteerA));
t("membership", "Org B lead cannot see Org A's members through the table", "leadB", "select user_id as id from public.ngo_members where ngo_id = $1", [ORG_A], none);
t("membership", "Org A lead can change an Org A member's role", "leadA", "select public.set_member_role($1, 'volunteer')", [U.memberA], ok);
t("membership", "An Org A member (not lead) cannot change roles", "memberA", "select public.set_member_role($1, 'lead')", [U.volunteerA], denied);
t("membership", "Org B lead cannot change an Org A member's role", "leadB", "select public.set_member_role($1, 'volunteer')", [U.memberA], denied);
t("membership", "Org B lead cannot remove an Org A member", "leadB", "select public.remove_org_member($1)", [U.memberA], denied);
t("membership", "A resident cannot add themselves to an organisation", "resident", "insert into public.ngo_members (user_id, ngo_id, role) values ($1, $2, 'lead')", [U.resident, ORG_A], denied);

/* ── 3. Cases: read, take, assign, notes, review ──────────────────── */
t("cases", "Org A member reads Org A's case", "memberA", "select id from public.cases where id = $1", [CASE_A], count(1));
t("cases", "Org B member reads Org A's case only as the public record allows", "memberB", "select id, informer_contact, medical_notes from public.cases where id = $1", [CASE_A], (r) => r.ok && r.rows.every((x) => x.informer_contact == null && x.medical_notes == null));
t("cases", "Org A member takes Org A's case", "memberA", "select public.take_case($1, 'TEST Member A')", [CASE_A], ok);
t("cases", "Org B member cannot take Org A's case", "memberB", "select public.take_case($1, 'TEST Member B')", [CASE_A], denied);
t("cases", "A resident cannot take a case", "resident", "select public.take_case($1, 'TEST Resident')", [CASE_A], denied);
t("cases", "Org A lead assigns Org A's case to an Org A member", "leadA", "select public.assign_case($1, $2, 'TEST Member A', $3, 'TEST Lead A')", [CASE_A, U.memberA, U.leadA], ok);
t("cases", "Org B lead cannot assign Org A's case", "leadB", "select public.assign_case($1, $2, 'TEST Member B', $3, 'TEST Lead B')", [CASE_A, U.memberB, U.leadB], denied);
t("cases", "Org A member adds a note to Org A's case", "memberA", "select public.add_case_note($1, $2, 'TEST Member A', 'TEST note')", [CASE_A, U.memberA], ok);
t("cases", "Org B member cannot add a note to Org A's case", "memberB", "select public.add_case_note($1, $2, 'TEST Member B', 'TEST note')", [CASE_A, U.memberB], denied);
t("cases", "Org A member schedules a follow-up on Org A's case", "memberA", "select public.add_case_followup($1, $2, current_date + 3, 'TEST recheck')", [CASE_A, DOG_A], ok);
t("cases", "Org B member cannot schedule a follow-up on Org A's case", "memberB", "select public.add_case_followup($1, $2, current_date + 3, 'TEST recheck')", [CASE_A, DOG_A], denied);
t("cases", "Org B member cannot review (close) Org A's case", "memberB", "select public.review_case($1, 'close', 'TEST Member B', 'duplicate', null)", [CASE_A], denied);
t("cases", "Org A member opens a new case; it belongs to Org A", "memberA",
  `with c as (select public.create_case_with_location('Coimbatore', 'TEST new case', null, $1, 'RS Puram', 11.0, 76.95, null, null, null, $2, 'TEST Member A', 'dog', null, null, null, null, null) as id)
   select (select ngo_id from public.cases where id = (select id from c)) = $3 as same_org`, [DOG_A, U.memberA, ORG_A], (r) => r.ok && r.rows[0].same_org === true);
t("cases", "A resident cannot open a case through the organisation RPC", "resident",
  "select public.create_case_with_location('Coimbatore', 'TEST', null, null, 'x', 11.0, 76.9, null, null, null, $1, 'TEST Resident', 'dog', null, null, null, null, null)", [U.resident], denied);
t("cases", "Org B member cannot read Org A's case history (case_updates)", "memberB", "select id from public.case_updates where case_id = $1", [CASE_A], none);

/* ── 4. Care events ──────────────────────────────────────────────── */
t("care", "Org A member records care on Org A's animal", "memberA", "select public.add_medical_event($1, null, 'treatment', current_date, 'TEST dressing', 'TEST clinic A')", [DOG_A], ok);
t("care", "Org B member cannot record care on Org A's animal", "memberB", "select public.add_medical_event($1, null, 'treatment', current_date, 'TEST', 'TEST')", [DOG_A], denied);
t("care", "A resident cannot record care", "resident", "select public.add_medical_event($1, null, 'treatment', current_date, 'TEST', 'TEST')", [DOG_A], denied);
t("care", "Org B member cannot read Org A's clinical notes", "memberB", "select id from public.medical_events where dog_id = $1 and notes is not null", [DOG_A], none);
t("care", "Org A member reads Org A's clinical notes", "memberA", "select id from public.medical_events where dog_id = $1", [DOG_A], count(1));
t("care", "Org B member cannot change Org A's animal's recorded care status", "memberB", "select public.ngo_set_dog_care($1, true, true, false)", [DOG_A], denied);
t("care", "Org A member sets Org A's animal's recorded care status", "memberA", "select public.ngo_set_dog_care($1, true, null, null)", [DOG_A], ok);

/* ── 5. Animals register ─────────────────────────────────────────── */
t("animals", "Org A register lists Org A's animals only", "memberA", "select id from public.org_animals(null, null, null, null, null, null, null, 100, 0)", [], rowsAre(DOG_A));
t("animals", "Org B register lists Org B's animals only", "memberB", "select id from public.org_animals(null, null, null, null, null, null, null, 100, 0)", [], rowsAre(DOG_B));
t("animals", "A resident's register call returns nothing", "resident", "select id from public.org_animals(null, null, null, null, null, null, null, 100, 0)", [], none);

/* ── 6. Imports ──────────────────────────────────────────────────── */
t("imports", "Org A member sees Org A's import batch", "memberA", "select id from public.import_batches", [], count(1));
t("imports", "Org B member cannot see Org A's import batch", "memberB", "select id from public.import_batches where ngo_id = $1", [ORG_A], none);
t("imports", "A resident sees no import batch", "resident", "select id from public.import_batches", [], none);
t("imports", "A member cannot write an import batch directly (server route only)", "memberA", "insert into public.import_batches (ngo_id, source_filename, source_kind) values ($1, 'TEST.xlsx', 'xlsx')", [ORG_A], denied);

/* ── 7. Reports (sightings) ──────────────────────────────────────── */
t("reports", "Anonymous cannot call report_sighting directly (server route only)", "anon", "select public.report_sighting(null, 11.0, 76.9, 'x', null, null, null, null, null, null, null)", [], denied);
t("reports", "Signed-in user cannot call report_sighting directly", "resident", "select public.report_sighting(null, 11.0, 76.9, 'x', null, null, null, null, null, null, null)", [], denied);
t("reports", "The server (service role) files a report", "service", "select public.report_sighting(null, 11.0, 76.9, 'TEST zone', 'TEST', null, 'TEST', 'TEST', null, null, null) is not null as ok", [], (r) => r.ok);
t("reports", "Anonymous cannot submit a volunteer sign-up directly (server route only)", "anon", "select public.submit_helper('TEST', 'x@test.invalid')", [], denied);

/* ── 8. Organisation profile, feeding spots ──────────────────────── */
t("orgs", "Org A lead updates Org A's profile; Org B is untouched", "leadA",
  `with u as (select public.ngo_update_profile('TEST mission A', null, null, null, null, null, null, null, null, null, null, null) as r)
   select (select mission from public.ngos where id = '${ORG_B}') is distinct from 'TEST mission A' as b_untouched, (select r from u) is not null as done`, [], (r) => r.ok && r.rows[0].b_untouched === true);
t("orgs", "A resident cannot update any profile", "resident", "select public.ngo_update_profile('TEST', null, null, null, null, null, null, null, null, null, null, null)", [], (r) => !r.ok || r.rows.every((x) => !Object.values(x).some((v) => v && v.ok === true)));
t("feeding", "Org A member adds a feeding spot; it belongs to Org A", "memberA",
  `with z as (select public.create_org_feeding_zone('TEST spot', null, 'RS Puram', 11.0, 76.95, null) as id) select (select ngo_id from public.feeding_zones where id = (select id from z)) = $1 as same_org`, [ORG_A], (r) => r.ok && r.rows[0].same_org === true);
t("feeding", "A resident cannot add an organisation feeding spot", "resident", "select public.create_org_feeding_zone('TEST', null, 'x', 11.0, 76.9, null)", [], denied);

/* ── 9. Public map ───────────────────────────────────────────────── */
t("public", "Anonymous reads the public map cells", "anon", "select * from public.public_map_cells_v2(array['Coimbatore'])", [], ok);
t("public", "Public map cells carry no exact coordinates or private fields", "anon", "select * from public.public_map_cells_v2(array['Coimbatore']) limit 1", [],
  (r) => r.ok && (r.rows.length === 0 || !Object.keys(r.rows[0]).some((k) => ["lat", "lng", "informer_contact", "contact", "medical_notes", "notes"].includes(k))));
t("public", "Anonymous cannot read organisation membership", "anon", "select user_id from public.ngo_members", [], none);

/* ── run ─────────────────────────────────────────────────────────── */
const c = new pg.Client({ connectionString: url });
await c.connect();
const out = [];
for (const x of T) {
  let r;
  try {
    await c.query("begin");
    if (x.as === "service") { await c.query("set local role service_role"); await c.query("select set_config('request.jwt.claims', '{\"role\":\"service_role\"}', true)"); }
    else if (x.as === "anon") { await c.query("set local role anon"); await c.query("select set_config('request.jwt.claims', '{\"role\":\"anon\"}', true)"); }
    else { await c.query("set local role authenticated"); await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: U[x.as], role: "authenticated" })]); }
    const q = await c.query(x.sql, x.params);
    r = { ok: true, rows: q.rows };
  } catch (e) {
    r = { ok: false, error: `${e.code ?? ""} ${e.message}`.trim() };
  } finally {
    await c.query("rollback").catch(() => {});
  }
  const pass = !!x.expect(r);
  out.push({ area: x.area, test: x.name, as: x.as, pass, result: r.ok ? `ok, ${r.rows.length} row${r.rows.length === 1 ? "" : "s"}` : `error: ${r.error.slice(0, 140)}` });
}

/* The defect, reproduced: the pre-fix org_volunteers() body, run inside a rolled-back transaction. */
let repro;
try {
  await c.query("begin");
  await c.query(`create or replace function public.org_volunteers() returns table(id uuid, name text, contact text, message text, zone text, dog_id uuid, created_at timestamptz)
    language sql security definer set search_path = public stable as $$ select id, name, contact, message, zone, dog_id, created_at from helpers where is_ngo_member() and not is_ngo order by created_at desc limit 300; $$`);
  await c.query("set local role authenticated");
  await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: U.memberB, role: "authenticated" })]);
  const q = await c.query("select id from public.org_volunteers()");
  repro = { leaked: q.rows.map((r) => r.id).filter((id) => id === H.A || id === H.G).length, rows: q.rows.length };
} catch (e) { repro = { error: e.message }; } finally { await c.query("rollback"); }
await c.end();

const pass = out.filter((x) => x.pass).length;
writeFileSync(join(here, "results.json"), JSON.stringify({ ranAt: new Date().toISOString(), pass, total: out.length, preFixReproduction: repro, tests: out }, null, 2));
for (const x of out) console.log(`${x.pass ? "PASS" : "FAIL"}  [${x.area}] ${x.test} (as ${x.as}) → ${x.result}`);
console.log(`\nPre-fix org_volunteers() as Org B member: ${JSON.stringify(repro)}`);
console.log(`\n${pass}/${out.length} passed`);
process.exit(pass === out.length ? 0 : 1);
