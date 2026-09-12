/* ════════════════════════════════════════════════════════════════════
   Fail the build if a page ships a fixture.

   This exists because it happened. A hardcoded list of ten animals, used
   to develop the landing page against without a database, went out on
   main: a stranger's photograph under Pinky's name, five pins on a map of
   Delhi, and two invented counts on a site whose whole claim is that its
   numbers are real.

   Nothing subtle is being detected here. These are the exact shapes the
   development fixtures took, and none of them has any business inside a
   page or a layout.
   ════════════════════════════════════════════════════════════════════ */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src/app";

const BANNED = [
  {
    pattern: /as unknown as Awaited<ReturnType<typeof \w+>>/,
    why: "a hardcoded array cast to the shape of a data function",
  },
  { pattern: /"id":\s*"fx-\d/, why: "a fixture row (fx-*)" },
  { pattern: /\bFIXTURE\b/, why: "a fixture marker" },
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/(page|layout|route)\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

let bad = 0;
for (const file of walk(ROOT)) {
  const source = readFileSync(file, "utf8");
  for (const { pattern, why } of BANNED) {
    if (pattern.test(source)) {
      console.error(`  ${file}\n    contains ${why}`);
      bad++;
    }
  }
}

if (bad > 0) {
  console.error(
    `\nno-fixtures: ${bad} problem${bad === 1 ? "" : "s"}. A page must get its` +
      ` data from the database, never from a literal written to develop against.\n`
  );
  process.exit(1);
}
console.log("no-fixtures: clean");
