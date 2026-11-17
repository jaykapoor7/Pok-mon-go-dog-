import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { shortCode } from "@/lib/caseCode";
import { logKaju } from "./actionLog";
import { indiaDay } from "./capture";
import { myFacilities } from "./health";
import type { Proposal } from "./types";

/* Where a confirmed task is seen: the home page of the workspace it was added in (as homeOf in src/nx/nav.ts). */
const TASK_HOME: Record<string, string> = { ngo: "/ngo/today", government: "/gov/overview", healthcare: "/health/today", research: "/research/datasets" };

/* ════════════════════════════════════════════════════════════════════
   Confirming a task or a bite record that Kaju prepared.

   Both run as the person who pressed Confirm: `db` carries their own
   session, so row-level security and the database functions decide
   exactly as on the manual screens. Nothing from the proposal is trusted:
   the workspace, the person a task is for, the record it links and the
   facility are each read again with the person's access, and names come
   from the database, not from the proposal. Each write is then read back
   and compared before the reply says it was saved.

   Tasks are idempotent: the row's id is derived from the person and the
   proposal id, so confirming the same proposal again finds the same task
   and never adds a second one. A bite record goes through oh_record_exposure,
   the bite form's own function; the register keeps no request id, so a
   confirm whose outcome is unknown is never retried automatically (the
   reply says to check Bite cases first), the same proposal confirmed again
   on this server returns the record it made, and a presentation today with
   the same date, kind and register number (or, with no number, the same
   age band, sex, category and animal) is refused as a likely repeat.
   ════════════════════════════════════════════════════════════════════ */

type Db = Pick<SupabaseClient, "from" | "rpc">;
export type Confirmed = { status: number; body: Record<string, unknown> };
type Task = Extract<Proposal, { kind: "add_task" }>;
type Exposure = Extract<Proposal, { kind: "register_exposure" }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v: unknown): v is string => typeof v === "string" && DAY.test(v) && Number.isFinite(Date.parse(`${v}T00:00:00Z`));
const optUuid = (v: unknown) => v === undefined || v === null || (typeof v === "string" && UUID.test(v));
const fail = (status: number, error: string, extra: Record<string, unknown> = {}): Confirmed => ({ status, body: { error, ...extra } });

/** The task's own id: the same person confirming the same proposal always lands on the same row. */
export function taskIdFor(userId: string, proposalId: string): string {
  const h = createHash("sha256").update(`kaju-task|${userId}|${proposalId}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export async function confirmTask(db: Db, userId: string, ngoId: string | null, p: Task, now = new Date()): Promise<Confirmed> {
  const title = typeof p.title === "string" ? p.title.replace(/\s+/g, " ").trim() : "";
  if (!title || title.length > 240) return fail(400, "A task needs a title of up to 240 characters. Nothing was saved.");
  if (p.dueOn !== null && !isDay(p.dueOn)) return fail(400, "The due date is not a date. Nothing was saved.");
  if (p.dueOn && p.dueOn < indiaDay(now)) return fail(400, "The due date has passed. Ask Kaju again with a new date; nothing was saved.");
  if (!optUuid(p.assigneeId) || !optUuid(p.caseId) || !optUuid(p.dogId) || !optUuid(p.orgId)) return fail(400, "Review and confirm a supported proposal.");
  const org = p.orgId ?? ngoId;
  if (!org) return fail(403, "Tasks belong to an organisation's workspace, and yours could not be found. Nothing was saved.");
  /* The workspace, read again: the person must be a member of it now. */
  const ws = await db.rpc("nx_my_workspaces");
  if (ws.error) return fail(503, "Your workspace could not be checked just now. Nothing was saved; confirm again in a moment.");
  const place = (Array.isArray(ws.data) ? ws.data : []).find((w: { org_id?: string }) => w.org_id === org) as { name?: string; workspace?: string } | undefined;
  if (!place) return fail(403, "You are not a member of that workspace, so the task was not added.");
  /* The person it is for, and the confirming person's own name, from the organisation's list. */
  const people = await db.rpc("nx_org_people", { p_org: org });
  const list = !people.error && Array.isArray(people.data) ? (people.data as { user_id: string; name: string }[]) : null;
  let assigneeName: string | null = null;
  if (p.assigneeId) {
    if (!list) return fail(503, "Your team could not be read just now, so the task was not added. Confirm again in a moment.");
    const who = list.find((x) => x.user_id === p.assigneeId);
    if (!who) return fail(400, "The person this task is for is not in this workspace any more. Nothing was saved.");
    assigneeName = who.name;
  }
  const me = list?.find((x) => x.user_id === userId)?.name ?? "a team member";
  /* The record it is about, read again under the organisation. */
  let record: { record_kind: string; record_id: string; record_label: string } | null = null;
  if (p.caseId || p.dogId) {
    if (org !== ngoId) return fail(400, "A task can be linked only to your own organisation's records. Nothing was saved.");
    if (p.caseId) {
      const c = await db.from("org_case_facts").select("id,case_code,title").eq("ngo_id", org).eq("id", p.caseId).maybeSingle();
      if (c.error) return fail(503, "The linked case could not be read just now. Nothing was saved.");
      if (!c.data) return fail(400, "The linked case is not in your organisation's records. Nothing was saved.");
      const row = c.data as { id: string; case_code: string | null; title: string | null };
      record = { record_kind: "case", record_id: row.id, record_label: ((row.case_code ? shortCode(row.case_code) : null) || row.title || "Case").slice(0, 160) };
    } else {
      const d = await db.from("dogs").select("id,name,code,straypaw_id").eq("ngo_id", org).eq("id", p.dogId!).maybeSingle();
      if (d.error) return fail(503, "The linked animal could not be read just now. Nothing was saved.");
      if (!d.data) return fail(400, "The linked animal is not on your organisation's register. Nothing was saved.");
      const row = d.data as { id: string; name: string | null; code: string | null; straypaw_id: string | null };
      record = { record_kind: "animal", record_id: row.id, record_label: (row.name || row.code || (row.straypaw_id ? shortCode(row.straypaw_id) : null) || "Animal").slice(0, 160) };
    }
  }
  const id = taskIdFor(userId, p.id);
  const want = { id, org_id: org, title, due_on: p.dueOn, assignee_id: p.assigneeId ?? null, assignee_name: assigneeName, created_by: userId, source_kind: "kaju", note: `Prepared with StrayPaw AI, confirmed by ${me}. Kaju request ${p.id.slice(0, 80)}.`, ...(record ?? {}) };
  const ins = await db.from("nx_tasks").insert(want);
  let replayed = false;
  if (ins.error) {
    if (ins.error.code === "23505") replayed = true;
    else if (ins.error.code === "42501" || /row-level security|permission/i.test(ins.error.message ?? "")) return fail(403, "Your access does not allow adding tasks in this workspace. Nothing was saved.");
    else return fail(400, "The task could not be added. Nothing was saved.");
  }
  /* Read back, independently of the insert. */
  const back = await db.from("nx_tasks").select("id,org_id,title,due_on,assignee_id,created_by,created_at,state").eq("id", id).maybeSingle();
  if (back.error || !back.data) return fail(202, "Verification is pending: the task could not be read back yet. Confirm the same proposal again to check it; it will not be added twice.");
  const row = back.data as { id: string; org_id: string; title: string; due_on: string | null; assignee_id: string | null; created_by: string; created_at: string; state: string };
  if (row.created_by !== userId || row.org_id !== org || row.title !== title || (row.due_on ?? null) !== (p.dueOn ?? null) || (row.assignee_id ?? null) !== (p.assigneeId ?? null))
    return fail(409, "This proposal was already confirmed with different details. Ask Kaju again for a new one; nothing else was saved.");
  /* The same words confirmed again after the task was deleted on Today: the person wants it, so it is put back, not added twice. */
  let restored = false;
  if (replayed && row.state === "cancelled") {
    const up = await db.from("nx_tasks").update({ state: "open" }).eq("id", id).eq("state", "cancelled");
    if (up.error) return fail(400, "This task was deleted on Today and could not be put back. Nothing else was saved.");
    const again = await db.from("nx_tasks").select("state").eq("id", id).maybeSingle();
    if (again.error || (again.data as { state?: string } | null)?.state !== "open") return fail(202, "Verification is pending: the task could not be read back yet. Confirm the same proposal again to check it; it will not be added twice.");
    restored = true;
  }
  await logKaju(db, { kind: "add_task", ok: true, target: id, summary: restored ? "Task put back" : replayed ? "Task already added" : "Task added", ngoId: org === ngoId ? org : null, organisationId: org === ngoId ? null : org });
  return { status: 200, body: { ok: true, verified: true, replayed, id, kind: "add_task", at: row.created_at, what: restored ? `Task put back: ${row.title}` : replayed ? (row.state === "done" ? `Already done: ${row.title}` : `Already added: ${row.title}`) : `Task added: ${row.title}`, href: TASK_HOME[place.workspace ?? ""] ?? "/home", workspace: place.name ?? null } };
}

const KINDS = ["bite", "scratch", "lick_broken_skin", "other"], BANDS = ["0-4", "5-14", "15-29", "30-49", "50+"], WASH = ["before_arrival", "at_facility", "not_washed"];
const SPECIES = ["dog", "cat", "cattle", "monkey", "wildlife", "other", "unknown"], OWN = ["community", "owned", "unknown"];

export async function confirmExposure(db: Db, userId: string, p: Exposure, now = new Date()): Promise<Confirmed> {
  const bad = !UUID.test(String(p.facilityId)) || !isDay(p.exposureOn) || !KINDS.includes(p.exposureKind) || !(p.category === null || ["I", "II", "III"].includes(p.category))
    || !(p.ageBand === null || BANDS.includes(p.ageBand)) || !(p.sex === null || ["female", "male"].includes(p.sex)) || !(p.woundWashed === null || WASH.includes(p.woundWashed))
    || !SPECIES.includes(p.species) || !OWN.includes(p.ownership) || !optUuid(p.areaId) || typeof p.reminderConsent !== "boolean"
    || (p.patientRef !== null && (typeof p.patientRef !== "string" || p.patientRef.length > 40)) || (p.animalPlace !== null && (typeof p.animalPlace !== "string" || p.animalPlace.length > 200))
    || (p.contactPhone !== null && (typeof p.contactPhone !== "string" || !/^[0-9+ ]{8,16}$/.test(p.contactPhone)));
  if (bad) return fail(400, "Review and confirm a supported proposal.");
  const today = indiaDay(now);
  if (p.exposureOn > today) return fail(400, "The date it happened cannot be in the future. Nothing was saved.");
  /* The facility, read again: the person must be able to record bites there now, and only a clinician records a category. */
  const mine = await myFacilities(db);
  if (!mine) return fail(503, "Your facility could not be checked just now. Nothing was saved; confirm again in a moment.");
  const f = mine.find((x) => x.id === p.facilityId);
  if (!f || !f.caps.has("record_exposure")) return fail(403, "Only staff of this facility can record a bite here. Nothing was saved.");
  if (p.category && !f.caps.has("assess")) return fail(403, "Only a clinician can record the exposure category. A clinician can confirm this, or record the bite without the category on the bite form. Nothing was saved.");
  if (p.areaId) {
    const a = await db.rpc("oh_org_areas", { p_org: f.id });
    if (a.error || !(Array.isArray(a.data) && a.data.some((x: { id?: string }) => x.id === p.areaId))) return fail(400, "That area is not one of your facility's areas. Nothing was saved.");
  }
  /* The same proposal confirmed again by the same person on this server: the record it made, read back, never a second one. */
  const memo = DONE.get(`${userId}|${p.id}`);
  if (memo) return readBack(db, userId, f.id, p, memo, true);
  /* A likely repeat, which the register function cannot tell apart: a presentation today with the same date and kind, and
     the same register number, or (with no number) the same age band, sex, category and animal. Refused, with a link. */
  const reg = await db.rpc("oh_clinic_register", { p_facility: f.id, p_filter: "all", p_limit: 50 });
  await logKaju(db, { kind: "health_read", ok: !reg.error, target: `oh_clinic_register:${f.id}`, summary: "checked for a repeat before recording", organisationId: f.id, actor: userId });
  if (reg.error || !Array.isArray(reg.data)) return fail(503, "Your register could not be checked for a repeat just now. Nothing was saved; confirm again in a moment.");
  const rows = reg.data as { id: string; code: string; patient_ref: string | null; age_band: string; sex: string; species: string; category: string; exposure_on: string; presented_on: string; kind: string }[];
  const same = rows.find((r) => r.presented_on === today && r.exposure_on === p.exposureOn && r.kind === p.exposureKind && (p.patientRef
    ? (r.patient_ref ?? "").toUpperCase() === p.patientRef.toUpperCase()
    : !r.patient_ref && r.age_band === (p.ageBand ?? "not_recorded") && r.sex === (p.sex ?? "not_recorded") && r.category === (p.category ?? "not_recorded") && r.species === p.species));
  const what = p.exposureKind === "lick_broken_skin" ? "lick" : p.exposureKind === "other" ? "contact" : p.exposureKind;
  if (same) return fail(409, p.patientRef
    ? `A ${what} for ${p.patientRef} on ${p.exposureOn} is already recorded today as ${same.code}. Nothing new was saved.`
    : `A ${what} with the same date and details is already recorded today as ${same.code}. Nothing new was saved. If this is another patient, add their register number and ask me again, or use the bite form.`, { href: `/health/bites/${same.id}`, code: same.code });
  const args = {
    p_facility: f.id, p_exposure_on: p.exposureOn, p_kind: p.exposureKind, p_area: p.areaId ?? null, p_age_band: p.ageBand ?? "not_recorded", p_sex: p.sex ?? "not_recorded",
    p_patient_ref: p.patientRef, p_species: p.species, p_ownership: p.ownership, p_animal_description: null, p_animal_place: p.animalPlace,
    p_category: p.category ?? "not_recorded", p_source: "walk_in", p_notice: null, p_contact_phone: p.reminderConsent ? p.contactPhone : null,
    p_reminder_consent: p.reminderConsent && !!p.contactPhone, p_request_followup: p.ownership !== "owned", p_wound_washed: p.woundWashed ?? "not_recorded",
  };
  let saved: { id: string; code: string } | null = null;
  try {
    const r = await db.rpc("oh_record_exposure", args);
    if (r.error) {
      const m = String(r.error.message ?? "");
      return fail(/^(?:Only|The date|That referral|A bite)/.test(m) ? 403 : 400, /^(?:Only|The date)/.test(m) ? `${m}. Nothing was saved.` : "The bite could not be recorded. Nothing was saved.");
    }
    saved = r.data as { id: string; code: string };
  } catch {
    return fail(503, "Kaju could not tell whether the bite was saved. Open Bite cases to check before confirming again.");
  }
  if (!saved?.id || !saved.code) return fail(502, "Kaju could not tell whether the bite was saved. Open Bite cases to check before confirming again.");
  DONE.set(`${userId}|${p.id}`, saved);
  if (DONE.size > 500) DONE.delete(DONE.keys().next().value!);
  return readBack(db, userId, f.id, p, saved, false);
}

/* Bite records this server made from a proposal, by person and proposal id (the register keeps no request id). */
const DONE = new Map<string, { id: string; code: string }>();

/** Read the record back through its own function (which notes the opening in the health audit) and compare it with what was confirmed. */
async function readBack(db: Db, userId: string, facilityId: string, p: Exposure, saved: { id: string; code: string }, replayed: boolean): Promise<Confirmed> {
  const back = await db.rpc("oh_clinic_exposure", { p_exposure: saved.id });
  const e = back.data as { facility_id?: string; exposure_on?: string; exposure_kind?: string; category?: string; patient_ref?: string | null; created_at?: string } | null;
  const href = `/health/bites/${saved.id}`;
  if (back.error || !e || e.facility_id !== facilityId || e.exposure_on !== p.exposureOn || e.exposure_kind !== p.exposureKind || e.category !== (p.category ?? "not_recorded") || (e.patient_ref ?? null) !== (p.patientRef ?? null))
    return fail(502, `Saved as ${saved.code}, but it could not be read back to check it. Open it on Bite cases before doing anything else; do not confirm again.`, { href, code: saved.code });
  if (!replayed) await logKaju(db, { kind: "register_exposure", ok: true, target: saved.id, summary: "Bite recorded", organisationId: facilityId, actor: userId });
  return { status: 200, body: { ok: true, verified: true, replayed, id: saved.id, code: saved.code, kind: "register_exposure", at: e.created_at ?? new Date().toISOString(), what: replayed ? `Already recorded as ${saved.code}` : `Bite recorded as ${saved.code}`, href } };
}
