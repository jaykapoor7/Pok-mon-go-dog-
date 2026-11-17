import { NextResponse } from "next/server";
import { flagOn } from "@/lib/flags";
import { publicBiteConfig } from "@/lib/ai/inference";
import { biteTurn, cleanFacts, NO_FACTS, type BiteTurnIn } from "@/lib/kaju/biteModel";

/* Kaju's bite help on a model, for the public demonstration (/bite-help). It answers only where bite help itself is
   switched on (the citizen_bite_assist flag: the demonstration site) and the owner has switched the model on for it
   (src/lib/ai/inference.ts, publicBiteConfig). Same-site requests only, size caps, per-visitor limits and a daily cap
   on turns; the key stays on the server. Nothing is stored or logged: a log line holds a status code only. When the
   model is off or fails, the page carries on with Kaju's fixed rules. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const no = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
const on = () => flagOn("citizen_bite_assist") && publicBiteConfig().allowed;

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
const indiaToday = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

export async function GET() {
  return NextResponse.json({ ai: on() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!on()) return no(404, "off");
  if (!sameSite(req)) return no(403, "origin");
  const who = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  if (limited(`m:${who}`, 12, 60_000) || limited(`h:${who}`, 90, 60 * 60_000)) return no(429, "limit");
  const raw = await req.text();
  if (raw.length > 24_000) return no(413, "long");
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); } catch { return no(400, "json"); }
  const today = indiaToday();
  const areas = Array.isArray(b.areas) ? b.areas.filter((a): a is string => typeof a === "string").map((a) => a.slice(0, 60)).slice(0, 60) : [];
  const turns = Array.isArray(b.turns) ? b.turns.flatMap((t) => {
    const x = t as { who?: unknown; text?: unknown };
    return (x.who === "me" || x.who === "kaju") && typeof x.text === "string" ? [{ who: x.who as "me" | "kaju", text: x.text.slice(0, 700) }] : [];
  }).slice(-30) : [];
  if (!turns.some((t) => t.who === "me")) return no(400, "empty");
  const input: BiteTurnIn = {
    turns, areas, today,
    facts: cleanFacts(b.facts, areas, today, NO_FACTS),
    showing: typeof b.showing === "string" ? b.showing.slice(0, 20) : "tell",
    programme: typeof b.programme === "string" && b.programme.trim() ? b.programme.slice(0, 80) : "the city",
    mode: b.mode === "call" ? "call" : "chat",
  };
  const out = await biteTurn(input, AbortSignal.timeout(28_000));
  if (!out) return no(503, "unavailable");
  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
}
