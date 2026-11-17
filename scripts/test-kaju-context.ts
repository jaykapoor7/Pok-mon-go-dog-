/* Kaju understands where the person is and what they wrote, without a model: the record open on a page, Hindi written
   in Devanagari, and the organisation's own approved procedures. The record store is the in-memory double from
   test-kaju-fixtures.ts; fake data only; fetch is replaced so no request can leave. Run: npm run test:kaju-context */
import assert from "node:assert/strict";
import { withTools } from "../src/sp3/ai/engine";
import type { ToolCtx } from "../src/sp3/ai/tools";
import { fromDevanagari, hasDevanagari } from "../src/sp3/ai/hindi";
import { startersFor } from "../src/nx/kaju/here";
import { CASE_MAX, ME, ORG, OTHER_ORG, TIGER, fakeDb, ngoWorld } from "./test-kaju-fixtures";

let n = 0;
const ok = (m: string) => console.log(`ok ${++n} - ${m}`);
const quiet = <T>(f: () => Promise<T>) => { const i = console.info, w = console.warn; console.info = () => {}; console.warn = () => {}; return f().finally(() => { console.info = i; console.warn = w; }); };

async function main() {
  const real = globalThis.fetch; let network = 0;
  globalThis.fetch = (async () => { network++; throw Error("no network"); }) as typeof fetch;
  const world = (extra: Record<string, Record<string, unknown>[]> = {}, opts: { pagePath?: string; subject?: ToolCtx["subject"] } = {}) => {
    const w = ngoWorld(); const f = fakeDb({ ...w.tables, ...extra }, w.rpcs);
    const ctx: ToolCtx = { db: f.db, orgId: ORG, userId: ME, userName: "Asha Menon", actorRole: "coordinator", pagePath: opts.pagePath ?? "/ngo/today", subject: opts.subject, workspace: "ngo" };
    return { ctx, ...f };
  };
  const ask = (q: string, ctx: ToolCtx) => quiet(() => withTools(q, ctx));

  /* ── Starting points for the record on the page ───────────────────── */
  assert.deepEqual(startersFor(`/ngo/cases/${CASE_MAX}`).map((s) => s.label), ["Summarise this case", "Follow up next week", "Add a note"]);
  assert.deepEqual(startersFor(`/ngo/animals/${TIGER}?tab=care`).map((s) => s.label), ["Record a vaccination today", "Check on it next week", "Add a note"]);
  assert.deepEqual(startersFor(`/gov/verification/${CASE_MAX}`).map((s) => s.label), ["Check this package"]);
  assert.deepEqual(startersFor("/ngo/cases"), []); assert.deepEqual(startersFor(`/health/bites/${CASE_MAX}`), []);
  ok("record pages offer two or three starting points; lists and health pages offer none");

  const onCase = { pagePath: `/ngo/cases/${CASE_MAX}`, subject: { caseId: CASE_MAX } };
  let w = world({}, onCase);
  let r = await ask("Summarise this case", w.ctx);
  assert.ok(r.tools.some((t) => t.name === "case_summary"), r.text); assert.equal(r.proposals.length, 0);
  ok("“Summarise this case” on a case page summarises that case and changes nothing");
  w = world({}, onCase);
  r = await ask("Remind me to follow up on this case next week", w.ctx);
  assert.ok(r.proposals.length >= 1, r.text); assert.ok(r.proposals.every((p) => p.kind === "add_task" || p.kind === "schedule_followup"));
  assert.ok(w.log.writes.every((x) => x.table === "ai_action_log"), "nothing saved before Confirm");
  ok("“Follow up next week” on a case page prepares a follow-up for that case; nothing is saved before Confirm");
  w = world({}, { pagePath: `/ngo/animals/${TIGER}`, subject: { dogId: TIGER } });
  r = await ask(startersFor(`/ngo/animals/${TIGER}`)[0].text, w.ctx);
  const care = r.proposals.find((p) => p.kind === "record_care") as { dogId?: string; careKind?: string } | undefined;
  assert.ok(care && care.dogId === TIGER && care.careKind === "vaccination", r.text);
  ok("“Record a vaccination today” on an animal page prepares care for that animal");
  w = world({}, onCase);
  r = await ask("Tiger was limping again this evening near the market gate", w.ctx);
  const note = r.proposals.find((p) => p.kind === "add_note") as { caseId?: string } | undefined;
  assert.ok(note && note.caseId === CASE_MAX, r.text);
  ok("a plain statement typed while a case is open becomes a note prepared on that case");

  for (const path of [`/gov/verification/${CASE_MAX}`, `/ngo/submissions/${CASE_MAX}`]) {
    w = world({}, { pagePath: path }); w.ctx.actorRole = path.startsWith("/gov") ? "municipal_reviewer" : "coordinator";
    r = await ask(startersFor(path)[0].text, w.ctx);
    assert.ok(r.tools.some((t) => t.name === "check_package"), `${path}: ${r.text}`);
  }
  ok("“Check this package” works on today's package pages (it only knew the retired addresses before)");

  /* ── Hindi in Devanagari ─────────────────────────────────────────── */
  assert.equal(fromDevanagari("खुले केस कितने हैं"), "open case how many");
  assert.equal(fromDevanagari("इस केस का सारांश दिखाओ"), "show this case summary");
  assert.equal(fromDevanagari("वार्ड १२ में कितने केस खुले हैं"), "ward 12 in how many case open");
  assert.equal(fromDevanagari("नियम के अनुसार"), "नियम अनुसार", "a word is never matched inside a longer word");
  assert.equal(fromDevanagari("Tiger की हालत"), "Tiger हालत", "names in Latin letters pass through");
  assert.equal(fromDevanagari("how many open cases"), "how many open cases"); assert.ok(!hasDevanagari("kitne case"));
  ok("Devanagari words become the words the rules know; particles drop; whole words only; names untouched");
  w = world();
  const hi = await ask("खुले केस कितने हैं", w.ctx);
  w = world();
  const en = await ask("how many open cases", w.ctx);
  assert.deepEqual(hi.tools.map((t) => t.name), en.tools.map((t) => t.name), `${hi.text}\n---\n${en.text}`);
  assert.ok(hi.tools.some((t) => t.name === "query_cases"));
  ok("a question in Hindi runs the same record check as the same question in English");
  w = world({}, onCase);
  r = await ask("इस केस का सारांश दिखाओ", w.ctx);
  assert.ok(r.tools.some((t) => t.name === "case_summary"), r.text);
  ok("“इस केस का सारांश दिखाओ” on a case page summarises that case");

  /* ── The organisation's own procedures ──────────────────────────── */
  const day = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
  const memory = [
    { id: "m1", org_id: ORG, scope: "org", kind: "procedure", title: "Bite incident follow-up", body: "Within 24 hours: find the animal, start 10-day observation, inform the hospital that referred it.", approved_at: "2026-11-01T00:00:00Z", valid_until: null, revoked_at: null, created_by: ME, source_kind: "person", source_ref: null, created_at: "2026-11-01T00:00:00Z" },
    { id: "m2", org_id: ORG, scope: "org", kind: "procedure", title: "Bite incident draft (not approved)", body: "DRAFT: call the police first.", approved_at: null, valid_until: null, revoked_at: null, created_by: ME, source_kind: null, source_ref: null, created_at: "2026-11-02T00:00:00Z" },
    { id: "m3", org_id: ORG, scope: "org", kind: "procedure", title: "Old bite rule", body: "EXPIRED rule.", approved_at: "2026-01-01T00:00:00Z", valid_until: day(-3), revoked_at: null, created_by: ME, source_kind: null, source_ref: null, created_at: "2026-01-01T00:00:00Z" },
    { id: "m4", org_id: ORG, scope: "org", kind: "procedure", title: "Revoked bite rule", body: "REVOKED rule.", approved_at: "2026-01-01T00:00:00Z", valid_until: null, revoked_at: "2026-02-01T00:00:00Z", created_by: ME, source_kind: null, source_ref: null, created_at: "2026-01-01T00:00:00Z" },
    { id: "m5", org_id: OTHER_ORG, scope: "org", kind: "procedure", title: "Other NGO bite rule", body: "OTHER ORG rule.", approved_at: "2026-01-01T00:00:00Z", valid_until: null, revoked_at: null, created_by: "x", source_kind: null, source_ref: null, created_at: "2026-01-01T00:00:00Z" },
  ];
  w = world({ nx_kaju_memory: memory });
  r = await ask("what is our procedure for a bite incident?", w.ctx);
  assert.ok(r.tools.some((t) => t.name === "org_procedures")); assert.match(r.text, /Within 24 hours/);
  for (const bad of ["DRAFT", "EXPIRED", "REVOKED", "OTHER ORG"]) assert.ok(!r.text.includes(bad), `never uses ${bad}`);
  assert.ok(r.citations.some((c) => c.href === "/kaju/rules"));
  ok("“what is our procedure…” quotes the organisation's approved entry, linked to its source; drafts, expired, revoked and other organisations' entries are never used");
  w = world({ nx_kaju_memory: [] });
  r = await ask("how do we handle a dog stuck in a drain?", w.ctx);
  assert.match(r.text, /Nothing is written down/); assert.ok(!/drain/i.test(r.text.replace(/how do we handle a dog stuck in a drain\??/i, "")), "no invented procedure");
  ok("with nothing written down, Kaju says so and where to add it, instead of inventing a procedure");
  w = world({ nx_kaju_memory: memory }); w.ctx.orgId = null;
  r = await ask("what is our SOP for bites", w.ctx);
  assert.ok(!r.tools.some((t) => t.name === "org_procedures")); ok("without an organisation, no organisation procedures are read");

  assert.equal(network, 0); globalThis.fetch = real; ok("no network request was made");
  console.log(`\nKaju context, Hindi and procedures: ${n} checks passed`);
}
main().catch((e) => { console.error(e); process.exit(1); });
