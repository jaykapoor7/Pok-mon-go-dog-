import "server-only";

/* ════════════════════════════════════════════════════════════════════
   Sarvam AI for staff Kaju: speech in (Saaras), speech out (Bulbul) and
   reading scanned pages (Sarvam Vision). The chat itself never goes
   through here: a spoken question becomes text, the person's own /api/ai
   call answers it with their own access, and the answer is read aloud.

   Off unless the owner approved each use by name:
     STRAYPAW_SARVAM_APPROVED = "speech"            (hear and speak)
                              | "documents"         (scanned pages)
                              | "speech,documents"
   and a key is present. Anything else keeps every function here closed.
   Nothing is stored, and no words, audio or file content are logged: a
   log line holds the operation, a status and a size only.
   ════════════════════════════════════════════════════════════════════ */

export type SarvamUse = "speech" | "documents";
const key = (env: Record<string, string | undefined> = process.env) => (env.SARVAM_API_KEY ?? env.SARVAM_VOICE_API_KEY ?? "").trim();
export function sarvamApproved(use: SarvamUse, env: Record<string, string | undefined> = process.env) {
  if (!key(env)) return false;
  return (env.STRAYPAW_SARVAM_APPROVED ?? "").split(",").map((s) => s.trim()).includes(use);
}

/** Languages Kaju speaks and hears (BCP-47, as Sarvam names them). */
export const SPEECH_LANGUAGES = ["en-IN", "hi-IN", "kn-IN", "ta-IN", "te-IN", "ml-IN", "mr-IN", "bn-IN", "gu-IN", "pa-IN", "od-IN"] as const;
export type SpeechLanguage = (typeof SPEECH_LANGUAGES)[number];
export const isSpeechLanguage = (v: unknown): v is SpeechLanguage => typeof v === "string" && (SPEECH_LANGUAGES as readonly string[]).includes(v);

const BASE = "https://api.sarvam.ai";
const log = (op: string, status: number | string, size: number, ms: number) => console.info("kaju_sarvam", { op, status, size, ms });
export class SarvamError extends Error { constructor(public reason: "off" | "provider" | "network" | "empty" | "timeout", public status = 0) { super(reason); } }

/** One spoken turn (WAV, at most 30 seconds) to text in the language it was spoken in. The detected language comes back. */
export async function hear(audio: ArrayBuffer, env: Record<string, string | undefined> = process.env): Promise<{ transcript: string; language: SpeechLanguage | null; confidence: number | null; seconds: number }> {
  if (!sarvamApproved("speech", env)) throw new SarvamError("off");
  const started = Date.now();
  const body = (model: string) => {
    const form = new FormData();
    form.append("file", new Blob([audio], { type: "audio/wav" }), "turn.wav");
    form.append("model", model);
    /* codemix: Indian-language words in their own script, English words in English, as people actually speak at work. */
    form.append("mode", "codemix");
    form.append("language_code", "unknown");
    return form;
  };
  const call = (model: string) => fetch(`${BASE}/speech-to-text`, { method: "POST", headers: { "api-subscription-key": key(env) }, body: body(model), signal: AbortSignal.timeout(20_000), cache: "no-store" });
  /* 16 kHz mono 16-bit WAV: 32,000 bytes a second after the 44-byte header. */
  const seconds = Math.max(0, Math.round((audio.byteLength - 44) / 32000));
  try {
    /* The current model first; the previous one only when the first is refused as a bad request. */
    let r = await call(env.SARVAM_STT_MODEL?.trim() || "saaras:v4");
    if (r.status === 400 || r.status === 422) r = await call("saaras:v3");
    log("hear", r.status, audio.byteLength, Date.now() - started);
    if (!r.ok) throw new SarvamError("provider", r.status);
    const j = (await r.json()) as { transcript?: string; language_code?: string | null; language_probability?: number | null };
    const transcript = String(j.transcript ?? "").trim().slice(0, 1200);
    if (!transcript) throw new SarvamError("empty");
    return { transcript, language: isSpeechLanguage(j.language_code) ? j.language_code : null, confidence: typeof j.language_probability === "number" ? j.language_probability : null, seconds };
  } catch (e) {
    if (e instanceof SarvamError) throw e;
    log("hear", "network", audio.byteLength, Date.now() - started);
    throw new SarvamError(e instanceof Error && e.name === "TimeoutError" ? "timeout" : "network");
  }
}

/** Text to speech in one language, as MP3 (base64). The text is said as written; nothing is translated here. */
export async function speak(text: string, language: SpeechLanguage, env: Record<string, string | undefined> = process.env): Promise<{ audio: string; type: "audio/mpeg"; chars: number }> {
  if (!sarvamApproved("speech", env)) throw new SarvamError("off");
  const line = text.replace(/\s+/g, " ").trim().slice(0, 1400);
  if (!line) throw new SarvamError("empty");
  const started = Date.now();
  const base = { text: line, model: env.SARVAM_TTS_MODEL?.trim() || "bulbul:v3", speaker: env.SARVAM_TTS_SPEAKER?.trim() || "shubh", pace: Math.min(1.4, Math.max(0.8, Number(env.SARVAM_TTS_PACE) || 1.1)), speech_sample_rate: 24000, output_audio_codec: "mp3" };
  const call = (body: Record<string, unknown>) => fetch(`${BASE}/text-to-speech`, { method: "POST", headers: { "api-subscription-key": key(env), "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20_000), cache: "no-store" });
  try {
    /* The language field has had two names across Bulbul versions; the second is tried only when the first is refused as a bad request. */
    let r = await call({ ...base, target_language_code: language });
    if (r.status === 400 || r.status === 422) r = await call({ ...base, language_code: language });
    log("speak", r.status, line.length, Date.now() - started);
    if (!r.ok) throw new SarvamError("provider", r.status);
    const audio = ((await r.json()) as { audios?: string[] }).audios?.[0];
    if (!audio) throw new SarvamError("provider", r.status);
    return { audio, type: "audio/mpeg", chars: line.length };
  } catch (e) {
    if (e instanceof SarvamError) throw e;
    log("speak", "network", line.length, Date.now() - started);
    throw new SarvamError(e instanceof Error && e.name === "TimeoutError" ? "timeout" : "network");
  }
}

/* ── scanned pages ─────────────────────────────────────────────────── */
const cell = (s: string) => s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
/** A table Sarvam returns as HTML, as tab-separated lines a person (and a model) can read. */
export function tableToText(html: string) {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => cell(c[1])).join("\t"));
  return rows.length ? rows.join("\n") : cell(html);
}
type Block = { text?: string; layout_tag?: string; reading_order?: number };
type ParseResult = { documents?: { page_count?: number; pages?: { page_num?: number; blocks?: Block[] }[]; error?: { message?: string } }[] };
export function parseResultText(result: ParseResult) {
  const pages = (result.documents ?? []).flatMap((d) => d.pages ?? []);
  const text = pages.map((p) => (p.blocks ?? []).slice().sort((a, b) => (a.reading_order ?? 0) - (b.reading_order ?? 0))
    .map((b) => (/<table/i.test(b.text ?? "") ? tableToText(b.text ?? "") : cell(b.text ?? ""))).filter(Boolean).join("\n")).join("\n\n");
  return { text, pages: pages.length };
}

/** Read a scanned PDF or a photo of a page (print or handwriting, Indian languages and English) into text.
    Waits for the job within `budgetMs`; a job that is not ready in time is reported, never guessed. */
export async function readScan(bytes: Uint8Array, filename: string, mime: string, budgetMs = 45_000, env: Record<string, string | undefined> = process.env): Promise<{ text: string; pages: number }> {
  if (!sarvamApproved("documents", env)) throw new SarvamError("off");
  const started = Date.now(), headers = { "api-subscription-key": key(env) };
  const form = new FormData();
  form.append("file", new Blob([bytes as BlobPart], { type: mime }), filename.replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "page");
  form.append("output_format", "json");
  form.append("content_type", "mixed");
  try {
    const sub = await fetch(`${BASE}/doc-ai/v1/job/parse`, { method: "POST", headers, body: form, signal: AbortSignal.timeout(25_000), cache: "no-store" });
    if (sub.status !== 201 && sub.status !== 200) { log("scan", sub.status, bytes.byteLength, Date.now() - started); throw new SarvamError("provider", sub.status); }
    const id = String(((await sub.json()) as { job_id?: string }).job_id ?? "");
    if (!/^[\w-]{6,80}$/.test(id)) throw new SarvamError("provider", sub.status);
    for (;;) {
      if (Date.now() - started > budgetMs) { log("scan", "timeout", bytes.byteLength, Date.now() - started); throw new SarvamError("timeout"); }
      await new Promise((r) => setTimeout(r, 1500));
      const st = (await (await fetch(`${BASE}/doc-ai/v1/job/${id}/status`, { headers, signal: AbortSignal.timeout(10_000), cache: "no-store" })).json()) as { status?: string };
      const s = String(st.status ?? "").toLowerCase();
      if (s === "failed" || s === "rejected") { log("scan", s, bytes.byteLength, Date.now() - started); throw new SarvamError("provider"); }
      if (s === "completed" || s === "partially_completed") break;
    }
    const res = await fetch(`${BASE}/doc-ai/v1/job/${id}/results`, { headers, signal: AbortSignal.timeout(15_000), cache: "no-store" });
    if (!res.ok) throw new SarvamError("provider", res.status);
    const out = parseResultText((await res.json()) as ParseResult);
    log("scan", 200, bytes.byteLength, Date.now() - started);
    if (!out.text.trim()) throw new SarvamError("empty");
    return out;
  } catch (e) {
    if (e instanceof SarvamError) throw e;
    log("scan", "network", bytes.byteLength, Date.now() - started);
    throw new SarvamError(e instanceof Error && e.name === "TimeoutError" ? "timeout" : "network");
  }
}
