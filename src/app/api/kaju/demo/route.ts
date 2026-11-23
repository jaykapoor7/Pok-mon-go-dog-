import { NextResponse } from "next/server";
import { publicDemoConfig } from "@/lib/ai/inference";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { answerDemo, DEMO_LIMITS } from "@/lib/kaju/demo/engine";
import { recordCard } from "@/lib/kaju/demo/tools";
import { SAMPLE } from "@/lib/kaju/demo/programme";
import { STARTERS } from "@/lib/kaju/demo/rules";
import type { ChatTurn } from "@/sp3/ai/types";

/* Kaju on the homepage: a visitor's question, answered from the sample programme (src/lib/kaju/demo) and nothing else.

   What this route can reach: one in-memory sample. It creates no database client for records, forwards no session,
   reads no organisation and writes nothing. The rate-limit counter is the only thing it touches in the database.

   What protects it: same-site requests only; a size cap on the body, the conversation and each message; per-visitor
   limits on every answer (in this instance's memory), so the free fixed-rule answers cannot be hammered either; and,
   before any model call, the owner's switch (publicDemoConfig), a per-visitor daily cap and a daily cap for the whole
   deployment, both counted in the database across every server instance. If that shared counter is missing or
   unreachable, no model is called. Any limit reached means the fixed rules answer instead, which costs nothing.
   Nothing a visitor types is stored or logged: a log line holds a status only. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

const no = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
const hits = new Map<string, number[]>();
function limited(who: string, max: number, windowMs: number) {
  const now = Date.now(), recent = (hits.get(who) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { hits.set(who, recent); return true; }
  recent.push(now); hits.set(who, recent);
  if (hits.size > 5000) for (const [x, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(x);
  return false;
}
function sameSite(req: Request) {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.get("host"); } catch { return false; }
}

/** What the page needs before a visitor types: whether a model answers here, the sample's name and starting questions.
    With ?record=SP-1067 it returns that sample record as a card (drawn from the tools, no model). */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("record");
  if (code !== null) {
    const who = clientIp(req) ?? "anon";
    if (limited(`r:${who}`, 60, 60_000)) return no(429, "Slow down a little, then try again.");
    const card = recordCard(code.slice(0, 40));
    return card ? NextResponse.json(card, { headers: { "Cache-Control": "no-store" } }) : no(404, "No sample record has that code.");
  }
  return NextResponse.json({ model: publicDemoConfig().allowed, sample: { org: SAMPLE.org, label: SAMPLE.label, asOf: SAMPLE.asOfWords }, starters: STARTERS, limits: DEMO_LIMITS }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!sameSite(req)) return no(403, "This sample answers only from the StrayPaw site.");
  const who = clientIp(req) ?? "anon";
  if (limited(`m:${who}`, 8, 60_000) || limited(`h:${who}`, 60, 60 * 60_000)) return no(429, "That is a lot of questions at once. Wait a minute, then ask again.");
  const raw = await req.text();
  if (raw.length > 24_000) return no(413, "That conversation is too long for the sample. Start a new one.");
  let body: { messages?: unknown };
  try { body = JSON.parse(raw); } catch { return no(400, "Invalid request"); }
  const list = Array.isArray(body?.messages) ? body.messages : null;
  if (!list || !list.length || list.length > DEMO_LIMITS.perConversation * 2 || list.some((m) => !m || typeof m !== "object" || !["user", "assistant"].includes((m as ChatTurn).role) || typeof (m as ChatTurn).text !== "string" || (m as ChatTurn).text.length > 12_000)) return no(400, "Invalid conversation");
  const turns = (list as ChatTurn[]).map((m) => ({ role: m.role, text: m.text }));
  const last = turns[turns.length - 1];
  if (last.role !== "user" || !last.text.trim()) return no(400, "Ask a question first.");
  if (last.text.length > DEMO_LIMITS.chars) return no(413, `Keep a question under ${DEMO_LIMITS.chars} characters on this page.`);
  if (turns.filter((t) => t.role === "user").length > DEMO_LIMITS.perConversation) return no(429, "This sample conversation has reached its length. Start a new one to go on.");

  /* A model answers only when the owner's switch is on and both shared daily counters allow it. */
  const cfg = publicDemoConfig();
  let model = false, why: string | undefined;
  if (cfg.allowed) {
    if (!(await allowRequest(`home-kaju:${who}`, "home_kaju_visitor", cfg.budget.perUserDaily, 86_400))) why = "Today's free-form answers for this visitor are used up, so this reply uses fixed rules";
    else if (!(await allowRequest("home-kaju:all", "home_kaju_day", cfg.budget.perOrgDaily, 86_400))) why = "Today's free-form answers on this page are used up, so this reply uses fixed rules";
    else model = true;
  }

  const stream = req.headers.get("accept")?.includes("application/x-ndjson");
  if (!stream) {
    try { return NextResponse.json({ ...(await answerDemo(turns, { model, why, signal: req.signal })), scope: "sample" }, { headers: { "Cache-Control": "no-store" } }); }
    catch { if (req.signal.aborted) return new Response(null, { status: 499 }); console.error("home_kaju failed"); return no(500, "Kaju could not answer. Nothing was changed."); }
  }
  /* The product's own transport: one line per tool as it finishes (its name and a short summary), then the reply. */
  const enc = new TextEncoder();
  const out = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      const send = (o: unknown) => { try { ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n")); } catch { /* client gone */ } };
      send({ type: "start", scope: "sample" });
      try { send({ type: "reply", reply: { ...(await answerDemo(turns, { model, why, signal: req.signal, progress: (e) => send({ type: "progress", ...e }) })), scope: "sample" } }); }
      catch { if (!req.signal.aborted) { console.error("home_kaju failed"); send({ type: "error", error: "Kaju could not answer. Nothing was changed." }); } }
      finally { try { ctrl.close(); } catch { /* closed */ } }
    },
  });
  return new Response(out, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
