"use client";

// ─────────────────────────────────────────────────────────────
// Client-side writes. These run in the browser using the public anon key.
// All persistence flows through SECURITY DEFINER functions in the database
// (see supabase/schema.sql), so the anon key can't do anything unsafe.
//
// With no Supabase configured the helpers simulate success so the upload loop
// still works for local development.
// ─────────────────────────────────────────────────────────────

import { getSupabase } from "./supabase";
import { mapOrg } from "./data";
import { mapFundraiser } from "./fundraisers";
import type { NGO, Fundraiser } from "./types";
import {
  newOwnerToken,
  rememberOwner,
  getOwnerToken,
  forgetOwner,
} from "./ownership";

export const IS_LIVE = !!getSupabase();

export interface ReportInput {
  file: File | null;
  fallbackPhotoUrl?: string;
  lat: number;
  lng: number;
  zone: string;
  nickname?: string;
  moods: string[];
  notes?: string;
  reporterName?: string;
  reporterEmail?: string; // optional, notify when the sighting goes live
  token?: string | null; // Cloudflare Turnstile token
  /** An animal the reporter says this is. A claim for review, not a match. */
  claimedDogId?: string | null;
}

export interface ReportResult {
  dogId: string | null;
  sightingId: string | null;
  trust: number;
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_IMAGE = /^image\/(jpe?g|png|webp|heic|heif|gif)$/i;

export async function uploadPhoto(file: File): Promise<string> {
  const supa = getSupabase();
  if (!supa) throw new Error("not configured");
  // Constrain anonymous uploads (type + size) to curb spam/cost. A matching
  // bucket policy in Supabase Storage should enforce the same server-side.
  if (file.type && !ALLOWED_IMAGE.test(file.type)) {
    throw new Error("Please upload an image (JPG, PNG, WebP or HEIC).");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That image is over 8 MB, please pick a smaller one.");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supa.storage
    .from("sightings")
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return supa.storage.from("sightings").getPublicUrl(path).data.publicUrl;
}

export async function reportSighting(input: ReportInput): Promise<ReportResult> {
  const supa = getSupabase();

  /* Without a backend there is nowhere to put this. Returning a trust score
     here told the reporter their sighting was filed when nothing had been
     written anywhere, the one failure mode that costs us the observation and
     the reporter's trust at the same time. */
  if (!supa) {
    throw new Error(
      "Reporting is not available right now, the record store is not reachable. Nothing was saved, so please try again shortly."
    );
  }

  // Upload the photo to storage (client-side, anon).
  let photoUrl = input.fallbackPhotoUrl ?? "";
  if (input.file) {
    photoUrl = await uploadPhoto(input.file);
  }
  if (!photoUrl) throw new Error("A photo is required");

  // A secret ownership token, sent raw to the server (which stores only its
  // hash) and kept locally so this device can later delete the sighting.
  const ownerToken = newOwnerToken();

  // If the reporter is signed in, send their access token so the server can
  // verify it and attach the sighting to their account (cross-device ownership).
  const { data: sessionData } = await supa.auth.getSession();
  const accessToken = sessionData.session?.access_token ?? null;

  // Persist through the Turnstile-protected API route (server verifies the
  // token, then writes with elevated privileges).
  const res = await fetch("/api/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: input.token ?? null,
      ownerToken,
      accessToken,
      photoUrl,
      lat: input.lat,
      lng: input.lng,
      zone: input.zone,
      nickname: input.nickname || null,
      moods: input.moods,
      notes: input.notes || null,
      reporterName: input.reporterName || null,
      reporterEmail: input.reporterEmail || null,
      claimedDogId: input.claimedDogId || null,
    }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(error || "Could not save your sighting. Please try again.");
  }

  const result = (await res.json()) as ReportResult;
  if (result.sightingId) rememberOwner(result.sightingId, ownerToken);
  return result;
}

/**
 * Delete a sighting this device created. Sends the locally-stored token; the
 * server hashes it and only deletes if it matches the stored owner hash.
 */
export async function deleteSighting(sightingId: string): Promise<boolean> {
  const ownerToken = getOwnerToken(sightingId);
  if (!ownerToken) return false; // not the owner on this device

  if (!getSupabase()) {
    forgetOwner(sightingId);
    return true; // simulate in local/no-config mode
  }

  const res = await fetch("/api/sighting/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sightingId, ownerToken }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Delete failed" }));
    throw new Error(error || "Could not delete this sighting.");
  }
  forgetOwner(sightingId);
  return true;
}

// ── Account-owned management (signed-in users) ───────────────
// These call SECURITY DEFINER RPCs that authorise by auth.uid(), so the
// logged-in user's session (carried by the anon client) is what proves
// ownership, works from any device, not just the one that posted.

export interface SightingEdit {
  nickname: string | null;
  moods: string[];
  notes: string | null;
}

/** Edit your own sighting. Returns true on success. */
export async function updateMySighting(
  sightingId: string,
  edit: SightingEdit
): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return false;
  const { data, error } = await supa.rpc("update_my_sighting", {
    p_sighting_id: sightingId,
    p_nickname: edit.nickname,
    p_mood_tags: edit.moods,
    p_notes: edit.notes,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

/** Delete your own sighting (account ownership). Returns true on success. */
export async function deleteMySighting(sightingId: string): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return false;
  const { data, error } = await supa.rpc("delete_my_sighting", {
    p_sighting_id: sightingId,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export interface DogStatusEdit {
  // Nulls are allowed for partial edits, the RPC coalesces each field, keeping
  // the current value when null (so a single flag can be flipped on its own).
  status: string | null;
  needs_help: boolean | null;
  vaccinated: boolean | null;
  sterilised: boolean | null;
  is_friendly: boolean | null;
  // 'left' | 'right' | 'both' to set, '' to clear, null/undefined to leave as-is.
  ear_notch?: string | null;
}

/** Update the care status of a dog you've contributed a sighting for. */
export async function updateDogStatus(
  dogId: string,
  edit: DogStatusEdit
): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return false;
  const { data, error } = await supa.rpc("update_dog_status", {
    p_dog_id: dogId,
    p_status: edit.status,
    p_needs_help: edit.needs_help,
    p_vaccinated: edit.vaccinated,
    p_sterilised: edit.sterilised,
    p_is_friendly: edit.is_friendly,
    p_ear_notch: edit.ear_notch ?? null,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export interface HelperInput {
  name: string;
  contact: string;
  message?: string;
  isNgo?: boolean;
  ngoName?: string;
  dogId?: string | null;
  zone?: string | null;
}

/** Submit a "can you help?" volunteer or NGO sign-up (via the server route so
 *  the operator gets a Telegram alert). */
export async function submitHelper(input: HelperInput): Promise<boolean> {
  if (!getSupabase()) {
    await wait(700); // local/no-config: simulate success
    return true;
  }
  const res = await fetch("/api/helper", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Could not submit." }));
    throw new Error(error || "Could not submit.");
  }
  return true;
}

/** Is the signed-in user a verified partner NGO (may merge profiles, see exact pins)? */
export async function isNgoMember(): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return false;
  const { data } = await supa.rpc("is_ngo_member");
  return data === true;
}

export interface PartnerRequestInput {
  orgName: string;
  area?: string;
  contact?: string;
  message?: string;
}

/** Submit (or re-submit) a request for verified-partner access. */
export async function requestPartnerAccess(input: PartnerRequestInput): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  const { error } = await supa.rpc("request_partner_access", {
    p_org_name: input.orgName,
    p_area: input.area || null,
    p_contact: input.contact || null,
    p_message: input.message || null,
  });
  if (error) throw new Error(error.message);
  return true;
}

/** Does the signed-in user have a pending partner request? */
export async function getMyPartnerRequestStatus(): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data } = await supa
    .from("partner_requests")
    .select("status")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.status as string) ?? null;
}

/** The signed-in member's org (ngos) row, for funder-report auto-fill + badge. */
export async function getMyNgo(): Promise<{ id: string; name: string; logo_url: string | null } | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data: ngoId } = await supa.rpc("my_ngo");
  if (!ngoId) return null;
  const { data } = await supa
    .from("ngos")
    .select("id, name, logo_url")
    .eq("id", ngoId)
    .maybeSingle();
  return data ? { id: data.id, name: data.name, logo_url: data.logo_url ?? null } : null;
}

/** The caller's full organization profile (verified members only). */
export async function getMyOrg(): Promise<NGO | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data: ngoId } = await supa.rpc("my_ngo");
  if (!ngoId) return null;
  const { data } = await supa.from("ngos").select("*").eq("id", ngoId).maybeSingle();
  return data ? mapOrg(data) : null;
}

/** All campaigns owned by the caller's org (any status). */
export async function getMyOrgCampaigns(): Promise<Fundraiser[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data: ngoId } = await supa.rpc("my_ngo");
  if (!ngoId) return [];
  const { data } = await supa
    .from("fundraisers")
    .select("*")
    .eq("ngo_id", ngoId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapFundraiser);
}

export interface OrgProfilePatch {
  mission?: string;
  about?: string;
  website?: string;
  contact_email?: string;
  contact_phone?: string;
  city?: string;
  state?: string;
  areas_of_work?: string[];
  logo_url?: string;
  cover_photo?: string;
  founded_year?: number | null;
  registration_no?: string;
}

/** NGO-only: update the caller's own org profile (the RPC enforces membership). */
export async function updateMyOrg(patch: OrgProfilePatch): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return false;
  const { data, error } = await supa.rpc("ngo_update_profile", {
    p_mission: patch.mission ?? null,
    p_about: patch.about ?? null,
    p_website: patch.website ?? null,
    p_contact_email: patch.contact_email ?? null,
    p_contact_phone: patch.contact_phone ?? null,
    p_city: patch.city ?? null,
    p_state: patch.state ?? null,
    p_areas_of_work: patch.areas_of_work ?? null,
    p_logo_url: patch.logo_url ?? null,
    p_cover_photo: patch.cover_photo ?? null,
    p_founded_year: patch.founded_year ?? null,
    p_registration_no: patch.registration_no ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as any)?.ok === true;
}

/** NGO-only: update a dog's care flags from the dashboard (returns false if not
 *  a verified member, the RPC enforces it). */
export async function ngoSetDogCare(
  dogId: string,
  patch: { vaccinated?: boolean; sterilised?: boolean; needs_help?: boolean }
): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return false;
  const { data, error } = await supa.rpc("ngo_set_dog_care", {
    p_dog_id: dogId,
    p_vaccinated: patch.vaccinated ?? null,
    p_sterilised: patch.sterilised ?? null,
    p_needs_help: patch.needs_help ?? null,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

/** Fetch the signed-in user's own sightings (including pending ones). */
export async function getMySightings(userId: string) {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa
    .from("sightings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function logFeed(dogId: string, reporterName?: string, foodType?: string) {
  if (dogId.startsWith("demo-")) return; // demo dogs are never written
  const supa = getSupabase();
  if (!supa) return;
  await supa.rpc("log_feed", {
    p_dog_id: dogId,
    p_reporter_name: reporterName || null,
    p_food_type: foodType || null,
  });
}

export async function logSeen(dogId: string) {
  if (dogId.startsWith("demo-")) return; // demo dogs are never written
  const supa = getSupabase();
  if (!supa) return;
  await supa.rpc("log_seen", { p_dog_id: dogId });
}

export async function likeSighting(sightingId: string) {
  if (sightingId.startsWith("demo-")) return; // demo sightings are never written
  const supa = getSupabase();
  if (!supa) return;
  await supa.rpc("like_sighting", { p_sighting_id: sightingId });
}

export async function addComment(dogId: string, body: string, reporterName?: string) {
  if (dogId.startsWith("demo-")) return; // demo dogs are never written
  const supa = getSupabase();
  if (!supa) return;
  await supa.rpc("add_comment", {
    p_dog_id: dogId,
    p_body: body,
    p_reporter_name: reporterName || null,
  });
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
