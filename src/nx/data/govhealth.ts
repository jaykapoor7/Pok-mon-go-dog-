"use client";

/* Data for Government verification, programmes, human healthcare and the laboratory in the new app.
   Every read and write goes to the database function the classic screens used, with the same arguments; the
   database checks the caller's organisation, role and programme and refuses what they may not do. Nothing here
   decides access: it only says which controls to show. */

import { call, useRead, type Kind, type Place } from "@/oh/data";
import { getSupabase } from "@/lib/supabase";
import { operationRpc, verifyOperationReceipt, type OperationReceipt } from "@/lib/operations";
import { uploadPackageDocument } from "@/lib/reconciliation";

/* ── Places: where this person works in One Health, and what their role there allows ── */

/** The person's One Health places (oh_my_today). Shared key with the other Healthcare pages, so it is read once. */
export function usePlaces(ready: boolean) {
  const r = useRead<Place[]>(() => call<Place[]>("oh_my_today"), "nx-places", ready);
  return { places: Array.isArray(r.data) ? r.data : [], loading: ready && r.loading && !r.data, error: r.error, reload: r.reload };
}
export const placeOf = (places: Place[], orgId: string | null | undefined) => places.find((p) => p.organisation_id === orgId) ?? null;
/** Every capability the person holds in any place taking part in a programme. The server checks the exact place. */
export const capsIn = (places: Place[], programmeId: string | null | undefined) => new Set(places.filter((p) => p.programmes.some((x) => x.id === programmeId)).flatMap((p) => p.capabilities));
export const can = (p: Place | null, cap: string) => !!p?.capabilities.includes(cap);
export const isFacilityKind = (k?: Kind | string | null) => k === "hospital" || k === "clinic";

/* ── One request id per intent, so a retried action is the same request and never recorded twice ── */
const REQUESTS = new Map<string, string>();
export function requestFor(intent: unknown): string {
  const key = JSON.stringify(intent);
  let id = REQUESTS.get(key);
  if (!id) { id = crypto.randomUUID(); REQUESTS.set(key, id); }
  return id;
}

type Receipt = OperationReceipt & { status?: string };
/** An operations_* write, then an independent check that the saved row and its audit entry say the same thing. */
async function operation(fn: string, args: Record<string, unknown>, request: string, table: string, expected: Record<string, unknown>, actorId: string) {
  const r = await operationRpc<Receipt>(fn, { p_request: request, ...args });
  await verifyOperationReceipt(r, table, actorId, expected, request);
  return r;
}

/* ── Package review (reviewing office) ─────────────────────────────── */
export type ItemDecision = "accepted" | "query" | "returned" | "rejected";
export const DECISION_LABEL: Record<string, string> = { pending: "Waiting", accepted: "Accepted", query: "Queried", returned: "Returned", rejected: "Rejected", answer: "Operator answered" };

export function decideItem(actorId: string, pkg: string, item: { key: string; case_id: string; claim_id: string | null; claimed_units: number }, decision: ItemDecision, note: string, units: number | null) {
  const request = requestFor(["decide", pkg, item.key, decision, note, units]);
  return operation("operations_decide_item", { p_package: pkg, p_case: item.case_id, p_claim: item.claim_id, p_decision: decision, p_note: note, p_units: decision === "accepted" ? units ?? item.claimed_units : null }, request, "operations_item_decisions", { case_id: item.case_id, decision }, actorId);
}
export function finalizePackage(actorId: string, pkg: string, note: string) {
  const request = requestFor(["finalize", pkg, note]);
  return operation("operations_finalize_package", { p_package: pkg, p_note: note }, request, "report_packages", {}, actorId);
}
export async function recordPayment(actorId: string, pkg: string, v: { amount: string; paidOn: string; reference: string; note: string }, file: File) {
  const request = requestFor(["payment", pkg, v, file.name, file.size]);
  const path = await uploadPackageDocument(pkg, request, file);
  return operation("operations_record_payment_reference", { p_package: pkg, p_amount: v.amount, p_paid_on: v.paidOn, p_reference: v.reference, p_document: path, p_note: v.note }, request, "operations_payment_evidence", { package_id: pkg }, actorId);
}

/* ── Contracts ─────────────────────────────────────────────────────── */
export type RateDraft = { code: "sterilisation" | "vaccination" | "treatment" | "other"; label: string; unit_rate: string; required_evidence: string[]; required_events: string[]; vet_required: boolean };
export type ContractDraft = { name: string; version: number; reference: string; office_id: string; ngo_id: string; starts_on: string; ends_on: string; illustrative: boolean; rates: RateDraft[] };
export function createContract(actorId: string, payload: ContractDraft) {
  const request = requestFor(["contract", payload]);
  return operation("operations_create_contract", { p_payload: payload }, request, "operations_contracts", { name: payload.name, version: payload.version }, actorId);
}

/* ── Package export (PDF or spreadsheet), the same API the classic review used ── */
export async function downloadPackage(id: string, format: "pdf" | "xlsx") {
  const session = await getSupabase()?.auth.getSession();
  const token = session?.data.session?.access_token;
  if (!token) throw new Error("Sign in again to download this package.");
  const res = await fetch("/api/files/package", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id, format }) });
  if (!res.ok) { let m = "Could not prepare the download."; try { m = ((await res.json()) as { error?: string }).error ?? m; } catch {} throw new Error(m); }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a"); a.href = url; a.download = `straypaw-package-${id}.${format}`;
  document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── Bites: recording a presentation, with the referral it came from ── */
export type ExposureInput = {
  p_facility: string; p_exposure_on: string; p_kind: string; p_area: string | null; p_age_band: string; p_sex: string; p_patient_ref: string | null;
  p_species: string; p_ownership: string; p_animal_description: string | null; p_animal_place: string | null; p_category: string; p_source: string;
  p_notice: string | null; p_contact_phone: string | null; p_reminder_consent: boolean; p_request_followup: boolean; p_wound_washed: string;
};
/** Records a bite. When it came from a referral, the referral is sent with it (p_transfer) so the two records stay linked.
    A database that does not take the referral yet answers before anything is written; the bite is then recorded
    without the link and the person is told so. */
export async function recordExposure(input: ExposureInput, transfer: string | null): Promise<{ data: { id: string; code: string; handoff_id: string | null } | null; error: unknown; linked: boolean }> {
  const db = getSupabase();
  if (!db) return { data: null, error: "StrayPaw is not configured on this site.", linked: false };
  if (transfer) {
    const r = await db.rpc("oh_record_exposure", { ...input, p_transfer: transfer });
    if (!r.error) return { data: r.data as { id: string; code: string; handoff_id: string | null }, error: null, linked: true };
    const notThere = r.error.code === "PGRST202" || /Could not find the function|schema cache/i.test(r.error.message);
    if (!notThere) return { data: null, error: r.error, linked: false };
  }
  const r = await db.rpc("oh_record_exposure", input);
  return { data: (r.data as { id: string; code: string; handoff_id: string | null } | null) ?? null, error: r.error, linked: false };
}

/* ── Removing and restoring a record (evidence), audited, restorable for 30 days ── */
export async function removeRecord(kind: "evidence", id: string, reason: string | null) {
  const db = getSupabase(); if (!db) throw new Error("StrayPaw is not configured on this site.");
  const { data, error } = await db.rpc("remove_record", { p_kind: kind, p_id: id, p_reason: reason });
  if (error) throw error;
  return String(data);
}
export async function restoreRecord(removedId: string) {
  const db = getSupabase(); if (!db) throw new Error("StrayPaw is not configured on this site.");
  const { error } = await db.rpc("restore_record", { p_removed: removedId });
  if (error) throw error;
}

/* ── Partner logos (bucket oh-logos), set by a lead of the partner or the programme ── */
export async function uploadLogo(org: string, file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Use a PNG, JPEG or WebP image.");
  if (file.size > 512 * 1024) throw new Error("Keep the logo under 512 KB.");
  const db = getSupabase(); if (!db) throw new Error("StrayPaw is not configured on this site.");
  const path = `${org}/logo-${Date.now()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
  const up = await db.storage.from("oh-logos").upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw new Error(/row-level security|not authori[sz]ed|403/i.test(up.error.message) ? "Only a lead of this partner or of the programme can set its logo." : up.error.message);
  return db.storage.from("oh-logos").getPublicUrl(path).data.publicUrl;
}

/* ── Small helpers ─────────────────────────────────────────────────── */
export const indiaToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export const ago = (iso: string) => { const d = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 864e5)); return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`; };
