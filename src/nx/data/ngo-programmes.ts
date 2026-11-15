"use client";

/* Programmes: drives, working zones, surveys and projects, feeding spots and fundraising. The calls and arguments
   are the classic screens' own (src/sp/ngo/Programmes.tsx, WorkingZones.tsx, ZoneProgress.tsx, outreach/*,
   components/surveys/*). Every change is decided by the database; zone changes are checked against the source row
   and the audit log before the page says they happened. */

import { archiveCampaign, campaignAnimals, campaignStats, createCampaign, orgCampaigns, programmeBreakdown, type CampaignKind } from "@/lib/campaigns";
import { operationRpc, operationsDb, type OperationReceipt } from "@/lib/operations";
import { addSurveyArea, createSurvey, submitSurveyResponse } from "@/lib/survey-actions";
import { getSurveyAreas, getSurveyById, getSurveyResponses, getSurveys, getSurveyTotals, PROJECT_MARKER } from "@/lib/surveys";
import { createOrgFeedingZone, type OrgFeedingZone } from "@/lib/feeding-zones";
import { createFundraiser } from "@/lib/fundraiser-actions";
import { mapFundraiser } from "@/lib/fundraisers";
import { uploadPhoto } from "@/lib/actions";
import type { Fundraiser } from "@/lib/types";
import { db, rpc, verified } from "./ngo-setup";

export { campaignAnimals, campaignStats, getSurveyAreas, getSurveyById, getSurveyResponses, getSurveyTotals, PROJECT_MARKER };

/* ── Drives (org_campaigns, org_programme_breakdown, create_campaign, archive_campaign) ── */

export const readDrives = (withArchived: boolean) => orgCampaigns(withArchived);
export const readBreakdown = () => programmeBreakdown();
export async function startDrive(v: { name: string; kind: CampaignKind; zone: string | null; startsOn: string | null; endsOn: string | null }) {
  const id = await createCampaign({ ...v, notes: null });
  if (!id) throw new Error("The drive was not created.");
  return id;
}
export const setArchived = (id: string, archived: boolean) => archiveCampaign(id, archived);

/* ── Working zones (org_work_zones, zone_action) ──────────────────── */

export type Zone = { id: string; name: string; campaign_id: string; planned: number | null; status: "assigned" | "reported_complete" | "supervisor_reviewed"; staff: string[]; note: string | null; updated_at: string };
export async function readZones(): Promise<Zone[]> {
  const r = await db().rpc("org_work_zones");
  if (r.error) throw new Error("Working zones are not available on this database.");
  return (r.data ?? []) as Zone[];
}
/** A boundary file: one Polygon or MultiPolygon, under 90 KB, exactly as classic accepts it. */
export async function readBoundary(file: File): Promise<unknown> {
  if (file.size > 90000) throw new Error("Use a boundary file smaller than 90 KB.");
  const j = JSON.parse(await file.text());
  const g = j?.type === "Feature" ? j.geometry : j;
  if (!["Polygon", "MultiPolygon"].includes(g?.type)) throw new Error("Use one Polygon or MultiPolygon geometry.");
  return g;
}
export type ZoneAction = "create" | "assign" | "unassign" | "report_complete" | "review_completion";
/** zone_action, then the same checks classic makes: the zone row and the audit row exist, an assignment is
    really there (or gone), and the status moved to where the action says. */
export async function zoneAction(request: string, zone: string, action: ZoneAction, payload: Record<string, unknown>) {
  const s = db();
  const r = await s.rpc("zone_action", { p_request: request, p_zone: zone, p_action: action, p_payload: payload });
  if (r.error) throw new Error(r.error.message);
  const [source, audit] = await Promise.all([s.from("programme_work_zones").select("id,status").eq("id", zone).single(), s.from("operational_audit_log").select("id").eq("id", (r.data as { audit_id: number }).audit_id).single()]);
  if (source.error || audit.error) throw new Error("The zone or its audit could not be checked. Retry this same change.");
  if (action === "assign" || action === "unassign") {
    const a = await s.from("programme_zone_staff").select("user_id").eq("zone_id", zone).eq("user_id", payload.user_id as string).eq("active", true).maybeSingle();
    if (a.error || (action === "assign" ? !a.data : !!a.data)) throw new Error("The assignment could not be checked. Retry this same change.");
  }
  if ((action === "report_complete" && source.data.status !== "reported_complete") || (action === "review_completion" && source.data.status !== "supervisor_reviewed")) throw new Error("The zone changed after this action. Check its current state.");
}

export type ZoneProgress = { zone_id: string; name: string; planned: number | null; assignment_status: string; start: string; end: string; generated_at: string; basis: string; field_records: number; reported_sterilisations: number; reported_vaccinations: number; awaiting_coordinator_review: number; veterinarian_authorised_cases: number; coordinator_reviewed_cases: number; municipally_accepted_cases: number; source_provenance: { provenance: string; records: number }[]; coverage_percent: null };
export type Assessment = { id: string; created_by: string; method: string; source_reference: string; created_at: string; survey_id: string };
export type AssessmentResult = { assessment_id: string; method: string; method_version: number; source_reference: string; snapshot_at: string; source_hash: string; observations: number; animals: number | null; observed_marked_percent: number | null; coverage_percent: number | null; limitations: string[]; review: { decision: string; actor: string; note: string; at: string } | null; interpretation: string };
export const readZoneProgress = (zone: string, start: string, end: string) => operationRpc<ZoneProgress>("operations_zone_progress", { p_zone: zone, p_start: start, p_end: end });
export async function readAssessments(zone: string): Promise<Assessment[]> {
  const a = await operationsDb().from("operations_survey_assessments").select("id,created_by,method,source_reference,created_at,survey_id").eq("zone_id", zone).order("created_at", { ascending: false }).limit(30);
  if (a.error) throw new Error(a.error.message);
  return (a.data ?? []) as Assessment[];
}
export const assessSurvey = (request: string, zone: string, survey: string, method: string, version: number, reference: string) =>
  verified<OperationReceipt>("operations_assess_survey", { p_request: request, p_zone: zone, p_survey: survey, p_method: method, p_version: version, p_reference: reference }, "operations_survey_assessments", { zone_id: zone, survey_id: survey });
export const surveyResult = (assessment: string) => operationRpc<AssessmentResult>("operations_survey_result", { p_assessment: assessment });
export const reviewSurvey = (request: string, assessment: string, decision: "confirmed" | "returned", note: string) =>
  verified<OperationReceipt>("operations_review_survey", { p_request: request, p_assessment: assessment, p_decision: decision, p_note: note }, "operations_survey_reviews", { assessment_id: assessment, decision });

/* ── Surveys and projects (create_survey, add_survey_area, submit_survey_response) ── */

export const readSurveys = () => getSurveys();
export const isProject = (s: { description: string | null }) => (s.description ?? "").includes(PROJECT_MARKER);
export const fieldsOf = (description: string | null) => { const line = (description ?? "").split("\n").find((x) => x.startsWith(PROJECT_MARKER)); return line ? line.slice(PROJECT_MARKER.length).split("|").map((x) => x.trim()).filter(Boolean) : []; };
export const purposeOf = (description: string | null) => (description ?? "").split("\n").filter((x) => !x.startsWith(PROJECT_MARKER)).join("\n").trim();
export async function newSurvey(title: string, description: string) {
  const id = await createSurvey(title, "dog", description || undefined);
  if (!id) throw new Error("The survey was not created.");
  return id;
}
/** A project is a survey whose description carries the field marker, as classic keeps it. */
export async function newProject(name: string, fields: string[], purpose: string) {
  const id = await createSurvey(name, "dog", `${PROJECT_MARKER}${fields.join("|")}\n${purpose}`);
  if (!id) throw new Error("The project was not created.");
  return id;
}
export async function addEntry(surveyId: string, attributes: Record<string, string>, notes: string | null) {
  const id = await submitSurveyResponse({ surveyId, species: "dog", count: 1, attributes, notes });
  if (!id) throw new Error("The entry was not added.");
  return id;
}
export async function addArea(surveyId: string, name: string, code: string, target: number | null) {
  const id = await addSurveyArea(surveyId, name, code || undefined, target);
  if (!id) throw new Error("The area was not saved.");
  return id;
}
export async function searchAnimals(ngoId: string, raw: string) {
  const term = raw.trim().replace(/[%_,()]/g, "").slice(0, 80);
  if (term.length < 2) return [];
  const r = await db().from("dogs").select("id,name,code").eq("ngo_id", ngoId).or(`name.ilike.%${term}%,code.ilike.%${term}%`).limit(30);
  if (r.error) throw new Error("Animal search failed.");
  return (r.data ?? []) as { id: string; name: string | null; code: string | null }[];
}

/* ── Feeding spots (my_org_feeding_zones, create_org_feeding_zone) ── */

export async function readFeedingSpots(): Promise<OrgFeedingZone[]> {
  const rows = await rpc<Record<string, unknown>[]>("my_org_feeding_zones");
  return (rows ?? []).map((r) => ({
    id: String(r.id), name: String(r.name ?? ""), description: (r.description as string) ?? null, zone: (r.zone as string) ?? null,
    lat: Number(r.lat), lng: Number(r.lng), photo_url: (r.photo_url as string) ?? null,
    last_fed_at: (r.last_fed_at as string) ?? null, created_at: String(r.created_at), volunteer_count: Number(r.volunteer_count ?? 0),
  }));
}
export async function addFeedingSpot(v: { name: string; zone: string; description: string; lat: number; lng: number }, photo: File | null) {
  const photoUrl = photo ? await uploadPhoto(photo) : null;
  const id = await createOrgFeedingZone({ name: v.name, zone: v.zone || undefined, description: v.description || undefined, lat: v.lat, lng: v.lng, photoUrl });
  if (!id) throw new Error("The feeding spot was not added.");
  return id;
}

/* ── Fundraising (create_fundraiser: verified partners only, the database decides) ── */

export async function readFundraisers(ngoId: string): Promise<Fundraiser[]> {
  const { data, error } = await db().from("fundraisers").select("*").eq("ngo_id", ngoId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapFundraiser);
}
export async function startFundraiser(v: { title: string; story: string; category: string; goal: number | null; donateUrl: string; deadline: string | null; caseId: string | null }, actor: { id: string; name: string }, cover: File | null) {
  const coverPhoto = cover ? await uploadPhoto(cover) : null;
  const id = await createFundraiser({ title: v.title, story: v.story || undefined, category: v.category, goalAmount: v.goal, donateUrl: v.donateUrl, deadline: v.deadline, caseId: v.caseId, coverPhoto }, actor);
  if (!id || id === "demo-fundraiser") throw new Error("The campaign was not published.");
  return id;
}
