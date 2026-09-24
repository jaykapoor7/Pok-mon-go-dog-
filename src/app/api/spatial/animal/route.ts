import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

/* The cell an animal is recorded in, so a profile's "See on the map" can
   open the map on that cell. Only the cell is returned: the same unit
   every public map draws, never a finer position. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Not an animal id." }, { status: 400 });
  const supa = getSupabase();
  if (!supa) return NextResponse.json({ cell: null });
  const { data } = await supa.from("public_spatial_animals").select("h3_r8,city").eq("id", id).maybeSingle();
  return NextResponse.json({ cell: data?.h3_r8 ?? null, city: data?.city ?? null }, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
  });
}
