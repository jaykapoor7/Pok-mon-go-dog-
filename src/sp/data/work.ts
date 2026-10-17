"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO actions with an honest receipt (decisions 025, 033, 043).

   Each action calls the existing, server-authorised RPC (the database
   checks membership and scope; hiding a button is never the guard) and
   returns what the database said. Unlike the older helpers, nothing
   here simulates success when no database is connected: pending is not
   saved, and "not connected" is a failure the person can see.
   A second tap on an action already in flight is ignored (idempotent
   from the person's side; the RPCs reject duplicate state changes).
   ════════════════════════════════════════════════════════════════════ */

import { getSupabase } from "@/lib/supabase";
import { ngoSetDogCare, updateMyOrg, type OrgProfilePatch } from "@/lib/actions";
import { addMedicalEvent } from "@/lib/animal-actions";
import { archiveCampaign, createCampaign, fileToCampaign, type CampaignKind } from "@/lib/campaigns";
import { addOrgMember, removeOrgMember, setMemberRole } from "@/lib/team-actions";
import { createTeamCode, revokeTeamCode } from "@/lib/programme";
import { addCaseFollowup, assignCase, claimCase, createCase, updateCaseFollowupStatus, updateCaseStatus, type Actor, type CreateCaseInput } from "@/lib/case-actions";
import { reviewCase, type ReviewDecision, type ReviewReason } from "@/lib/review";
import { spatialChanged } from "@/lib/spatial/refresh";
import type { CaseResolution } from "@/lib/types";

export type Receipt = { ok: true; at: string; what: string } | { ok: false; error: string };

const inflight = new Set<string>();
async function run(key: string, what: string, fn: () => Promise<boolean | { ok: boolean; error?: string } | string | null | void>): Promise<Receipt> {
  if (!getSupabase()) return { ok: false, error: "Not connected to the record. Nothing was saved." };
  if (inflight.has(key)) return { ok: false, error: "Already sending this. Wait for the answer." };
  inflight.add(key);
  try {
    const r = await fn();
    const ok = r === true || r === undefined || (typeof r === "string" && r.length > 0) || (typeof r === "object" && r !== null && r.ok);
    if (!ok) return { ok: false, error: typeof r === "object" && r && "error" in r && r.error ? r.error : "The record did not accept this. Nothing was changed." };
    return { ok: true, at: new Date().toISOString(), what };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "The record could not be reached. Nothing was saved." };
  } finally { inflight.delete(key); }
}

export const takeCase = (id: string, actor: Actor) => run(`take:${id}`, "You hold this case", () => claimCase(id, actor));
export const assignTo = (id: string, to: { id: string; name: string }, actor: Actor) => run(`assign:${id}`, `Assigned to ${to.name}`, () => assignCase(id, to, actor));
export const startWork = (id: string, actor: Actor) => run(`start:${id}`, "Marked in progress", () => updateCaseStatus(id, "in_progress", actor));
export const resolveCase = (id: string, actor: Actor, v: { resolution: CaseResolution; note: string; afterUrl?: string | null }) =>
  run(`resolve:${id}`, "Outcome recorded and case closed", () => updateCaseStatus(id, "resolved", actor, { resolution: v.resolution, outcomeNote: v.note, afterUrl: v.afterUrl ?? null }));
export const decideCase = (id: string, decision: ReviewDecision, actorName: string, reason?: ReviewReason | null, note?: string | null) =>
  run(`review:${id}`, decision === "still_active" ? "Confirmed still active" : decision === "set_reason" ? "Reason recorded" : "Closed with a reason", () => reviewCase({ caseId: id, decision, actorName, reason, note }));
export const scheduleFollowup = (caseId: string, dogId: string | null, dueAt: string, note: string) =>
  run(`fu-add:${caseId}`, "Follow-up scheduled", () => addCaseFollowup({ caseId, dogId, dueAt, note }));
export const setFollowup = (id: string, status: "done" | "missed" | "postponed" | "cancelled", note?: string, dueAt?: string) =>
  run(`fu:${id}`, status === "done" ? "Follow-up done" : status === "missed" ? "Recorded as missed" : status === "postponed" ? "Follow-up moved" : "Follow-up cancelled", () => updateCaseFollowupStatus({ followupId: id, status, note: note ?? null, dueAt: dueAt ?? null }));

/** A note on the case's history, with the database's answer (the older helper discarded it). */
export const addNote = (id: string, actor: Actor, note: string) => run(`note:${id}`, "Note added to the history", async () => {
  const supa = getSupabase()!;
  const { error } = await supa.rpc("add_case_note", { p_case_id: id, p_actor_id: actor.id, p_actor_name: actor.name, p_note: note });
  if (error) return { ok: false, error: error.message };
  spatialChanged();
  return true;
});

/** A care event on an animal: a recorded claim by the organisation, never a clinician's sign-off. */
export const recordCare = (dogId: string, v: { kind: string; date: string | null; notes: string; by: string }) =>
  run(`care:${dogId}`, "Care event added to the history", async () => { const id = await addMedicalEvent({ dogId, kind: v.kind, eventDate: v.date, notes: v.notes || undefined, performedBy: v.by || undefined }); return !!id && id !== "demo-event"; });
export const setNeedsHelp = (dogId: string, on: boolean) => run(`help:${dogId}`, on ? "Flagged as needing help" : "Flag cleared", () => ngoSetDogCare(dogId, { needs_help: on }));

/** Open a case. The receipt carries the new id only when the database returned one. */
export async function openCase(input: CreateCaseInput, actor: Actor): Promise<Receipt & { id?: string }> {
  let id: string | null = null;
  const r = await run(`new:${input.title}:${input.dogId ?? ""}`, "Case opened", async () => { id = await createCase(input, actor); return !!id && id !== "demo-case"; });
  return r.ok && id ? { ...r, id } : r;
}

/** File chosen reports into a drive. The receipt says how many the database filed. */
export async function fileReports(ids: string[], campaignId: string, claim: boolean): Promise<Receipt> {
  let res: { filed: number; registered: number } | null = null;
  const r = await run(`file:${campaignId}:${ids.join(",")}`, "Filed", async () => { res = await fileToCampaign(ids, campaignId, claim); return !!res; });
  const got = res as { filed: number; registered: number } | null;
  return r.ok && got ? { ...r, what: `Filed ${got.filed} report${got.filed === 1 ? "" : "s"}${got.registered ? `, ${got.registered} new animal${got.registered === 1 ? "" : "s"} registered` : ""}` } : r;
}
export const startDrive = (v: { name: string; kind: CampaignKind; startsOn: string | null; endsOn: string | null; zone: string | null; notes: string | null }) => {
  let id: string | null = null;
  return run(`drive:${v.name}`, "Drive created", async () => { id = await createCampaign(v); return !!id; }).then((r) => (r.ok && id ? { ...r, id: id as string } : r));
};
export const archiveDrive = (id: string, archived: boolean) => run(`arch:${id}`, archived ? "Drive archived" : "Drive restored", async () => { await archiveCampaign(id, archived); return true; });
export const changeRole = (userId: string, role: string) => run(`role:${userId}`, "Role changed", () => setMemberRole(userId, role));
export const addMember = (email: string, role: string) => run(`add:${email}`, `${email} added`, async () => { await addOrgMember(email, role); return true; });
export const removeMember = (userId: string) => run(`rm:${userId}`, "Removed from the organisation", () => removeOrgMember(userId));
export const inviteTeam = (email: string, name: string, role: "lead" | "member" | "volunteer") => {
  let got: { code: string; emailed: boolean } | null = null;
  return run(`team:${email}`, "Added", async () => { got = await createTeamCode(email, name, role); return !!got?.code; })
    .then((r) => { const g = got as { code: string; emailed: boolean } | null; return r.ok && g ? { ...r, what: `Added. Their code is ${g.code}${g.emailed ? "; it was emailed to them." : "; the email could not be sent, so give it to them yourself."}`, code: g.code } : r; });
};
export const revokeCode = (id: string) => run(`revoke:${id}`, "Code revoked", () => revokeTeamCode(id));
export const saveOrgProfile = (patch: OrgProfilePatch) => run("org-profile", "Profile saved", () => updateMyOrg(patch));
