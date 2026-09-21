import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* How many animals are on the record, right now.
   The hero renders a server count on first paint and then asks this, so the
   number climbs while somebody is looking at the page rather than only when
   they reload it. Cheap: a head request with an exact count, no rows. */
export async function GET() {
  const supa = getSupabase();
  if (!supa) return NextResponse.json({ count: null }, { status: 503 });

  /* The same public projection countDogs() reads, and the same one the map
     and the community app list from. It used to count the raw `dogs` table,
     which holds a different row set, so the landing hero rendered the public
     total server-side and then animated down to the raw count on the first
     poll. One public number, one source. */
  const { count, error } = await supa
    .from("public_animal_profiles")
    .select("id", { count: "exact", head: true });

  if (error) return NextResponse.json({ count: null }, { status: 500 });

  return NextResponse.json(
    { count: count ?? 0 },
    { headers: { "Cache-Control": "no-store" } }
  );
}
