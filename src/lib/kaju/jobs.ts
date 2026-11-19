import { DECIDER } from "./capabilities";

/* Kaju's work, in plain words. A request Kaju runs in several steps is stored as a row in nx_missions with its steps in
   nx_mission_steps; the tables keep their names, but a person never reads that word. They see what Kaju is doing in one
   line, the steps as a checklist, what was made, and the step that waits for them. These helpers are pure (no React, no
   network) so the scripts can hold them: test-kaju-rooms.ts. */

export type JobStep = { state: string; label: string; tool: string | null; note?: string | null };
export type JobTone = "ok" | "warn" | "bad" | "accent" | "plain";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isJobId = (s: unknown): s is string => typeof s === "string" && ID.test(s);

const decider = (tool: string | null) => (DECIDER[tool as keyof typeof DECIDER] ?? "A person");
const waiting = (steps: JobStep[]) => steps.find((s) => s.state === "waiting_approval" || s.state === "waiting_person");

/** Where the work stands, as one or two words, and its tone. */
export function jobWord(state: string, steps: JobStep[] = []): [string, JobTone] {
  const w = waiting(steps);
  switch (state) {
    case "draft": return ["Not started", "plain"];
    case "ready": return ["Starting", "accent"];
    case "running": return ["Kaju is working", "accent"];
    case "retrying": return ["Trying again", "warn"];
    case "waiting_person": return w?.state === "waiting_person" ? [`Waiting for ${decider(w.tool).toLowerCase()}`, "warn"] : ["Waiting for you", "warn"];
    case "waiting_partner": return ["Waiting for a partner", "warn"];
    case "blocked": return ["Stopped", "bad"];
    case "completed": return ["Done", "ok"];
    case "cancelled": return [steps.some((s) => (s.state === "cancelled" || s.state === "skipped") && s.note) ? "Rejected" : "Cancelled", "plain"];
    default: return [state, "plain"];
  }
}

/** What Kaju is doing now, in one line. */
export function jobLine(state: string, steps: JobStep[]): string {
  const cur = steps.find((s) => !["done", "skipped", "cancelled"].includes(s.state));
  if (state === "completed") return "Every step is done";
  if (state === "cancelled") return "Stopped. What was already done stays";
  if (!cur) return "";
  if (cur.state === "waiting_approval") return `Waiting for your approval: ${cur.label}`;
  if (cur.state === "waiting_person") return `Waiting for ${decider(cur.tool).toLowerCase()}: ${cur.label}`;
  if (cur.state === "failed") return `Stopped at: ${cur.label}`;
  if (cur.state === "retrying") return `Trying again soon: ${cur.label}`;
  if (cur.state === "running") return `Working on: ${cur.label}`;
  return `Next: ${cur.label}`;
}

/** Whether the work needs this person now (an approval or a decision marked done here), or stopped and can be retried. */
export const needsYou = (state: string) => state === "waiting_person" || state === "blocked";
export const isOpen = (state: string) => !["completed", "cancelled"].includes(state);

/* The database writes a short line for each thing that happens, and the words of some of its errors and notifications.
   Those strings are composed inside database functions (supabase/migrations/20261116110000_rebuild_kaju_engine.sql) and
   change only with a migration (proposed: supabase/proposed/2026-11-18-kaju-plain-words.sql). Until then they are shown
   through this, so the word stays out of what a person reads. Only whole known phrases are changed; anything else is
   shown as it was written. */
const PLAIN: [RegExp, string][] = [
  [/^Mission completed\.$/i, "Every step is done."],
  [/The deadline passed before the mission finished\./i, "The finish-by date passed before every step was done."],
  [/Open the mission to retry or cancel\./i, "Open it to try again or stop it."],
  [/Only the person who started this mission (decides its steps|can retry it|can approve it)\./i, "Only the person who asked Kaju for this $1."],
  [/This mission is not waiting for approval\./i, "This is not waiting for approval."],
  [/This mission cannot be cancelled\./i, "This can no longer be stopped."],
  [/Too many missions started in the last minute\./i, "Kaju was asked to start too much in the last minute."],
  [/a mission has 1 to 20 steps/i, "a plan has 1 to 20 steps"],
  [/a mission needs a title/i, "a plan needs a title"],
  [/(\d+) Kaju missions waiting/i, "$1 waiting for approval in Kaju"],
  [/(SMS|WhatsApp) from missions is not connected\./i, "$1 from Kaju is not connected."],
  [/\bmissions?\b/gi, "Kaju's work"],
];
export function plainWords(text: string | null | undefined): string {
  if (!text) return "";
  let t = text;
  for (const [re, to] of PLAIN) t = t.replace(re, to);
  return t;
}

/** Old links to the retired pages (/kaju/missions, /kaju/missions/<id>, /kaju/approvals?m=<id>) open the same work in
    place: Kaju's home with the work open over it. Anything else is returned unchanged. */
export function jobTarget(href: string): string {
  const m = href.match(/^\/kaju\/(?:missions|approvals)(?:\/([^/?#]+))?\/?(?:\?([^#]*))?(?:#.*)?$/);
  if (!m) return href;
  const id = m[1] ?? new URLSearchParams(m[2] ?? "").get("m");
  return isJobId(id) ? `/kaju?job=${id.toLowerCase()}` : "/kaju";
}

/** A link that opens the work over the current page, keeping the page's own query. */
export function withJob(search: string, id: string): string {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  q.set("job", id);
  return `?${q.toString()}`;
}
