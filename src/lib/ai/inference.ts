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

export type InferenceScope = { purpose: "kaju_chat" | "photo_check"; userId: string | null; orgId: string | null };
export type InferenceDecision = { allowed: true; budget: Budget } | { allowed: false; reason: string };
type Budget = { monthlyCeilingInr: number; perUserDaily: number; perOrgDaily: number; maxConcurrent: number; maxOutputTokens: number };

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
  return { allowed: true, budget: { monthlyCeilingInr, perUserDaily, perOrgDaily, maxConcurrent: num(env.STRAYPAW_AI_MAX_CONCURRENT) ?? 4, maxOutputTokens: Math.min(num(env.STRAYPAW_AI_MAX_OUTPUT_TOKENS) ?? 2000, 4000) } };
}

let running = 0;
/* Usage counters and spend come from a ledger the deployment must provide;
   until it exists every check fails closed. */
type Ledger = { usage(scope: InferenceScope): Promise<{ userToday: number; orgToday: number; monthInr: number } | null> };
let ledger: Ledger | null = null;
export function setInferenceLedger(l: Ledger | null) { ledger = l; }

/** Decide one request. Guests never reach a paid model. */
export async function inferenceAllowed(scope: InferenceScope, env: Record<string, string | undefined> = process.env): Promise<InferenceDecision> {
  const cfg = inferenceConfig(env);
  if (!cfg.allowed) return cfg;
  if (!scope.userId) return { allowed: false, reason: "Signed-out requests never use a paid model." };
  if (running >= cfg.budget.maxConcurrent) return { allowed: false, reason: "Model capacity is busy; using record tools." };
  const u = ledger ? await ledger.usage(scope).catch(() => null) : null;
  if (!u) return { allowed: false, reason: "Model usage cannot be measured, so it is not used." };
  if (u.monthInr >= cfg.budget.monthlyCeilingInr) return { allowed: false, reason: "This month's model budget is used up." };
  if (u.userToday >= cfg.budget.perUserDaily || (scope.orgId && u.orgToday >= cfg.budget.perOrgDaily)) return { allowed: false, reason: "Today's model quota is used up." };
  return cfg;
}

/** Wraps one allowed call so concurrency is counted and released. */
export async function withInferenceSlot<T>(fn: () => Promise<T>): Promise<T> {
  running++;
  try { return await fn(); } finally { running--; }
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
