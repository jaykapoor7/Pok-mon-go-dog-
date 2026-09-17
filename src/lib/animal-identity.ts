import { getSupabase } from "./supabase";

export type PublicAnimalIdentity = {
  id: string;
  straypaw_id: string | null;
  source_code: string | null;
};

export async function getPublicAnimalIdentity(id: string): Promise<PublicAnimalIdentity | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data } = await supa
    .from("public_animal_profiles")
    .select("id,straypaw_id,code")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    straypaw_id: (data as any).straypaw_id ?? null,
    source_code: (data as any).code ?? null,
  };
}

export async function searchAnimalIdentity(query: string, limit = 5) {
  const supa = getSupabase();
  const q = query.trim();
  if (!supa || q.length < 3) return [];
  const { data } = await supa
    .from("public_animal_profiles")
    .select("id,straypaw_id,name,species,zone")
    .ilike("straypaw_id", `%${q}%`)
    .limit(limit);
  return (data ?? []).map((row: any) => ({
    id: row.id as string,
    straypaw_id: row.straypaw_id as string,
    name: row.name as string | null,
    species: row.species as string | null,
    zone: row.zone as string | null,
  }));
}
