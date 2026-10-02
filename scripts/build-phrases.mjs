/* Builds the per-language phrase dictionaries DomTranslator reads, from
   the extracted English strings and the translated chunks (keyed by the
   string's index). Run after extracting strings and adding chunks:

     node scripts/build-phrases.mjs <strings.json> <chunk dir>
*/
import fs from "node:fs";
import path from "node:path";
const [,, stringsFile, chunkDir] = process.argv;
const LANGS = ["hi", "ta", "te", "kn"];
const rows = JSON.parse(fs.readFileSync(stringsFile, "utf8"));
const out = Object.fromEntries(LANGS.map((l) => [l, {}]));
let filled = 0, bad = 0;
for (const f of fs.readdirSync(chunkDir).filter((f) => /^c\d+\.json$/.test(f)).sort()) {
  const chunk = JSON.parse(fs.readFileSync(path.join(chunkDir, f), "utf8"));
  for (const [i, tr] of Object.entries(chunk)) {
    const row = rows[Number(i)];
    if (!row || !Array.isArray(tr) || tr.length !== 4) { bad++; continue; }
    LANGS.forEach((l, k) => { if (tr[k] && tr[k] !== row.s) out[l][row.s] = tr[k]; });
    filled++;
  }
}
for (const l of LANGS) fs.writeFileSync(`src/lib/i18n/phrases/${l}.json`, JSON.stringify(out[l], null, 0) + "\n");
const byP = [1, 2, 3].map((p) => { const ids = rows.map((r, i) => [r, i]).filter(([r]) => r.p === p); return `P${p} ${ids.filter(([r]) => out.hi[r.s]).length}/${ids.length}`; });
console.log(`translated ${filled} strings (${bad} malformed) · coverage ${byP.join(" · ")}`);
