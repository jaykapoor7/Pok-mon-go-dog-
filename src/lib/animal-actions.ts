"use client";

import { getSupabase } from "./supabase";

export interface AnimalRow {
  id: string;
  name: string | null;
  code: string | null;
  species: string;
  zone: string;
  status: string;
  cover_photo: string;
  assignee_name: string | null;
  last_seen: string;
  lat: number;
  lng: number;
}

export interface CreateAnimalInput {
  name?: string;
  species: string;
  code?: string;
  zone?: string;
  lat?: number | null;
  lng?: number | null;
  coverPhoto?: string | null;
  intakeNotes?: string;
}

export async function createAnimal(input: CreateAnimalInput): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) return "demo-animal";
  const { data, error } = await supa.rpc("create_animal", {
    p_name: input.name || null,
    p_species: input.species,
    p_code: input.code || null,
    p_zone: input.zone || null,
    p_lat: input.lat ?? null,
    p_lng: input.lng ?? null,
    p_cover_photo: input.coverPhoto || null,
    p_intake_notes: input.intakeNotes || null,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}

export async function updateAnimal(
  id: string,
  patch: {
    name?: string;
    code?: string;
    zone?: string;
    intakeNotes?: string;
    assigneeId?: string | null;
    assigneeName?: string | null;
    status?: string | null;
    coverPhoto?: string | null;
  }
): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  const { data, error } = await supa.rpc("update_animal", {
    p_id: id,
    p_name: patch.name ?? null,
    p_code: patch.code ?? null,
    p_zone: patch.zone ?? null,
    p_intake_notes: patch.intakeNotes ?? null,
    p_assignee_id: patch.assigneeId ?? null,
    p_assignee_name: patch.assigneeName ?? null,
    p_status: patch.status ?? null,
    p_cover_photo: patch.coverPhoto ?? null,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

/** Animals owned by the caller's org (for the registry list). */
export async function getMyAnimals(): Promise<AnimalRow[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data: ngoId } = await supa.rpc("my_ngo");
  if (!ngoId) return [];
  const { data } = await supa
    .from("dogs")
    .select("id, name, code, species, zone, status, cover_photo, assignee_name, last_seen, lat, lng")
    .eq("ngo_id", ngoId)
    .order("last_seen", { ascending: false })
    .limit(1000);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name ?? null,
    code: r.code ?? null,
    species: r.species ?? "dog",
    zone: r.zone ?? "",
    status: r.status ?? "seen",
    cover_photo: r.cover_photo ?? "",
    assignee_name: r.assignee_name ?? null,
    last_seen: r.last_seen,
    lat: r.lat ?? 0,
    lng: r.lng ?? 0,
  }));
}
