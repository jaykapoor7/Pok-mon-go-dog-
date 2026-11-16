import { TOOLS, type Intent, type Level, type ToolName } from "./registry";

/* What Kaju can do, said the way a person needs to read it before anything starts: who is responsible for each step,
   what it will change, and which of Kaju's real tools sit behind each capability. Nothing here runs or reads; it
   describes the registry. Shared by the app and the server, so it holds no secrets and reads no environment. */

/** The person who decides a step Kaju is never allowed to do. Words from the registry's own descriptions. */
export const DECIDER: Partial<Record<ToolName, string>> = {
  verify_claim: "A reviewing officer",
  validate_result: "Laboratory staff",
  clinical_decision: "A clinician",
  grant_data_access: "The data steward",
};

export type Duty = "kaju" | "you" | "person" | "off";
/** Who is responsible for a step at the level it will run at here (the registry's, raised by organisation rules). */
export function duty(tool: string, level: number): { tone: Duty; who: string; how: string } {
  if (level >= 9) return { tone: "off", who: "Switched off", how: "Your organisation has switched this off" };
  if (level === 4) return { tone: "person", who: DECIDER[tool as ToolName] ?? "A person", how: "Kaju never does this. You mark it done here" };
  if (level === 3) return { tone: "you", who: "You approve", how: "Kaju does it once you approve" };
  if (level === 1) return { tone: "kaju", who: "Kaju", how: "Drafts only" };
  if (level === 0) return { tone: "kaju", who: "Kaju", how: "Reads only" };
  return { tone: "kaju", who: "Kaju", how: "Runs on its own" };
}

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const quote = (v: string, n = 140) => `“${v.length > n ? `${v.slice(0, n - 1)}…` : v}”`;
export const shortDate = (iso: string) => { const d = new Date(`${iso.slice(0, 10)}T00:00:00`); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };
const OUTSIDE: Record<string, string> = { email: "an email", sms: "a text message", whatsapp: "a WhatsApp message" };

/** What a step will change, in one sentence, from its tool and its details. `names` turns member ids into names. */
export function effect(tool: string, input: Record<string, unknown>, names: (id: string) => string | null = () => null): string {
  switch (tool) {
    case "find_due_followups": {
      const place = s(input.place), when = s(input.when);
      return `Reads open cases${place ? ` in ${place}` : ""}${when && when !== "any" ? ` due ${when}` : ""} that have no open follow-up task. Changes nothing.`;
    }
    case "find_overdue_cases": return "Reads open cases past their due date. Changes nothing.";
    case "create_task": {
      const who = s(input.assignee_id) ? names(s(input.assignee_id)) ?? "a member" : s(input.assignee_name);
      return `Adds the task ${quote(s(input.title) || "Untitled")}${who ? ` for ${who}` : ""}${s(input.due_on) ? `, due ${shortDate(s(input.due_on))}` : ""}.`;
    }
    case "create_followup_tasks": return `Adds one follow-up task for each case step ${Number(input.from_step) || 1} finds${s(input.team) ? `, for ${s(input.team)}` : ""}. A case that already has an open follow-up is skipped.`;
    case "post_message": return `Posts in #${s(input.channel) || "a channel"} as Kaju, on your behalf: ${quote(s(input.body))}`;
    case "notify_members": {
      const ids = Array.isArray(input.user_ids) ? input.user_ids.map(String) : [];
      const who = ids.map((id) => names(id) ?? "a member");
      return `Sends an in-app notification to ${who.length > 3 ? `${who.slice(0, 3).join(", ")} and ${who.length - 3} more` : who.join(", ") || "members"}: ${quote(s(input.title))}`;
    }
    case "send_external": return `Prepares ${OUTSIDE[s(input.channel)] ?? "a message"} to ${s(input.to) || "someone outside StrayPaw"}${s(input.subject) ? `, ${quote(s(input.subject), 80)}` : ""}. It leaves StrayPaw only after you approve it, through a connected account.`;
    default: {
      const who = DECIDER[tool as ToolName];
      if (who) return `Nothing changes in StrayPaw until ${who.toLowerCase()} decides and it is marked done here.${s(input.note) ? ` Note: ${s(input.note)}` : ""}`;
      return "Runs one of Kaju's tools.";
    }
  }
}

/* ── Capabilities: Kaju's tools grouped by the work they do. Every group is made of real registry tools. ── */
export type Group = { id: string; name: string; line: string; tools: ToolName[] };
export const GROUPS: Group[] = [
  { id: "find", name: "Finding work", line: "Reads open cases that are due, or past their date.", tools: ["find_due_followups", "find_overdue_cases"] },
  { id: "tasks", name: "Tasks and assignments", line: "Creates a task, or one follow-up task per case found.", tools: ["create_task", "create_followup_tasks"] },
  { id: "team", name: "Team messages", line: "Posts in your channels and notifies members inside StrayPaw.", tools: ["post_message", "notify_members"] },
  { id: "outside", name: "Messages outside StrayPaw", line: "Prepares an email or message. Nothing leaves until you approve.", tools: ["send_external"] },
  { id: "people", name: "Decisions for people", line: "Verification, laboratory, clinical and data-access decisions wait for the person with the authority.", tools: ["verify_claim", "validate_result", "clinical_decision", "grant_data_access"] },
];
export const levelOf = (tool: ToolName, levels: Partial<Record<string, number>> = {}) => (levels[tool] ?? TOOLS[tool].level) as Level | 9;

/* ── Ready-made jobs: the plans Kaju can make by fixed rules, as fill-in sentences. No model is involved. ── */
export type JobId = Intent["action"];
export type Job = { id: JobId; name: string; line: string; tools: ToolName[] };
export const JOBS: Job[] = [
  { id: "prepare_followups", name: "Prepare follow-ups", line: "Find cases due a follow-up, create a task for each after you approve, and tell a channel.", tools: ["find_due_followups", "create_followup_tasks", "post_message"] },
  { id: "find_overdue", name: "Check overdue cases", line: "List open cases past their due date, and tell a channel if you want.", tools: ["find_overdue_cases", "post_message"] },
  { id: "create_task", name: "Create a task", line: "One task, for a person, with a date.", tools: ["create_task"] },
  { id: "message_channel", name: "Post in a channel", line: "Your words, posted by Kaju in a channel you can read.", tools: ["post_message"] },
  { id: "email", name: "Email someone", line: "A prepared email that waits for your approval.", tools: ["send_external"] },
];

/** A sentence for an Intent, as the person would have said it. Used to title what is being planned. */
export function intentWords(i: Intent): string {
  const at = i.place ? ` in ${i.place}` : "", due = i.when && i.when !== "any" ? ` due ${i.when}` : "";
  switch (i.action) {
    case "prepare_followups": return `Prepare follow-ups${at}${due}${i.team ? ` for ${i.team}` : ""}${i.channel ? ` and tell #${i.channel}` : ""}`;
    case "find_overdue": return `Check overdue cases${i.channel ? ` and tell #${i.channel}` : ""}`;
    case "create_task": return `Create a task: ${i.title ?? ""}${i.assignee_name ? ` for ${i.assignee_name}` : ""}${i.due_on ? ` due ${i.due_on}` : ""}`;
    case "message_channel": return `Post in #${i.channel}: ${i.body ?? ""}`;
    case "email": return `Email ${i.to}: ${i.body ?? ""}`;
  }
}

/* ── What a step may be edited with, before it starts or before it is approved. Only the words a person would change. ── */
export type FieldSpec = { key: string; label: string; kind: "text" | "long" | "date" | "place" | "when" | "channel" | "person" | "people" | "outside" };
export const FIELDS: Partial<Record<ToolName, FieldSpec[]>> = {
  find_due_followups: [{ key: "place", label: "Place", kind: "place" }, { key: "when", label: "Due", kind: "when" }],
  create_task: [{ key: "title", label: "Task", kind: "text" }, { key: "assignee_id", label: "For", kind: "person" }, { key: "due_on", label: "Due", kind: "date" }, { key: "note", label: "Note", kind: "long" }],
  create_followup_tasks: [{ key: "team", label: "For (team or person)", kind: "text" }],
  post_message: [{ key: "channel", label: "Channel", kind: "channel" }, { key: "body", label: "Words", kind: "long" }],
  notify_members: [{ key: "user_ids", label: "Who", kind: "people" }, { key: "title", label: "Title", kind: "text" }, { key: "body", label: "Words", kind: "long" }],
  send_external: [{ key: "channel", label: "How", kind: "outside" }, { key: "to", label: "To", kind: "text" }, { key: "subject", label: "Subject", kind: "text" }, { key: "body", label: "Words", kind: "long" }],
  verify_claim: [{ key: "note", label: "What the person should decide", kind: "text" }],
  validate_result: [{ key: "note", label: "What the person should decide", kind: "text" }],
  clinical_decision: [{ key: "note", label: "What the person should decide", kind: "text" }],
  grant_data_access: [{ key: "note", label: "What the person should decide", kind: "text" }],
};

/** Steps a person can add to a plan, each a real tool with a sensible starting point. */
export const ADDABLE: { tool: ToolName; name: string; input: Record<string, unknown> }[] = [
  { tool: "create_task", name: "A task for someone", input: { title: "" } },
  { tool: "post_message", name: "Tell a channel", input: { body: "" } },
  { tool: "notify_members", name: "Notify members", input: { user_ids: [], title: "" } },
  { tool: "send_external", name: "Email someone outside StrayPaw", input: { channel: "email", to: "", subject: "", body: "" } },
  { tool: "verify_claim", name: "A reviewing officer decides", input: {} },
  { tool: "validate_result", name: "Laboratory staff validate", input: {} },
  { tool: "clinical_decision", name: "A clinician decides", input: {} },
  { tool: "grant_data_access", name: "The data steward decides", input: {} },
];

/** Clean a step's edited details back to what the tool accepts: blank words are left out, never sent as empty. */
export function cleanInput(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => !(v === "" || v === null || v === undefined || (Array.isArray(v) && !v.length))).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));
}
