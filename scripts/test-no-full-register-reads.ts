/**
 * Guard: public data paths must never read the whole register.
 *
 * The production recovery removed a cluster of dead helpers that paged the
 * entire public register (getAllDogs via readPages) and ran unbounded
 * exact-count / select("*") reads over public_animal_profiles and
 * public_field_activity. This test fails if any of them — or the unbounded
 * `readPages` pager itself — is reintroduced, so the performance contract in
 * docs/ARCHITECTURE.md ("no visitor request reads the whole register") stays
 * enforced in CI rather than by memory.
 *
 * It is a static source check: no database or network access required.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const read = (p: string) => readFileSync(p, "utf8");
const failures: string[] = [];

// 1. The removed full-register helpers must stay gone.
const BANNED_DEFINITIONS = [
  "getAllDogs",
  "getAllSightings",
  "getPublicFieldActivity",
  "getDashboardMetrics",
  "getZoneCoverage",
  "getCityStats",
  "countDogs",
  "countUnchecked",
];
for (const p of files) {
  const src = read(p);
  for (const name of BANNED_DEFINITIONS) {
    if (new RegExp(`function\\s+${name}\\b`).test(src)) {
      failures.push(`${p}: reintroduced full-register helper "${name}"`);
    }
  }
}

// 2. The unbounded offset pager must not come back. Every public read is
//    bounded by an explicit .limit()/.in()/.eq() instead.
for (const p of files) {
  if (/\breadPages\s*[<(]/.test(read(p))) {
    failures.push(`${p}: unbounded "readPages" register pager is forbidden`);
  }
}

// 3. The bounded public data modules must keep their hard caps.
const CAP_GUARDS: Array<[string, string]> = [
  ["src/lib/spatial/server.ts", "MAX_CITIES"],
  ["src/lib/spatial/server.ts", "MAX_CELLS"],
  ["src/lib/landing/story.ts", "LANDING_LIMITS"],
];
for (const [rel, token] of CAP_GUARDS) {
  const p = join(process.cwd(), rel);
  if (!read(p).includes(token)) {
    failures.push(`${rel}: expected bounding constant "${token}" is missing`);
  }
}

if (failures.length) {
  console.error("Full-register read guard FAILED:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}

console.log(`No-full-register-read guard passed: scanned ${files.length} source files.`);
