import "server-only";
import type { AiReply } from "./types";

/* Pilot observability for Kaju: one row per answer in kaju_turn_log, written by the server (service role) for the
   person it verified; people read only their own rows. It records what kind of thing happened, never what was said: no question text, no
   answer text, no record names. Everything here is deterministic and costs nothing to run. */

export type Surface = "dock" | "page" | "channel" | "voice" | "capture" | "other";
export const SURFACES: readonly Surface[] = ["dock", "page", "channel", "voice", "capture", "other"];
export type Outcome = "answered" | "prepared" | "clarify" | "no_match" | "limit" | "refused" | "error";
type Db = { from: (t: string) => { insert: (row: Record<string, unknown>) => { select: (c: string) => { single: () => PromiseLike<{ data: unknown; error: unknown }> } } } };

/** Drawing tools change only how an answer looks; they say nothing about what was asked. */
const PRESENTATION = new Set(["show", "ask_blanks"]);

const DEVANAGARI = /[ऀ-ॿ]/;
const HINGLISH = /\b(kitne|kitna|kitni|kya|kaun|kahan|kab|dikhao|batao|karo|kar do|bhejo|aaj|kal|abhi|kutte|kutta|wala|wale|mera|meri|hamare|humare|hai|hain|nahi|nahin|chahiye|jaldi|pichle|agle|hafte|mahine)\b/i;
/** The language of a question, roughly: Hindi in Devanagari, Hinglish, English or other. */
export function languageOf(q: string): "en" | "hi" | "hinglish" | "other" {
  if (DEVANAGARI.test(q)) return "hi";
  if (HINGLISH.test(q)) return "hinglish";
  return /^[\x00-\x7F‘-”–—₹]*$/.test(q) ? "en" : "other";
}

/** A follow-up that corrects the previous answer ("no, I meant…", "galat", "not that one"). */
export const isCorrection = (q: string) => /^\s*(no+|nope|not that|not this|wrong|that'?s wrong|thats not|that is not|i meant|actually|galat|nahi[n]?\b.*(ye|yeh|woh)|nahin)\b/i.test(q);

/** A page's address with record ids and codes replaced, so the log names the kind of page, never the record. */
export function pageKind(path: string | null | undefined): string | null {
  if (!path) return null;
  const p = path.split(/[?#]/)[0].slice(0, 200)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[id]")
    .split("/").map((seg, i, all) => (i > 0 && /\d/.test(seg) && seg !== "[id]") || (i === all.length - 1 && all[i - 1] === "channels") ? "[id]" : seg).join("/");
  return p.slice(0, 80) || "/";
}

/** How an answer ended, from what it carries: never from its wording alone, except the engine's own fixed notices. */
export function outcomeOf(reply: Pick<AiReply, "tools" | "proposals" | "suggestions" | "blocks" | "notice" | "text">): Outcome {
  const notice = reply.notice ?? "";
  if (/limit|cut off|incomplete/i.test(notice)) return "limit";
  if (/^I can't help with that request\.$/.test(reply.text.trim())) return "refused";
  if (reply.proposals.length) return "prepared";
  if (reply.blocks?.some((b) => b.kind === "blanks")) return "clarify";
  const ran = reply.tools.filter((t) => !PRESENTATION.has(t.name));
  if (!ran.length && reply.suggestions?.length) return "no_match";
  return "answered";
}

/** What the person was after, named by the first record tool that ran; conversation when none ran. */
export function intentOf(reply: Pick<AiReply, "tools">): string {
  const first = reply.tools.find((t) => !PRESENTATION.has(t.name));
  return first ? first.name.slice(0, 60) : "conversation";
}

export type TurnRow = {
  orgId: string | null; workspace: string | null; surface: Surface; path: string | null; question: string;
  reply: AiReply | null; latencyMs: number; retry: boolean; error?: boolean;
};

/** The row as stored: counts and names of tools only. */
export function turnRecord(t: TurnRow) {
  const r = t.reply;
  return {
    org_id: t.orgId, workspace: t.workspace?.slice(0, 40) ?? null, surface: t.surface, page_kind: pageKind(t.path),
    intent: r ? intentOf(r) : null, engine: r?.engine ?? "tools", outcome: t.error || !r ? "error" : outcomeOf(r),
    tools: r ? [...new Set(r.tools.map((x) => x.name.slice(0, 40)))].slice(0, 16) : [],
    tool_failures: r ? Math.min(r.tools.filter((x) => !x.ok).length, 50) : 0,
    proposals: r ? Math.min(r.proposals.length, 50) : 0, citations: r ? Math.min(r.citations.length, 200) : 0,
    latency_ms: Math.max(0, Math.min(Math.round(t.latencyMs), 600000)),
    input_tokens: r?.usage?.inputTokens ?? null, output_tokens: r?.usage?.outputTokens ?? null, cost_inr: r?.usage?.costInr ?? null,
    retry: t.retry, correction: isCorrection(t.question), lang: languageOf(t.question),
  };
}

/** Write one row with the server's own connection, for the user id the server verified (people cannot write these rows
    themselves, so pilot figures cannot be padded). Best effort: a failed or impossible write never changes the answer;
    it returns null and the answer is not rateable. */
export async function logTurn(admin: unknown, userId: string, t: TurnRow): Promise<string | null> {
  if (!admin || !userId) return null;
  try {
    const { data, error } = await (admin as Db).from("kaju_turn_log").insert({ user_id: userId, ...turnRecord(t) }).select("id").single();
    if (error || !data || typeof (data as { id?: unknown }).id !== "string") return null;
    return (data as { id: string }).id;
  } catch { return null; }
}
