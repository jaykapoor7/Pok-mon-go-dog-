"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DECIDER } from "@/lib/kaju/capabilities";
import type { MissionRow, StepRow } from "./data";
import { useMission } from "./work";
import { Progress, StateDot, ago, missionWord } from "./bits";

/* A mission at a glance: its live state, its steps as a progress bar, the step it is on, and what it has made so far,
   counted from the steps' own results. Opens the workroom. */

export function produced(steps: StepRow[]): string[] {
  let found = 0, tasks = 0, posted = 0, notified = 0, drafts = 0, looked = false;
  for (const s of steps) {
    const r = s.result ?? {};
    if (s.state === "done" && ["find_due_followups", "find_overdue_cases", "read_cases"].includes(s.tool ?? "")) { looked = true; found += typeof r.found === "number" ? r.found : Array.isArray(r.cases) ? r.cases.length : 0; }
    if (typeof r.created === "number") tasks += r.created;
    if (typeof r.task_id === "string") tasks += 1;
    if (typeof r.message_id === "string") posted += 1;
    if (typeof r.notified === "number") notified += r.notified;
    if (typeof r.outbox_id === "string") drafts += 1;
  }
  const n = (x: number, one: string, many: string) => `${x} ${x === 1 ? one : many}`;
  return [found ? n(found, "case found", "cases found") : looked ? "No cases found" : "", tasks ? n(tasks, "task", "tasks") : "", posted ? n(posted, "message", "messages") : "", notified ? n(notified, "person notified", "people notified") : "", drafts ? n(drafts, "email prepared", "emails prepared") : ""].filter(Boolean);
}

export function nowLine(m: MissionRow, steps: StepRow[]): string {
  const cur = steps.find((s) => !["done", "skipped", "cancelled"].includes(s.state));
  if (m.state === "completed") return "Every step is done";
  if (m.state === "cancelled") return "Cancelled. What was done stays";
  if (!cur) return "";
  if (cur.state === "waiting_approval") return `Waiting for your approval: ${cur.label}`;
  if (cur.state === "waiting_person") return `Waiting for ${(DECIDER[cur.tool as keyof typeof DECIDER] ?? "A person").toLowerCase()}: ${cur.label}`;
  if (cur.state === "failed") return `Blocked at: ${cur.label}`;
  if (cur.state === "retrying") return `Trying again soon: ${cur.label}`;
  if (cur.state === "running") return `Working: ${cur.label}`;
  return `Next: ${cur.label}`;
}

export function MissionCard({ m, as = "li" }: { m: MissionRow; as?: "li" | "div" }) {
  const steps = [...m.nx_mission_steps].sort((a, b) => a.position - b.position);
  const [word, tone] = missionWord(m.state);
  const made = produced(steps);
  const Tag = as;
  return (
    <Tag className={`kj-mcard t-${tone}`}>
      <Link href={`/kaju/missions/${m.id}`} className="kj-mcard-in">
        <span className="kj-mcard-top"><StateDot state={m.state} /><span className="kj-mcard-w">{word}</span><span className="kj-mcard-t">{ago(m.updated_at)}</span></span>
        <b className="kj-mcard-h">{m.title}</b>
        <Progress steps={steps} />
        <span className="kj-mcard-now">{nowLine(m, steps)}</span>
        {made.length ? <span className="kj-mcard-made">{made.join(" · ")}</span> : null}
        <ArrowUpRight size={14} className="kj-mcard-go" aria-hidden />
      </Link>
    </Tag>
  );
}

/** One mission kept current while it is on screen, for the compact panel just after it starts. */
export function LiveMissionCard({ id }: { id: string }) {
  const { row } = useMission(id);
  if (!row) return <div className="kj-mcard is-loading"><span className="kj-quiet">Opening the mission…</span></div>;
  return <MissionCard m={row} as="div" />;
}
