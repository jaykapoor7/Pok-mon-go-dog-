import { z } from "zod";

/* Kaju's tools, as the app and the server see them. The database holds the same list (nx_kaju_tools) and decides again
   when each step runs; this copy validates a plan before it is ever sent, so a malformed or invented step from a model,
   a composer or a crafted request is refused at the door, with a reason a person can read.

   Levels: 0 reads, 1 drafts, 2 runs on its own (internal, low risk), 3 asks first, 4 a person decides (never run). */

export type Level = 0 | 1 | 2 | 3 | 4;
export const LEVEL_WORD: Record<Level | 9, string> = { 0: "Reads only", 1: "Drafts only", 2: "Runs on its own", 3: "Asks you first", 4: "A person decides", 9: "Switched off" };
export const WHY: Partial<Record<Level, string>> = {
  3: "It changes several records at once or reaches someone outside StrayPaw, so you approve it first.",
  4: "Kaju never makes this decision. The step waits until a person with the authority does it and marks it done.",
};

const uuid = z.string().uuid();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "a date as YYYY-MM-DD");
const channelName = z.string().regex(/^[a-z0-9][a-z0-9-]{1,39}$/, "a channel name such as field-ops");
const recordKind = z.enum(["animal", "case", "submission", "programme", "appointment", "study", "package"]);
const when = z.enum(["today", "tomorrow", "this week", "next week", "any"]);
const humanNote = z.object({ note: z.string().max(400).optional(), href: z.string().regex(/^\//).max(300).optional() }).strict();

export const TOOLS = {
  find_due_followups: { label: "Find cases due a follow-up", level: 0, external: false,
    input: z.object({ place: z.string().trim().min(2).max(80).optional(), when: when.optional() }).strict() },
  find_overdue_cases: { label: "Find overdue cases", level: 0, external: false, input: z.object({}).strict() },
  create_task: { label: "Create a task", level: 2, external: false,
    input: z.object({ title: z.string().trim().min(1).max(240), note: z.string().max(2000).optional(), due_on: day.optional(), assignee_id: uuid.optional(),
      assignee_name: z.string().max(80).optional(), record_kind: recordKind.optional(), record_id: z.string().max(80).optional(), record_label: z.string().max(160).optional(), channel_id: uuid.optional() }).strict() },
  create_followup_tasks: { label: "Create follow-up tasks", level: 3, external: false,
    input: z.object({ from_step: z.number().int().min(1).max(20), team: z.string().max(80).optional() }).strict() },
  post_message: { label: "Post in a channel", level: 2, external: false,
    input: z.object({ channel: channelName.optional(), channel_id: uuid.optional(), body: z.string().trim().min(1).max(4000),
      record_kind: recordKind.optional(), record_id: z.string().max(80).optional(), record_label: z.string().max(160).optional() }).strict()
      .refine((v) => !!v.channel || !!v.channel_id, "name the channel") },
  notify_members: { label: "Notify members", level: 2, external: false,
    input: z.object({ user_ids: z.array(uuid).min(1).max(50), title: z.string().trim().min(1).max(200), body: z.string().max(500).optional(), href: z.string().regex(/^\//).max(300).optional() }).strict() },
  send_external: { label: "Send an email or WhatsApp message", level: 3, external: true,
    input: z.object({ channel: z.enum(["email", "whatsapp", "sms"]), to: z.string().trim().min(3).max(200), subject: z.string().max(200).optional(), body: z.string().trim().min(1).max(4000) }).strict() },
  verify_claim: { label: "Decide a verification", level: 4, external: false, input: humanNote },
  validate_result: { label: "Validate a laboratory result", level: 4, external: false, input: humanNote },
  clinical_decision: { label: "Make a clinical decision", level: 4, external: false, input: humanNote },
  grant_data_access: { label: "Grant access to restricted data", level: 4, external: false, input: humanNote },
} as const satisfies Record<string, { label: string; level: Level; external: boolean; input: z.ZodTypeAny }>;

export type ToolName = keyof typeof TOOLS;
export const TOOL_NAMES = Object.keys(TOOLS) as ToolName[];
export type PlanStep = { label: string; tool: ToolName; input: Record<string, unknown> };
export type Plan = { title: string; steps: PlanStep[] };

const MAX_STEPS = 20;
/** Check a plan before anything is started. Returns the cleaned plan or the first reason it cannot run. */
export function validatePlan(raw: unknown): { ok: true; plan: Plan } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "No plan was given." };
  const r = raw as { title?: unknown; steps?: unknown };
  const title = typeof r.title === "string" ? r.title.trim().slice(0, 240) : "";
  if (!title) return { ok: false, error: "The plan needs a title." };
  if (!Array.isArray(r.steps) || r.steps.length < 1) return { ok: false, error: "The plan has no steps." };
  if (r.steps.length > MAX_STEPS) return { ok: false, error: `A plan has at most ${MAX_STEPS} steps.` };
  const steps: PlanStep[] = [];
  for (const [i, s] of r.steps.entries()) {
    const n = i + 1;
    if (!s || typeof s !== "object") return { ok: false, error: `Step ${n} is not a step.` };
    const st = s as { label?: unknown; tool?: unknown; input?: unknown };
    if (typeof st.tool !== "string" || !(st.tool in TOOLS)) return { ok: false, error: `Step ${n} asks for a tool Kaju does not have${typeof st.tool === "string" ? ` (${st.tool.slice(0, 40)})` : ""}.` };
    const tool = st.tool as ToolName;
    const parsed = TOOLS[tool].input.safeParse(st.input ?? {});
    if (!parsed.success) return { ok: false, error: `Step ${n} (${TOOLS[tool].label}): ${parsed.error.issues[0]?.message ?? "the details are not valid"}.` };
    if (tool === "create_followup_tasks") {
      const from = (parsed.data as { from_step: number }).from_step;
      if (from >= n || steps[from - 1]?.tool !== "find_due_followups") return { ok: false, error: `Step ${n} must build on an earlier "find cases due a follow-up" step.` };
    }
    const label = typeof st.label === "string" && st.label.trim() ? st.label.trim().slice(0, 240) : TOOLS[tool].label;
    steps.push({ label, tool, input: parsed.data as Record<string, unknown> });
  }
  return { ok: true, plan: { title, steps } };
}

/** What a person sees before starting: each step, how it runs, and why it waits. `levels` comes from the database for the organisation. */
export function preview(plan: Plan, levels: Partial<Record<string, number>> = {}) {
  return plan.steps.map((s, i) => {
    const level = (levels[s.tool] ?? TOOLS[s.tool].level) as Level | 9;
    return { n: i + 1, label: s.label, tool: s.tool, level, how: LEVEL_WORD[level], waits: level >= 3, why: level === 9 ? "Your organisation has switched this tool off." : WHY[level as Level] ?? null, external: TOOLS[s.tool].external };
  });
}

/* ── The composer's structured request, and fixed-rule plans for it ───────────────────────────────────────────── */

export type Intent = {
  action: "prepare_followups" | "find_overdue" | "create_task" | "message_channel" | "email";
  place?: string | null; when?: z.infer<typeof when> | null; team?: string | null; channel?: string | null;
  assignee_id?: string | null; assignee_name?: string | null; title?: string | null; body?: string | null; to?: string | null; due_on?: string | null;
};

/** A plan from a confirmed request, by fixed rules: no model involved, so it works the same with or without one. */
export function planFromIntent(i: Intent): Plan | null {
  const at = i.place ? ` in ${i.place}` : "";
  const due = i.when && i.when !== "any" ? ` due ${i.when}` : "";
  switch (i.action) {
    case "prepare_followups": {
      const steps: PlanStep[] = [
        { label: `Find cases${at}${due} that need a follow-up`, tool: "find_due_followups", input: { ...(i.place ? { place: i.place } : {}), ...(i.when ? { when: i.when } : {}) } },
        { label: `Create a follow-up task for each${i.team ? `, for ${i.team}` : ""}`, tool: "create_followup_tasks", input: { from_step: 1, ...(i.team ? { team: i.team } : {}) } },
      ];
      if (i.channel) steps.push({ label: `Tell #${i.channel}`, tool: "post_message", input: { channel: i.channel, body: `Follow-up tasks${at}${due} are ready${i.team ? ` for ${i.team}` : ""}.` } });
      return { title: `Prepare follow-ups${at}${due}`, steps };
    }
    case "find_overdue": {
      const steps: PlanStep[] = [{ label: "Find overdue cases", tool: "find_overdue_cases", input: {} }];
      if (i.channel) steps.push({ label: `Tell #${i.channel}`, tool: "post_message", input: { channel: i.channel, body: "Kaju checked the open cases that are past their due date. The list is with Kaju in StrayPaw." } });
      return { title: "Check overdue cases", steps };
    }
    case "create_task":
      if (!i.title) return null;
      return { title: `Task: ${i.title}`, steps: [{ label: `Create the task${i.assignee_name ? ` for ${i.assignee_name}` : ""}`, tool: "create_task", input: { title: i.title, ...(i.assignee_id ? { assignee_id: i.assignee_id } : i.assignee_name ? { assignee_name: i.assignee_name } : {}), ...(i.due_on ? { due_on: i.due_on } : {}) } }] };
    case "message_channel":
      if (!i.channel || !i.body) return null;
      return { title: `Post in #${i.channel}`, steps: [{ label: `Post in #${i.channel}`, tool: "post_message", input: { channel: i.channel, body: i.body } }] };
    case "email":
      if (!i.to || !i.body) return null;
      return { title: `Write to ${i.to}`, steps: [{ label: `Email ${i.to}`, tool: "send_external", input: { channel: "email", to: i.to, subject: i.title ?? "From StrayPaw", body: i.body } }] };
  }
}

/** The tool schema offered to a model for proposing a plan. It can only propose; nothing runs until a person starts it. */
export const PROPOSE_TOOL = {
  name: "propose_mission",
  description: "Propose a plan for the person to review. It is not started: the person reads the steps and starts it. Use only the listed tools. Steps that change several records or reach outside StrayPaw will wait for approval; decisions reserved for people (verification, lab validation, clinical decisions, data access) are added as person-only steps, never done by Kaju.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "A short title in plain words." },
      steps: { type: "array", maxItems: MAX_STEPS, items: { type: "object", properties: {
        label: { type: "string", description: "What this step does, in plain words." },
        tool: { type: "string", enum: TOOL_NAMES },
        input: { type: "object", description: "The tool's details." },
      }, required: ["label", "tool", "input"] } },
      not_possible: { type: "string", description: "If the request cannot be done with these tools, say why, and give no steps." },
    },
    required: ["title", "steps"],
  },
};
