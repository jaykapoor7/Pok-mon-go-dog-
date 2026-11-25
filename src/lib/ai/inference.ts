import "server-only";

/* ════════════════════════════════════════════════════════════════════
   The one door to paid model inference.

   Default and fail-closed: STRAYPAW_AI_MODE is "tools_only" unless it is
   set to exactly "model" AND an explicit authorisation, a monthly ceiling
   and per-user/organisation quotas are configured. Anything missing,
   misspelt or unparseable means no model call. The decision is made
   before any credential is resolved, so Vercel's automatic OIDC identity
   (which the AI Gateway would otherwise accept on its own) is never even
   requested while inference is off.

   Every model call in the codebase goes through inferenceAllowed() and
   modelCredentials(); a test fails if any other file imports a model SDK
   or the OIDC helper. Deterministic Kaju tools never pass through here.
   ════════════════════════════════════════════════════════════════════ */

/** The caller's own database session: usage is read and written through
    security-definer functions bound to auth.uid(), never a client-chosen id. */
export type LedgerDb = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };
/** `verified`: the account's email or phone is confirmed (from the server's own session check, never the browser). */
/** `admin`: the server's own service-role connection, the only one that can reserve and settle spend. Without it no
    model call is made. */
export type InferenceScope = { purpose: "kaju_chat" | "photo_check"; userId: string | null; orgId: string | null; db?: LedgerDb | null; verified?: boolean; admin?: LedgerDb | null };
export type InferenceDecision = { allowed: true; budget: Budget } | { allowed: false; reason: string };
/** `remainingInr`: the least of what is left this month overall, for the person and for their organisation, once a
    run is allowed. `runCapInr`: the most one run (all its steps) may cost. `maxSteps`: model calls per run. */
export type Budget = { monthlyCeilingInr: number; perUserDaily: number; perOrgDaily: number; maxConcurrent: number; maxOutputTokens: number; inrPerMTokIn: number; inrPerMTokOut: number; runCapInr: number; maxSteps: number; remainingInr?: number };

const num = (v: string | undefined) => { const n = Number(v?.trim()); return Number.isFinite(n) && n > 0 ? n : null; };

/** The configured mode. Only the exact word "model" with every limit set enables inference. */
export function inferenceConfig(env: Record<string, string | undefined> = process.env): InferenceDecision {
  const mode = env.STRAYPAW_AI_MODE?.trim();
  if (mode !== "model") return { allowed: false, reason: "Model inference is switched off (tools only)." };
  /* A deliberate, dated authorisation: redeploying or copying an env file
     without it keeps inference off. */
  const auth = env.STRAYPAW_AI_AUTHORISED_BY?.trim();
  if (!auth || !/^[^:]{2,80}:\d{4}-\d{2}-\d{2}$/.test(auth)) return { allowed: false, reason: "Model inference has no recorded authorisation." };
  const monthlyCeilingInr = num(env.STRAYPAW_AI_MONTHLY_CEILING_INR), perUserDaily = num(env.STRAYPAW_AI_USER_DAILY_REQUESTS), perOrgDaily = num(env.STRAYPAW_AI_ORG_DAILY_REQUESTS);
  if (!monthlyCeilingInr || !perUserDaily || !perOrgDaily) return { allowed: false, reason: "Model inference has no spending ceiling or quotas configured." };
  /* Spend is measured, not guessed: without a price per million tokens the
     ceiling cannot be enforced, so inference stays off. */
  const inrPerMTokIn = num(env.STRAYPAW_AI_INR_PER_MTOK_IN), inrPerMTokOut = num(env.STRAYPAW_AI_INR_PER_MTOK_OUT);
  if (!inrPerMTokIn || !inrPerMTokOut) return { allowed: false, reason: "Model inference has no token price configured, so spend cannot be measured." };
  /* Who may use it. "owner" (the default) admits only the owner's own verified account; "grants" admits people and
     organisations the owner granted in the database. Anything else, or owner mode without an owner id, is off. */
  const rollout = env.STRAYPAW_AI_ROLLOUT?.trim() || "owner";
  if (rollout !== "owner" && rollout !== "grants") return { allowed: false, reason: "Model inference has an unknown rollout setting." };
  if (rollout === "owner" && !UUID.test(env.STRAYPAW_AI_OWNER_USER_ID?.trim() ?? "")) return { allowed: false, reason: "Model inference has no owner account configured." };
  return { allowed: true, budget: {
    monthlyCeilingInr, perUserDaily, perOrgDaily, inrPerMTokIn, inrPerMTokOut,
    maxConcurrent: Math.min(num(env.STRAYPAW_AI_MAX_CONCURRENT) ?? 2, 8),
    /* The allowance covers the model's thinking as well as its words; a written report needs the higher end. */
    maxOutputTokens: Math.min(num(env.STRAYPAW_AI_MAX_OUTPUT_TOKENS) ?? 2000, 8000),
    runCapInr: Math.min(num(env.STRAYPAW_AI_RUN_MAX_INR) ?? 10, 100),
    maxSteps: Math.min(Math.floor(num(env.STRAYPAW_AI_MAX_STEPS) ?? 6), 6),
  } };
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let running = 0;
/* Usage counters and spend come from a ledger the deployment must provide;
   until it exists every check fails closed. */
export type Usage = { inputTokens: number; outputTokens: number };
type Grant = { monthlyBudgetInr: number; dailyRequests: number };
/** What the database says before a run: the switch, the grants and what has been used. Missing fields fail closed. */
export type LedgerUsage = { userToday: number; orgToday: number; monthInr: number; live?: boolean; userGrant?: Grant | null; orgGrant?: Grant | null; userMonthInr?: number; orgMonthInr?: number };
type Limits = { amountInr: number; ceilingInr: number; userDaily: number; orgDaily: number };
type Ledger = {
  usage(scope: InferenceScope): Promise<LedgerUsage | null>;
  /** The binding check: reserve this answer's whole allowance under the database's lock. Returns its id, or null. */
  reserve?(scope: InferenceScope, limits: Limits): Promise<string | null>;
  /** Replace a reservation with what the run really used. False when it could not; the reservation then stays counted. */
  settle?(scope: InferenceScope, id: string, row: { model: string; inputTokens: number; outputTokens: number; costInr: number }): Promise<boolean>;
  record?(scope: InferenceScope, row: { model: string; inputTokens: number; outputTokens: number; costInr: number }): Promise<boolean>;
};
const finite = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; };
/** The database ledger: kaju_model_usage, read and written as the caller. */
export const databaseLedger: Ledger = {
  async usage(scope) {
    if (!scope.db) return null;
    const { data, error } = await scope.db.rpc("kaju_ai_eligibility", { p_org: scope.orgId });
    if (error || !data || typeof data !== "object") return null;
    const d = data as Record<string, unknown>;
    const userToday = finite(d.user_today), orgToday = finite(d.org_today), monthInr = finite(d.month_inr), userMonthInr = finite(d.user_month_inr), orgMonthInr = finite(d.org_month_inr);
    if (userToday === null || orgToday === null || monthInr === null || userMonthInr === null || orgMonthInr === null || typeof d.live !== "boolean") return null;
    const grant = (g: unknown): Grant | null | undefined => {
      if (g === null) return null;
      if (!g || typeof g !== "object") return undefined;
      const r = g as Record<string, unknown>, m = finite(r.monthly_budget_inr), q = finite(r.daily_requests);
      return m && q ? { monthlyBudgetInr: m, dailyRequests: q } : undefined;
    };
    const userGrant = grant(d.user_grant), orgGrant = grant(d.org_grant);
    if (userGrant === undefined || orgGrant === undefined) return null;
    return { userToday, orgToday, monthInr, userMonthInr, orgMonthInr, live: d.live, userGrant, orgGrant };
  },
  async reserve(scope, l) {
    if (!scope.admin || !scope.userId) return null;
    const { data, error } = await scope.admin.rpc("kaju_ai_reserve", { p_user: scope.userId, p_org: scope.orgId, p_purpose: scope.purpose, p_amount: l.amountInr, p_ceiling: l.ceilingInr, p_user_daily: l.userDaily, p_org_daily: l.orgDaily });
    if (error || !data || typeof data !== "object") return null;
    const d = data as { ok?: unknown; id?: unknown };
    return d.ok === true && typeof d.id === "string" ? d.id : null;
  },
  async settle(scope, id, row) {
    if (!scope.admin) return false;
    const { data, error } = await scope.admin.rpc("kaju_ai_settle", { p_id: id, p_model: row.model.slice(0, 120), p_input_tokens: row.inputTokens, p_output_tokens: row.outputTokens, p_cost_inr: row.costInr });
    return !error && data === true;
  },
  async record(scope, row) {
    if (!scope.db) return false;
    const { error } = await scope.db.rpc("record_kaju_model_usage", { p_purpose: scope.purpose, p_model: row.model.slice(0, 120), p_input_tokens: row.inputTokens, p_output_tokens: row.outputTokens, p_cost_inr: row.costInr });
    return !error;
  },
};
let ledger: Ledger | null = databaseLedger;
export function setInferenceLedger(l: Ledger | null) { ledger = l; }

/** Cost of one run at the configured token prices, in rupees. */
export function usageCostInr(budget: Budget, u: Usage) {
  return Math.round(((u.inputTokens * budget.inrPerMTokIn + u.outputTokens * budget.inrPerMTokOut) / 1e6) * 10000) / 10000;
}
/** Write one run's usage to the ledger. A failed write is reported, never hidden. */
export async function recordInferenceUsage(scope: InferenceScope, model: string, u: Usage, env: Record<string, string | undefined> = process.env): Promise<boolean> {
  const cfg = inferenceConfig(env);
  if (!cfg.allowed || !ledger?.record || (!u.inputTokens && !u.outputTokens)) return false;
  return ledger.record(scope, { model, inputTokens: Math.round(u.inputTokens), outputTokens: Math.round(u.outputTokens), costInr: usageCostInr(cfg.budget, u) }).catch(() => false);
}

/** Decide one request. Guests never reach a paid model. */
export async function inferenceAllowed(scope: InferenceScope, env: Record<string, string | undefined> = process.env): Promise<InferenceDecision> {
  const cfg = inferenceConfig(env);
  if (!cfg.allowed) return cfg;
  if (!scope.userId) return { allowed: false, reason: "Signed-out requests never use a paid model." };
  /* Every rollout needs a confirmed email or phone, read by the server from the session. */
  if (scope.verified !== true) return { allowed: false, reason: "Model answers need a verified account." };
  const rollout = env.STRAYPAW_AI_ROLLOUT?.trim() || "owner";
  if (rollout === "owner" && scope.userId.toLowerCase() !== env.STRAYPAW_AI_OWNER_USER_ID?.trim().toLowerCase())
    return { allowed: false, reason: "Model answers are not switched on for this account yet." };
  if (running >= cfg.budget.maxConcurrent) return { allowed: false, reason: "Model capacity is busy; using record tools." };
  const u = ledger ? await ledger.usage(scope).catch(() => null) : null;
  if (!u) return { allowed: false, reason: "Model usage cannot be measured, so it is not used." };
  /* The database switch and a grant are both required, in either rollout mode. */
  if (u.live !== true) return { allowed: false, reason: "Model use is switched off in the database." };
  const ug = u.userGrant ?? null, og = scope.orgId ? u.orgGrant ?? null : null;
  if (!ug && !og) return { allowed: false, reason: "Model answers are not switched on for this account yet." };
  if (u.monthInr >= cfg.budget.monthlyCeilingInr) return { allowed: false, reason: "This month's model budget is used up." };
  if (u.userToday >= cfg.budget.perUserDaily || (scope.orgId && u.orgToday >= cfg.budget.perOrgDaily)) return { allowed: false, reason: "Today's model quota is used up." };
  const userMonth = u.userMonthInr, orgMonth = u.orgMonthInr;
  if (ug && (userMonth === undefined || userMonth >= ug.monthlyBudgetInr || u.userToday >= ug.dailyRequests)) return { allowed: false, reason: "Your model budget for this period is used up." };
  if (og && (orgMonth === undefined || orgMonth >= og.monthlyBudgetInr || u.orgToday >= og.dailyRequests)) return { allowed: false, reason: "Your organisation's model budget for this period is used up." };
  const left = [cfg.budget.monthlyCeilingInr - u.monthInr, ug && userMonth !== undefined ? ug.monthlyBudgetInr - userMonth : Infinity, og && orgMonth !== undefined ? og.monthlyBudgetInr - orgMonth : Infinity];
  return { allowed: true, budget: { ...cfg.budget, remainingInr: Math.max(0, Math.min(...left)) } };
}

/** The most one run may still spend: the run cap, or less when the month's remaining budget is smaller. */
export const runAllowanceInr = (b: Budget) => Math.min(b.runCapInr, b.remainingInr ?? b.runCapInr);
/** Before each model call in a run: would the worst case of this next call (the input it sends, estimated from its
    size, plus the full output allowance) take the run past its allowance? Character counts over-estimate tokens for
    English, so the estimate errs towards stopping early. */
export function nextCallAffordable(b: Budget, spent: Usage, requestChars: number) {
  const worst = { inputTokens: spent.inputTokens + Math.ceil(requestChars / 3), outputTokens: spent.outputTokens + b.maxOutputTokens };
  return usageCostInr(b, worst) <= runAllowanceInr(b);
}

/** Reserve an allowed answer's whole allowance before any model call. Null means do not call the model. */
export async function reserveInference(scope: InferenceScope, budget: Budget): Promise<string | null> {
  if (!ledger?.reserve) return null;
  const amountInr = Math.round(runAllowanceInr(budget) * 10000) / 10000;
  if (!(amountInr > 0)) return null;
  return ledger.reserve(scope, { amountInr, ceilingInr: budget.monthlyCeilingInr, userDaily: budget.perUserDaily, orgDaily: budget.perOrgDaily }).catch(() => null);
}
/** Settle a reservation with the run's measured usage. Always called after a reserved run, whether it succeeded. */
export async function settleInference(scope: InferenceScope, id: string, model: string, u: Usage, budget: Budget): Promise<boolean> {
  if (!ledger?.settle) return false;
  return ledger.settle(scope, id, { model, inputTokens: Math.round(u.inputTokens), outputTokens: Math.round(u.outputTokens), costInr: usageCostInr(budget, u) }).catch(() => false);
}
/** The data route the owner approved must name exactly the transport and model in use. */
export const routeApproved = (cred: { gateway: boolean; model: string }, env: Record<string, string | undefined> = process.env) =>
  env.STRAYPAW_AI_APPROVED_DATA_ROUTE?.trim() === `${cred.gateway ? "gateway" : "direct"}:${cred.model}`;

/** Wraps one allowed call so concurrency is counted and released. */
export async function withInferenceSlot<T>(fn: () => Promise<T>): Promise<T> {
  running++;
  try { return await fn(); } finally { running--; }
}

/* ── The public demonstration's bite helper ─────────────────────────────
   Kaju's chat and call on /bite-help talk to residents who are not signed
   in, so they can never use the staff door above. They have their own
   switch, off unless the owner sets all of it: STRAYPAW_BITE_AI exactly
   "model", a dated authorisation (STRAYPAW_BITE_AI_AUTHORISED_BY,
   "name:YYYY-MM-DD") and a cap on turns per day for the whole deployment
   (STRAYPAW_BITE_AI_DAILY_TURNS). The route adds the demonstration-only flag,
   the same-site check and per-visitor limits; each turn is capped in output.
   The cap is counted per server instance and day, so with several instances
   it is a ceiling per instance: the per-visitor limits bound the rest. */
let biteDay = "", biteTurns = 0;
export function publicBiteConfig(env: Record<string, string | undefined> = process.env): InferenceDecision {
  if (env.STRAYPAW_BITE_AI?.trim() !== "model") return { allowed: false, reason: "Kaju's bite help uses its fixed rules." };
  const auth = env.STRAYPAW_BITE_AI_AUTHORISED_BY?.trim();
  if (!auth || !/^[^:]{2,80}:\d{4}-\d{2}-\d{2}$/.test(auth)) return { allowed: false, reason: "Kaju's bite help has no recorded authorisation." };
  const daily = num(env.STRAYPAW_BITE_AI_DAILY_TURNS);
  if (!daily) return { allowed: false, reason: "Kaju's bite help has no daily cap." };
  return { allowed: true, budget: { monthlyCeilingInr: 0, perUserDaily: daily, perOrgDaily: daily, maxConcurrent: 6, maxOutputTokens: 1600, inrPerMTokIn: 0, inrPerMTokOut: 0, runCapInr: 0, maxSteps: 1 } };
}
/** One public turn: allowed only while the switch is set and today's cap is not reached. Counts the turn. */
export function publicBiteTurn(env: Record<string, string | undefined> = process.env, now = new Date()): InferenceDecision {
  const cfg = publicBiteConfig(env);
  if (!cfg.allowed) return cfg;
  const day = now.toISOString().slice(0, 10);
  if (day !== biteDay) { biteDay = day; biteTurns = 0; }
  if (biteTurns >= cfg.budget.perUserDaily) return { allowed: false, reason: "Today's turns for Kaju's bite help are used up." };
  if (running >= cfg.budget.maxConcurrent) return { allowed: false, reason: "Kaju is busy." };
  biteTurns++;
  return cfg;
}

export type ModelCredentials = { gateway: boolean; token: string; model: string };
/** Credentials, resolved ONLY after an allowed decision. OIDC is imported lazily so it never runs otherwise. */
export async function modelCredentials(decision: InferenceDecision, env: Record<string, string | undefined> = process.env): Promise<ModelCredentials | null> {
  if (!decision.allowed) return null;
  const direct = env.ANTHROPIC_API_KEY?.trim();
  if (direct) return { gateway: false, token: direct, model: env.STRAYPAW_AI_MODEL?.trim() || "claude-opus-5-5" };
  let token = env.AI_GATEWAY_API_KEY?.trim();
  if (!token && env.STRAYPAW_AI_ALLOW_OIDC === "true") {
    try { const { getVercelOidcToken } = await import("@vercel/oidc"); token = (await getVercelOidcToken()).trim(); } catch { return null; }
  }
  return token ? { gateway: true, token, model: env.STRAYPAW_AI_MODEL?.trim() || "google/gemini-2.5-flash" } : null;
}

/** Public, non-secret state for status screens. */
export const inferenceMode = () => (inferenceConfig().allowed ? "model" as const : "tools_only" as const);
