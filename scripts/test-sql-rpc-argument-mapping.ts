import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/* Guards the class of bug where a SQL function's INSERT lists its columns in
   one order and its values in another.

   add_comment shipped with `insert into comments (dog_id, reporter_name, body)
   values (p_dog_id, p_body, p_reporter_name)`, so every comment was stored as
   its author's name and every author's name as the comment. It type-checked,
   it ran, and nothing caught it, because both columns are text.
   
   This reads the migrations as text rather than talking to a database, so it
   runs in CI with no credentials and fails the build the moment a transposed
   mapping is reintroduced. */

const SQL_DIR = path.join(process.cwd(), "supabase");

/** Column name → the parameter that must supply it, for the mappings that
 *  have actually been wrong. Extend this as new ones are found. */
const EXPECTED: Record<string, Record<string, string>> = {
  add_comment: {
    dog_id: "p_dog_id",
    reporter_name: "p_reporter_name",
    body: "p_body",
  },
  log_feed: {
    dog_id: "p_dog_id",
    reporter_name: "p_reporter_name",
    food_type: "p_food_type",
  },
};

/* Built with RegExp rather than a literal so the dotAll flag does not need a
   newer tsconfig target than the rest of the repo compiles against. */
const INSERT_RE = new RegExp(
  "insert\\s+into\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*values\\s*\\(([^)]*)\\)",
  "gi",
);

const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

let checked = 0;

for (const file of readdirSync(SQL_DIR).filter((f) => f.endsWith(".sql"))) {
  const sql = readFileSync(path.join(SQL_DIR, file), "utf8");

  for (const [fn, mapping] of Object.entries(EXPECTED)) {
    /* Take each definition of this function, up to the end of its body. */
    const defRe = new RegExp(
      `create\\s+or\\s+replace\\s+function\\s+${fn}\\s*\\([\\s\\S]*?\\$\\$[\\s\\S]*?\\$\\$`,
      "gi",
    );
    for (const def of sql.match(defRe) ?? []) {
      for (const m of def.matchAll(INSERT_RE)) {
        const cols = split(m[2]);
        const vals = split(m[3]);
        if (cols.length !== vals.length) continue;

        cols.forEach((col, i) => {
          const want = mapping[col];
          if (!want) return; // column this test has no opinion about
          assert.equal(
            vals[i],
            want,
            `${file}: ${fn}() inserts "${vals[i]}" into "${col}", expected "${want}". ` +
              `Column and value lists are transposed.`,
          );
          checked += 1;
        });
      }
    }
  }
}

assert.ok(
  checked > 0,
  "No add_comment/log_feed INSERT mappings were found to check. The migrations " +
    "moved or were renamed, and this regression test is no longer guarding anything.",
);

console.log(`SQL RPC argument mapping regression passed: ${checked} column mappings verified.`);
