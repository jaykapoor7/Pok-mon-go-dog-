// ─────────────────────────────────────────────────────────────
// Feeding zones data access (read side). Live Supabase when configured; empty
// otherwise. Volunteer contact info is never fetched here — the safe view
// (feeding_zone_volunteer_public) never exposes it. See feeding-zones.sql.
// ─────────────────────────────────────────────────────────────

import { getSupabase } from "./supabase";
import type { FeedingZone, FeedingZoneVolunteer, FeedingZoneCheckin, FeedingDay } from "./types";

function mapZone(r: any): FeedingZone {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    zone: r.zone ?? null,
    lat: r.lat,
    lng: r.lng,
    photo_url: r.photo_url ?? null,
    created_by_id: r.created_by_id ?? null,
    created_by_name: r.created_by_name ?? null,
    created_at: r.created_at,
    last_fed_at: r.last_fed_at ?? null,
    volunteer_count: r.volunteer_count ?? 0,
  };
}

function mapVolunteer(r: any): FeedingZoneVolunteer {
  return {
    id: r.id,
    feeding_zone_id: r.feeding_zone_id,
    user_id: r.user_id,
    user_name: r.user_name,
    days: (r.days ?? []) as FeedingDay[],
    created_at: r.created_at,
  };
}

function mapCheckin(r: any): FeedingZoneCheckin {
  return {
    id: r.id,
    feeding_zone_id: r.feeding_zone_id,
    actor_id: r.actor_id ?? null,
    actor_name: r.actor_name ?? null,
    note: r.note ?? null,
    created_at: r.created_at,
  };
}

export async function getFeedingZones(): Promise<FeedingZone[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from("feeding_zone_public")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  return (data ?? []).map(mapZone);
}

export async function getFeedingZoneById(id: string): Promise<FeedingZone | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data } = await supa.from("feeding_zone_public").select("*").eq("id", id).single();
  return data ? mapZone(data) : null;
}

export async function getFeedingZoneVolunteers(zoneId: string): Promise<FeedingZoneVolunteer[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from("feeding_zone_volunteer_public")
    .select("*")
    .eq("feeding_zone_id", zoneId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(mapVolunteer);
}

export async function getFeedingZoneCheckins(zoneId: string, limit = 20): Promise<FeedingZoneCheckin[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from("feeding_zone_checkins")
    .select("*")
    .eq("feeding_zone_id", zoneId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapCheckin);
}
