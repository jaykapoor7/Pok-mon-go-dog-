import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

/* The animals recorded in a patch: a handful of cells around a person, or
   the animals they follow. Public fields only, positions no finer than the
   cell, and bounded — a patch is a neighbourhood, never the register. */

const CELL = /^8[0-9a-f]{14}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELDS = "id,name,code,straypaw_id,cover_photo,status,needs_help,sterilisation_status,vaccination_status,ear_notch,first_seen,last_seen,zone,h3_r8,source";

export async function GET(req: NextRequest) {
  const cells = (req.nextUrl.searchParams.get("cells") ?? "").split(",").map((s) => s.trim()).filter((s) => CELL.test(s)).slice(0, 80);
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter((s) => UUID.test(s)).slice(0, 60);
  if (!cells.length && !ids.length) return NextResponse.json({ animals: [] });
  const supa = getSupabase();
  if (!supa) return NextResponse.json({ animals: [] });
  let q = supa.from("public_spatial_animals").select(FIELDS);
  q = cells.length ? q.in("h3_r8", cells) : q.in("id", ids);
  const { data, error } = await q.order("needs_help", { ascending: false }).order("last_seen", { ascending: false }).limit(300);
  if (error) return NextResponse.json({ animals: [], error: "The register is unavailable right now." }, { status: 503 });
  return NextResponse.json({ animals: data ?? [] }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" },
  });
}
