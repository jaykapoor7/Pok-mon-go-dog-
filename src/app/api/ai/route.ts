import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createBoundedSupabaseFetch } from "@/lib/bounded-supabase-fetch";
import { allowRequest, allowUserRequest, clientIp } from "@/lib/rate-limit";
import { answer, modelConfigured } from "@/sp3/ai/engine";
import type { AiRequest } from "@/sp3/ai/types";
import { caller as connCaller, capabilitiesFor } from "@/lib/connections/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Kaju. The caller's own access token (if any) is forwarded to
   Supabase, so every tool read is decided by row-level security exactly as
   in the manual screens. No service-role key is used here. */
function callerClient(token: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: createBoundedSupabaseFetch(), ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) },
  });
}

export async function GET() {
  return NextResponse.json({ model: modelConfigured(), tools: true });
}

export async function POST(req: Request) {
  let body: AiRequest;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!Array.isArray(body?.messages) || body.messages.length > 40 || body.messages.some((m) => !m || !["user", "assistant"].includes(m.role) || typeof m.text !== "string" || m.text.length > 12000) || (body.context != null && (typeof body.context !== "object" || Array.isArray(body.context) || (body.context.path != null && typeof body.context.path !== "string") || (body.context.workspace != null && typeof body.context.workspace !== "string")))) return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });

  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!token && !(await allowRequest(clientIp(req), "ai", 40, 600))) return NextResponse.json({ error: "Questions are temporarily unavailable. Try again shortly." }, { status: 429 });
  const db = callerClient(token);
  if (!db) return NextResponse.json({ error: "The record store is not configured on this deployment." }, { status: 503 });

  let orgId: string | null = null;
  let userName: string | null = null;
  let actorRole: string | null = null;
  if (token) {
    const { data: who, error } = await db.auth.getUser(token);
    if (error || !who?.user) return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
    if (!(await allowUserRequest(db, "ai"))) return NextResponse.json({ error: "Too many questions at once. Wait a minute and try again." }, { status: 429 });
    userName = (who.user.user_metadata?.display_name as string | undefined) ?? who.user.email ?? null;
    const [{ data: ngo }, { data: abc }] = await Promise.all([db.rpc("my_ngo"), db.rpc("abc_my_context")]);
    orgId = typeof ngo === "string" ? ngo : null;
    actorRole = typeof abc?.role === "string" ? abc.role : abc?.offices?.length ? "municipal_reviewer" : null;
  }

  /* Capability discovery: Kaju is offered only the connections this person has. */
  let conn = null;
  if (token && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try { const c = await connCaller(req); if (c) conn = { caller: c, caps: await capabilitiesFor(c) }; } catch { conn = null; }
  }
  try {
    const reply = await answer(body.messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", text: String(m.text ?? "") })), { db, orgId, userName, actorRole, conn }, body.context ?? {});
    return NextResponse.json(reply);
  } catch (e) {
    console.error("Kaju failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Kaju could not answer. Nothing was changed." }, { status: 500 });
  }
}
