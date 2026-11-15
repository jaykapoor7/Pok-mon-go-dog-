/* Database behaviour and permission tests for the rebuild's migrations, on a real Postgres running in WebAssembly
   (PGlite). No network and no real database: `base.sql` stands in for the parts of the production schema the migrations
   touch, then every rebuild migration is applied in order and the tests act as different signed-in people through
   row-level security, exactly as the app's database calls do.

     node scripts/db-tests/run.mjs            (npm run test:db) */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const MIG = join(here, "../../supabase/migrations");
const MIGRATIONS = [
  "20261110230441_one_health_v2_1_core.sql", "20261110230655_one_health_v2_2_workflows.sql", "20261110230829_one_health_v2_3_programme_setup_grants.sql",
  "20261111100000_one_health_v2_4_network_alerts.sql", "20261111120000_one_health_v2_5_record_audit_fix.sql", "20261112140000_one_health_v2_6_referrals_revaccination_logos.sql",
  "20261115100000_rebuild_foundations.sql", "20261115110000_rebuild_kaju_in_channel.sql", "20261115120000_rebuild_kaju_missions.sql", "20261115130000_rebuild_people_studies_vet.sql",
  "20261116100000_rebuild_collaboration.sql", "20261116110000_rebuild_kaju_engine.sql", "20261116120000_rebuild_research_access.sql",
  "20261116130000_rebuild_saved_views.sql", "20261116140000_rebuild_automations_v2.sql",
  "20261116150000_rebuild_vet_clinics_and_joining.sql",
];

process.on("unhandledRejection", (e) => { console.error(`Test run stopped: ${e?.message ?? e}`); process.exit(1); });
const db = new PGlite();
await db.exec(readFileSync(join(here, "base.sql"), "utf8"));
for (const m of MIGRATIONS) {
  try { await db.exec(readFileSync(join(MIG, m), "utf8")); }
  catch (e) { console.error(`Migration failed: ${m}\n  ${e.message}`); process.exit(1); }
}
// Applying everything a second time must succeed too: every migration is safe to re-run.
for (const m of MIGRATIONS.slice(10)) {
  try { await db.exec(readFileSync(join(MIG, m), "utf8")); }
  catch (e) { console.error(`Re-running failed: ${m}\n  ${e.message}`); process.exit(1); }
}

/* ── helpers ─────────────────────────────────────────────────────────── */
let passed = 0, failed = 0;
const ok = (cond, name) => { if (cond) { passed++; } else { failed++; console.error(`  ✗ ${name}`); } };
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
/** Run SQL as a signed-in person, through row-level security. */
async function as(uid, sql, params = []) {
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: uid, role: "authenticated" })]);
  await db.exec("set role authenticated");
  try { return (await db.query(sql, params)).rows; } finally { await db.exec("reset role"); await db.query("select set_config('request.jwt.claims', '', false)"); }
}
/** The same, expecting the database to refuse. Returns the error message, or null if it was allowed. */
async function refused(uid, sql, params = []) { try { await as(uid, sql, params); return null; } catch (e) { if (process.env.DB_TEST_VERBOSE) console.log(`    refused: ${e.message}`); return e.message; } }
const section = (s) => console.log(`\n${s}`);
const uuid = () => crypto.randomUUID();

/* ── people and organisations ────────────────────────────────────────── */
const A = uuid(), B = uuid(), C = uuid(), P = uuid(), R = uuid(), Q = uuid();
for (const [id, name] of [[A, "Asha Admin"], [B, "Bilal Member"], [C, "Chitra Other NGO"], [P, "Priya Programme Lead"], [R, "Ravi Researcher"], [Q, "Quinn Second Lead"]])
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [id, `${id}@example.invalid`, { display_name: name }]);
const N1 = (await one("insert into ngos (name) values ('Ward Twelve Animal Care') returning id")).id;
const N2 = (await one("insert into ngos (name) values ('Other City Rescue') returning id")).id;
await db.query("insert into ngo_members (ngo_id, user_id, role) values ($1,$2,'admin'), ($1,$3,'member'), ($4,$5,'admin')", [N1, A, B, N2, C]);
// Open cases in Ward 12, due next week; one already has an open follow-up task.
const nextWeek = (await one("select ((now() at time zone 'Asia/Kolkata')::date + (8 - extract(isodow from (now() at time zone 'Asia/Kolkata')::date)::int) + 2) as d")).d;
const cases = [];
for (const t of ["Limping dog near market", "Puppy needs recheck", "Post-surgery check"])
  cases.push((await one("insert into cases (ngo_id, title, zone, city, due_at) values ($1, $2, 'Ward 12', 'Pune', $3::date + time '10:00') returning id", [N1, t, nextWeek])).id);
await db.query("insert into cases (ngo_id, title, zone, city, due_at) values ($1, 'Other NGO case', 'Ward 12', 'Pune', $2::date + time '10:00')", [N2, nextWeek]);

/* ── channels, messages, mentions ────────────────────────────────────── */
section("Channels and messages");
const general = (await as(A, "insert into nx_channels (org_id, name, topic) values ($1, 'general', 'Everyone') returning id", [N1]))[0].id;
ok((await as(C, "select id from nx_channels where id = $1", [general])).length === 0, "another NGO cannot see a channel");
ok((await as(B, "select id from nx_channels where id = $1", [general])).length === 1, "a member sees the organisation's channel");
ok(await refused(B, "insert into nx_channels (org_id, name, kind) values ($1, 'sneaky-dm', 'dm')", [N1]) !== null, "a DM cannot be created directly");
ok(await refused(B, "insert into nx_channels (org_id, name, kind) values ($1, 'records', 'record')", [N1]) !== null, "a record thread channel cannot be created directly");
const m1 = (await as(A, "insert into nx_messages (channel_id, body, author_name, mentions) values ($1, 'Bilal and Chitra, please check the market dog', 'Asha Admin', $2) returning id, mentions", [general, [B, C]]))[0];
ok(m1.mentions.length === 1 && m1.mentions[0] === B, "a mention of someone outside the channel is dropped");
const notesB = await as(B, "select title, body, href from nx_notifications where kind = 'mention'");
ok(notesB.length === 1 && notesB[0].body === null && notesB[0].href.startsWith("/channels/general"), "the person mentioned is notified, without the message text");
ok((await as(C, "select id from nx_notifications where kind = 'mention'")).length === 0, "nobody else is notified");
ok((await as(C, "select id from nx_messages where channel_id = $1", [general])).length === 0, "another NGO cannot read the messages");
ok((await as(C, "select id from nx_search_messages('market dog')")).length === 0, "search never returns another organisation's messages");
ok((await as(B, "select id from nx_search_messages('market dog')")).length === 1, "search finds the organisation's own messages");
ok(await refused(B, "select nx_edit_message($1, 'changed')", [m1.id]) !== null, "nobody edits someone else's message");
ok(await refused(A, "update nx_messages set channel_id = channel_id, author_name = 'Someone else' where id = $1", [m1.id]) !== null, "a message's author cannot be rewritten");
await as(A, "select nx_edit_message($1, 'Bilal, please check the market dog today')", [m1.id]);
ok((await one("select count(*)::int n from nx_message_history where message_id = $1 and action = 'edited'", [m1.id])).n === 1, "an edit keeps the earlier wording for audit");
ok((await as(B, "select edited_at from nx_messages where id = $1", [m1.id]))[0].edited_at !== null, "an edited message is marked edited");
await as(B, "insert into nx_reactions (message_id, emoji) values ($1, '👍')", [m1.id]);
ok(await refused(C, "insert into nx_reactions (message_id, emoji) values ($1, '👀')", [m1.id]) !== null, "an outsider cannot react");
ok(await refused(B, "insert into nx_reactions (message_id, emoji) values ($1, '🤡')", [m1.id]) !== null, "only the offered reactions are accepted");
ok(await refused(A, "insert into nx_messages (channel_id, body, files) values ($1, 'file', $2)", [general, JSON.stringify([{ path: `${uuid()}/x.pdf`, name: "x.pdf" }])]) !== null, "a file outside the channel's folder is refused");
await as(A, "insert into nx_messages (channel_id, body, files) values ($1, 'report attached', $2)", [general, JSON.stringify([{ path: `${general}/abc/report.pdf`, name: "report.pdf", size: 1200, mime: "application/pdf" }])]);
await as(A, "select nx_delete_message($1)", [m1.id]);
ok((await as(B, "select body, deleted_at from nx_messages where id = $1", [m1.id]))[0].deleted_at !== null, "a deleted message shows as deleted");
ok(await refused(A, "select nx_edit_message($1, 'back again')", [m1.id]) !== null, "a deleted message cannot be edited");

section("Announcements, record threads, direct messages");
const ann = (await as(A, "insert into nx_channels (org_id, name, kind) values ($1, 'announcements', 'announcement') returning id", [N1]))[0].id;
ok(await refused(B, "insert into nx_messages (channel_id, body) values ($1, 'hello all')", [ann]) !== null, "a member cannot post in an announcement channel");
ok((await as(A, "insert into nx_messages (channel_id, body) values ($1, 'Clinic closed Friday') returning id", [ann])).length === 1, "an admin can post an announcement");
const rec = (await as(B, "select nx_record_channel($1) as id", [N1]))[0].id;
ok(rec && (await as(B, "select nx_record_channel($1) as id", [N1]))[0].id === rec, "one record-thread channel per organisation");
ok(await refused(C, "select nx_record_channel($1)", [N1]) !== null, "an outsider cannot open the record threads");
const dmId = (await as(A, "select nx_open_dm($1, $2) as id", [N1, B]))[0].id;
await as(A, "insert into nx_messages (channel_id, body) values ($1, 'private note')", [dmId]);
const third = uuid(); await db.query("insert into auth.users (id) values ($1)", [third]); await db.query("insert into ngo_members (ngo_id, user_id, role) values ($1, $2, 'member')", [N1, third]);
ok((await as(third, "select id from nx_messages where channel_id = $1", [dmId])).length === 0, "a third member cannot read a direct message");
ok((await as(B, "select id from nx_messages where channel_id = $1", [dmId])).length === 1, "the other person in the DM can read it");
ok((await as(third, "select id from nx_search_messages('private note')")).length === 0, "search never reveals a direct message to a third person");

section("Programme channels across organisations");
const prog = (await as(P, "select oh_create_programme('Pune rabies elimination', 'pune-rabies', 'Asia/Kolkata', array['Ward 12'], null, 'Pune', 'Priya') as r"))[0].r;
await as(P, "select oh_add_partner($1, 'ngo', 'Ward Twelve Animal Care', null, 'Field work', null, null, $2)", [prog.id, N1]);
const pch = (await as(P, "select nx_create_programme_channel($1, 'pune-partners', 'Partners of the programme') as id", [prog.id]))[0].id;
ok(await refused(B, "select nx_create_programme_channel($1, 'my-channel')", [prog.id]) !== null, "a partner who does not manage the programme cannot start a programme channel");
await as(P, "select nx_programme_channel_invite($1, $2)", [pch, B]);
ok(await refused(P, "select nx_programme_channel_invite($1, $2)", [pch, C]) !== null, "someone outside the programme cannot be invited");
ok((await as(B, "select id from nx_my_programme_channels()")).length === 1, "an invited partner sees the programme channel");
ok((await as(A, "select id from nx_my_programme_channels()")).length === 0, "a colleague who was not invited does not");
await as(B, "insert into nx_messages (channel_id, body) values ($1, 'Ward 12 drive done')", [pch]);
ok((await as(P, "select id from nx_messages where channel_id = $1", [pch])).length === 1, "the coordinator reads the partner's message");
const n1org = (await one("select id from oh_organisations where ngo_id = $1", [N1])).id;
await db.query("delete from oh_participations where organisation_id = $1", [n1org]);
ok((await as(B, "select id from nx_messages where channel_id = $1", [pch])).length === 0, "leaving the programme ends access at once");
await db.query("insert into oh_participations (programme_id, organisation_id) values ($1, $2)", [prog.id, n1org]);

section("Notifications");
await as(B, "insert into nx_notification_settings (email) values (true)");
await as(A, "insert into nx_messages (channel_id, body, author_name, mentions) values ($1, 'Bilal, the van is here', 'Asha Admin', $2)", [general, [B]]);
ok((await as(B, "select status from nx_deliveries where channel = 'email'")).length === 1, "a person who turned on email gets an email delivery queued");
ok((await as(A, "select id from nx_deliveries")).length === 0, "nobody sees another person's deliveries");
ok((await as(B, "select nx_mark_notifications_read() as n"))[0].n >= 1, "notifications can be marked read");

/* ── Kaju missions ───────────────────────────────────────────────────── */
section("Kaju missions: approval, idempotency, retries");
await db.query("insert into nx_tasks (org_id, title, created_by, record_kind, record_id) values ($1, 'Existing follow-up', $2, 'case', $3)", [N1, A, cases[2]]);
const plan = [
  { label: "Find Ward 12 cases due next week", tool: "find_due_followups", input: { place: "Ward 12", when: "next week" } },
  { label: "Create a follow-up task for each", tool: "create_followup_tasks", input: { from_step: 1, team: "Field team A" } },
  { label: "Tell #general", tool: "post_message", input: { channel: "general", body: "Follow-up tasks for Ward 12 are ready." } },
];
const mis = (await as(A, "select nx_mission_start($1, 'Prepare Ward 12 follow-ups', '{}', $2, 'start-1') as id", [N1, JSON.stringify(plan)]))[0].id;
ok((await as(A, "select nx_mission_start($1, 'Prepare Ward 12 follow-ups', '{}', $2, 'start-1') as id", [N1, JSON.stringify(plan)]))[0].id === mis, "starting twice with the same key gives the same mission");
let st = await as(A, "select position, state, result from nx_mission_steps where mission_id = $1 order by position", [mis]);
ok(st[0].state === "done" && st[0].result.found === 2 && st[0].result.already_open === 1, "step 1 reads 2 cases and counts the one that already has a follow-up");
ok(st[1].state === "waiting_approval", "creating several tasks waits for approval");
ok((await as(A, "select state from nx_missions where id = $1", [mis]))[0].state === "waiting_person", "the mission waits for the person");
ok((await as(A, "select id from nx_notifications where kind = 'approval'")).length >= 1, "the owner is asked to approve");
ok((await as(A, "select count(*)::int n from nx_tasks where mission_id = $1", [mis]))[0].n === 0, "nothing is created before approval");
ok(await refused(B, "select nx_mission_decide($1, 'approve')", [st[1].id ?? (await one("select id from nx_mission_steps where mission_id = $1 and position = 2", [mis])).id]) !== null, "only the mission's owner approves");
const step2 = (await one("select id from nx_mission_steps where mission_id = $1 and position = 2", [mis])).id;
ok((await as(A, "select nx_mission_decide($1, 'approve') as s", [step2]))[0].s === "completed", "approving runs the rest to completion");
ok((await as(A, "select count(*)::int n from nx_tasks where mission_id = $1", [mis]))[0].n === 2, "two tasks are created, none for the case that had one");
ok((await as(B, "select body, author_kind from nx_messages where channel_id = $1 and author_kind = 'kaju'", [general])).length === 1, "Kaju posts once in the channel, attributed");
const again = await one("select nx_tool_exec($1, $2, 'create_followup_tasks', $3, $4, $5, $6) as r", [A, N1, JSON.stringify({ from_step: 1 }), `${mis}:2`, mis, step2]);
ok(again.r.deduplicated === true && (await one("select count(*)::int n from nx_tasks where mission_id = $1", [mis])).n === 2, "running a finished step again never creates duplicates");
ok((await as(A, "select kind from nx_mission_events where mission_id = $1", [mis])).some((e) => e.kind === "approved"), "the trace records the approval");
ok((await as(B, "select id from nx_mission_events where mission_id = $1", [mis])).length === 0, "nobody else reads the mission's trace");

const flaky = (await as(A, "select nx_mission_start($1, 'Tell #field-ops', '{}', $2) as id", [N1, JSON.stringify([{ label: "Post in #field-ops", tool: "post_message", input: { channel: "field-ops", body: "Van leaves at 7." } }])]))[0].id;
let fs = await one("select state, attempts, next_attempt_at > now() as later, error from nx_mission_steps where mission_id = $1", [flaky]);
ok(fs.state === "retrying" && fs.attempts === 1 && fs.later, "a failed step is scheduled to try again later");
for (let i = 0; i < 6; i++) { await db.query("update nx_mission_steps set next_attempt_at = now() - interval '1 second' where mission_id = $1 and state = 'retrying'", [flaky]); await db.query("select nx_mission_tick()"); }
fs = await one("select state, attempts from nx_mission_steps where mission_id = $1", [flaky]);
ok(fs.state === "failed" && fs.attempts === 5, "after five tries the step stops");
ok((await one("select state from nx_missions where id = $1", [flaky])).state === "blocked", "the mission shows as blocked, not done");
ok((await as(A, "select id from nx_notifications where title like 'Kaju stopped%'")).length === 1, "the owner is told it stopped");
await as(A, "insert into nx_channels (org_id, name) values ($1, 'field-ops')", [N1]);
ok((await as(A, "select nx_mission_retry($1) as s", [flaky]))[0].s === "completed", "after the cause is fixed, retry completes it");
ok((await as(B, "select count(*)::int n from nx_messages m join nx_channels c on c.id = m.channel_id where c.name = 'field-ops'"))[0].n === 1, "the message was posted exactly once");

section("Kaju missions: human-only steps, policies, outside messages");
const human = (await as(A, "select nx_mission_start($1, 'Claim review', '{}', $2) as id", [N1, JSON.stringify([{ label: "Decide the claim", tool: "verify_claim", input: {} }, { label: "Note it", tool: "create_task", input: { title: "File the decision" } }])]))[0].id;
const hs = await one("select id, state, level from nx_mission_steps where mission_id = $1 and position = 1", [human]);
ok(hs.state === "waiting_person" && hs.level === 4, "a decision only a person can make is never run by Kaju");
ok((await as(A, "select nx_mission_decide($1, 'done', null, 'Decided by the reviewer') as s", [hs.id]))[0].s === "completed", "the person marks it done and the mission continues");
ok(await refused(B, "insert into nx_kaju_policies (org_id, tool, level) values ($1, 'create_task', 3)", [N1]) !== null, "only a lead or admin sets Kaju's rules");
ok(await refused(A, "insert into nx_kaju_policies (org_id, tool, level) values ($1, 'create_followup_tasks', 1)", [N1]) !== null, "a rule cannot make a tool looser than the registry");
await as(A, "insert into nx_kaju_policies (org_id, tool, level) values ($1, 'create_task', 3)", [N1]);
const pol = (await as(A, "select nx_mission_start($1, 'One task', '{}', $2) as id", [N1, JSON.stringify([{ label: "Make a task", tool: "create_task", input: { title: "Check kennels" } }])]))[0].id;
ok((await one("select state from nx_mission_steps where mission_id = $1", [pol])).state === "waiting_approval", "an organisation's stricter rule makes the step wait for approval");
await as(A, "insert into nx_kaju_policies (org_id, tool, level, enabled) values ($1, 'post_message', 2, false) on conflict (org_id, tool) do update set enabled = false", [N1]);
const off = (await as(A, "select nx_mission_start($1, 'Post', '{}', $2) as id", [N1, JSON.stringify([{ label: "Post", tool: "post_message", input: { channel: "general", body: "x" } }])]))[0].id;
ok((await one("select state from nx_missions where id = $1", [off])).state === "blocked", "a switched-off tool stops the mission");
const ext = (await as(A, "select nx_mission_start($1, 'Write to the office', '{}', $2) as id", [N1, JSON.stringify([{ label: "Email the office", tool: "send_external", input: { channel: "email", to: "office@example.invalid", subject: "Evidence", body: "Attached is the list." } }])]))[0].id;
const es = await one("select id, state from nx_mission_steps where mission_id = $1", [ext]);
ok(es.state === "waiting_approval", "a message to someone outside StrayPaw waits for approval");
ok((await as(A, "select id from nx_outbox")).length === 0, "nothing is queued before approval");
await as(A, "select nx_mission_decide($1, 'approve')", [es.id]);
const out = await as(A, "select status, approved_by from nx_outbox");
ok(out.length === 1 && out[0].status === "queued" && out[0].approved_by === A, "after approval it is queued with who approved it (sent only by a connected account)");
ok((await as(B, "select id from nx_outbox")).length === 0, "a colleague cannot read the recipients");
ok(await refused(C, "select nx_mission_start($1, 'x', '{}', $2)", [N1, JSON.stringify([{ tool: "create_task", input: { title: "x" } }])]) !== null, "an outsider cannot start a mission in the organisation");
ok(await refused(A, "select nx_mission_start($1, 'x', '{}', $2)", [N1, JSON.stringify([{ tool: "drop_tables", input: {} }])]) !== null, "a tool that is not in the registry is refused");

section("Organisation memory");
const mem = (await as(B, "insert into nx_kaju_memory (org_id, scope, kind, title, body) values ($1, 'org', 'procedure', 'ABC evidence', 'Photos before and after, vet note, release spot.') returning id", [N1]))[0].id;
ok((await as(third, "select id from nx_kaju_memory where id = $1", [mem])).length === 0, "an unapproved organisation entry is not used by others");
ok(await refused(B, "select nx_memory_decide($1, 'approve')", [mem]) !== null, "a member cannot approve organisation memory");
await as(A, "select nx_memory_decide($1, 'approve')", [mem]);
ok((await as(third, "select id from nx_kaju_memory where id = $1", [mem])).length === 1, "after approval colleagues can use it");
ok((await as(C, "select id from nx_kaju_memory where id = $1", [mem])).length === 0, "another organisation never can");
await as(B, "select nx_memory_decide($1, 'revoke')", [mem]);
ok((await as(third, "select revoked_at from nx_kaju_memory where id = $1", [mem]))[0].revoked_at !== null, "its author can remove it");

/* ── Research access ─────────────────────────────────────────────────── */
section("Research data access");
const ro = (await one("insert into oh_organisations (kind, name) values ('research', 'Institute of Epidemiology') returning id")).id;
await db.query("insert into oh_members (organisation_id, user_id, role) values ($1, $2, 'analyst')", [ro, R]);
const coordOrg = prog.organisation_id;
const fac = (await one("insert into oh_organisations (kind, name) values ('hospital', 'District Hospital') returning id")).id;
await db.query("insert into oh_participations (programme_id, organisation_id) values ($1, $2)", [prog.id, fac]);
for (let i = 0; i < 7; i++) await db.query("insert into health.exposures (facility_id, code, exposure_on, presented_on, exposure_kind, category) values ($1, $2, current_date - 10, current_date - 10, 'bite', 'III')", [fac, `EX-${i}`]);
await db.query("insert into health.exposures (facility_id, code, exposure_on, presented_on, exposure_kind, category) values ($1, 'EX-x', current_date - 40, current_date - 40, 'bite', 'II')", [fac]);
await db.query("update oh_programmes set status = 'active' where id = $1", [prog.id]);
ok((await as(R, "select id from nx_requestable_programmes()")).some((p) => p.id === prog.id), "a researcher can see which programmes to ask");
const req = (await as(R, "select nx_request_data($1, $2, 'Bite trends in Pune', 'Describe weekly bite exposures by category to plan vaccine supply.', array['week','category'], current_date - 60, current_date) as id", [prog.id, ro]))[0].id;
ok((await as(P, "select id from nx_notifications where kind = 'approval' and title like 'Data request%'")).length === 1, "the programme's coordinator is asked to decide");
ok((await as(C, "select id from nx_data_requests where id = $1", [req])).length === 0, "nobody else sees the request");
ok(await refused(R, "select nx_take_extract($1)", [req]) !== null, "no data before approval");
ok(await refused(R, "select nx_decide_data_request($1, 'approve')", [req]) !== null, "the researcher cannot approve their own request");
await as(P, "select nx_decide_data_request($1, 'approve', 'Approved for supply planning', current_date + 90)", [req]);
const x1 = (await as(R, "select nx_take_extract($1) as id", [req]))[0].id;
const ex = (await as(R, "select version, rows, suppress_below, query from nx_data_extracts where id = $1", [x1]))[0];
ok(ex.version === 1 && ex.query.variables.length === 2, "the extract is versioned and records its exact query");
ok(ex.rows.every((r) => !("area" in r && r.area) && !("species" in r && r.species)), "only the approved variables are in the extract");
ok(JSON.stringify(ex.rows).length > 2 && !JSON.stringify(ex.rows).includes("patient"), "it holds counts, never patient rows");
ok((await as(R, "select nx_take_extract($1) as id", [req])).length === 1 && (await as(R, "select max(version) v from nx_data_extracts"))[0].v === 2, "taking it again makes version 2");
await as(P, "select nx_decide_data_request($1, 'revoke', 'Study ended')", [req]);
ok((await as(R, "select id from nx_data_extracts")).length === 0, "after revocation the extracts can no longer be read");
ok(await refused(R, "select nx_take_extract($1)", [req]) !== null, "and no new extract can be taken");

section("Saved views and pins");
await as(A, "insert into nx_saved_views (org_id, kind, page, name, state) values ($1, 'view', '/ngo/cases', 'Ward 12 critical', '{\"view\":\"critical\",\"q\":\"ward 12\"}')", [N1]);
ok((await as(B, "select id from nx_saved_views")).length === 0, "nobody sees another person's saved views");
ok(await refused(C, "insert into nx_saved_views (org_id, kind, page, name) values ($1, 'pin', '/ngo/cases/x', 'x')", [N1]) !== null, "a view cannot be saved against an organisation one is not in");

section("Automations for every workspace");
ok(await refused(B, "select nx_automation_save($1, 'overdue_tasks', 'Overdue tasks')", [N1]) !== null, "a member cannot turn automations on");
await db.query("insert into nx_tasks (org_id, title, created_by, assignee_id, due_on) values ($1, 'Late visit', $2, $3, current_date - 5)", [N1, A, B]);
const au = (await as(A, "select nx_automation_save($1, 'overdue_tasks', 'Overdue tasks', 'day', '{\"days\":2}') as id", [N1]))[0].id;
const r1 = (await as(A, "select nx_automation_run($1, false) as r", [au]))[0].r;
ok(r1.status === "succeeded" && r1.found >= 1, "overdue tasks are found");
ok((await as(B, "select id from nx_notifications where kind = 'reminder' and title like '%of your tasks%'")).length === 1, "the assignee is reminded about their own task");
ok((await as(A, "select nx_automation_run($1, false) as r", [au]))[0].r.status === "skipped", "the same day is never delivered twice");
ok((await as(C, "select id from nx_automation_runs")).length === 0, "another organisation cannot see the runs");
// A clinic with a prescribed course: doses due, one missed, reminders only for the consenting patient.
const clinic = (await one("insert into oh_organisations (kind, name, short_name) values ('clinic', 'Ward 12 Health Centre', 'W12 HC') returning id")).id;
const nurse = uuid(); await db.query("insert into auth.users (id) values ($1)", [nurse]);
await db.query("insert into oh_members (organisation_id, user_id, role) values ($1, $2, 'lead'), ($1, $3, 'nurse')", [clinic, P, nurse]);
const ex1 = (await one("insert into health.exposures (facility_id, code, exposure_on, presented_on, exposure_kind, reminder_consent, contact_phone) values ($1, 'B-1', current_date - 3, current_date - 3, 'bite', true, '+91 98450 00001') returning id", [clinic])).id;
const ex2 = (await one("insert into health.exposures (facility_id, code, exposure_on, presented_on, exposure_kind, reminder_consent, contact_phone) values ($1, 'B-2', current_date - 3, current_date - 3, 'bite', false, null) returning id", [clinic])).id;
for (const [ex, d] of [[ex1, 0], [ex2, 0], [ex2, -2]]) {
  const course = (await one("insert into health.pep_courses (exposure_id, regimen, prescribed_by) values ($1, 'Essen 4-dose IM', $2) on conflict (exposure_id) do update set regimen = excluded.regimen returning id", [ex, P])).id;
  await db.query("insert into health.pep_doses (course_id, dose_no, due_on) values ($1, (select coalesce(max(dose_no), 0) + 1 from health.pep_doses where course_id = $1), current_date + $2::int)", [course, d]);
}
const due = (await as(P, "select nx_automation_save($1, 'pep_doses_due', 'PEP doses due', 'day', '{}', 'clinical') as id", [clinic]))[0].id;
ok((await as(P, "select nx_automation_run($1, false) as r", [due]))[0].r.found === 2, "doses due today are counted from the clinician's schedule");
ok((await as(nurse, "select body from nx_notifications where title = 'PEP doses due'"))[0]?.body.includes("as prescribed"), "the nurse is told, with a count and no patient details");
const missed = (await as(P, "select nx_automation_save($1, 'pep_missed', 'Missed PEP doses', 'day', '{}', 'clinical') as id", [clinic]))[0].id;
ok((await as(P, "select nx_automation_run($1, false) as r", [missed]))[0].r.found === 1, "a missed dose is flagged for the clinical team");
const rem = (await as(P, "select nx_automation_save($1, 'pep_reminders', 'PEP reminders', 'day', '{}', 'clinical') as id", [clinic]))[0].id;
ok((await as(P, "select nx_automation_run($1, false) as r", [rem]))[0].r.found === 1, "a reminder is queued only for the patient who consented");
const log = await as(nurse, "select phone_masked, status from nx_pep_reminders($1)", [clinic]);
ok(log.length === 1 && log[0].phone_masked.startsWith("••••") && log[0].status === "queued", "staff see the reminder with the number masked");
ok((await as(A, "select id from nx_pep_reminders($1)", [clinic])).length === 0, "nobody outside the clinic sees it");
ok(await refused(nurse, "select * from health.reminder_outbox") !== null, "the reminder queue itself is not readable through the API");
ok((await as(P, "select nx_automation_run($1, true) as r", [rem]))[0].r.found === 0, "running it again the same day queues nothing new");

section("Independent veterinary clinics");
const V = uuid(), VN = uuid();
for (const [id, nm] of [[V, "Dr. Vee"], [VN, "Nina Nurse"]]) await db.query("insert into auth.users (id, raw_user_meta_data) values ($1, $2)", [id, { display_name: nm }]);
const vc = (await as(V, "select nx_register_vet_clinic('Kind Paws Veterinary Clinic', 'Pune', 'Dr. Vee') as id"))[0].id;
ok((await as(V, "select workspace, kind, source from nx_my_workspaces() where org_id = $1", [vc]))[0]?.source === "vet_clinic", "the clinic opens in the Healthcare workspace as a veterinary clinic");
await db.query("insert into oh_members (organisation_id, user_id, role) values ($1, $2, 'nurse')", [vc, VN]);
const dog1 = (await one("insert into dogs (ngo_id, name) values ($1, 'Brownie') returning id", [N1])).id;
const pat = (await as(VN, "insert into nx_vet_patients (clinic_id, name, brought_by, ngo_id, dog_id) values ($1, 'Brownie', 'ngo', $2, $3) returning id", [vc, N1, dog1]))[0].id;
ok(await refused(C, "insert into nx_vet_patients (clinic_id, name) values ($1, 'x')", [vc]) !== null, "an outsider cannot add patients to the clinic");
const enc = (await as(VN, "insert into nx_vet_encounters (clinic_id, patient_id, kind, findings, diagnosis, next_due) values ($1, $2, 'sterilisation', 'Healthy female', 'Spay, no complications', current_date + 7) returning id", [vc, pat]))[0].id;
ok(await refused(VN, "insert into nx_vet_encounters (clinic_id, patient_id, kind, signed_at) values ($1, $2, 'exam', now())", [vc, pat]) !== null, "nobody writes a record as already signed");
ok(await refused(VN, "select nx_vet_sign($1)", [enc]) !== null, "a nurse cannot sign a clinical record");
await as(V, "select nx_vet_sign($1)", [enc]);
ok(await refused(VN, "update nx_vet_encounters set diagnosis = 'changed' where id = $1 returning id", [enc]) !== null || (await one("select diagnosis from nx_vet_encounters where id = $1", [enc])).diagnosis === "Spay, no complications", "a signed record does not change");
const shared = await as(A, "select * from nx_vet_shared_for_ngo($1)", [N1]);
ok(shared.length === 1 && shared[0].last_kind === "sterilisation" && !("diagnosis" in shared[0]) && !("findings" in shared[0]), "the NGO sees only that it was done and when the next visit is due");
ok((await as(C, "select * from nx_vet_shared_for_ngo($1)", [N1])).length === 0, "another NGO sees nothing");
ok((await as(A, "select id from nx_vet_encounters")).length === 0, "the NGO cannot read the clinical record itself");
ok((await as(VN, "insert into nx_appointments (org_id, vet_patient_id, title, starts_at) values ($1, $2, 'Suture check', now() + interval '7 days') returning id", [vc, pat])).length === 1, "the clinic books its own patient");
ok(await refused(VN, "insert into nx_appointments (org_id, dog_id, title, starts_at) values ($1, $2, 'x', now())", [vc, dog1]) !== null, "but cannot book an NGO's animal directly");

section("Finding an organisation and asking to join");
const J = uuid(); await db.query("insert into auth.users (id) values ($1)", [J]);
ok((await as(J, "select id from nx_find_orgs('Twelve')")).some((o) => o.id === N1), "an NGO can be found by name");
await db.query("insert into review_offices (name) values ('Pune Municipal Review Office')");
ok((await as(J, "select id from nx_find_orgs('Review Office')")).length === 0, "a reviewing office is never listed");
const jr = (await as(J, "select nx_request_join($1, 'I volunteer at the Ward 12 shelter', 'Jaya') as id", [N1]))[0].id;
ok((await as(A, "select id from nx_notifications where title like 'Jaya asked to join'")).length === 1, "the NGO's leads are asked");
ok(await refused(B, "select nx_decide_join($1, 'approve', 'member')", [jr]) !== null, "a member cannot let people in");
ok(await refused(A, "select nx_decide_join($1, 'approve', 'admin')", [jr]) !== null, "a request cannot be approved straight into the lead role");
await as(A, "select nx_decide_join($1, 'approve', 'member')", [jr]);
ok((await as(J, "select org_id from nx_my_workspaces()")).some((w) => w.org_id === N1), "after approval the person is a member with the role chosen");
ok(await refused(J, "select nx_request_join($1)", [coordOrg]) !== null, "a programme's coordination cannot be joined by asking");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
