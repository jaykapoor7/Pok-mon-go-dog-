import { NextResponse } from "next/server";
import { caller } from "@/lib/connections/server";
import { inferenceConfig } from "@/lib/ai/inference";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* The owner's control panel for Kaju's paid model use. Only the owner (the account named both in the database switch row
   and in STRAYPAW_AI_OWNER_USER_ID) gets anything back. Settings are reported as present or missing, never their values.
   POST stops all model use at once; starting it again is a deliberate SQL change (docs/KAJU-INTELLIGENCE.md). Nothing
   here calls a model. */

const NAMES = ["STRAYPAW_AI_MODE", "STRAYPAW_AI_AUTHORISED_BY", "STRAYPAW_AI_MONTHLY_CEILING_INR", "STRAYPAW_AI_USER_DAILY_REQUESTS", "STRAYPAW_AI_ORG_DAILY_REQUESTS",
  "STRAYPAW_AI_INR_PER_MTOK_IN", "STRAYPAW_AI_INR_PER_MTOK_OUT", "STRAYPAW_AI_ROLLOUT", "STRAYPAW_AI_OWNER_USER_ID", "STRAYPAW_AI_APPROVED_DATA_ROUTE", "STRAYPAW_AI_MODEL",
  "STRAYPAW_AI_RUN_MAX_INR", "STRAYPAW_AI_MAX_OUTPUT_TOKENS", "ANTHROPIC_API_KEY"] as const;

async function owner(req: Request) {
  const c = await caller(req);
  if (!c) return { error: NextResponse.json({ error: "Sign in again." }, { status: 401 }) };
  const envOwner = process.env.STRAYPAW_AI_OWNER_USER_ID?.trim().toLowerCase();
  const { data, error } = await c.db.rpc("kaju_ai_owner_status");
  if (error) return { error: NextResponse.json({ owner: false, error: "The control could not be read." }, { status: 503 }) };
  if (!data || !envOwner || envOwner !== c.userId.toLowerCase()) return { error: NextResponse.json({ owner: false }, { headers: { "Cache-Control": "no-store" } }) };
  return { c, status: data as Record<string, unknown> };
}

export async function GET(req: Request) {
  const o = await owner(req);
  if ("error" in o) return o.error;
  const env = process.env;
  const gate = inferenceConfig(env);
  return NextResponse.json({
    owner: true, verified: o.c.verified === true,
    database: o.status,
    settings: Object.fromEntries(NAMES.map((k) => [k, !!env[k]?.trim()])),
    gate: gate.allowed ? { open: true, maxOutputTokens: gate.budget.maxOutputTokens, runCapInr: gate.budget.runCapInr, monthlyCeilingInr: gate.budget.monthlyCeilingInr, maxSteps: gate.budget.maxSteps } : { open: false, reason: gate.reason },
    rollout: env.STRAYPAW_AI_ROLLOUT?.trim() || "owner",
    approvedRoute: !!env.STRAYPAW_AI_APPROVED_DATA_ROUTE?.trim() && env.STRAYPAW_AI_APPROVED_DATA_ROUTE?.trim() === `direct:${env.STRAYPAW_AI_MODEL?.trim() || "claude-opus-5-5"}`,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const o = await owner(req);
  if ("error" in o) return o.error;
  const b = await req.json().catch(() => null) as { action?: unknown; note?: unknown } | null;
  if (b?.action !== "stop") return NextResponse.json({ error: "Only stopping is possible here." }, { status: 400 });
  const { error } = await o.c.db.rpc("kaju_ai_stop", { p_note: typeof b.note === "string" ? b.note.slice(0, 200) : "Stopped from the app" });
  if (error) return NextResponse.json({ error: "Kaju's model use could not be stopped here. Set STRAYPAW_AI_MODE to tools_only in Vercel." }, { status: 500 });
  return NextResponse.json({ ok: true, live: false });
}
