import { getSupabase } from "./supabase";

/* Adoption listings.
   Reads go through the `adoptable_animals` view, which only ever exposes
   open listings, so a placed animal's contact details cannot leak onto a
   public page by a page forgetting to filter. */

export type AdoptableAnimal = {
  listing_id: string;
  dog_id: string;
  name: string | null;
  zone: string | null;
  cover_photo: string | null;
  summary: string | null;
  good_with: string | null;
  needs: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  sterilised: boolean | null;
  vaccinated: boolean | null;
  is_friendly: boolean | null;
  org_name: string | null;
  org_slug: string | null;
  created_at: string;
};

export async function adoptableAnimals(): Promise<AdoptableAnimal[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa
    .from("adoptable_animals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !Array.isArray(data)) return [];
  return data as AdoptableAnimal[];
}

export async function listAnimalForAdoption(input: {
  dogId: string;
  summary?: string;
  goodWith?: string;
  needs?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) throw new Error("Not connected to the record store.");
  const { data, error } = await supa.rpc("list_animal_for_adoption", {
    p_dog_id: input.dogId,
    p_summary: input.summary ?? null,
    p_good_with: input.goodWith ?? null,
    p_needs: input.needs ?? null,
    p_contact_name: input.contactName ?? null,
    p_contact_phone: input.contactPhone ?? null,
    p_contact_email: input.contactEmail ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}

export async function closeAdoptionListing(
  id: string,
  status: "placed" | "withdrawn"
): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) throw new Error("Not connected to the record store.");
  const { data, error } = await supa.rpc("close_adoption_listing", {
    p_id: id,
    p_status: status,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}
