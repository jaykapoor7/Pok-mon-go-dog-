/*
 * Runs entirely inside rolled-back transactions against the session pooler.
 * It proves the critical read/write boundary for an actual pair of NGO
 * members and their animal records without leaving test data in production.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

function connectionString() {
  if (process.env.SUPABASE_POOLER_URL) return process.env.SUPABASE_POOLER_URL;
  const envFile = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envFile)) {
    const match = fs.readFileSync(envFile, "utf8").match(/^SUPABASE_POOLER_URL=(.+)$/m);
    if (match) return match[1].trim().replace(/^['"]|['"]$/g, "");
  }
  throw new Error("SUPABASE_POOLER_URL is required.");
}

const { Pool } = pg;
const pool = new Pool({ connectionString: connectionString(), ssl: { rejectUnauthorized: false } });
const fail = (message) => { throw new Error(message); };

async function asRole(role, userId, action) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${role}`);
    if (userId) await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    const result = await action(client);
    await client.query("rollback");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally { client.release(); }
}

async function main() {
  const admin = await pool.connect();
  let fixtures;
  try {
    const { rows } = await admin.query(`
      select m.ngo_id, m.user_id, d.id as dog_id
      from ngo_members m
      join lateral (
        select id from dogs where ngo_id = m.ngo_id order by created_at limit 1
      ) d on true
      where m.ngo_id is not null
      order by m.ngo_id
    `);
    const byNgo = [...new Map(rows.map((row) => [row.ngo_id, row])).values()];
    if (byNgo.length < 2) {
      throw new Error("RLS matrix needs two NGO memberships, each with one animal record. No data was changed.");
    }
    fixtures = { a: byNgo[0], b: byNgo[1] };

  } finally { admin.release(); }

  const serviceCount = await asRole("service_role", null, async (client) => {
    const { rows } = await client.query("select count(*)::int as count from dogs");
    return rows[0].count;
  });
  if (serviceCount < 2) fail("Service role baseline did not return the expected records.");

  const own = await asRole("authenticated", fixtures.a.user_id, async (client) => {
    const { rows } = await client.query("select id from dogs where id = $1", [fixtures.a.dog_id]);
    return rows.length;
  });
  if (own !== 1) fail("NGO A cannot read its own animal record.");

  const crossRead = await asRole("authenticated", fixtures.a.user_id, async (client) => {
    const { rows } = await client.query("select id from dogs where id = $1", [fixtures.b.dog_id]);
    return rows.length;
  });
  if (crossRead !== 0) fail("NGO A can read NGO B's private animal record.");

  const crossWrite = await asRole("authenticated", fixtures.a.user_id, async (client) => {
    const result = await client.query("update dogs set zone = zone where id = $1", [fixtures.b.dog_id]);
    return result.rowCount;
  });
  if (crossWrite !== 0) fail("NGO A can update NGO B's private animal record.");

  const communityId = "00000000-0000-4000-8000-000000000001";
  const community = await asRole("authenticated", communityId, async (client) => {
    const privateRows = await client.query("select id from dogs limit 1");
    const publicRows = await client.query("select id from public_animal_profiles limit 1");
    return { privateCount: privateRows.rowCount, publicCount: publicRows.rowCount };
  });
  if (community.privateCount !== 0) fail("A community user can read private animal rows.");
  if (community.publicCount < 1) fail("A community user cannot read the public animal projection.");

  const anon = await asRole("anon", null, async (client) => {
    let privateDenied = false;
    try { await client.query("select id from dogs limit 1"); }
    catch (error) { privateDenied = error?.code === "42501"; }
    const publicRows = await client.query("select id from public_animal_profiles limit 1");
    return { privateDenied, publicCount: publicRows.rowCount };
  });
  if (!anon.privateDenied) fail("Anonymous visitors can read the private dogs table.");
  if (anon.publicCount < 1) fail("Anonymous visitors cannot read the public animal projection.");

  console.log(JSON.stringify({
    ok: true,
    roles: ["anon", "community", "ngo_a", "ngo_b boundary", "service_role"],
    assertions: ["public projection readable", "private base data denied", "NGO A owns its data", "NGO A cannot read/update NGO B"],
  }, null, 2));
}

main().catch((error) => { console.error(`RLS matrix failed: ${error.message}`); process.exitCode = 1; })
  .finally(() => pool.end());
