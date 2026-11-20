"use client";

/* NGO operational records: every read and write the rebuilt Cases, Animals, Inbox, Operations and Field pages make.
   Each write calls the same server function, with the same arguments, as the classic screens did; the database checks
   the person's organisation and role and refuses what they may not do. Functions here return { data } or { error }
   (never throw), so a page's useAct can say what the database said in plain words. */

import { getSupabase } from "@/lib/supabase";
import { canonicalHref } from "@/lib/routes/canonical";
import { uploadPhoto } from "@/lib/actions";
import { createCase as createCaseLib, type CreateCaseInput } from "@/lib/case-actions";
import { DEFAULT_TRIAGE, STATUS_META, type Condition, type StatusClass } from "@/lib/register/taxonomy";
import type { CaseResolution } from "@/lib/types";
import type { ReviewDecision, ReviewReason } from "@/lib/review";
import type { CareInboxAction, CareInboxItem, CareInboxStatus } from "@/lib/careos/contract";
import type { AiReply, Proposal } from "@/sp3/ai/types";

export type Actor = { id: string; name: string };
export type Res<T = unknown> = { data?: T; error?: string };

const NO_DB = "Could not reach StrayPaw. Nothing was changed. Check the connection and try again.";
const db = () => { const s = getSupabase(); if (!s) throw new Error(NO_DB); return s; };
const msg = (e: unknown) => (e instanceof Error ? e.message : typeof e === "string" ? e : NO_DB);

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<Res<T>> {
  try { const { data, error } = await db().rpc(fn, args); return error ? { error: error.message } : { data: data as T }; }
  catch (e) { return { error: msg(e) }; }
}
/** The organisation the database says this session belongs to. */
export const myNgo = () => rpc<string>("my_ngo");

/* ── Small shared words ──────────────────────────────────────────── */

/** SPC-47A86E67E8E4… reads as SPC-47A86E; the full code stays on the record and in search. */
export function shortCode(code: string | null | undefined, fallback = "Case"): string {
  if (!code) return fallback;
  const m = /^([A-Z]{2,5}(?:-[A-Z]{2,5})?)-([0-9A-F]{12,})$/i.exec(code);
  return m ? `${m[1]}-${m[2].slice(0, 6).toUpperCase()}` : code;
}
export const realName = (s: string | null | undefined) => { const t = (s ?? "").trim(); return t && !/·/.test(t) ? t : null; };
export const isCriticalCondition = (c: string | null | undefined) => DEFAULT_TRIAGE[(c ?? "Not recorded") as Condition] === "Critical";
export const statusLabel = (s: string | null | undefined) => STATUS_META[(s ?? "unknown") as StatusClass]?.label ?? "Status not recorded";
export const STATUS_TONE: Record<string, "plain" | "accent" | "ok" | "warn" | "bad"> = { open: "accent", in_progress: "warn", closed: "ok", other_ngo: "plain", no_action: "plain", not_attended: "bad", unknown: "plain" };
/** Links Kaju or older records carry open the page that does that work now; outside links are refused. */
export function nextHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const h = canonicalHref(href);
  return h.startsWith("/") && !h.startsWith("//") ? h : null;
}
const DAY = 86_400_000;
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const inDays = (n: number) => isoDay(new Date(Date.now() + n * DAY));

/* ── Cases: the list ─────────────────────────────────────────────── */

export type CaseFact = {
  id: string; dog_id: string | null; case_code: string | null; title: string | null; zone: string | null; city: string | null; h3_r8: string | null;
  occurred_at: string | null; status: string | null; severity: string | null; condition_class: string | null; status_class: string | null; closure_reason: string | null;
  assignee_id: string | null; assignee_name: string | null; last_activity_at: string | null; next_action: string | null; provenance: string | null;
  animal_name: string | null; straypaw_id: string | null; followups_missed: number | null; followups_upcoming: number | null; next_due: string | null; reviewed_at: string | null; resolved_at: string | null;
};
const FACT = "id,dog_id,case_code,title,zone,city,h3_r8,occurred_at,status,severity,condition_class,status_class,closure_reason,assignee_id,assignee_name,last_activity_at,next_action,provenance,animal_name,straypaw_id,followups_missed,followups_upcoming,next_due,reviewed_at,resolved_at";
export const OPEN_LIMIT = 800, CLOSED_LIMIT = 300;

/** Open cases (the same bounded read as the classic queue), the most recently active closed ones, and every closed case
    still missing its reason. Each read is the organisation's own, by RLS and by the filter. */
export async function readCases(ngoId: string): Promise<Res<{ rows: CaseFact[]; openCapped: boolean; closedCapped: boolean }>> {
  try {
    const q = () => db().from("org_case_facts").select(FACT).eq("ngo_id", ngoId);
    const [open, closed, reasonless] = await Promise.all([
      q().in("status_class", ["open", "in_progress"]).order("occurred_at", { ascending: false }).limit(OPEN_LIMIT),
      q().not("status_class", "in", "(open,in_progress)").order("last_activity_at", { ascending: false, nullsFirst: false }).limit(CLOSED_LIMIT),
      q().in("status_class", ["no_action", "not_attended"]).or("closure_reason.is.null,closure_reason.eq.unspecified").order("occurred_at", { ascending: false }).limit(CLOSED_LIMIT),
    ]);
    const failed = [open, closed, reasonless].find((r) => r.error);
    if (failed?.error) return { error: failed.error.message };
    const seen = new Set<string>(), rows: CaseFact[] = [];
    for (const r of [...(open.data ?? []), ...(closed.data ?? []), ...(reasonless.data ?? [])] as CaseFact[]) if (!seen.has(r.id)) { seen.add(r.id); rows.push(r); }
    return { data: { rows, openCapped: (open.data ?? []).length >= OPEN_LIMIT, closedCapped: (closed.data ?? []).length >= CLOSED_LIMIT } };
  } catch (e) { return { error: msg(e) }; }
}

export const isOpenClass = (s: string | null | undefined) => s === "open" || s === "in_progress";
/** Imported with an open status nobody has confirmed: not today's work until a person says so. */
export const isHistorical = (c: { provenance: string | null; reviewed_at: string | null }) => c.provenance === "imported_historical_record" && !c.reviewed_at;
/** Open more than ninety days and nothing recorded for thirty (lib/ops isStale). */
export const isStaleFact = (c: { occurred_at: string | null; last_activity_at: string | null }, now = Date.now()) =>
  !!c.occurred_at && now - Date.parse(c.occurred_at) > 90 * DAY && (!c.last_activity_at || now - Date.parse(c.last_activity_at) > 30 * DAY);
export const isReasonless = (c: { status_class: string | null; closure_reason: string | null }) => (c.status_class === "no_action" || c.status_class === "not_attended") && (!c.closure_reason || c.closure_reason === "unspecified");

/* ── Cases: the next step ────────────────────────────────────────── */

export type Member = { user_id: string; role: string; name: string };
export async function readMembers(): Promise<Res<Member[]>> {
  const r = await rpc<{ user_id: string; role: string | null; name: string | null }[]>("my_org_members");
  return r.error ? { error: r.error } : { data: (r.data ?? []).map((m) => ({ user_id: m.user_id, role: m.role ?? "member", name: m.name ?? "Member" })) };
}

/** The volunteer row the case functions name people from (a new case is assigned to its creator, which must have one).
    Best effort, as in the classic app. */
export async function ensureVolunteer(a: Actor) { try { await db().rpc("upsert_volunteer", { p_id: a.id, p_name: a.name }); } catch { /* not fatal */ } }

/** Take an unheld case, or claim an unowned report for the organisation (take_case decides which). */
export async function takeCase(id: string, a: Actor): Promise<Res<true>> {
  await ensureVolunteer(a);
  const r = await rpc<boolean>("take_case", { p_case_id: id, p_actor_name: a.name });
  return r.error ? { error: r.error } : r.data === true ? { data: true } : { error: "Someone already holds this case, so nothing was changed. Read it again to see who." };
}
type StatusOut = { ok: boolean; error?: string };
async function setStatus(id: string, to: "assigned" | "in_progress" | "resolved", a: Actor, o: { resolution?: CaseResolution; note?: string; afterUrl?: string | null; outcome?: string | null } = {}): Promise<Res<true>> {
  const r = await rpc<StatusOut>("update_case_status", { p_case_id: id, p_to_status: to, p_actor_id: a.id, p_actor_name: a.name, p_resolution: o.resolution ?? null, p_note: o.note ?? null, p_before_url: null, p_after_url: o.afterUrl ?? null, p_outcome_note: o.outcome ?? null });
  if (r.error) return { error: r.error };
  return r.data?.ok ? { data: true } : { error: r.data?.error ?? "The record did not accept this. Nothing was changed." };
}
export const startWork = (id: string, a: Actor) => setStatus(id, "in_progress", a);
/** Undo for Start work: the database allows the holder to move it back to assigned. */
export const backToAssigned = (id: string, a: Actor) => setStatus(id, "assigned", a, { note: "Undo: back to assigned" });
/** Record what was done and close. A photo goes to the private sightings bucket first; nothing is saved if it fails. */
export async function recordOutcome(id: string, a: Actor, v: { resolution: CaseResolution; note: string; photo: File | null }): Promise<Res<true>> {
  let afterUrl: string | null = null;
  if (v.photo) { try { afterUrl = await uploadPhoto(v.photo); } catch (e) { return { error: `The photo did not upload, so nothing was saved. ${msg(e)} Try again, or record without a photo.` }; } }
  return setStatus(id, "resolved", a, { resolution: v.resolution, outcome: v.note, afterUrl });
}
export async function assignCase(id: string, to: { id: string; name: string }, a: Actor): Promise<Res<true>> {
  const r = await rpc<null>("assign_case", { p_case_id: id, p_assignee_id: to.id, p_assignee_name: to.name, p_actor_id: a.id, p_actor_name: a.name });
  return r.error ? { error: r.error } : { data: true };
}
export async function reviewCase(id: string, decision: ReviewDecision, actorName: string, reason?: ReviewReason | null, note?: string | null): Promise<Res<true>> {
  const r = await rpc<{ ok: boolean; error?: string }>("review_case", { p_case_id: id, p_decision: decision, p_actor_name: actorName, p_closure_reason: reason ?? null, p_note: note?.trim() || null });
  return r.error ? { error: r.error } : r.data?.ok ? { data: true } : { error: r.data?.error ?? "The register did not accept this decision. Nothing was changed." };
}
export async function addNote(id: string, a: Actor, note: string): Promise<Res<true>> {
  const r = await rpc("add_case_note", { p_case_id: id, p_actor_id: a.id, p_actor_name: a.name, p_note: note });
  return r.error ? { error: r.error } : { data: true };
}
/** A dated follow-up is its own record; it survives the case closing. `due` is a calendar day (YYYY-MM-DD). */
export async function addFollowup(caseId: string, dogId: string | null, due: string, note: string): Promise<Res<string>> {
  const r = await rpc<string>("add_case_followup", { p_case_id: caseId, p_dog_id: dogId, p_due_at: due, p_note: note.trim() || null });
  return r.error ? { error: r.error } : r.data ? { data: r.data } : { error: "The follow-up was not saved. Try again." };
}
export async function setFollowup(id: string, status: "upcoming" | "done" | "missed" | "postponed", due?: string): Promise<Res<true>> {
  const r = await rpc<boolean>("update_case_followup_status", { p_followup_id: id, p_status: status, p_note: null, p_due_at: due ?? null });
  return r.error ? { error: r.error } : r.data === true ? { data: true } : { error: "The follow-up did not change. It may have been changed by someone else; read it again." };
}

/* ── Delete with a reason, and restore ───────────────────────────── */

export type RemovableKind = "case" | "update" | "timeline" | "care" | "followup" | "evidence" | "animal";
/** The record moves to removed records (kept 30 days, audited); the database decides who may delete what. */
export async function removeRecord(kind: RemovableKind, id: string, reason: string): Promise<Res<string>> {
  const r = await rpc<string>("remove_record", { p_kind: kind, p_id: id, p_reason: reason.trim() || null });
  if (r.error) return { error: /does not exist|not find/i.test(r.error) ? "Deleting is not switched on for this workspace yet." : r.error };
  return { data: String(r.data) };
}
export async function restoreRecord(removedId: string): Promise<Res<true>> { const r = await rpc("restore_record", { p_removed: removedId }); return r.error ? { error: r.error } : { data: true }; }

/* ── New case ────────────────────────────────────────────────────── */

/** upsert_volunteer + create_case_with_location (with the H3 cell from the coordinates), exactly as the classic form. */
export async function createCase(input: CreateCaseInput, a: Actor): Promise<Res<string>> {
  try { const id = await createCaseLib(input, a); return id && id !== "demo-case" ? { data: id } : { error: "The database did not return the new case. Nothing was opened; try again." }; }
  catch (e) { return { error: msg(e) }; }
}
export type DogBrief = { id: string; name: string | null; straypaw_id: string | null; code: string | null; zone: string | null; city: string | null; lat: number | null; lng: number | null };
export async function readDog(ngoId: string, id: string): Promise<Res<DogBrief | null>> {
  try { const r = await db().from("dogs").select("id,name,straypaw_id,code,zone,city,lat,lng").eq("ngo_id", ngoId).eq("id", id).maybeSingle(); return r.error ? { error: r.error.message } : { data: (r.data as DogBrief | null) ?? null }; }
  catch (e) { return { error: msg(e) }; }
}
export async function findDogs(ngoId: string, term: string): Promise<DogBrief[]> {
  const t = term.trim().replace(/[%_,()]/g, "").slice(0, 60); if (t.length < 2) return [];
  try { const r = await db().from("dogs").select("id,name,straypaw_id,code,zone,city,lat,lng").eq("ngo_id", ngoId).or(`name.ilike.%${t}%,code.ilike.%${t}%,straypaw_id.ilike.%${t}%,identifiers.ilike.%${t}%`).order("last_seen", { ascending: false, nullsFirst: false }).limit(8); return (r.data ?? []) as DogBrief[]; }
  catch { return []; }
}
export async function orgCity(ngoId: string): Promise<string | null> {
  try { const r = await db().from("ngos").select("city").eq("id", ngoId).maybeSingle(); return (r.data as { city?: string | null } | null)?.city ?? null; } catch { return null; }
}

/* ── Animals ─────────────────────────────────────────────────────── */

export type OrgAnimal = { id: string; straypaw_id: string | null; name: string | null; code: string | null; species: string | null; zone: string | null; cover_photo: string | null; sterilisation_status: string | null; vaccination_status: string | null; needs_help: boolean; last_seen: string | null; created_at: string; total_count: number };
export type AnimalQuery = { search: string; ster: "not_sterilised" | null; vacc: "not_vaccinated" | null; needs: boolean | null; zone: string | null; limit: number; offset: number };
/** The register filtered and paged by the database (org_animals), so a large register never comes into the browser. */
export async function readAnimals(q: AnimalQuery): Promise<Res<OrgAnimal[]>> {
  const r = await rpc<OrgAnimal[]>("org_animals", { p_search: q.search.trim() || null, p_ster: q.ster, p_vacc: q.vacc, p_zone: q.zone || null, p_from: null, p_to: null, p_needs: q.needs, p_limit: q.limit, p_offset: q.offset });
  return r.error ? { error: r.error } : { data: Array.isArray(r.data) ? r.data : [] };
}
export async function readZones(): Promise<Res<{ zone: string; n: number }[]>> { const r = await rpc<{ zone: string; n: number }[]>("org_zones"); return r.error ? { error: r.error } : { data: Array.isArray(r.data) ? r.data : [] }; }
export type Revac = { days: number | null; programme: string | null; overdue: number; soon: number; dated: number; undated: number };
export async function readRevacSetting(): Promise<Res<Revac | null>> { const r = await rpc<Revac>("org_revaccination_setting"); return r.error ? { error: r.error } : { data: r.data && typeof r.data === "object" ? r.data : null }; }
export type RevacDue = { id: string; straypaw_id: string | null; name: string | null; code: string | null; zone: string | null; last_vaccinated: string; due_on: string; days_overdue: number; total_count: number };
export async function readRevacDue(limit: number, offset: number): Promise<Res<RevacDue[]>> { const r = await rpc<RevacDue[]>("org_revaccination_due", { p_limit: limit, p_offset: offset }); return r.error ? { error: r.error } : { data: Array.isArray(r.data) ? r.data : [] }; }

export type IdentityRow = { id: string; name: string | null; code: string | null; identifiers: string | null; identity_state: string };
export async function readIdentityQueue(ngoId: string): Promise<Res<IdentityRow[]>> {
  try { const r = await db().from("dogs").select("id,name,code,identifiers,identity_state").eq("ngo_id", ngoId).in("identity_state", ["provisional", "possible_duplicate"]).order("created_at", { ascending: false }).limit(100); return r.error ? { error: r.error.message } : { data: (r.data ?? []) as IdentityRow[] }; }
  catch (e) { return { error: msg(e) }; }
}
export async function identityCandidates(ngoId: string, not: string, term: string): Promise<IdentityRow[]> {
  const t = term.trim().replace(/[%_,()]/g, "").slice(0, 80); if (t.length < 2) return [];
  try { const r = await db().from("dogs").select("id,name,code,identifiers,identity_state").eq("ngo_id", ngoId).neq("id", not).or(`name.ilike.%${t}%,code.ilike.%${t}%,identifiers.ilike.%${t}%`).limit(30); return (r.data ?? []) as IdentityRow[]; }
  catch { return []; }
}
/** An identity decision is documented on the animal's newest case, as in the classic review. */
export async function newestCaseOf(ngoId: string, dogId: string): Promise<Res<string | null>> {
  try { const r = await db().from("cases").select("id").eq("dog_id", dogId).eq("ngo_id", ngoId).order("created_at", { ascending: false }).limit(1).maybeSingle(); return r.error ? { error: r.error.message } : { data: (r.data as { id: string } | null)?.id ?? null }; }
  catch (e) { return { error: msg(e) }; }
}

export type AnimalFull = { id: string; name: string | null; code: string | null; straypaw_id: string | null; species: string | null; sex: string | null; zone: string | null; city: string | null; color: string | null; identifiers: string | null; sterilisation_status: string | null; vaccination_status: string | null; identity_state: string | null; provenance: string | null; last_seen: string | null; needs_help: boolean | null; intake_notes: string | null; owner_name: string | null; lat: number | null; lng: number | null; cover_photo: string | null };
export type AnimalCase = { id: string; case_code: string | null; title: string | null; condition_class: string | null; status_class: string | null; occurred_at: string | null; assignee_name: string | null; provenance: string | null };
export type AnimalFollowup = { id: string; due_at: string; status: string; kind: string | null; note: string | null; case_id: string | null };
export type CareRow = { id: string; kind: string; event_date: string; notes: string | null; performed_by: string | null; case_id: string | null; created_at: string };
export type TimelineRow = { id: string; event_type: string | null; title: string | null; details: string | null; occurred_at: string; provenance: string | null; actor_name: string | null };
export type AnimalFile = { dog: AnimalFull; cases: AnimalCase[]; followups: AnimalFollowup[]; care: CareRow[]; timeline: TimelineRow[]; partial: string[] };
const DOG = "id,name,code,straypaw_id,species,sex,zone,city,color,identifiers,sterilisation_status,vaccination_status,identity_state,provenance,last_seen,needs_help,intake_notes,owner_name,lat,lng,cover_photo";
/** One animal of the organisation with everything recorded against it. A part that fails is named, never shown as empty. */
export async function readAnimal(ngoId: string, id: string): Promise<Res<AnimalFile | null>> {
  try {
    const s = db();
    const d = await s.from("dogs").select(DOG).eq("ngo_id", ngoId).eq("id", id).maybeSingle();
    if (d.error) return { error: d.error.message };
    if (!d.data) return { data: null };
    const [c, f, m, t] = await Promise.all([
      s.from("org_case_facts").select("id,case_code,title,condition_class,status_class,occurred_at,assignee_name,provenance").eq("dog_id", id).order("occurred_at", { ascending: false }).limit(50),
      s.from("animal_followups").select("id,due_at,status,kind,note,case_id").eq("dog_id", id).order("due_at", { ascending: false }).limit(50),
      s.from("medical_events").select("id,kind,event_date,notes,performed_by,case_id,created_at").eq("dog_id", id).order("event_date", { ascending: false }).limit(200),
      s.from("animal_timeline_events").select("id,event_type,title,details,occurred_at,provenance,actor_name").eq("dog_id", id).order("occurred_at", { ascending: false }).limit(200),
    ]);
    const partial = [c.error ? "cases" : null, f.error ? "follow-ups" : null, m.error ? "care" : null, t.error ? "history" : null].filter(Boolean) as string[];
    return { data: { dog: d.data as AnimalFull, cases: (c.data ?? []) as AnimalCase[], followups: (f.data ?? []) as AnimalFollowup[], care: (m.data ?? []) as CareRow[], timeline: (t.data ?? []) as TimelineRow[], partial } };
  } catch (e) { return { error: msg(e) }; }
}
export async function setNeedsHelp(dogId: string, on: boolean): Promise<Res<true>> {
  const r = await rpc<boolean>("ngo_set_dog_care", { p_dog_id: dogId, p_vaccinated: null, p_sterilised: null, p_needs_help: on });
  return r.error ? { error: r.error } : r.data === true ? { data: true } : { error: "The register did not accept this. Nothing was changed." };
}
/** A care event: what the organisation recorded, never a clinician's sign-off. Returns the new event's id. */
export async function recordCare(dogId: string, v: { kind: string; date: string; notes: string; by: string; caseId?: string | null }): Promise<Res<string>> {
  const r = await rpc<string>("add_medical_event", { p_dog_id: dogId, p_case_id: v.caseId ?? null, p_kind: v.kind, p_event_date: v.date || null, p_notes: v.notes.trim() || null, p_performed_by: v.by.trim() || null });
  return r.error ? { error: r.error } : r.data ? { data: r.data } : { error: "The care event was not saved. Try again." };
}

export const ID_KINDS = { microchip: "Microchip", rfid_tag: "RFID tag", qr: "QR code", ear_tag: "Ear tag", collar_tag: "Collar tag" } as const;
export type IdKind = keyof typeof ID_KINDS;
export type Identifier = { id: string; kind: IdKind; value: string; note: string | null; created_at: string };
const normId = (v: string) => v.replace(/\s+/g, "").toUpperCase();
/** Plain checks before the database's own: ISO 11784/11785 chips are 15 digits; older chips 9–10 hex characters. */
export function identifierProblem(kind: IdKind, raw: string): string | null {
  const v = normId(raw);
  if (v.length < 3) return "Enter at least 3 characters.";
  if (v.length > 64) return "That is longer than any identifier StrayPaw stores.";
  if (!/^[A-Z0-9._:/-]+$/.test(v)) return "Use letters, numbers and . _ : / - only.";
  if (kind === "microchip" && !/^([0-9]{15}|[0-9A-F]{9,10})$/.test(v)) return "A microchip number is 15 digits (ISO), or 9 or 10 characters on older chips.";
  return null;
}
export async function readIdentifiers(dogId: string): Promise<Res<Identifier[]>> {
  try { const r = await db().from("animal_identifiers").select("id,kind,value,note,created_at").eq("dog_id", dogId).is("retired_at", null).order("created_at", { ascending: true }); return r.error ? { error: r.error.message } : { data: (r.data ?? []) as Identifier[] }; }
  catch (e) { return { error: msg(e) }; }
}
export const addIdentifier = async (dogId: string, kind: IdKind, value: string, note: string): Promise<Res<true>> => { const r = await rpc("add_animal_identifier", { p_dog_id: dogId, p_kind: kind, p_value: value, p_note: note.trim() || null }); return r.error ? { error: r.error } : { data: true }; };
export const retireIdentifier = async (id: string, reason: string): Promise<Res<true>> => { const r = await rpc("retire_animal_identifier", { p_id: id, p_reason: reason.trim() }); return r.error ? { error: r.error } : { data: true }; };
export type Hit = { found: boolean; own?: boolean; dog_id?: string; straypaw_id?: string | null; name?: string | null; kind?: string };
export const lookupIdentifier = (value: string) => rpc<Hit>("lookup_animal_identifier", { p_value: value.trim() });

/* ── Inbox ───────────────────────────────────────────────────────── */

export type Incoming = { id: string; photo_url: string | null; zone: string | null; lat: number | null; lng: number | null; nickname: string | null; notes: string | null; mood_tags: string[] | null; sterilisation_status: string | null; vaccination_status: string | null; reported_by: string; status: string; created_at: string; total_count: number };
export async function readIncoming(source: "ours" | "community"): Promise<Res<Incoming[]>> {
  const r = await rpc<Incoming[]>("org_incoming", { p_source: source, p_zone: null, p_limit: 200, p_offset: 0 });
  return r.error ? { error: r.error } : { data: Array.isArray(r.data) ? r.data : [] };
}
export type Drive = { id: string; name: string; kind: string; archived: boolean };
export async function readDrives(): Promise<Res<Drive[]>> { const r = await rpc<Drive[]>("org_campaigns", { p_include_archived: false }); return r.error ? { error: r.error } : { data: Array.isArray(r.data) ? r.data.filter(Boolean) : [] }; }
/** Files the chosen sightings into a drive; with `claim`, the animals are registered as the organisation's. */
export async function fileReports(ids: string[], campaignId: string, claim: boolean): Promise<Res<{ filed: number; registered: number }>> {
  const r = await rpc<{ filed: number; registered: number }>("file_sightings_to_campaign", { p_sighting_ids: ids, p_campaign_id: campaignId, p_claim: claim });
  return r.error ? { error: r.error } : r.data ? r : { error: "The database did not say what it filed. Read the inbox again before trying once more." };
}
/** A case opened from a report carries its place and words; the person confirms them on the new-case form. */
export function caseFromReport(r: Pick<Incoming, "lat" | "lng" | "zone" | "notes" | "mood_tags">) {
  const p = new URLSearchParams();
  if (r.lat != null && r.lng != null) { p.set("lat", String(r.lat)); p.set("lng", String(r.lng)); }
  if (r.zone) p.set("zone", r.zone);
  p.set("title", (r.mood_tags ?? []).includes("injured") ? "Injured animal reported" : "Reported animal");
  if (r.notes) p.set("note", r.notes);
  return `/ngo/cases/new?${p.toString()}`;
}
const MISSING_FN = new Set(["PGRST202", "42883", "42P01"]);
export type WaState = { kind: "ok"; items: CareInboxItem[] } | { kind: "unlinked" } | { kind: "error"; detail: string };
export async function readWhatsApp(status: CareInboxStatus[] = ["new", "triaged", "linked"]): Promise<WaState> {
  try { const { data, error } = await db().rpc("careos_inbox_list", { p_status: status, p_limit: 200, p_offset: 0 }); if (error) return error.code && MISSING_FN.has(error.code) ? { kind: "unlinked" } : { kind: "error", detail: error.message }; return { kind: "ok", items: Array.isArray(data) ? (data as CareInboxItem[]) : [] }; }
  catch (e) { return { kind: "error", detail: msg(e) }; }
}
export async function actWhatsApp(action: CareInboxAction): Promise<Res<CareInboxItem>> { return rpc<CareInboxItem>("careos_inbox_act", { p_action: action }); }

/** One message to Kaju with the person's own session: the workspace scope is checked first, then the words are sent with
    the page's context. Kaju prepares; nothing is saved here. */
export async function askKaju(text: string, context: Record<string, unknown>, failed = "Kaju could not read the message. Nothing was changed. Try again."): Promise<Res<AiReply>> {
  try {
    const session = (await db().auth.getSession()).data.session;
    if (!session) return { error: "Your session has ended. Sign in again; nothing was changed." };
    const auth = { Authorization: `Bearer ${session.access_token}` };
    const who = await fetch("/api/ai", { cache: "no-store", headers: auth });
    const w = await who.json().catch(() => null) as { scope?: string } | null;
    if (!who.ok || typeof w?.scope !== "string") return { error: "Kaju could not check your workspace access. Nothing was changed. Try again." };
    const r = await fetch("/api/ai", { method: "POST", headers: { ...auth, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ messages: [{ role: "user", text }], context: { ...context, scope: w.scope } }) });
    const d = await r.json().catch(() => null) as (AiReply & { error?: string }) | null;
    if (!r.ok || !d || typeof d.text !== "string") return { error: d?.error ?? failed };
    return { data: { ...d, proposals: Array.isArray(d.proposals) ? d.proposals : [] } };
  } catch (e) { return { error: msg(e) }; }
}
/** Kaju reads a pasted field message with the person's own session (the same request the classic panel sends). */
export const kajuRead = (text: string) => askKaju(`Pasted WhatsApp message:\n${text}`, { path: "/ngo/inbox", workspace: "ngo", title: "Inbox" });
/** Prepared records that save through /api/ai/act (the same server functions as the manual screens). register_exposure is a
    bite-register entry, saved through the bite form's own database function. */
export const RECORD_PROPOSALS = new Set(["open_case", "add_note", "schedule_followup", "record_care", "add_task", "register_exposure"]);
/** Confirming a prepared record: /api/ai/act runs the same server function the manual screens use and checks the audit row. */
export async function kajuConfirm(p: Proposal): Promise<Res<{ at: string; what: string; href: string | null }> & { href?: string | null }> {
  try {
    const session = (await db().auth.getSession()).data.session;
    if (!session) return { error: "Sign in again to confirm this. Nothing was saved." };
    const r = await fetch("/api/ai/act", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ proposal: p, confirmed: true }) });
    const j = await r.json().catch(() => ({})) as { verified?: boolean; at?: string; what?: string; href?: string; error?: string };
    return r.ok && j.verified === true && typeof j.at === "string" ? { data: { at: j.at, what: j.what ?? "Saved to the record", href: nextHref(j.href) } } : { error: j.error ?? "The save could not be verified yet. Confirm the same proposal again to check it; it will not be saved twice.", href: nextHref(j.href) };
  } catch { return { error: "The save status is unknown. Confirm the same proposal again to check it; it will not be saved twice." }; }
}

/* ── Operations: care log and the two lanes ──────────────────────── */

export type CareLogRow = { id: string; kind: string; event_date: string; notes: string | null; performed_by: string | null; case_id: string | null; animal: { id: string; name: string | null; code: string | null; zone: string | null } };
/** The organisation's care events, newest first, read from its own animals (fast on a large register, as in classic). */
export async function readCareLog(ngoId: string, limit = 250): Promise<Res<{ rows: CareLogRow[]; total: number | null }>> {
  try {
    const s = db();
    const [d, head] = await Promise.all([
      s.from("dogs").select("id,name,code,zone,medical_events!inner(id,kind,event_date,notes,performed_by,case_id)").eq("ngo_id", ngoId).limit(5000),
      Promise.race([Promise.resolve(s.from("medical_events").select("id,dogs!inner(ngo_id)", { count: "exact", head: true }).eq("dogs.ngo_id", ngoId)).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 4000))]),
    ]);
    if (d.error) return { error: d.error.message };
    type D = { id: string; name: string | null; code: string | null; zone: string | null; medical_events: Omit<CareLogRow, "animal">[] };
    const rows = ((d.data ?? []) as D[]).flatMap((a) => (a.medical_events ?? []).map((m) => ({ ...m, animal: { id: a.id, name: a.name, code: a.code, zone: a.zone } })))
      .sort((a, b) => b.event_date.localeCompare(a.event_date)).slice(0, limit);
    const total = head && !(head as { error?: unknown }).error ? ((head as { count: number | null }).count ?? null) : null;
    return { data: { rows, total } };
  } catch (e) { return { error: msg(e) }; }
}

export type MedicalCase = { id: string; case_code: string | null; title: string | null; category: string | null; status: string | null; medical_notes: string | null; zone: string | null; last_activity_at: string | null };
/** Cases that carry medical work: injury, vaccination, sterilisation, or with medical notes (the classic ledger's second view). */
export async function readMedicalCases(ngoId: string): Promise<Res<MedicalCase[]>> {
  try { const r = await db().from("cases").select("id,case_code,title,category,status,medical_notes,zone,last_activity_at").eq("ngo_id", ngoId).or("category.in.(injury,vaccination,sterilisation),medical_notes.not.is.null").order("last_activity_at", { ascending: false, nullsFirst: false }).limit(200); return r.error ? { error: r.error.message } : { data: (r.data ?? []) as MedicalCase[] }; }
  catch (e) { return { error: msg(e) }; }
}

export type LaneCard = { key: string; href: string; code: string; title: string; meta: string; age: number | null; tag: { label: string; tone: "plain" | "accent" | "ok" | "warn" | "bad" }; who?: string | null; hot?: boolean };
export type Lanes = { new: LaneCard[] | null; care: LaneCard[] | null; vet: LaneCard[] | null; evidence: LaneCard[] | null; report: LaneCard[] | null };
type QueueRow = { case_id: string; case_code: string | null; title: string | null; city: string | null; created_at: string; provenance: string | null; evidence_count: number; missing: string[]; vet_authorised: boolean; evidence_reviewed: boolean; government_accepted: boolean; vet_name: string | null; reviewer_name: string | null; returned_note: string | null; in_package: string | null };
const ageOf = (iso: string | null | undefined) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / DAY)) : null);
const GAP: Record<string, string> = { surgery_record: "surgery record", ear_notch_photo: "ear-notch photo", release_photo: "release photo", release_location: "release place", capture_photo: "capture photo" };
/** The stage a procedure is at, from the database's own flags (lib/abc stageOf), folded into the three lanes. */
function abcStage(r: QueueRow): "vet" | "evidence" | "report" | "done" {
  if (r.government_accepted || (r.in_package && r.in_package !== "draft")) return "done";
  if (r.evidence_reviewed) return r.in_package ? "done" : "report";
  if (r.returned_note) return "evidence";
  if (!r.vet_authorised) return r.missing.includes("surgery_record") ? "evidence" : "vet";
  return r.missing.length ? "evidence" : "report";
}
const urgent = (a: LaneCard, b: LaneCard) => Number(!!b.hot) - Number(!!a.hot) || (b.age ?? 0) - (a.age ?? 0);
/** The rescue lane (reports, then cases in care) and the sterilisation lane (vet sign-off, evidence, ready to report):
    the same reads as the classic pipeline. A failed read is null, never an empty lane. */
export async function readLanes(ngoId: string): Promise<Lanes> {
  const [ours, community, cases, queue] = await Promise.all([readIncoming("ours"), readIncoming("community"), readCases(ngoId), rpc<QueueRow[]>("abc_verification_queue", { p_limit: 500 })]);
  const q = queue.error ? null : (queue.data ?? []).filter((r) => r.provenance !== "imported_historical_record");
  const inQ = new Set((q ?? []).map((r) => r.case_id));
  const now = Date.now();
  const card = (r: QueueRow): LaneCard => {
    const st = r.returned_note ? "returned" : abcStage(r); const gap = r.missing.map((k) => GAP[k] ?? k.replace(/_/g, " "));
    return { key: `q-${r.case_id}`, href: `/ngo/cases/${r.case_id}`, code: shortCode(r.case_code), title: r.title || "Procedure record", age: ageOf(r.created_at), hot: st === "returned",
      meta: st === "returned" ? (r.returned_note ?? "Returned for a correction") : st === "evidence" ? `Missing ${gap.slice(0, 2).join(", ") || "evidence"}${gap.length > 2 ? ` and ${gap.length - 2} more` : ""}` : st === "vet" ? (r.city ?? "Waiting for the veterinarian") : `Signed by ${r.vet_name ?? "the veterinarian"}`,
      tag: st === "returned" ? { label: "Returned", tone: "bad" } : st === "evidence" ? { label: `${r.evidence_count} of 5`, tone: "warn" } : st === "vet" ? { label: "Sign-off", tone: "accent" } : { label: r.evidence_reviewed ? "Approved" : "Review", tone: r.evidence_reviewed ? "ok" : "accent" } };
  };
  const lane = (id: "vet" | "evidence" | "report") => (q ? q.filter((r) => abcStage(r) === id).map(card).sort(urgent) : null);
  return {
    new: ours.error || community.error ? null : [...(ours.data ?? []), ...(community.data ?? [])].filter((r, i, all) => all.findIndex((x) => x.id === r.id) === i).map((r) => ({ key: `i-${r.id}`, href: "/ngo/inbox", code: "Report", title: r.nickname || (r.mood_tags?.[0] ? r.mood_tags[0].replace(/_/g, " ") : "Animal reported"), meta: r.zone || "Place not given", age: ageOf(r.created_at), tag: { label: "To triage", tone: "plain" as const } })),
    care: cases.error ? null : (cases.data?.rows ?? []).filter((c) => isOpenClass(c.status_class) && !isHistorical(c) && !isStaleFact(c, now) && !inQ.has(c.id)).map((c): LaneCard => {
      const crit = isCriticalCondition(c.condition_class);
      return { key: `c-${c.id}`, href: `/ngo/cases/${c.id}`, code: shortCode(c.case_code), title: c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title || "Open case", meta: [realName(c.animal_name), c.zone ?? c.city].filter(Boolean).join(" · ") || "Place not recorded", age: ageOf(c.occurred_at), who: c.assignee_name, hot: crit,
        tag: crit ? { label: "Critical", tone: "bad" } : (c.followups_missed ?? 0) > 0 ? { label: "Follow-up overdue", tone: "warn" } : c.status_class === "in_progress" ? { label: "In progress", tone: "accent" } : { label: "Open", tone: "plain" } };
    }).sort(urgent),
    vet: lane("vet"), evidence: lane("evidence"), report: lane("report"),
  };
}
