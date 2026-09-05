"use client";

import { getSupabase } from "./supabase";

/* Drives: the unit an ABC programme is reported against.

   Every read here is scoped inside the database to the caller's own
   organisation, through my_ngo(), rather than by a filter this file
   passes. A page that forgets to ask still cannot see somebody else's
   drive. */

export type CampaignKind =
  | "census"
  | "sterilisation"
  | "vaccination"
  | "treatment"
  | "other";

export const KIND_LABEL: Record<CampaignKind, string> = {
  census: "Census",
  sterilisation: "Sterilisation drive",
  vaccination: "Vaccination drive",
  treatment: "Treatment camp",
  other: "Other",
};

export type CampaignStats = {
  id: string;
  name: string;
  kind: CampaignKind;
  starts_on: string | null;
  ends_on: string | null;
  zone: string | null;
  archived: boolean;
  observations: number;
  people: number;
  total: number;
  sterilised: number;
  not_sterilised: number;
  ster_unknown: number;
  vaccinated: number;
  not_vaccinated: number;
  vacc_unknown: number;
  needs_help: number;
  ster_pct_of_known: number | null;
  ster_pct_of_all: number | null;
  vacc_pct_of_known: number | null;
  vacc_pct_of_all: number | null;
};

export type Incoming = {
  id: string;
  photo_url: string | null;
  zone: string | null;
  lat: number | null;
  lng: number | null;
  nickname: string | null;
  notes: string | null;
  sterilisation_status: string | null;
  vaccination_status: string | null;
  reported_by: string;
  status: string;
  created_at: string;
  total_count: number;
};

export type CampaignAnimal = {
  id: string;
  name: string | null;
  code: string | null;
  zone: string | null;
  cover_photo: string | null;
  sterilisation_status: string;
  vaccination_status: string;
  needs_help: boolean;
  created_at: string;
  total_count: number;
};

export async function orgCampaigns(
  includeArchived = false
): Promise<CampaignStats[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("org_campaigns", {
    p_include_archived: includeArchived,
  });
  if (error || !Array.isArray(data)) return [];
  return (data as CampaignStats[]).filter(Boolean);
}

export async function campaignStats(id: string): Promise<CampaignStats | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data, error } = await supa.rpc("campaign_stats", { p_campaign_id: id });
  if (error || !data) return null;
  return data as CampaignStats;
}

export async function createCampaign(input: {
  name: string;
  kind: CampaignKind;
  startsOn?: string | null;
  endsOn?: string | null;
  zone?: string | null;
  notes?: string | null;
}): Promise<string> {
  const supa = getSupabase();
  if (!supa) throw new Error("Not connected to the record store.");
  const { data, error } = await supa.rpc("create_campaign", {
    p_name: input.name.trim(),
    p_kind: input.kind,
    p_starts_on: input.startsOn || null,
    p_ends_on: input.endsOn || null,
    p_zone: input.zone?.trim() || null,
    p_notes: input.notes?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function archiveCampaign(id: string, archived = true) {
  const supa = getSupabase();
  if (!supa) throw new Error("Not connected to the record store.");
  const { error } = await supa.rpc("archive_campaign", {
    p_id: id,
    p_archived: archived,
  });
  if (error) throw new Error(error.message);
}

export async function orgIncoming(
  source: "ours" | "community",
  zone?: string | null
): Promise<Incoming[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("org_incoming", {
    p_source: source,
    p_zone: zone?.trim() || null,
    p_limit: 200,
    p_offset: 0,
  });
  if (error || !Array.isArray(data)) return [];
  return data as Incoming[];
}

/** Files a chosen set of observations into a drive, registering the animals. */
export async function fileToCampaign(
  sightingIds: string[],
  campaignId: string,
  claim = false
): Promise<{ filed: number; registered: number }> {
  const supa = getSupabase();
  if (!supa) throw new Error("Not connected to the record store.");
  const { data, error } = await supa.rpc("file_sightings_to_campaign", {
    p_sighting_ids: sightingIds,
    p_campaign_id: campaignId,
    p_claim: claim,
  });
  if (error) throw new Error(error.message);
  return data as { filed: number; registered: number };
}

export async function campaignAnimals(
  id: string,
  ster?: string | null,
  vacc?: string | null
): Promise<CampaignAnimal[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("campaign_animals", {
    p_campaign_id: id,
    p_ster: ster || null,
    p_vacc: vacc || null,
    p_limit: 500,
    p_offset: 0,
  });
  if (error || !Array.isArray(data)) return [];
  return data as CampaignAnimal[];
}

export type Breakdown = {
  overall: CampaignStats | null;
  drives: CampaignStats[];
  unfiled: {
    animals: number;
    sterilised: number;
    not_sterilised: number;
    ster_unknown: number;
  };
  waiting: { ours: number; community: number };
};

export async function programmeBreakdown(): Promise<Breakdown | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data, error } = await supa.rpc("org_programme_breakdown");
  if (error || !data) return null;
  return data as Breakdown;
}
