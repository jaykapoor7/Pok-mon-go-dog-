import "server-only";
import { kajuStatus } from "@/lib/kaju/status";
import { TOOLS } from "@/lib/kaju/registry";
import { TOOL_DEFS } from "./tools";
import { codeIn, findDate, looksLikeTodo, placeIn, sayDay, stripMention, unpolite } from "./capture";

/* ════════════════════════════════════════════════════════════════════
   Kaju introducing itself, and answering what it did not follow.

   "What can I do with you?" is answered from what is actually wired for
   this person: the chat tools and mission tools that exist (tools.ts and
   the registry), the person's workspace and role as the server verified
   them, and what works on this deployment now versus what needs the
   owner's setup (status.ts). Every example phrasing below is one the
   rule-based router answers today (scripts/test-kaju-capture.ts asks each
   one), so Kaju never offers something it cannot do.
   ════════════════════════════════════════════════════════════════════ */

export type Workspace = "ngo" | "government" | "healthcare" | "research" | null;
export type Who = { org: boolean; office: boolean; workspace: Workspace; firstName: string | null; facility: "clinical" | "staff" | "none" | null; connected: boolean };

type Can = { id: string; line: string; examples: string[]; for: (w: Who) => boolean; needs: string[] };
const chat = new Set<string>(TOOL_DEFS.map((t) => t.name));
const mission = new Set<string>(Object.keys(TOOLS));
const ngo = (w: Who) => w.org && (w.workspace === null || w.workspace === "ngo");
const anyWorkspace = (w: Who) => w.org || w.office || w.workspace === "healthcare" || w.workspace === "government" || w.workspace === "research";

/* Each capability names the tools behind it; one whose tools are not wired is never offered. */
const CAN: Can[] = [
  { id: "tasks", line: "**Tasks**: one line becomes a task with its date, person and record", examples: ["Add a task: call the vet tomorrow", "Remind me to send the package on Monday"], for: anyWorkspace, needs: ["create_task"] },
  { id: "capture", line: "**Records from one line**: a new case, a note, a follow-up or care given", examples: ["Record a brown female limping near Ward 12 market", "Vaccinated Tiger today, batch B-1"], for: ngo, needs: ["prepare_intake", "propose_case", "propose_note", "propose_followup", "propose_care"] },
  { id: "day", line: "**Your day**: what needs you, what is overdue, what changed", examples: ["What's overdue?", "What should I do first?"], for: ngo, needs: ["work_summary", "prepared_work"] },
  { id: "cases", line: "**Questions about cases**: counts, lists and who holds what", examples: ["How many open cases are unassigned?"], for: ngo, needs: ["query_cases"] },
  { id: "abc", line: "**ABC and claims**: evidence gaps, the vet queue, this month's claim", examples: ["Which records are missing evidence?", "Draft this month's claim"], for: ngo, needs: ["find_missing_evidence", "claim_draft"] },
  { id: "followups", line: "**Follow-ups**: the overdue ones, with new dates for you to confirm", examples: ["Prepare overdue follow-ups"], for: ngo, needs: ["overdue_followups"] },
  { id: "office", line: "**Your office's queue**: packages waiting, pre-checked claim by claim", examples: ["What is waiting for me today?", "Show ward coverage and sudden changes", "Draft the monthly report"], for: (w) => w.office, needs: ["office_brief", "ward_activity"] },
  { id: "clinic", line: "**Your facility's bite and PEP work**: doses due, missed doses, referrals, calls to make, a bite record by its code", examples: ["PEP doses due today", "Missed doses", "Which patients should we call?", "Referrals waiting"], for: (w) => w.facility === "clinical" || w.facility === "staff", needs: [] },
  { id: "bite", line: "**A bite record from your note**: only what you wrote; the category only if you wrote it", examples: ["8 year old boy bitten on the left calf by a stray today, category III"], for: (w) => w.facility === "clinical" || w.facility === "staff", needs: [] },
  { id: "howto", line: "**How things work here**: ask “how do I…”", examples: ["How do I add someone to my team?"], for: (w) => w.org, needs: [] },
];
const wired = (c: Can) => c.needs.every((n) => chat.has(n) || mission.has(n) || n === "prepare_intake" || n === "prepare_report");

/** What Kaju can do for this person here, with phrasings that work. No record is read. */
export function capabilities(w: Who, env: Record<string, string | undefined> = process.env): { text: string; suggestions: string[] } {
  const hello = `Hello${w.firstName ? `, ${w.firstName}` : ""}. I'm Kaju.`;
  const mine = CAN.filter((c) => wired(c) && c.for(w));
  if (!mine.length) return { text: `${hello} I can explain published programmes and help you find public records. Sign in to work with your organisation's cases, tasks, follow-ups and reports.`, suggestions: ["Show published programmes", "How do I register my organisation?", "What is ABC?"] };
  const examples = [...new Set(mine.flatMap((c) => c.examples))];
  const pickFrom = mine.map((c) => c.examples[0]);
  const shown = [...new Set([...pickFrom, ...examples])].slice(0, 6);
  const status = kajuStatus(env);
  const model = status.find((s) => s.id === "model");
  const later = [model?.state !== "live" ? "understanding any sentence you write (a model the owner has not connected yet; until then, say it the way the examples do)" : null, w.org && status.find((s) => s.id === "whatsapp")?.state !== "live" ? "reading WhatsApp directly (paste messages to me instead)" : null].filter(Boolean);
  return {
    text: `${hello} Here is what I can do for you here:\n\n${mine.map((c) => `- ${c.line}`).join("\n")}\n\nTry: ${shown.map((s) => `“${s}”`).join(" · ")}\n\nI prepare; you confirm. Nothing is saved until you press Confirm.${w.facility === "clinical" || w.facility === "staff" ? " Clinical decisions stay with the clinician." : ""}${later.length ? `\n\nNot yet: ${later.join("; ")}.` : ""}`,
    suggestions: shown.slice(0, 4),
  };
}

/* ── is this a question about Kaju itself? ───────────────────────────── */
const tidy = (q: string) => unpolite(stripMention(q)).toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
  .replace(/\b(?:wat|wht|waht|whta|whats)\b/g, "what").replace(/\b(?:cn|cna|kan)\b/g, "can").replace(/\bu\b/g, "you").replace(/\b(?:yu|yuo|yo u)\b/g, "you").replace(/\bhw\b/g, "how").replace(/\br\b/g, "are").replace(/\bur\b/g, "your").replace(/\b(?:halp|hlp|hepl)\b/g, "help");
const ABOUT = [
  /^what (?:all |else )?(?:can|could) (?:i|we) (?:do|ask|say)(?: (?:with|using|in|to|here|for))?(?: (?:you|kaju|this|here|it))?$/,
  /^what (?:all |else )?(?:can|could|do|will) you (?:do|help (?:me |us )?with|offer|handle)(?: for (?:me|us))?(?: here)?$/,
  /^what are you (?:capable of|able to do|good at|for|here for)$/, /^what (?:is|are) (?:your|kajus) (?:capabilities|features|skills|abilities|commands)$/,
  /^how (?:do|does) (?:you|kaju|this|it) work$/, /^how (?:can|could|do|will|would) you help(?: me| us)?(?: here| today)?$/, /^how (?:can|do|should) (?:i|we) use (?:you|kaju|this)$/,
  /^what (?:do|can) you (?:know|understand)$/, /^(?:who|what) are you$/, /^what is kaju$/, /^what can kaju do$/,
  /^(?:help|help me|i need help|need help|menu|options|commands|capabilities|features|examples|show me examples|what now|where do i start|how do i start|getting started|get started|start)$/,
  /^(?:tum|aap|tu) kya kya? kar sakte? (?:ho|hain|hai)$/, /^kya kya? kar sakte? (?:ho|hain|hai)$/, /^(?:madad|madad karo|help karo|help kar do|mujhe help chahiye|help chahiye)$/,
];
const GREETING = /^(?:hi+|hey+|hello+|helo|hlo|hellow|hiya|yo|namaste|namaskar|namaskaram|vanakkam|good (?:morning|afternoon|evening|day)|gm|morning|evening|hey there|hi there|hello there)(?: (?:kaju|there|team|all|everyone|ji|bhai|buddy|friend))*$/;
/** "What can I do with you?", "help", "hi Kaju", "tum kya kar sakte ho", typed roughly: the introduction. */
export function asksAboutKaju(q: string): boolean {
  const t = tidy(q);
  return t.length <= 80 && (GREETING.test(t) || ABOUT.some((re) => re.test(t)));
}

/* ── not followed: say what was understood, and the closest things to do ── */
/** What the words contained that Kaju recognised, in a short phrase ("a date (Fri 20 Nov) and a place (Ward 12 market)"), or null. */
export function understoodBits(q: string, now = new Date()): string | null {
  const t = stripMention(q);
  const bits = [
    (() => { const d = findDate(t, now); return d ? `a date (${sayDay(d.day)})` : null; })(),
    (() => { const c = codeIn(t); return c ? `a record code (${c})` : null; })(),
    (() => { const p = placeIn(t); return p ? `a place (${p})` : null; })(),
  ].filter(Boolean) as string[];
  return bits.length ? bits.length === 1 ? bits[0] : `${bits.slice(0, -1).join(", ")} and ${bits[bits.length - 1]}` : null;
}
/** The fallback sentence: honest about what was and was not followed, and that free-form understanding needs a model. */
export function notFollowed(q: string, query: string, modelLive: boolean, now = new Date()): { text: string; first: string | null } {
  const bits = understoodBits(q, now);
  const todo = looksLikeTodo(q, now) ? `Add a task: ${unpolite(stripMention(q)).replace(/^./, (c) => c.toLowerCase())}` : null;
  return {
    text: `I could not match “${query}” to a record or to something I can do.${bits ? ` I picked out ${bits}, but not what to do with ${bits.includes(" and ") ? "them" : "it"}.` : ""}${modelLive ? "" : " I follow set ways of saying things until the owner connects a model for free-form sentences."} The closest things I can do:`,
    first: todo,
  };
}
