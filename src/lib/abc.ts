/* ════════════════════════════════════════════════════════════════════
   ABC verification: the client side of the database workflow in
   supabase/staging-sync/2026-10-31-abc-verification.sql.

   Every call runs under the signed-in person's own session. The database
   decides who may do what (organisation, role, reviewing office); these
   helpers only shape the data and pass its refusals through in plain
   words. Nothing here approves, signs or accepts on anyone's behalf.
   ════════════════════════════════════════════════════════════════════ */

import { getSupabase } from "./supabase";
import { compressForUpload } from "./photo/compress";
import { isRecordingDemo } from "./recording-demo";
import { demoRpc, demoTables } from "./demo/abc-demo";

export const EVIDENCE_KINDS = ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];
export const EVIDENCE_LABEL: Record<EvidenceKind, string> = {
  capture_photo: "Capture photo",
  surgery_record: "Surgery record",
  ear_notch_photo: "Ear-notch photo",
  release_photo: "Release photo",
  release_location: "Release location",
};

export type AbcRole = "admin" | "coordinator" | "veterinarian" | "member" | null;
export type AbcContext = { ngo_id: string | null; role: AbcRole; name: string | null; offices: { id: string; name: string; city: string | null }[] };

export type QueueRow = {
  case_id: string; case_code: string | null; title: string | null; city: string | null; created_at: string; provenance: string | null;
  evidence_count: number; missing: EvidenceKind[]; vet_authorised: boolean; evidence_reviewed: boolean; government_accepted: boolean;
  vet_name: string | null; reviewer_name: string | null; returned_note: string | null; returned_by: string | null; in_package: string | null;
};
export type Stage = "evidence" | "vet" | "review" | "returned" | "ready" | "packaged" | "accepted";
export const STAGE_LABEL: Record<Stage, string> = {
  evidence: "Needs evidence", vet: "Waiting for vet", review: "Ready for review", returned: "Returned",
  ready: "Approved", packaged: "In a package", accepted: "Accepted",
};

/** Where a case stands, from the database's own flags (never guessed). */
export function stageOf(r: QueueRow): Stage {
  if (r.government_accepted) return "accepted";
  if (r.in_package && r.in_package !== "draft") return "packaged";
  if (r.evidence_reviewed) return r.in_package ? "packaged" : "ready";
  if (r.returned_note) return "returned";
  if (!r.vet_authorised) return r.missing.includes("surgery_record") ? "evidence" : "vet";
  return r.missing.length ? "evidence" : "review";
}

export type Checklist = { items: Record<EvidenceKind, boolean>; missing: EvidenceKind[]; vet_authorised: boolean; evidence_reviewed: boolean; government_accepted: boolean };
export type Attestation = { id: string; kind: "vet_authorised" | "evidence_reviewed" | "evidence_returned"; actor_id: string; actor_name: string; actor_role: string; note: string | null; created_at: string; revoked_at: string | null };
export type HistoryRow = { at: string; kind: string; actor: string; detail: string };
export type Evidence = { id: string; kind: string; url: string | null; title: string | null; location_text: string | null; captured_at: string | null; created_at: string };

export type Package = {
  id: string; ngo_id: string; office_id: string; title: string; period_start: string; period_end: string; case_ids: string[];
  summary: { records?: number; vet_authorised?: number; evidence_items?: number; generated_at?: string };
  status: "draft" | "submitted" | "queried" | "accepted" | "returned"; created_at: string; submitted_at: string | null; decided_by_name: string | null; decided_at: string | null;
};
export type PackageEvent = { id: string; actor_name: string; side: "operator" | "reviewer"; kind: string; body: string | null; created_at: string };
export type PackageCase = { case_id: string; case_code: string | null; title: string | null; city: string | null; created_at: string; evidence: { kind: string; url: string | null; location: string | null; at: string | null }[]; vet_name: string | null; reviewer_name: string | null };
export type Office = { id: string; name: string; city: string | null };

/** The workflow is not installed in this database yet (function missing). */
export class NotEnabled extends Error { constructor() { super("Verification is not switched on for this workspace yet."); } }

function clean(e: { message?: string; code?: string } | null): Error {
  if (!e) return new Error("Something went wrong");
  if (e.code === "PGRST202" || e.code === "42883" || e.code === "42P01" || /Could not find the function|does not exist/i.test(e.message ?? "")) return new NotEnabled();
  return new Error((e.message ?? "Something went wrong").replace(/^.*?ERROR:\s*/, ""));
}
function db() {
  const supa = getSupabase();
  if (!supa) throw new NotEnabled();
  return supa;
}
async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  if (isRecordingDemo) return demoRpc<T>(fn, args);
  const { data, error } = await db().rpc(fn, args);
  if (error) throw clean(error);
  return data as T;
}

export const myContext = () => rpc<AbcContext>("abc_my_context");
export const verificationQueue = (limit = 300) => rpc<QueueRow[]>("abc_verification_queue", { p_limit: limit });
export const caseChecklist = (caseId: string) => rpc<Checklist>("abc_case_checklist", { p_case_id: caseId });
export const caseHistory = (caseId: string) => rpc<HistoryRow[]>("abc_case_history", { p_case_id: caseId });

export async function caseAttestations(caseId: string): Promise<Attestation[]> {
  if (isRecordingDemo) return demoTables.attestations(caseId);
  const { data, error } = await db().from("abc_attestations").select("id,kind,actor_id,actor_name,actor_role,note,created_at,revoked_at").eq("case_id", caseId).order("created_at");
  if (error) throw clean(error);
  return (data ?? []) as Attestation[];
}
export async function caseEvidence(caseId: string): Promise<Evidence[]> {
  if (isRecordingDemo) return demoTables.evidence(caseId);
  const { data, error } = await db().from("evidence_items").select("id,kind,url,title,location_text,captured_at,created_at").eq("case_id", caseId).order("created_at");
  if (error) throw clean(error);
  return (data ?? []) as Evidence[];
}
export async function caseHead(caseId: string) {
  if (isRecordingDemo) return demoTables.head(caseId);
  const { data, error } = await db().from("cases").select("id,case_code,title,city,zone,created_at,provenance,status").eq("id", caseId).maybeSingle();
  if (error) throw clean(error);
  return data as { id: string; case_code: string | null; title: string | null; city: string | null; zone: string | null; created_at: string; provenance: string | null; status: string } | null;
}

export const addEvidence = (caseId: string, kind: EvidenceKind, v: { url?: string; location?: string; title?: string }) =>
  rpc<string>("abc_add_evidence", { p_case_id: caseId, p_kind: kind, p_url: v.url ?? null, p_location: v.location ?? null, p_title: v.title ?? null });
/* ── evidence files ─────────────────────────────────────────────────────
   Photos and scanned records go to the private abc-evidence bucket under
   <organisation>/<case>/<file>. The database only lets a member of that
   organisation write there, never overwrites or deletes, and never serves a
   public link: people read a file through a signed link that expires. The
   evidence row stores storage://abc-evidence/<path>. */
export const EVIDENCE_BUCKET = "abc-evidence";
const STORE = "storage://abc-evidence/";
export const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024;

export async function uploadEvidenceFile(ngoId: string, caseId: string, kind: EvidenceKind, file: File): Promise<string> {
  if (!/^(image\/|application\/pdf$)/.test(file.type)) throw new Error("Choose a photo or a PDF");
  const body = await compressForUpload(file);
  if (body.size > MAX_EVIDENCE_BYTES) throw new Error("That file is over 15 MB");
  const ext = (body.type === "application/pdf" ? "pdf" : body.type.split("/")[1] || "jpg").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "");
  const path = `${ngoId}/${caseId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await db().storage.from(EVIDENCE_BUCKET).upload(path, body, { contentType: body.type, upsert: false });
  if (error) throw new Error(/row-level security|not authori[sz]ed|403/i.test(error.message) ? "You can only add files to your own organisation's cases" : error.message);
  return STORE + path;
}

export const isStoredEvidence = (url: string | null | undefined) => !!url && url.startsWith(STORE);

/** A link a person can open: stored files get a signed link valid for five minutes. */
export async function evidenceLink(url: string): Promise<string> {
  if (isRecordingDemo) return url;
  if (!isStoredEvidence(url)) return url;
  const { data, error } = await db().storage.from(EVIDENCE_BUCKET).createSignedUrl(url.slice(STORE.length), 300);
  if (error || !data?.signedUrl) throw new Error("You cannot open this file");
  return data.signedUrl;
}

export const vetAuthorise = (caseId: string, note?: string) => rpc<string>("abc_vet_authorise", { p_case_id: caseId, p_note: note ?? null });
export const reviewEvidence = (caseId: string, note?: string) => rpc<string>("abc_review_evidence", { p_case_id: caseId, p_note: note ?? null });
export const returnEvidence = (caseId: string, reason: string) => rpc<string>("abc_return_evidence", { p_case_id: caseId, p_reason: reason });
export const withdrawSignOff = (attestationId: string, reason: string) => rpc<void>("abc_revoke_attestation", { p_attestation: attestationId, p_reason: reason });

export async function offices(): Promise<Office[]> {
  if (isRecordingDemo) return demoTables.offices();
  const { data, error } = await db().from("review_offices").select("id,name,city").order("name");
  if (error) throw clean(error);
  return (data ?? []) as Office[];
}
export async function packages(): Promise<Package[]> {
  if (isRecordingDemo) return demoTables.packages();
  const { data, error } = await db().from("report_packages").select("id,ngo_id,office_id,title,period_start,period_end,case_ids,summary,status,created_at,submitted_at,decided_by_name,decided_at").order("created_at", { ascending: false }).limit(200);
  if (error) throw clean(error);
  return (data ?? []) as Package[];
}
export async function packageById(id: string): Promise<Package | null> {
  if (isRecordingDemo) return demoTables.packageById(id);
  const { data, error } = await db().from("report_packages").select("id,ngo_id,office_id,title,period_start,period_end,case_ids,summary,status,created_at,submitted_at,decided_by_name,decided_at").eq("id", id).maybeSingle();
  if (error) throw clean(error);
  return (data ?? null) as Package | null;
}
export async function packageEvents(id: string): Promise<PackageEvent[]> {
  if (isRecordingDemo) return demoTables.packageEvents(id);
  const { data, error } = await db().from("package_events").select("id,actor_name,side,kind,body,created_at").eq("package_id", id).order("created_at");
  if (error) throw clean(error);
  return (data ?? []) as PackageEvent[];
}
export const packageCases = (id: string) => rpc<PackageCase[]>("abc_package_cases", { p_package: id });
export const createPackage = (title: string, start: string, end: string, office: string) => rpc<string>("abc_create_package", { p_title: title, p_start: start, p_end: end, p_office: office });
export const packageAct = (id: string, kind: "submitted" | "answer" | "query" | "accepted" | "returned", body?: string) =>
  rpc<string>("abc_package_act", { p_package: id, p_kind: kind, p_body: body ?? null });

export async function orgNames(ids: string[]): Promise<Record<string, string>> {
  if (isRecordingDemo) return demoTables.orgNames(ids);
  if (!ids.length) return {};
  const { data } = await db().from("ngos").select("id,name").in("id", ids);
  return Object.fromEntries(((data ?? []) as { id: string; name: string }[]).map((n) => [n.id, n.name]));
}

export const PACKAGE_LABEL: Record<Package["status"], string> = { draft: "Draft", submitted: "Submitted", queried: "Query open", accepted: "Accepted", returned: "Returned" };
export const HISTORY_LABEL = (k: string) => ({
  evidence: "Evidence added", vet_authorised: "Procedure authorised", evidence_reviewed: "Evidence approved", evidence_returned: "Evidence returned",
  "withdrawn:vet_authorised": "Vet authorisation withdrawn", "withdrawn:evidence_reviewed": "Approval withdrawn",
  "package:created": "Added to a package", "package:submitted": "Package submitted", "package:query": "Reviewer query", "package:answer": "Operator answer",
  "package:accepted": "Accepted by the reviewing office", "package:returned": "Returned by the reviewing office",
} as Record<string, string>)[k] ?? k;
