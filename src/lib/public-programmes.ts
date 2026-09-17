import { getSupabase } from "@/lib/supabase";

export type PublicProgramme = { id: string; name: string; kind: string; starts_on: string | null; ends_on: string | null; zone: string | null; public_summary: string | null; ngo_name: string; ngo_slug: string | null; city: string | null; state: string | null; animals_recorded: number; sterilised_recorded: number; vaccinated_recorded: number };

export async function getPublicProgrammes(limit = 12): Promise<PublicProgramme[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa.from("public_programme_cards").select("*").order("ends_on", { ascending: false, nullsFirst: false }).limit(limit);
  return (data ?? []).map((row: any) => ({ ...row, animals_recorded: Number(row.animals_recorded ?? 0), sterilised_recorded: Number(row.sterilised_recorded ?? 0), vaccinated_recorded: Number(row.vaccinated_recorded ?? 0) }));
}
