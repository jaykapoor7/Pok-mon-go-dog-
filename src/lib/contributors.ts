import "server-only";
import { getSupabase } from "@/lib/supabase";
import { STATES } from "@/lib/platform/geography";
import type { ContributorOrg } from "@/lib/contributor-types";

const codeByName = new Map(STATES.map((state) => [state.name.toLowerCase(), state.code]));

export async function getContributorOrganisations(): Promise<ContributorOrg[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa
    .from("public_contributor_organisations")
    .select("id,name,slug,mission,about,website,city,state,area,areas_of_work,founded_year,directory_kind,animal_count,area_record_count,source_count")
    .order("animal_count", { ascending: false });
  if (error) return [];
  return (data ?? []).filter((row: any) => row.slug).map((row: any) => {
    const state = String(row.state ?? "").trim();
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      city: row.city ?? row.area ?? "India",
      state,
      stateCode: codeByName.get(state.toLowerCase()) ?? "IN-UN",
      focus: Array.isArray(row.areas_of_work) ? row.areas_of_work : [],
      summary: row.mission ?? row.about ?? "Records attributed through StrayPaw.",
      url: `/org/${row.slug}`,
      founded: row.founded_year ?? null,
      directoryKind: row.directory_kind === "partner" ? "partner" : "data_source",
      animalCount: Number(row.animal_count ?? 0),
      areaRecordCount: Number(row.area_record_count ?? 0),
      sourceCount: Number(row.source_count ?? 0),
    } satisfies ContributorOrg;
  });
}
