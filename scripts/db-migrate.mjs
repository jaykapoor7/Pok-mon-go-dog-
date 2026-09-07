#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Run StrayPaw's SQL files against a Postgres database, in order.
//
// The Supabase SQL editor works, but it is one paste per file, it gives no
// running order, and a file that fails halfway leaves you guessing what
// applied. Seven pastes is also seven chances to run them out of order,
// which is how most of the migration failures on this project happened.
//
// Usage:
//   DATABASE_URL=postgresql://... node scripts/db-migrate.mjs pilot
//
// The connection string is Supabase → Project Settings → Database →
// Connection string → URI. Use the session pooler or direct connection;
// the transaction pooler (port 6543) cannot run DDL reliably.
//
// Sets are declared below rather than globbed, because order matters and a
// directory listing does not know that.
// ─────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = (f) => join(root, "supabase", f);

const SETS = {
  /* Everything, on an empty project. */
  all: ["RUN-ALL-MIGRATIONS.sql", "RUN-PILOT-MIGRATIONS.sql", ...districts(), "wards-chennai.sql"],
  /* The pilot layer on a project that already has the base schema. */
  pilot: ["RUN-PILOT-MIGRATIONS.sql", ...districts(), "wards-chennai.sql"],
  /* Just the density map: rebuilds the wards table, then reloads it. */
  wards: ["ward-density.sql", ...districts(), "wards-chennai.sql"],
};

function districts() {
  return [1, 2, 3, 4, 5].map((n) => `districts-india-${n}of5.sql`);
}

/* .env.local is where Next keeps these already, so read it rather than
   asking the user to export the same value a second time. */
function fromEnvFile(key) {
  const p = join(root, ".env.local");
  if (!existsSync(p)) return null;
  const line = readFileSync(p, "utf8")
    .split("\n")
    .find((l) => l.trim().startsWith(`${key}=`));
  return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : null;
}

const set = process.argv[2] ?? "pilot";
const files = SETS[set];
if (!files) {
  console.error(`Unknown set "${set}". Try: ${Object.keys(SETS).join(", ")}`);
  process.exit(1);
}

const url = process.env.DATABASE_URL ?? fromEnvFile("DATABASE_URL");
if (!url) {
  console.error(
    "No DATABASE_URL.\n" +
      "Supabase → Project Settings → Database → Connection string → URI.\n" +
      "Then either put it in .env.local as DATABASE_URL=..., or:\n" +
      "  DATABASE_URL='postgresql://...' npm run db:migrate -- " + set
  );
  process.exit(1);
}

const missing = files.filter((f) => !existsSync(sql(f)));
if (missing.length) {
  console.error(`Missing SQL files: ${missing.join(", ")}`);
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  /* Supabase terminates TLS with its own CA. Verification here would need
     their root bundle shipped alongside; the connection is still encrypted. */
  ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
  /* Loading 641 district polygons is a slow single statement. */
  statement_timeout: 0,
});

await client.connect();
console.log(`Connected. Running set "${set}", ${files.length} files.\n`);

for (const file of files) {
  const started = Date.now();
  process.stdout.write(`  ${file.padEnd(30)}`);
  try {
    await client.query(readFileSync(sql(file), "utf8"));
    console.log(`ok   ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.log("FAILED");
    console.error(`\n${file} failed:\n  ${err.message}`);
    if (err.position) {
      /* Point at the offending line rather than a character offset nobody
         can count to in a 300 KB file. */
      const upto = readFileSync(sql(file), "utf8").slice(0, Number(err.position));
      console.error(`  at line ${upto.split("\n").length}`);
    }
    console.error("\nNothing after this file ran. Fix it and run the same command again;\nevery file here is safe to repeat.");
    await client.end();
    process.exit(1);
  }
}

/* Say what is actually in the database now, so "it ran" and "it worked"
   are not taken to be the same statement. */
try {
  const { rows } = await client.query(`
    select
      (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname like 'ward\\_%') as ward_functions,
      (select count(*) from wards where level = 'district')       as districts,
      (select count(*) from wards where level = 'ward')           as city_wards,
      (select count(*) from dogs)                                 as animals
  `);
  const r = rows[0];
  console.log(
    `\nDone. ward functions ${r.ward_functions} (expect 6) · ` +
      `districts ${r.districts} (expect 641) · ` +
      `city wards ${r.city_wards} (expect 200) · animals on record ${r.animals}`
  );
} catch {
  console.log("\nDone.");
}

await client.end();
