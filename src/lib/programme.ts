"use client";

import { getSupabase } from "./supabase";

/* The organisation's own view of its ABC and rabies work.

   Every read here is scoped to the caller's organisation inside the
   database, through my_ngo(), rather than by a filter this file passes.
   That is what keeps one organisation's records out of another's dashboard
   even if a page forgets to ask. */

export type SterStatus = "sterilised" | "not_sterilised" | "unknown";
export type VaccStatus = "vaccinated" | "not_vaccinated" | "unknown";

export type ProgrammeStats = {
  total: number;
  sterilised: number;
  not_sterilised: number;
  ster_unknown: number;
  vaccinated: number;
  not_vaccinated: number;
  vacc_unknown: number;
  needs_help: number;
  added_7d: number;
  added_30d: number;
  /** Of the animals whose status was actually established. Null when none were. */
  ster_pct_of_known: number | null;
  ster_pct_of_all: number | null;
  vacc_pct_of_known: number | null;
};

export type OrgAnimal = {
  id: string;
  name: string | null;
  code: string | null;
  species: string | null;
  zone: string | null;
  cover_photo: string | null;
  status: string | null;
  assignee_name: string | null;
  sterilisation_status: SterStatus;
  vaccination_status: VaccStatus;
  needs_help: boolean;
  sightings_count: number | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  last_seen: string | null;
  recorded_by: string | null;
  total_count: number;
};

export type OrgReport = {
  id: string;
  dog_id: string | null;
  photo_url: string;
  zone: string | null;
  nickname: string | null;
  notes: string | null;
  sterilisation_status: SterStatus | null;
  vaccination_status: VaccStatus | null;
  volunteer_name: string | null;
  status: string;
  created_at: string;
  total_count: number;
};

export async function programmeStats(): Promise<ProgrammeStats | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data, error } = await supa.rpc("org_programme_stats");
  if (error || !data) return null;
  return data as ProgrammeStats;
}

export type AnimalFilters = {
  search?: string;
  ster?: SterStatus | null;
  vacc?: VaccStatus | null;
  zone?: string | null;
  from?: string | null;
  to?: string | null;
  needsHelp?: boolean | null;
  limit?: number;
  offset?: number;
};

export async function orgAnimals(f: AnimalFilters = {}): Promise<OrgAnimal[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("org_animals", {
    p_search: f.search?.trim() || null,
    p_ster: f.ster ?? null,
    p_vacc: f.vacc ?? null,
    p_zone: f.zone || null,
    p_from: f.from || null,
    p_to: f.to || null,
    p_needs: f.needsHelp ?? null,
    p_limit: f.limit ?? 200,
    p_offset: f.offset ?? 0,
  });
  if (error || !Array.isArray(data)) return [];
  return data as OrgAnimal[];
}

export async function orgZones(): Promise<{ zone: string; n: number }[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("org_zones");
  if (error || !Array.isArray(data)) return [];
  return data as { zone: string; n: number }[];
}

export async function orgReports(limit = 100, offset = 0): Promise<OrgReport[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("org_reports", {
    p_limit: limit,
    p_offset: offset,
  });
  if (error || !Array.isArray(data)) return [];
  return data as OrgReport[];
}

export async function orgReportingVolunteers(): Promise<
  { volunteer_name: string; reports: number; last_report: string }[]
> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("org_reporting_volunteers");
  if (error || !Array.isArray(data)) return [];
  return data as { volunteer_name: string; reports: number; last_report: string }[];
}

export async function setProgrammeStatus(
  dogId: string,
  ster: SterStatus | null,
  vacc: VaccStatus | null
): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) throw new Error("Not connected to the record store.");
  const { data, error } = await supa.rpc("set_animal_programme_status", {
    p_dog_id: dogId,
    p_sterilisation_status: ster,
    p_vaccination_status: vacc,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/* ── Invite codes, for organisation admins ─────────────────────────── */

export type InviteCode = {
  id: string;
  code: string;
  label: string | null;
  active: boolean;
  max_uses: number | null;
  uses: number;
  created_at: string;
  revoked_at: string | null;
  reports: number;
  volunteers: number;
};

export async function myInviteCodes(): Promise<InviteCode[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("my_invite_codes");
  if (error || !Array.isArray(data)) return [];
  return data as InviteCode[];
}

export async function createInviteCode(
  label?: string,
  maxUses?: number | null
): Promise<{ id: string; code: string }> {
  const supa = getSupabase();
  if (!supa) throw new Error("Not connected to the record store.");
  const { data, error } = await supa.rpc("create_invite_code", {
    p_label: label?.trim() || null,
    p_max_uses: maxUses ?? null,
  });
  if (error) throw new Error(error.message);
  return data as { id: string; code: string };
}

export async function revokeInviteCode(id: string): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) throw new Error("Not connected to the record store.");
  const { data, error } = await supa.rpc("revoke_invite_code", { p_id: id });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/** Joins the signed-in account to any organisation that invited its email. */
export async function claimOrgMembership(): Promise<void> {
  const supa = getSupabase();
  if (!supa) return;
  try {
    await supa.rpc("claim_org_membership");
  } catch {
    /* Never block a sign-in on this. Someone with no invitation is the
       ordinary case, and the call is safe to repeat later. */
  }
}

/* ── The organisation's people, and their codes ────────────────────── */

export type TeamCode = {
  id: string;
  kind: "staff" | "volunteer";
  person_name: string | null;
  email: string | null;
  role: "lead" | "member" | "volunteer";
  code: string | null;
  active: boolean;
  accepted: boolean;
  reports: number;
  created_at: string;
};

export async function orgTeamCodes(): Promise<TeamCode[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("org_team_codes");
  if (error || !Array.isArray(data)) return [];
  return data as TeamCode[];
}

/** Adds one person to the caller's own organisation and returns their code. */
export async function createTeamCode(
  email: string,
  name: string,
  role: "lead" | "member" | "volunteer"
): Promise<{ code: string; kind: "staff" | "volunteer"; name: string }> {
  const supa = getSupabase();
  if (!supa) throw new Error("Not connected to the record store.");
  const { data, error } = await supa.rpc("create_team_code", {
    p_email: email.trim(),
    p_name: name.trim(),
    p_role: role,
  });
  if (error) throw new Error(error.message);
  return data as { code: string; kind: "staff" | "volunteer"; name: string };
}

export async function revokeTeamCode(id: string): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) throw new Error("Not connected to the record store.");
  const { data, error } = await supa.rpc("revoke_team_code", { p_id: id });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/* ── Who is signed in ──────────────────────────────────────────────── */

export type Profile = {
  signed_in: boolean;
  email?: string | null;
  name?: string | null;
  ngo_id?: string | null;
  org_name?: string | null;
  role?: string;
  is_lead?: boolean;
};

export async function myProfile(): Promise<Profile> {
  const supa = getSupabase();
  if (!supa) return { signed_in: false };
  try {
    const { data, error } = await supa.rpc("my_profile");
    if (error || !data) return { signed_in: false };
    return data as Profile;
  } catch {
    return { signed_in: false };
  }
}
