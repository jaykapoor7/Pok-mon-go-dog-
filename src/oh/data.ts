"use client";

/* Data access for the One Health workspaces. Every call goes to a database
   function that checks the caller's institution and role; nothing here
   decides access. A failed read is reported as unknown, never as zero. */
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export type Kind = "coordinator" | "municipal" | "hospital" | "clinic" | "laboratory" | "ngo" | "research" | "training";
export type Role = "lead" | "coordinator" | "clinician" | "nurse" | "records" | "lab_scientist" | "analyst" | "field" | "trainer";
export type Count = number | "<5" | null;

export type Place = {
  institution_id: string; name: string; short_name: string | null; kind: Kind; role: Role;
  programme: { id: string; slug: string; name: string; illustrative: boolean };
  handoffs_open: number; handoffs_overdue: number; doses_due: number | null; notices_new: number | null; samples_waiting: number | null; services_stale: number | null;
};

export type Institution = { id: string; programme_id: string; kind: Kind; name: string; short_name: string | null; ngo_id: string | null; responsibilities: string | null; ward: string | null; address: string | null; phone: string | null; hours: string | null; listed_publicly: boolean };
export type Programme = { id: string; slug: string; name: string; city: string; summary: string | null; status: string; vaccination_target: number; wards: string[]; illustrative: boolean };

export type RegisterRow = { id: string; code: string; patient_ref: string | null; age_band: string; sex: string; ward: string | null; exposure_on: string; presented_on: string; kind: string; category: string; species: string; course_status: string | null; regimen: string | null; doses_given: number; doses_total: number; next_due: string | null; handoff_status: string | null };
export type DueDose = { dose_id: string; dose_no: number; doses_total: number; due_on: string; exposure_id: string; code: string; patient_ref: string | null; age_band: string; regimen: string; phone: string | null; last_reminder: { at: string; outcome: string } | null };
export type Notice = { id: string; facility_id: string; happened_on: string; ward: string | null; place: string | null; animal_species: string; animal_description: string | null; callback_phone: string | null; callback_consent: boolean; status: string; created_at: string };
export type Dose = { id: string; dose_no: number; due_on: string; given_on: string | null; given_by_name: string | null; batch: string | null; status: "due" | "given" | "missed" | "cancelled" };
export type Exposure = {
  id: string; code: string; facility_id: string; patient_ref: string | null; age_band: string; sex: string; ward: string | null; exposure_on: string; presented_on: string; exposure_kind: string;
  category: string; category_by_name: string | null; animal_species: string; animal_ownership: string; animal_description: string | null; animal_place: string | null; source: string;
  contact_phone: string | null; reminder_consent: boolean; my_role: Role;
  course: { id: string; regimen: string; rig_given: boolean; prescribed_by_name: string | null; prescribed_at: string; status: string; status_note: string | null } | null;
  doses: Dose[]; handoff: { id: string; status: string; to: string; outcome: string | null } | null; history: { at: string; action: string }[];
};
export type Handoff = { id: string; programme_id: string; kind: string; from_institution: string | null; to_institution: string; title: string; detail: string | null; ward: string | null; place: string | null; animal_id: string | null; sample_id: string | null; status: string; due_on: string | null; outcome: string | null; created_at: string; closed_at: string | null; closed_by_name: string | null };
export type Sample = { id: string; programme_id: string; code: string; submitted_by: string; laboratory_id: string; animal_id: string | null; species: string; sample_type: string; reason: string | null; collected_on: string; collected_by_name: string | null; ward: string | null; place: string | null; status: string; result: string | null; method: string | null; result_note: string | null; resulted_at: string | null; resulted_by_name: string | null; created_at: string };
export type SampleEvent = { id: number; sample_id: string; at: string; actor_name: string | null; institution_id: string | null; action: string; note: string | null };
export type Service = { id: string; institution_id: string; service: string; status: string; note: string | null; verified_by_name: string | null; verified_at: string; valid_until: string };
export type Dog = { id: string; name: string | null; code: string | null; zone: string | null; vaccination_status: string | null };

export type Overview = {
  programme: { id: string; slug: string; name: string; city: string; status: string; illustrative: boolean; target: number; summary: string | null };
  since: string; can_oversee: boolean;
  partners: { id: string; name: string; short_name: string | null; kind: Kind; responsibilities: string | null; open: number; overdue: number }[];
  exposures: { total: Count; category_iii: Count; by_week: { week: string; n: Count }[]; by_ward: { ward: string; n: Count }[] };
  pep: { courses: Count; completed: Count; lost: Count; completion_rate: number | null };
  samples: { total: number; waiting: number; positive: number; negative: number; median_days_to_result: number | null; positive_wards: string[] };
  handoffs: { open: number; overdue: number; done: number; median_days_to_close: number | null };
  services: { facilities: number; confirmed: number; stale: number; arv_unavailable: number };
  vaccination: { ward: string; registered: number; vaccinated: number; estimate: { dogs: number; method: string; source: string; on: string } | null }[];
  training: { sessions: number; participants: number; by_audience: Record<string, number> };
};

export type Result<T> = { data: T | null; error: string | null; loading: boolean; reload: () => void };

function message(e: unknown): string {
  const m = (e as { message?: string })?.message ?? "";
  if (/fetch|network|Failed to fetch/i.test(m)) return "Could not reach StrayPaw. Check the connection and try again.";
  if (/function .* does not exist|Could not find the function|schema cache/i.test(m)) return "The One Health programme is not set up on this database yet.";
  if (/violates (check|foreign key|not-null|unique) constraint|invalid input syntax/i.test(m)) return "Some details are not valid. Check the dates and entries, then try again.";
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

export async function select<T>(table: string, filters: Record<string, string> = {}, columns = "*", limit = 200): Promise<{ data: T[] | null; error: string | null }> {
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

/** Run a read when the inputs are ready; `key` changes re-run it. */
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

/* ── Labels: plain English, one place ─────────────────────────────── */
export const KIND_LABEL: Record<Kind, string> = { coordinator: "Programme coordination", municipal: "Municipal division", hospital: "Hospital", clinic: "Health centre", laboratory: "Laboratory", ngo: "Field partner", research: "Research", training: "Training" };
export const ROLE_LABEL: Record<Role, string> = { lead: "Programme lead", coordinator: "Coordinator", clinician: "Clinician", nurse: "Nurse", records: "Records", lab_scientist: "Laboratory scientist", analyst: "Analyst", field: "Field team", trainer: "Trainer" };
export const SERVICE_LABEL: Record<string, string> = { arv: "Anti-rabies vaccine", rig: "Rabies immunoglobulin", wound_care: "Wound washing and care", dog_vaccination: "Dog vaccination", rabies_testing: "Rabies testing" };
export const SERVICE_STATUS: Record<string, { label: string; tone: string }> = { available: { label: "Available", tone: "green" }, limited: { label: "Limited", tone: "amber" }, unavailable: { label: "Not available", tone: "flame" }, not_verified: { label: "Not verified", tone: "" } };
export const KIND_OF_EXPOSURE: Record<string, string> = { bite: "Bite", scratch: "Scratch", lick_broken_skin: "Lick on broken skin", other: "Other contact" };
export const SPECIES: Record<string, string> = { dog: "Dog", cat: "Cat", cattle: "Cattle", monkey: "Monkey", wildlife: "Wild animal", other: "Other animal", unknown: "Not known" };
export const AGE: Record<string, string> = { "0-4": "Under 5", "5-14": "5 to 14", "15-29": "15 to 29", "30-49": "30 to 49", "50+": "50 and over", not_recorded: "Not recorded" };
export const SEX: Record<string, string> = { female: "Female", male: "Male", other: "Other", not_recorded: "Not recorded" };
export const COURSE: Record<string, { label: string; tone: string }> = { active: { label: "In course", tone: "blue" }, completed: { label: "Course complete", tone: "green" }, discontinued: { label: "Stopped by clinician", tone: "" }, lost_to_follow_up: { label: "Did not return", tone: "flame" } };
export const HANDOFF: Record<string, { label: string; tone: string }> = { open: { label: "New", tone: "blue" }, accepted: { label: "In progress", tone: "amber" }, done: { label: "Done", tone: "green" }, declined: { label: "Declined", tone: "" } };
export const HANDOFF_KIND: Record<string, string> = { animal_followup: "Animal follow-up", sample_request: "Sample request", result_notice: "Laboratory result", service_gap: "Service check", vaccination_request: "Vaccination request" };
export const SAMPLE: Record<string, { label: string; tone: string }> = { collected: { label: "Collected", tone: "" }, dispatched: { label: "On its way", tone: "amber" }, received: { label: "Received", tone: "blue" }, testing: { label: "Testing", tone: "violet" }, resulted: { label: "Resulted", tone: "green" }, rejected: { label: "Rejected", tone: "flame" } };
export const RESULT: Record<string, { label: string; tone: string }> = { positive: { label: "Positive", tone: "flame" }, negative: { label: "Negative", tone: "green" }, inconclusive: { label: "Inconclusive", tone: "amber" } };
export const SAMPLE_TYPE: Record<string, string> = { brain_tissue: "Brain tissue", saliva: "Saliva", csf: "Cerebrospinal fluid", serum: "Serum", other: "Other" };
export const AUDIENCE: Record<string, string> = { veterinarians: "Veterinarians", para_veterinarians: "Para-veterinarians", animal_handlers: "Animal handlers", laboratory: "Laboratory staff", healthcare: "Healthcare workers", community: "Community", mixed: "Mixed" };
export const REMINDER: Record<string, string> = { called_reached: "Called, reached", called_no_answer: "Called, no answer", message_sent_manually: "Message sent from a phone", patient_will_attend: "Patient will attend", wrong_number: "Wrong number" };
export const AUDIT: Record<string, string> = { record_exposure: "Bite recorded", set_category: "Category recorded", prescribe: "Course prescribed", record_dose_given: "Dose given", record_dose_missed: "Dose missed", reminder: "Reminder logged", read: "Record opened", course_completed: "Course completed", course_discontinued: "Course stopped", course_lost_to_follow_up: "Marked did not return", course_active: "Course reopened" };

/* ── Dates ─────────────────────────────────────────────────────────── */
const IST = "Asia/Kolkata";
export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: IST });
export const fmtDate = (d: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) => d ? new Date(d.length === 10 ? `${d}T00:00:00+05:30` : d).toLocaleDateString("en-IN", { timeZone: IST, ...opts }) : "Not recorded";
export const fmtTime = (d: string) => new Date(d).toLocaleString("en-IN", { timeZone: IST, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export function daysFrom(d: string): number { const a = new Date(`${today()}T00:00:00Z`).getTime(), b = new Date(`${d.slice(0, 10)}T00:00:00Z`).getTime(); return Math.round((b - a) / 86_400_000); }
export function relDay(d: string): string { const n = daysFrom(d); return n === 0 ? "Today" : n === -1 ? "Yesterday" : n === 1 ? "Tomorrow" : n < 0 ? `${-n} days ago` : `In ${n} days`; }
export const showCount = (c: Count | undefined) => (c === null || c === undefined ? "Not read" : c === "<5" ? "Fewer than 5" : c.toLocaleString("en-IN"));
