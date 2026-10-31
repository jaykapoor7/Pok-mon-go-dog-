"use client";

/* Saving a confirmed StrayPaw AI proposal. Each kind runs the SAME
   server-authorised action the manual screens use (sp/data/work), under the
   person's own session, so permissions, validation and history are
   identical. The history entry says the change was prepared with StrayPaw
   AI and confirmed by the person, which is the audit trail. */

import { addNote, openCase, recordCare, scheduleFollowup, type Receipt } from "@/sp/data/work";
import { getSupabase } from "@/lib/supabase";
import type { Proposal } from "./types";

const MARK = (who: string) => `Prepared with StrayPaw AI, confirmed by ${who}.`;

export type Saved = Receipt & { href?: string };

export async function executeProposal(p: Proposal, actor: { id: string; name: string }): Promise<Saved> {
  let r: Saved;
  switch (p.kind) {
    case "open_case": {
      const res = await openCase({ title: p.title, city: p.city, zone: p.zone, category: p.category, severity: p.severity, description: `${p.description}\n\n${MARK(actor.name)}`.trim(), dogId: p.dogId }, actor);
      r = { ...res, href: res.ok && res.id ? `/ngo/cases/${res.id}` : undefined };
      break;
    }
    case "add_note":
      r = { ...(await addNote(p.caseId, actor, `${p.note}\n\n${MARK(actor.name)}`)), href: `/ngo/cases/${p.caseId}` };
      break;
    case "schedule_followup":
      r = { ...(await scheduleFollowup(p.caseId, p.dogId, p.dueAt, `${p.note ? `${p.note} · ` : ""}${MARK(actor.name)}`)), href: `/ngo/cases/${p.caseId}` };
      break;
    case "record_care":
      r = { ...(await recordCare(p.dogId, { kind: p.careKind, date: p.date, notes: `${p.notes ? `${p.notes} · ` : ""}${MARK(actor.name)}`, by: actor.name })), href: `/ngo/animals/${p.dogId}` };
      break;
  }
  void logAction(p, r);
  return r;
}

/** Best-effort structured log. Returns quietly if the optional ai_action_log
    table has not been applied (supabase/proposed/ai_action_log.sql). */
async function logAction(p: Proposal, r: Saved) {
  try {
    const supa = getSupabase();
    const token = (await supa?.auth.getSession())?.data.session?.access_token;
    if (!token) return;
    await fetch("/api/ai/log", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ kind: p.kind, ok: r.ok, target: r.href ?? null, summary: "why" in p ? p.why : null }) });
  } catch { /* the record's own history already holds the change */ }
}
