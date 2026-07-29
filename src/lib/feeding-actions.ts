"use client";

// ─────────────────────────────────────────────────────────────
// Feeding-zone write actions (client). Persistence flows through the
// SECURITY DEFINER functions in supabase/feeding-zones.sql.
// ─────────────────────────────────────────────────────────────

import { getSupabase } from "./supabase";
import type { FeedingDay } from "./types";

export interface Actor {
  id: string;
  name: string;
}

export interface CreateFeedingZoneInput {
  name: string;
  description?: string;
  zone?: string | null;
  lat: number;
  lng: number;
  photoUrl?: string | null;
}

export async function createFeedingZone(
  input: CreateFeedingZoneInput,
  actor: Actor | null
): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) return "demo-zone";
  const { data, error } = await supa.rpc("create_feeding_zone", {
    p_name: input.name,
    p_description: input.description || null,
    p_zone: input.zone || null,
    p_lat: input.lat,
    p_lng: input.lng,
    p_photo_url: input.photoUrl || null,
    p_actor_id: actor?.id ?? null,
    p_actor_name: actor?.name ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}

export async function volunteerForZone(
  zoneId: string,
  actor: Actor,
  days: FeedingDay[],
  contact?: string
): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  const { data, error } = await supa.rpc("volunteer_for_feeding_zone", {
    p_zone_id: zoneId,
    p_actor_id: actor.id,
    p_actor_name: actor.name,
    p_contact: contact || null,
    p_days: days,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function withdrawFeedingVolunteer(zoneId: string, actor: Actor): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  const { data, error } = await supa.rpc("withdraw_feeding_volunteer", {
    p_zone_id: zoneId,
    p_actor_id: actor.id,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function checkinFeedingZone(
  zoneId: string,
  actor: Actor | null,
  note?: string
): Promise<void> {
  const supa = getSupabase();
  if (!supa) return;
  const { error } = await supa.rpc("checkin_feeding_zone", {
    p_zone_id: zoneId,
    p_actor_id: actor?.id ?? null,
    p_actor_name: actor?.name ?? "Someone",
    p_note: note || null,
  });
  if (error) throw new Error(error.message);
}
