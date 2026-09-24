import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

/* The animals recorded in one H3 cell, for a map selection.

   Public fields only, from public_spatial_animals: the same projection the
   public profile pages already show. The cell id is validated so this
   cannot be turned into a general query. */

const CELL = /^[0-9a-f]{15}$/;

export async function GET(req: NextRequest) {
  const h = req.nextUrl.searchParams.get("h") ?? "";
  if (!CELL.test(h)) return NextResponse.json({ error: "Not a cell." }, { status: 400 });
  const supa = getSupabase();
  if (!supa) return NextResponse.json({ animals: [] });
  const { data, error } = await supa
    .from("public_spatial_animals")
    .select("id,name,code,straypaw_id,cover_photo,status,needs_help,sterilisation_status,vaccination_status,last_seen,first_seen,zone,source,location_precision")
    .eq("h3_r8", h)
    .order("needs_help", { ascending: false })
    .order("last_seen", { ascending: false })
    .limit(240);
  if (error) return NextResponse.json({ error: "Could not read this cell." }, { status: 502 });
  return NextResponse.json({ animals: data ?? [] }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
