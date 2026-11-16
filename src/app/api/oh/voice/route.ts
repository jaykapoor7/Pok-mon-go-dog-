import { NextResponse } from "next/server";
import { flagOn } from "@/lib/flags";

/* Kaju's voice for bite help, through Sarvam AI: speech-to-text (Saaras, any Indian language to English, so Kaju's
   fixed rules can read it) and text-to-speech (Bulbul, one voice for the whole call). Replies in Hindi or Kannada are
   machine-translated from Kaju's fixed English lines (Mayura) and are marked as awaiting review.

   The key stays on the server. The route runs only where bite help itself is switched on (the citizen_bite_assist
   flag: the demonstration site), only for requests from this site, with size caps and per-visitor limits. Nothing is
   stored or logged: no audio, no transcript, no text; a log line holds the operation and a status code only. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const key = () => (process.env.SARVAM_API_KEY ?? process.env.SARVAM_VOICE_API_KEY ?? "").trim();
const on = () => flagOn("citizen_bite_assist") && key().length > 0;
const LANGS = new Set(["en-IN", "hi-IN", "kn-IN"]);
const MODEL = () => process.env.SARVAM_TTS_MODEL?.trim() || "bulbul:v3";
const SPEAKER = () => process.env.SARVAM_TTS_SPEAKER?.trim() || "shubh";
const PACE = () => Math.min(1.4, Math.max(0.8, Number(process.env.SARVAM_TTS_PACE) || 1.1));
const no = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/* Per visitor, per server instance: a public demo, so generous for a real call and closed to scripts. */
const hits = new Map<string, number[]>();
function limited(who: string, op: string, max: number, windowMs: number) {
  const k = `${op}:${who}`, now = Date.now();
  const recent = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { hits.set(k, recent); return true; }
  recent.push(now); hits.set(k, recent);
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

/* Kaju's lines repeat from call to call: the same line in the same language is said from memory. */
const said = new Map<string, { audio: string; text: string }>();

export async function GET() {
  return NextResponse.json({ sarvam: on() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!on()) return no(404, "off");
  if (!sameSite(req)) return no(403, "origin");
  const who = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  const op = new URL(req.url).searchParams.get("op") ?? "speak";

  if (op === "hear") {
    if (limited(who, "hear", 80, 10 * 60_000)) return no(429, "limit");
    const audio = await req.arrayBuffer();
    if (audio.byteLength < 800) return no(400, "empty");
    if (audio.byteLength > 1_200_000) return no(413, "long");
    const form = new FormData();
    form.append("file", new Blob([audio], { type: "audio/wav" }), "answer.wav");
    form.append("model", "saaras:v3");
    form.append("mode", "translate");
    form.append("language_code", "unknown");
    try {
      const r = await fetch("https://api.sarvam.ai/speech-to-text", { method: "POST", headers: { "api-subscription-key": key() }, body: form, signal: AbortSignal.timeout(15_000), cache: "no-store" });
      if (!r.ok) { console.info("bite_voice", { op, status: r.status }); return no(502, "provider"); }
      const j = (await r.json()) as { transcript?: string; language_code?: string | null; language_probability?: number | null };
      return NextResponse.json({ transcript: String(j.transcript ?? "").slice(0, 600), lang: j.language_code ?? null, p: j.language_probability ?? null }, { headers: { "Cache-Control": "no-store" } });
    } catch { console.info("bite_voice", { op, status: "network" }); return no(504, "network"); }
  }

  if (op !== "speak") return no(400, "op");
  let body: { text?: unknown; lang?: unknown };
  try { body = await req.json(); } catch { return no(400, "json"); }
  const text = String(body.text ?? "").replace(/\s+/g, " ").trim().slice(0, 600);
  const lang = typeof body.lang === "string" && LANGS.has(body.lang) ? body.lang : "en-IN";
  if (!text) return no(400, "empty");
  const memo = `${lang}|${MODEL()}|${SPEAKER()}|${text}`;
  const hit = said.get(memo);
  if (hit) return NextResponse.json({ audio: hit.audio, type: "audio/mpeg", text: hit.text }, { headers: { "Cache-Control": "no-store" } });
  if (limited(who, "speak", 160, 10 * 60_000)) return no(429, "limit");
  try {
    let line = text;
    if (lang !== "en-IN") {
      const t = await fetch("https://api.sarvam.ai/translate", { method: "POST", headers: { "api-subscription-key": key(), "Content-Type": "application/json" }, signal: AbortSignal.timeout(10_000), cache: "no-store",
        body: JSON.stringify({ input: text, source_language_code: "en-IN", target_language_code: lang, model: "mayura:v1", mode: "modern-colloquial" }) });
      if (t.ok) line = String(((await t.json()) as { translated_text?: string }).translated_text ?? text) || text;
    }
    const r = await fetch("https://api.sarvam.ai/text-to-speech", { method: "POST", headers: { "api-subscription-key": key(), "Content-Type": "application/json" }, signal: AbortSignal.timeout(15_000), cache: "no-store",
      body: JSON.stringify({ text: line, target_language_code: lang, model: MODEL(), speaker: SPEAKER(), pace: PACE(), temperature: 0.4, speech_sample_rate: 24000, output_audio_codec: "mp3" }) });
    if (!r.ok) { console.info("bite_voice", { op, status: r.status }); return no(502, "provider"); }
    const j = (await r.json()) as { audios?: string[] };
    const audio = j.audios?.[0];
    if (!audio) return no(502, "provider");
    if (said.size > 400) said.delete(said.keys().next().value as string);
    said.set(memo, { audio, text: line });
    return NextResponse.json({ audio, type: "audio/mpeg", text: line }, { headers: { "Cache-Control": "no-store" } });
  } catch { console.info("bite_voice", { op, status: "network" }); return no(504, "network"); }
}
