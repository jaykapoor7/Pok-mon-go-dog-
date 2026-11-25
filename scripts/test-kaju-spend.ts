/* Kaju's paid-model safeguards and its tool-use loop, with a scripted model.
   No network: fetch is replaced for the whole run. Every model "response" below is written by this test; these checks
   prove the application's control flow, limits and accounting, not the real model's reasoning or provider availability. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";

let n = 0;
const ok = (m: string) => console.log(`ok ${++n} - ${m}`);
const OWNER = "0b9a3c1e-1f2a-4c3d-9e8f-123456789abc";
const BASE = { STRAYPAW_AI_MODE: "model", STRAYPAW_AI_AUTHORISED_BY: "owner:2026-11-17", STRAYPAW_AI_MONTHLY_CEILING_INR: "300", STRAYPAW_AI_USER_DAILY_REQUESTS: "30", STRAYPAW_AI_ORG_DAILY_REQUESTS: "100", STRAYPAW_AI_INR_PER_MTOK_IN: "360", STRAYPAW_AI_INR_PER_MTOK_OUT: "1800" } as const;
type Usage = Awaited<ReturnType<NonNullable<Parameters<typeof import("../src/lib/ai/inference").setInferenceLedger>[0]>["usage"]>>;
const ledgerRow = (o: Partial<NonNullable<Usage>> = {}): NonNullable<Usage> => ({ userToday: 0, orgToday: 0, monthInr: 0, live: true, userGrant: { monthlyBudgetInr: 100, dailyRequests: 20 }, orgGrant: null, userMonthInr: 0, orgMonthInr: 0, ...o });

async function main() {
  const realFetch = globalThis.fetch;
  let network = 0;
  globalThis.fetch = (async () => { network++; throw Error("no network in tests"); }) as typeof fetch;
  const inf = await import("../src/lib/ai/inference");
  const { inferenceAllowed, inferenceConfig, setInferenceLedger, nextCallAffordable, runAllowanceInr, usageCostInr } = inf;
  const recorded: { model: string; inputTokens: number; outputTokens: number; costInr: number }[] = [];
  /* A ledger double with the database's reservation rule: reserve succeeds only while what is spent plus what is reserved
     plus this answer's allowance fits the limit, checked one at a time (the database does this under a lock). */
  const ledgerState = { reserveOk: true, limitInr: Infinity, reserved: 0, spent: 0, reserves: 0, settles: 0 };
  const withLedger = (row: Usage | null, opts: { reserveOk?: boolean; limitInr?: number } = {}) => {
    Object.assign(ledgerState, { reserveOk: opts.reserveOk ?? true, limitInr: opts.limitInr ?? Infinity, reserved: 0, spent: 0, reserves: 0, settles: 0 });
    let chain = Promise.resolve();
    setInferenceLedger({
      usage: async () => row,
      reserve: (_s, l) => { const p = chain.then(async () => { ledgerState.reserves++; if (!ledgerState.reserveOk || ledgerState.spent + ledgerState.reserved + l.amountInr > ledgerState.limitInr) return null; ledgerState.reserved += l.amountInr; return `res-${ledgerState.reserves}`; }); chain = p.then(() => undefined); return p; },
      settle: async (_s, _id, r) => { ledgerState.settles++; recorded.push(r); ledgerState.spent += r.costInr; return true; },
    });
  };
  const scope = (o: Partial<Parameters<typeof inferenceAllowed>[0]> = {}) => ({ purpose: "kaju_chat" as const, userId: OWNER, orgId: "org-1", verified: true, ...o });

  /* ── Who may use the model ───────────────────────────────────────── */
  withLedger(ledgerRow());
  assert.equal(inferenceConfig(BASE).allowed, false, "owner rollout without an owner id");
  assert.equal(inferenceConfig({ ...BASE, STRAYPAW_AI_ROLLOUT: "everyone" }).allowed, false, "unknown rollout");
  assert.equal(inferenceConfig({ ...BASE, STRAYPAW_AI_OWNER_USER_ID: "not-a-uuid" }).allowed, false, "malformed owner id");
  ok("owner-only is the default rollout; without a well-formed owner id, or with an unknown rollout word, the model stays off");
  const OWN = { ...BASE, STRAYPAW_AI_OWNER_USER_ID: OWNER };
  assert.equal((await inferenceAllowed(scope(), OWN)).allowed, true);
  assert.equal((await inferenceAllowed(scope({ userId: "11111111-2222-4333-8444-555555555555" }), OWN)).allowed, false, "someone else");
  assert.equal((await inferenceAllowed(scope({ verified: false }), OWN)).allowed, false, "unverified owner");
  assert.equal((await inferenceAllowed(scope({ verified: undefined }), OWN)).allowed, false, "verification unknown");
  assert.equal((await inferenceAllowed(scope({ userId: null }), OWN)).allowed, false, "guest");
  ok("in owner rollout only the owner's verified account is eligible; other people, unverified sessions and guests are not");
  withLedger(ledgerRow({ live: false }));
  assert.match(String((await inferenceAllowed(scope(), OWN) as { reason?: string }).reason), /switched off in the database/);
  withLedger({ ...ledgerRow(), live: undefined });
  assert.equal((await inferenceAllowed(scope(), OWN)).allowed, false, "switch state unknown");
  withLedger(ledgerRow({ userGrant: null, orgGrant: null }));
  assert.equal((await inferenceAllowed(scope(), OWN)).allowed, false, "no grant");
  withLedger(null);
  assert.equal((await inferenceAllowed(scope(), OWN)).allowed, false, "ledger unreadable");
  setInferenceLedger({ usage: async () => { throw Error("db down"); } });
  assert.equal((await inferenceAllowed(scope(), OWN)).allowed, false, "ledger throws");
  ok("the database switch and a grant are both required; an unknown switch, no grant or an unreadable ledger fails closed");

  /* ── Budgets ─────────────────────────────────────────────────────── */
  const GR = { ...BASE, STRAYPAW_AI_ROLLOUT: "grants" };
  withLedger(ledgerRow());
  assert.equal((await inferenceAllowed(scope({ userId: "u", verified: false }), GR)).allowed, false, "grants mode also needs a verified account");
  withLedger(ledgerRow({ userMonthInr: 100 }));
  assert.match(String((await inferenceAllowed(scope({ userId: "u" }), GR) as { reason?: string }).reason), /Your model budget/);
  withLedger(ledgerRow({ userToday: 20 }));
  assert.equal((await inferenceAllowed(scope({ userId: "u" }), GR)).allowed, false, "person's daily grant cap");
  withLedger(ledgerRow({ userGrant: null, orgGrant: { monthlyBudgetInr: 50, dailyRequests: 10 }, orgMonthInr: 50 }));
  assert.match(String((await inferenceAllowed(scope({ userId: "u" }), GR) as { reason?: string }).reason), /organisation's model budget/);
  withLedger(ledgerRow({ userGrant: null, orgGrant: { monthlyBudgetInr: 50, dailyRequests: 10 } }));
  assert.equal((await inferenceAllowed(scope({ userId: "u", orgId: null }), GR)).allowed, false, "an organisation grant needs the organisation");
  withLedger(ledgerRow({ monthInr: 300 }));
  assert.equal((await inferenceAllowed(scope({ userId: "u" }), GR)).allowed, false, "deployment ceiling");
  withLedger(ledgerRow({ monthInr: 290, userMonthInr: 40, orgGrant: { monthlyBudgetInr: 500, dailyRequests: 100 }, orgMonthInr: 10 }));
  const d = await inferenceAllowed(scope({ userId: "u" }), GR);
  assert.ok(d.allowed); if (d.allowed) { assert.equal(d.budget.remainingInr, 10); assert.equal(runAllowanceInr(d.budget), 10); }
  ok("per-person and per-organisation monthly rupee budgets and daily caps, and the deployment ceiling, are each enforced; the least remaining applies; every rollout needs a verified account");
  const caps = inferenceConfig({ ...GR, STRAYPAW_AI_MAX_OUTPUT_TOKENS: "99999", STRAYPAW_AI_RUN_MAX_INR: "9999", STRAYPAW_AI_MAX_STEPS: "50", STRAYPAW_AI_MAX_CONCURRENT: "500" });
  assert.ok(caps.allowed); if (caps.allowed) { assert.equal(caps.budget.maxOutputTokens, 8000); assert.equal(caps.budget.runCapInr, 100); assert.equal(caps.budget.maxSteps, 6); assert.equal(caps.budget.maxConcurrent, 8); }
  const dflt = inferenceConfig(GR);
  assert.ok(dflt.allowed); if (dflt.allowed) { assert.equal(dflt.budget.maxOutputTokens, 2000); assert.equal(dflt.budget.runCapInr, 10); assert.equal(dflt.budget.maxConcurrent, 2); }
  ok("output tokens, per-answer cost, steps and concurrency have hard ceilings that settings cannot raise; defaults are conservative");
  if (dflt.allowed) {
    const b = { ...dflt.budget, remainingInr: 100 };
    assert.equal(nextCallAffordable(b, { inputTokens: 0, outputTokens: 0 }, 30_000), true);
    assert.equal(nextCallAffordable(b, { inputTokens: 0, outputTokens: 0 }, 60_000), false, "a 20k-token request plus 2k output is ₹10.8");
    assert.equal(nextCallAffordable({ ...b, remainingInr: 2 }, { inputTokens: 0, outputTokens: 0 }, 3_000), false, "month nearly used up");
    assert.equal(usageCostInr(b, { inputTokens: 1_000_000, outputTokens: 1_000_000 }), 2160);
  }
  ok("each model call is checked against the worst case of the call before it is made");

  /* ── The tool-use loop, against a scripted model ─────────────────── */
  const { answer } = await import("../src/sp3/ai/engine");
  const tables: string[] = [], writes: string[] = [];
  const builder: unknown = new Proxy({}, { get: (_, k) => k === "then" ? (res: (r: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(res) : (...a: unknown[]) => { if (["insert", "update", "upsert", "delete"].includes(String(k))) writes.push(String(k)); void a; return builder; } });
  const db = { from: (t: string) => { tables.push(t); return builder; }, rpc: async () => ({ data: [], error: null }), schema: () => db } as unknown as SupabaseClient;
  const ctx = { db, orgId: "org-1", userName: "Owner", userId: OWNER, userVerified: true };
  const LIVE = { ...OWN, ANTHROPIC_API_KEY: "test-key-not-real", STRAYPAW_AI_APPROVED_DATA_ROUTE: "direct:claude-opus-5-5" };
  const saved = Object.fromEntries(Object.keys(LIVE).map((k) => [k, process.env[k]]));
  Object.assign(process.env, LIVE);
  type Script = { stop: string; content: unknown[]; usage?: { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number } };
  let script: Script[] = []; const sent: Record<string, unknown>[] = []; const hosts: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input)); hosts.push(url.host);
    sent.push(JSON.parse(String(init?.body ?? (input instanceof Request ? await input.text() : "{}"))));
    const s = script.shift();
    if (!s) return new Response(JSON.stringify({ type: "error", error: { type: "api_error", message: "scripted failure" } }), { status: 500, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ id: `msg_${sent.length}`, type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: s.stop, stop_sequence: null, content: s.content, usage: s.usage ?? { input_tokens: 2000, output_tokens: 150 } }), { headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const reset = (s: Script[]) => { script = s; sent.length = 0; hosts.length = 0; recorded.length = 0; tables.length = 0; writes.length = 0; };
  try {
    withLedger(ledgerRow());
    reset([
      { stop: "tool_use", content: [{ type: "text", text: "Checking the lessons." }, { type: "tool_use", id: "t1", name: "search_knowledge", input: { query: "unknown status" } }] },
      { stop: "end_turn", content: [{ type: "text", text: "Unknown means the record does not say; it is not zero." }] },
    ]);
    let r = await answer([{ role: "user", text: "what does unknown status mean?" }], ctx, {});
    assert.equal(r.engine, "model"); assert.equal(sent.length, 2);
    assert.ok(r.tools.some((t) => t.name === "search_knowledge" && t.ok));
    assert.ok(r.citations.some((c) => c.href.startsWith("/learn/")), "citations come from the tool's own result");
    assert.ok(hosts.every((h) => h === "api.anthropic.com"));
    assert.equal(sent[0].max_tokens, 2000, "the output allowance is the budget's, not a fixed 4000");
    const second = sent[1].messages as { role: string; content: unknown }[];
    assert.ok(JSON.stringify(second.at(-1)).includes("tool_result"), "the tool's result is returned to the model");
    assert.equal(recorded.length, 1); assert.ok(r.usage && r.usage.costInr > 0 && r.usage.inputTokens === 4000 && r.usage.outputTokens === 300);
    ok("a scripted run: the model asks for a tool, the tool runs on the server, sources come from the tool, usage is metered once");

    reset([{ stop: "end_turn", content: [{ type: "text", text: "ok" }], usage: { input_tokens: 100, output_tokens: 10, cache_creation_input_tokens: 1000, cache_read_input_tokens: 10000 } }]);
    r = await answer([{ role: "user", text: "hello" }], ctx, {});
    assert.equal(r.usage?.inputTokens, 100 + 1250 + 1000); ok("cache writes count at 1.25× and cache reads at 0.1× of input");

    reset([
      { stop: "tool_use", content: [{ type: "tool_use", id: "t1", name: "search_knowledge", input: { query: "coverage" } }], usage: { input_tokens: 20000, output_tokens: 1500 } },
      { stop: "end_turn", content: [{ type: "text", text: "should never be requested" }] },
    ]);
    r = await answer([{ role: "user", text: "explain coverage in detail" }], ctx, {});
    assert.equal(sent.length, 1, "the second call would pass ₹10 and is not made");
    assert.match(r.notice ?? "", /spending limit/); assert.ok(r.tools.length === 1, "work done so far is kept");
    ok("a run stops before the call that could take it past its per-answer allowance, and keeps what it found");

    process.env.STRAYPAW_AI_RUN_MAX_INR = "0.5";
    reset([{ stop: "end_turn", content: [{ type: "text", text: "never" }] }]);
    r = await answer([{ role: "user", text: "hello" }], ctx, {});
    assert.equal(sent.length, 0); assert.match(r.text, /would cost more/); delete process.env.STRAYPAW_AI_RUN_MAX_INR;
    ok("when even one call could exceed the allowance, no call is made");

    reset([
      { stop: "tool_use", content: [{ type: "tool_use", id: "t1", name: "delete_everything", input: {} }] },
      { stop: "end_turn", content: [{ type: "text", text: "That tool is not available." }] },
    ]);
    r = await answer([{ role: "user", text: "delete all cases" }], ctx, {});
    const back = JSON.stringify((sent[1].messages as unknown[]).at(-1));
    assert.ok(back.includes("Tool unavailable") && back.includes("is_error")); assert.equal(writes.length, 0);
    ok("a tool the model invents is refused as an error result; nothing is written");

    reset([
      { stop: "tool_use", content: [{ type: "tool_use", id: "t1", name: "propose_task", input: { title: "Call the vet about Bholu", due_on: new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10) } }] },
      { stop: "end_turn", content: [{ type: "text", text: "Here is what I made: one task. Review and press Confirm." }] },
    ]);
    r = await answer([{ role: "user", text: "remind me to call the vet friday" }], ctx, {});
    assert.ok(r.proposals.some((p) => p.kind === "add_task")); assert.equal(writes.length, 0, "a proposal never writes");
    ok("changes come back as proposals for the person to confirm; the loop itself writes nothing");

    reset([{ stop: "max_tokens", content: [{ type: "text", text: "Half an ans" }] }]);
    r = await answer([{ role: "user", text: "write a long report" }], ctx, {});
    assert.match(r.text, /cut off/); assert.match(r.notice ?? "", /length limit/);
    ok("an answer cut off at the length limit says so instead of passing on half an answer");

    reset([{ stop: "refusal", content: [] }]);
    r = await answer([{ role: "user", text: "something unsafe" }], ctx, {});
    assert.equal(r.text, "I can't help with that request."); ok("a refusal is reported plainly");

    withLedger(ledgerRow()); reset([]);
    r = await answer([{ role: "user", text: "how many open cases" }], ctx, {});
    assert.equal(r.engine, "tools"); assert.match(r.notice ?? "", /temporarily limited/); assert.equal(sent.length, 1);
    assert.equal(ledgerState.settles, 1, "the failed run is still settled");
    ok("a provider error falls back to the record tools and says so; the failed call is not retried, and its reservation is settled");

    withLedger(ledgerRow(), { reserveOk: false }); reset([{ stop: "end_turn", content: [{ type: "text", text: "x" }] }]);
    r = await answer([{ role: "user", text: "how many open cases" }], ctx, {});
    assert.equal(sent.length, 0); assert.equal(r.engine, "tools"); assert.match(r.notice ?? "", /could not be reserved/);
    ok("when the answer's spending cannot be reserved (no server connection, budget taken by other runs, database down), no model request is made");

    /* Ten answers at once with room for three: the reservations decide, so only three reach the model. */
    withLedger(ledgerRow(), { limitInr: 30 });
    reset(Array.from({ length: 10 }, () => ({ stop: "end_turn", content: [{ type: "text", text: "ok" }], usage: { input_tokens: 10, output_tokens: 1 } })));
    const burst = await Promise.all(Array.from({ length: 10 }, () => answer([{ role: "user", text: "hello" }], ctx, {})));
    assert.equal(sent.length, 3, "three model requests"); assert.equal(burst.filter((x) => x.engine === "model").length, 3);
    assert.equal(ledgerState.reserves, 10); assert.equal(ledgerState.settles, 3);
    ok("a burst of ten parallel answers with budget for three makes exactly three model requests; the rest answer by fixed rules");
    withLedger(ledgerRow());

    reset([
      ...Array.from({ length: 6 }, (_, i) => ({ stop: "tool_use", content: [{ type: "tool_use", id: `t${i}`, name: "search_knowledge", input: { query: "evidence" } }], usage: { input_tokens: 500, output_tokens: 20 } })),
      { stop: "end_turn", content: [{ type: "text", text: "never reached" }] },
    ]);
    r = await answer([{ role: "user", text: "keep searching" }], ctx, {});
    assert.equal(sent.length, 6); assert.match(r.notice ?? "", /incomplete/); ok("a run never takes more than six model calls");

    for (const [label, env, row] of [
      ["the database switch is off", {}, ledgerRow({ live: false })],
      ["the account is not the owner", { STRAYPAW_AI_OWNER_USER_ID: "11111111-2222-4333-8444-555555555555" }, ledgerRow()],
      ["the data route is not approved", { STRAYPAW_AI_APPROVED_DATA_ROUTE: "direct:some-other-model" }, ledgerRow()],
      ["inference mode is off", { STRAYPAW_AI_MODE: "tools_only" }, ledgerRow()],
    ] as const) {
      const before = { ...process.env }; Object.assign(process.env, env); withLedger(row); reset([{ stop: "end_turn", content: [{ type: "text", text: "x" }] }]);
      r = await answer([{ role: "user", text: "how many open cases" }], ctx, {});
      assert.equal(sent.length, 0, label); assert.equal(r.engine, "tools", label);
      for (const k of Object.keys(env)) process.env[k] = before[k];
    }
    reset([{ stop: "end_turn", content: [{ type: "text", text: "x" }] }]); withLedger(ledgerRow());
    r = await answer([{ role: "user", text: "how many open cases" }], { ...ctx, userVerified: false }, {});
    assert.equal(sent.length, 0); ok("with the switch off, another account, an unapproved route, tools-only mode or an unverified session, no model request is made");

    /* The mission planner obeys the same gate, route approval and reservations. */
    const { modelPlanner } = await import("../src/lib/kaju/claude");
    withLedger(ledgerRow());
    process.env.STRAYPAW_AI_APPROVED_DATA_ROUTE = "direct:some-other-model";
    assert.equal(await modelPlanner({ purpose: "kaju_chat", userId: OWNER, orgId: "org-1", verified: true }), null, "unapproved route");
    process.env.STRAYPAW_AI_APPROVED_DATA_ROUTE = LIVE.STRAYPAW_AI_APPROVED_DATA_ROUTE;
    assert.equal(await modelPlanner({ purpose: "kaju_chat", userId: OWNER, orgId: "org-1", verified: false }), null, "unverified");
    withLedger(ledgerRow(), { reserveOk: false }); reset([{ stop: "end_turn", content: [{ type: "text", text: "x" }] }]);
    const planner = await modelPlanner({ purpose: "kaju_chat", userId: OWNER, orgId: "org-1", verified: true });
    assert.ok(planner);
    const planned = await planner!.plan({ text: "follow up overdue cases", intent: null, page: null, org: { id: "org-1", name: "Org", workspace: "ngo" }, channels: [], people: [], places: [] } as never);
    assert.equal(planned.ok, false); assert.equal(sent.length, 0, "no reservation, no planning call");
    ok("the mission planner needs an approved data route, a verified account and a reservation before it calls the model");
  } finally {
    globalThis.fetch = (async () => { network++; throw Error("no network in tests"); }) as typeof fetch;
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    setInferenceLedger(null);
  }

  /* ── Public bite help never spends the staff key ─────────────────── */
  {
    const { biteTurn } = await import("../src/lib/kaju/biteModel");
    const hosts2: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => { hosts2.push(new URL(input instanceof Request ? input.url : String(input)).host); throw Error("blocked in test"); }) as typeof fetch;
    const BITE = { STRAYPAW_BITE_AI: "model", STRAYPAW_BITE_AI_AUTHORISED_BY: "owner:2026-11-17", STRAYPAW_BITE_AI_DAILY_TURNS: "50", ANTHROPIC_API_KEY: "test-key-not-real" };
    const input = { turns: [{ who: "me", text: "a dog bit my son" }], facts: {}, showing: "tell", areas: [], programme: "Test", mode: "chat", today: "2026-11-17" } as unknown as Parameters<typeof biteTurn>[0];
    const quietInfo = console.info; console.info = () => {};
    await biteTurn(input, undefined, BITE).catch(() => null);
    assert.ok(!hosts2.includes("api.anthropic.com"), "the direct key is not used for public bite help");
    hosts2.length = 0;
    await biteTurn(input, undefined, { ...BITE, STRAYPAW_BITE_AI_DIRECT_KEY: "true" }).catch(() => null);
    console.info = quietInfo;
    assert.ok(hosts2.includes("api.anthropic.com"), "only with its own explicit opt-in");
    globalThis.fetch = (async () => { network++; throw Error("no network in tests"); }) as typeof fetch;
    ok("public bite help (no sign-in) never uses the direct Anthropic key unless the owner opts in separately; nothing left the test");
  }

  /* ── Pilot log: what happened, never what was said ───────────────── */
  const t = await import("../src/sp3/ai/telemetry");
  assert.equal(t.languageOf("कितने कुत्तों की नसबंदी हुई"), "hi"); assert.equal(t.languageOf("kitne dogs sterilised is mahine"), "hinglish"); assert.equal(t.languageOf("how many open cases"), "en");
  assert.ok(t.isCorrection("no, I meant ward 14")); assert.ok(t.isCorrection("galat hai")); assert.ok(!t.isCorrection("now show ward 14"));
  assert.equal(t.pageKind("/ngo/cases/0b9a3c1e-1f2a-4c3d-9e8f-123456789abc?tab=abc"), "/ngo/cases/[id]"); assert.equal(t.pageKind("/channels/vet-team"), "/channels/[id]"); assert.equal(t.pageKind("/gov/programmes/pune-abc-2026"), "/gov/programmes/[id]");
  const question = "Is Bholu in Ward 12 vaccinated? Phone 9876543210";
  const rec = t.turnRecord({ orgId: "o", workspace: "ngo", surface: "dock", path: "/ngo/animals/0b9a3c1e-1f2a-4c3d-9e8f-123456789abc", question, latencyMs: 812.4, retry: false,
    reply: { text: "Bholu was vaccinated on 3 March.", citations: [{ id: "x", label: "Bholu", href: "/ngo/animals/x", kind: "animal" }], tools: [{ name: "search_records", summary: "Bholu", ok: true }, { name: "show", summary: "", ok: true }], proposals: [], engine: "tools" } });
  const stored = JSON.stringify(rec);
  for (const secret of ["Bholu", "Ward 12", "9876543210", "vaccinated"]) assert.ok(!stored.includes(secret), `the log never holds "${secret}"`);
  assert.equal(rec.intent, "search_records"); assert.equal(rec.outcome, "answered"); assert.equal(rec.latency_ms, 812); assert.equal(rec.page_kind, "/ngo/animals/[id]");
  assert.equal(t.outcomeOf({ text: "x", tools: [], proposals: [], suggestions: ["a"], notice: undefined }), "no_match");
  assert.equal(t.outcomeOf({ text: "x", tools: [], proposals: [{ id: "p", why: "", kind: "add_note", caseId: "c", caseLabel: "C", note: "n" }] }), "prepared");
  assert.equal(t.outcomeOf({ text: "x", tools: [], proposals: [], notice: "Stopped at the per-answer spending limit." }), "limit");
  ok("the pilot log records language, outcome, tools, page kind and timing, never the question, answer, names or numbers");
  for (const f of ["src/sp3/ai/engine.ts", "src/lib/kaju/claude.ts"]) {
    const src = readFileSync(f, "utf8");
    assert.ok(src.includes("reserveInference(") && src.includes("settleInference("), `${f} reserves and settles`);
    assert.ok(src.indexOf("reserveInference(") < src.lastIndexOf("messages.create("), `${f} reserves before it calls the model`);
  }
  ok("every model call path in the app reserves before it calls and settles after");
  const route = readFileSync("src/app/api/ai/route.ts", "utf8");
  assert.ok(/const \{ usage: _usage, \.\.\.out \} = reply/.test(route)); ok("token and cost figures are removed from the reply before it leaves the server");

  assert.equal(network, 0, "no real network request");
  globalThis.fetch = realFetch;
  ok("no network request was made");
  console.log(`\nKaju spend safeguards and loop: ${n} checks passed`);
}
main().catch((e) => { console.error(e); process.exit(1); });
