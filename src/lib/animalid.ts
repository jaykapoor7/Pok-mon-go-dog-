/* ════════════════════════════════════════════════════════════════════
   AnimalID, the client side. Every call runs under the signed-in person's
   own session; the database decides who may search and decide (admin,
   coordinator, veterinarian of the organisation). The browser never sees an
   embedding. Similarity is raw cosine similarity of image features: it is
   shown as such, never as a probability that two photos are the same animal.
   ════════════════════════════════════════════════════════════════════ */
import { getSupabase } from "./supabase";
import { compressForUpload } from "./photo/compress";

export type Job = { id: string; status: "queued" | "running" | "done" | "failed" | "rejected_quality"; error: string | null; quality: { reasons?: string[] } | null; created_at: string; photo_uri: string; model_version: string | null };
export type Candidate = { id: string; dog_id: string; rank: number; similarity: number; band: "strong" | "possible" | "below"; matched_photo_uri: string; dog: { name: string | null; straypaw_id: string | null; code: string | null; zone: string | null; cover_photo: string | null } | null };
export type Decision = { id: string; job_id: string; decision: "same_animal" | "not_this_animal" | "new_animal"; dog_id: string | null; reason: string | null; decided_at: string; reversed_at: string | null; reversal_reason: string | null };
export type Summary = { indexed_photos: number; indexed_animals: number; searches: number; confirmed_identities: number; labelled_animals: number; repeat_encounter_animals: number; rejections: number; reversals: number; conflicts: number; training_eligible: number; training_allowed: boolean | null };

const BUCKET = "animalid-photos";
const db = () => { const s = getSupabase(); if (!s) throw new Error("Sign in again."); return s; };
const plain = (m: string) => m.replace(/^.*?ERROR:\s*/, "");

export async function uploadSearchPhoto(ngoId: string, file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) && !/^image\//.test(file.type)) throw new Error("Choose a photo");
  const body = await compressForUpload(file);
  const ext = body.type === "image/png" ? "png" : body.type === "image/webp" ? "webp" : "jpg";
  const path = `${ngoId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from(BUCKET).upload(path, body, { contentType: body.type, upsert: false });
  if (error) throw new Error(/security|authori|403/i.test(error.message) ? "A coordinator, veterinarian or admin uses identity search" : error.message);
  return `storage://${BUCKET}/${path}`;
}

export async function requestSearch(photoUri: string): Promise<string> {
  const { data, error } = await db().rpc("animalid_request_search", { p_photo_uri: photoUri, p_species: "dog" });
  if (error) throw new Error(plain(error.message));
  return data as string;
}

export async function readJob(id: string): Promise<Job | null> {
  const { data, error } = await db().from("animalid_jobs").select("id,status,error,quality,created_at,photo_uri,model_version").eq("id", id).maybeSingle();
  if (error) throw new Error("The search could not be read.");
  return data as Job | null;
}

export async function readCandidates(jobId: string): Promise<Candidate[]> {
  const { data, error } = await db().from("animalid_candidates").select("id,dog_id,rank,similarity,band,matched_photo_uri,dog:dogs(name,straypaw_id,code,zone,cover_photo)").eq("job_id", jobId).order("rank");
  if (error) throw new Error("The suggestions could not be read.");
  return ((data ?? []) as unknown as (Omit<Candidate, "dog"> & { dog: Candidate["dog"] | Candidate["dog"][] })[]).map((c) => ({ ...c, dog: Array.isArray(c.dog) ? c.dog[0] ?? null : c.dog }));
}

export async function readDecisions(jobId: string): Promise<Decision[]> {
  const { data, error } = await db().from("animalid_decisions").select("id,job_id,decision,dog_id,reason,decided_at,reversed_at,reversal_reason").eq("job_id", jobId).order("decided_at");
  if (error) throw new Error("Decisions could not be read.");
  return (data ?? []) as Decision[];
}

export async function decide(jobId: string, decision: Decision["decision"], dogId: string | null, reason?: string) {
  const { data, error } = await db().rpc("animalid_decide", { p_job: jobId, p_decision: decision, p_dog: dogId, p_reason: reason ?? null });
  if (error) throw new Error(plain(error.message));
  return data as string;
}

export async function reverse(decisionId: string, reason: string) {
  const { error } = await db().rpc("animalid_reverse", { p_decision: decisionId, p_reason: reason });
  if (error) throw new Error(plain(error.message));
}

export async function requestIndex() {
  const { data, error } = await db().rpc("animalid_request_index");
  if (error) throw new Error(plain(error.message));
  return data as string;
}

export async function datasetSummary(): Promise<Summary> {
  const { data, error } = await db().rpc("animalid_dataset_summary");
  if (error) throw new Error(plain(error.message));
  return data as Summary;
}

/** A short-lived link to a stored photo the person may read (5 minutes). */
export async function photoLink(uri: string | null | undefined): Promise<string | null> {
  if (!uri) return null;
  if (!uri.startsWith("storage://")) return uri;
  const [bucket, ...rest] = uri.slice("storage://".length).split("/");
  const { data } = await db().storage.from(bucket).createSignedUrl(rest.join("/"), 300);
  return data?.signedUrl ?? null;
}

export const BAND_LABEL: Record<Candidate["band"], string> = { strong: "Strong visual similarity", possible: "Possible", below: "Weak" };
