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
  token?: string | null; // Cloudflare Turnstile token
}

export interface ReportResult {
  dogId: string | null;
  trust: number;
}

async function uploadPhoto(file: File): Promise<string> {
  const supa = getSupabase();
  if (!supa) throw new Error("not configured");
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

  // Local / no-config: simulate the pipeline.
  if (!supa) {
    await wait(900);
    const trust =
      40 + 20 + (input.notes ? 10 : 0) + (input.nickname ? 8 : 0) + 12;
    return { dogId: null, trust: Math.min(100, trust) };
  }

  // Upload the photo to storage (client-side, anon).
  let photoUrl = input.fallbackPhotoUrl ?? "";
  if (input.file) {
    photoUrl = await uploadPhoto(input.file);
  }
  if (!photoUrl) throw new Error("A photo is required");

  // Persist through the Turnstile-protected API route (server verifies the
  // token, then writes with elevated privileges).
  const res = await fetch("/api/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: input.token ?? null,
      photoUrl,
      lat: input.lat,
      lng: input.lng,
      zone: input.zone,
      nickname: input.nickname || null,
      moods: input.moods,
      notes: input.notes || null,
      reporterName: input.reporterName || null,
    }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(error || "Could not save your sighting. Please try again.");
  }

  const result = (await res.json()) as ReportResult;
  return result;
}

export async function logFeed(dogId: string, reporterName?: string, foodType?: string) {
  const supa = getSupabase();
  if (!supa) return;
  await supa.rpc("log_feed", {
    p_dog_id: dogId,
    p_reporter_name: reporterName || null,
    p_food_type: foodType || null,
  });
}

export async function logSeen(dogId: string) {
  const supa = getSupabase();
  if (!supa) return;
  await supa.rpc("log_seen", { p_dog_id: dogId });
}

export async function likeSighting(sightingId: string) {
  const supa = getSupabase();
  if (!supa) return;
  await supa.rpc("like_sighting", { p_sighting_id: sightingId });
}

export async function addComment(dogId: string, body: string, reporterName?: string) {
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
