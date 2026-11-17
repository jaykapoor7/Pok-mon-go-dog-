import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { modelCredentials, publicBiteTurn, withInferenceSlot } from "@/lib/ai/inference";

/* Kaju's bite help on a model: a resident says what happened in any words, and Kaju understands, fills the report,
   asks only what is still missing and answers questions along the way.

   The model proposes; fixed rails decide. The danger-sign question, the emergency advice, the advice to see a
   doctor today and the report the person confirms are fixed text in the app, never the model's. The model can
   never send anything: the person confirms the report, and the app sends it. Every fact the model returns is
   checked here (areas from the programme's own list, a date in the last 30 days, a phone number's digits) and the
   next step is checked against what is still missing, so Kaju never asks for something it already has. Nothing is
   stored or logged: no transcript, no report, no location. */

import { ASK, BITE_NEXT, KINDS, OWN, SKIP, SPECIES, WHO, YN, cleanFacts, railNext, type BiteFacts, type BiteNext } from "@/oh/biteFacts";

export { NO_FACTS, cleanFacts, mustAsk, railNext, type BiteFacts, type BiteNext } from "@/oh/biteFacts";
export type BiteTurnIn = { turns: { who: "me" | "kaju"; text: string }[]; facts: BiteFacts; showing: string; areas: string[]; programme: string; mode: "chat" | "call"; today: string };
export type BiteTurnOut = { reply: string; next: BiteNext; quick: string[]; facts: BiteFacts; fixed: boolean };
const pickOf = <T extends string>(list: readonly T[], v: unknown): T | null => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null);
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) || null : null);

const SYSTEM = (programme: string, areas: string[], mode: "chat" | "call", how = "Always answer by calling kaju_turn exactly once.") => `You are Kaju, StrayPaw's assistant. You help a resident of ${programme} right after an animal bite or scratch: get them to care today, and tell the nearest anti-rabies clinic they are coming. You sound like a calm, kind, capable person on a helpline. Plain words, short sentences, warm but never gushing. Never robotic, never repeat yourself, never re-ask what you already know.

The app has already greeted them and given first aid (wash the wound with soap and running water for 15 minutes). Don't repeat either unless asked.

Each turn you read the conversation and the report so far, update the report with everything the person has told you, and choose what comes next. ${how}

How the conversation goes:
1. Understanding. Read whatever they say, in any words or language, and fill every fact you can: what happened (kind), the animal (species) and whose it is (ownership), who was hurt (person), the area, the place (a landmark or street, in their words), the date (on, as YYYY-MM-DD, from words like "this morning" or "two days ago") with their words in "when", and what the animal looked like (looks). One sentence can answer many questions; never ask for something they have already told you, even in passing.
2. Safety. While "danger" is unknown, set next to "danger". The app then shows a fixed safety question (heavy bleeding or a deep wound; several bites, or bites on the face, head, neck or hands; a young child, or someone unwell). Don't write that question yourself: in one short, warm sentence, say back what you understood. Set danger to "yes" if they mention any of those signs, and to "no" only when they say none apply. The app then gives the fixed advice (call 108, or see a doctor today).
3. Only what's missing, one short question at a time, each with its reason when that helps: where it happened (next "where"); when (next "when"); the animal, if unknown (next "animal"); what it looked like, so the area's animal team can find it (next "looks"); whether the clinic may call them back (next "call"), then the number if yes (next "phone").
   - Where: one question covers it. Any answer works: a landmark, a street, an area, "near my office in Koramangala". They can also share their location or drop a pin with the app's buttons. The place it happened is where the animal is usually seen unless they say otherwise; don't ask that separately.
   - If they don't know, can't say or want to skip, add that item to "skipped" and move on. Never ask about a skipped item again.
   - Never ask whether to tell the clinic: sending the report is that decision.
4. When nothing important is missing, set next "review". The app shows the report and asks whether to send it to the nearest anti-rabies centre, so they know it's coming; you say one short line, like "Thanks, that's everything. Here's your report."
5. At review, if they agree ("yes", "send it", "ok go ahead"), set next "send". If they'd rather not send it, set notify "no" and next "centres": the app shows where to go. If they correct something, update it and set next "review" again. "Start again" means next "restart".

Questions along the way: answer briefly and kindly in one or two sentences, then ask the open question again in a few words, and keep next on that step.

Never break these:
- Never assess the wound, the risk of rabies, or whether a vaccine is needed. Never name medicines, doses, schedules or treatments. A doctor decides; they should see one today, even for a small bite or scratch. Rabies vaccine is free at government hospitals in India; you can say that.
- Never say rabies can be ruled out, and never suggest waiting to see if the animal gets ill. No home remedies (chilli, turmeric, oil, lime); if asked, say not to put anything on the wound.
- Anything life-threatening, heavy bleeding or trouble breathing: call 108 now.
- Never ask for a name, address or ID. A phone number only if they want a call back.
- Don't invent facts. "area" must be one of these exactly, or left empty: ${areas.length ? areas.join(", ") : "(no list)"}. If their place isn't in that list, keep their words in "place" and leave "area" empty. Don't mention the list.
- Off-topic requests get one friendly line, then back to helping.

Style: ${mode === "call" ? "this is a phone call; your reply is spoken aloud, so 1 or 2 short spoken sentences, no symbols, numbers said simply. Reply in English (it is translated for the caller)." : "1 or 2 short sentences, at most one question. Reply in the language the person writes in."} No lists, no markdown, no emoji. Don't start with "Got it" every time; vary naturally.

"quick" holds up to 3 very short replies the person might tap next, in their language (for example "This morning", "Near 100 Feet Road", "Brown, no collar"). Leave it empty for the safety, call-back and review steps: the app adds its own buttons there.`;

const TOOL: Anthropic.Tool = {
  name: "kaju_turn",
  description: "Kaju's reply to the person, the report as now understood, and the next step.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["reply", "next", "facts", "quick"],
    properties: {
      reply: { type: "string", description: "What Kaju says now. 1-2 short sentences, at most one question." },
      next: { type: "string", enum: [...BITE_NEXT] },
      quick: { type: "array", items: { type: "string" }, maxItems: 3 },
      facts: {
        type: "object",
        additionalProperties: false,
        description: "The whole report as now understood. null for anything not known.",
        properties: {
          kind: { type: ["string", "null"], enum: [...KINDS, null] },
          species: { type: ["string", "null"], enum: [...SPECIES, null] },
          ownership: { type: ["string", "null"], enum: [...OWN, null] },
          person: { type: ["string", "null"], enum: [...WHO, null] },
          area: { type: ["string", "null"] },
          place: { type: ["string", "null"] },
          on: { type: ["string", "null"], description: "YYYY-MM-DD" },
          when: { type: ["string", "null"] },
          looks: { type: ["string", "null"] },
          danger: { type: ["string", "null"], enum: [...YN, null] },
          notify: { type: ["string", "null"], enum: [...YN, null] },
          callback: { type: ["string", "null"], enum: [...YN, null] },
          phone: { type: ["string", "null"] },
          skipped: { type: "array", items: { type: "string", enum: [...SKIP] } },
        },
      },
    },
  },
};

/** The conversation as the model reads it: the person's words and Kaju's, newest last, with the report and what
    the app is showing beside the newest message. */
function messages(input: BiteTurnIn): Anthropic.MessageParam[] {
  const turns = input.turns.filter((t) => t.text.trim()).slice(-24);
  while (turns.length && turns[0].who !== "me") turns.shift();
  const out: Anthropic.MessageParam[] = [];
  for (const t of turns) {
    const role = t.who === "me" ? "user" : "assistant";
    const text = t.text.slice(0, 700);
    const last = out[out.length - 1];
    if (last && last.role === role) last.content = `${last.content as string}\n${text}`;
    else out.push({ role, content: text });
  }
  if (!out.length || out[out.length - 1].role !== "user") out.push({ role: "user", content: "(no words yet)" });
  const last = out[out.length - 1];
  const { pinned, ...facts } = input.facts;
  last.content = `<app>\nToday in India: ${input.today}.\nThe report so far: ${JSON.stringify({ ...facts, location_shared: pinned })}\nThe app is now showing: ${SHOWING[input.showing] ?? input.showing}.\n</app>\n\n${last.content as string}`;
  return out;
}
const SHOWING: Record<string, string> = {
  tell: "the question 'What happened?'", danger: "the fixed safety question with Yes and No buttons", urgent: "the emergency advice to call 108, and the question whether to tell the clinic",
  notify: "the question whether to tell the nearest clinic, with Yes and No buttons", where: "the question where it happened, with buttons to share location or drop a pin",
  when: "the question when it happened", animal: "the question what animal it was", looks: "the question what the animal looked like",
  call: "the question whether the clinic may call back", phone: "the question for the phone number", review: "the report to confirm, with a Send button",
  sending: "the report being sent", done: "the confirmation that the report was sent, and where to go", closed: "the list of centres to go to",
};

type Client = { messages: { create: (body: Anthropic.MessageCreateParamsNonStreaming, opts?: { signal?: AbortSignal; timeout?: number }) => Promise<Anthropic.Message> } };
type Raw = { reply?: unknown; next?: unknown; quick?: unknown; facts?: unknown };
const sarvamKey = (env: Record<string, string | undefined>) => (env.SARVAM_API_KEY ?? env.SARVAM_VOICE_API_KEY ?? "").trim();

/** Claude: the turn as a call to kaju_turn. null when it cannot answer. */
async function viaClaude(api: Client, model: string, gateway: boolean, maxTokens: number, input: BiteTurnIn, signal?: AbortSignal): Promise<Raw | null> {
  const body: Anthropic.MessageCreateParamsNonStreaming = {
    model, max_tokens: maxTokens,
    output_config: { effort: "low" },
    system: SYSTEM(input.programme, input.areas, input.mode),
    tools: [TOOL], tool_choice: { type: "auto" },
    messages: messages(input),
  };
  let res: Anthropic.Message;
  try {
    res = await api.messages.create(body, { signal, timeout: 25_000 });
  } catch (e) {
    /* A gateway or model that does not take the effort setting: once more without it. */
    if (!(e instanceof Anthropic.BadRequestError)) { console.info("bite_ai", { provider: "claude", status: e instanceof Anthropic.APIError ? e.status : "network", gateway }); return null; }
    try { const { output_config: _drop, ...plain } = body; void _drop; res = await api.messages.create(plain, { signal, timeout: 25_000 }); }
    catch (e2) { console.info("bite_ai", { provider: "claude", status: e2 instanceof Anthropic.APIError ? e2.status : "network" }); return null; }
  }
  if (res.stop_reason === "refusal") return null;
  const use = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === TOOL.name);
  const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join(" ").trim();
  return use ? (use.input as Raw) : text ? { reply: text, next: "none" } : null;
}

/* Sarvam's chat model, through the same key as Kaju's voice: the same instructions and the same report, as
   structured JSON. Strict JSON schemas need every property listed, so nullable fields are all required here. */
const nullable = (e?: readonly (string | null)[]) => (e ? { type: ["string", "null"], enum: [...e] } : { type: ["string", "null"] });
const SARVAM_SCHEMA = {
  type: "object", additionalProperties: false, required: ["reply", "next", "quick", "facts"],
  properties: {
    reply: { type: "string" }, next: { type: "string", enum: [...BITE_NEXT] }, quick: { type: "array", items: { type: "string" } },
    facts: {
      type: "object", additionalProperties: false,
      required: ["kind", "species", "ownership", "person", "area", "place", "on", "when", "looks", "danger", "notify", "callback", "phone", "skipped"],
      properties: {
        kind: nullable([...KINDS, null]), species: nullable([...SPECIES, null]), ownership: nullable([...OWN, null]), person: nullable([...WHO, null]),
        area: nullable(), place: nullable(), on: nullable(), when: nullable(), looks: nullable(),
        danger: nullable([...YN, null]), notify: nullable([...YN, null]), callback: nullable([...YN, null]), phone: nullable(),
        skipped: { type: "array", items: { type: "string", enum: [...SKIP] } },
      },
    },
  },
};
async function viaSarvam(key: string, model: string, maxTokens: number, input: BiteTurnIn, signal?: AbortSignal): Promise<Raw | null> {
  const msgs = messages(input).map((m) => ({ role: m.role, content: m.content as string }));
  try {
    const r = await withInferenceSlot(() => fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST", headers: { "api-subscription-key": key, "Content-Type": "application/json" }, cache: "no-store",
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(22_000)]) : AbortSignal.timeout(22_000),
      body: JSON.stringify({
        model, max_tokens: maxTokens, temperature: 0.3, reasoning_effort: "low",
        messages: [{ role: "system", content: SYSTEM(input.programme, input.areas, input.mode, "Answer with the JSON object only: reply, next, quick and facts (the whole report, null for anything not known).") }, ...msgs],
        response_format: { type: "json_schema", json_schema: { name: "kaju_turn", schema: SARVAM_SCHEMA, strict: true } },
      }),
    }));
    if (!r.ok) { console.info("bite_ai", { provider: "sarvam", status: r.status }); return null; }
    const j = (await r.json()) as { choices?: { message?: { content?: string | null }; finish_reason?: string }[] };
    const content = j.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    const json = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
    return JSON.parse(json) as Raw;
  } catch { console.info("bite_ai", { provider: "sarvam", status: "network" }); return null; }
}

/** One turn on the model. null when the model is off, over its cap, unreachable or unclear: the app then uses its
    fixed rules for this turn. Claude when a Claude key is set; otherwise Sarvam's model with the voice key; otherwise
    Claude through the project's own AI Gateway identity, where the owner allows it. */
export async function biteTurn(input: BiteTurnIn, signal?: AbortSignal, env: Record<string, string | undefined> = process.env, client?: Client): Promise<BiteTurnOut | null> {
  const decision = publicBiteTurn(env);
  if (!decision.allowed) return null;
  const max = decision.budget.maxOutputTokens;
  let raw: Raw | null = null;
  if (client) raw = await viaClaude(client, env.STRAYPAW_BITE_AI_MODEL?.trim() || "claude-opus-5-5", false, max, input, signal);
  else {
    const keyed = !!(env.ANTHROPIC_API_KEY?.trim() || env.AI_GATEWAY_API_KEY?.trim());
    const sk = sarvamKey(env);
    const claude = async () => {
      const cred = await modelCredentials(decision, env);
      if (!cred) return null;
      const model = env.STRAYPAW_BITE_AI_MODEL?.trim() || (cred.gateway ? "anthropic/claude-opus-5.5" : "claude-opus-5-5");
      const sdk = new Anthropic({ maxRetries: 1, ...(cred.gateway ? { apiKey: null, authToken: cred.token, baseURL: "https://ai-gateway.vercel.sh" } : { apiKey: cred.token }) });
      return viaClaude({ messages: { create: (body, opts) => withInferenceSlot(() => sdk.messages.create(body, opts)) } }, model, cred.gateway, max, input, signal);
    };
    const sarvam = () => viaSarvam(sk, env.STRAYPAW_BITE_AI_SARVAM_MODEL?.trim() || "sarvam-105b-conversations", max, input, signal);
    raw = keyed ? (await claude()) ?? (sk ? await sarvam() : null) : sk ? (await sarvam()) ?? (await claude()) : await claude();
  }
  if (!raw) return null;
  const reply = clip(raw.reply, 400);
  if (!reply) return null;
  const facts = cleanFacts(raw.facts, input.areas, input.today, input.facts);
  if (input.facts.pinned) facts.pinned = true;
  /* Only the person clears the safety check: "no danger" counts only as an answer to the safety question itself.
     The model may raise danger at any moment, never assume its absence. */
  if (facts.danger === "no" && input.facts.danger !== "no" && input.showing !== "danger") facts.danger = input.facts.danger;
  const asked = pickOf(BITE_NEXT, raw.next) ?? "none";
  const { next, fixed } = railNext(asked, facts, input.showing);
  /* Tap-replies come from the app's own buttons; the model's suggestions repeated what it already knew. */
  return { reply: fixed && next in ASK ? ASK[next as keyof typeof ASK] : reply, next, quick: [], facts, fixed };
}
