"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO outreach tools with an honest receipt: evidence files,
   fundraising, surveys and projects, organisation feeding spots.

   Writes call the same server-authorised functions the 1.0 tools call
   (lib/documents, lib/fundraiser-actions, lib/survey-actions,
   lib/feeding-zones), wrapped by run() so the page shows what the
   database said. The database decides who may write; nothing here
   simulates success, and the demo ids the older helpers return without a
   database are failures.

   Reads mirror the queries the 1.0 tools make, but throw instead of
   answering an error with an empty list, so a page can say "Not read"
   rather than "none".
   ════════════════════════════════════════════════════════════════════ */

import { getSupabase } from "@/lib/supabase";
import { uploadPhoto } from "@/lib/actions";
import { addDocument, linkDocument, updateDocument, type DocumentKind, type SourceDocument } from "@/lib/documents";
import { createFundraiser, type CreateFundraiserInput } from "@/lib/fundraiser-actions";
import { mapFundraiser } from "@/lib/fundraisers";
import { createSurvey, submitSurveyResponse } from "@/lib/survey-actions";
import { PROJECT_MARKER } from "@/lib/surveys";
import { createOrgFeedingZone, type OrgFeedingZone } from "@/lib/feeding-zones";
import type { Fundraiser } from "@/lib/types";
import { run, type Receipt } from "./work";

export type { Receipt };
type WithId = Receipt & { id?: string };
const withId = (r: Receipt, id: string | null): WithId => (r.ok && id ? { ...r, id } : r);

function db() {
  const supa = getSupabase();
  if (!supa) throw new Error("Not connected to the record.");
  return supa;
}

/* ── reads ───────────────────────────────────────────────────────── */

/** The organisation's filed documents (RLS scopes them), newest first, at most 300. */
export async function readDocuments(): Promise<SourceDocument[]> {
  const { data, error } = await db().from("documents").select("*").order("created_at", { ascending: false }).limit(300);
  if (error) throw new Error(error.message);
  return (data ?? []) as SourceDocument[];
}

export type OrgAnimalLite = { id: string; straypaw_id: string | null; name: string | null; code: string | null; zone: string };
/** The organisation's animals for the attach picker: the same 200 most recently seen the 1.0 tool listed. */
export async function readAnimalsForAttach(limit = 200): Promise<OrgAnimalLite[]> {
  const supa = db();
  const { data: ngoId, error: e1 } = await supa.rpc("my_ngo");
  if (e1) throw new Error(e1.message);
  if (!ngoId) return [];
  const { data, error } = await supa.from("dogs").select("id, straypaw_id, name, code, zone").eq("ngo_id", ngoId).order("last_seen", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: string; straypaw_id: string | null; name: string | null; code: string | null; zone: string | null }[]).map((r) => ({ ...r, zone: r.zone ?? "" }));
}

/** Every campaign the organisation has started, newest first. */
export async function readOrgFundraisers(): Promise<Fundraiser[]> {
  const supa = db();
  const { data: ngoId, error: e1 } = await supa.rpc("my_ngo");
  if (e1) throw new Error(e1.message);
  if (!ngoId) return [];
  const { data, error } = await supa.from("fundraisers").select("*").eq("ngo_id", ngoId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapFundraiser);
}

/** The organisation's own feeding spots (my_org_feeding_zones). */
export async function readOrgFeedingSpots(): Promise<OrgFeedingZone[]> {
  const { data, error } = await db().rpc("my_org_feeding_zones");
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), name: String(r.name ?? ""), description: (r.description as string) ?? null, zone: (r.zone as string) ?? null,
    lat: Number(r.lat), lng: Number(r.lng), photo_url: (r.photo_url as string) ?? null,
    last_fed_at: (r.last_fed_at as string) ?? null, created_at: String(r.created_at), volunteer_count: Number(r.volunteer_count ?? 0),
  }));
}

/* ── evidence files (add_document, update_document, link_document) ── */

/** Upload one scan and file it. Non-images are refused here, as the 1.0 tool skipped them. */
export function fileScan(file: File, kind: DocumentKind): Promise<WithId> {
  let id: string | null = null;
  return run(`doc:${file.name}:${file.size}`, `Filed ${file.name}`, async () => {
    if (!file.type.startsWith("image/")) return { ok: false, error: `${file.name} is not an image. Only photographs and scans can be filed.` };
    const url = await uploadPhoto(file);
    id = await addDocument({ url, kind, title: file.name });
    return !!id;
  }).then((r) => withId(r, id));
}
export const saveDocument = (id: string, v: { title: string; notes: string; kind: DocumentKind; recordedOn: string | null }) =>
  run(`doc-edit:${id}`, "Context saved", () => updateDocument(id, v));
export const attachDocument = (id: string, opts: { dogId?: string; caseId?: string; clear?: boolean }, label: string) =>
  run(`doc-link:${id}`, opts.clear ? "Detached" : `Attached to ${label}`, () => linkDocument(id, opts));

/* ── fundraising (create_fundraiser) ─────────────────────────────── */

export function startFundraiser(input: CreateFundraiserInput, actor: { id: string; name: string }, cover: File | null): Promise<WithId> {
  let id: string | null = null;
  return run(`fr:${input.title}`, "Campaign published", async () => {
    const coverPhoto = cover ? await uploadPhoto(cover) : null;
    id = await createFundraiser({ ...input, coverPhoto }, actor);
    return !!id && id !== "demo-fundraiser";
  }).then((r) => withId(r, id));
}

/* ── surveys and projects (create_survey, submit_survey_response) ── */

export function startSurvey(title: string, description: string): Promise<WithId> {
  let id: string | null = null;
  return run(`sv:${title}`, "Survey created", async () => { id = await createSurvey(title, "dog", description || undefined); return !!id && id !== "demo-survey"; }).then((r) => withId(r, id));
}
/** A project is a survey whose description carries the field marker; the flows are the 1.0 ones. */
export function startProject(name: string, fields: string[], purpose: string): Promise<WithId> {
  let id: string | null = null;
  return run(`pj:${name}`, "Project created", async () => { id = await createSurvey(name, "dog", `${PROJECT_MARKER}${fields.join("|")}\n${purpose}`); return !!id && id !== "demo-survey"; }).then((r) => withId(r, id));
}
export const addProjectEntry = (surveyId: string, attributes: Record<string, string>, notes: string | null) =>
  run(`pj-entry:${surveyId}`, "Entry added", async () => { const id = await submitSurveyResponse({ surveyId, species: "dog", count: 1, attributes, notes }); return !!id && id !== "demo-response"; });

/* ── organisation feeding spots (create_org_feeding_zone) ─────────── */

export function startOrgFeedingSpot(v: { name: string; zone: string; description: string; lat: number; lng: number }, photo: File | null): Promise<WithId> {
  let id: string | null = null;
  return run(`ofz:${v.name}`, "Feeding spot added", async () => {
    const photoUrl = photo ? await uploadPhoto(photo) : null;
    id = await createOrgFeedingZone({ name: v.name, zone: v.zone || undefined, description: v.description || undefined, lat: v.lat, lng: v.lng, photoUrl });
    return !!id;
  }).then((r) => withId(r, id));
}
