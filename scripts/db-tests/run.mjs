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
  "20261102132030_field_vaccination_receipts.sql", "20261103004523_offline_intake_and_lifecycle.sql", "20261106090000_kaju_model_usage_ledger.sql",
  "20261110230441_one_health_v2_1_core.sql", "20261110230655_one_health_v2_2_workflows.sql", "20261110230829_one_health_v2_3_programme_setup_grants.sql",
  "20261111100000_one_health_v2_4_network_alerts.sql", "20261111120000_one_health_v2_5_record_audit_fix.sql", "20261112140000_one_health_v2_6_referrals_revaccination_logos.sql",
  "20261115100000_rebuild_foundations.sql", "20261115110000_rebuild_kaju_in_channel.sql", "20261115120000_rebuild_kaju_missions.sql", "20261115130000_rebuild_people_studies_vet.sql",
  "20261116100000_rebuild_collaboration.sql", "20261116110000_rebuild_kaju_engine.sql", "20261116120000_rebuild_research_access.sql",
  "20261116130000_rebuild_saved_views.sql", "20261116140000_rebuild_automations_v2.sql",
  "20261116150000_rebuild_vet_clinics_and_joining.sql", "20261116160000_rebuild_bite_referral_link.sql",
  "20261116170000_rebuild_automation_rule_fixes.sql", "20261116180000_rebuild_automation_followup.sql",
  "20261117120000_rebuild_pep_reminder_validity.sql", "20261117130000_rebuild_quick_arv_operation.sql",
  "20261117140000_rebuild_automation_ack_carry.sql", "20261118100000_rebuild_automation_rule_counts.sql", "20261118110000_kaju_action_log.sql",
  "20261119090000_kaju_intelligence_layer.sql",
  "20261119120000_people_names.sql",
];

process.on("unhandledRejection", (e) => { console.error(`Test run stopped: ${e?.message ?? e}`); process.exit(1); });
const db = new PGlite();
await db.exec(readFileSync(join(here, "base.sql"), "utf8"));
/* Supabase grants every privilege on new tables and functions in public to anon, authenticated and service_role by
   default. Reproduce that before the Kaju intelligence migration, so its tests see the same privileges production would
   (a migration that forgets to revoke them must fail here). */
const SUPABASE_DEFAULTS = `alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  grant usage on schema public to service_role;`;
for (const m of MIGRATIONS) {
  if (m === "20261119090000_kaju_intelligence_layer.sql") await db.exec(SUPABASE_DEFAULTS);
  try { await db.exec(readFileSync(join(MIG, m), "utf8")); }
  catch (e) { console.error(`Migration failed: ${m}\n  ${e.message}`); process.exit(1); }
}
// Applying everything a second time must succeed too: every migration is safe to re-run.
for (const m of MIGRATIONS.slice(MIGRATIONS.indexOf("20261116100000_rebuild_collaboration.sql"))) {
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
/** Run SQL as the server's service role (used only for what the server alone may do). */
async function asService(sql, params = []) {
  await db.exec("set role service_role");
  try { return (await db.query(sql, params)).rows; } finally { await db.exec("reset role"); }
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
section("@Kaju proposes tasks from a channel; accepting twice creates nothing more");
{
  const notes = (await as(A, "insert into nx_channels (org_id, name, topic) values ($1, 'field-notes', 'Field notes') returning id", [N1]))[0].id;
  await as(A, "insert into nx_messages (channel_id, body, author_name) values ($1, 'We need to revisit the market dog tomorrow. Photos are still missing for the Ward 12 release.', 'Asha Admin')", [notes]);
  ok(await refused(C, "select nx_kaju_reply($1, 'tasks')", [notes]) !== null, "someone outside the channel cannot ask Kaju about it");
  const reply = (await as(B, "select nx_kaju_reply($1, 'tasks') as id", [notes]))[0].id;
  const msg = await one("select author_kind, proposal, body from nx_messages where id = $1", [reply]);
  const proposed = msg.proposal?.tasks ?? [];
  ok(msg.author_kind === "kaju" && proposed.length >= 2 && /Nothing is created until you accept/.test(msg.body), "Kaju answers in the channel, attributed, with the tasks quoted and nothing created");
  ok((await one("select count(*)::int n from nx_tasks where source_message_id = $1", [reply])).n === 0, "no task exists before someone accepts");
  const accept = () => as(B, "insert into nx_tasks (org_id, title, created_by, source_kind, source_message_id, channel_id) select $1, t, $2, 'kaju', $3, $4 from unnest($5::text[]) t on conflict (source_message_id, title) do nothing", [N1, B, reply, notes, proposed]);
  await accept(); await accept();
  ok((await one("select count(*)::int n from nx_tasks where source_message_id = $1", [reply])).n === proposed.length, "accepting the same proposal twice creates each task once");
}

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

section("Kaju missions: reject and cancel");
{
  // The same plan as above: step 2 (creating several tasks) waits for approval; step 3 would post in #general.
  const two = JSON.stringify(plan);
  const rj = (await as(A, "select nx_mission_start($1, 'Rejected mission', '{}', $2, 'reject-1') as id", [N1, two]))[0].id;
  const rs = await one("select id, state from nx_mission_steps where mission_id = $1 and position = 2", [rj]);
  ok(rs.state === "waiting_approval", "creating several tasks waits for approval");
  ok(await refused(B, "select nx_mission_decide($1, 'reject')", [rs.id]) !== null, "only the owner can reject a step");
  ok((await as(A, "select nx_mission_decide($1, 'reject', null, 'Not now') as s", [rs.id]))[0].s === "cancelled", "rejecting a step cancels the mission");
  const after = await as(A, "select position, state from nx_mission_steps where mission_id = $1 order by position", [rj]);
  ok(after[1].state === "skipped" && after[2].state === "cancelled", "the rejected step is skipped and nothing after it runs");
  ok((await one("select count(*)::int n from nx_tasks where mission_id = $1", [rj])).n === 0, "a rejected step created nothing");
  ok((await as(A, "select kind from nx_mission_events where mission_id = $1", [rj])).some((e) => e.kind === "rejected"), "the trace records who rejected it");
  ok(await refused(A, "select nx_mission_decide($1, 'approve')", [rs.id]) !== null, "a rejected step cannot be approved afterwards");

  const cm = (await as(A, "select nx_mission_start($1, 'Cancelled mission', '{}', $2, 'cancel-1') as id", [N1, two]))[0].id;
  ok(await refused(B, "select nx_mission_cancel($1)", [cm]) !== null, "only the owner can cancel a mission");
  await as(A, "select nx_mission_cancel($1)", [cm]);
  ok((await one("select state from nx_missions where id = $1", [cm])).state === "cancelled", "cancelling stops the mission");
  ok((await as(A, "select state from nx_mission_steps where mission_id = $1 and position > 1", [cm])).every((x) => x.state === "cancelled"), "every step not yet done is cancelled");
  ok(await refused(A, "select nx_mission_cancel($1)", [cm]) !== null, "a cancelled mission cannot be cancelled twice");
  await db.query("select nx_mission_tick()");
  ok((await one("select count(*)::int n from nx_tasks where mission_id = $1", [cm])).n === 0, "the schedule runs nothing from a cancelled mission");
}

section("Kaju missions: a passed deadline");
{
  // A mission still waiting for approval when its deadline passes: the owner hears once, and the trace says so.
  const dl = (await as(A, "select nx_mission_start($1, 'Ward 12 follow-ups by Friday', '{}', $2, 'deadline-1', null, now() + interval '1 hour') as id", [N1, JSON.stringify(plan)]))[0].id;
  ok((await one("select state from nx_missions where id = $1", [dl])).state === "waiting_person", "the mission waits for approval");
  await db.query("select nx_mission_tick()");
  ok((await as(A, "select id from nx_notifications where title = 'Past its deadline: Ward 12 follow-ups by Friday'")).length === 0, "nothing is said before the deadline");
  await db.query("update nx_missions set deadline = now() - interval '1 minute' where id = $1", [dl]);
  await db.query("select nx_mission_tick()");
  await db.query("select nx_mission_tick()");
  ok((await as(A, "select id from nx_notifications where title = 'Past its deadline: Ward 12 follow-ups by Friday'")).length === 1, "the owner is told once that the deadline passed");
  ok((await as(B, "select id from nx_notifications where title like 'Past its deadline%'")).length === 0, "nobody else is told");
  ok((await as(A, "select kind from nx_mission_events where mission_id = $1", [dl])).some((e) => e.kind === "deadline"), "the trace records the missed deadline");
  ok((await one("select state from nx_missions where id = $1", [dl])).state === "waiting_person", "the mission keeps waiting for the person; nothing runs by itself");
  await as(A, "select nx_mission_cancel($1)", [dl]);
}

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
// The dose rules count by the date in India, so the schedule is seeded on that date too. Seeding on UTC
// current_date made these checks fail every evening from 18:30 to 24:00 UTC, when India is a day ahead.
const indiaToday = "(now() at time zone 'Asia/Kolkata')::date";
const clinic = (await one("insert into oh_organisations (kind, name, short_name) values ('clinic', 'Ward 12 Health Centre', 'W12 HC') returning id")).id;
const nurse = uuid(); await db.query("insert into auth.users (id) values ($1)", [nurse]);
await db.query("insert into oh_members (organisation_id, user_id, role) values ($1, $2, 'lead'), ($1, $3, 'nurse')", [clinic, P, nurse]);
const ex1 = (await one(`insert into health.exposures (facility_id, code, exposure_on, presented_on, exposure_kind, reminder_consent, contact_phone) values ($1, 'B-1', ${indiaToday} - 3, ${indiaToday} - 3, 'bite', true, '+91 98450 00001') returning id`, [clinic])).id;
const ex2 = (await one(`insert into health.exposures (facility_id, code, exposure_on, presented_on, exposure_kind, reminder_consent, contact_phone) values ($1, 'B-2', ${indiaToday} - 3, ${indiaToday} - 3, 'bite', false, null) returning id`, [clinic])).id;
for (const [ex, d] of [[ex1, 0], [ex2, 0], [ex2, -2]]) {
  const course = (await one("insert into health.pep_courses (exposure_id, regimen, prescribed_by) values ($1, 'Essen 4-dose IM', $2) on conflict (exposure_id) do update set regimen = excluded.regimen returning id", [ex, P])).id;
  await db.query(`insert into health.pep_doses (course_id, dose_no, due_on) values ($1, (select coalesce(max(dose_no), 0) + 1 from health.pep_doses where course_id = $1), ${indiaToday} + $2::int)`, [course, d]);
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

section("PEP reminders: sent only while they still hold, retried, then given up");
{
  // The delivery worker runs as the service role: these calls are made without a signed-in user.
  const svc = async (sql, params = []) => (await db.query(sql, params)).rows;
  const offered = async () => (await svc("select id from nx_pep_outbox_due(50)")).map((x) => x.id);
  const state = (id) => one("select status, attempts, last_error, round(extract(epoch from next_attempt_at - now()) / 60)::int as wait from health.reminder_outbox where id = $1", [id]);
  ok(await refused(nurse, "select * from nx_pep_outbox_due(50)") !== null, "staff cannot read the delivery queue, which holds full numbers");
  ok(await refused(nurse, "select nx_pep_outbox_mark(gen_random_uuid(), 'sent')") !== null, "staff cannot mark a reminder as sent");

  const r1 = (await one("select id from health.reminder_outbox where facility_id = $1", [clinic])).id;
  ok((await offered()).includes(r1), "the worker is given the queued reminder");
  await svc("select nx_pep_outbox_mark($1, 'retry', 'Provider timeout')", [r1]);
  let s = await state(r1);
  ok(s.status === "queued" && s.attempts === 1 && s.last_error === "Provider timeout" && s.wait === 2, "a failed send is kept with its reason and waits two minutes");
  ok(!(await offered()).includes(r1), "it is not offered again before then");
  await svc("update health.reminder_outbox set next_attempt_at = now() where id = $1", [r1]);
  ok((await offered()).includes(r1), "it is offered again when the wait is over");
  await svc("select nx_pep_outbox_mark($1, 'retry', 'Provider timeout')", [r1]);
  ok((await state(r1)).wait === 4, "each later failure waits twice as long");
  await svc("update health.reminder_outbox set attempts = 8, next_attempt_at = now() where id = $1", [r1]);
  await svc("select nx_pep_outbox_mark($1, 'retry', 'Provider timeout')", [r1]);
  ok((await state(r1)).wait === 60, "the wait never exceeds an hour");
  await svc("update health.reminder_outbox set next_attempt_at = now() where id = $1", [r1]);
  await svc("select nx_pep_outbox_mark($1, 'failed', 'Provider timeout')", [r1]);
  ok((await state(r1)).status === "failed" && !(await offered()).includes(r1), "once the worker gives up, the reminder is never offered again");

  // Reminders that stop holding between the morning queue and the send.
  const exp = async (code, phone) => (await one(`insert into health.exposures (facility_id, code, exposure_on, presented_on, exposure_kind, reminder_consent, contact_phone) values ($1, $2, ${indiaToday} - 3, ${indiaToday} - 3, 'bite', true, $3) returning id`, [clinic, code, phone])).id;
  const course = async (ex) => (await one("insert into health.pep_courses (exposure_id, regimen, prescribed_by) values ($1, 'Essen 4-dose IM', $2) returning id", [ex, P])).id;
  const dose = async (c, no, offset) => (await one(`insert into health.pep_doses (course_id, dose_no, due_on) values ($1, $2, ${indiaToday} + $3::int) returning id`, [c, no, offset])).id;
  const queue = async (d, phone, saysOffset) => (await one(`insert into health.reminder_outbox (facility_id, dose_id, for_day, phone, body, vars) values ($1, $2, ${indiaToday}, $3, 'Reminder', jsonb_build_array('W12 HC', '1', to_char(${indiaToday} + $4::int, 'DD Mon'))) returning id`, [clinic, d, phone, saysOffset])).id;
  const ph = "+91 98450 00003";
  const c3 = await course(await exp("B-3", ph));
  const ok1 = await queue(await dose(c3, 1, 0), ph, 0);
  const givenDose = await dose(c3, 2, 0); const given = await queue(givenDose, ph, 0);
  const late = await queue(await dose(c3, 3, -1), ph, -1);
  const moved = await queue(await dose(c3, 4, 1), ph, 0);
  const oldNumber = await queue(await dose(c3, 5, 0), "+91 98450 09999", 0);
  await db.query(`update health.pep_doses set status = 'given', given_on = ${indiaToday} where id = $1`, [givenDose]);
  const ex4 = await exp("B-4", "+91 98450 00004");
  const withdrawn = await queue(await dose(await course(ex4), 1, 0), "+91 98450 00004", 0);
  await db.query("update health.exposures set reminder_consent = false, contact_phone = null where id = $1", [ex4]);
  const c5 = await course(await exp("B-5", "+91 98450 00005"));
  const stopped = await queue(await dose(c5, 1, 0), "+91 98450 00005", 0);
  await db.query("update health.pep_courses set status = 'discontinued' where id = $1", [c5]);

  const now = await offered();
  ok(now.includes(ok1), "a reminder that still holds is sent");
  const why = async (id) => { const r = await state(id); return r.status === "cancelled" ? r.last_error : `still ${r.status}`; };
  ok((await why(given)) === "Not sent: the dose is no longer due.", "not sent once the dose is recorded as given");
  ok((await why(late)) === "Not sent: the dose date has passed.", "not sent after the dose date");
  ok((await why(moved)) === "Not sent: the clinician moved the dose date.", "not sent with a date the clinician has since moved");
  ok((await why(oldNumber)) === "Not sent: the patient's number changed.", "not sent to a number the patient has replaced");
  ok((await why(withdrawn)) === "Not sent: the patient withdrew consent to reminders.", "not sent after the patient withdraws consent");
  ok((await why(stopped)) === "Not sent: the course is no longer active.", "not sent after the clinician stops the course");
  ok(![given, late, moved, oldNumber, withdrawn, stopped].some((id) => now.includes(id)), "none of them reaches the worker");
  const seen = await as(nurse, "select status, last_error, phone_masked from nx_pep_reminders($1)", [clinic]);
  ok(seen.filter((r) => r.status === "cancelled").length === 6 && seen.every((r) => r.phone_masked.startsWith("••••")), "staff see each one that was not sent, and why, with the number still masked");

  await svc("select nx_pep_outbox_mark($1, 'not_connected', 'No approved SMS reminder template is configured.')", [ok1]);
  ok((await state(ok1)).attempts === 0 && !(await offered()).includes(ok1), "a reminder with no connected account is recorded, not counted as an attempt, and not retried");
  await svc("update health.reminder_outbox set status = 'queued' where id = $1", [ok1]);
  await svc("select nx_pep_outbox_mark($1, 'sent', null, 'msg-1')", [ok1]);
  ok((await state(ok1)).status === "sent" && !(await offered()).includes(ok1), "a sent reminder is never sent twice");
}

section("Automation rules count the right things");
{
  // services_stale: every confirmation is a new row; only each service's latest one counts.
  await db.query(`insert into oh_service_status (organisation_id, service, status, verified_by, verified_by_name, verified_at, valid_until) values
    ($1, 'arv', 'available', $2, 'Priya', now() - interval '20 days', now() - interval '13 days'),
    ($1, 'arv', 'available', $2, 'Priya', now() - interval '1 hour', now() + interval '6 days'),
    ($1, 'rig', 'limited', $2, 'Priya', now() - interval '20 days', now() - interval '13 days')`, [clinic, P]);
  const st = (await as(P, "select nx_automation_save($1, 'services_stale', 'Stale services', 'day', '{\"days\":7}', 'clinical') as id", [clinic]))[0].id;
  ok((await as(P, "select nx_automation_run($1, false) as r", [st]))[0].r.found === 1, "a service confirmed today is not stale because of an older confirmation; one never reconfirmed is");

  // training_due: finished courses are not due, and the person who has to do it is told.
  const course = (await one("insert into training_courses (ngo_id, title) values ($1, 'Safe handling') returning id", [N1])).id;
  const [l1, l2] = [(await one("insert into training_lessons (course_id, title) values ($1, 'One') returning id", [course])).id, (await one("insert into training_lessons (course_id, title) values ($1, 'Two') returning id", [course])).id];
  const done = uuid(); await db.query("insert into auth.users (id) values ($1)", [done]); await db.query("insert into ngo_members (ngo_id, user_id, role) values ($1, $2, 'member')", [N1, done]);
  await db.query("insert into training_assignments (course_id, ngo_id, user_id, assigned_by, due_on) values ($1, $2, $3, $5, current_date + 1), ($1, $2, $4, $5, current_date + 1)", [course, N1, B, done, A]);
  await db.query("insert into training_progress (lesson_id, course_id, user_id, ngo_id) values ($1, $3, $4, $5), ($1, $3, $6, $5), ($2, $3, $6, $5)", [l1, l2, course, B, N1, done]);
  const tr = (await as(A, "select nx_automation_save($1, 'training_due', 'Training due', 'day', '{\"days\":3}') as id", [N1]))[0].id;
  ok((await as(A, "select nx_automation_run($1, false) as r", [tr]))[0].r.found === 1, "a course someone has finished is not counted as due");
  ok((await as(B, "select id from nx_notifications where title = 'Training is due for you'")).length === 1, "the person with unfinished training is told");
  ok((await as(done, "select id from nx_notifications where title = 'Training is due for you'")).length === 0, "the person who finished is not");

  // referrals_waiting: patients referred to the facility and not yet marked arrived are counted, never named.
  const sender = (await one("insert into oh_organisations (kind, name) values ('clinic', 'Ward 3 Health Centre') returning id")).id;
  const rex = (await one("insert into health.exposures (facility_id, code, exposure_on, presented_on, exposure_kind, patient_ref) values ($1, 'R-77', current_date - 3, current_date - 3, 'bite', 'PATIENT-REF-77') returning id", [sender])).id;
  await db.query("insert into health.transfers (exposure_id, from_org, to_org, service, sent_at) values ($1, $2, $3, 'rig', now() - interval '2 days')", [rex, sender, clinic]);
  const rw = (await as(P, "select nx_automation_save($1, 'referrals_waiting', 'Referrals waiting', 'day', '{\"hours\":24}', 'clinical') as id", [clinic]))[0].id;
  const rr = (await as(P, "select nx_automation_run($1, false) as r", [rw]))[0].r;
  ok(rr.found >= 1 && /1 patient referral not yet marked arrived/.test(rr.summary), "a patient referred here and not yet arrived is counted");
  ok(!/R-77|PATIENT-REF-77/.test(JSON.stringify(rr)) && (await as(nurse, "select body from nx_notifications where title = 'Referrals waiting'")).every((x) => !/R-77|PATIENT/.test(x.body ?? "")), "the notice names no patient");

  // alerts_open on the schedule: nobody is signed in, so it reads with the access of the person who turned it on.
  const al = (await as(P, "select nx_automation_save($1, 'alerts_open', 'Signals to review', 'day') as id", [coordOrg]))[0].id;
  const byHand = (await as(P, "select nx_automation_run($1, true) as r", [al]))[0].r;
  await db.query("update nx_automations set status = 'paused' where id <> $1", [al]);
  await db.query("update nx_automations set last_run_at = null where id = $1", [al]);
  await db.query("select set_config('request.jwt.claims', '', false)");
  await db.query("select nx_automations_tick()");
  const sched = await one("select status, found, error from nx_automation_runs where automation_id = $1 and dedupe_key not like '%:now:%'", [al]);
  ok(sched && sched.status !== "failed", `a scheduled signals check runs with nobody signed in (${sched?.status} ${sched?.error ?? ""})`);
  ok(sched && (sched.found ?? 0) === (byHand.found ?? 0), "and finds what the coordinator's own run found");
  await db.query("update nx_automations set status = 'active'");
}

section("Automations follow up: acknowledgement, escalation and closure");
{
  const nextSecond = () => new Promise((r) => setTimeout(r, 1100)); // two "Run now" in one second are one run (double-click guard)
  const dup = (await one("insert into dogs (ngo_id, name, identity_state) values ($1, 'Brownie', 'possible_duplicate') returning id", [N1])).id;
  const fa = (await as(A, "select nx_automation_save($1, 'possible_duplicates', 'Possible duplicates', 'day', '{\"escalate_hours\":2}') as id", [N1]))[0].id;
  const r1 = (await as(A, "select nx_automation_run($1, true) as r", [fa]))[0].r;
  const run1 = await one("select id, open_since, resolved_at, acknowledged_at from nx_automation_runs where automation_id = $1 and status = 'succeeded' order by finished_at desc limit 1", [fa]);
  ok(r1.found === 1 && run1.open_since && !run1.resolved_at && !run1.acknowledged_at, "a run that tells people opens a follow-up");
  const nudges = async (who) => (await as(who, "select id from nx_notifications where title = 'Not picked up: Possible duplicates'")).length;

  // Nobody acknowledges it within the rule's hours: the schedule tells the admins and leads, once.
  await db.query("update nx_automations set status = 'paused' where id <> $1", [fa]);
  await db.query("update nx_automation_runs set open_since = now() - interval '3 hours' where id = $1", [run1.id]);
  await db.query("select set_config('request.jwt.claims', '', false)");
  await db.query("select nx_automations_tick()");
  ok((await one("select escalated_at from nx_automation_runs where id = $1", [run1.id])).escalated_at !== null, "a follow-up nobody picked up is escalated by the schedule");
  ok(await nudges(A) === 1 && await nudges(B) === 0, "the admin is told it was not picked up; a member who does not lead is not");
  await db.query("select nx_automations_tick()");
  ok(await nudges(A) === 1, "it is escalated once, not every hour");

  // A member says what is being done; someone outside cannot.
  ok(await refused(C, "select nx_automation_ack($1, 'Not mine')", [run1.id]) !== null, "another organisation cannot acknowledge it");
  ok(await refused(B, "select nx_automation_ack($1, 'ok')", [run1.id]) !== null, "an acknowledgement must say what is being done");
  await as(B, "select nx_automation_ack($1, 'Checking both records against the photos')", [run1.id]);
  const ack = await one("select acknowledged_by, outcome, resolved_at from nx_automation_runs where id = $1", [run1.id]);
  ok(ack.acknowledged_by === B && ack.outcome.startsWith("Checking") && ack.resolved_at === null, "the acknowledgement keeps who, when and what, and leaves it open");

  // Still found on the next run: the old run is carried into the new one, which keeps who is handling it, what they
  // said and when it first opened. (It used to start unacknowledged, so it showed as not picked up and was raised with
  // the leads again.)
  await nextSecond(); await as(A, "select nx_automation_run($1, true)", [fa]);
  const runs = await db.query("select id, resolved_note, acknowledged_by, outcome, open_since < now() - interval '2 hours' as old from nx_automation_runs where automation_id = $1 and status = 'succeeded' order by finished_at", [fa]);
  ok(runs.rows.length === 2 && runs.rows[0].resolved_note === "Carried into a later run", "a later run carries the earlier follow-up");
  ok(runs.rows[1].acknowledged_by === B && runs.rows[1].outcome.startsWith("Checking") && runs.rows[1].old, "and keeps its acknowledgement and its first open time");
  const before = await nudges(A);
  await db.query("update nx_automation_runs set open_since = now() - interval '30 hours', escalated_at = null where id = $1", [runs.rows[1].id]);
  await db.query("select nx_automations_tick()");
  ok(await nudges(A) === before, "an acknowledged follow-up carried into a later run is not raised with the leads again");

  // Unacknowledged and still found: the clock and the escalation carry, so a daily rule cannot restart the wait.
  await db.query("update nx_automation_runs set acknowledged_by = null, acknowledged_at = null, outcome = null, open_since = now() - interval '5 hours', escalated_at = now() - interval '1 hour' where id = $1", [runs.rows[1].id]);
  await nextSecond(); await as(A, "select nx_automation_run($1, true)", [fa]);
  const carried = await one("select open_since < now() - interval '4 hours' as old, escalated_at is not null as esc from nx_automation_runs where automation_id = $1 and status = 'succeeded' and resolved_at is null", [fa]);
  ok(carried.old && carried.esc, "an unacknowledged follow-up keeps its clock and its escalation into the next run");
  await db.query("select nx_automations_tick()");
  ok(await nudges(A) === 1, "and is not escalated a second time");

  // The duplicate is resolved: the next run finds nothing and closes what was open.
  await db.query("update dogs set identity_state = 'confirmed' where id = $1", [dup]);
  await nextSecond(); await as(A, "select nx_automation_run($1, true)", [fa]);
  ok((await one("select count(*)::int n from nx_automation_runs where automation_id = $1 and status = 'succeeded' and resolved_at is null", [fa])).n === 0, "a run that finds nothing closes the open follow-up");

  // Closing by hand, with the reason; and escalation turned off.
  await db.query("update dogs set identity_state = 'possible_duplicate' where id = $1", [dup]);
  await as(A, "select nx_automation_save($1, 'possible_duplicates', 'Possible duplicates', 'day', '{\"escalate_hours\":0}')", [N1]);
  await nextSecond(); await as(A, "select nx_automation_run($1, true)", [fa]);
  const open = await one("select id from nx_automation_runs where automation_id = $1 and status = 'succeeded' and resolved_at is null", [fa]);
  await db.query("update nx_automation_runs set open_since = now() - interval '48 hours' where id = $1", [open.id]);
  await db.query("select nx_automations_tick()");
  ok((await one("select escalated_at from nx_automation_runs where id = $1", [open.id])).escalated_at === null, "with escalation off, nothing is escalated");
  await as(A, "select nx_automation_ack($1, 'Same dog; records already linked by hand', true)", [open.id]);
  const closed = await one("select resolved_at, resolved_note from nx_automation_runs where id = $1", [open.id]);
  ok(closed.resolved_at !== null && /^Closed by /.test(closed.resolved_note), "a member can close it with the reason, named");
  ok(await refused(A, "select nx_automation_ack($1, 'again')", [open.id]) !== null, "a closed follow-up cannot be acknowledged again");
  // A malformed escalation setting cannot stop the schedule for everyone.
  await db.query("update nx_automations set params = params || '{\"escalate_hours\":\"soon\"}' where id = $1", [fa]);
  ok(await db.query("select nx_automations_tick()").then(() => true, () => false), "a malformed escalation setting does not stop the schedule");
  await db.query("update nx_automations set status = 'active'");
}

section("A bite recorded from a referral");
{
  const centre = (await one("insert into oh_organisations (kind, name) values ('clinic', 'Ward 9 Health Centre') returning id")).id;
  const hospital = (await one("insert into oh_organisations (kind, name) values ('hospital', 'District Hospital') returning id")).id;
  const other = (await one("insert into oh_organisations (kind, name) values ('hospital', 'Other Hospital') returning id")).id;
  const doc = uuid(), outsider = uuid();
  await db.query("insert into auth.users (id) values ($1), ($2)", [doc, outsider]);
  await db.query("insert into oh_members (organisation_id, user_id, role) values ($1, $2, 'clinician'), ($3, $4, 'clinician')", [hospital, doc, other, outsider]);
  const first = (await one("insert into health.exposures (facility_id, code, exposure_on, presented_on, exposure_kind) values ($1, 'C-1', current_date - 1, current_date - 1, 'bite') returning id", [centre])).id;
  const tr = (await one("insert into health.transfers (exposure_id, from_org, to_org, service) values ($1, $2, $3, 'rig') returning id", [first, centre, hospital])).id;
  const args = "($1, current_date - 1, 'bite', null, 'not_recorded', 'not_recorded', null, 'dog', 'unknown', null, null, 'not_recorded', 'walk_in', null, null, false, false, 'not_recorded', $2)";
  ok(await refused(outsider, `select public.oh_record_exposure${args}`, [other, tr]) !== null, "a hospital the person was not referred to cannot claim the referral");
  const rec = (await as(doc, `select public.oh_record_exposure${args} as r`, [hospital, tr]))[0].r;
  ok(rec.transfer_id === tr, "the receiving hospital records the bite with the referral it came from");
  const row = await one("select e.transfer_id, e.source, t.status from health.exposures e join health.transfers t on t.id = e.transfer_id where e.id = $1", [rec.id]);
  ok(row?.source === "referral" && row?.status === "arrived", "the bite is marked as from a referral and the referral as arrived");
  ok(await refused(doc, `select public.oh_record_exposure${args}`, [hospital, tr]) !== null, "a second bite cannot be recorded for the same referral");
  const plain = (await as(doc, "select public.oh_record_exposure($1, current_date, 'scratch', null) as r", [hospital]))[0].r;
  ok(!!plain.id && plain.transfer_id === null, "a walk-in bite is recorded as before, without a referral");
}

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

section("Kaju Voice session grants (preview migration, then the production access migration, re-run)");
{
  const T = uuid(), U = uuid(), E = uuid();
  await db.query("insert into auth.users (id, email, email_confirmed_at) values ($1, 'tester@example.invalid', now()), ($2, 'other@example.invalid', now()), ($3, 'unconfirmed@example.invalid', null)", [T, U, E]);
  await db.exec(readFileSync(join(MIG, "20261115145414_kaju_voice_preview_sessions.sql"), "utf8"));
  await db.query("insert into public.kaju_voice_testers (email) values ('tester@example.invalid'), ('unconfirmed@example.invalid')");
  for (let i = 0; i < 2; i++) await db.exec(readFileSync(join(MIG, "20261117100000_kaju_voice_access.sql"), "utf8"));
  const granted = (await db.query("select user_id from public.kaju_voice_access")).rows.map((r) => r.user_id);
  ok(granted.length === 1 && granted[0] === T, "only the confirmed preview tester is carried over, by account ID");
  ok((await one("select to_regclass('public.kaju_voice_testers') as t")).t === null, "the email list is retired");
  ok(await refused(T, "select user_id from public.kaju_voice_access") !== null, "nobody signed in can read the access list");
  ok(await refused(U, "insert into public.kaju_voice_access (user_id) values ($1)", [U]) !== null, "nobody signed in can grant themselves voice");
  ok((await refused(U, "select public.kaju_voice_reserve(3)"))?.includes("VOICE_ACCESS_DENIED"), "an account without access cannot reserve a session");
  ok((await refused(E, "select public.kaju_voice_reserve(3)"))?.includes("VOICE_ACCESS_DENIED"), "an unconfirmed email on the old list gets no access");
  await db.exec("set role anon");
  let anonRefused = false; try { await db.query("select public.kaju_voice_reserve(3)"); } catch { anonRefused = true; } finally { await db.exec("reset role"); }
  ok(anonRefused, "signed-out callers cannot call the voice RPCs");
  const s1 = (await as(T, "select public.kaju_voice_reserve(3) as id"))[0].id;
  ok(!!s1, "the tester reserves a session");
  ok(await refused(T, "insert into public.kaju_voice_sessions (user_id, scope_id, agent_version) values ($1, $1, 3)", [T]) !== null, "sessions cannot be written directly");
  ok(await refused(T, "update public.kaju_voice_sessions set status = 'issued' where id = $1", [s1]) !== null, "sessions cannot be updated directly");
  ok((await as(T, "select public.kaju_voice_update($1, 'issued', 'ref-1') as ok", [s1]))[0].ok === true, "the server marks the grant issued with the provider reference");
  await db.query("insert into public.kaju_voice_access (user_id) values ($1)", [U]);
  ok((await as(U, "select public.kaju_voice_update(null, 'client_connected', 'ref-1', '{\"audioSent\":true}') as ok"))[0].ok === false, "another account cannot report on the tester's session");
  ok((await as(T, "select public.kaju_voice_update(null, 'client_connected', 'ref-1', '{\"audioSent\":true,\"audioReceived\":true}') as ok"))[0].ok === true, "the tester's client reports the connection");
  ok((await as(T, "select public.kaju_voice_update(null, 'client_ended', 'ref-1', '{\"interrupted\":true}') as ok"))[0].ok === true, "and its end");
  const row = (await as(T, "select status, connected_at, ended_at, client_audio_sent, client_audio_received, client_interrupted from public.kaju_voice_sessions where id = $1", [s1]))[0];
  ok(row?.status === "issued" && row.connected_at && row.ended_at && row.client_audio_sent && row.client_audio_received && row.client_interrupted, "the session row holds times and client observations only");
  ok((await as(U, "select id from public.kaju_voice_sessions")).length === 0, "an account sees only its own sessions");
  for (let i = 0; i < 4; i++) await as(T, "select public.kaju_voice_reserve(3)");
  ok((await refused(T, "select public.kaju_voice_reserve(3)"))?.includes("VOICE_LIMIT"), "a sixth start within a minute is refused");
  await db.query("delete from auth.users where id = $1", [T]);
  ok((await one("select count(*)::int as n from public.kaju_voice_sessions where user_id = $1", [T])).n === 0 && (await one("select count(*)::int as n from public.kaju_voice_access where user_id = $1", [T])).n === 0, "deleting an account deletes its voice access and sessions");
}

section("Kaju Voice public conversations (no account; server service role only)");
{
  for (let i = 0; i < 2; i++) await db.exec(readFileSync(join(MIG, "20261117110000_kaju_voice_public_sessions.sql"), "utf8"));
  const S = uuid(); await db.query("insert into auth.users (id, email, email_confirmed_at) values ($1, 'staff@example.invalid', now())", [S]);
  await db.query("insert into public.kaju_voice_access (user_id) values ($1)", [S]);
  const asRole = async (role, sql, params = []) => { await db.exec(`set role ${role}`); try { return (await db.query(sql, params)).rows; } finally { await db.exec("reset role"); } };
  const deniedFor = async (role, sql, params = []) => { try { await asRole(role, sql, params); return false; } catch { return true; } };
  ok(await deniedFor("anon", "select public.kaju_voice_public_reserve(1)"), "signed-out callers cannot start a public conversation directly");
  ok(await refused(S, "select public.kaju_voice_public_reserve(1)") !== null, "signed-in callers cannot either");
  const P1 = (await asRole("service_role", "select public.kaju_voice_public_reserve(1) as id"))[0].id;
  const row = await one("select user_id, scope_kind, scope_id, status from public.kaju_voice_sessions where id = $1", [P1]);
  ok(row.user_id === null && row.scope_kind === "public" && row.scope_id === P1 && row.status === "reserved", "the server reserves a public row with no account");
  ok(await refused(S, "select public.kaju_voice_public_update($1, 'claim')", [P1]) !== null, "nobody signed in can advance a public conversation");
  ok((await asRole("service_role", "select public.kaju_voice_public_update($1, 'claim') as ok", [P1]))[0].ok === true, "its token claims one provider session");
  ok((await asRole("service_role", "select public.kaju_voice_public_update($1, 'claim') as ok", [P1]))[0].ok === false, "and only one: a replayed token signs nothing more");
  ok((await asRole("service_role", "select public.kaju_voice_public_update($1, 'issued', 'pub-ref') as ok", [P1]))[0].ok === true, "the signed session is recorded with its reference");
  ok((await asRole("service_role", "select public.kaju_voice_public_update($1, 'client_ended', 'other-ref') as ok", [P1]))[0].ok === false, "a report must name the conversation's own reference");
  ok((await asRole("service_role", "select public.kaju_voice_public_update($1, 'client_ended', 'pub-ref', '{\"audioReceived\":true}') as ok", [P1]))[0].ok === true, "the end is recorded");
  ok((await as(S, "select id from public.kaju_voice_sessions where id = $1", [P1])).length === 0, "a public conversation is invisible to signed-in people");
  ok((await as(S, "select public.kaju_voice_update(null, 'client_connected', 'pub-ref') as ok"))[0].ok === false, "a staff account cannot report on a public conversation");
  const P2 = (await asRole("service_role", "select public.kaju_voice_public_reserve(1) as id"))[0].id;
  await db.query("update public.kaju_voice_sessions set created_at = now() - interval '6 minutes' where id = $1", [P2]);
  ok((await asRole("service_role", "select public.kaju_voice_public_update($1, 'claim') as ok", [P2]))[0].ok === false, "an old reservation cannot be claimed");
  let mixed = false; try { await db.query("insert into public.kaju_voice_sessions (user_id, scope_kind, scope_id, agent_version) values (null, 'standalone', gen_random_uuid(), 1)"); } catch { mixed = true; }
  ok(mixed, "a staff session always has an account; a public one never does");
}

section("Field vaccinations: the quick ARV form and the lifecycle form each record one operation and one medical record");
{
  // A separate organisation, so no other check's counts move.
  const FN = (await one("insert into ngos (name) values ('Field Vaccination Trust') returning id")).id;
  const FW = uuid(), FC = uuid();
  for (const [id, name] of [[FW, "Farid Field"], [FC, "Fatima Coordinator"]]) await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [id, `${id}@example.invalid`, { display_name: name }]);
  await db.query("insert into ngo_members (ngo_id, user_id, role) values ($1, $2, 'member'), ($1, $3, 'coordinator')", [FN, FW, FC]);
  const animal = async () => { const d = (await one("insert into dogs (ngo_id, name) values ($1, 'Field dog') returning id", [FN])).id; const c = (await one("insert into cases (ngo_id, dog_id, title) values ($1, $2, 'Vaccination') returning id", [FN, d])).id; return { d, c }; };
  const counts = async (c) => one("select (select count(*)::int from animal_operation_events where case_id = $1 and kind = 'vaccination') as ops, (select count(*)::int from medical_events where case_id = $1 and kind = 'vaccination') as med, (select count(*)::int from animal_operation_events e join medical_events m on m.id = e.medical_event_id where e.case_id = $1) as linked", [c]);
  const today = (await one(`select ${indiaToday} as d`)).d;
  const day = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d));
  const arv = (d, extra = {}) => ({ template: "arv-field-v1", dogId: d, eventDate: day(today), vaccine: "ARV (sample)", batch: "B-1", performedBy: "Field team", location: "Ward 12 market", ...extra });

  // The quick form: one medical record and the operation a contract can require, linked to it.
  const q = await animal(); const req = uuid();
  const r1 = (await as(FW, "select field_confirm_vaccination($1, $2, $3) as r", [req, q.c, arv(q.d)]))[0].r;
  let n = await counts(q.c);
  ok(n.med === 1 && n.ops === 1 && n.linked === 1, "the quick ARV form records one medical record and one vaccination operation, linked");
  ok(r1.operation_event_id && !r1.replayed, "its answer names the operation it recorded");
  const op = await one("select payload, (occurred_at at time zone 'Asia/Kolkata')::date = $2::date as same_day, actor_name from animal_operation_events where case_id = $1", [q.c, day(today)]);
  ok(op.payload.vaccine === "ARV (sample)" && op.payload.batch === "B-1" && op.payload.performedBy === "Field team" && op.payload.facility === "Ward 12 market" && op.payload.notes, "the operation carries the vaccine, batch, vaccinator and place, with a note");
  ok(op.same_day && op.actor_name === "Farid Field", "it is dated on the vaccination day and attributed to the person who sent it");
  const r2 = (await as(FW, "select field_confirm_vaccination($1, $2, $3) as r", [req, q.c, arv(q.d)]))[0].r;
  n = await counts(q.c);
  ok(r2.replayed === true && n.med === 1 && n.ops === 1, "sending the same request again records nothing more");
  ok(await refused(FW, "select field_confirm_vaccination($1, $2, $3)", [req, q.c, arv(q.d, { batch: "B-2" })]) !== null, "the same request with different content is refused");
  const past = await animal();
  await as(FW, "select field_confirm_vaccination($1, $2, $3)", [uuid(), past.c, arv(past.d, { eventDate: day(new Date(Date.parse(day(today)) - 3 * 86400000)) })]);
  ok((await one("select (occurred_at at time zone 'Asia/Kolkata')::date = $2::date - 3 as ok from animal_operation_events where case_id = $1", [past.c, day(today)])).ok, "a vaccination entered for an earlier day is dated that day");

  // The lifecycle form: still exactly one operation (its own) and one medical record.
  const l = await animal();
  await as(FW, "select operations_record_event($1, $2, 'vaccination', $3, null)", [uuid(), l.c, { template: "lifecycle-v1", occurredAt: new Date().toISOString(), performedBy: "Field team", facility: "Ward 12 market", vaccine: "ARV (sample)", batch: "B-3", notes: "No reaction." }]);
  n = await counts(l.c);
  ok(n.med === 1 && n.ops === 1 && n.linked === 1, "the lifecycle form still records one operation and one medical record, linked");
  ok((await one("select payload->>'template' as t from animal_operation_events where case_id = $1", [l.c])).t === "lifecycle-v1", "and the operation is the lifecycle form's own");
  ok((await one("select current_setting('straypaw.lifecycle_request', true) as v")).v ? false : true, "the lifecycle form's mark does not outlive its call");

  // Nobody outside the organisation records against its animals.
  ok(await refused(C, "select field_confirm_vaccination($1, $2, $3)", [uuid(), q.c, arv(q.d)]) !== null, "another organisation cannot record a vaccination on this case");
  ok((await as(C, "select id from animal_operation_events where case_id = $1", [q.c])).length === 0, "and cannot read its operations");
  ok((await as(FC, "select id from animal_operation_events where case_id = $1", [q.c])).length === 1, "the organisation's coordinator sees the operation");
}

section("Every automation rule: the six without a test until now");
{
  const run = async (who, id) => (await as(who, "select nx_automation_run($1, false) as r", [id]))[0].r;

  // followups_due: follow-ups due by tomorrow or late, postponed ones included; done ones and other organisations' are not.
  const other = (await one("insert into ngos (name) values ('Another Trust') returning id")).id;
  await db.query(`insert into animal_followups (ngo_id, due_at, status) values
    ($1, now() + interval '2 hours', 'upcoming'), ($1, now() - interval '2 days', 'postponed'), ($1, now() + interval '3 days', 'upcoming'),
    ($1, now() - interval '1 day', 'completed'), ($2, now() - interval '1 day', 'upcoming')`, [N1, other]);
  const fd = (await as(A, "select nx_automation_save($1, 'followups_due', 'Follow-ups due', 'day') as id", [N1]))[0].id;
  const fr = await run(A, fd);
  ok(fr.found === 2 && /2 follow-ups are due by tomorrow or overdue/.test(fr.summary), `follow-ups due by tomorrow or late are counted, postponed included, done and other organisations' not (${fr.found})`);

  // weekly_summary: one Monday note to everyone, with the same late follow-ups followups_due sees.
  const late = (await one("select count(*)::int n from animal_followups where ngo_id = $1 and status in ('upcoming', 'postponed') and due_at < now()", [N1])).n;
  const open = (await one("select (select count(*) from cases where ngo_id = $1 and resolved_at is null) + (select count(*) from nx_tasks where org_id = $1 and state = 'open') as n", [N1])).n;
  const ws = (await as(A, "select nx_automation_save($1, 'weekly_summary', 'Weekly summary', 'week', '{}', 'everyone') as id", [N1]))[0].id;
  const wr = await run(A, ws);
  ok(wr.found === Number(open) && wr.summary.includes(`${late} overdue follow-ups`), `the weekly summary counts open cases and tasks, and late follow-ups including postponed ones (${wr.summary})`);
  ok((await as(B, "select kind from nx_notifications where title = 'Weekly summary'")).some((x) => x.kind === "digest"), "everyone in the organisation gets it as a digest");
  ok((await run(A, ws)).status === "skipped", "and only once a week");

  // samples_overdue: the laboratory's wait starts when it received the sample, not when it was registered at collection.
  const lab = (await one("insert into oh_organisations (kind, name) values ('laboratory', 'State Rabies Laboratory') returning id")).id;
  const LL = uuid(); await db.query("insert into auth.users (id) values ($1)", [LL]);
  await db.query("insert into oh_members (organisation_id, user_id, role) values ($1, $2, 'lead')", [lab, LL]);
  const sample = async (code, status, createdDaysAgo, receivedDaysAgo, extra = {}) => {
    const id = (await one(`insert into oh_samples (code, submitted_by, laboratory_id, species, sample_type, collected_on, status, result, resulted_at, created_at)
      values ($1, $2, $3, 'dog', 'brain_tissue', current_date - $4::int, $5, $6, $7, now() - make_interval(days => $4::int)) returning id`,
      [code, clinic, lab, createdDaysAgo, status, extra.result ?? null, extra.resultedAt ?? null])).id;
    if (receivedDaysAgo !== null) await db.query("insert into oh_sample_events (sample_id, action, at, organisation_id) values ($1, 'received', now() - make_interval(days => $2::int), $3)", [id, receivedDaysAgo, lab]);
    return id;
  };
  await sample("S-TRAVELLED", "testing", 10, 1);   // registered ten days ago, in the laboratory since yesterday: not overdue
  await sample("S-WAITING", "received", 10, 5);    // in the laboratory five days: overdue
  await sample("S-OLD", "testing", 6, null);        // recorded before events: falls back to when it was registered
  await sample("S-DONE", "resulted", 9, 8, { result: "negative", resultedAt: new Date(Date.now() - 3600e3).toISOString() });
  const so = (await as(LL, "select nx_automation_save($1, 'samples_overdue', 'Samples waiting too long', 'day', '{\"days\":3}', 'lab') as id", [lab]))[0].id;
  const sr = await run(LL, so);
  ok(sr.found === 2, `samples count from when the laboratory received them, not from collection (${sr.found})`);

  // results_released: the team that sent samples hears when results come back, once.
  const rl = (await as(P, "select nx_automation_save($1, 'results_released', 'Results released', 'day', '{}', 'clinical') as id", [clinic]))[0].id;
  ok((await run(P, rl)).found === 1, "a result released in the last day is counted for the organisation that sent the sample");
  ok((await as(nurse, "select body from nx_notifications where title = 'Results released'")).some((x) => /1 laboratory result was released/.test(x.body ?? "") && !/negative|S-DONE/.test(x.body ?? "")), "its clinical team is told that a result exists, never what it is");
  ok((await as(P, "select nx_automation_run($1, true) as r", [rl]))[0].r.found === 0, "a result already announced is not announced again");
  ok((await as(LL, "select id from nx_automations where id = $1", [rl])).length === 0, "the laboratory cannot see the sending clinic's automation");

  // packages_waiting: only submitted packages past the days set, for this review office.
  const office = (await one("insert into review_offices (name) values ('Ward Review Office') returning id")).id;
  const other_office = (await one("insert into review_offices (name) values ('Another Review Office') returning id")).id;
  const RV = uuid(); await db.query("insert into auth.users (id) values ($1)", [RV]);
  await db.query("insert into review_office_members (office_id, user_id, role) values ($1, $2, 'lead')", [office, RV]);
  await db.query(`insert into report_packages (ngo_id, office_id, status, submitted_at) values
    ($1, $2, 'submitted', now() - interval '5 days'), ($1, $2, 'submitted', now() - interval '1 day'),
    ($1, $2, 'queried', now() - interval '10 days'), ($1, $2, 'accepted', now() - interval '10 days'), ($1, $3, 'submitted', now() - interval '9 days')`, [N1, office, other_office]);
  const pw = (await as(RV, "select nx_automation_save($1, 'packages_waiting', 'Packages waiting', 'day', '{\"days\":3}') as id", [office]))[0].id;
  const pr = await run(RV, pw);
  ok(pr.found === 1 && /A named reviewer decides/.test(pr.summary), `only this office's submitted packages past the days set are counted (${pr.found})`);

  // data_requests_waiting: the coordinator who can decide is reminded; other partners in the programme are not.
  const child = (await one("insert into oh_programmes (slug, name, parent_id, status) values ('pune-ward-12-drive', 'Ward 12 drive', $1, 'active') returning id", [prog.id])).id;
  const askData = (programme, daysAgo) => db.query(`insert into nx_data_requests (programme_id, requester_org, requested_by, title, purpose, variables, period_from, period_to, status, created_at)
    values ($1, $2, $3, 'Bite trend', 'Weekly bite exposures by category to plan vaccine supply.', array['week'], current_date - 60, current_date, 'requested', now() - make_interval(days => $4::int))`, [programme, ro, R, daysAgo]);
  await askData(prog.id, 5); await askData(child, 5); await askData(prog.id, 1);
  const dc = (await as(P, "select nx_automation_save($1, 'data_requests_waiting', 'Data requests waiting', 'day', '{\"days\":3}') as id", [coordOrg]))[0].id;
  const dr = await run(P, dc);
  ok(dr.found === 2, `the programme's coordinator is reminded of each request past the days set, a sub-programme's included, each once (${dr.found})`);
  const HL = uuid(); await db.query("insert into auth.users (id) values ($1)", [HL]);
  await db.query("insert into oh_members (organisation_id, user_id, role) values ($1, $2, 'lead')", [fac, HL]);
  const dh = (await as(HL, "select nx_automation_save($1, 'data_requests_waiting', 'Data requests waiting', 'day', '{\"days\":3}') as id", [fac]))[0].id;
  const hr = await run(HL, dh);
  ok(hr.found === 0 && hr.status === "skipped", `a hospital in the programme, which cannot decide on its data, is not asked to (${hr.found})`);
}

section("Kaju's action log: append-only, one's own rows, read by the organisation");
{
  const log = (who, row) => as(who, "insert into ai_action_log (kind, ok, target, summary, ngo_id, organisation_id) values ($1, $2, $3, $4, $5, $6) returning id", [row.kind, row.ok ?? true, row.target ?? null, row.summary ?? null, row.ngo ?? null, row.org ?? null]);
  const mine = (await log(A, { kind: "add_task", target: "task", summary: "Call the vet", ngo: N1 }))[0].id;
  ok(!!mine, "a member logs a Kaju action for their own organisation");
  ok(await refused(C, "insert into ai_action_log (kind, ok, ngo_id) values ('add_task', true, $1)", [N1]) !== null, "someone outside the organisation cannot log for it");
  ok(await refused(A, "insert into ai_action_log (kind, ok, ngo_id, user_id) values ('add_task', true, $1, $2)", [N1, B]) !== null, "nobody logs a row in someone else's name");
  ok((await as(B, "select id from ai_action_log where id = $1", [mine])).length === 1, "another member of the organisation reads it");
  ok((await as(C, "select id from ai_action_log where id = $1", [mine])).length === 0, "another organisation does not");
  await as(A, "update ai_action_log set summary = 'changed' where id = $1", [mine]).catch(() => null);
  await as(A, "delete from ai_action_log where id = $1", [mine]).catch(() => null);
  const after = await one("select summary from ai_action_log where id = $1", [mine]);
  ok(after && after.summary === "Call the vet", "rows cannot be changed or removed through the API");
  // A clinician's patient-record read: the facility and a count, read by the facility, not by an NGO.
  const read = (await log(nurse, { kind: "health_read", target: "oh_pep_due", summary: "3 rows", org: clinic }))[0].id;
  ok(!!read, "a read of patient records is logged for the clinician's own facility");
  ok((await as(P, "select id from ai_action_log where id = $1", [read])).length === 1 && (await as(A, "select id from ai_action_log where id = $1", [read])).length === 0, "the facility's lead reads it; an NGO member does not");
  ok(await refused(A, "insert into ai_action_log (kind, ok, organisation_id) values ('health_read', true, $1)", [clinic]) !== null, "nobody logs a read for a facility they are not in");
  let anonWrote = true;
  await db.exec("set role anon");
  try { await db.query("insert into ai_action_log (kind, ok) values ('add_task', true)"); } catch { anonWrote = false; } finally { await db.exec("reset role"); }
  ok(!anonWrote, "visitors cannot write it");
}

section("Kaju model rollout: off by default, grants and budgets per person and organisation, owner-only stop");
{
  const elig = async (who, org = null) => (await as(who, "select kaju_ai_eligibility($1) as e", [org]))[0].e;
  let e = await elig(A, N1);
  ok(e.live === false, "the database switch starts off");
  ok(e.user_grant === null && e.org_grant === null, "nobody has a grant until the owner adds one");
  ok(await refused(A, "select * from kaju_ai_control") !== null, "the switch row is not readable through the API");
  ok(await refused(A, "update kaju_ai_control set live = true") !== null && (await one("select live from kaju_ai_control")).live === false, "nobody turns the switch on through the API");
  ok(await refused(A, "insert into kaju_ai_access (user_id, monthly_budget_inr, daily_requests, granted_by) values ($1, 100, 10, 'me')", [A]) !== null, "nobody grants themselves model access");
  await db.query("update kaju_ai_control set live = true, owner_user_id = $1", [A]);
  await db.query("insert into kaju_ai_access (user_id, monthly_budget_inr, daily_requests, granted_by) values ($1, 50, 10, 'owner:test')", [A]);
  await db.query("insert into kaju_ai_access (org_id, monthly_budget_inr, daily_requests, granted_by) values ($1, 200, 40, 'owner:test')", [N1]);
  await db.query("insert into kaju_ai_access (org_id, monthly_budget_inr, daily_requests, granted_by, revoked_at) values ($1, 999, 999, 'owner:test', now())", [N2]);
  e = await elig(A, N1);
  ok(e.live === true && Number(e.user_grant.monthly_budget_inr) === 50 && Number(e.org_grant.monthly_budget_inr) === 200, "a granted person sees their own and their organisation's grant");
  e = await elig(C, N1);
  ok(e.org_grant === null && e.user_grant === null, "someone outside the organisation does not get its grant by naming it");
  ok((await elig(C, N2)).org_grant === null, "a revoked grant is not used");
  await as(A, "select record_kaju_model_usage('kaju_chat', 'test-model', 1000, 200, 1.25)");
  await as(B, "select record_kaju_model_usage('kaju_chat', 'test-model', 1000, 200, 0.75)");
  e = await elig(A, N1);
  ok(Number(e.user_today) === 1 && Number(e.org_today) === 2 && Number(e.user_month_inr) === 1.25 && Number(e.org_month_inr) === 2 && Number(e.month_inr) >= 2, "today's runs and this month's spend are counted for the person, the organisation and everyone");
  ok(await refused(B, "select kaju_ai_stop('test')") !== null, "only the owner can use the emergency stop");
  ok((await as(B, "select kaju_ai_owner_status() as s"))[0].s === null, "the owner's panel shows nothing to anyone else");
  const st = (await as(A, "select kaju_ai_owner_status() as s"))[0].s;
  ok(st.live === true && st.grants.length === 2, "the owner sees the switch and the active grants");
  /* Reservations: the binding decision, server only, under one lock. */
  const reserve = (who, org, amount, ceiling = 1000, ud = 100, od = 100) => asService("select kaju_ai_reserve($1, $2, 'kaju_chat', $3, $4, $5, $6) as r", [who, org, amount, ceiling, ud, od]).then((x) => x[0].r);
  ok(await refused(A, "select kaju_ai_reserve($1, $2, 'kaju_chat', 1, 1000, 100, 100)", [A, N1]) !== null, "a signed-in person cannot reserve model spend directly");
  ok(await refused(A, "select kaju_ai_settle(gen_random_uuid(), 'm', 1, 1, 0)") !== null, "nor settle it");
  ok(await refused(A, "select * from kaju_ai_reservations") !== null, "nor read reservations");
  // A has ₹1.25 spent and a ₹50 personal grant; each answer reserves ₹10. Four fit (41.25), the fifth would pass 50.
  const got = []; for (let i = 0; i < 6; i++) got.push(await reserve(A, N1, 10));
  ok(got.filter((r) => r.ok).length === 4 && got.at(-1).reason === "user_budget", "reservations count against the budget before any run finishes: four ₹10 answers fit in what is left of ₹50, the fifth is refused");
  ok(Number((await elig(A, N1)).user_month_inr) === 41.25, "reserved spend is counted as spent");
  const settled = (await asService("select kaju_ai_settle($1, 'claude-test', 1200, 300, 0.5) as ok", [got[0].id]))[0].ok;
  ok(settled === true && Number((await elig(A, N1)).user_month_inr) === 31.75, "settling replaces the reservation with the real cost");
  ok((await asService("select kaju_ai_settle($1, 'claude-test', 1, 1, 0) as ok", [got[0].id]))[0].ok === false, "a reservation is settled once");
  const row = await one("select org_id, ngo_id from kaju_model_usage where model = 'claude-test'");
  ok(row.org_id === N1 && row.ngo_id === N1, "the run is recorded against the organisation it was for");
  ok((await reserve(A, N1, 10)).ok === true, "the freed budget can be used again");
  ok((await reserve(C, N1, 1)).reason === "no_grant", "naming another organisation does not borrow its grant");
  ok((await reserve(A, N1, 1, 10)).reason === "ceiling", "the deployment ceiling is enforced inside the lock");
  ok((await reserve(A, N1, 101)).reason === "invalid", "one answer can never reserve more than ₹100");
  await as(A, "select kaju_ai_stop('test stop')");
  ok((await elig(A, N1)).live === false, "the owner's stop turns model use off at once");
  ok((await reserve(A, N1, 1)).reason === "switched_off", "after the stop no reservation is granted");
  await db.query("delete from kaju_ai_reservations");
}

section("Kaju conversations: one's own, inside one's organisation");
{
  const t = (await as(B, "insert into kaju_threads (org_id, workspace, title) values ($1, 'ngo', 'Overdue follow-ups') returning id", [N1]))[0].id;
  await as(B, "insert into kaju_thread_turns (thread_id, role, text) values ($1, 'user', 'which follow-ups are late?'), ($1, 'kaju', 'Three are late.')", [t]);
  ok((await as(B, "select id from kaju_thread_turns where thread_id = $1", [t])).length === 2, "a person reads their own conversation");
  ok((await as(A, "select id from kaju_threads where id = $1", [t])).length === 0 && (await as(A, "select id from kaju_thread_turns where thread_id = $1", [t])).length === 0, "an admin of the same organisation cannot read it");
  ok(await refused(A, "insert into kaju_thread_turns (thread_id, role, text) values ($1, 'user', 'injected')", [t]) !== null, "nobody adds to someone else's conversation");
  ok(await refused(C, "insert into kaju_threads (org_id, title) values ($1, 'sneaky')", [N1]) !== null, "nobody starts a conversation in an organisation they are not in");
  ok(await refused(B, "insert into kaju_threads (org_id, workspace, title) values ($1, 'healthcare', 'patients')", [N1]) !== null, "health-workspace conversations are not saved");
  await as(B, "update kaju_threads set title = 'Late follow-ups' where id = $1", [t]);
  ok((await as(B, "select title from kaju_threads where id = $1", [t]))[0].title === "Late follow-ups", "a person renames their conversation");
  ok(await refused(B, "update kaju_threads set org_id = null where id = $1", [t]) !== null, "a conversation cannot be moved out of its organisation");
  ok(await refused(B, "truncate kaju_threads") !== null, "nobody can empty the table");
  await db.query("delete from ngo_members where ngo_id = $1 and user_id = $2", [N1, B]);
  ok((await as(B, "select id from kaju_threads where id = $1", [t])).length === 0, "after leaving the organisation its conversations are hidden");
  await db.query("insert into ngo_members (ngo_id, user_id, role) values ($1, $2, 'member')", [N1, B]);
  await as(B, "delete from kaju_threads where id = $1", [t]);
  ok((await one("select count(*)::int n from kaju_thread_turns where thread_id = $1", [t])).n === 0, "deleting a conversation removes its turns");
}

section("Kaju pilot feedback: no text logged, own rows, aggregates for admins only");
{
  const log = async (who, org, extra = {}) => (await asService("insert into kaju_turn_log (user_id, org_id, engine, outcome, tools, latency_ms, intent, cost_inr) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id",
    [who, org, extra.engine ?? "tools", extra.outcome ?? "answered", extra.tools ?? ["query_cases"], extra.ms ?? 300, extra.intent ?? "query_cases", extra.cost ?? null]))[0].id;
  const l1 = await log(B, N1); const l2 = await log(B, N1, { outcome: "no_match", tools: [], intent: "no_match" });
  await log(A, N1, { engine: "model", cost: 2.5, tools: ["work_summary", "show"], intent: "work_summary" });
  ok(await refused(B, "insert into kaju_turn_log (user_id, org_id, engine, outcome, cost_inr) values ($1, $2, 'model', 'answered', 999)", [B, N1]) !== null, "people cannot write turn rows themselves, so pilot figures cannot be padded");
  ok(await refused(B, "update kaju_turn_log set cost_inr = 0 where user_id = $1", [B]) !== null || (await one("select count(*)::int n from kaju_turn_log where cost_inr = 0")).n === 0, "nor change them");
  ok((await as(A, "select id from kaju_turn_log where id = $1", [l1])).length === 0, "one person's turn rows are not readable by others");
  await as(B, "insert into kaju_feedback (turn_id, rating, reason, minutes_saved) values ($1, 1, 'saved_time', 15)", [l1]);
  await as(B, "insert into kaju_feedback (turn_id, rating, reason, comment) values ($1, -1, 'not_useful', 'It did not find the Ward 12 dog')", [l2]);
  ok(await refused(A, "insert into kaju_feedback (turn_id, rating) values ($1, 1)", [l1]) !== null, "nobody rates someone else's answer");
  await as(B, "update kaju_feedback set rating = 1, reason = 'saved_time', minutes_saved = 15, updated_at = now() where turn_id = $1", [l1]);
  ok(await refused(B, "update kaju_feedback set turn_id = $2 where turn_id = $1", [l1, l2]) !== null, "a rating can be changed, but never moved to another answer");
  const aTurn = (await one("select id from kaju_turn_log where user_id = $1 limit 1", [A])).id;
  ok(await refused(B, "update kaju_feedback set turn_id = $2 where turn_id = $1", [l2, aTurn]) !== null, "and never onto someone else's answer, even with Supabase's default privileges");
  ok(await refused(B, "delete from kaju_feedback where turn_id = $1", [l1]) !== null, "ratings are not deleted through the API");
  await as(A, "update kaju_feedback set rating = -1 where turn_id = $1", [l1]);
  ok((await one("select rating from kaju_feedback where turn_id = $1", [l1])).rating === 1, "nobody changes someone else's rating");
  ok((await as(B, "select kaju_pilot_metrics($1, 30) as m", [N1]))[0].m === null, "a member does not see the organisation's aggregates");
  ok((await as(C, "select kaju_pilot_metrics($1, 30) as m", [N1]))[0].m === null, "another organisation's admin does not either");
  const m = (await as(A, "select kaju_pilot_metrics($1, 30) as m", [N1]))[0].m;
  ok(m.turns === 3 && m.people === 2 && m.by_outcome.no_match === 1 && m.feedback.up === 1 && m.feedback.down === 1 && m.feedback.minutes_saved === 15, "the organisation's admin sees counts, outcomes and feedback");
  ok(Number(m.model_cost_inr) === 2.5 && Number(m.cost_per_completed_inr) === 1.25, "cost per completed answer is measured");
  ok(m.comments.length === 1 && !JSON.stringify(m.comments).includes(B) && !("at" in m.comments[0]), "comments are shown without who wrote them or when");
  ok(m.top_tools.some((t) => t.tool === "query_cases" && t.runs === 1), "tool use is counted");
  ok((await as(B, "select kaju_pilot_metrics(null, 30) as m"))[0].m === null, "only the owner sees every organisation");
  ok((await as(A, "select kaju_pilot_metrics(null, 30) as m"))[0].m.turns >= 3, "the owner sees the whole pilot");
}

section("Kaju intelligence layer: the rollback removes only what the migration added, and it can be applied again");
{
  const before = (await one("select count(*)::int n from pg_tables where schemaname = 'public'")).n;
  const usage = (await one("select count(*)::int n from kaju_model_usage")).n;
  await db.exec(readFileSync(join(here, "../../supabase/rollback/20261119090000_kaju_intelligence_layer-rollback.sql"), "utf8"));
  const gone = await one("select count(*)::int n from pg_tables where schemaname = 'public' and tablename in ('kaju_ai_control','kaju_ai_access','kaju_ai_reservations','kaju_threads','kaju_thread_turns','kaju_turn_log','kaju_feedback')");
  const fns = await one("select count(*)::int n from pg_proc where pronamespace = 'public'::regnamespace and proname in ('kaju_ai_eligibility','kaju_ai_stop','kaju_ai_owner_status','kaju_pilot_metrics','kaju_threads_purge','kaju_thread_touch','kaju_ai_reserve','kaju_ai_settle','kaju_ai_spent')");
  const col = await one("select count(*)::int n from information_schema.columns where table_name = 'kaju_model_usage' and column_name = 'org_id'");
  ok(gone.n === 0 && fns.n === 0 && col.n === 0, "the rollback removes the seven tables, nine functions and the added column");
  ok((await one("select count(*)::int n from pg_tables where schemaname = 'public'")).n === before - 7, "no other table is removed");
  ok((await one("select count(*)::int n from kaju_model_usage")).n === usage && (await one("select count(*)::int n from ai_action_log")).n > 0, "the usage ledger and the action log keep their rows");
  await db.exec(readFileSync(join(here, "../../supabase/rollback/20261119090000_kaju_intelligence_layer-rollback.sql"), "utf8"));
  ok(true, "running the rollback twice is harmless");
  await db.exec(readFileSync(join(MIG, "20261119090000_kaju_intelligence_layer.sql"), "utf8"));
  const back = (await as(A, "select kaju_ai_eligibility($1) as e", [N1]))[0].e;
  ok(back.live === false && back.user_grant === null, "applied again, the switch is off and there are no grants");
}

section("People are shown by a name: the sign-in name, else the readable part of the email, never 'A colleague' when either exists");
{
  const pn = uuid(), named = uuid();
  await db.query("insert into auth.users (id, email) values ($1, 'priya.nair7@example.org')", [pn]);
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'rk@example.org', $2)", [named, { name: "Ravi Kumar" }]);
  await db.query("insert into ngo_members (ngo_id, user_id, role) values ($1, $2, 'member'), ($1, $3, 'member')", [N1, pn, named]);
  const people = await as(A, "select user_id, name from nx_org_people($1)", [N1]);
  ok(people.find((p) => p.user_id === pn)?.name === "Priya Nair", "someone with no name on record is shown by the readable part of their email");
  ok(people.find((p) => p.user_id === named)?.name === "Ravi Kumar", "a name on the sign-in record wins");
  const signed = uuid();
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'x9@example.org', $2)", [signed, { display_name: "Anita Rao" }]);
  await db.query("insert into ngo_members (ngo_id, user_id, role) values ($1, $2, 'member')", [N1, signed]);
  ok((await as(A, "select name from nx_org_people($1) where user_id = $2", [N1, signed]))[0]?.name === "Anita Rao", "the name given at StrayPaw sign-up (display_name) is used");
  let refused = false; try { await as(A, "select nx_person_name($1)", [pn]); } catch { refused = true; }
  ok(refused, "signed-in people cannot call the name helper to look up anyone by id");
  ok((await as(C, "select count(*)::int n from nx_org_people($1)", [N1]))[0].n === 0, "another organisation still sees nobody");
}

section("A recorded sterilisation or vaccination sets the animal's status (supabase/proposed/2026-11-18-care-sets-status.sql)");
{
  const PROP = join(here, "../../supabase/proposed");
  const ngo = (await one("insert into ngos (name) values ('Care status test') returning id")).id;
  const dog = async (st, vx) => (await one("insert into dogs (ngo_id, sterilisation_status, vaccination_status) values ($1, $2, $3) returning id", [ngo, st, vx])).id;
  const status = async (id) => one("select sterilisation_status s, vaccination_status v from dogs where id = $1", [id]);
  // Before the change: an event recorded as care leaves the status unknown, as on production.
  const before = await dog("unknown", "unknown");
  await db.query("insert into medical_events (dog_id, kind, event_date) values ($1, 'sterilisation', current_date)", [before]);
  const untouched = await dog("unknown", "unknown");
  await db.query("insert into medical_events (dog_id, kind, event_date) values ($1, 'treatment', current_date)", [untouched]);
  ok((await status(before)).s === "unknown", "today a sterilisation event leaves the animal 'unknown' (the gap this closes)");
  await db.exec(readFileSync(join(MIG, "20261119130000_care_sets_status.sql"), "utf8"));
  ok((await status(before)).s === "sterilised", "the backfill sets the status from the event already recorded");
  ok((await status(untouched)).s === "unknown" && (await status(untouched)).v === "unknown", "an animal with only other care stays not recorded");
  const fresh = await dog(null, "not_vaccinated");
  await db.query("insert into medical_events (dog_id, kind, event_date) values ($1, 'vaccination', current_date)", [fresh]);
  ok((await status(fresh)).v === "vaccinated" && (await status(fresh)).s === null, "a new vaccination sets vaccinated and nothing else");
  await db.query("insert into medical_events (dog_id, kind, event_date) values ($1, 'sterilisation', current_date)", [fresh]);
  ok((await status(fresh)).s === "sterilised", "a new sterilisation sets sterilised");
  let denied = false;
  try { await as(A, "select care_sets_dog_status()"); } catch { denied = true; }
  ok(denied, "a signed-in person cannot call the trigger function");
  await db.exec(readFileSync(join(MIG, "20261119130000_care_sets_status.sql"), "utf8"));
  ok((await one("select count(*)::int n from pg_trigger where tgname = 'medical_events_set_dog_status'")).n === 1, "applying it twice leaves one trigger");
  await db.exec(readFileSync(join(here, "../../supabase/rollback/20261119130000_care_sets_status-rollback.sql"), "utf8"));
  const after = await dog("unknown", "unknown");
  await db.query("insert into medical_events (dog_id, kind, event_date) values ($1, 'sterilisation', current_date)", [after]);
  ok((await status(after)).s === "unknown" && (await status(before)).s === "sterilised", "the rollback stops the trigger and keeps statuses already set");
}

section("The public 'Being helped now' figure leaves out unconfirmed imports (supabase/proposed/2026-11-18-public-impact-active-cases.sql)");
{
  const PROP = join(here, "../../supabase/proposed");
  // Only the columns the function reads, as on production.
  await db.exec(`alter table dogs add column if not exists is_demo boolean, add column if not exists sterilised boolean, add column if not exists vaccinated boolean;
    alter table cases add column if not exists status_class text, add column if not exists provenance text, add column if not exists category text, add column if not exists is_demo boolean, add column if not exists status_reviewed_at timestamptz;`);
  const ngo = (await one("insert into ngos (name) values ('Impact test') returning id")).id;
  const add = (cls, prov, reviewed) => db.query("insert into cases (ngo_id, status_class, provenance, status_reviewed_at, title) values ($1, $2, $3, $4, 'x')", [ngo, cls, prov, reviewed]);
  await add("in_progress", "community_report", null); await add("open", null, null);
  for (let i = 0; i < 5; i++) await add("in_progress", "imported_historical_record", null);
  await add("open", "imported_historical_record", new Date().toISOString());
  await add("closed", "imported_historical_record", null);
  await db.exec(readFileSync(join(here, "../../supabase/rollback/20261119140000_public_impact_active_cases-rollback.sql"), "utf8"));
  const before = await one("select active_cases::int a, case_records::int r, resolved_cases::int c from list_public_org_impacts() where ngo_id = $1", [ngo]);
  ok(before.a === 8, "today every open status counts, unconfirmed imports included (8)");
  await db.exec(readFileSync(join(MIG, "20261119140000_public_impact_active_cases.sql"), "utf8"));
  await db.exec(readFileSync(join(MIG, "20261119140000_public_impact_active_cases.sql"), "utf8"));
  const after = await one("select active_cases::int a, case_records::int r, resolved_cases::int c from list_public_org_impacts() where ngo_id = $1", [ngo]);
  ok(after.a === 3, "with the change: current work plus the one confirmed import (3), as Today and Cases count it");
  ok(after.r === before.r && after.c === before.c, "case records and resolved cases are unchanged");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
