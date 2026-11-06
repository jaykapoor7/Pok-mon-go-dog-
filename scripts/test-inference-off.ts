/* Paid model inference is off by default and has exactly one door.
   No network: fetch is replaced and must never be called. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

async function main() {
  let n = 0; const ok = (m: string) => { n++; console.log(`ok ${n} - ${m}`); };
  const { inferenceAllowed, inferenceConfig, modelCredentials, setInferenceLedger } = await import("../src/lib/ai/inference");
  const real = globalThis.fetch; let calls = 0;
  globalThis.fetch = (async () => { calls++; throw Error("network"); }) as typeof fetch;

  const keys = { ANTHROPIC_API_KEY: "k", AI_GATEWAY_API_KEY: "g", VERCEL_OIDC_TOKEN: "t", STRAYPAW_AI_ALLOW_OIDC: "true" };
  for (const mode of [undefined, "", "tools_only", "MODEL", "model ", "on", "true"]) {
    const env = { ...keys, STRAYPAW_AI_MODE: mode };
    const d = await inferenceAllowed({ purpose: "kaju_chat", userId: "u", orgId: "o" }, env);
    assert.equal(d.allowed, false);
    if (!d.allowed) assert.equal(await modelCredentials(d, env), null);
  }
  ok("unset, tools_only, misspelt or partly configured modes stay off; keys and OIDC alone never open the gate");
  const base = { STRAYPAW_AI_MODE: "model" };
  assert.equal(inferenceConfig(base).allowed, false);
  assert.equal(inferenceConfig({ ...base, STRAYPAW_AI_AUTHORISED_BY: "owner:2026-11-03" }).allowed, false);
  assert.equal(inferenceConfig({ ...base, STRAYPAW_AI_AUTHORISED_BY: "yes", STRAYPAW_AI_MONTHLY_CEILING_INR: "500", STRAYPAW_AI_USER_DAILY_REQUESTS: "20", STRAYPAW_AI_ORG_DAILY_REQUESTS: "200" }).allowed, false);
  ok("model mode also needs a dated authorisation, a monthly ceiling and quotas");
  const unpriced = { ...base, STRAYPAW_AI_AUTHORISED_BY: "owner:2026-11-03", STRAYPAW_AI_MONTHLY_CEILING_INR: "500", STRAYPAW_AI_USER_DAILY_REQUESTS: "20", STRAYPAW_AI_ORG_DAILY_REQUESTS: "200" };
  assert.equal(inferenceConfig(unpriced).allowed, false, "no token price");
  ok("without a token price spend cannot be measured, so model mode stays off");
  const on = { ...unpriced, STRAYPAW_AI_INR_PER_MTOK_IN: "420", STRAYPAW_AI_INR_PER_MTOK_OUT: "2100" };
  assert.equal((await inferenceAllowed({ purpose: "kaju_chat", userId: "u", orgId: "o" }, on)).allowed, false, "no ledger");
  setInferenceLedger({ usage: async () => ({ userToday: 0, orgToday: 0, monthInr: 500 }) });
  assert.equal((await inferenceAllowed({ purpose: "kaju_chat", userId: "u", orgId: "o" }, on)).allowed, false, "ceiling");
  setInferenceLedger({ usage: async () => ({ userToday: 20, orgToday: 0, monthInr: 0 }) });
  assert.equal((await inferenceAllowed({ purpose: "kaju_chat", userId: "u", orgId: "o" }, on)).allowed, false, "user quota");
  setInferenceLedger({ usage: async () => ({ userToday: 0, orgToday: 0, monthInr: 0 }) });
  assert.equal((await inferenceAllowed({ purpose: "kaju_chat", userId: null, orgId: null }, on)).allowed, false, "guest");
  const d = await inferenceAllowed({ purpose: "kaju_chat", userId: "u", orgId: "o" }, on);
  assert.equal(d.allowed, true);
  assert.equal(await modelCredentials(d, { ...on, VERCEL_OIDC_TOKEN: "t" }), null, "OIDC needs its own opt-in");
  setInferenceLedger(null);
  ok("even when enabled: unmeasurable usage, budget, quotas and guests all fail closed; OIDC needs explicit opt-in");

  /* The database ledger: reads the caller's usage and writes each run, through the caller's session. */
  const { databaseLedger, recordInferenceUsage, usageCostInr } = await import("../src/lib/ai/inference");
  const writes: Record<string, unknown>[] = [];
  const fakeDb = (now: unknown, fail = false) => ({ rpc: async (fn: string, args?: Record<string, unknown>) => fn === "kaju_model_usage_now" ? { data: now, error: null } : (writes.push({ fn, ...args }), { data: fail ? null : 1, error: fail ? { message: "x" } : null }) });
  setInferenceLedger(databaseLedger);
  assert.equal((await inferenceAllowed({ purpose: "kaju_chat", userId: "u", orgId: "o" }, on)).allowed, false, "no db session");
  assert.equal((await inferenceAllowed({ purpose: "kaju_chat", userId: "u", orgId: "o", db: fakeDb(null) }, on)).allowed, false, "unreadable usage");
  assert.equal((await inferenceAllowed({ purpose: "kaju_chat", userId: "u", orgId: "o", db: fakeDb({ user_today: "x", org_today: 0, month_inr: 0 }) }, on)).allowed, false, "malformed usage");
  assert.equal((await inferenceAllowed({ purpose: "kaju_chat", userId: "u", orgId: "o", db: fakeDb({ user_today: 0, org_today: 0, month_inr: 499.99 }) }, on)).allowed, true);
  assert.equal((await inferenceAllowed({ purpose: "kaju_chat", userId: "u", orgId: "o", db: fakeDb({ user_today: 0, org_today: 200, month_inr: 0 }) }, on)).allowed, false, "org quota");
  ok("the database ledger fails closed without a session or with unreadable usage, and enforces org quotas");
  const cfg = inferenceConfig(on);
  assert.ok(cfg.allowed);
  if (cfg.allowed) assert.equal(usageCostInr(cfg.budget, { inputTokens: 1_000_000, outputTokens: 100_000 }), 630);
  assert.equal(await recordInferenceUsage({ purpose: "kaju_chat", userId: "u", orgId: "o", db: fakeDb({}) }, "m", { inputTokens: 2000, outputTokens: 500 }, on), true);
  assert.deepEqual(writes.at(-1), { fn: "record_kaju_model_usage", p_purpose: "kaju_chat", p_model: "m", p_input_tokens: 2000, p_output_tokens: 500, p_cost_inr: 1.89 });
  assert.equal(await recordInferenceUsage({ purpose: "kaju_chat", userId: "u", orgId: "o", db: fakeDb({}, true) }, "m", { inputTokens: 2000, outputTokens: 500 }, on), false, "a failed write is reported");
  assert.equal(await recordInferenceUsage({ purpose: "kaju_chat", userId: "u", orgId: "o", db: fakeDb({}) }, "m", { inputTokens: 2000, outputTokens: 500 }, {}), false, "nothing is recorded while inference is off");
  setInferenceLedger(null);
  ok("each run is written with its tokens and rupee cost; failed writes are reported; nothing is written while off");

  /* One door: no other source file may import a model SDK or the OIDC helper. */
  const allowed = new Set(["src/lib/ai/inference.ts", "src/sp3/ai/engine.ts", "src/lib/photo-check.ts"]);
  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx|js|mjs)$/.test(f) ? [p] : []; });
  const offenders = walk("src").filter((f) => /@vercel\/oidc|@anthropic-ai\/sdk|from ["']openai["']|@google\/generative-ai|@ai-sdk\/|ai-gateway\.vercel\.sh/.test(readFileSync(f, "utf8")) && !allowed.has(f));
  assert.deepEqual(offenders, []);
  for (const f of ["src/sp3/ai/engine.ts", "src/lib/photo-check.ts"]) assert.ok(!readFileSync(f, "utf8").includes("@vercel/oidc"), `${f} must not resolve OIDC itself`);
  assert.ok(readFileSync("src/sp3/ai/engine.ts", "utf8").includes("inferenceAllowed"));
  assert.ok(readFileSync("src/lib/photo-check.ts", "utf8").includes("inferenceAllowed"));
  ok("every model call goes through the one gate; nothing else imports a model SDK or OIDC");

  assert.equal(calls, 0); globalThis.fetch = real;
  ok("no network request was made");
  console.log(`\ninference off: ${n} checks passed`);
}
main().catch((e) => { console.error(e); process.exit(1); });
