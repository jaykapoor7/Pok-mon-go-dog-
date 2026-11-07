import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createBoundedSupabaseFetch } from "@/lib/bounded-supabase-fetch";
import { allowRequest, allowUserRequest, clientIp } from "@/lib/rate-limit";
import { answer, privateModelApproved } from "@/sp3/ai/engine";
import { inferenceMode } from "@/lib/ai/inference";
import { readAiScope } from "@/sp3/ai/scope";
import type { AiRequest } from "@/sp3/ai/types";
import { caller as connCaller, capabilitiesFor } from "@/lib/connections/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Kaju. The caller's own access token (if any) is forwarded to
   Supabase, so every tool read is decided by row-level security exactly as
   in the manual screens. No service-role key is used here. */
function callerClient(token: string | null, signal?:AbortSignal) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;
  const bounded=createBoundedSupabaseFetch();
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch:(input,init)=>{const supplied=init?.signal??(input instanceof Request?input.signal:null);const signals=[signal,supplied].filter((s):s is AbortSignal=>!!s);return bounded(input,{...init,signal:signals.length?AbortSignal.any(signals):undefined})}, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) },
  });
}

export async function GET(req:Request) {
  const auth=req.headers.get("authorization");
  if(!auth)return NextResponse.json({model:false,mode:inferenceMode(),tools:true,scope:"guest",actorRole:null},{headers:{"Cache-Control":"no-store"}});
  const token=auth.startsWith("Bearer ")?auth.slice(7).trim():"";
  const db=callerClient(token,req.signal);if(!db||!token)return NextResponse.json({error:"Sign in again."},{status:401});
  const who=await db.auth.getUser(token);if(who.error||!who.data.user)return NextResponse.json({error:"Your session has expired. Sign in again."},{status:401});
  try {return NextResponse.json({model:await privateModelApproved({purpose:"kaju_chat",userId:who.data.user.id,orgId:null}),mode:inferenceMode(),tools:true,userId:who.data.user.id,...await readAiScope(db,who.data.user.id)},{headers:{"Cache-Control":"no-store"}});}
  catch {return NextResponse.json({error:"Workspace permissions could not be checked."},{status:503});}
}

export async function POST(req: Request) {
  let body: AiRequest;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!Array.isArray(body?.messages) || body.messages.length > 40 || body.messages.some((m) => !m || !["user", "assistant"].includes(m.role) || typeof m.text !== "string" || m.text.length > 12000) || (body.context != null && (typeof body.context !== "object" || Array.isArray(body.context) || (body.context.path != null && typeof body.context.path !== "string") || (body.context.workspace != null && typeof body.context.workspace !== "string") || (body.context.scope != null && typeof body.context.scope !== "string")))) return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });

  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!token && !(await allowRequest(clientIp(req), "ai", 40, 600))) return NextResponse.json({ error: "Questions are temporarily unavailable. Try again shortly." }, { status: 429 });
  if(auth&&!token)return NextResponse.json({error:"Sign in again."},{status:401});
  const db = callerClient(token,req.signal);
  if (!db) return token
    ? NextResponse.json({ error: "Sign in again." }, { status: 401 })
    : NextResponse.json({ error: "The record store is not configured on this deployment." }, { status: 503 });

  let orgId: string | null = null;
  let userName: string | null = null;
  let actorRole: string | null = null;
  let userId: string | undefined;
  let scope="guest";
  if (token) {
    const { data: who, error } = await db.auth.getUser(token);
    if (error || !who?.user) return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
    if (!(await allowUserRequest(db, "ai"))) return NextResponse.json({ error: "Too many questions at once. Wait a minute and try again." }, { status: 429 });
    userName = (who.user.user_metadata?.display_name as string | undefined) ?? who.user.email ?? null;
    userId=who.user.id;
    try {const verified=await readAiScope(db,userId);orgId=verified.orgId;actorRole=verified.actorRole;scope=verified.scope;}
    catch {return NextResponse.json({error:"Workspace permissions could not be checked. Nothing was changed."},{status:503});}

  }

  if(body.context?.scope && body.context.scope!==scope)return NextResponse.json({error:"Your workspace access changed. Reopen Kaju to continue."},{status:409});
  /* Capability discovery: Kaju is offered only the connections this person has. */
  let conn = null;
  if (token && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try { const c = await connCaller(req); if (c) conn = { caller: c, caps: await capabilitiesFor(c) }; } catch { conn = null; }
  }
  const turns = body.messages.map((m) => ({ role: m.role === "assistant" ? "assistant" as const : "user" as const, text: String(m.text ?? "") }));
  const baseCtx = { db, orgId, userName, userId, actorRole, pagePath:body.context?.path?.split("?")[0].slice(0,200), conn };
  /* Streaming: with Accept: application/x-ndjson the reply arrives as lines of
     JSON: one {type:"progress"} per tool as it finishes (its name and a short
     summary, never record data), then one {type:"reply"} or {type:"error"}. */
  if (req.headers.get("accept")?.includes("application/x-ndjson")) {
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(ctrl) {
        const send = (o: unknown) => { try { ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n")); } catch { /* client gone */ } };
        send({ type: "start", scope });
        try {
          const reply = await answer(turns, { ...baseCtx, progress: (e) => send({ type: "progress", ...e }) }, { ...body.context, signal: req.signal });
          send({ type: "reply", reply: { ...reply, scope } });
        } catch {
          if (!req.signal.aborted) { console.error("Kaju request failed"); send({ type: "error", error: "Kaju could not answer. Nothing was changed." }); }
        } finally { try { ctrl.close(); } catch { /* closed */ } }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
  }
  try {
    const reply = await answer(turns, baseCtx, {...body.context,signal:req.signal});
    if(req.signal.aborted)return new Response(null,{status:499});
    return NextResponse.json({...reply,scope},{headers:{"Cache-Control":"no-store"}});
  } catch {
    if(req.signal.aborted)return new Response(null,{status:499});
    console.error("Kaju request failed");
    return NextResponse.json({ error: "Kaju could not answer. Nothing was changed." }, { status: 500 });
  }
}
