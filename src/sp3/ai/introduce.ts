import "server-only";
import { kajuStatus } from "@/lib/kaju/status";
import { TOOLS } from "@/lib/kaju/registry";
import { TOOL_DEFS } from "./tools";
import { codeIn, findDate, looksLikeTodo, placeIn, sayDay, stripMention, unpolite } from "./capture";

/* ════════════════════════════════════════════════════════════════════
   Kaju introducing itself, and answering what it did not follow.

   "What can I do with you?" is answered from what is actually wired for
   this person: the chat tools that exist (tools.ts), the mission tools and
   the decisions reserved for people (the registry), the person's
   workspace, role and facility permissions as the server read them, and
   what works on this deployment now (status.ts). Every example below is a
   phrasing the rule-based router answers today in that workspace
   (scripts/test-kaju-capture.ts asks each one), so Kaju never offers
   something it cannot do. The one-tap suggestions are only questions that
   read records; examples that would prepare a record stay as words to try.
   ════════════════════════════════════════════════════════════════════ */

export type Workspace = "ngo" | "government" | "healthcare" | "research" | null;
export type Who = { org: boolean; office: boolean; signedIn: boolean; workspace: Workspace; firstName: string | null; facility: "clinical" | "staff" | "none" | null; connected: boolean };

/* `ask`: a question that only reads, safe as a one-tap suggestion. `try`: words that prepare something for the person to confirm. */
type Example = { say: string; ask?: true };
type Can = { id: string; line: string; examples: Example[]; for: (w: Who) => boolean; needs: string[] };
const chat = new Set<string>(TOOL_DEFS.map((t) => t.name));
const mission = new Set<string>(Object.keys(TOOLS));
const ngo = (w: Who) => w.org && (w.workspace === null || w.workspace === "ngo");
const clinic = (w: Who) => w.facility === "clinical" || w.facility === "staff";
/* Tasks belong to a workspace the person is a member of: an NGO, a reviewing office, a facility or another partner. */
const member = (w: Who) => w.org || w.office || clinic(w) || (w.signedIn && (w.workspace === "government" || w.workspace === "research" || w.workspace === "healthcare"));

/* Each capability names the tools behind it; one whose tools are not wired is never offered. */
const CAN: Can[] = [
  { id: "tasks", line: "**Tasks**: one line becomes a task with its day, person and record", examples: [{ say: "Add a task: call the vet tomorrow" }, { say: "Remind me to send the package on Monday" }], for: member, needs: ["propose_task", "create_task"] },
  { id: "capture", line: "**Records from one line**: a new case, a note, a follow-up or care given", examples: [{ say: "Record a brown female limping near Ward 12 market" }], for: ngo, needs: ["prepare_intake", "propose_case", "propose_note", "propose_followup", "propose_care"] },
  { id: "day", line: "**Your day**: what needs you first, what is overdue", examples: [{ say: "What should I do first?", ask: true }, { say: "What's overdue?", ask: true }], for: ngo, needs: ["work_summary", "prepared_work"] },
  { id: "cases", line: "**Questions about cases and evidence**: counts, gaps, who holds what", examples: [{ say: "How many open cases are unassigned?", ask: true }, { say: "Which records are missing evidence?", ask: true }], for: ngo, needs: ["query_cases", "find_missing_evidence"] },
  { id: "office", line: "**Your office's queue**: packages waiting, pre-checked claim by claim", examples: [{ say: "What is waiting for me today?", ask: true }, { say: "Show ward coverage and sudden changes", ask: true }], for: (w) => w.office, needs: ["office_brief", "ward_activity"] },
  { id: "clinic", line: "**Your facility's bite and PEP work**: doses due, missed doses, referrals, calls to make, a bite record by its code", examples: [{ say: "PEP doses due today", ask: true }, { say: "Missed doses", ask: true }, { say: "Which patients should we call?", ask: true }, { say: "Referrals waiting", ask: true }], for: clinic, needs: [] },
  { id: "bite", line: "**A bite record from your note**: only what you wrote; the category only if you wrote it", examples: [{ say: "8 year old boy bitten on the left calf by a street dog today, washed at home" }], for: clinic, needs: [] },
];
const wired = (c: Can) => c.needs.every((n) => chat.has(n) || mission.has(n));
/* The decisions the registry keeps for people (level 4), in the words a person uses. */
const KEPT: Record<string, string> = { verify_claim: "a verification", validate_result: "a laboratory result", clinical_decision: "a clinical decision", grant_data_access: "access to restricted data" };
const keptForPeople = () => (Object.entries(TOOLS) as [string, { level: number }][]).filter(([, t]) => t.level === 4).map(([k]) => KEPT[k]).filter(Boolean);

/** What Kaju can do for this person here, with phrasings that work. No record is read. */
export function capabilities(w: Who, env: Record<string, string | undefined> = process.env): { text: string; suggestions: string[] } {
  const hello = `Hello${w.firstName ? `, ${w.firstName}` : ""}. I'm Kaju.`;
  const mine = CAN.filter((c) => wired(c) && c.for(w));
  if (!mine.length) return { text: `${hello} I can explain published programmes and help you find public records. Sign in to work with your organisation's cases, tasks, follow-ups and reports.`, suggestions: ["Show published programmes", "How do I register my organisation?", "What is ABC?"] };
  /* One example from each thing first, then the rest, up to six. */
  const all = [...mine.map((c) => c.examples[0]), ...mine.flatMap((c) => c.examples.slice(1))];
  const shown = all.filter((e, i) => all.findIndex((x) => x.say === e.say) === i).slice(0, 6);
  const status = kajuStatus(env);
  const later = [
    status.find((s) => s.id === "model")?.state !== "live" ? "free-form sentences (say it the way the examples do)" : null,
    w.org && status.find((s) => s.id === "whatsapp")?.state !== "live" ? "reading WhatsApp directly (paste the message to me)" : null,
  ].filter(Boolean);
  const kept = keptForPeople();
  return {
    text: `${hello} Here is what I can do for you here:\n\n${mine.map((c) => `- ${c.line}`).join("\n")}\n\nTry: ${shown.map((e) => `“${e.say}”`).join(" · ")}\n\nI prepare; you confirm. Nothing is saved until you press Confirm.${kept.length ? ` A person always decides ${kept.length > 1 ? `${kept.slice(0, -1).join(", ")} and ${kept[kept.length - 1]}` : kept[0]}.` : ""}${later.length ? `\n\nNot connected yet: ${later.join("; ")}.` : ""}`,
    suggestions: [...new Set(mine.flatMap((c) => c.examples).filter((e) => e.ask).map((e) => e.say))].slice(0, 4),
  };
}

/** Every example phrasing, by capability, for the tests that ask each one in its workspace. */
export const EXAMPLES = Object.fromEntries(CAN.map((c) => [c.id, c.examples.map((e) => e.say)]));

/* ── is this a question about Kaju itself? ───────────────────────────── */
const tidy = (q: string) => unpolite(stripMention(q)).toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
  .replace(/\b(?:wat|wht|waht|whta|whats)\b/g, "what").replace(/\b(?:cn|cna|kan)\b/g, "can").replace(/\bu\b/g, "you").replace(/\b(?:yu|yuo|yo u)\b/g, "you").replace(/\bhw\b/g, "how").replace(/\br\b/g, "are").replace(/\bur\b/g, "your").replace(/\b(?:halp|hlp|hepl)\b/g, "help");
const ABOUT = [
  /^what (?:all |else )?(?:can|could) (?:i|we) (?:do|ask|say)(?: (?:with|using|in|to|here|for))?(?: (?:you|kaju|this|here|it))?$/,
  /^what (?:all |else )?(?:can|could|do|will) you (?:do|help (?:me |us )?with|offer|handle)(?: for (?:me|us))?(?: here)?$/,
  /^what are you (?:capable of|able to do|good at|for|here for)$/, /^what (?:is|are) (?:your|kajus) (?:capabilities|features|skills|abilities|commands)$/,
  /^how (?:do|does) (?:you|kaju|this|it) work$/, /^how (?:can|could|do|will|would) you help(?: me| us)?(?: here| today)?$/, /^how (?:can|do|should) (?:i|we) use (?:you|kaju|this)$/,
  /^what do you (?:know|understand)$/, /^(?:who|what) are you$/, /^what is kaju$/, /^what can kaju do$/,
  /^(?:help|help me|i need help|need help|menu|options|commands|capabilities|features|examples|show me examples|what now|where do i start|how do i start|getting started|get started|start)$/,
  /^(?:(?:tum|aap|tu) )?(?:kya|kya kya) kar sakt(?:e|i|a)(?: ho| hain| hai)?(?: kaju)?$/, /^(?:tum|aap) kaun ho$/, /^(?:madad|madad karo|help karo|help kar do|mujhe help chahiye|help chahiye)$/,
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
/** The fallback sentence: what was not followed, what was picked out, and (for words that read like a to-do with a day) the
    same words offered back as a task for the person to send, never prepared on a guess. */
export function notFollowed(q: string, query: string, now = new Date()): { text: string; first: string | null } {
  const bits = understoodBits(q, now);
  const todo = looksLikeTodo(q, now) ? `Add a task: ${unpolite(stripMention(q)).replace(/^./, (c) => c.toLowerCase())}` : null;
  return {
    text: `I could not match “${query}” to a record or a task.${bits ? ` I picked out ${bits}, but not what to do with ${bits.includes(" and ") ? "them" : "it"}.` : ""} The closest things I can do:`,
    first: todo,
  };
}

/* The closest things a clinical person can ask, by the words they used. */
const CLINIC_ASKS: { ask: string; keys: string[] }[] = [
  { ask: "PEP doses due today", keys: ["dose", "doses", "due", "today", "pep", "vaccine", "injection", "schedule", "arv"] },
  { ask: "Missed doses", keys: ["missed", "late", "overdue", "skipped", "defaulter", "return"] },
  { ask: "Which patients should we call?", keys: ["call", "phone", "remind", "reminder", "patients", "contact"] },
  { ask: "Referrals waiting", keys: ["referral", "referrals", "referred", "transfer", "rig", "immunoglobulin", "hospital"] },
  { ask: "Which bites need a category?", keys: ["category", "assess", "assessment", "clinician", "waiting", "bite", "bites"] },
];
/** Up to three clinical questions closest to the words (the first three when nothing is close). */
export function nearestClinic(text: string): string[] {
  const words = new Set(text.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2));
  const scored = CLINIC_ASKS.map((s) => ({ s, n: s.keys.filter((k) => [...words].some((w) => w === k || (w.length > 4 && (w.startsWith(k) || k.startsWith(w))))).length })).sort((a, b) => b.n - a.n);
  const hits = scored.filter((x) => x.n > 0).map((x) => x.s.ask);
  return (hits.length ? hits : CLINIC_ASKS.map((s) => s.ask)).slice(0, 3);
}
