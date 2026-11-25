import { NextResponse } from "next/server";
import { caller } from "@/lib/connections/server";
import { hear, isSpeechLanguage, sarvamApproved, speak, SarvamError } from "@/lib/sarvam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Speaking with Kaju inside the conversation. The voice is only a way in and out: a spoken question is turned into
   text here (Sarvam Saaras), the person's own /api/ai call answers it with their own access, exactly as if they had
   typed it, and the answer's words are read aloud (Sarvam Bulbul). So spoken and typed turns share one saved
   conversation, the same permissions and the same Confirm cards.

   GET  → { speech: boolean }     whether this deployment offers it (no key or approval detail is exposed)
   POST ?op=hear  body: WAV audio, 16 kHz mono, at most 30 s → { transcript, lang, confidence }
   POST ?op=speak { text, lang }  → { audio (base64 MP3), type }
   Signed-in people only. Nothing is stored and no words are logged. */

const no = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
const WHY: Record<string, [number, string]> = { off: [404, "Voice is not switched on here."], empty: [422, "I could not hear any words. Try again, a little closer to the microphone."], timeout: [504, "The voice service took too long. Try again."], network: [504, "The voice service could not be reached. Try again."], provider: [502, "The voice service could not do that just now. Try again."] };

/* Per person, per server instance: generous for a real conversation, closed to a loop. */
const hits = new Map<string, number[]>();
function limited(who: string, op: string, max: number, windowMs = 10 * 60_000) {
  const k = `${op}:${who}`, now = Date.now();
  const recent = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { hits.set(k, recent); return true; }
  recent.push(now); hits.set(k, recent);
  if (hits.size > 5000) for (const [x, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(x);
  return false;
}

export async function GET() {
  return NextResponse.json({ speech: sarvamApproved("speech") }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!sarvamApproved("speech")) return no(404, WHY.off[1]);
  const c = await caller(req);
  if (!c) return no(401, "Sign in first.");
  const op = new URL(req.url).searchParams.get("op");
  try {
    if (op === "hear") {
      if (limited(c.userId, "hear", 60)) return no(429, "Too many voice turns at once. Wait a minute and try again.");
      const audio = await req.arrayBuffer();
      if (audio.byteLength < 3200) return no(422, WHY.empty[1]);
      /* 30 seconds of 16 kHz mono 16-bit audio is about 960 kB. */
      if (audio.byteLength > 1_050_000) return no(413, "That was longer than 30 seconds. Say it in a shorter turn.");
      const r = await hear(audio);
      return NextResponse.json({ transcript: r.transcript, lang: r.language, confidence: r.confidence, seconds: r.seconds }, { headers: { "Cache-Control": "no-store" } });
    }
    if (op === "speak") {
      if (limited(c.userId, "speak", 90)) return no(429, "Too many voice turns at once. Wait a minute and try again.");
      const body = (await req.json().catch(() => null)) as { text?: unknown; lang?: unknown } | null;
      const text = typeof body?.text === "string" ? body.text : "";
      if (!text.trim()) return no(400, "Nothing to say.");
      const r = await speak(text, isSpeechLanguage(body?.lang) ? body.lang : "en-IN");
      return NextResponse.json({ audio: r.audio, type: r.type, chars: r.chars }, { headers: { "Cache-Control": "no-store" } });
    }
    return no(400, "Unknown voice request.");
  } catch (e) {
    const [status, error] = WHY[e instanceof SarvamError ? e.reason : "provider"] ?? WHY.provider;
    return no(status, error);
  }
}
