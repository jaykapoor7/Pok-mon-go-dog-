import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { inferenceAllowed, modelCredentials, nextCallAffordable, reserveInference, routeApproved, settleInference, withInferenceSlot, type Budget, type InferenceScope } from "@/lib/ai/inference";
import { PROPOSE_TOOL, validatePlan } from "./registry";
import { planningPrompt, type PlanContext, type PlanResult, type Planner } from "./planner";

/* The model planner. It exists only when the deployment's inference gate allows this request (mode, authorisation,
   spending ceiling and quotas all set; see src/lib/ai/inference.ts), so with paid inference off nothing here runs and
   no credential is read. The model proposes; validatePlan and the database decide. */

type Client = { messages: { create: (body: Anthropic.MessageCreateParamsNonStreaming, opts?: { signal?: AbortSignal; timeout?: number }) => Promise<Anthropic.Message> } };

export class ClaudePlanner implements Planner {
  readonly id = "model" as const;
  constructor(private readonly client: Client, private readonly model: string, private readonly gateway: boolean, private readonly onUsage?: (u: { inputTokens: number; outputTokens: number }) => void, private readonly budget?: Budget) {}
  async plan(ctx: PlanContext, signal?: AbortSignal): Promise<PlanResult> {
    const { system, user } = planningPrompt(ctx);
    /* The planner makes one call; its worst case must fit the per-answer allowance. */
    if (this.budget && !nextCallAffordable(this.budget, { inputTokens: 0, outputTokens: 0 }, system.length + user.length + JSON.stringify(PROPOSE_TOOL).length))
      return { ok: false, planner: this.id, error: "This request is too large to plan within one answer's spending limit. Ask for something smaller." };
    let res: Anthropic.Message;
    try {
      res = await this.client.messages.create({
        model: this.model,
        max_tokens: this.budget?.maxOutputTokens ?? 2000,
        ...(this.gateway ? {} : { output_config: { effort: "medium" as const } }),
        system,
        tools: [{ name: PROPOSE_TOOL.name, description: PROPOSE_TOOL.description, input_schema: PROPOSE_TOOL.input_schema as unknown as Anthropic.Tool.InputSchema }],
        tool_choice: { type: "auto" },
        messages: [{ role: "user", content: user }],
      }, { signal, timeout: 40000 });
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) return { ok: false, planner: this.id, error: "The model is busy. Try again in a minute, or use the composer's fixed-rule plans." };
      if (e instanceof Anthropic.APIError) return { ok: false, planner: this.id, error: "The model could not plan this. Nothing was started." };
      return { ok: false, planner: this.id, error: "The model could not be reached. Nothing was started." };
    }
    this.onUsage?.({ inputTokens: (res.usage?.input_tokens ?? 0) + (res.usage?.cache_creation_input_tokens ?? 0) * 1.25 + (res.usage?.cache_read_input_tokens ?? 0) * 0.1, outputTokens: res.usage?.output_tokens ?? 0 });
    if (res.stop_reason === "refusal") return { ok: false, planner: this.id, error: "Kaju will not plan that request." };
    if (res.stop_reason === "max_tokens") return { ok: false, planner: this.id, error: "The plan was cut off before it was complete. Ask for something smaller." };
    const use = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === PROPOSE_TOOL.name);
    if (!use) return { ok: false, planner: this.id, error: "The model did not propose a plan. Try saying what should happen, where and for whom." };
    const raw = use.input as { not_possible?: unknown };
    if (typeof raw?.not_possible === "string" && raw.not_possible.trim()) return { ok: false, planner: this.id, error: raw.not_possible.trim().slice(0, 300) };
    const v = validatePlan(raw);
    return v.ok ? { ok: true, plan: v.plan, planner: this.id } : { ok: false, planner: this.id, error: `The model's plan was not accepted: ${v.error}` };
  }
}

/** The model planner for this request, or null when paid inference is off, over budget, not authorised, or the data
    route is not approved. Each planning call reserves its allowance first and settles it after, like chat answers. */
export async function modelPlanner(scope: InferenceScope): Promise<ClaudePlanner | null> {
  const decision = await inferenceAllowed(scope);
  if (!decision.allowed) return null;
  const cred = await modelCredentials(decision);
  if (!cred || !routeApproved(cred)) return null;
  const budget = decision.budget;
  const client = new Anthropic({ maxRetries: 0, ...(cred.gateway ? { apiKey: null, authToken: cred.token, baseURL: "https://ai-gateway.vercel.sh" } : { apiKey: cred.token }) });
  const wrapped: Client = { messages: { create: async (body, opts) => {
    const id = await reserveInference(scope, budget);
    if (!id) throw new Error("Model spending could not be reserved.");
    let u = { inputTokens: 0, outputTokens: 0 };
    try {
      const res = await withInferenceSlot(() => client.messages.create(body, opts));
      u = { inputTokens: (res.usage?.input_tokens ?? 0) + (res.usage?.cache_creation_input_tokens ?? 0) * 1.25 + (res.usage?.cache_read_input_tokens ?? 0) * 0.1, outputTokens: res.usage?.output_tokens ?? 0 };
      return res;
    } finally { await settleInference(scope, id, cred.model, u, budget); }
  } } };
  return new ClaudePlanner(wrapped, cred.model, cred.gateway, undefined, budget);
}
