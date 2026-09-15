import { getSupabase } from "@/lib/supabase";

export type Partner = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  mission: string | null;
  areas: string[];
  logoUrl: string | null;
  partnerStatus: string;
};

/* A confirmed founding partner is shown while a deployment is waiting for its
   migration. This is a public relationship, not seed animal or case data. */
const FOUNDING_PARTNERS: Partner[] = [{
  id: "pawesome-project",
  name: "The Pawsome People Project",
  slug: "the-pawsome-people-project",
  city: "Coimbatore",
  state: "Tamil Nadu",
  mission: "Community animal rescue, treatment follow-up, sterilisation and vaccination work in Coimbatore.",
  areas: ["Rescue", "Treatment", "ABC", "Follow-up"],
  logoUrl: null,
  partnerStatus: "operational_partner",
}];

export async function getOperationalPartners(): Promise<Partner[]> {
  const supa = getSupabase();
  if (!supa) return FOUNDING_PARTNERS;
  const { data, error } = await supa
    .from("ngos")
    .select("id,name,slug,city,state,mission,areas_of_work,logo_url,partner_status")
    .in("partner_status", ["operational_partner", "pilot_partner"])
    .order("partnered_at", { ascending: true });
  if (error || !data?.length) return FOUNDING_PARTNERS;
  return data.map((row: any) => ({
    id: row.id, name: row.name, slug: row.slug, city: row.city ?? null,
    state: row.state ?? null, mission: row.mission ?? null,
    areas: row.areas_of_work ?? [], logoUrl: row.logo_url ?? null,
    partnerStatus: row.partner_status,
  }));
}
