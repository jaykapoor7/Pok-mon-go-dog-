import "server-only";
import type { AiReply, ChatTurn } from "@/sp3/ai/types";
import { answerWithModel, type DemoClient } from "./model";
import { answerByRules, STARTERS } from "./rules";

/* One answer from Kaju on the homepage's sample programme. A model answers when the owner has switched it on and the
   caller's limits allow it (`model: true`); otherwise, and whenever the model cannot answer, the fixed rules do. The
   reply has the product's own shape (AiReply), so the product's own conversation components draw it. */

export const DEMO_LIMITS = { turns: 12, chars: 600, perConversation: 24 } as const;
export const DEMO_NOTICE = "Sample programme: illustrative records, nothing is saved";

export async function answerDemo(messages: ChatTurn[], opts: { model: boolean; why?: string; signal?: AbortSignal; progress?: (e: { tool: string; summary: string; ok: boolean }) => void; env?: Record<string, string | undefined>; client?: DemoClient }): Promise<AiReply> {
  const turns = messages.filter((m) => m.text?.trim()).slice(-DEMO_LIMITS.turns).map((m) => ({ role: m.role, text: m.text.slice(0, m.role === "user" ? DEMO_LIMITS.chars : 1500) }));
  /* The model needs the conversation to open with the visitor's words. */
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user") return { text: "Ask me something about the sample programme.", citations: [], tools: [], proposals: [], suggestions: STARTERS.slice(0, 3), engine: "tools", notice: DEMO_NOTICE };
  const question = turns[turns.length - 1].text;
  if (opts.model) {
    const r = await answerWithModel(turns, { signal: opts.signal, progress: opts.progress, env: opts.env, client: opts.client });
    if (opts.signal?.aborted) throw Error("Kaju request cancelled");
    if (r) return { ...r, notice: DEMO_NOTICE };
  }
  return { ...answerByRules(question, opts.progress), notice: [DEMO_NOTICE, opts.why].filter(Boolean).join(" · ") };
}
