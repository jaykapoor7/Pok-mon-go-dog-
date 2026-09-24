/* Builds the public spatial dataset from the live register and prints its
   size and a few readings. Reads only the public views. Usage:
   npm run spatial:probe (needs NEXT_PUBLIC_SUPABASE_URL and _ANON_KEY). */
import { createClient } from "@supabase/supabase-js";
import { readPublicRows, assemble } from "../src/lib/spatial/build";
import { buildIndex, cellStats, NO_FILTERS } from "../src/lib/spatial/engine";
import { gzipSync } from "node:zlib";
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
(async () => {
  const t0 = Date.now();
  const rows = await readPublicRows(supa);
  const t1 = Date.now();
  const ds = assemble(rows, "public");
  const json = JSON.stringify(ds);
  console.log({ read_ms: t1 - t0, build_ms: Date.now() - t1, animals: rows.animals.length, cases: rows.cases.length, care: rows.care.length, sightings: rows.sightings.length, cells: ds.cells.length, frontier: ds.frontier.length, next: ds.next.length, bytes: json.length, gz: gzipSync(json).length });
  console.log(ds.cities.map(c => `${c.name}/${c.state}: ${c.animals} animals, ${c.cases} cases`).join("\n"));
  const ix = buildIndex(ds);
  const st = cellStats(ds, ix, ds.today, NO_FILTERS, 0);
  const cov: Record<string, number> = {};
  st.forEach(s => cov[s.coverage] = (cov[s.coverage] ?? 0) + 1);
  console.log("coverage", cov, "max animals in a cell", Math.max(...st.map(s => s.animals)), "open", st.reduce((a, s) => a + s.open, 0));
  console.log("next", ds.next.slice(0, 3).map(n => n.locality + ": " + n.reasons.join("; ")));
  console.log("orgs", ds.dict.org);
})();
