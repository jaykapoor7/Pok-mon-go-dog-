/** Register figures on a register larger than one API page (npx tsx scripts/test-data-figures.ts).
 *
 * The database API returns at most 1,000 rows to a request whatever `.limit()` asks (checked on production). The fake
 * client below keeps that cap, so a figure that reads one page and calls it the whole fails here. The register is
 * shaped like The Pawsome People Project's on production (18 Nov 2026, read-only): 2,277 animals, 102 sterilised,
 * 67 vaccinated, the rest with no status recorded, the sterilised ones mostly older than the newest 1,000. */
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { figureRows, programmeFigures } from "../src/sp3/ai/figures";
import { allRows } from "../src/lib/all-rows";

const API_CAP = 1000, NOW = Date.parse("2026-11-18T06:00:00Z"), DAY = 864e5;
type Row = Record<string, unknown>;
const dogs: Row[] = Array.from({ length: 2277 }, (_, i) => ({
  id: `d${String(i).padStart(5, "0")}`, ngo_id: "paw", zone: i % 7 ? `Ward ${i % 12}` : null,
  /* Newest first by index: the newest 1,000 hold only 83 of the 102 sterilised and 40 of the 67 vaccinated, as on production. */
  sterilisation_status: (i < 1000 ? i % 12 === 0 && i < 996 : i % 66 === 0) ? "sterilised" : "unknown",
  vaccination_status: (i < 1000 ? i % 25 === 0 : i % 47 === 0) ? "vaccinated" : "unknown",
  created_at: new Date(NOW - i * 0.4 * DAY).toISOString(),
}));
const facts: Row[] = [{ id: "c1", ngo_id: "paw", status_class: "in_progress", provenance: "community_report", reviewed_at: null }, { id: "c2", ngo_id: "paw", status_class: "open", provenance: "community_report", reviewed_at: null }];
const TABLES: Record<string, Row[]> = { dogs, org_case_facts: facts };

/** Enough of PostgREST's query builder for these reads: eq, in, gte, is, or (a.op.v,...), order, range, head counts. */
function fake(): SupabaseClient {
  const from = (table: string) => {
    let rows = [...(TABLES[table] ?? [])], head = false, count = false, range: [number, number] | null = null;
    const val = (v: string) => (v === "null" ? null : v);
    const test = (r: Row, col: string, op: string, v: string) => op === "eq" ? r[col] === val(v) : op === "neq" ? r[col] !== val(v) : op === "is" ? (v === "null" ? r[col] == null : r[col] != null) : op === "not" ? (v.startsWith("is.null") ? r[col] != null : true) : true;
    const b: Record<string, unknown> = {
      select: (_: string, o?: { count?: string; head?: boolean }) => { head = !!o?.head; count = !!o?.count; return b; },
      eq: (c: string, v: unknown) => { rows = rows.filter((r) => r[c] === v); return b; },
      in: (c: string, v: unknown[]) => { rows = rows.filter((r) => v.includes(r[c])); return b; },
      gte: (c: string, v: string) => { rows = rows.filter((r) => String(r[c]) >= v); return b; },
      is: (c: string, v: null) => { rows = rows.filter((r) => r[c] === v); return b; },
      or: (s: string) => { const parts = s.split(",").map((p) => { const [c, ...rest] = p.split("."); const op = rest[0], v = rest.slice(1).join("."); return { c, op, v }; }); rows = rows.filter((r) => parts.some((p) => test(r, p.c, p.op, p.v))); return b; },
      order: () => b,
      range: (f: number, t: number) => { range = [f, t]; return b; },
      then: (res: (x: unknown) => void) => {
        const n = rows.length, page = head ? null : (range ? rows.slice(range[0], Math.min(range[1] + 1, range[0] + API_CAP)) : rows.slice(0, API_CAP));
        return Promise.resolve({ data: page, error: null, count: count ? n : null }).then(res);
      },
    };
    return b;
  };
  return { from, rpc: async () => ({ data: [], error: null }) } as unknown as SupabaseClient;
}

let checks = 0;
const ok = (label: string) => console.log(`ok ${++checks} - ${label}`);

const st = dogs.filter((d) => d.sterilisation_status === "sterilised").length, vx = dogs.filter((d) => d.vaccination_status === "vaccinated").length;
assert.equal(st, 102); assert.equal(vx, 67);
const newest = dogs.slice(0, 1000);
assert.equal(newest.filter((d) => d.sterilisation_status === "sterilised").length, 83); ok("the fake register is shaped like Pawsome's: 102 sterilised, 83 of them in the newest 1,000");

(async () => {
  const pages = await allRows((f, t) => (fake().from("dogs") as unknown as { select: (s: string) => { range: (f: number, t: number) => PromiseLike<{ data: unknown; error: unknown }> } }).select("id").range(f, t));
  assert.equal(pages.rows.length, 2277); assert.equal(pages.capped, false); ok("allRows reads past the API's 1,000-row cap");
  const capped = await allRows((f, t) => (fake().from("dogs") as unknown as { select: (s: string) => { range: (f: number, t: number) => PromiseLike<{ data: unknown; error: unknown }> } }).select("id").range(f, t), 1500);
  assert.equal(capped.rows.length, 1500); assert.equal(capped.capped, true); ok("allRows stops at its own limit and says so");
  await assert.rejects(allRows(async () => ({ data: null, error: { message: "boom" } })), /boom/); ok("a failed page is an error, never a short list");

  const f = await programmeFigures(fake(), "paw", NOW);
  assert.equal(f.animals, 2277); ok("animals: 2,277");
  assert.equal(f.sterilised, 102, "sterilised counts the whole register, not the newest 1,000 (83)"); ok("sterilised: 102, not 83");
  assert.equal(f.sterilisationUnknown, 2175); ok("sterilisation not recorded: 2,175, not 917");
  assert.equal(f.vaccinated, 67); assert.equal(f.vaccinationUnknown, 2210); ok("vaccinated: 67, with 2,210 not recorded");
  assert.equal(f.openCases, 2); ok("open cases in current work: 2");
  assert.equal(f.wards.reduce((a, w) => a + w.recorded, 0) + f.noWard, 2277); ok("the ward table covers every animal");
  const rows = figureRows(f);
  const ster = rows.find((r) => r[0] === "Sterilisation recorded")!;
  assert.equal(ster[1], 102); assert.match(String(ster[2]), /^4% of the animals on the register; 2,175 not recorded$/); ok(`report row: ${ster[2]}`);
  assert.doesNotMatch(rows.map((r) => r.join(" ")).join("\n"), /\bunknown\b/); ok("the report says “not recorded”, never “unknown” as if it were no");
  console.log(`\n${checks} checks passed`);
})().catch((e) => { console.error(e); process.exit(1); });
