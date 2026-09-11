#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Assemble supabase/RUN-PILOT-MIGRATIONS.sql from its parts.
//
// The bundle used to be maintained by hand, and twice a section drifted
// behind the file it was copied from — once for ward_density, once for
// org_team_codes. Both times the standalone file was correct, the bundle
// was stale, and the error surfaced only in someone's production database.
//
// A copy that can drift is a copy that will. So the bundle is generated,
// `npm run db:bundle` rewrites it, and `--check` fails if it is out of
// date. Never edit RUN-PILOT-MIGRATIONS.sql directly; edit the part.
// ─────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = (f) => join(root, "supabase", f);
const OUT = "RUN-PILOT-MIGRATIONS.sql";

/* Order is dependency order and is the reason this file exists. */
const PARTS = [
  ["observation-identity.sql", "One animal, many observations, and never a guess about which"],
  ["analytics.sql", "Product analytics for the reporting funnel"],
  ["adoption-and-documents.sql", "Documents attached to records (adoption listings unused)"],
  ["no-similarity-merge.sql", "Removes merging animals that merely look alike"],
  ["abc-programme.sql", "Sterilisation and rabies status, three-valued"],
  ["org-invite-codes.sql", "Volunteer reporting codes"],
  ["org-email-invites.sql", "Organisation membership, moderation, and deleting an org"],
  ["org-access-codes.sql", "One standing six-character sign-in code per person"],
  /* Was in the repo but in no bundle, so a database built from this file
     had no personal_access_codes table and every community or feeder
     sign-in failed on a missing relation. */
  ["personal-access-codes.sql", "Personal codes for residents and feeders"],
  ["campaigns.sql", "Drives, filing observations, and what counts as nearby"],
  ["public-dataset.sql", "The published dataset: one citable row per survey"],
  ["ward-density.sql", "Ward/district boundaries and the coverage headline"],
  ["map-search.sql", "Searching wards and districts, and the India-only mask"],
];

const RULE = "═".repeat(64);
const box = (name) =>
  `-- ┏${"━".repeat(62)}\n-- ┃ ${name}\n-- ┗${"━".repeat(62)}\n`;

const contents = PARTS.map(
  ([f, why], i) =>
    `--  ${String(i + 1).padStart(2)}. ${f.padEnd(28)} ${why}`
).join("\n");

const header = `-- ${RULE}
-- StrayPaw, the PAWS Chennai pilot migrations, in one file.
--
-- GENERATED FILE — DO NOT EDIT.
--
-- Built from the files listed below by scripts/build-bundle.mjs. Edit the
-- part, then run \`npm run db:bundle\`. Editing this file directly is how
-- two sections silently drifted behind their sources and failed in
-- production long after the real bug had been fixed.
--
-- HOW TO RUN THIS
--
-- Supabase dashboard → SQL Editor → New query → paste this whole file →
-- Run. Or skip the pasting entirely:
--
--     npm run db:migrate -- pilot
--
-- which runs this and the boundary files in order and tells you what
-- landed. See supabase/README.md.
--
-- It assumes the base schema is already there: dogs, sightings, ngos,
-- ngo_members, my_ngo(). On a brand new Supabase project run
-- RUN-ALL-MIGRATIONS.sql first, then this.
--
-- Safe to run again, from any state, however badly a previous attempt
-- went. Nothing here destroys anything you typed in — the one table that
-- is rebuilt rather than migrated, wards, holds only imported boundaries,
-- and section 11 says so.
--
-- Contents, in dependency order:
${contents}
--
-- After this file, load the boundaries:
--     districts-india-1of5.sql … -5of5.sql   641 districts, national tier
--     wards-chennai.sql                      200 GCC wards, pilot tier
-- ${RULE}

`;

const body = PARTS.map(([f]) => `\n${box(f)}\n${readFileSync(sql(f), "utf8").trimEnd()}\n`).join("\n");
const built = header + body;

if (process.argv.includes("--check")) {
  const current = readFileSync(sql(OUT), "utf8");
  if (current !== built) {
    console.error(`${OUT} is out of date. Run: npm run db:bundle`);
    process.exit(1);
  }
  console.log(`${OUT} is up to date.`);
} else {
  writeFileSync(sql(OUT), built);
  console.log(`Wrote ${OUT} from ${PARTS.length} parts (${(built.length / 1024).toFixed(0)} KB).`);
}
