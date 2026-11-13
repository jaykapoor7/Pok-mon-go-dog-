"use client";

/* ════════════════════════════════════════════════════════════════════
   The line of work, defined once.

   Five stages, in order, with one name each. Today's strip, the Pipeline
   board and the rail at the top of every record all read this file, so a
   stage is called the same thing and counts the same records wherever it
   appears. Nothing here is a new source of truth: reports come from the
   intake read, cases from the open-case read, and the last three stages
   from the verification queue's own flags (stageOf). A read that fails is
   reported as failed, never as zero. Imported historical rows stay out of
   today's line.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { shortCode } from "@/lib/caseCode";
import { orgIncoming, type Incoming } from "@/lib/campaigns";
import { stageOf, verificationQueue, type QueueRow } from "@/lib/abc";
import { isHistoricalCase, isStale, openCases, type OpenCase } from "@/lib/ops";
import { DEFAULT_TRIAGE, type Condition } from "@/lib/register/taxonomy";
import type { Role } from "../shell/workspaces";

export type StageId = "new" | "care" | "vet" | "evidence" | "report";
export type StageDef = { id: StageId; title: string; hint: string; /** The working view of this stage. */ href: string; all: string; empty: string };

export const STAGES: StageDef[] = [
  { id: "new", title: "New", hint: "Reports to prepare", href: "/ngo/inbox", all: "Open intake", empty: "No report is waiting." },
  { id: "care", title: "In care", hint: "Open cases, most urgent first", href: "/ngo/work", all: "Open the queue", empty: "No case is open." },
  { id: "vet", title: "With the vet", hint: "Procedures to sign off", href: "/ngo/verification?stage=vet", all: "Open sign-off", empty: "Nothing is waiting for the vet." },
  { id: "evidence", title: "Evidence", hint: "Release photo or place missing", href: "/ngo/verification?stage=evidence", all: "Open evidence", empty: "Every record has its evidence." },
  { id: "report", title: "To report", hint: "Review, then into the package", href: "/ngo/verification?stage=review", all: "Open review", empty: "Nothing is waiting to be reported." },
];
/** Where a stage lives now: on the page of its line of work, at that step. */
export const stageHref = (id: StageId) => `${id === "new" || id === "care" ? "/ngo/rescues" : "/ngo/sterilisation"}#${id}`;

/** The stage a procedure record is at, from the database's own flags; "done" once it is in a package or accepted. */
export function stageOfRow(r: QueueRow): StageId | "done" {
  const s = stageOf(r);
  return s === "vet" ? "vet" : s === "evidence" || s === "returned" ? "evidence" : s === "review" || s === "ready" ? "report" : "done";
}
/** The stage a role is responsible for (shown as "Your step"). A lead owns the review and the report. */
export function stageMine(id: StageId, role: Role | null) {
  return role === "veterinarian" ? id === "vet" : role === "member" ? id === "new" || id === "care" || id === "evidence" : role === "admin" || role === "coordinator" ? id === "report" : false;
}

export type Card = { key: string; href: string; code: string; title: string; meta: string; age: number | null; tag?: { label: string; tone: "flame" | "amber" | "blue" | "green" | "plain" }; who?: string | null; hot?: boolean };
export type Column = StageDef & { cards: Card[] | null; state: "loading" | "failed" | "ready"; mine: boolean };

const days = (iso: string | null | undefined) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)) : null);
const critical = (c: { condition_class: string | null }) => DEFAULT_TRIAGE[(c.condition_class ?? "Not recorded") as Condition] === "Critical";
const MISSING: Record<string, string> = { surgery_record: "surgery record", ear_notch_photo: "ear-notch photo", release_photo: "release photo", release_location: "release place", capture_photo: "capture photo" };
const urgentFirst = (a: Card, b: Card) => Number(!!b.hot) - Number(!!a.hot) || (b.age ?? 0) - (a.age ?? 0);

function fromQueue(r: QueueRow): Card {
  const st = stageOf(r);
  const gap = r.missing.map((k) => MISSING[k] ?? k.replace(/_/g, " "));
  return {
    key: `q-${r.case_id}`, href: `/ngo/verification/${r.case_id}`, code: shortCode(r.case_code), title: r.title || "Procedure record",
    meta: st === "returned" ? (r.returned_note ?? "Returned for a correction") : st === "evidence" ? `Missing ${gap.slice(0, 2).join(", ") || "evidence"}${gap.length > 2 ? ` +${gap.length - 2}` : ""}` : st === "vet" ? (r.city ?? "Waiting for the vet") : st === "review" ? `Signed by ${r.vet_name ?? "the vet"}` : `Reviewed by ${r.reviewer_name ?? "a coordinator"}`,
    age: days(r.created_at),
    tag: st === "returned" ? { label: "Returned", tone: "flame" } : st === "evidence" ? { label: `${r.evidence_count} of 5`, tone: "amber" } : st === "vet" ? { label: "Sign-off", tone: "blue" } : st === "review" ? { label: "Review", tone: "blue" } : { label: "Approved", tone: "green" },
    hot: st === "returned",
  };
}

/** The whole line for the member's organisation. `open` gates every read: nothing private is read before membership is known. */
export function usePipeline(open: boolean, role: Role | null) {
  const [incoming, setIncoming] = useState<Incoming[] | null | undefined>(undefined);
  const [cases, setCases] = useState<OpenCase[] | null | undefined>(undefined);
  const [queue, setQueue] = useState<QueueRow[] | null | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    let live = true;
    Promise.allSettled([orgIncoming("ours"), orgIncoming("community")]).then(([a, b]) => { if (live) setIncoming(a.status === "fulfilled" && b.status === "fulfilled" ? [...a.value, ...b.value] : null); });
    openCases().then((r) => { if (live) setCases(r); }).catch(() => { if (live) setCases(null); });
    verificationQueue(500).then((r) => { if (live) setQueue(r.filter((x) => x.provenance !== "imported_historical_record")); }).catch(() => { if (live) setQueue(null); });
    return () => { live = false; };
  }, [open]);

  return useMemo(() => {
    const now = Date.now();
    const inQueue = new Set((queue ?? []).map((r) => r.case_id));
    const state = (v: unknown): Column["state"] => (v === undefined ? "loading" : v === null ? "failed" : "ready");
    const rows = (id: StageId) => (queue ? queue.filter((r) => stageOfRow(r) === id).map(fromQueue).sort(urgentFirst) : null);
    const cards: Record<StageId, Card[] | null> = {
      new: incoming ? incoming.map((r) => ({ key: `i-${r.id}`, href: "/ngo/inbox", code: "Report", title: r.nickname || (r.mood_tags?.[0] ? r.mood_tags[0].replace(/_/g, " ") : "Animal reported"), meta: r.zone || "Place not given", age: days(r.created_at), tag: { label: "To prepare", tone: "plain" as const } })) : null,
      care: cases ? cases.filter((c) => !isHistoricalCase(c) && !isStale(c, now) && !inQueue.has(c.id)).map((c) => ({
        key: `c-${c.id}`, href: `/ngo/cases/${c.id}`, code: shortCode(c.case_code), title: c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title || "Open case",
        meta: [c.animal_name, c.zone ?? c.city].filter(Boolean).join(" · ") || "Place not recorded", age: days(c.occurred_at), who: c.assignee_name, hot: critical(c),
        tag: critical(c) ? { label: "Critical", tone: "flame" as const } : (c.followups_missed ?? 0) > 0 ? { label: "Follow-up overdue", tone: "amber" as const } : c.status_class === "in_progress" ? { label: "In progress", tone: "blue" as const } : { label: "Open", tone: "plain" as const },
      })).sort(urgentFirst) : null,
      vet: rows("vet"), evidence: rows("evidence"), report: rows("report"),
    };
    const source: Record<StageId, unknown> = { new: incoming, care: cases, vet: queue, evidence: queue, report: queue };
    const lead = role === "admin" || role === "coordinator";
    const cols: Column[] = STAGES.map((s) => ({ ...s, ...(s.id === "report" && lead ? { href: "/ngo/packages", all: "Open reports" } : {}), cards: cards[s.id], state: state(source[s.id]), mine: stageMine(s.id, role) }));
    const ready = cols.every((c) => c.state !== "loading");
    return { cols, ready, total: cols.reduce((n, c) => n + (c.cards?.length ?? 0), 0), hot: cols.reduce((n, c) => n + (c.cards?.filter((k) => k.hot).length ?? 0), 0), capped: !!queue && queue.length >= 500 };
  }, [incoming, cases, queue, role]);
}
