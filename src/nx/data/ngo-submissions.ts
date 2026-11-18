"use client";

/* Submissions & Reports: packages for a reviewing office, evidence readiness, contracts, documents, exports,
   stories and record quality. The calls and arguments are the classic screens' own (src/sp/abc/*, src/sp/ngo/*);
   the database computes every figure and decides every action. Nothing here prices, approves or accepts. */

import { createPackage, EVIDENCE_LABEL, stageOf, type EvidenceKind, type QueueRow, type Stage } from "@/lib/abc";
import { readBillingPreview, type BillingPreview } from "@/lib/billing";
import { operationRpc, operationsDb, type OperationReceipt } from "@/lib/operations";
import { readContracts, readReconciliation, type DecisionSource } from "@/lib/reconciliation";
import { addDocument, linkDocument, updateDocument, type DocumentKind, type SourceDocument } from "@/lib/documents";
import { uploadPhoto } from "@/lib/actions";
import { getPartnerCasesPage } from "@/lib/cases";
import { getMyAnimals } from "@/lib/animal-actions";
import { getPartnerRecordRows, type PartnerRecordRow } from "@/lib/partner-record-explorer";
import type { Case } from "@/lib/types";
import { db, rpc, saveBlob, token, verified } from "./ngo-setup";
import { animalLine } from "../animalLabel";

export { readBillingPreview };

/* ── The month in hand ─────────────────────────────────────────── */

const iso = (d: Date) => d.toISOString().slice(0, 10);
export function monthBounds(now: Date, previous = false) {
  const y = now.getUTCFullYear(), m = now.getUTCMonth() - (previous ? 1 : 0);
  const start = new Date(Date.UTC(y, m, 1)), end = new Date(Date.UTC(y, m + 1, 0));
  return { start: iso(start), end: iso(end), label: start.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }) };
}
const EVIDENCE_TAB = "/ngo/submissions?tab=evidence";
/** What still blocks records of a month from a claim. Guidance from the verification queue only; what can be
    claimed and for how much comes from the database's billing preview. */
export function blockers(rows: QueueRow[], start: string, end: string, readLimit = 500) {
  const oldest = rows.length ? rows[rows.length - 1].created_at.slice(0, 10) : null;
  const partial = rows.length >= readLimit && !!oldest && oldest >= start;
  const inMonth = rows.filter((r) => r.provenance !== "imported_historical_record" && r.created_at.slice(0, 10) >= start && r.created_at.slice(0, 10) <= end);
  const counts: Record<Stage, number> = { evidence: 0, vet: 0, review: 0, returned: 0, ready: 0, packaged: 0, accepted: 0 };
  const missing = new Map<EvidenceKind, number>();
  for (const r of inMonth) { const s = stageOf(r); counts[s]++; if (s === "evidence") for (const k of r.missing) missing.set(k, (missing.get(k) ?? 0) + 1); }
  const list = [
    ...[...missing].sort((a, c) => c[1] - a[1]).map(([k, n]) => ({ reason: `Missing ${EVIDENCE_LABEL[k].toLowerCase()}`, count: n, href: `${EVIDENCE_TAB}&stage=evidence` })),
    ...(counts.vet ? [{ reason: "Waiting for veterinary authorisation", count: counts.vet, href: `${EVIDENCE_TAB}&stage=vet` }] : []),
    ...(counts.review ? [{ reason: "Waiting for coordinator evidence review", count: counts.review, href: `${EVIDENCE_TAB}&stage=review` }] : []),
    ...(counts.returned ? [{ reason: "Returned for correction", count: counts.returned, href: `${EVIDENCE_TAB}&stage=returned` }] : []),
  ];
  return { list, partial, counts };
}
/** The office named by the one contract in force today, or null when there is none or more than one. */
export async function contractOffice(): Promise<string | null> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { contracts } = await readContracts();
    const ids = [...new Set(contracts.filter((c) => c.starts_on <= today && c.ends_on >= today).map((c) => c.office_id))];
    return ids.length === 1 ? ids[0] : null;
  } catch { return null; }
}

/** Prepares the monthly package exactly as classic does: create the draft, configure its claims from the same
    preview, check the receipt against source and audit, then read the reconciliation back and compare totals. */
export async function prepareMonthly(label: string, start: string, end: string, office: string, pv: BillingPreview): Promise<{ id: string; same: boolean; claimed: string | null }> {
  if (!pv.contract) throw new Error("No contract covers this period, so nothing can be claimed.");
  const id = await createPackage(`ABC claims · ${label}`, start, end, office);
  const request = crypto.randomUUID();
  await verified("operations_configure_package", { p_request: request, p_package: id, p_contract: pv.contract.id, p_claims: pv.claims.map((c) => ({ case_id: c.case_id, rate_id: c.rate_id, units: 1 })) }, "operations_package_configurations");
  const rec = await readReconciliation(id);
  const ids = new Set(rec.items.map((i) => i.case_id));
  const same = rec.claimed_amount !== null && Number(rec.claimed_amount) === Number(pv.total) && ids.size === pv.count && pv.claims.every((c) => ids.has(c.case_id));
  return { id, same, claimed: rec.claimed_amount };
}

/* ── One package ─────────────────────────────────────────────── */

export async function downloadPackage(id: string, format: "pdf" | "xlsx") {
  const t = await token();
  const res = await fetch("/api/files/package", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ id, format }) });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Could not export this package.");
  saveBlob(await res.blob(), `straypaw-package-${id}.${format}`);
}
export const configureClaims = (request: string, pkg: string, contract: string | null, claims: { case_id: string; rate_id: string; units: number }[]) =>
  verified("operations_configure_package", { p_request: request, p_package: pkg, p_contract: contract, p_claims: claims }, "operations_package_configurations", { package_id: pkg });
export const answerItem = (request: string, pkg: string, caseId: string, claimId: string | null, note: string) =>
  verified("operations_answer_item", { p_request: request, p_package: pkg, p_case: caseId, p_claim: claimId, p_note: note }, "operations_item_decisions", { case_id: caseId, decision: "answer" });
export type ItemDecision = { id: string; snapshot_id: string | null; decision: string; note: string; actor_name: string; created_at: string };
export async function itemDecisions(pkg: string, caseId: string, claimId: string | null, before?: ItemDecision | null): Promise<ItemDecision[]> {
  let q = operationsDb().from("operations_item_decisions").select("id,snapshot_id,decision,note,actor_name,created_at").eq("package_id", pkg).eq("case_id", caseId);
  q = claimId ? q.eq("claim_id", claimId) : q.is("claim_id", null);
  if (before) q = q.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`);
  const r = await q.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(20);
  if (r.error) throw new Error("Decision history could not be read.");
  return (r.data ?? []) as ItemDecision[];
}
export const decisionSource = (decision: string) => operationRpc<DecisionSource>("operations_decision_source", { p_decision: decision });

/* ── Contracts (operations_create_contract) ───────────────────── */

export type RateDraft = { code: string; label: string; unit_rate: string; required_evidence: string[]; required_events: string[]; vet_required: boolean };
export type ContractDraft = { name: string; version: number; reference: string; office_id: string; ngo_id: string; starts_on: string; ends_on: string; illustrative: boolean; rates: RateDraft[] };
export const createContract = (request: string, payload: ContractDraft) =>
  verified<OperationReceipt>("operations_create_contract", { p_request: request, p_payload: payload }, "operations_contracts", { name: payload.name, version: payload.version });

/* ── Documents (add_document, link_document, update_document; bucket sightings) ── */

export async function readDocuments(): Promise<SourceDocument[]> {
  const { data, error } = await db().from("documents").select("*").order("created_at", { ascending: false }).limit(300);
  if (error) throw new Error(error.message);
  return (data ?? []) as SourceDocument[];
}
export type AnimalLite = { id: string; straypaw_id: string | null; name: string | null; code: string | null; zone: string | null };
export async function readAnimalsLite(ngoId: string, limit = 200): Promise<AnimalLite[]> {
  const { data, error } = await db().from("dogs").select("id,straypaw_id,name,code,zone").eq("ngo_id", ngoId).order("last_seen", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as AnimalLite[];
}
export async function readCasesLite(limit = 100): Promise<Case[]> { return (await getPartnerCasesPage({ limit })).items; }
/** Files one scan: images only, uploaded to the photo bucket, then recorded with add_document. */
export async function fileScan(file: File, kind: DocumentKind, processing?: () => void): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image. Only photographs and scans can be filed.`);
  const url = await uploadPhoto(file);
  processing?.(); // uploaded; the server now records it
  const id = await addDocument({ url, kind, title: file.name });
  if (!id) throw new Error(`${file.name} was uploaded but not filed. Try again.`);
  return id;
}
export async function attachDocument(id: string, opts: { dogId?: string; caseId?: string; clear?: boolean }) {
  if (!(await linkDocument(id, opts))) throw new Error("The file was not changed. It may belong to another organisation.");
}
export async function editDocument(id: string, v: { title: string; notes: string; kind: DocumentKind; recordedOn: string | null }) {
  if (!(await updateDocument(id, v))) throw new Error("The context was not saved. It may belong to another organisation.");
}

/* ── Exports (/api/partner/*) ─────────────────────────────────── */

export async function buildExport(endpoint: string, qs: URLSearchParams): Promise<Blob> {
  const t = await token();
  const res = await fetch(`${endpoint}?${qs}`, { headers: { Authorization: `Bearer ${t}` } });
  if (!res.ok) throw new Error(res.status === 401 ? "Organisation access required." : "This document could not be built.");
  return res.blob();
}
export const readZonesList = async () => (await rpc<{ zone: string; n: number }[]>("org_zones")) ?? [];

/* ── Stories (POST /api/partner/stories) ──────────────────────── */

export type OwnStory = { id: string; case_id: string | null; title: string; location_label: string | null; published_at: string | null };
export async function readOwnStories(ngoId: string): Promise<OwnStory[]> {
  const { data, error } = await db().from("case_stories").select("id,case_id,title,location_label,published_at").eq("ngo_id", ngoId).order("published_at", { ascending: false, nullsFirst: false }).limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as OwnStory[];
}
export type Cursor = { at: string; id: string } | null;
export async function readResolvedCases(cursor: Cursor) {
  const p = await getPartnerCasesPage({ limit: 100, cursor });
  return { read: p.items.length, rows: p.items.filter((c) => c.status === "resolved" || c.status === "closed"), next: p.nextCursor };
}
export type StoryStage = { label: string; date: string };
export async function publishStory(v: { caseId: string; title: string; publicSummary: string; locationLabel: string; stages: StoryStage[] }) {
  const t = await token();
  const res = await fetch("/api/partner/stories", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify(v) });
  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok) throw new Error(data.error || `The server refused it (${res.status}). Nothing was published.`);
  return data.id ?? null;
}

/* ── Record quality (read only; the classic rules, unchanged) ───── */

export type QualityAnimal = Awaited<ReturnType<typeof getMyAnimals>>[number];
export type QualityItem = { key: string; label: string; sub: string; href: string | null };
export type QualityQueue = { title: string; detail: string; items: QualityItem[] };
export const ANIMAL_LIMIT = 200;
const DAY = 86_400_000;
export async function readQuality(ngoId: string) {
  const s = db();
  const soft = <T,>(q: PromiseLike<T>) => Promise.race([Promise.resolve(q).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 5000))]);
  const [animals, records, a] = await Promise.all([getMyAnimals(ANIMAL_LIMIT), getPartnerRecordRows(), soft(s.from("dogs").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId))]);
  const total = (a as { count: number | null; error: unknown } | null)?.error ? animals.length : (a as { count: number | null } | null)?.count ?? animals.length;
  if (total > 0 && animals.length === 0 && records.length === 0) throw new Error("Only part of the record came back.");
  return { animals, records, total, partial: animals.length < total };
}
const animalItem = (a: QualityAnimal): QualityItem => ({ key: a.id, label: animalLine(a), sub: [a.straypaw_id ?? "No StrayPaw ID", a.code ?? "no source ID", a.zone || "no locality"].join(" · "), href: `/ngo/animals/${a.id}` });
const recordItem = (r: PartnerRecordRow): QualityItem => ({ key: r.id, label: r.title, sub: [r.date ? (Number.isFinite(Date.parse(r.date)) ? new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : `date "${r.date}"`) : "no date", r.animalLabel, r.locality, r.status].filter(Boolean).join(" · "), href: r.caseId ? `/ngo/cases/${r.caseId}` : r.animalId ? `/ngo/animals/${r.animalId}` : null });
/** The classic data-quality rules, verbatim. */
export function qualityQueues(animals: QualityAnimal[], records: PartnerRecordRow[]): QualityQueue[] {
  const now = Date.now();
  const outcomeByCase = new Set(records.filter((r) => r.kind === "outcome" && r.caseId).map((r) => r.caseId!));
  const latestCare = new Map<string, number>(), latestFollow = new Map<string, number>();
  const parsed = records.map((r) => Date.parse(r.date)).filter(Number.isFinite).sort((x, y) => x - y);
  const median = parsed.length ? parsed[Math.floor(parsed.length / 2)] : now;
  for (const r of records) {
    if (!r.animalId) continue;
    const t = Date.parse(r.date) || 0;
    if (r.kind === "care") latestCare.set(r.animalId, Math.max(latestCare.get(r.animalId) || 0, t));
    if (r.kind === "follow_up") latestFollow.set(r.animalId, Math.max(latestFollow.get(r.animalId) || 0, t));
  }
  const closed = (r: PartnerRecordRow) => /resolved|closed/i.test(r.status || "");
  return [
    { title: "Animals missing StrayPaw ID", detail: "No permanent StrayPaw ID yet. Search across registers and exports may miss them until they have one.", items: animals.filter((x) => !x.straypaw_id?.trim()).map(animalItem) },
    { title: "Animals missing source ID", detail: "The profile exists, but cannot be matched back to a spreadsheet, clinic register or tag.", items: animals.filter((x) => !x.code?.trim()).map(animalItem) },
    { title: "Animals missing locality", detail: "Cannot support ward or locality reporting, cluster analysis or repeat-hotspot work.", items: animals.filter((x) => !x.zone?.trim()).map(animalItem) },
    { title: "Suspicious record dates", detail: "Unreadable, future or extreme outlier dates distort yearly figures and map activity. Check the source before changing it.", items: records.filter((r) => { const t = Date.parse(r.date); return !Number.isFinite(t) || t > now + 30 * DAY || Math.abs(t - median) > 5 * 365 * DAY; }).map(recordItem) },
    { title: "Open for 30+ days", detail: "Rescue records still open long after the recorded intake date.", items: records.filter((r) => r.kind === "rescue" && !closed(r) && now - (Date.parse(r.date) || now) > 30 * DAY).map(recordItem) },
    { title: "Completed without structured outcome", detail: "Closed cases whose result is not recorded as an outcome.", items: records.filter((r) => r.kind === "rescue" && closed(r) && r.caseId && !outcomeByCase.has(r.caseId)).map(recordItem) },
    { title: "Care recorded after last follow-up", detail: "Animals with medical care but no later review or follow-up entry.", items: animals.filter((x) => { const c = latestCare.get(x.id) || 0; return c > 0 && (latestFollow.get(x.id) || 0) < c; }).map(animalItem) },
  ];
}
