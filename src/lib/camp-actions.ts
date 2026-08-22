"use client";

import { getSupabase } from "./supabase";
import type { VetCamp } from "./types";

export async function getMyCamps(): Promise<VetCamp[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data: ngoId } = await supa.rpc("my_ngo");
  if (!ngoId) return [];
  const { data } = await supa
    .from("vet_camps")
    .select("*")
    .eq("ngo_id", ngoId)
    .order("camp_date", { ascending: true, nullsFirst: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, name: r.name, village: r.village ?? null, district: r.district ?? null,
    lat: r.lat ?? null, lng: r.lng ?? null, camp_date: r.camp_date ?? null,
    status: r.status ?? "planned", notes: r.notes ?? null, created_at: r.created_at,
  }));
}

export async function createVetCamp(input: {
  name: string; village?: string; district?: string; lat?: number | null; lng?: number | null; campDate?: string | null; notes?: string;
}): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) return "demo-camp";
  const { data, error } = await supa.rpc("create_vet_camp", {
    p_name: input.name, p_village: input.village || null, p_district: input.district || null,
    p_lat: input.lat ?? null, p_lng: input.lng ?? null, p_camp_date: input.campDate || null, p_notes: input.notes || null,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}

export async function setVetCampStatus(id: string, status: string): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  const { data, error } = await supa.rpc("set_vet_camp_status", { p_id: id, p_status: status });
  if (error) throw new Error(error.message);
  return data === true;
}
