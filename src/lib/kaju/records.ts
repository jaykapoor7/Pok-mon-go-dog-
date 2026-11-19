import { TOOLS, validatePlan, type Plan } from "./registry";
import { shortDate } from "./capabilities";

/* Kaju's work about a record. Work handed to Kaju from a case, an animal or a package carries a link to that record in
   its `request` (nx_missions.request.record: kind, id, label, workspace), so its card can say what it is about and the
   record can list it. The link is a label, never a permission: the record is read again with the person's own access
   wherever it is shown, and the work is seen only by the person who asked for it (RLS).

   The starting points below are plans made by fixed rules from Kaju's real tools (registry.ts). No model is involved,
   nothing runs here, and each plan goes through the same review, validation and approval levels as any other. */

export const RECORD_KINDS = ["case", "animal", "package"] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];
export type RecordWs = "ngo" | "gov";
export type RecordLink = { kind: RecordKind; id: string; label: string; ws: RecordWs };

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A record link from untrusted input (a request body, a stored mission), or null when it is not one. */
export function recordLinkOf(raw: unknown): RecordLink | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const kind = typeof r.kind === "string" && (RECORD_KINDS as readonly string[]).includes(r.kind) ? (r.kind as RecordKind) : null;
  const id = typeof r.id === "string" && ID.test(r.id) ? r.id.toLowerCase() : null;
  const label = typeof r.label === "string" ? r.label.replace(/\s+/g, " ").trim().slice(0, 160) : "";
  if (!kind || !id) return null;
  const ws: RecordWs = r.ws === "gov" && kind === "package" ? "gov" : "ngo";
  return { kind, id, label: label || KIND_WORD[kind], ws };
}

export const KIND_WORD: Record<RecordKind, string> = { case: "Case", animal: "Animal", package: "Package" };
/** Where the record lives in the app. */
export function recordHref(l: Pick<RecordLink, "kind" | "id" | "ws">): string {
  if (l.kind === "case") return `/ngo/cases/${l.id}`;
  if (l.kind === "animal") return `/ngo/animals/${l.id}`;
  return l.ws === "gov" ? `/gov/verification/${l.id}` : `/ngo/submissions/${l.id}`;
}

/** What a step will make, in a few words. */
export function makes(tool: string, input: Record<string, unknown> = {}): string {
  const ch = typeof input.channel === "string" && input.channel ? `#${input.channel}` : "a channel";
  switch (tool) {
    case "find_due_followups": return "A list of cases due a follow-up";
    case "find_overdue_cases": return "A list of overdue cases";
    case "create_task": return "One task";
    case "create_followup_tasks": return "A follow-up task for each case, once you approve";
    case "post_message": return `A message in ${ch}`;
    case "notify_members": return "In-app notifications";
    case "send_external": return "An email, sent only after you approve";
    case "verify_claim": return "A verification decision, by a reviewing officer";
    case "validate_result": return "A validated result, by laboratory staff";
    case "clinical_decision": return "A clinical decision, by a clinician";
    case "grant_data_access": return "An access decision, by the data steward";
    default: return "Its result";
  }
}

/* ── Starting points ─────────────────────────────────────────────────────────────────────────────────────────── */
/** What the app already knows about the record, read with the person's own access. All optional. */
export type RecordFacts = { title?: string | null; place?: string | null; due?: string | null; holder?: string | null; openTasks?: number; channels?: string[] };
export type HandoffStart = { id: string; name: string; line: string; plan: Plan };

const day = (iso: string) => iso.slice(0, 10);
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const linkOn = (l: RecordLink) => ({ record_kind: l.kind, record_id: l.id, record_label: clip(l.label, 160) });

/** The plans Kaju can make for this record from its real tools. `today` is YYYY-MM-DD in India. Every plan returned
    passes validatePlan as it is, except a channel message, which needs a channel when the organisation has none. */
export function handoffStarts(l: RecordLink, f: RecordFacts, today: string): HandoffStart[] {
  const out: HandoffStart[] = [];
  const what = f.title?.trim() ? clip(f.title.trim(), 120) : l.label;
  const tomorrow = addDays(today, 1);
  const due = f.due && day(f.due) >= today ? day(f.due) : tomorrow;
  const channel = f.channels?.[0];
  const tell = (body: string): HandoffStart => ({
    id: "tell", name: "Tell the team", line: `Kaju posts in ${channel ? `#${channel}` : "a channel you choose"} with this ${l.kind === "animal" ? "animal" : l.kind} attached, so the conversation stays with the record.`,
    plan: { title: `Tell the team about ${l.label}`, steps: [{ label: channel ? `Tell #${channel}` : "Tell a channel", tool: "post_message", input: { ...(channel ? { channel } : {}), body, ...linkOn(l) } }] },
  });

  if (l.kind === "case") {
    const already = f.openTasks ? ` It already has ${f.openTasks === 1 ? "an open task" : `${f.openTasks} open tasks`}; check you need another.` : "";
    out.push({ id: "followup", name: "Prepare a follow-up", line: `Kaju adds one follow-up task on this case, due ${shortDate(due)}${f.holder ? `, for ${f.holder}` : ""}.${already}`,
      plan: { title: `Follow up ${l.label}`, steps: [{ label: "Add a follow-up task on this case", tool: "create_task", input: { title: clip(`Follow up: ${what}`, 240), due_on: due, ...(f.holder ? { assignee_name: clip(f.holder, 80) } : {}), ...linkOn(l) } }] } });
    if (f.place?.trim()) {
      const place = clip(f.place.trim(), 80);
      out.push({ id: "area", name: `Prepare follow-ups in ${place}`, line: `Kaju finds open cases in ${place} with no follow-up task, this one included if it has none, then waits for your approval before adding a task for each.`,
        plan: { title: `Prepare follow-ups in ${place}`, steps: [
          { label: `Find open cases in ${place} that need a follow-up`, tool: "find_due_followups", input: { place, when: "any" } },
          { label: "Create a follow-up task for each", tool: "create_followup_tasks", input: { from_step: 1 } },
        ] } });
    }
    out.push(tell(`Can someone pick up ${l.label}${what !== l.label ? ` (${what})` : ""}? Details are on the case.`));
  } else if (l.kind === "animal") {
    out.push({ id: "check", name: "A check on this animal", line: `Kaju adds one task to check on ${l.label}, due ${shortDate(tomorrow)}, linked to the animal.`,
      plan: { title: `Check on ${l.label}`, steps: [{ label: "Add a task to check on this animal", tool: "create_task", input: { title: clip(`Check on ${l.label}`, 240), due_on: tomorrow, ...linkOn(l) } }] } });
    out.push(tell(`Has anyone seen ${l.label} recently? Details are on the animal's record.`));
  } else {
    out.push({ id: "finish", name: "A task to finish it", line: `Kaju adds one task to check this package before it goes to the office, due ${shortDate(tomorrow)}.`,
      plan: { title: `Finish ${l.label}`, steps: [{ label: "Add a task to check this package", tool: "create_task", input: { title: clip(`Check the package: ${l.label}`, 240), due_on: tomorrow, ...linkOn(l) } }] } });
    out.push(tell(`${l.label} needs a check before it goes to the office. Details are on the package.`));
  }
  return out;
}

/** True when every step of a starting point is one of Kaju's tools and the plan is valid (or only lacks a channel). */
export function startIsReal(s: HandoffStart): boolean {
  if (!s.plan.steps.every((x) => x.tool in TOOLS)) return false;
  const v = validatePlan(s.plan);
  return v.ok || /name the channel/.test(v.error);
}
