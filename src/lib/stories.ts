import { getSupabase } from "@/lib/supabase";

export type FeaturedStory = { id: string; title: string; public_summary: string; location_label: string | null; cover_url: string | null; stages: Array<{ label: string; date?: string }>; ngo_id: string; published_at: string };
export async function getFeaturedStories(limit = 3): Promise<FeaturedStory[]> {
  const supa = getSupabase(); if (!supa) return [];
  const { data } = await supa.from("case_stories").select("id,title,public_summary,location_label,cover_url,stages,ngo_id,published_at").not("published_at", "is", null).order("published_at", { ascending: false }).limit(limit);
  return (data ?? []).map((row: any) => ({ ...row, stages: Array.isArray(row.stages) ? row.stages : [] }));
}
