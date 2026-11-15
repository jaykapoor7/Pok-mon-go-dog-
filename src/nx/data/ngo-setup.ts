"use client";

/* NGO setup in the new app: team, settings, connections, import and training.
   Every write is the same database function or API route the classic screens call, with the same arguments; the
   database decides who may do it and its refusal is passed through in its own words. Reads throw instead of
   answering a failure with an empty list, so a page can say "could not read" rather than "none". */

import { getSupabase } from "@/lib/supabase";
import { uploadPhoto } from "@/lib/actions";
import { operationRpc, operationsDb, verifyOperationReceipt, type OperationReceipt, type WorkflowPolicy } from "@/lib/operations";

/* ── Plumbing ───────────────────────────────────────────────────── */

export function db() {
  const s = getSupabase();
  if (!s) throw new Error("StrayPaw is not connected on this site. Nothing was changed.");
  return s;
}
export async function token(): Promise<string> {
  const t = (await db().auth.getSession()).data.session?.access_token;
  if (!t) throw new Error("Your session has ended. Sign in again; nothing was changed.");
  return t;
}
export async function userId(): Promise<string> {
  const id = (await db().auth.getSession()).data.session?.user.id;
  if (!id) throw new Error("Your session has ended. Sign in again; nothing was changed.");
  return id;
}
export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  return data as T;
}
/** A read in the shape useRead expects. */
export async function read<T>(fn: () => Promise<T>): Promise<{ data: T | null; error: string | null }> {
  try { return { data: await fn(), error: null }; } catch (e) { return { data: null, error: e instanceof Error ? e.message : "The read failed." }; }
}
/** One idempotency key per intent, so a retry of the same action never runs twice on the server. */
export function requestFor(map: Map<string, string>, intent: unknown) {
  const key = JSON.stringify(intent);
  let r = map.get(key);
  if (!r) { r = crypto.randomUUID(); map.set(key, r); }
  return r;
}
/** An operations RPC whose receipt is checked against the saved source row and the independent audit log. */
export async function verified<T extends OperationReceipt = OperationReceipt>(fn: string, args: Record<string, unknown>, table: string, expected: Record<string, unknown> = {}): Promise<T> {
  const uid = await userId();
  const r = await operationRpc<T>(fn, args);
  await verifyOperationReceipt(r, table, uid, expected, args.p_request as string | undefined);
  return r;
}
export async function api<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> {
  const t = await token();
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}`, ...(init.headers ?? {}) } });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j as { error?: string }).error ?? `The server refused it (${res.status}). Nothing was changed.`);
  return j as T;
}
export function saveBlob(blob: Blob, name: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
}
export const lead = (role: string | null | undefined) => role === "admin" || role === "lead";
export const leadOrCoord = (role: string | null | undefined) => role === "admin" || role === "lead" || role === "coordinator";

/* ── Team (my_org_members, set_member_role, remove_org_member, org_team_codes, revoke_team_code, /api/team/invite) ── */

export type Member = { user_id: string; role: string; name: string };
export type TeamCode = { id: string; kind: "staff" | "volunteer"; person_name: string | null; email: string | null; role: "lead" | "member" | "volunteer"; code: string | null; active: boolean; accepted: boolean; reports: number; created_at: string };
export type Volunteer = { id: string; name: string; contact: string; message: string | null; zone: string | null; dog_id: string | null; created_at: string };

export async function readMembers(): Promise<Member[]> {
  const rows = await rpc<{ user_id: string; role: string | null; name: string | null }[]>("my_org_members");
  return (rows ?? []).map((r) => ({ user_id: r.user_id, role: r.role ?? "member", name: r.name ?? "Member" }));
}
export const readTeamCodes = async () => (await rpc<TeamCode[]>("org_team_codes")) ?? [];
export const readVolunteers = async () => (await rpc<Volunteer[]>("org_volunteers")) ?? [];
/** The functions answer true when they changed something; anything else is a refusal. */
export async function setRole(userIdOf: string, role: string) {
  const ok = await rpc<boolean>("set_member_role", { p_user_id: userIdOf, p_role: role });
  if (ok !== true) throw new Error("The organisation did not accept this role change. Only a lead can change roles.");
}
export async function removeMember(userIdOf: string) {
  const ok = await rpc<boolean>("remove_org_member", { p_user_id: userIdOf });
  if (ok !== true) throw new Error("This person was not removed. Only a lead can remove members.");
}
export async function revokeCode(id: string) {
  const ok = await rpc<boolean>("revoke_team_code", { p_id: id });
  if (ok !== true) throw new Error("The code was not revoked. It may already be used or revoked.");
}
/** Emails the person a personal code and returns it, so the lead can pass it on if the email did not go. */
export const invite = (email: string, name: string, role: "lead" | "member" | "volunteer") =>
  api<{ code: string; kind: "staff" | "volunteer"; name: string; emailed: boolean }>("/api/team/invite", { method: "POST", body: JSON.stringify({ email: email.trim(), name: name.trim(), role }) });

/* ── Profile (ngo_update_profile), deadline, policies ───────────── */

export type OrgProfile = { id: string; name: string; slug: string | null; verified: boolean; mission: string | null; about: string | null; website: string | null; contact_email: string | null; contact_phone: string | null; city: string | null; state: string | null; registration_no: string | null; founded_year: number | null; areas_of_work: string[] | null; logo_url: string | null; cover_photo: string | null };
export async function readProfile(): Promise<OrgProfile> {
  const ngoId = await rpc<string | null>("my_ngo");
  if (!ngoId) throw new Error("Your organisation could not be found for this account.");
  const { data, error } = await db().from("ngos").select("id,name,slug,verified,mission,about,website,contact_email,contact_phone,city,state,registration_no,founded_year,areas_of_work,logo_url,cover_photo").eq("id", ngoId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Your organisation's profile is not readable with your access.");
  return data as OrgProfile;
}
export type ProfilePatch = { mission: string; about: string; website: string; contact_email: string; contact_phone: string; city: string; state: string; registration_no: string; founded_year: number | null; areas_of_work: string[]; logo_url?: string | null; cover_photo?: string | null };
export async function saveProfile(p: ProfilePatch) {
  const r = await rpc<{ ok?: boolean; error?: string } | null>("ngo_update_profile", {
    p_mission: p.mission, p_about: p.about, p_website: p.website, p_contact_email: p.contact_email, p_contact_phone: p.contact_phone, p_city: p.city, p_state: p.state,
    p_areas_of_work: p.areas_of_work, p_logo_url: p.logo_url ?? null, p_cover_photo: p.cover_photo ?? null, p_founded_year: p.founded_year, p_registration_no: p.registration_no,
  });
  if (r?.ok !== true) throw new Error(r?.error ?? "The profile was not saved. Only members of a verified organisation can edit it.");
}
/** Logo and cover go to the public photo bucket, as the classic profile editor did, and are saved with the profile. */
export const uploadImage = (file: File) => uploadPhoto(file);

export async function readDeadline(): Promise<{ due: string; lead: boolean }> {
  const s = db();
  const [ctx, settings] = await Promise.all([s.rpc("abc_my_context"), s.from("kaju_check_settings").select("report_due_on").limit(1).maybeSingle()]);
  if (ctx.error || settings.error) throw new Error("The reporting deadline could not be read.");
  return { due: (settings.data?.report_due_on as string | null) ?? "", lead: (ctx.data as { role?: string } | null)?.role === "admin" };
}
export const saveDeadline = (due: string) => rpc("kaju_set_report_deadline", { p_due: due || null });

export async function readPolicies(ngoId: string): Promise<WorkflowPolicy[]> {
  const r = await operationsDb().from("operations_policies").select("id,name,version,rules,source_reference").eq("ngo_id", ngoId).order("created_at", { ascending: false }).limit(100);
  if (r.error) throw new Error(r.error.message);
  return (r.data ?? []) as WorkflowPolicy[];
}
export const savePolicy = (request: string, args: { p_name: string; p_version: number; p_rules: { releaseRequiresVet: boolean; requiredFields: Record<string, string[]> }; p_reference: string }) =>
  verified("operations_save_policy", { p_request: request, ...args }, "operations_policies", { name: args.p_name, version: args.p_version });

/* ── Connections (/api/connections*) ─────────────────────────────── */

export type ConnStatus = "connected" | "available" | "expired" | "error" | "blocked" | "unavailable";
export type ConnView = { status: ConnStatus; account_email?: string | null; last_used_at?: string | null; last_error?: string | null; capabilities?: string[]; share_with_org?: boolean };
export type ConnProvider = { id: "google" | "microsoft" | "slack" | "zoho"; name: string; apps: string[]; line: string; capabilities: string[]; view?: ConnView; policy: { allowed: boolean; allow_org_sharing: boolean } };
export type ConnSvc = { name: string; line: string; status: string; policy?: { allowed: boolean } };
export type Connections = { me: { org: boolean; admin: boolean }; providers: ConnProvider[]; native: { name: string; line: string; read: string[]; create: string[] }; services: { maps: ConnSvc; sms: ConnSvc }; planned: { name: string; line: string }[] };
export const readConnections = () => api<Connections>("/api/connections");
/** Asks the server for the provider's sign-in address; the person comes back to `back`. */
export async function connectStart(provider: string, back: string, caps: string[] = []) {
  const j = await api<{ url: string }>(`/api/connections/${provider}/start?back=${encodeURIComponent(back)}${caps.length ? `&caps=${caps.join(",")}` : ""}`, { method: "POST" });
  window.location.assign(j.url);
}
export const disconnect = (provider: string) => api(`/api/connections/${provider}`, { method: "DELETE" });
export const shareConnection = (provider: string, share: boolean) => api(`/api/connections/${provider}`, { method: "PATCH", body: JSON.stringify({ share }) });
export const setConnectionPolicy = (provider: string, allowed: boolean, allowOrgSharing: boolean) => api("/api/connections/policy", { method: "POST", body: JSON.stringify({ provider, allowed, allow_org_sharing: allowOrgSharing }) });
/** The OAuth callback appends `?connection=…` to a `back` that already has a query; read both forms. */
export function connectionReturn(search: string): { state: string | null; provider: string | null } {
  const p = new URLSearchParams(search.replace(/^\?/, "").replace(/\?/g, "&"));
  return { state: p.get("connection"), provider: p.get("provider") };
}

/* ── Import (/api/partner/import start, rows, finish; bucket imports) ── */

export type ImportBatch = { id: string; source_filename: string; status: string; rows_imported: number | null; created_at: string };
export async function importCall<T = Record<string, unknown>>(body: unknown, method: "POST" | "GET" = "POST"): Promise<T> {
  const t = await token();
  const res = await fetch("/api/partner/import", { method, headers: { "content-type": "application/json", authorization: `Bearer ${t}` }, body: method === "POST" ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({ error: "The server's answer could not be read." }));
  if (!res.ok) throw Object.assign(new Error((json as { error?: string }).error ?? "The import could not continue."), { status: res.status });
  return json as T;
}
export const readBatches = async () => ((await importCall<{ batches?: ImportBatch[] }>(null, "GET")).batches ?? []);
/** Keeps the original file privately with its import, through the signed address the server gave. */
export async function keepOriginal(upload: { path: string; token: string }, file: File) {
  const r = await db().storage.from("imports").uploadToSignedUrl(upload.path, upload.token, file);
  if (r.error) throw new Error(r.error.message);
}

/* ── Training (training_* tables and functions) ───────────────────── */

export type Course = { id: string; ngo_id: string | null; title: string; summary: string | null; audience: string | null; status: "draft" | "published" | "archived"; updated_at: string };
export type Question = { q: string; options: string[] };
export type Lesson = { id: string; course_id: string; position: number; title: string; kind: "reading" | "video" | "document" | "quiz"; body: string | null; media_url: string | null; questions: Question[] | null; pass_mark: number | null };
export type Assignment = { id: string; course_id: string; due_on: string | null; created_at: string };
export type Progress = { lesson_id: string; course_id: string; score: number | null; passed: boolean; completed_at: string };
export type TeamRow = { assignment_id: string; user_id: string; name: string; role: string; due_on: string | null; lessons_done: number; lessons_total: number; quizzes_passed: number; quizzes_total: number; last_activity: string | null };

const LESSON_COLS = "id,course_id,position,title,kind,body,media_url,questions,pass_mark";
export async function readLearner(uid: string) {
  const s = db();
  const [courses, lessons, assignments, progress] = await Promise.all([
    s.from("training_courses").select("id,ngo_id,title,summary,audience,status,updated_at").eq("status", "published").order("title"),
    s.from("training_lessons").select(LESSON_COLS).order("position"),
    s.from("training_assignments").select("id,course_id,due_on,created_at").eq("user_id", uid),
    s.from("training_progress").select("lesson_id,course_id,score,passed,completed_at").eq("user_id", uid),
  ]);
  const err = courses.error || lessons.error || assignments.error || progress.error;
  if (err) throw new Error("Training could not be read. If this organisation is new, training may not be set up yet.");
  return { courses: (courses.data ?? []) as Course[], lessons: (lessons.data ?? []) as Lesson[], assignments: (assignments.data ?? []) as Assignment[], progress: (progress.data ?? []) as Progress[] };
}
export async function readCourses(ngoId: string): Promise<Course[]> {
  const r = await db().from("training_courses").select("id,ngo_id,title,summary,audience,status,updated_at").or(`ngo_id.eq.${ngoId},ngo_id.is.null`).order("updated_at", { ascending: false });
  if (r.error) throw new Error("Courses could not be read.");
  return (r.data ?? []) as Course[];
}
export async function readLessons(courseId: string): Promise<Lesson[]> {
  const r = await db().from("training_lessons").select(LESSON_COLS).eq("course_id", courseId).order("position");
  if (r.error) throw new Error(r.error.message);
  return (r.data ?? []) as Lesson[];
}
export const completeLesson = (lesson: string, answers: number[] | null) =>
  rpc<{ score: number | null; passed: boolean; correct: number | null; total: number | null; pass_mark: number | null }>("training_complete_lesson", { p_lesson: lesson, p_answers: answers });
export const saveCourse = (a: { id: string | null; title: string; summary: string; audience: string; status: Course["status"] }) =>
  rpc<string>("training_save_course", { p_id: a.id, p_title: a.title, p_summary: a.summary, p_audience: a.audience, p_status: a.status });
export const saveLesson = (a: { id: string | null; course: string; position: number; title: string; kind: Lesson["kind"]; body: string; media_url: string; questions: Question[] | null; answers: number[] | null; pass_mark: number }) =>
  rpc<string>("training_save_lesson", { p_id: a.id, p_course: a.course, p_position: a.position, p_title: a.title, p_kind: a.kind, p_body: a.body, p_media_url: a.media_url, p_questions: a.questions, p_answers: a.answers, p_pass_mark: a.pass_mark });
export const deleteLesson = (id: string) => rpc("training_delete_lesson", { p_id: id });
export const assignCourse = (course: string, users: string[], due: string | null) => rpc("training_assign", { p_course: course, p_users: users, p_due: due });
export const unassignCourse = (assignment: string) => rpc("training_unassign", { p_assignment: assignment });
export const readTeamProgress = async (course: string) => (await rpc<TeamRow[]>("training_team_progress", { p_course: course })) ?? [];
