#!/usr/bin/env node
// Apply the repo's SQL to the LOCAL staging database, in a fixed order.
// Each file runs as one implicit transaction (simple query protocol), like a
// Supabase SQL-editor run: an error rolls that whole file back.
//
// Order:
//   A. `all` set exactly as scripts/db-migrate.mjs defines it (including its
//      view-shape normalisation for the two bundles),
//   B. the launch checklist's separately-run files (docs/LAUNCH_CHECKLIST.md),
//   C. every other non-historical feature/recovery file the app reads from,
//      dependency-ordered, newest last.
// A file that fails because something it needs comes later is retried after
// the remaining files (up to 3 passes). Final failures are reported.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const require = createRequire(join(root, "package.json"));
const pg = require("pg");

const url = process.env.STAGING_URL;
if (!url || !/^postgresql:\/\/[^@]+@(127\.0\.0\.1|localhost):\d+\/straypaw_staging$/.test(url)) {
  console.error("Refusing: STAGING_URL must point at the local straypaw_staging database.");
  process.exit(2);
}

const districts = [1, 2, 3, 4, 5].map((n) => `districts-india-${n}of5.sql`);
export const ORDER = [
  // A — `all` set (scripts/db-migrate.mjs)
  "RUN-ALL-MIGRATIONS.sql", "RUN-PILOT-MIGRATIONS.sql", "programme-evidence.sql", "rollout-hardening.sql",
  ...districts, "wards-chennai.sql", "@drift.sql", "register-intelligence.sql", "case-review.sql", "phase1-operational-integrity.sql",
  // B — launch checklist, steps 4–6 (1–3 are in A)
  "photo-optional.sql", "feedback.sql", "fix-sightings-feed.sql", "demo-mode.sql",
  "comment-fix-and-anon-hardening.sql", "community-report-triage.sql", "source-photos-and-provenance.sql",
  "dog-only-runtime-guards.sql", "data-source-organisation-register.sql", "org-delete-record.sql",
  "hardening-storage-and-tenancy.sql",
  "launch-security-lockdown.sql", "spatial-ref-sys-client-guard.sql",
  // C — launch + recovery + newest feature files
  "launch-record-location.sql", "launch-location-cells.sql", "launch-public-projections.sql",
  "launch-community-acknowledgements.sql", "launch-historical-attention.sql", "launch-org-impact-index.sql",
  "launch-partner-import.sql", "launch-public-aggregate-performance.sql", "launch-survey-totals.sql",
  "launch-spatial-refresh-triggers.sql", "launch-spatial-demo-parent-filter.sql", "launch-spatial-schedule.sql",
  "production-recovery.sql", "spatial-recovery-followup.sql", "preserve-case-only-spatial-cells.sql",
  "data-correctness-aggregates.sql", "city-scope-correctness.sql", "public-org-map-cells.sql",
  "public-animal-appearance.sql", "public-photo-sensitive.sql", "final-site-recovery.sql",
  "post-recovery-hardening.sql", "living-map.sql", "living-map-org-and-snapshots.sql", "take-case.sql",
  "phase2-operational-foundation.sql",
  // D — StrayPaw 2.0 release file (applied to production only with the owner's approval)
  "release-2-0-volunteer-isolation.sql",
];
// Deliberately NOT applied: historical one-offs (supabase/README.md), seed files,
// and care-register-records.sql ("PROPOSED, NOT APPLIED" in its header).

/* Local-only text repairs. Repo files are never edited; each repair is
   reported in docs/straypaw-2/STAGING.md as a genuine repo problem. */
const REPAIRS = {
  /* final-site-recovery.sql line 49/78: `as $` … `$;` is not valid dollar
     quoting (PostgreSQL needs `$$` or `$tag$`). The file cannot run as-is. */
  "final-site-recovery.sql": (t) => t.replace(/\nas \$\n/, () => "\nas $$\n").replace(/\n\$;\n/, () => "\n$$;\n"),
};

/* scripts/db-migrate.mjs normalizeRerunnableSql, applied only when the view
   already exists (a re-run). On a FRESH database the normalised
   public_programme_cards references campaigns.source_rows_count, which only
   programme-evidence.sql (later in the set) adds, so `db:migrate all` fails on
   an empty database. Reported in STAGING.md. */
let viewsExist = false;
/* Files applied with check_function_bodies = off (a session setting, not a
   text change). production-recovery.sql's list_org_spatial_cities compares a
   case_status enum to 'open', which is not a value of that enum in any repo
   file, so with body checking on (the Supabase SQL editor default) the whole
   file is rejected. city-scope-correctness.sql later replaces the function. */
const NO_BODY_CHECK = new Set(["production-recovery.sql"]);
function normalize(file, text) {
  if (REPAIRS[file]) text = REPAIRS[file](text);
  if (NO_BODY_CHECK.has(file)) text = "set check_function_bodies = off;\n" + text + "\n;reset check_function_bodies;";
  if (file !== "RUN-PILOT-MIGRATIONS.sql" && file !== "RUN-ALL-MIGRATIONS.sql") return text;
  if (!viewsExist) return text;
  const src = readFileSync(join(root, "scripts", "db-migrate.mjs"), "utf8");
  const grab = (name) => {
    const m = src.match(new RegExp("const " + name + " = `([\\s\\S]*?)`;"));
    if (!m) throw new Error("could not read " + name + " from db-migrate.mjs");
    return m[1];
  };
  return text
    .replace(/create or replace view public_animal_profiles as[\s\S]*?from dogs d left join ngos n on n\.id = d\.ngo_id;/g, grab("animalView"))
    .replace(/create or replace view public_programme_cards as[\s\S]*?group by c\.id, n\.id;/g, grab("programmeView"));
}

const client = new pg.Client({ connectionString: url, ssl: false, statement_timeout: 0 });
await client.connect();

const results = new Map();
let pending = [...ORDER];
for (let pass = 1; pass <= 3 && pending.length; pass++) {
  const failed = [];
  for (const file of pending) {
    const t0 = Date.now();
    viewsExist = (await client.query("select to_regclass('public.public_programme_cards') is not null as e")).rows[0].e;
    const path = file.startsWith("@") ? join(here, file.slice(1)) : join(root, "supabase", file);
    const text = normalize(file, readFileSync(path, "utf8"));
    try {
      await client.query(text);
      results.set(file, { ok: true, pass, ms: Date.now() - t0 });
      console.log(`  ok    ${file}${pass > 1 ? `  (pass ${pass})` : ""}`);
    } catch (err) {
      const line = err.position ? text.slice(0, Number(err.position)).split("\n").length : null;
      await client.query("rollback").catch(() => {});
      results.set(file, { ok: false, pass, error: err.message, code: err.code, line });
      failed.push(file);
      console.log(`  FAIL  ${file}  [${err.code}] ${err.message}${line ? ` (line ${line})` : ""}`);
    }
  }
  if (failed.length === pending.length) break;
  pending = failed;
}
writeFileSync(join(here, ".last-apply.json"), JSON.stringify(Object.fromEntries(results), null, 2));
const bad = [...results].filter(([, r]) => !r.ok);
console.log(`\n${results.size - bad.length}/${results.size} files applied.${bad.length ? " Failed: " + bad.map(([f]) => f).join(", ") : ""}`);
await client.end();
