/* The spatial dataset, cached on the server.

   The public dataset is the same for every visitor, so it is built once
   and kept for ten minutes (and invalidated by tag when a report, a case
   or an import lands). An organisation's dataset is built per request
   with the member's own token, and never cached across people. */

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";
import { assemble, DATASET_VERSION, healCells, readOrgRows, readPublicRows } from "./build";
import type { SpatialDataset } from "./types";

export const SPATIAL_TAG = "spatial";

async function buildPublic(city: string | null): Promise<SpatialDataset | null> {
  const supa = getSupabase();
  if (!supa) return null;
  try {
    await healCells(getSupabaseAdmin()).catch(() => 0);
    const rows = await readPublicRows(supa, city ?? undefined);
    return assemble(rows, "public");
  } catch (e) {
    console.error("spatial: public dataset failed", e);
    return null;
  }
}

/** The public register as a spatial dataset; `city` narrows it to one city. */
export const getPublicDataset = unstable_cache(
  async (city: string | null = null) => buildPublic(city),
  [`spatial-public-v${DATASET_VERSION}`],
  { revalidate: 600, tags: [SPATIAL_TAG] },
);

/** An organisation's own register, read with the member's token so RLS applies. */
export async function getOrgDataset(accessToken: string): Promise<SpatialDataset | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon || !accessToken) return null;
  const supa = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  try {
    const rows = await readOrgRows(supa);
    return assemble(rows, "org");
  } catch (e) {
    console.error("spatial: org dataset failed", e);
    return null;
  }
}
