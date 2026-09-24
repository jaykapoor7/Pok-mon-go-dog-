#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Run StrayPaw's SQL files against a Postgres database, in order.
//
// Usage:
//   DATABASE_URL=postgresql://... node scripts/db-migrate.mjs pilot
// ─────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = (f) => join(root, "supabase", f);

const SETS = {
  all: ["RUN-ALL-MIGRATIONS.sql", "RUN-PILOT-MIGRATIONS.sql", "programme-evidence.sql", "rollout-hardening.sql", ...districts(), "wards-chennai.sql", "register-intelligence.sql", "case-review.sql"],
  pilot: ["RUN-PILOT-MIGRATIONS.sql", "programme-evidence.sql", "rollout-hardening.sql", ...districts(), "wards-chennai.sql", "register-intelligence.sql", "case-review.sql"],
  rollout: ["rollout-hardening.sql"],
  /* Place and facts for the map, analytics and dashboards. Needs the
     district boundaries loaded first; safe to run again. */
  register: ["register-intelligence.sql", "case-review.sql"],
  wards: ["ward-density.sql", ...districts(), "wards-chennai.sql", "map-search.sql"],
  personal: ["personal-access-codes.sql"],
  delhi: ["seed-delhi-photographs.sql"],
};

function districts() {
  return [1, 2, 3, 4, 5].map((n) => `districts-india-${n}of5.sql`);
}

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

const url =
  process.env.SUPABASE_POOLER_URL ??
  process.env.DATABASE_URL ??
  fromEnvFile("SUPABASE_POOLER_URL") ??
  fromEnvFile("DATABASE_URL");
if (!url) {
  console.error(
    "No Supabase connection URL.\n" +
      "For GitHub Actions, add SUPABASE_POOLER_URL using Supabase Connect → Session pooler.\n" +
      "For local development, add SUPABASE_POOLER_URL or DATABASE_URL to .env.local.\n" +
      "  SUPABASE_POOLER_URL='postgresql://...' npm run db:migrate -- " + set
  );
  process.exit(1);
}

const missing = files.filter((f) => !existsSync(sql(f)));
if (missing.length) {
  console.error(`Missing SQL files: ${missing.join(", ")}`);
  process.exit(1);
}

if (files.includes("RUN-PILOT-MIGRATIONS.sql")) {
  const { execFileSync } = await import("node:child_process");
  try {
    execFileSync(process.execPath, [join(root, "scripts/build-bundle.mjs"), "--check"], {
      stdio: "pipe",
    });
  } catch {
    console.error(
      "RUN-PILOT-MIGRATIONS.sql is out of date with the files it is built from.\n" +
        "Run: npm run db:bundle"
    );
    process.exit(1);
  }
}

/*
 * programme-evidence.sql deliberately extends two views that are also defined
 * earlier inside the generated pilot bundle. PostgreSQL's CREATE OR REPLACE
 * VIEW cannot remove columns, so replaying the older bundled definitions on a
 * database that already has the extended views fails with "cannot drop
 * columns from view".
 *
 * Normalize every bundled occurrence of those two views to the current column
 * shape before execution. Match the whole view body rather than a formatting-
 * sensitive tail so this remains safe if the generated SQL is reflowed.
 */
function normalizeRerunnableSql(file, text) {
  if (file !== "RUN-PILOT-MIGRATIONS.sql" && file !== "RUN-ALL-MIGRATIONS.sql") return text;

  const animalView = `create or replace view public_animal_profiles as
select
  d.id, d.name, d.species, d.zone,
  case when d.lat between -90 and 90 and d.lng between -180 and 180
         and not (d.lat = 0 and d.lng = 0)
       then round(d.lat::numeric, 2)::double precision end as lat,
  case when d.lat between -90 and 90 and d.lng between -180 and 180
         and not (d.lat = 0 and d.lng = 0)
       then round(d.lng::numeric, 2)::double precision end as lng,
  d.status, d.cover_photo, d.size, d.color, d.is_friendly, d.needs_help,
  d.sterilised, d.vaccinated, d.sterilisation_status, d.vaccination_status,
  d.ear_notch, d.trust_score, d.sightings_count, d.feed_count,
  d.first_seen, d.last_seen, d.last_fed_at, d.created_at, d.ngo_id, d.code,
  d.provenance, n.name as ngo_name,
  d.straypaw_id
from dogs d left join ngos n on n.id = d.ngo_id;`;

  const programmeView = `create or replace view public_programme_cards as
select
  c.id,
  c.name,
  c.kind,
  c.starts_on,
  c.ends_on,
  c.zone,
  c.public_summary,
  n.name as ngo_name,
  n.slug as ngo_slug,
  n.city,
  n.state,
  coalesce(nullif(count(d.id), 0), c.source_rows_count) as animals_recorded,
  coalesce(
    nullif(count(d.id) filter (where d.sterilisation_status = 'sterilised'), 0),
    case when c.kind = 'sterilisation' then c.source_rows_count else 0 end
  ) as sterilised_recorded,
  coalesce(
    nullif(count(d.id) filter (where d.vaccination_status = 'vaccinated'), 0),
    case when c.kind = 'vaccination' then c.source_rows_count else 0 end
  ) as vaccinated_recorded,
  c.source_rows_count as source_rows_count,
  count(d.id) as traceable_animals_recorded
from campaigns c
join ngos n on n.id = c.ngo_id
left join dogs d on d.campaign_id = c.id
where c.public_visibility in ('summary', 'public')
  and c.archived_at is not null
group by c.id, n.id;`;

  return text
    .replace(
      /create or replace view public_animal_profiles as[\s\S]*?from dogs d left join ngos n on n\.id = d\.ngo_id;/g,
      animalView
    )
    .replace(
      /create or replace view public_programme_cards as[\s\S]*?group by c\.id, n\.id;/g,
      programmeView
    );
}

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
  statement_timeout: 0,
});

try {
  await client.connect();
} catch (err) {
  if (err?.code === "ENETUNREACH" && String(err?.address ?? "").includes(":")) {
    console.error(
      "\nThis runner reached an IPv6-only Supabase address. " +
        "Use the IPv4-compatible Session Pooler URI (Supabase Connect → Session pooler) " +
        "as SUPABASE_POOLER_URL; do not use the direct db.<project>.supabase.co URI in GitHub Actions."
    );
  }
  throw err;
}
console.log(`Connected. Running set "${set}", ${files.length} files.\n`);

for (const file of files) {
  const started = Date.now();
  process.stdout.write(`  ${file.padEnd(30)}`);
  const raw = readFileSync(sql(file), "utf8");
  const statement = normalizeRerunnableSql(file, raw);
  try {
    await client.query(statement);
    console.log(`ok   ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.log("FAILED");
    console.error(`\n${file} failed:\n  ${err.message}`);
    if (err.position) {
      const upto = statement.slice(0, Number(err.position));
      console.error(`  at line ${upto.split("\n").length}`);
    }
    console.error("\nNothing after this file ran. Fix it and run the same command again;\nevery file here is safe to repeat.");
    await client.end();
    process.exit(1);
  }
}

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
