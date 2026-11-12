"use client";

/* One Health data access. Every read and write goes to a database function
   that checks the caller's organisation, role and programme; nothing here
   decides access. A failed read is reported as unknown, never as zero, and
   suppressed human counts arrive as the string "<5". */
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export type Kind = "state" | "coordinator" | "municipal" | "hospital" | "clinic" | "laboratory" | "ngo" | "research" | "training";
export type Role = "lead" | "coordinator" | "clinician" | "nurse" | "records" | "lab_scientist" | "analyst" | "field" | "trainer";
export type Count = number | "<5" | null;
export type ProgrammeRef = { id: string; slug: string; name: string; illustrative: boolean };

/** One organisation a person works in, as oh_my_today returns it. */
export type Place = {
  organisation_id: string; name: string; short_name: string | null; kind: Kind; role: Role; ngo_id: string | null; illustrative: boolean;
  capabilities: string[]; programmes: ProgrammeRef[];
  handoffs_open: number; handoffs_overdue: number; doses_due: number | null; notices_new: number | null; samples_waiting: number | null; services_stale: number | null;
  /** People referred to this facility and not yet marked (v2.6; absent before it). */
  transfers_in?: number | null;
};

export type RegisterRow = { id: string; code: string; patient_ref: string | null; age_band: string; sex: string; area: string | null; exposure_on: string; presented_on: string; kind: string; category: string; species: string; course_status: string | null; regimen: string | null; doses_given: number; doses_total: number; next_due: string | null; handoff_status: string | null };
export type DueDose = { dose_id: string; dose_no: number; doses_total: number; due_on: string; exposure_id: string; code: string; patient_ref: string | null; age_band: string; regimen: string; phone: string | null; last_reminder: { at: string; outcome: string } | null };
export type Completed = { course_id: string; exposure_id: string; code: string; patient_ref: string | null; completed_at: string; phone: string | null; told: boolean };
export type ClinicDue = { today: string; due: DueDose[]; completed: Completed[] };
export type Notice = { id: string; facility_id: string; happened_on: string; area: string | null; place: string | null; animal_species: string; animal_description: string | null; callback_phone: string | null; callback_consent: boolean; status: string; created_at: string };
export type Dose = { id: string; dose_no: number; due_on: string; given_on: string | null; given_by_name: string | null; batch: string | null; status: "due" | "given" | "missed" | "cancelled" };
export type Exposure = {
  id: string; code: string; facility_id: string; patient_ref: string | null; age_band: string; sex: string; area: string | null; area_id: string | null; exposure_on: string; presented_on: string; exposure_kind: string;
  category: string; category_by_name: string | null; wound_washed: string; animal_species: string; animal_ownership: string; animal_description: string | null; animal_place: string | null; source: string;
  contact_phone: string | null; reminder_consent: boolean; my_role: Role; today: string; can: { assess: boolean; prescribe: boolean; record_dose: boolean };
  course: { id: string; regimen: string; rig_given: boolean; prescribed_by_name: string | null; prescribed_at: string; status: string; status_note: string | null } | null;
  doses: Dose[]; handoff: { id: string; status: string; to: string; outcome: string | null } | null; history: { at: string; action: string }[];
};
export type Handoff = { id: string; programme_id: string | null; kind: string; from_org: string | null; to_org: string; title: string; detail: string | null; area_id: string | null; place: string | null; animal_id: string | null; sample_id: string | null; status: string; due_on: string | null; outcome: string | null; created_at: string; closed_at: string | null; closed_by_name: string | null };
export type Sample = { id: string; code: string; submitted_by: string; laboratory_id: string; animal_id: string | null; species: string; sample_type: string; reason: string | null; collected_on: string; collected_by_name: string | null; area_id: string | null; place: string | null; status: string; result: string | null; method: string | null; result_note: string | null; resulted_at: string | null; resulted_by_name: string | null; created_at: string };
export type SampleEvent = { id: number; sample_id: string; at: string; actor_name: string | null; organisation_id: string | null; action: string; note: string | null };
/** A person referred from one facility to another (health.transfers). The receiving side never sees patient details. */
export type TransferIn = { id: string; code: string; category: string; exposure_on: string; animal_species: string; service: string; note: string | null; status: string; from: string; from_short: string | null; sent_at: string; sent_by: string | null; closed_at: string | null; closed_by: string | null };
export type TransferOut = { id: string; exposure_id?: string; code?: string; service: string; note?: string | null; status: string; to: string; to_short: string | null; sent_at: string; sent_by: string | null; closed_at: string | null; closed_by: string | null };
export type ClinicTransfers = { incoming: TransferIn[]; outgoing: TransferOut[] };
export type ReferralOption = { id: string; name: string; short_name: string | null; kind: Kind; area: string | null; pathways: string[]; services: { service: string; status: string; verified_at: string }[] };
export const TRANSFER: Record<string, { label: string; tone: string }> = { sent: { label: "Referred", tone: "blue" }, arrived: { label: "Arrived", tone: "green" }, not_arrived: { label: "Did not arrive", tone: "flame" }, withdrawn: { label: "Withdrawn", tone: "" } };
export type ServiceNow = { service: string; status: string; note: string | null; verified_at: string; valid_until: string; by?: string | null };
export type Area = { id: string; name: string; level?: string; parent_id?: string | null };

export type Overview = {
  programme: { id: string; slug: string; name: string; status: string; illustrative: boolean; target: number; summary: string | null; modules: string[]; suppress_below: number; parent: { slug: string; name: string } | null };
  since: string; today: string; can_oversee: boolean; can_manage: boolean;
  children: { slug: string; name: string; status: string; exposures: Count; positives: number; overdue: number }[];
  partners: { id: string; name: string; short_name: string | null; kind: Kind; responsibilities: string | null; members: Count; open: number; overdue: number }[];
  exposures: { total: Count; category_iii: Count; washed: Count; washed_known: Count; by_week: { week: string; n: Count }[]; by_area: { area: string; n: Count }[] } | null;
  pep: { courses: Count; completed: Count; lost: Count; active: Count; completion_rate: number | null; doses_overdue: Count } | null;
  samples: { total: number; waiting: number; positive: number; negative: number; median_days_to_result: number | null; positive_areas: string[] };
  handoffs: { open: number; overdue: number; done: number; median_days_to_close: number | null; service_gaps: number };
  services: { facilities: number; confirmed: number; stale: number; arv_unavailable: number; arv_limited: number; never_confirmed: number };
  vaccination: { area: string; area_id: string; registered: number; vaccinated: number; estimate: { dogs: number; method: string; source: string; on: string } | null }[];
  training: { sessions: number; participants: number; by_audience: Record<string, number> };
};

export type Alert = { key: string; kind: string; severity: "urgent" | "attention" | "info"; title: string; detail: string; area: string | null; organisation_id: string | null; ref: Record<string, string>; at: string; ack: { by: string | null; at: string; note: string | null } | null };
export type NetworkFacility = { id: string; name: string; short_name: string | null; kind: Kind; area: string | null; area_id: string | null; address: string | null; phone: string | null; hours: string | null; lat: number | null; lng: number | null; listed_publicly: boolean; illustrative: boolean; services: ServiceNow[]; active_courses: Count; samples_waiting: number | null };
export type Network = { facilities: NetworkFacility[]; referrals: { from: string; to: string; service: string; note: string | null }[]; areas: { id: string; name: string; level: string; geometry: unknown; illustrative: boolean }[]; can_configure: boolean };

export type Result<T> = { data: T | null; error: string | null; loading: boolean; reload: () => void };

function message(e: unknown): string {
  const m = (e as { message?: string })?.message ?? "";
  if (/fetch|network|Failed to fetch/i.test(m)) return "Could not reach StrayPaw. Check the connection and try again.";
  if (/function .* does not exist|Could not find the function|schema cache/i.test(m)) return "Programmes are not set up on this database yet.";
  if (/violates (check|foreign key|not-null|unique) constraint|invalid input syntax/i.test(m)) return "Some details are not valid. Check the dates and entries, then try again.";
  if (/JWT|not authenticated/i.test(m)) return "Your session has ended. Sign in again.";
  return m || "Something went wrong. Try again.";
}

export async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ data: T | null; error: string | null }> {
  const db = getSupabase();
  if (!db) return { data: null, error: "StrayPaw is not configured on this site." };
  try {
    const { data, error } = await db.rpc(fn, args);
    if (error) return { data: null, error: message(error) };
    return { data: data as T, error: null };
  } catch (e) { return { data: null, error: message(e) }; }
}

/** A bounded table read; row-level security decides which rows come back. */
export async function select<T>(table: string, filters: Record<string, string> = {}, columns = "*", limit = 300): Promise<{ data: T[] | null; error: string | null }> {
  const db = getSupabase();
  if (!db) return { data: null, error: "StrayPaw is not configured on this site." };
  try {
    let q = db.from(table).select(columns).limit(limit);
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    const { data, error } = await q;
    if (error) return { data: null, error: message(error) };
    return { data: data as T[], error: null };
  } catch (e) { return { data: null, error: message(e) }; }
}

type OrgName = { id: string; name: string; short_name: string | null; kind: Kind; ngo_id: string | null };
/** Names of the organisations and areas this person can see, for labels. */
export function useNames(ready = true) {
  const orgs = useRead<OrgName[]>(() => select<OrgName>("oh_organisations", {}, "id,name,short_name,kind,ngo_id", 500), "names:orgs", ready);
  const areas = useRead<{ id: string; name: string }[]>(() => select<{ id: string; name: string }>("oh_areas", {}, "id,name", 1000), "names:areas", ready);
  const o = orgs.data ?? [], a = areas.data ?? [];
  return {
    orgs: o,
    org: (id: string | null | undefined, short = true) => { const x = o.find((v) => v.id === id); return x ? (short ? x.short_name ?? x.name : x.name) : null; },
    area: (id: string | null | undefined) => a.find((v) => v.id === id)?.name ?? null,
  };
}

/** Run a read when the inputs are ready; a change of `key` re-runs it. */
export function useRead<T>(read: () => Promise<{ data: T | null; error: string | null }>, key: string, ready = true): Result<T> {
  const [state, set] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    if (!ready) return;
    let live = true;
    set((s) => ({ ...s, loading: true }));
    read().then((r) => { if (live) set({ data: r.data, error: r.error, loading: false }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick, ready]);
  return { ...state, reload };
}

/* ── Plain-English labels, in one place ────────────────────────────── */
export const KIND_LABEL: Record<Kind, string> = { state: "State coordination", coordinator: "Programme coordination", municipal: "Municipal department", hospital: "Hospital", clinic: "Health centre", laboratory: "Laboratory", ngo: "Field partner", research: "Research", training: "Training" };
export const ROLE_LABEL: Record<Role, string> = { lead: "Lead", coordinator: "Coordinator", clinician: "Clinician", nurse: "Nurse", records: "Records", lab_scientist: "Laboratory scientist", analyst: "Analyst", field: "Field team", trainer: "Trainer" };
export const SERVICE_LABEL: Record<string, string> = { arv: "Anti-rabies vaccine", rig: "Rabies immunoglobulin", wound_care: "Wound washing", dog_vaccination: "Dog vaccination", rabies_testing: "Rabies testing" };
export const SERVICE_SHORT: Record<string, string> = { arv: "Vaccine", rig: "RIG", wound_care: "Wound washing", dog_vaccination: "Dog vaccination", rabies_testing: "Testing" };
export const SERVICE_STATUS: Record<string, { label: string; tone: string }> = { available: { label: "Available", tone: "green" }, limited: { label: "Limited", tone: "amber" }, unavailable: { label: "Not available", tone: "flame" }, not_verified: { label: "Not confirmed recently", tone: "" } };
export const EXPOSURE_KIND: Record<string, string> = { bite: "Bite", scratch: "Scratch", lick_broken_skin: "Lick on broken skin", other: "Other contact" };
export const SPECIES: Record<string, string> = { dog: "Dog", cat: "Cat", cattle: "Cattle", monkey: "Monkey", wildlife: "Wild animal", other: "Other animal", unknown: "Not known" };
export const AGE: Record<string, string> = { "0-4": "Under 5", "5-14": "5 to 14", "15-29": "15 to 29", "30-49": "30 to 49", "50+": "50 and over", not_recorded: "Not recorded" };
export const SEX: Record<string, string> = { female: "Female", male: "Male", other: "Other", not_recorded: "Not recorded" };
export const WASHED: Record<string, string> = { before_arrival: "Washed before arrival", at_facility: "Washed here", not_washed: "Not washed", not_recorded: "Not recorded" };
export const OWNERSHIP: Record<string, string> = { community: "Community animal", owned: "Owned animal", unknown: "Not known" };
export const COURSE: Record<string, { label: string; tone: string }> = { active: { label: "In course", tone: "blue" }, completed: { label: "Course complete", tone: "green" }, discontinued: { label: "Stopped by clinician", tone: "" }, lost_to_follow_up: { label: "Did not return", tone: "flame" } };
export const HANDOFF: Record<string, { label: string; tone: string }> = { open: { label: "New", tone: "blue" }, accepted: { label: "In progress", tone: "amber" }, done: { label: "Done", tone: "green" }, declined: { label: "Declined", tone: "" } };
export const HANDOFF_KIND: Record<string, string> = { animal_followup: "Animal follow-up", sample_request: "Sample request", result_notice: "Laboratory result", service_gap: "Service gap", vaccination_request: "Vaccination request" };
export const SAMPLE: Record<string, { label: string; tone: string }> = { collected: { label: "Collected", tone: "" }, dispatched: { label: "On its way", tone: "amber" }, received: { label: "Received", tone: "blue" }, testing: { label: "Testing", tone: "violet" }, resulted: { label: "Resulted", tone: "green" }, rejected: { label: "Rejected", tone: "flame" } };
export const RESULT: Record<string, { label: string; tone: string }> = { positive: { label: "Positive", tone: "flame" }, negative: { label: "Negative", tone: "green" }, inconclusive: { label: "Inconclusive", tone: "amber" } };
export const SAMPLE_TYPE: Record<string, string> = { brain_tissue: "Brain tissue", saliva: "Saliva", csf: "Cerebrospinal fluid", serum: "Serum", other: "Other" };
export const AUDIENCE: Record<string, string> = { veterinarians: "Veterinarians", para_veterinarians: "Para-veterinarians", animal_handlers: "Animal handlers", laboratory: "Laboratory staff", healthcare: "Healthcare workers", community: "Community", mixed: "Mixed" };
export const REMINDER: Record<string, string> = { called_reached: "Called, reached", called_no_answer: "Called, no answer", message_sent_manually: "Message sent from a phone", patient_will_attend: "Will attend", wrong_number: "Wrong number" };
export const AUDIT: Record<string, string> = { refer: "Referred to another facility", transfer_arrived: "Referral: arrived", transfer_not_arrived: "Referral: did not arrive", transfer_withdrawn: "Referral withdrawn", record_exposure: "Bite recorded", set_category: "Category recorded", set_wound_washed: "Wound washing recorded", prescribe: "Course prescribed", add_dose: "Dose date added", record_dose_given: "Dose given", record_dose_missed: "Dose missed", reminder: "Reminder logged", read: "Record opened", course_completed: "Course completed", course_discontinued: "Course stopped", course_lost_to_follow_up: "Marked did not return", course_active: "Course reopened" };
export const MODULES: Record<string, { label: string; note: string }> = {
  bite_care: { label: "Bite care and PEP", note: "Hospitals and health centres record bites, clinicians prescribe, nurses record doses" },
  laboratory: { label: "Laboratory surveillance", note: "Samples, chain of custody and results with automatic notices" },
  followups: { label: "Work between partners", note: "Animal follow-ups, sample requests and notices with due dates" },
  vaccination: { label: "Dog vaccination coverage", note: "Partner registers against population estimates and the target" },
  services: { label: "Care network", note: "Confirmed availability of vaccine, immunoglobulin and wound washing; referral pathways" },
  training: { label: "Training", note: "Sessions by audience and institution" },
};
export const ALERT_KIND: Record<string, string> = { positive_result: "Laboratory confirmed", pep_readiness: "Treatment readiness", doses_overdue: "Doses overdue", courses_completed: "Courses completed", followups_overdue: "Follow-ups overdue", sample_waiting: "Sample waiting", coverage_below_target: "Vaccination coverage", revaccination_due: "Revaccination due" };

/* ── Dates in the programme's time zone (India by default) ─────────── */
const TZ = "Asia/Kolkata";
export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
export const fmtDate = (d: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) => d ? new Date(d.length === 10 ? `${d}T00:00:00+05:30` : d).toLocaleDateString("en-IN", { timeZone: TZ, ...opts }) : "Not recorded";
export const fmtTime = (d: string) => new Date(d).toLocaleString("en-IN", { timeZone: TZ, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export function daysFrom(d: string): number { const a = new Date(`${today()}T00:00:00Z`).getTime(), b = new Date(`${d.slice(0, 10)}T00:00:00Z`).getTime(); return Math.round((b - a) / 86_400_000); }
export function relDay(d: string): string { const n = daysFrom(d); return n === 0 ? "Today" : n === -1 ? "Yesterday" : n === 1 ? "Tomorrow" : n < 0 ? `${-n} days ago` : `In ${n} days`; }
export const showCount = (c: Count | undefined) => (c === null || c === undefined ? "Not read" : c === "<5" ? "Fewer than 5" : c.toLocaleString("en-IN"));
export const num = (c: Count | undefined) => (typeof c === "number" ? c : 0);
export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;
